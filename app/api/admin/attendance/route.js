import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/attendance
 * Returns ALL intern attendance for a given date, including:
 * - Interns who clocked in (with photos)
 * - Interns who submitted Sakit/Izin
 * - Interns who are ABSENT (no record at all)
 *
 * Query: ?date=YYYY-MM-DD  (defaults to today WIB)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    // ── Target date (default = today WIB) ──
    const today = date || new Date(new Date().getTime() + 7 * 3600000).toISOString().split('T')[0]

    // ── 1. Fetch attendance logs for this date ──
    const logs = await prisma.attendanceLog.findMany({
      where: { date: today },
      orderBy: { checkIn: 'asc' }
    })

    // ── 2. Build intern map from BOTH sources ──
    let prismaInterns = []
    try {
      prismaInterns = await prisma.intern.findMany({
        where: { deletedAt: null },  // no status filter — take all non-deleted
        select: {
          id: true, name: true, bidang: true, university: true,
          userId: true, facePhotoUrl: true, email: true, status: true
        }
      })
      // Only keep ACTIVE interns (case-insensitive)
      prismaInterns = prismaInterns.filter(i => (i.status || '').toUpperCase() === 'ACTIVE')
    } catch (e) {
      console.error('[admin/attendance] Prisma intern fetch error:', e.message)
    }

    let legacyInterns = []
    try {
      const db = await getDB()
      legacyInterns = (db.interns || []).filter(i =>
        !i.deletedAt && (i.status || '').toUpperCase() === 'ACTIVE'
      )
    } catch (e) {
      console.error('[admin/attendance] Legacy intern fetch error:', e.message)
    }

    // Merge — Prisma overrides legacy for same id
    const internMap = new Map()
    legacyInterns.forEach(i => internMap.set(i.id, {
      id: i.id, name: i.name, bidang: i.bidang || '-',
      university: i.university || '-', userId: i.userId,
      facePhotoUrl: i.facePhotoUrl || null, email: i.email || null
    }))
    prismaInterns.forEach(i => internMap.set(i.id, {
      id: i.id, name: i.name, bidang: i.bidang || '-',
      university: i.university || '-', userId: i.userId,
      facePhotoUrl: i.facePhotoUrl || null, email: i.email || null
    }))
    const allInterns = Array.from(internMap.values())

    console.log(`[admin/attendance] date=${today} | prismaInterns=${prismaInterns.length} | legacyInterns=${legacyInterns.length} | total=${allInterns.length} | logs=${logs.length}`)

    // ── 3. Build todaySummary: log + absent interns ──
    const presentIds = new Set(logs.map(l => l.internId))

    const serializeLog = (log, intern) => ({
      id:          log.id,
      internId:    log.internId,
      date:        log.date,
      checkIn:     log.checkIn  ? log.checkIn.toISOString()  : null,
      checkOut:    log.checkOut ? log.checkOut.toISOString() : null,
      checkInLoc:  log.checkInLoc  || null,
      checkOutLoc: log.checkOutLoc || null,
      status:      log.status,
      editedBy:    log.editedBy || null,
      editedAt:    log.editedAt ? log.editedAt.toISOString() : null,
      // Photo: Storage URL preferred (fast), Base64 sendable for small records
      faceInUrl:   log.faceInUrl  || (log.faceInBase64  ? `data:image/jpeg;base64,${log.faceInBase64}`  : null),
      faceOutUrl:  log.faceOutUrl || (log.faceOutBase64 ? `data:image/jpeg;base64,${log.faceOutBase64}` : null),
      intern: intern || { name: 'Unknown', bidang: '-', university: '-' }
    })

    const todayLogEntries  = logs.map(l => serializeLog(l, internMap.get(l.internId)))
    const absentEntries    = allInterns
      .filter(i => !presentIds.has(i.id))
      .map(i => ({
        id: null, internId: i.id, date: today,
        checkIn: null, checkOut: null, checkInLoc: null, checkOutLoc: null,
        status: 'ABSENT', faceInUrl: null, faceOutUrl: null,
        editedBy: null, editedAt: null,
        intern: i
      }))

    // Sort: PRESENT → LATE → SAKIT/IZIN → ABSENT, then alphabetically within group
    const ORDER = { PRESENT: 0, LATE: 1, SAKIT: 2, IZIN: 2, ABSENT: 3 }
    const todaySummary = [...todayLogEntries, ...absentEntries].sort((a, b) => {
      const oa = ORDER[a.status] ?? 9
      const ob = ORDER[b.status] ?? 9
      if (oa !== ob) return oa - ob
      return (a.intern?.name || '').localeCompare(b.intern?.name || '')
    })

    return NextResponse.json({
      logs:         todayLogEntries,
      todaySummary,
      date:         today,
      totalInterns: allInterns.length
    })
  } catch (err) {
    console.error('[GET /api/admin/attendance] CRASH:', err)
    return NextResponse.json({ error: err.message, todaySummary: [], logs: [], totalInterns: 0 }, { status: 500 })
  }
}

// ── Helper to safely parse Date from separate YYYY-MM-DD and HH:mm strings ──
function parseDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return null
  try {
    const dt = new Date(`${dateStr}T${timeStr}:00+07:00`)
    return isNaN(dt.getTime()) ? null : dt
  } catch (e) {
    return null
  }
}

/**
 * PATCH /api/admin/attendance
 * Admin manual edit or create attendance entry.
 * Body: { id?, internId?, date?, checkIn, checkOut, status, editedBy, note }
 */
export async function PATCH(request) {
  try {
    const { id, internId, date, checkIn, checkOut, status, editedBy = 'Admin HR', note = '' } = await request.json()

    if (!id && (!internId || !date)) {
      return NextResponse.json({ error: 'id atau (internId + date) wajib diisi' }, { status: 400 })
    }

    // target date for construction if missing in 'id' mode
    const targetDate = date

    const now = new Date()
    let log

    if (id) {
      // Existing log: update fields that were provided
      const updateData = {}
      
      // Only update if explicit values were provided
      if (checkIn !== undefined) {
        updateData.checkIn = parseDateTime(targetDate, checkIn)
        if (checkIn) updateData.checkInLoc = `Edit Manual — ${editedBy}`
      }
      
      if (checkOut !== undefined) {
        updateData.checkOut = parseDateTime(targetDate, checkOut)
        if (checkOut) updateData.checkOutLoc = `Edit Manual — ${editedBy}`
      }
      
      if (status !== undefined) updateData.status = status
      
      updateData.editedBy = editedBy
      updateData.editedAt = now

      log = await prisma.attendanceLog.update({ where: { id }, data: updateData })
    } else {
      // Upsert: create if missing
      const dIn  = parseDateTime(targetDate, checkIn) || new Date(`${targetDate}T08:00:00+07:00`)
      const dOut = parseDateTime(targetDate, checkOut)
      const computedStatus = status || (dIn > new Date(`${targetDate}T07:30:00+07:00`) ? 'LATE' : 'PRESENT')

      log = await prisma.attendanceLog.upsert({
        where:  { internId_date: { internId, date: targetDate } },
        update: {
          checkIn: dIn, checkOut: dOut, status: computedStatus,
          checkInLoc: `Admin Manual — ${editedBy}`,
          checkOutLoc: dOut ? `Admin Manual — ${editedBy}` : null,
          editedBy, editedAt: now
        },
        create: {
          internId, date: targetDate,
          checkIn: dIn, checkOut: dOut, status: computedStatus,
          checkInLoc: `Input Manual oleh Admin — ${editedBy}`,
          checkOutLoc: dOut ? `Input Manual oleh Admin — ${editedBy}` : null,
          editedBy, editedAt: now
        }
      })
    }

    return NextResponse.json({
      success: true,
      log: {
        ...log,
        checkIn:  log.checkIn  ? log.checkIn.toISOString()  : null,
        checkOut: log.checkOut ? log.checkOut.toISOString() : null,
        editedAt: log.editedAt ? log.editedAt.toISOString() : null,
      }
    })
  } catch (err) {
    console.error('[PATCH /api/admin/attendance] CRASH:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

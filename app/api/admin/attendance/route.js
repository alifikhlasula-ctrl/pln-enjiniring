import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/attendance
 * Returns ALL intern attendance for a given date, including:
 * - Interns who clocked in (with photos)
 * - Interns who clocked in via manual backdate
 * - Interns who submitted Sakit/Izin
 * - Interns who are ABSENT (no record at all)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const date      = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate   = searchParams.get('endDate')
    const internId  = searchParams.get('internId')

    // ── Target date for "today summary" ──
    const today = date || new Date(new Date().getTime() + 7 * 3600000).toISOString().split('T')[0]

    // ── Build Prisma where for range queries ──
    const where = {}
    if (internId) where.internId = internId
    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate }
    } else {
      where.date = today
    }

    // ── Fetch logs & interns in parallel ──
    const [logs, prismaInterns] = await Promise.all([
      prisma.attendanceLog.findMany({ where, orderBy: { date: 'desc' } }),
      prisma.intern.findMany({
        where: { deletedAt: null },
        select: {
          id: true, name: true, bidang: true, university: true,
          userId: true, facePhotoUrl: true, email: true
        }
      })
    ])

    // ── Merge with JSON legacy interns ──
    let legacyInterns = []
    try {
      const db = await getDB('ACTIVE', { clone: false })
      legacyInterns = (db.interns || []).filter(i => !i.deletedAt)
    } catch (_) {}

    const internMap = new Map()
    legacyInterns.forEach(i => internMap.set(i.id, {
      id: i.id, name: i.name, bidang: i.bidang || '-',
      university: i.university || '-', userId: i.userId,
      facePhotoUrl: i.facePhotoUrl || null, email: i.email || null
    }))
    prismaInterns.forEach(i => internMap.set(i.id, i))

    // ── Serialize all logs (include all photo sources) ──
    const serializeLog = (log, internMeta) => ({
      id: log.id,
      internId: log.internId,
      date: log.date,
      checkIn:     log.checkIn     ? log.checkIn.toISOString()     : null,
      checkOut:    log.checkOut    ? log.checkOut.toISOString()     : null,
      checkInLoc:  log.checkInLoc  || null,
      checkOutLoc: log.checkOutLoc || null,
      status:      log.status,
      editedBy:    log.editedBy    || null,
      editedAt:    log.editedAt    ? log.editedAt.toISOString()     : null,
      // Photo: prefer Storage URL, then Base64 embed, then null
      faceInUrl:   log.faceInUrl   || (log.faceInBase64  ? `data:image/jpeg;base64,${log.faceInBase64}`  : null),
      faceOutUrl:  log.faceOutUrl  || (log.faceOutBase64 ? `data:image/jpeg;base64,${log.faceOutBase64}` : null),
      intern: internMeta || { name: 'Unknown', bidang: '-', university: '-' }
    })

    const serializedLogs = logs.map(l => serializeLog(l, internMap.get(l.internId)))

    // ── Build "today" full summary (all interns + their status) ──
    const todayLogs     = serializedLogs.filter(l => l.date === today)
    const presentIds    = new Set(todayLogs.map(l => l.internId))
    const allInterns    = Array.from(internMap.values())
    const absentInterns = allInterns
      .filter(i => !presentIds.has(i.id))
      .map(i => ({
        id: null, internId: i.id, date: today,
        checkIn: null, checkOut: null,
        status: 'ABSENT',
        faceInUrl: null, faceOutUrl: null,
        editedBy: null, editedAt: null,
        intern: i
      }))

    // Sort: PRESENT → LATE → ABSENT
    const order = { PRESENT: 0, LATE: 1, SAKIT: 2, IZIN: 2, ABSENT: 3 }
    const todaySummary = [...todayLogs, ...absentInterns].sort((a, b) => {
      const oa = order[a.status] ?? 9
      const ob = order[b.status] ?? 9
      if (oa !== ob) return oa - ob
      if (a.checkIn && b.checkIn) return new Date(a.checkIn) - new Date(b.checkIn)
      return 0
    })

    return NextResponse.json({
      logs: serializedLogs,
      todaySummary,
      date: today,
      totalInterns: allInterns.length
    })
  } catch (err) {
    console.error('[GET /api/admin/attendance]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/attendance
 * Admin manual edit: fix checkIn/checkOut, status, or create missing entry.
 * Body: { id?, internId?, date?, checkIn, checkOut, status, editedBy, note }
 */
export async function PATCH(request) {
  try {
    const { id, internId, date, checkIn, checkOut, status, editedBy = 'Admin HR', note = '' } = await request.json()

    if (!id && (!internId || !date)) {
      return NextResponse.json({ error: 'id atau (internId + date) wajib diisi' }, { status: 400 })
    }

    const now = new Date()
    let log

    if (id) {
      // Update existing log
      const updateData = {}
      if (checkIn  !== undefined) { updateData.checkIn  = checkIn  ? new Date(`${date || ''}T${checkIn}:00+07:00`)  : null }
      if (checkOut !== undefined) { updateData.checkOut = checkOut ? new Date(`${date || ''}T${checkOut}:00+07:00`) : null }
      if (status   !== undefined)  updateData.status   = status
      if (checkIn)  updateData.checkInLoc  = 'Edit Manual oleh Admin'
      if (checkOut) updateData.checkOutLoc = 'Edit Manual oleh Admin'
      updateData.editedBy  = editedBy
      updateData.editedAt  = now

      log = await prisma.attendanceLog.update({ where: { id }, data: updateData })
    } else {
      // Upsert (intern forgot to clock in entirely)
      const dIn  = checkIn  ? new Date(`${date}T${checkIn}:00+07:00`)  : new Date(`${date}T08:00:00+07:00`)
      const dOut = checkOut ? new Date(`${date}T${checkOut}:00+07:00`) : null
      const computedStatus = status || (dIn > new Date(`${date}T07:30:00+07:00`) ? 'LATE' : 'PRESENT')

      log = await prisma.attendanceLog.upsert({
        where:  { internId_date: { internId, date } },
        update: { checkIn: dIn, checkOut: dOut, status: computedStatus, checkInLoc: 'Admin Manual (upsert)', checkOutLoc: dOut ? 'Admin Manual (upsert)' : null, editedBy, editedAt: now },
        create: { internId, date, checkIn: dIn, checkOut: dOut, status: computedStatus, checkInLoc: 'Input Manual oleh Admin', checkOutLoc: dOut ? 'Input Manual oleh Admin' : null, editedBy, editedAt: now }
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
    console.error('[PATCH /api/admin/attendance]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

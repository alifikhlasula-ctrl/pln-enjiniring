import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDB } from '@/lib/db'

/**
 * GET /api/admin/attendance
 * Fetch all attendance logs for all interns for a specific date range.
 * Supports: ?date=YYYY-MM-DD (single day) | ?startDate=...&endDate=...
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const date      = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate   = searchParams.get('endDate')
    const internId  = searchParams.get('internId') // optional filter

    const where = {}
    if (internId) where.internId = internId
    if (date) {
      where.date = date
    } else if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate }
    }

    // Fetch logs and intern list in parallel
    const [logs, prismaInterns] = await Promise.all([
      prisma.attendanceLog.findMany({ where, orderBy: { date: 'desc' } }),
      prisma.intern.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, bidang: true, university: true, userId: true, facePhotoUrl: true }
      })
    ])

    // Merge with legacy JSON interns
    let legacyInterns = []
    try {
      const db = await getDB('ACTIVE', { clone: false })
      legacyInterns = (db.interns || []).filter(i => !i.deletedAt)
    } catch (_) {}

    const internMap = new Map()
    legacyInterns.forEach(i => internMap.set(i.id, i))
    prismaInterns.forEach(i => internMap.set(i.id, i))

    const serializedLogs = logs.map(log => ({
      id: log.id,
      internId: log.internId,
      date: log.date,
      checkIn:     log.checkIn     ? log.checkIn.toISOString()     : null,
      checkOut:    log.checkOut    ? log.checkOut.toISOString()     : null,
      checkInLoc:  log.checkInLoc  || null,
      checkOutLoc: log.checkOutLoc || null,
      faceInBase64:  log.faceInBase64  || null,
      faceOutBase64: log.faceOutBase64 || null,
      faceInUrl:   log.faceInUrl   || null,
      faceOutUrl:  log.faceOutUrl  || null,
      status:      log.status,
      editedBy:    log.editedBy    || null,
      editedAt:    log.editedAt ? log.editedAt.toISOString() : null,
      // Attach intern metadata
      intern: internMap.get(log.internId) || { name: 'Unknown', bidang: '-', university: '-' }
    }))

    // Build "today's all interns + their status" view
    const targetDate = date || new Date(new Date().getTime() + 7*3600000).toISOString().split('T')[0]
    const todayLogs  = serializedLogs.filter(l => l.date === targetDate)
    const allInterns = Array.from(internMap.values())

    // For interns without any log today → "ABSENT"
    const absentInterns = allInterns
      .filter(i => !todayLogs.find(l => l.internId === i.id))
      .map(i => ({
        id: null, internId: i.id, date: targetDate,
        checkIn: null, checkOut: null,
        status: 'ABSENT',
        intern: i
      }))

    return NextResponse.json({
      logs: serializedLogs,
      todaySummary: [...todayLogs, ...absentInterns],
      date: targetDate
    })
  } catch (err) {
    console.error('[GET /api/admin/attendance]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/attendance
 * Admin manual edit for an attendance log.
 * Body: { id, checkIn, checkOut, status, editedBy, note }
 */
export async function PATCH(request) {
  try {
    const { id, internId, date, checkIn, checkOut, status, editedBy = 'Admin HR', note = '' } = await request.json()

    if (!id && (!internId || !date)) {
      return NextResponse.json({ error: 'id atau (internId + date) wajib diisi' }, { status: 400 })
    }

    const now = new Date()
    const editNote = `[EDITED by ${editedBy} on ${now.toLocaleDateString('id-ID')}] ${note}`

    let log

    // If id is provided → update existing record
    if (id) {
      log = await prisma.attendanceLog.update({
        where: { id },
        data: {
          checkIn:     checkIn  ? new Date(checkIn)  : undefined,
          checkOut:    checkOut ? new Date(checkOut) : undefined,
          status:      status   || undefined,
          checkInLoc:  checkIn  ? 'Edit Manual oleh Admin' : undefined,
          checkOutLoc: checkOut ? 'Edit Manual oleh Admin' : undefined,
          editedBy,
          editedAt: now,
        }
      })
    } else {
      // Create new record with admin-entered data (intern forgot to clock-in)
      const [inHour, inMin]   = (checkIn  || '08:00').split(':')
      const [outHour, outMin] = (checkOut || '17:00').split(':')
      const dIn  = new Date(`${date}T${String(inHour).padStart(2,'0')}:${String(inMin).padStart(2,'0')}:00+07:00`)
      const dOut = new Date(`${date}T${String(outHour).padStart(2,'0')}:${String(outMin).padStart(2,'0')}:00+07:00`)
      const newStatus = (dIn > new Date(`${date}T07:30:00+07:00`)) ? 'LATE' : 'PRESENT'

      log = await prisma.attendanceLog.upsert({
        where: { internId_date: { internId, date } },
        update: {
          checkIn: dIn, checkOut: dOut,
          checkInLoc: 'Edit Manual (upsert)', checkOutLoc: 'Edit Manual (upsert)',
          status: newStatus, editedBy, editedAt: now
        },
        create: {
          internId, date,
          checkIn: dIn, checkOut: dOut,
          checkInLoc: 'Input Manual oleh Admin', checkOutLoc: 'Input Manual oleh Admin',
          status: newStatus, editedBy, editedAt: now
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
    console.error('[PATCH /api/admin/attendance]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

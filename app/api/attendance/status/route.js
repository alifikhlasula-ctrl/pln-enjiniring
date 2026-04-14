import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDB, db } from '@/lib/db'
import { isWeekend } from '@/lib/dateUtils'

/**
 * POST /api/attendance/status
 * Intern reports Sakit / Izin for today (without face recognition).
 * Body: { userId, statusType: 'SAKIT' | 'IZIN', reason }
 */
export async function POST(request) {
  try {
    const { userId, statusType, reason = '' } = await request.json()

    if (!userId || !statusType || !['SAKIT', 'IZIN'].includes(statusType)) {
      return NextResponse.json({ error: 'userId dan statusType (SAKIT/IZIN) wajib diisi' }, { status: 400 })
    }

    const nowWIB = new Date(new Date().getTime() + 7 * 3600000)
    const today  = nowWIB.toISOString().split('T')[0]

    if (isWeekend(today)) {
      return NextResponse.json({ error: 'Tidak dapat melapor pada hari Sabtu/Minggu.' }, { status: 400 })
    }

    // Find intern
    let intern = await prisma.intern.findUnique({ where: { userId } }).catch(() => null)
    if (!intern) {
      const dbData = await getDB('ACTIVE', { clone: false })
      intern = (dbData?.interns || []).find(i => i.userId === userId && !i.deletedAt)
    }
    if (!intern) return NextResponse.json({ error: 'Intern tidak ditemukan' }, { status: 404 })

    // Check if already has entry for today
    const existing = await prisma.attendanceLog.findUnique({
      where: { internId_date: { internId: intern.id, date: today } }
    })

    if (existing) {
      if (existing.checkIn) {
        return NextResponse.json({ error: 'Anda sudah melakukan absensi (Clock-In) hari ini.' }, { status: 409 })
      }
      // Update existing blank record
      const log = await prisma.attendanceLog.update({
        where: { id: existing.id },
        data: {
          status: statusType,
          checkInLoc: `${statusType} - ${reason || 'Tidak ada keterangan'}`,
        }
      })
      await db.addLog(userId, `SELF_REPORT_${statusType}`, { date: today, reason }).catch(() => {})
      return NextResponse.json({ success: true, log: { ...log, checkIn: null, checkOut: null }, status: statusType })
    }

    // Create new record with Sakit/Izin status
    const log = await prisma.attendanceLog.create({
      data: {
        internId: intern.id,
        date: today,
        status: statusType,
        checkInLoc: `${statusType} - ${reason || 'Tidak ada keterangan'}`,
      }
    })

    await db.addLog(userId, `SELF_REPORT_${statusType}`, { date: today, reason }).catch(() => {})
    return NextResponse.json({ success: true, log, status: statusType })
  } catch (err) {
    console.error('[POST /api/attendance/status]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * GET /api/attendance/status
 * Check today's status report for an intern
 * Query: ?userId=...
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ status: null })

    const nowWIB = new Date(new Date().getTime() + 7 * 3600000)
    const today  = nowWIB.toISOString().split('T')[0]

    let intern = await prisma.intern.findUnique({ where: { userId } }).catch(() => null)
    if (!intern) {
      const dbData = await getDB('ACTIVE', { clone: false })
      intern = (dbData?.interns || []).find(i => i.userId === userId)
    }
    if (!intern) return NextResponse.json({ status: null })

    const log = await prisma.attendanceLog.findUnique({
      where: { internId_date: { internId: intern.id, date: today } }
    })

    return NextResponse.json({
      status: log?.status || null,
      checkIn: log?.checkIn ? log.checkIn.toISOString() : null,
      checkOut: log?.checkOut ? log.checkOut.toISOString() : null,
      date: today
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

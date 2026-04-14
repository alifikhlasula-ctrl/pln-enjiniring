import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/attendance/correction
 * Returns all pending correction requests (for Admin HR)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'
    
    const requests = await prisma.attendanceCorrection.findMany({
      where: status === 'ALL' ? undefined : { status },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
    
    return NextResponse.json({ success: true, requests })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/attendance/correction
 * Intern creating a new correction request
 * Body { internId, internName, date, type, time, reason }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { internId, internName, date, type, time, reason } = body

    if (!internId || !date || !type || !time || !reason) {
      return NextResponse.json({ error: 'Data pengajuan tidak lengkap' }, { status: 400 })
    }

    // Check if there's already a pending request for this date and type
    const existing = await prisma.attendanceCorrection.findFirst({
      where: { internId, date, type, status: 'PENDING' }
    })
    
    if (existing) {
      return NextResponse.json({ error: `Pengajuan perbaikan untuk jam ${type === 'IN' ? 'Masuk' : 'Pulang'} pada tanggal ini sudah ada dan sedang menunggu persetujuan.` }, { status: 400 })
    }

    const correction = await prisma.attendanceCorrection.create({
      data: {
        internId,
        internName,
        date,
        type,   // 'IN' or 'OUT'
        time,   // '08:00'
        reason,
        status: 'PENDING'
      }
    })

    return NextResponse.json({ success: true, correction })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/attendance/correction
 * Admin HR approves or rejects a request
 * Body { id, action: 'APPROVE' | 'REJECT', reviewedBy }
 */
export async function PATCH(request) {
  try {
    const { id, action, reviewedBy } = await request.json()

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 })
    }

    const correction = await prisma.attendanceCorrection.findUnique({ where: { id } })
    if (!correction) {
      return NextResponse.json({ error: 'Pengajuan tidak ditemukan' }, { status: 404 })
    }

    if (correction.status !== 'PENDING') {
      return NextResponse.json({ error: 'Pengajuan sudah diproses sebelumnya' }, { status: 400 })
    }

    const now = new Date()
    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED'

    await prisma.$transaction(async (tx) => {
      // 1. Update the request status
      await tx.attendanceCorrection.update({
        where: { id },
        data: {
          status: newStatus,
          reviewedBy: reviewedBy || 'Admin HR',
          reviewedAt: now
        }
      })

      // 2. If approved, apply to AttendanceLog
      if (action === 'APPROVE') {
        const { internId, date, type, time } = correction
        
        // Prepare the proper date object for Prisma
        const dateTimeObj = new Date(`${date}T${time}:00+07:00`)
        const isInvalid = isNaN(dateTimeObj.getTime())
        const dt = isInvalid ? null : dateTimeObj

        const updateData = {}
        const createData = {
          internId,
          date,
          status: 'PRESENT',
          editedBy: `Admin via Koreksi (${reviewedBy || 'Admin HR'})`,
          editedAt: now
        }
        
        if (type === 'IN') {
          updateData.checkIn = dt
          updateData.checkInLoc = 'Klaim Susulan (Disetujui)'
          
          createData.checkIn = dt
          createData.checkInLoc = 'Klaim Susulan (Disetujui)'
          
          if (!dt) { /* fallback safety */ }
        } else {
          updateData.checkOut = dt
          updateData.checkOutLoc = 'Klaim Susulan (Disetujui)'
          
          createData.checkOut = dt
          createData.checkOutLoc = 'Klaim Susulan (Disetujui)'
        }
        
        updateData.editedBy = `Admin via Koreksi (${reviewedBy || 'Admin HR'})`
        updateData.editedAt = now

        // Find if log exists
        const existingLog = await tx.attendanceLog.findUnique({
          where: { internId_date: { internId, date } }
        })

        if (existingLog) {
          // If the log exists, recalculate status if we update IN
          if (type === 'IN' && dt) {
             const lateThreshold = new Date(`${date}T07:30:00+07:00`)
             updateData.status = dt > lateThreshold ? 'LATE' : 'PRESENT'
          }
          await tx.attendanceLog.update({
            where: { id: existingLog.id },
            data: updateData
          })
        } else {
          // If log doesn't exist at all, create it.
          if (type === 'IN' && dt) {
             const lateThreshold = new Date(`${date}T07:30:00+07:00`)
             createData.status = dt > lateThreshold ? 'LATE' : 'PRESENT'
          }
          await tx.attendanceLog.create({
            data: createData
          })
        }
      }
    })

    return NextResponse.json({ success: true, message: `Pengajuan berhasil di${action === 'APPROVE' ? 'setujui' : 'tolak'}` })
  } catch (error) {
    console.error('[PATCH /api/attendance/correction] ERROR:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

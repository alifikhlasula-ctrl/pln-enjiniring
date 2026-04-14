import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDB, saveDB, db } from '@/lib/db'
import { isWeekend } from '@/lib/dateUtils'
import { uploadBase64Photo, attendancePath } from '@/lib/supabase-storage'

// Helper to safely serialize Prisma objects (converting Date to string) 
// to avoid 500 serialization errors in NextResponse
function serializeLog(log) {
  if (!log) return null
  return {
    ...log,
    checkIn: log.checkIn ? log.checkIn.toISOString() : null,
    checkOut: log.checkOut ? log.checkOut.toISOString() : null,
    createdAt: log.createdAt ? log.createdAt.toISOString() : null,
    updatedAt: log.updatedAt ? log.updatedAt.toISOString() : null,
  }
}

async function findIntern(userId) {
  // Try relational Postgres first (Optimized)
  let intern = await prisma.intern.findUnique({ where: { userId } })
  
  if (!intern) {
    // Fallback to JSON blob just in case synchronization lagged
    const data = await getDB('ACTIVE', { clone: false })
    intern = (data.interns || []).find(i => i.userId === userId && !i.deletedAt)
    if (!intern) intern = (data.interns || []).find(i => i.userId === userId)
  }
  return intern
}

/* ── GET: Riwayat Absensi ─────────────────────────────── */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json([])

    const intern = await findIntern(userId)
    if (!intern) return NextResponse.json([])

    const logs = await prisma.attendanceLog.findMany({
      where: { internId: intern.id },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json(logs.map(serializeLog))
  } catch (err) {
    console.error('[GET /api/attendance] CRASH:', err)
    return NextResponse.json({ error: 'Gagal mengambil riwayat: ' + err.message }, { status: 500 })
  }
}

/* ── POST: Check In / Check Out ───────────────────────── */
export async function POST(request) {
  console.log('[POST /api/attendance] Request received')
  try {
    const body = await request.json()
    const { userId, type, location, faceBase64, faceUrl, date, checkInTime, checkOutTime } = body

    if (!userId || !type) {
      return NextResponse.json({ error: 'userId dan type wajib diisi' }, { status: 400 })
    }

    const data = await getDB()
    let intern = await findIntern(userId)

    // Fallback: create intern for demo role-switchers
    if (!intern) {
      console.log('[POST /api/attendance] Intern not found, auto-creating demo placeholder for', userId)
      const user = (data.users || []).find(u => u.id === userId)
      if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

      const newIntern = {
        id: 'i_' + userId,
        userId,
        name: user.name,
        status: 'ACTIVE',
        bidang: 'Demo',
        periodStart: new Date().toISOString().split('T')[0],
        periodEnd: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        deletedAt: null
      }
      if (!data.interns) data.interns = []
      data.interns.push(newIntern)
      await saveDB(data)
      intern = newIntern
    }

    const now = new Date()
    const nowWIB = new Date(now.getTime() + (7 * 3600000))
    const today = nowWIB.toISOString().split('T')[0]

    // ── Gembok Akhir Pekan ─────────────────────────────────────────────
    if (type === 'IN' || type === 'OUT') {
      if (isWeekend(today)) {
        return NextResponse.json({ error: 'Absensi terkunci pada hari Sabtu dan Minggu.' }, { status: 400 })
      }
    }
    if (type === 'MANUAL_BACKDATE' && date && isWeekend(date)) {
      return NextResponse.json({ error: `Tanggal ${date} adalah akhir pekan. Absensi tidak diperbolehkan.` }, { status: 400 })
    }

    const limit = new Date(`${today}T07:30:00+07:00`)
    const status = (type === 'IN' && now > limit) ? 'LATE' : 'PRESENT'

    const existing = await prisma.attendanceLog.findUnique({
      where: { internId_date: { internId: intern.id, date: today } }
    })

    let log
    if (type === 'IN') {
      if (existing) return NextResponse.json({ error: 'Anda sudah Check In hari ini' }, { status: 400 })
      
      console.log('[POST /api/attendance] Creating check-in log for', intern.id)
      // Upload photo to Supabase Storage (preferred) — keeps DB lean
      // If caller already provides a faceUrl (e.g. pre-uploaded), use it directly.
      // If only Base64 is present, upload it now and store URL.
      let resolvedFaceInUrl = faceUrl || null
      if (!resolvedFaceInUrl && faceBase64) {
        try {
          resolvedFaceInUrl = await uploadBase64Photo(
            attendancePath(intern.id, today, 'in'),
            faceBase64
          )
        } catch (storageErr) {
          console.error('[POST /api/attendance] Storage upload failed for clock-in, falling back to Base64:', storageErr.message)
        }
      }

      log = await prisma.attendanceLog.create({
        data: {
          internId: intern.id,
          date: today,
          checkIn: now,
          checkInLoc: location || 'Lokasi tidak tersedia',
          faceInUrl:    resolvedFaceInUrl,
          faceInBase64: !resolvedFaceInUrl && faceBase64 ? faceBase64 : null, // only fallback if storage failed
          status
        }
      })
      try { await db.addLog(userId, 'CLOCK_IN', { location, status }) } catch (_) {}
    } 
    else if (type === 'MANUAL_BACKDATE') {
      if (!date || !checkInTime || !checkOutTime) {
         return NextResponse.json({ error: 'Tanggal dan Jam wajib diisi untuk klaim backdate' }, { status: 400 })
      }
      // Ensure date is strictly < today
      if (date >= today) {
         return NextResponse.json({ error: 'Tanggal Klaim Susulan harus sebelum hari ini. Gunakan Face Recognition untuk hari ini.' }, { status: 400 })
      }
      
      if (intern.periodStart && date < intern.periodStart) {
         return NextResponse.json({ error: `Klaim tidak dapat dilakukan sebelum periode magang Anda dimulai (${intern.periodStart}).` }, { status: 400 })
      }
      
      const existingBD = await prisma.attendanceLog.findUnique({
        where: { internId_date: { internId: intern.id, date: date } }
      })
      
      if (existingBD) {
         return NextResponse.json({ error: `Absensi untuk tanggal ${date} sudah tercatat sebelumnya.` }, { status: 400 })
      }

      // Convert time string to Date objects enforcing WIB timezone (+07:00)
      const dIn = new Date(`${date}T${checkInTime}:00+07:00`)
      const dOut = new Date(`${date}T${checkOutTime}:00+07:00`)

      // Limit logic for backdate
      const limitBD = new Date(`${date}T07:30:00+07:00`)
      const bStatus = (dIn > limitBD) ? 'LATE' : 'PRESENT'

      console.log('[POST /api/attendance] Creating MANUAL_BACKDATE log for', intern.id, date)
      log = await prisma.attendanceLog.create({
        data: {
          internId: intern.id,
          date: date,
          checkIn: dIn,
          checkOut: dOut,
          checkInLoc: 'Klaim Susulan (Manual)',
          checkOutLoc: 'Klaim Susulan (Manual)',
          status: bStatus
        }
      })
      try { await db.addLog(userId, 'MANUAL_BACKDATE_CLAIM', { date, checkInTime, checkOutTime, status: bStatus }) } catch (_) {}
    }
    else if (type === 'OUT') {
      if (!existing) return NextResponse.json({ error: 'Anda belum Check In hari ini' }, { status: 400 })
      if (existing.checkOut) return NextResponse.json({ error: 'Anda sudah Check Out hari ini' }, { status: 400 })
      
      console.log('[POST /api/attendance] Updating check-out log for', intern.id)
      // Upload clock-out photo to Supabase Storage
      let resolvedFaceOutUrl = faceUrl || null
      if (!resolvedFaceOutUrl && faceBase64) {
        try {
          resolvedFaceOutUrl = await uploadBase64Photo(
            attendancePath(intern.id, today, 'out'),
            faceBase64
          )
        } catch (storageErr) {
          console.error('[POST /api/attendance] Storage upload failed for clock-out, falling back to Base64:', storageErr.message)
        }
      }

      log = await prisma.attendanceLog.update({
        where: { id: existing.id },
        data: {
          checkOut: now,
          checkOutLoc: location || 'Lokasi tidak tersedia',
          faceOutUrl:    resolvedFaceOutUrl,
          faceOutBase64: !resolvedFaceOutUrl && faceBase64 ? faceBase64 : null, // only fallback if storage failed
        }
      })
      try { await db.addLog(userId, 'CLOCK_OUT', { location }) } catch (_) {}
    }
    
    return NextResponse.json(serializeLog(log))
  } catch (err) {
    console.error('[POST /api/attendance] CRASH:', err)
    // Return actual error as JSON so frontend doesn't get HTML
    return NextResponse.json({ 
      error: 'Kesalahan Sistem: ' + err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    }, { status: 500 })
  }
}

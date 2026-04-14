import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic' // No caching
export const revalidate = 0

export async function GET() {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // ── Single source of truth: Prisma (same data as Manajemen Peserta Magang) ──
    // This guarantees Monitor Absensi is always in sync.
    // When Admin changes intern status to COMPLETED/DISMISSED in Manajemen Peserta,
    // they will automatically disappear from Monitor Absensi on the next refresh.
    const [logs, activeInterns] = await Promise.all([
      prisma.attendanceLog.findMany({
        where: { date: todayStr },
        orderBy: { checkIn: 'desc' }
      }),
      prisma.intern.findMany({
        where: {
          deletedAt: null,
          status: { equals: 'ACTIVE', mode: 'insensitive' }
        },
        select: { id: true, name: true, bidang: true },
        orderBy: { name: 'asc' }
      })
    ])

    const payload = activeInterns.map(i => {
      const log = logs.find(l => l.internId === i.id)

      // For Supabase Storage URLs: send directly (short string, fast)
      // For Base64: DON'T embed in response (too large) — send logId for lazy-load
      const faceInUrl    = log?.faceInUrl  || null
      const faceOutUrl   = log?.faceOutUrl || null
      const hasBase64In  = !faceInUrl  && !!log?.faceInBase64
      const hasBase64Out = !faceOutUrl && !!log?.faceOutBase64

      return {
        internId:     i.id,
        name:         i.name,
        bidang:       i.bidang || '-',
        status:       log ? log.status : 'ABSENT',
        checkIn:      log?.checkIn  || null,
        checkOut:     log?.checkOut || null,
        checkInLoc:   log?.checkInLoc || null,
        logId:        log?.id || null,
        faceInUrl,
        faceOutUrl,
        hasBase64In,
        hasBase64Out,
      }
    })

    // Sort: PRESENT → LATE → SAKIT → IZIN → ABSENT; within same status sort by checkIn desc
    const ORDER = { PRESENT: 0, LATE: 1, SAKIT: 2, IZIN: 3, ABSENT: 4 }
    const sorted = payload.sort((a, b) => {
      const diff = (ORDER[a.status] ?? 4) - (ORDER[b.status] ?? 4)
      if (diff !== 0) return diff
      if (a.checkIn && b.checkIn) return new Date(b.checkIn) - new Date(a.checkIn)
      return a.name.localeCompare(b.name, 'id')
    })

    return NextResponse.json({ live: sorted, total: sorted.length, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[GET /api/admin/attendance/live]', err)
    return NextResponse.json({ error: 'Failed to fetch live attendance' }, { status: 500 })
  }
}

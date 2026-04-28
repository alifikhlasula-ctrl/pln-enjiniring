import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic' // No caching
export const revalidate = 0

export async function GET() {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // ── Primary query: active interns + today's logs ──
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
        select: { id: true, name: true, bidang: true, periodEnd: true, status: true },
        orderBy: { name: 'asc' }
      })
    ])

    // Filter out interns who have completed their period
    const activeAndNotCompleted = activeInterns.filter(i => {
      if (!i.periodEnd) return true
      return i.periodEnd >= todayStr
    })

    // ── BUG FIX: Resolve orphaned log internIds that don't match active interns ──
    // These are interns who absen but may be COMPLETED, soft-deleted, or created via
    // legacy JSON system. We look them up separately so they never show as "Unknown".
    const activeInternIds = new Set(activeAndNotCompleted.map(i => i.id))
    const orphanedInternIds = [...new Set(
      logs
        .map(l => l.internId)
        .filter(id => !activeInternIds.has(id))
    )]

    let orphanInterns = []
    if (orphanedInternIds.length > 0) {
      orphanInterns = await prisma.intern.findMany({
        where: { id: { in: orphanedInternIds } },
        select: { id: true, name: true, bidang: true, periodEnd: true, deletedAt: true, status: true }
      })
    }

    // Last resort: try User table (legacy records where internId === userId)
    const resolvedOrphanIds = new Set(orphanInterns.map(i => i.id))
    const stillUnknownIds = orphanedInternIds.filter(id => !resolvedOrphanIds.has(id))
    let userFallbacks = []
    if (stillUnknownIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: stillUnknownIds } },
        select: { id: true, name: true }
      })
      userFallbacks = users.map(u => ({ id: u.id, name: u.name, bidang: '-', periodEnd: null, status: 'UNKNOWN' }))
    }

    // Build a unified lookup map: internId → intern data
    const internMap = new Map()
    for (const i of [...activeAndNotCompleted, ...orphanInterns, ...userFallbacks]) {
      internMap.set(i.id, i)
    }

    const buildEntry = (intern, log) => {
      const faceInUrl    = log?.faceInUrl  || null
      const faceOutUrl   = log?.faceOutUrl || null
      const hasBase64In  = !faceInUrl  && !!log?.faceInBase64
      const hasBase64Out = !faceOutUrl && !!log?.faceOutBase64

      return {
        internId:     intern.id,
        name:         intern.name || 'Intern Tidak Dikenal',
        bidang:       intern.bidang || '-',
        status:       log ? log.status : 'ABSENT',
        checkIn:      log?.checkIn  ? log.checkIn.toISOString()  : null,
        checkOut:     log?.checkOut ? log.checkOut.toISOString() : null,
        checkInLoc:   log?.checkInLoc || null,
        logId:        log?.id || null,
        faceInUrl,
        faceOutUrl,
        hasBase64In,
        hasBase64Out,
        isOrphaned:   !activeInternIds.has(intern.id),
        internStatus: intern.status || null,
      }
    }

    // Active interns (with or without a log today)
    const activePayload = activeAndNotCompleted.map(i => {
      const log = logs.find(l => l.internId === i.id)
      return buildEntry(i, log)
    })

    // Orphaned logs: interns not in active list but have attendance today
    const orphanedPayload = logs
      .filter(l => !activeInternIds.has(l.internId))
      .map(l => {
        const intern = internMap.get(l.internId) || {
          id: l.internId, name: 'Intern Tidak Dikenal', bidang: '-', periodEnd: null, status: null
        }
        return buildEntry(intern, l)
      })
      // Deduplicate
      .filter((v, i, arr) => arr.findIndex(x => x.internId === v.internId) === i)

    const payload = [...activePayload, ...orphanedPayload]

    // Sort: PRESENT → LATE → SAKIT → IZIN → ABSENT
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

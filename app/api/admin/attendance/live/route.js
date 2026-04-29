import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDB } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ── Minimal effective-status resolver (mirrors lib/db.js getEffectiveStatus) ──
function getEffectiveStatus(intern) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  
  if (intern.deletedAt) {
    const deletedDate = new Date(intern.deletedAt)
    if (deletedDate < today) return 'TERMINATED'
  }
  
  const s = String(intern.status || 'ACTIVE').toUpperCase()
  if (s === 'TERMINATED') return 'TERMINATED'
  if (s === 'ACTIVE' || s === 'PENDING') {
    if (intern.periodStart) {
      const start = new Date(intern.periodStart + 'T00:00:00Z')
      if (start > today) return 'PENDING'
    }
    if (intern.periodEnd && intern.periodEnd < todayStr) return 'COMPLETED'
  }
  if (s === 'PENDING') return 'PENDING'
  return s
}

export async function GET() {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    const todayMMDD = `${todayStr.split('-')[1]}-${todayStr.split('-')[2]}`

    // ── Fetch today's logs + ALL interns from ALL sources ──
    // We must not filter by status here — effective status is computed in JS.
    const [logs, prismaInterns] = await Promise.all([
      prisma.attendanceLog.findMany({
        where: { date: todayStr },
        orderBy: { checkIn: 'desc' }
      }),
      prisma.intern.findMany({
        // No deletedAt filter: include deleted interns so their logs aren't orphaned
        select: {
          id: true, name: true, bidang: true,
          periodStart: true, periodEnd: true,
          status: true, birthDate: true, deletedAt: true
        },
        orderBy: { name: 'asc' }
      })
    ])

    // ── Also fetch legacy interns from JsonStore (ids like i177xxxx) ──
    // These ONLY exist in JsonStore, not in Prisma — critical for name resolution
    let legacyInterns = []
    try {
      const [activeDB, archiveDB] = await Promise.all([
        getDB('ACTIVE'),
        getDB('ARCHIVE')
      ])
      legacyInterns = [
        ...(activeDB.interns || []),
        ...(archiveDB.interns || [])
      ]
    } catch (e) {
      console.error('[live] Legacy intern fetch error:', e.message)
    }

    // ── Merge: JsonStore interns first (lower priority), Prisma overrides ──
    const mergedMap = new Map()
    for (const i of legacyInterns) mergedMap.set(i.id, i)
    for (const i of prismaInterns)  mergedMap.set(i.id, i)
    const allInterns = Array.from(mergedMap.values())

    // Compute effective status for each intern in JS (not in DB query)
    const internsWithEffectiveStatus = allInterns.map(i => ({
      ...i,
      effectiveStatus: getEffectiveStatus(i)
    }))

    // Only show ACTIVE interns in the monitor (not PENDING/COMPLETED/TERMINATED)
    const activeInterns = internsWithEffectiveStatus.filter(i =>
      i.effectiveStatus === 'ACTIVE'
    )

    // Build a full lookup map for ALL interns (for resolving orphaned logs)
    const internMap = new Map(internsWithEffectiveStatus.map(i => [i.id, i]))

    // ── Resolve any log internIds that don't map to a known intern ──
    const activeInternIds = new Set(activeInterns.map(i => i.id))
    const allInternIds    = new Set(allInterns.map(i => i.id))

    const stillUnknownIds = [...new Set(
      logs.map(l => l.internId).filter(id => !allInternIds.has(id))
    )]

    // Last resort: internId may be a userId (legacy data) — try User table
    let userFallbacks = []
    if (stillUnknownIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: stillUnknownIds } },
        select: { id: true, name: true }
      })
      userFallbacks = users.map(u => ({
        id: u.id, name: u.name || `ID: ${u.id.slice(0, 8)}`,
        bidang: '-', periodStart: null, periodEnd: null,
        status: 'UNKNOWN', effectiveStatus: 'UNKNOWN', birthDate: null
      }))
      for (const u of userFallbacks) internMap.set(u.id, u)
    }

    const buildEntry = (intern, log) => {
      const faceInUrl    = log?.faceInUrl  || null
      const faceOutUrl   = log?.faceOutUrl || null
      const hasBase64In  = !faceInUrl  && !!log?.faceInBase64
      const hasBase64Out = !faceOutUrl && !!log?.faceOutBase64

      // 🎂 Birthday check (MM-DD, WIB-safe)
      const bParts     = intern.birthDate ? intern.birthDate.split('T')[0].split('-') : null
      const internMMDD = bParts && bParts.length >= 3 ? `${bParts[1]}-${bParts[2]}` : null
      const isBirthday = !!internMMDD && internMMDD === todayMMDD

      return {
        internId:     intern.id,
        name:         intern.name || `Intern (${intern.id?.slice(0, 8) ?? '?'})`,
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
        internStatus: intern.effectiveStatus || intern.status || null,
        birthDate:    intern.birthDate || null,
        isBirthday,
      }
    }

    // Active interns (with or without a log today)
    const activePayload = activeInterns.map(i => {
      const log = logs.find(l => l.internId === i.id)
      return buildEntry(i, log)
    })

    // Orphaned logs (have attendance today but not in active monitor list)
    // Note: internMap already includes legacy JsonStore interns, so most
    // 'Intern (i177xxxx)' IDs should now be resolved here.
    const orphanedPayload = logs
      .filter(l => !activeInternIds.has(l.internId))
      .map(l => {
        const intern = internMap.get(l.internId) || {
          id: l.internId,
          name: `⚠ Unknown (${l.internId.slice(0, 8)})`,
          bidang: '-', periodStart: null, periodEnd: null,
          status: null, effectiveStatus: null, birthDate: null
        }
        return buildEntry(intern, l)
      })
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

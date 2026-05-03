import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ── GET /api/admin/workforce ──────────────────────────────────────────
// Returns per-bidang quota, active count, slot availability, and
// intern turnover lists (entering/exiting with names+dates).
export async function GET() {
  try {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // Window: 60 days ahead for "keluar soon" detection
    const sixtyDaysAhead = new Date(today)
    sixtyDaysAhead.setDate(sixtyDaysAhead.getDate() + 60)
    const sixtyDaysAheadStr = sixtyDaysAhead.toISOString().split('T')[0]

    // Current month prefix YYYY-MM
    const currentMonth = todayStr.slice(0, 7)

    // ── Fetch in parallel ──
    const [allInterns, quotaRecords] = await Promise.all([
      prisma.intern.findMany({
        where: { deletedAt: null },
        select: {
          id: true, name: true, bidang: true, status: true,
          periodStart: true, periodEnd: true
        }
      }),
      prisma.departmentQuota.findMany()
    ])

    // Build quota map: name → { quota, direktorat, id }
    const quotaMap = {}
    for (const q of quotaRecords) quotaMap[q.name] = { quota: q.quota, direktorat: q.direktorat, id: q.id }

    // ── Collect all unique bidang from interns + quota records ──
    const bidangSet = new Set([
      ...allInterns.map(i => i.bidang || 'Lainnya'),
      ...quotaRecords.map(q => q.name)
    ])

    // ── Build per-bidang data ──
    const departments = []

    for (const bidang of bidangSet) {
      const internsBidang = allInterns.filter(i => (i.bidang || 'Lainnya') === bidang)

      // Classify each intern
      const active = []      // Currently active
      const masuk = []       // PENDING — akan masuk
      const keluar = []      // Active, exiting within 60 days
      const selesai = []     // COMPLETED / Alumni

      for (const intern of internsBidang) {
        const status = (intern.status || 'ACTIVE').toUpperCase()
        const effStatus = status === 'ACTIVE' && intern.periodEnd && intern.periodEnd < todayStr
          ? 'COMPLETED'
          : status === 'ACTIVE' && intern.periodStart && intern.periodStart > todayStr
          ? 'PENDING'
          : status

        if (effStatus === 'ACTIVE') {
          active.push(intern)

          // Exiting within 60 days
          if (intern.periodEnd && intern.periodEnd >= todayStr && intern.periodEnd <= sixtyDaysAheadStr) {
            keluar.push({ name: intern.name, periodEnd: intern.periodEnd })
          }
        } else if (effStatus === 'PENDING') {
          masuk.push({ name: intern.name, periodStart: intern.periodStart })
        } else if (effStatus === 'COMPLETED' || effStatus === 'ALUMNI') {
          selesai.push({ name: intern.name, periodEnd: intern.periodEnd })
        }
      }

      // Projection for current month
      const masukThisMonth = masuk.filter(m => m.periodStart && m.periodStart.startsWith(currentMonth))
      const keluarThisMonth = keluar.filter(k => k.periodEnd && k.periodEnd.startsWith(currentMonth))
      const proyeksi = active.length - keluarThisMonth.length + masukThisMonth.length

      const qData = quotaMap[bidang] || { quota: 0, direktorat: null, id: null }
      const quota = qData.quota
      const direktorat = qData.direktorat || 'Uncategorized'
      const masterId = qData.id

      const activeCount = active.length
      const slotTersedia = quota > 0 ? quota - activeCount : null // null if quota not set

      // Sort by date
      masuk.sort((a, b) => (a.periodStart || '').localeCompare(b.periodStart || ''))
      keluar.sort((a, b) => (a.periodEnd || '').localeCompare(b.periodEnd || ''))

      departments.push({
        masterId,
        bidang,
        direktorat,
        quota,
        active: activeCount,
        slotTersedia,
        proyeksi,
        masuk,         // Full list of pending interns (with periodStart)
        keluar,        // Interns exiting within 60 days (with periodEnd)
        selesai,       // Interns who completed their internship
        masukCount: masuk.length,
        keluarCount: keluar.length,
        selesaiCount: selesai.length,
        overCapacity: quota > 0 && activeCount > quota,
        almostFull: quota > 0 && slotTersedia !== null && slotTersedia <= 1 && slotTersedia >= 0,
      })
    }

    // Sort: over-capacity first, then by active desc
    departments.sort((a, b) => {
      if (a.overCapacity && !b.overCapacity) return -1
      if (!a.overCapacity && b.overCapacity) return 1
      return b.active - a.active
    })

    // ── Summary stats ──
    const totalDepts = departments.length
    const overCapacityCount = departments.filter(d => d.overCapacity).length
    const noQuotaCount = departments.filter(d => d.quota === 0).length
    const totalSlotTersedia = departments
      .filter(d => d.slotTersedia !== null && d.slotTersedia > 0)
      .reduce((s, d) => s + d.slotTersedia, 0)
    const safeCount = departments.filter(d => d.quota > 0 && !d.overCapacity && d.slotTersedia > 1).length

    return NextResponse.json({
      departments,
      summary: {
        totalDepts,
        overCapacityCount,
        safeCount,
        noQuotaCount,
        totalSlotTersedia,
      },
      updatedAt: new Date().toISOString()
    })
  } catch (err) {
    console.error('[GET /api/admin/workforce]', err)
    return NextResponse.json({ error: 'Failed to fetch workforce data' }, { status: 500 })
  }
}

// ── PUT /api/admin/workforce ──────────────────────────────────────────
// Body: { name: string, quota: number, direktorat?: string }
// Upserts the quota for a specific department.
export async function PUT(request) {
  try {
    const body = await request.json()
    const { name, quota, direktorat } = body

    if (!name || quota === undefined || quota < 0) {
      return NextResponse.json({ error: 'Invalid name or quota' }, { status: 400 })
    }

    const record = await prisma.departmentQuota.upsert({
      where: { name },
      update: { quota: parseInt(quota), direktorat: direktorat || null },
      create: { name, quota: parseInt(quota), direktorat: direktorat || null }
    })

    return NextResponse.json({ success: true, record })
  } catch (err) {
    console.error('[PUT /api/admin/workforce]', err)
    return NextResponse.json({ error: 'Failed to update quota' }, { status: 500 })
  }
}

// ── DELETE /api/admin/workforce ────────────────────────────────────────
// Body: { name: string }
export async function DELETE(request) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }

    await prisma.departmentQuota.delete({
      where: { name }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/admin/workforce]', err)
    return NextResponse.json({ error: 'Failed to delete department master data' }, { status: 500 })
  }
}

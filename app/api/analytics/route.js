import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { prisma } from '@/lib/prisma'

// ── MONTHS constant must be declared at the top (BUG-02 fix) ─────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const sub = searchParams.get('sub') || 'overview'
  const data = await getDB()

  const today  = new Date(); today.setHours(0,0,0,0)
  const interns = (data.interns || []).filter(i => !i.deletedAt)
  const active  = interns.filter(i => i.status === 'ACTIVE')

  /* ── Attendance Heatmap (last 12 weeks) ─────────── */
  // BUG-11 FIX: Read from Prisma AttendanceLog (SQLite), not stale JSON attendances
  if (sub === 'heatmap') {
    let sqlLogs = []
    try {
      sqlLogs = await prisma.attendanceLog.findMany({
        select: { date: true, status: true }
      })
    } catch (e) {
      console.error('[analytics/heatmap] Prisma error, falling back to JSON:', e.message)
      sqlLogs = (data.attendances || []).map(a => ({ date: a.date || a.checkIn?.split('T')[0], status: a.status }))
    }

    const weeks = []
    for (let w = 11; w >= 0; w--) {
      const days = []
      for (let d = 0; d < 7; d++) {
        const dt = new Date(today)
        dt.setDate(dt.getDate() - (w * 7) - (6 - d))
        const ds = dt.toISOString().split('T')[0]
        const count = sqlLogs.filter(a => a.date === ds && ['PRESENT','LATE'].includes(a.status)).length
        days.push({ date: ds, count, day: d })
      }
      weeks.push(days)
    }
    return NextResponse.json({ weeks })
  }

  /* ── Retention trend per bidang ─────────────────── */
  if (sub === 'retention') {
    const byBidang = {}
    interns.forEach(i => {
      const b = i.bidang || 'Lainnya'
      if (!byBidang[b]) byBidang[b] = { total: 0, active: 0, completed: 0, terminated: 0 }
      byBidang[b].total++
      if (i.status === 'ACTIVE')     byBidang[b].active++
      if (i.status === 'COMPLETED')  byBidang[b].completed++
      if (i.status === 'TERMINATED') byBidang[b].terminated++
    })
    const result = Object.entries(byBidang).map(([bidang, v]) => ({
      bidang, ...v,
      retentionRate: v.total ? Math.round(((v.active + v.completed) / v.total) * 100) : 0
    })).sort((a, b) => b.total - a.total)
    return NextResponse.json({ retention: result })
  }

  /* ── Allowance cost per month (last 6 months) ───── */
  // BUG-01 FIX: Read p.period (format 'YYYY-MM') instead of p.bulan/p.tahun which don't exist
  if (sub === 'allowance') {
    const months = []
    for (let m = 5; m >= 0; m--) {
      const dt = new Date(today.getFullYear(), today.getMonth() - m, 1)
      const bulan = dt.getMonth() + 1
      const tahun = dt.getFullYear()
      const periodKey = `${tahun}-${String(bulan).padStart(2, '0')}`

      // p.period is stored as 'YYYY-MM' or may be a range 'startDate_endDate'
      const pays = (data.payrolls || []).filter(p => {
        if (!p.period) return false
        // Handle standard month period
        if (p.period === periodKey) return true
        // Handle range periods that fall within this month
        if (p.period.includes('_')) {
          const [s] = p.period.split('_')
          return s && s.startsWith(periodKey)
        }
        return false
      })

      const total = pays.reduce((s, p) => s + (p.totalAllowance || p.total || 0), 0)
      const paid  = pays.filter(p => ['PAID','TRANSFERRED'].includes(p.status)).reduce((s, p) => s + (p.totalAllowance || p.total || 0), 0)
      months.push({
        label: `${MONTHS[bulan - 1]} ${tahun}`,
        bulan, tahun, total, paid,
        pending: total - paid, count: pays.length
      })
    }
    return NextResponse.json({ allowance: months })
  }

  /* ── Department comparison ───────────────────────── */
  if (sub === 'departments') {
    const byWilayah = {}
    interns.forEach(i => {
      const w = i.wilayah || 'Lainnya'
      if (!byWilayah[w]) byWilayah[w] = { wilayah: w, total: 0, active: 0, evalAvg: 0, evalCount: 0 }
      byWilayah[w].total++
      if (i.status === 'ACTIVE') byWilayah[w].active++
      const evals = (data.evaluations || []).filter(e => e.internId === i.id)
      if (evals.length) {
        byWilayah[w].evalAvg   += evals.reduce((s, e) => s + (e.finalScore || 0), 0) / evals.length
        byWilayah[w].evalCount += 1
      }
    })
    const result = Object.values(byWilayah).map(w => ({
      ...w, avgScore: w.evalCount > 0 ? Math.round((w.evalAvg / w.evalCount) * 10) / 10 : null
    })).sort((a, b) => b.total - a.total)
    return NextResponse.json({ departments: result })
  }

  /* ── Overview (all stats combined) ─────────────── */
  // BUG-11 FIX: Count from Prisma for accurate attendance totals
  let totalAttendance = 0
  try {
    totalAttendance = await prisma.attendanceLog.count({
      where: { status: { in: ['PRESENT', 'LATE'] } }
    })
  } catch (e) {
    // fallback to JSON attendances
    totalAttendance = (data.attendances || []).filter(a => ['PRESENT','LATE'].includes(a.status)).length
  }

  const evalScores     = (data.evaluations || []).map(e => e.finalScore || 0)
  const avgEvalScore   = evalScores.length ? (evalScores.reduce((s, v) => s + v, 0) / evalScores.length).toFixed(1) : null

  // BUG-01 FIX: use p.period (YYYY-MM) and p.totalAllowance instead of p.bulan/p.total
  const thisPeriodKey  = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const thisMonthPay   = (data.payrolls || []).filter(p => p.period === thisPeriodKey)
  const totalMonthCost = thisMonthPay.reduce((s, p) => s + (p.totalAllowance || 0), 0)

  return NextResponse.json({
    overview: {
      totalInterns:    interns.length,
      activeInterns:   active.length,
      completedInterns: interns.filter(i => i.status === 'COMPLETED').length,
      totalAttendanceDays: totalAttendance,
      avgAttendancePerIntern: active.length ? Math.round(totalAttendance / active.length) : 0,
      avgEvalScore,
      totalEvaluations: (data.evaluations || []).length,
      thisMonthPayrollCost: totalMonthCost,
      thisMonthPayrollCount: thisMonthPay.length,
    }
  })
}

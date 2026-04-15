import { NextResponse } from 'next/server'
import { getDB, db } from '@/lib/db'
import { prisma } from '@/lib/prisma'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const targetTahun = searchParams.get('tahun') || '2026'
    
    const today = new Date(); today.setHours(0,0,0,0)
    const todayStr = today.toISOString().split('T')[0]
    const in14  = new Date(today.getTime() + 14 * 86400000)
    const DAYS = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']
    const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]
    const todayStr2 = today.toISOString().split('T')[0]

    // ── Parallel Execution: Fetch all independent data sources at once ──
    const [data, allInterns, onboarding, auditLogs, checkinToday, weeklyRaw, recentAttendance, todayLogs] = await Promise.all([
      getDB('ACTIVE', { clone: false }),
      db.getInterns(false),
      prisma.onboarding.findMany(),
      prisma.auditLog.findMany({ take: 50, orderBy: { timestamp: 'desc' } }),
      prisma.attendanceLog.count({ where: { date: todayStr, checkIn: { not: null } } }),
      prisma.attendanceLog.groupBy({
        by: ['date'],
        where: { date: { gte: sevenDaysAgoStr, lte: todayStr2 }, status: 'PRESENT' },
        _count: { id: true }
      }),
      prisma.attendanceLog.findMany({ take: 8, orderBy: { createdAt: 'desc' } }),
      prisma.attendanceLog.findMany({
        where: { date: todayStr },
        select: { internId: true, status: true, checkIn: true, checkOut: true }
      })
    ])

    // Main KPIs focus on the Target Year (Program Active)
    const activeInterns    = allInterns.filter(i => i.status === 'ACTIVE' && i.tahun === targetTahun)
    const completedInterns = allInterns.filter(i => i.status === 'COMPLETED' && i.tahun === targetTahun)
    const terminatedInterns= allInterns.filter(i => i.status === 'TERMINATED' && i.tahun === targetTahun)

    const weeklyCountMap = Object.fromEntries(weeklyRaw.map(r => [r.date, r._count.id]))

    const weeklyAttendance = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (6 - i))
      const ds = d.toISOString().split('T')[0]
      return { day: DAYS[d.getDay()], date: ds, count: weeklyCountMap[ds] || 0 }
    })

    const recentAttendanceWithNames = recentAttendance.map(log => {
      const intern = allInterns.find(i => i.id === log.internId)
      return {
        ...log,
        internName: intern?.name || 'Unknown Intern',
        checkIn: log.checkIn?.toISOString() || null,
        checkOut: log.checkOut?.toISOString() || null,
        createdAt: log.createdAt?.toISOString() || null,
      }
    })

    // ── Other Stats (JSON) ─────────────────────────────
    const pendingPayroll = (data.payrolls || []).filter(p => p.status === 'PENDING').length
    const totalExpenses  = (data.payrolls || []).filter(p => p.status === 'PAID' && p.period === todayStr.slice(0,7)).reduce((s, p) => s + (p.totalAllowance || 0), 0)
    
    const pendingOnboarding = onboarding.filter(o => o.status === 'PENDING').length

    // ── Evaluasi Stats ─────────────────────────────────
    const evals = data.evaluations || []
    const avgEvalScore = evals.length ? (evals.reduce((s, e) => s + e.finalScore, 0) / evals.length).toFixed(1) : 0
    const pendingEvals = activeInterns.filter(i => !evals.some(e => e.internId === i.id)).length

    // ── Survei Stats ───────────────────────────────────
    const surveys = data.surveys || []
    const activeSurveys = surveys.filter(s => s.active).length
    const totalResponses = (data.surveyResponses || []).length

    const expiringInterns = activeInterns.filter(i => {
      if (!i.periodEnd) return false
      const e = new Date(i.periodEnd)
      return e >= today && e <= in14
    }).map(i => ({
      id: i.id, name: i.name, university: i.university,
      periodEnd: i.periodEnd,
      sisaHari: Math.ceil((new Date(i.periodEnd) - today) / 86400000)
    })).sort((a,b) => a.sisaHari - b.sisaHari).slice(0, 8)

    const recentInterns = [...allInterns]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(i => ({ id: i.id, name: i.name, university: i.university, major: i.major, status: i.status, jenjang: i.jenjang }))

    // Match audit log users (Admin check)
    const allUsers = await prisma.user.findMany({
        where: { id: { in: auditLogs.map(l => l.userId).filter(Boolean) } }
    });

    const activityFeed = auditLogs
      .slice(0, 12)
      .map(log => {
        const u = allUsers.find(u => u.id === log.userId)
        return { 
            id: log.id,
            action: log.action,
            details: log.details,
            timestamp: log.timestamp.toISOString(),
            userName: u?.name || 'System' 
        }
      })

    const onboardingStats = {
      PENDING:  onboarding.filter(o => o.status === 'PENDING').length,
      APPROVED: onboarding.filter(o => o.status === 'APPROVED').length,
      REJECTED: onboarding.filter(o => o.status === 'REJECTED').length,
      total:    onboarding.length
    }

    // ── Analytics for Active + Completed ───────
    const pool = allInterns.filter(i => i.status === 'ACTIVE' || i.status === 'COMPLETED')

    const byJenjang = pool.reduce((acc, i) => {
      acc[i.jenjang || 'Lainnya'] = (acc[i.jenjang || 'Lainnya'] || 0) + 1
      return acc
    }, {})

    const byBidang = pool.reduce((acc, i) => {
      const b = i.bidang || 'Lainnya'
      acc[b] = (acc[b] || 0) + 1
      return acc
    }, {})
    
    const byUniversity = pool.reduce((acc, i) => {
      const u = (i.university || 'Lainnya').trim()
      acc[u] = (acc[u] || 0) + 1
      return acc
    }, {})

    const byGender = pool.reduce((acc, i) => {
      let g = (i.gender || 'Lainnya').trim()
      // Normalize Indonesian labels
      const gl = g.toLowerCase()
      if (gl === 'laki-laki' || gl === 'pria' || gl === 'l') g = 'Laki-laki'
      else if (gl === 'perempuan' || gl === 'wanita' || gl === 'p') g = 'Perempuan'
      
      acc[g] = (acc[g] || 0) + 1
      return acc
    }, {})

    const byMajor = pool.reduce((acc, i) => {
      const m = (i.major || 'Lainnya').trim()
      acc[m] = (acc[m] || 0) + 1
      return acc
    }, {})

    // ── Today Attendance Summary (Hadir / Izin/Sakit / Belum Absen) ──
    const todayLogMap = Object.fromEntries(todayLogs.map(l => [l.internId, l]))
    const todayAttendanceSummary = activeInterns.map(i => {
      const log = todayLogMap[i.id]
      return {
        internId: i.id,
        name:     i.name,
        bidang:   i.bidang || '-',
        status:   log?.status || 'ABSENT',
        checkIn:  log?.checkIn  ? new Date(log.checkIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null,
        checkOut: log?.checkOut ? new Date(log.checkOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null,
      }
    }).sort((a, b) => {
      const ORDER = { PRESENT: 0, LATE: 1, SAKIT: 2, IZIN: 3, ABSENT: 4 }
      return (ORDER[a.status] ?? 4) - (ORDER[b.status] ?? 4)
    })

    const todayCounts = {
      hadir:      todayAttendanceSummary.filter(x => x.status === 'PRESENT' || x.status === 'LATE').length,
      izinSakit:  todayAttendanceSummary.filter(x => x.status === 'IZIN' || x.status === 'SAKIT').length,
      belumAbsen: todayAttendanceSummary.filter(x => x.status === 'ABSENT').length,
    }

    const response = NextResponse.json({
      stats: {
        activeInterns:    activeInterns.length,
        completedInterns: completedInterns.length,
        terminatedInterns:terminatedInterns.length,
        checkinToday,
        pendingPayroll,
        totalExpenses,
        pendingOnboarding,
        avgEvalScore,
        pendingEvals,
        activeSurveys,
        totalResponses,
        expiringSoon:    expiringInterns.length,
        totalInterns:    allInterns.length,
        totalUsers:      (data.users || []).length,
        todayHadir:      todayCounts.hadir,
        todayIzinSakit:  todayCounts.izinSakit,
        todayBelumAbsen: todayCounts.belumAbsen,
      },
      weeklyAttendance,
      recentAttendance: recentAttendanceWithNames,
      recentInterns,
      expiringInterns,
      activityFeed,
      onboardingStats,
      byJenjang,
      byBidang,
      byUniversity,
      byGender,
      byMajor,
      todayAttendanceSummary,
    })

    // Edge Caching: Cache for 15 seconds, serve stale while revalidating in background
    response.headers.set('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60')
    return response

  } catch (err) {
    console.error('[GET /api/dashboard] ERROR:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

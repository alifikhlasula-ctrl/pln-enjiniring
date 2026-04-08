import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const data = await getDB()
    const today = new Date(); today.setHours(0,0,0,0)
    const todayStr = today.toISOString().split('T')[0]
    const in14  = new Date(today.getTime() + 14 * 86400000)

    // ── Helper: Hitung status dinamis (Sinkron dengan /api/interns) ──
    const getEffectiveStatus = (i) => {
      const s = String(i.status || 'ACTIVE').toUpperCase()
      if (s === 'TERMINATED') return 'TERMINATED'
      if (s === 'ACTIVE' && i.periodEnd) {
        const end = new Date(i.periodEnd); end.setHours(0,0,0,0)
        if (end < today) return 'COMPLETED'
      }
      return s
    }

    // ── Transform all interns with their effective status ──
    const allInternsRaw = (data.interns || []).filter(i => !i.deletedAt)
    const allInterns = allInternsRaw.map(i => ({
      ...i,
      status: getEffectiveStatus(i)
    }))

    const activeInterns    = allInterns.filter(i => i.status === 'ACTIVE')
    const completedInterns = allInterns.filter(i => i.status === 'COMPLETED')
    const terminatedInterns= allInterns.filter(i => i.status === 'TERMINATED')

    // ── Real Attendance Stats (SQL) ────────────────────
    const checkinToday = await prisma.attendanceLog.count({
      where: { date: todayStr, checkIn: { not: null } }
    })

    // ── Weekly attendance (last 7 days from SQL) ───────
    const DAYS = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']
    const weeklyAttendance = await Promise.all(
      Array.from({length: 7}, async (_, i) => {
        const d = new Date(today); d.setDate(d.getDate() - (6 - i))
        const ds = d.toISOString().split('T')[0]
        const count = await prisma.attendanceLog.count({
          where: { date: ds, status: 'PRESENT' } 
        })
        return { day: DAYS[d.getDay()], date: ds, count }
      })
    )

    // ── Recent Attendance Logs (SQL) ───────────────────
    const recentAttendance = await prisma.attendanceLog.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' }
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
    
    const onboarding = data.onboarding || []
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
      .slice(-5).reverse()
      .map(i => ({ id: i.id, name: i.name, university: i.university, major: i.major, status: i.status, jenjang: i.jenjang }))

    const activityFeed = [...(data.auditLogs || [])]
      .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 12)
      .map(log => {
        const user = data.users.find(u => u.id === log.userId)
        return { ...log, userName: user?.name || 'System' }
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

    return NextResponse.json({
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
        totalUsers:      (data.users || []).length
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
      byMajor
    })
  } catch (err) {
    console.error('[GET /api/dashboard] ERROR:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

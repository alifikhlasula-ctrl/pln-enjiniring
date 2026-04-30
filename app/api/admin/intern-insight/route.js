import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // ── Parallel fetch all data sources ──
    const [
      allInterns, allReports, allPayrolls,
      allEvals, allOnboardings
    ] = await Promise.all([
      prisma.intern.findMany({ where: { deletedAt: null } }),
      prisma.dailyReport.findMany({ orderBy: { date: 'desc' }, select: { userId: true, date: true, status: true, internName: true, mood: true, activity: true, skills: true } }),
      prisma.payrollRecord.findMany({
        select: {
          id: true, internId: true, period: true, status: true,
          presenceCount: true, validPresenceCount: true, allowanceRate: true,
          totalAllowance: true, paidAt: true, createdAt: true, notes: true
        }
      }),
      prisma.evaluation.findMany(),
      prisma.onboarding.findMany()
    ])

    // ── Compute 30-day window dates ──
    const wibOffset = 7 * 60 * 60 * 1000
    const wibNow = new Date(today.getTime() + wibOffset)
    const todayWib = wibNow.toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(wibNow)
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    // ── Fetch ALL attendance for cross-validation (payroll calc) ──
    let allAttendance = []
    try {
      allAttendance = await prisma.attendanceLog.findMany({
        select: { internId: true, date: true, status: true, checkIn: true, checkOut: true }
      })
    } catch (e) {
      console.warn('[insight] Prisma attendanceLog failed:', e.message)
    }

    // ── Fetch attendance for trend: ONLY last 30 days, same as analytics/heatmap ──
    let trendAttendance = []
    try {
      trendAttendance = await prisma.attendanceLog.findMany({
        where: {
          date: { gte: thirtyDaysAgoStr, lte: todayWib },
          status: { in: ['PRESENT', 'LATE', 'SAKIT', 'IZIN'] }
        },
        select: { date: true, status: true }
      })
    } catch (e) {
      console.warn('[insight] Prisma trendAttendance failed:', e.message)
    }

    // ── JSON legacy fallback for both ──
    try {
      const jsonData = await getDB()
      const jsonAtt = (jsonData.attendances || [])
      if (allAttendance.length === 0 && jsonAtt.length > 0) {
        const normalize = (d) => {
          if (!d) return null
          const s = String(d).slice(0, 10)
          if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
            const [dd, mm, yyyy] = s.split('/'); return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`
          }
          return s
        }
        allAttendance = jsonAtt.map(a => ({
          internId: a.internId,
          date: normalize(a.date || a.checkIn),
          status: a.status || 'PRESENT',
          checkIn: a.checkIn || null,
          checkOut: a.checkOut || null
        })).filter(a => a.date)
      }
      if (trendAttendance.length === 0 && jsonAtt.length > 0) {
        const normalize = (d) => {
          if (!d) return null
          const s = String(d).slice(0, 10)
          if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
            const [dd, mm, yyyy] = s.split('/'); return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`
          }
          return s
        }
        trendAttendance = jsonAtt
          .map(a => ({ date: normalize(a.date || a.checkIn), status: a.status || 'PRESENT' }))
          .filter(a => a.date && a.date >= thirtyDaysAgoStr && a.date <= todayWib)
      }
    } catch (e) {
      console.warn('[insight] JSON fallback attendance failed:', e.message)
    }


    // ── Build lookup maps for fast O(1) access ──
    const FLAT_RATE = 25000

    // Map: internId -> intern object
    const internById = {}
    for (const intern of allInterns) internById[intern.id] = intern

    // Map: internId -> Set of dates with valid PRESENT/LATE attendance
    const attendanceByIntern = {}
    for (const log of allAttendance) {
      if (!['PRESENT', 'LATE'].includes(log.status)) continue
      if (!attendanceByIntern[log.internId]) attendanceByIntern[log.internId] = []
      attendanceByIntern[log.internId].push(log.date) // date format YYYY-MM-DD
    }

    // Map: userId -> Set of dates with submitted report
    const reportsByUser = {}
    for (const r of allReports) {
      if (r.status === 'DRAFT') continue
      if (!reportsByUser[r.userId]) reportsByUser[r.userId] = new Set()
      // Normalize date to YYYY-MM-DD
      const d = r.date ? String(r.date).slice(0, 10) : null
      if (d) reportsByUser[r.userId].add(d)
    }

    // Helper: parse period to {startDate, endDate} — supports both YYYY-MM and startDate_endDate
    function parsePeriod(period) {
      if (!period) return null
      if (/^\d{4}-\d{2}$/.test(period)) {
        // YYYY-MM: full month
        const [y, m] = period.split('-')
        const start = `${y}-${m}-01`
        const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate()
        const end = `${y}-${m}-${String(lastDay).padStart(2, '0')}`
        return { startDate: start, endDate: end }
      }
      if (period.includes('_')) {
        const [s, e] = period.split('_')
        return { startDate: s, endDate: e }
      }
      return null
    }

    // ── Recompute _effectiveAllowance for EVERY PayrollRecord using real attendance×report data ──
    for (const pr of allPayrolls) {
      const intern = internById[pr.internId]
      if (!intern) { pr._effectiveAllowance = 0; continue }

      const range = parsePeriod(pr.period)
      if (!range) { pr._effectiveAllowance = 0; continue }

      const { startDate, endDate } = range
      const attendanceDates = attendanceByIntern[pr.internId] || []
      const userReportDates = reportsByUser[intern.userId] || new Set()

      // Cross-validate: attendance date in range AND has report that day
      let validDays = 0
      for (const attDate of attendanceDates) {
        if (attDate >= startDate && attDate <= endDate) {
          if (userReportDates.has(attDate)) validDays++
        }
      }

      pr._effectiveAllowance = validDays * FLAT_RATE
      pr._recomputedValidDays = validDays
    }

    // ════════════════════════════════════════════════════════════
    // TAB 1: OVERVIEW
    // ════════════════════════════════════════════════════════════

    // Status breakdown
    const statusCounts = { ACTIVE: 0, PENDING: 0, COMPLETED: 0, TERMINATED: 0 }
    const pendingInterns = []
    const completingSoon = []
    const birthdayByMonth = Array(12).fill(0)
    const genderCount = { 'Laki-laki': 0, 'Perempuan': 0 }
    const bankDist = {}
    const bidangDist = {}
    const universityDist = {}
    const jenjangDist = {}
    const supervisorDist = {}

    for (const i of allInterns) {
      // Effective status
      let effStatus = (i.status || 'ACTIVE').toUpperCase()
      if (effStatus === 'ACTIVE' && i.periodEnd && i.periodEnd < todayStr) effStatus = 'COMPLETED'
      if (effStatus === 'ACTIVE' && i.periodStart && i.periodStart > todayStr) effStatus = 'PENDING'
      statusCounts[effStatus] = (statusCounts[effStatus] || 0) + 1

      // Pending countdown
      if (effStatus === 'PENDING' && i.periodStart) {
        const daysUntil = Math.ceil((new Date(i.periodStart) - today) / 86400000)
        pendingInterns.push({ name: i.name, daysUntil, periodStart: i.periodStart, bidang: i.bidang })
      }

      // Completing soon (within 30 days)
      if (effStatus === 'ACTIVE' && i.periodEnd) {
        const daysLeft = Math.ceil((new Date(i.periodEnd) - today) / 86400000)
        if (daysLeft >= 0 && daysLeft <= 30) {
          completingSoon.push({ name: i.name, daysLeft, periodEnd: i.periodEnd, bidang: i.bidang })
        }
      }

      // Birthday distribution
      if (i.birthDate) {
        const month = parseInt(i.birthDate.split('-')[1]) - 1
        if (month >= 0 && month < 12) birthdayByMonth[month]++
      }

      // Demographics
      let genderStr = i.gender || 'Lainnya'
      if (genderStr.toLowerCase() === 'laki-laki') genderStr = 'Laki-laki'
      if (genderStr.toLowerCase() === 'perempuan') genderStr = 'Perempuan'
      genderCount[genderStr] = (genderCount[genderStr] || 0) + 1
      if (i.bankName) bankDist[i.bankName] = (bankDist[i.bankName] || 0) + 1
      bidangDist[i.bidang] = (bidangDist[i.bidang] || 0) + 1
      universityDist[i.university] = (universityDist[i.university] || 0) + 1
      jenjangDist[i.jenjang] = (jenjangDist[i.jenjang] || 0) + 1
      if (i.supervisorName) supervisorDist[i.supervisorName] = (supervisorDist[i.supervisorName] || 0) + 1
    }

    pendingInterns.sort((a, b) => a.daysUntil - b.daysUntil)
    completingSoon.sort((a, b) => a.daysLeft - b.daysLeft)

    // Forecast: monthly entries & exits
    const forecast = {}
    for (const i of allInterns) {
      if (i.periodStart) {
        const m = i.periodStart.slice(0, 7) // YYYY-MM
        if (!forecast[m]) forecast[m] = { month: m, enter: 0, exit: 0 }
        forecast[m].enter++
      }
      if (i.periodEnd) {
        const m = i.periodEnd.slice(0, 7)
        if (!forecast[m]) forecast[m] = { month: m, enter: 0, exit: 0 }
        forecast[m].exit++
      }
    }
    const forecastArr = Object.values(forecast).sort((a, b) => a.month.localeCompare(b.month))

    // ════════════════════════════════════════════════════════════
    // TAB 2: WELL-BEING & REPORTS
    // ════════════════════════════════════════════════════════════

    // Mood distribution
    const moodDist = { very_happy: 0, happy: 0, neutral: 0, sad: 0, very_sad: 0 }
    const moodByWeek = {}
    const reportSubmitCount = {}  // { userId: { count, name } } for top submitters

    for (const r of allReports) {
      if (r.mood && moodDist[r.mood] !== undefined) moodDist[r.mood]++
      
      // Mood by week
      const weekKey = getWeekKey(r.date)
      if (!moodByWeek[weekKey]) moodByWeek[weekKey] = { very_happy: 0, happy: 0, neutral: 0, sad: 0, very_sad: 0, total: 0 }
      if (r.mood) { moodByWeek[weekKey][r.mood]++; moodByWeek[weekKey].total++ }

      // Reports per user
      if (!reportSubmitCount[r.userId]) reportSubmitCount[r.userId] = { count: 0, name: r.internName || 'Unknown' }
      reportSubmitCount[r.userId].count++
    }

    const totalMoods = Object.values(moodDist).reduce((s, v) => s + v, 0)
    const happinessIndex = totalMoods > 0
      ? Math.round(((moodDist.very_happy * 100 + moodDist.happy * 75 + moodDist.neutral * 50 + moodDist.sad * 25 + moodDist.very_sad * 0) / totalMoods))
      : null

    // Top submitters & non-submitters
    const activeInternIds = allInterns.filter(i => {
      const s = (i.status || 'ACTIVE').toUpperCase()
      return s === 'ACTIVE'
    }).map(i => i.userId)

    const topSubmitters = Object.entries(reportSubmitCount)
      .map(([userId, d]) => ({ userId, name: d.name, count: d.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const submitterIds = new Set(Object.keys(reportSubmitCount))
    const neverSubmitted = allInterns
      .filter(i => {
        const s = (i.status || 'ACTIVE').toUpperCase()
        return s === 'ACTIVE' && !submitterIds.has(i.userId)
      })
      .map(i => ({ name: i.name, bidang: i.bidang }))

    // Mood vs Productivity
    const moodProductivity = {}
    for (const r of allReports) {
      if (!r.mood) continue
      if (!moodProductivity[r.mood]) moodProductivity[r.mood] = { totalWordCount: 0, count: 0 }
      moodProductivity[r.mood].totalWordCount += (r.activity || '').split(/\s+/).length
      moodProductivity[r.mood].count++
    }
    const moodVsProductivity = Object.entries(moodProductivity).map(([mood, d]) => ({
      mood,
      avgWords: Math.round(d.totalWordCount / d.count),
      count: d.count
    }))

    // Mood trend (weekly)
    const moodTrend = Object.entries(moodByWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([week, d]) => ({ week, ...d }))

    // ════════════════════════════════════════════════════════════
    // TAB 3: TALENT & EVALUATION
    // ════════════════════════════════════════════════════════════

    // University effectiveness
    const uniEvalMap = {}
    for (const ev of allEvals) {
      const intern = allInterns.find(i => i.id === ev.internId || i.userId === ev.internId)
      if (!intern) continue
      const uni = intern.university
      if (!uniEvalMap[uni]) uniEvalMap[uni] = { totalScore: 0, count: 0, interns: 0 }
      uniEvalMap[uni].totalScore += ev.finalScore
      uniEvalMap[uni].count++
    }
    // Add intern counts
    for (const i of allInterns) {
      if (uniEvalMap[i.university]) uniEvalMap[i.university].interns = universityDist[i.university] || 0
    }
    const universityEffectiveness = Object.entries(uniEvalMap)
      .map(([uni, d]) => ({ university: uni, avgScore: +(d.totalScore / d.count).toFixed(1), evalCount: d.count, internCount: d.interns }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 15)

    // Skill tracker (aggregate from reports)
    const skillCount = {}
    for (const r of allReports) {
      if (r.skills && Array.isArray(r.skills)) {
        for (const sk of r.skills) {
          const normalized = sk.trim()
          if (normalized) skillCount[normalized] = (skillCount[normalized] || 0) + 1
        }
      }
    }
    const topSkills = Object.entries(skillCount)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    // Evaluation score distribution
    const scoreRanges = { 'A (≥85)': 0, 'B (70-84)': 0, 'C (55-69)': 0, 'D (<55)': 0 }
    const evalAvgByBidang = {}
    for (const ev of allEvals) {
      if (ev.finalScore >= 85) scoreRanges['A (≥85)']++
      else if (ev.finalScore >= 70) scoreRanges['B (70-84)']++
      else if (ev.finalScore >= 55) scoreRanges['C (55-69)']++
      else scoreRanges['D (<55)']++

      const intern = allInterns.find(i => i.id === ev.internId || i.userId === ev.internId)
      if (intern) {
        if (!evalAvgByBidang[intern.bidang]) evalAvgByBidang[intern.bidang] = { total: 0, count: 0 }
        evalAvgByBidang[intern.bidang].total += ev.finalScore
        evalAvgByBidang[intern.bidang].count++
      }
    }
    const evalByBidang = Object.entries(evalAvgByBidang)
      .map(([bidang, d]) => ({ bidang, avgScore: +(d.total / d.count).toFixed(1), count: d.count }))
      .sort((a, b) => b.avgScore - a.avgScore)

    // Top performers
    const topPerformers = allEvals
      .map(ev => {
        const intern = allInterns.find(i => i.id === ev.internId || i.userId === ev.internId)
        return { name: intern?.name || 'Unknown', score: ev.finalScore, grade: ev.grade, bidang: intern?.bidang || '-' }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

    // Retention / Continuity  
    const completedInterns = allInterns.filter(i => {
      const s = (i.status || '').toUpperCase()
      return s === 'COMPLETED' || (i.periodEnd && i.periodEnd < todayStr)
    })

    // ════════════════════════════════════════════════════════════
    // TAB 3.5: ATTENDANCE TRENDS
    // ════════════════════════════════════════════════════════════
    
    // ── Build attendance trend using trendAttendance (already filtered to 30 days) ──
    const attendanceByDay = {}
    const attendanceByStatus = { PRESENT: 0, LATE: 0, SAKIT: 0, IZIN: 0 }

    // Count totals from allAttendance (for statusDist widget)
    for (const log of allAttendance) {
      if (log.status === 'PRESENT') attendanceByStatus.PRESENT++
      else if (log.status === 'LATE') attendanceByStatus.LATE++
      else if (log.status === 'SAKIT') attendanceByStatus.SAKIT++
      else if (log.status === 'IZIN') attendanceByStatus.IZIN++
    }

    // Build per-day map from trendAttendance (same approach as analytics/heatmap)
    for (const log of trendAttendance) {
      const dateKey = log.date ? String(log.date).slice(0, 10) : null
      if (!dateKey) continue
      if (!attendanceByDay[dateKey]) attendanceByDay[dateKey] = { present: 0, late: 0, sakit: 0, izin: 0, total: 0 }
      const day = attendanceByDay[dateKey]
      day.total++
      if (log.status === 'PRESENT') day.present++
      else if (log.status === 'LATE') day.late++
      else if (log.status === 'SAKIT') day.sakit++
      else if (log.status === 'IZIN') day.izin++
    }

    // Build 30-day array using wibNow computed at top
    const attendanceTrend = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(wibNow)
      d.setUTCDate(d.getUTCDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const day = attendanceByDay[dateStr] || { present: 0, late: 0, sakit: 0, izin: 0, total: 0 }
      attendanceTrend.push({
        date: dateStr,
        present: day.present,
        late: day.late,
        sakit: day.sakit,
        izin: day.izin,
        hadir: day.present + day.late,
        total: day.total
      })
    }



    // ════════════════════════════════════════════════════════════
    // TAB 3.7: ONBOARDING
    // ════════════════════════════════════════════════════════════
    
    const onboardingStats = { PENDING: 0, APPROVED: 0, REJECTED: 0, REVIEW: 0 }
    let onboardingVelocityDays = []
    for (const ob of allOnboardings) {
      const s = (ob.status || 'PENDING').toUpperCase()
      onboardingStats[s] = (onboardingStats[s] || 0) + 1
      if (s === 'APPROVED' && ob.reviewedAt && ob.submittedAt) {
        const days = Math.ceil((new Date(ob.reviewedAt) - new Date(ob.submittedAt)) / 86400000)
        if (days >= 0) onboardingVelocityDays.push(days)
      }
    }
    const avgOnboardingDays = onboardingVelocityDays.length > 0
      ? +(onboardingVelocityDays.reduce((s, v) => s + v, 0) / onboardingVelocityDays.length).toFixed(1)
      : null

    // Missing docs (from applicant JSON)
    const missingDocsCount = {}
    const DOC_FIELDS = ['cv', 'surat_pengantar', 'ktp', 'ktm', 'foto', 'transkrip']
    for (const ob of allOnboardings) {
      const docs = ob.docs || {}
      for (const field of DOC_FIELDS) {
        if (!docs[field]) missingDocsCount[field] = (missingDocsCount[field] || 0) + 1
      }
    }

    // ════════════════════════════════════════════════════════════
    // TAB 4: FINANCIAL
    // ════════════════════════════════════════════════════════════

    const payrollByPeriod = {}
    const payrollByBidang = {}
    const payrollStatusDist = {}

    // Helper: extract year-month from period formats like "2026-03" or "2026-03-13_2026-04-13"
    const extractYM = (period) => {
      if (!period) return null
      if (/^\d{4}-\d{2}$/.test(period)) return period  // YYYY-MM
      // startDate_endDate format — use the start date's month
      const match = period.match(/(\d{4})-(\d{2})/)
      return match ? `${match[1]}-${match[2]}` : null
    }

    // Helper: pretty label for period
    const MONTH_NAMES = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
    const prettyPeriod = (period) => {
      if (!period) return '-'
      if (/^\d{4}-\d{2}$/.test(period)) {
        const [y,m] = period.split('-')
        return `${MONTH_NAMES[parseInt(m)]} ${y}`
      }
      // startDate_endDate
      const parts = period.split('_')
      if (parts.length === 2) {
        return `${parts[0]} s/d ${parts[1]}`
      }
      return period
    }

    for (const pr of allPayrolls) {
      // By period (use pretty label)
      const pLabel = prettyPeriod(pr.period)
      if (!payrollByPeriod[pLabel]) payrollByPeriod[pLabel] = { period: pLabel, rawPeriod: pr.period, total: 0, count: 0, paid: 0, validDays: 0 }
      payrollByPeriod[pLabel].total += pr._effectiveAllowance
      payrollByPeriod[pLabel].validDays += (pr.validPresenceCount || 0)
      payrollByPeriod[pLabel].count++
      if (['PAID','TRANSFERRED'].includes((pr.status||'').toUpperCase())) {
        payrollByPeriod[pLabel].paid += pr._effectiveAllowance
      }

      // By bidang
      const intern = allInterns.find(i => i.id === pr.internId || i.userId === pr.internId)
      const bidang = intern?.bidang || 'Lainnya'
      if (!payrollByBidang[bidang]) payrollByBidang[bidang] = { bidang, total: 0, count: 0 }
      payrollByBidang[bidang].total += pr._effectiveAllowance
      payrollByBidang[bidang].count++

      // Status — capture ALL status values dynamically
      const ps = (pr.status || 'PENDING').toUpperCase()
      payrollStatusDist[ps] = (payrollStatusDist[ps] || 0) + 1
    }

    const payrollTrend = Object.values(payrollByPeriod).sort((a, b) => (a.rawPeriod || '').localeCompare(b.rawPeriod || ''))
    const payrollBidangArr = Object.values(payrollByBidang).sort((a, b) => b.total - a.total)
    
    // Total anggaran
    const totalBudgetAllTime = allPayrolls.reduce((s, p) => s + p._effectiveAllowance, 0)
    const currentYear = today.getFullYear().toString()
    const totalBudgetThisYear = allPayrolls
      .filter(p => (p.period || '').includes(currentYear))
      .reduce((s, p) => s + p._effectiveAllowance, 0)
    const currentMonth = todayStr.slice(0, 7)
    const totalBudgetThisMonth = allPayrolls
      .filter(p => { const ym = extractYM(p.period); return ym === currentMonth })
      .reduce((s, p) => s + p._effectiveAllowance, 0)
    const totalBudgetPaid = allPayrolls
      .filter(p => ['PAID','TRANSFERRED'].includes((p.status||'').toUpperCase()))
      .reduce((s, p) => s + p._effectiveAllowance, 0)

    // Payment speed
    const paymentSpeeds = allPayrolls
      .filter(p => p.paidAt && p.createdAt)
      .map(p => Math.ceil((new Date(p.paidAt) - new Date(p.createdAt)) / 86400000))
    const avgPaymentSpeed = paymentSpeeds.length > 0
      ? +(paymentSpeeds.reduce((s, v) => s + v, 0) / paymentSpeeds.length).toFixed(1)
      : null

    // ═══════════════════════════════════════════════════════════
    // RESPONSE
    // ═══════════════════════════════════════════════════════════
    
    return NextResponse.json({
      overview: {
        total: allInterns.length,
        statusCounts,
        pendingInterns: pendingInterns.slice(0, 15),
        completingSoon: completingSoon.slice(0, 15),
        birthdayByMonth,
        genderCount,
        bankDist,
        bidangDist,
        jenjangDist,
        universityDist,
        supervisorDist,
        forecast: forecastArr,
      },
      wellbeing: {
        moodDist,
        happinessIndex,
        moodTrend,
        moodVsProductivity,
        topSubmitters,
        neverSubmitted,
        totalReports: allReports.length,
      },
      talent: {
        universityEffectiveness,
        topSkills,
        scoreRanges,
        evalByBidang,
        topPerformers,
        totalEvals: allEvals.length,
        completedCount: completedInterns.length,
      },
      attendance: {
        statusDist: attendanceByStatus,
        trend: attendanceTrend,
        totalLogs: allAttendance.length,
      },
      onboarding: {
        stats: onboardingStats,
        avgVelocityDays: avgOnboardingDays,
        missingDocs: missingDocsCount,
        totalApplications: allOnboardings.length,
      },
      financial: {
        payrollTrend,
        payrollByBidang: payrollBidangArr,
        payrollStatusDist,
        totalBudgetAllTime,
        totalBudgetThisYear,
        totalBudgetThisMonth,
        totalBudgetPaid,
        avgPaymentSpeed,
        totalPayrolls: allPayrolls.length,
      },
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('[GET /api/admin/intern-insight]', err)
    return NextResponse.json({ error: 'Failed to fetch intern insight data' }, { status: 500 })
  }
}

// Helper: get ISO week key from date string
function getWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

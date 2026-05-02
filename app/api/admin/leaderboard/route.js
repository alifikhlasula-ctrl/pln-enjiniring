import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Composite scoring weights
const WEIGHTS = {
  attendance: 0.35,
  reports: 0.30,
  kudostars: 0.25,
  surveys: 0.10
}

export async function GET(req) {
  try {
    const monthParam = req.nextUrl.searchParams.get('month') || new Date().toISOString().slice(0, 7)
    
    // Date ranges for the selected month
    const startOfMonth = new Date(`${monthParam}-01T00:00:00.000Z`)
    const endOfMonth = new Date(startOfMonth)
    endOfMonth.setMonth(endOfMonth.getMonth() + 1)

    const [
      allInternsRaw, allAttendance, allReports,
      allRecognitions, allSurveys, allResponses, allEvents
    ] = await Promise.all([
      prisma.intern.findMany({
        where: { deletedAt: null, status: 'ACTIVE' },
        select: { id: true, userId: true, name: true, bidang: true, university: true, periodStart: true, periodEnd: true }
      }),
      prisma.attendanceLog.findMany({
        where: { date: { startsWith: monthParam } },
        select: { internId: true, date: true, status: true }
      }),
      prisma.dailyReport.findMany({
        where: { status: { not: 'DRAFT' }, date: { startsWith: monthParam } },
        select: { userId: true, date: true }
      }),
      prisma.recognition.findMany({
        where: { createdAt: { gte: startOfMonth, lt: endOfMonth } },
        select: { toInternId: true }
      }),
      prisma.survey.findMany({
        where: { targetRole: { in: ['INTERN', 'ALL'] }, deadline: { not: null } },
        select: { id: true }
      }),
      prisma.surveyResponse.findMany({
        where: { submittedAt: { gte: startOfMonth, lt: endOfMonth } },
        select: { surveyId: true, respondentId: true }
      }),
      prisma.event.findMany({
        where: { type: { in: ['HOLIDAY', 'LIBUR'] }, date: { startsWith: monthParam } },
        select: { date: true }
      })
    ])

    const holidaySet = new Set(allEvents.map(e => e.date))

    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)
    const allInterns = allInternsRaw.filter(i => {
      if (!i.periodEnd) return true
      const end = new Date(i.periodEnd)
      // Exclude if their period ended before the selected month started
      return end.getTime() >= startOfMonth.getTime()
    })

    const mandatorySurveyIds = allSurveys.map(s => s.id)
    const totalMandatory = mandatorySurveyIds.length

    // ── Build lookup maps ──
    const attendanceScores = {}
    const rawAttendanceDays = {}
    for (const log of allAttendance) {
      if (!attendanceScores[log.internId]) {
        attendanceScores[log.internId] = 0
        rawAttendanceDays[log.internId] = 0
      }
      rawAttendanceDays[log.internId] += 1
      if (log.status === 'PRESENT' || log.status === 'LATE') attendanceScores[log.internId] += 1
      else if (log.status === 'SAKIT' || log.status === 'IZIN') attendanceScores[log.internId] += 0.5
      // ALPA adds 0
    }

    const reportDays = {}
    for (const r of allReports) {
      if (!reportDays[r.userId]) reportDays[r.userId] = new Set()
      const d = r.date ? String(r.date).slice(0, 10) : null
      if (d) reportDays[r.userId].add(d)
    }

    const starCount = {}
    for (const r of allRecognitions) {
      starCount[r.toInternId] = (starCount[r.toInternId] || 0) + 1
    }
    const maxStars = Math.max(...Object.values(starCount), 1)

    const surveysDone = {}
    for (const r of allResponses) {
      if (mandatorySurveyIds.includes(r.surveyId)) {
        if (!surveysDone[r.respondentId]) surveysDone[r.respondentId] = new Set()
        surveysDone[r.respondentId].add(r.surveyId)
      }
    }

    // ── Calculate working days for the selected month ──
    const getWorkingDays = (periodStartStr, periodEndStr) => {
      let mStart = new Date(startOfMonth)
      let mEnd = new Date(endOfMonth.getTime() - 1)
      const now = new Date()
      
      // If looking at the current month, only count up to today
      if (mStart.getFullYear() === now.getFullYear() && mStart.getMonth() === now.getMonth()) {
        mEnd = now
      }

      const pStart = periodStartStr ? new Date(periodStartStr) : new Date(0)
      const pEnd = periodEndStr ? new Date(periodEndStr) : new Date(8640000000000000)

      let start = pStart > mStart ? pStart : mStart
      let end = pEnd < mEnd ? pEnd : mEnd

      let count = 0
      let d = new Date(start)
      d.setHours(0,0,0,0)
      
      while (d <= end) {
        const day = d.getDay()
        const dateStr = d.toISOString().split('T')[0]
        if (day !== 0 && day !== 6 && !holidaySet.has(dateStr)) {
          count++
        }
        d.setDate(d.getDate() + 1)
      }
      return count
    }

    // ── Compute composite score for each active intern ──
    const leaderboard = allInterns.map(intern => {
      const workingDays = getWorkingDays(intern.periodStart, intern.periodEnd)
      const attPoints = attendanceScores[intern.id] || 0
      const attDaysRaw = rawAttendanceDays[intern.id] || 0
      const repDays = reportDays[intern.userId]?.size || 0
      const stars = starCount[intern.id] || 0
      const surveysCompleted = surveysDone[intern.userId]?.size || 0

      // Normalized scores (0-100)
      const attendanceScore = workingDays > 0 ? Math.min((attPoints / workingDays) * 100, 100) : 100
      const reportScore = workingDays > 0 ? Math.min((repDays / workingDays) * 100, 100) : 100
      const kudoScore = maxStars > 0 ? (stars / maxStars) * 100 : 0
      const surveyScore = totalMandatory > 0 ? (surveysCompleted / totalMandatory) * 100 : 100

      const composite = (
        attendanceScore * WEIGHTS.attendance +
        reportScore * WEIGHTS.reports +
        kudoScore * WEIGHTS.kudostars +
        surveyScore * WEIGHTS.surveys
      )

      return {
        internId: intern.id,
        userId: intern.userId,
        name: intern.name,
        bidang: intern.bidang,
        university: intern.university,
        composite: +composite.toFixed(1),
        breakdown: {
          attendance: +attendanceScore.toFixed(1),
          reports: +reportScore.toFixed(1),
          kudostars: +kudoScore.toFixed(1),
          surveys: +surveyScore.toFixed(1)
        },
        raw: {
          attendanceDays: attDaysRaw,
          workingDays,
          reportDays: repDays,
          stars,
          surveysCompleted,
          totalMandatory
        }
      }
    })
      .sort((a, b) => b.composite - a.composite)
      .slice(0, 30)
      .map((item, i) => ({ ...item, rank: i + 1 }))

    // ── Stats ──
    const avgComposite = leaderboard.length > 0
      ? +(leaderboard.reduce((s, l) => s + l.composite, 0) / leaderboard.length).toFixed(1)
      : 0

    const topBidang = {}
    for (const l of leaderboard.slice(0, 10)) {
      topBidang[l.bidang] = (topBidang[l.bidang] || 0) + 1
    }

    const response = NextResponse.json({
      leaderboard,
      weights: WEIGHTS,
      stats: {
        totalActive: allInterns.length,
        avgComposite,
        topBidang,
        totalStarsGiven: allRecognitions.length
      }
    })
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=59')
    return response
  } catch (err) {
    console.error('[GET /api/admin/leaderboard]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}


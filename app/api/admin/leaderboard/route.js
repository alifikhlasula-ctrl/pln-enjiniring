import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Composite scoring weights
const WEIGHTS = {
  attendance: 0.30,
  reports: 0.25,
  evaluation: 0.25,
  kudostars: 0.10,
  surveys: 0.10
}

export async function GET() {
  try {
    const todayStr = new Date().toISOString().split('T')[0]

    const [
      allInternsRaw, allAttendance, allReports,
      allEvals, allRecognitions, allSurveys, allResponses
    ] = await Promise.all([
      prisma.intern.findMany({
        where: { deletedAt: null, status: 'ACTIVE' },
        select: { id: true, userId: true, name: true, bidang: true, university: true, periodStart: true, periodEnd: true }
      }),
      prisma.attendanceLog.findMany({
        where: { status: { in: ['PRESENT', 'LATE'] } },
        select: { internId: true, date: true, status: true }
      }),
      prisma.dailyReport.findMany({
        where: { status: { not: 'DRAFT' } },
        select: { userId: true, date: true }
      }),
      prisma.evaluation.findMany({
        select: { internId: true, finalScore: true, createdAt: true }
      }),
      prisma.recognition.findMany({
        select: { toInternId: true }
      }),
      prisma.survey.findMany({
        where: { targetRole: { in: ['INTERN', 'ALL'] }, deadline: { not: null } },
        select: { id: true }
      }),
      prisma.surveyResponse.findMany({
        select: { surveyId: true, respondentId: true }
      })
    ])

    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)
    const allInterns = allInternsRaw.filter(i => {
      if (!i.periodEnd) return true
      const end = new Date(i.periodEnd)
      // Exclude if their period ends tomorrow (H-1) or earlier
      return end.getTime() > (todayDate.getTime() + 86400000)
    })

    const mandatorySurveyIds = allSurveys.map(s => s.id)
    const totalMandatory = mandatorySurveyIds.length

    // ── Build lookup maps ──
    // Attendance days per intern
    const attendanceDays = {}
    for (const log of allAttendance) {
      if (!attendanceDays[log.internId]) attendanceDays[log.internId] = new Set()
      attendanceDays[log.internId].add(log.date)
    }

    // Report days per userId
    const reportDays = {}
    for (const r of allReports) {
      if (!reportDays[r.userId]) reportDays[r.userId] = new Set()
      const d = r.date ? String(r.date).slice(0, 10) : null
      if (d) reportDays[r.userId].add(d)
    }

    // Latest eval per intern
    const latestEval = {}
    for (const ev of allEvals) {
      if (!latestEval[ev.internId] || new Date(ev.createdAt) > new Date(latestEval[ev.internId].createdAt)) {
        latestEval[ev.internId] = ev
      }
    }

    // Stars received per intern
    const starCount = {}
    for (const r of allRecognitions) {
      starCount[r.toInternId] = (starCount[r.toInternId] || 0) + 1
    }
    const maxStars = Math.max(...Object.values(starCount), 1)

    // Survey responses per user
    const surveysDone = {}
    for (const r of allResponses) {
      if (mandatorySurveyIds.includes(r.surveyId)) {
        if (!surveysDone[r.respondentId]) surveysDone[r.respondentId] = new Set()
        surveysDone[r.respondentId].add(r.surveyId)
      }
    }

    // ── Calculate working days since period start ──
    const getWorkingDays = (startStr) => {
      if (!startStr) return 60 // default
      const start = new Date(startStr)
      const end = new Date()
      let count = 0
      const d = new Date(start)
      while (d <= end) {
        const day = d.getDay()
        if (day !== 0 && day !== 6) count++ // exclude weekends
        d.setDate(d.getDate() + 1)
      }
      return Math.max(count, 1)
    }

    // ── Compute composite score for each active intern ──
    const leaderboard = allInterns.map(intern => {
      const workingDays = getWorkingDays(intern.periodStart)
      const attDays = attendanceDays[intern.id]?.size || 0
      const repDays = reportDays[intern.userId]?.size || 0
      const evalScore = latestEval[intern.id]?.finalScore || 0
      const stars = starCount[intern.id] || 0
      const surveysCompleted = surveysDone[intern.userId]?.size || 0

      // Normalized scores (0-100)
      const attendanceScore = Math.min((attDays / workingDays) * 100, 100)
      const reportScore = attDays > 0 ? Math.min((repDays / attDays) * 100, 100) : 0
      const evalNormalized = (evalScore / 10) * 100 // scale 0-10 → 0-100
      const kudoScore = maxStars > 0 ? (stars / maxStars) * 100 : 0
      const surveyScore = totalMandatory > 0 ? (surveysCompleted / totalMandatory) * 100 : 100

      const composite = (
        attendanceScore * WEIGHTS.attendance +
        reportScore * WEIGHTS.reports +
        evalNormalized * WEIGHTS.evaluation +
        kudoScore * WEIGHTS.kudostars +
        surveyScore * WEIGHTS.surveys
      )

      return {
        internId: intern.id,
        name: intern.name,
        bidang: intern.bidang,
        university: intern.university,
        composite: +composite.toFixed(1),
        breakdown: {
          attendance: +attendanceScore.toFixed(1),
          reports: +reportScore.toFixed(1),
          evaluation: +evalNormalized.toFixed(1),
          kudostars: +kudoScore.toFixed(1),
          surveys: +surveyScore.toFixed(1)
        },
        raw: {
          attendanceDays: attDays,
          workingDays,
          reportDays: repDays,
          evalScore,
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

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const WEIGHTS = {
  attendance: 0.35,
  reports: 0.30,
  kudostars: 0.25,
  surveys: 0.10
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const [
      allInternsRaw, allAttendance, allReports,
      allEvals, allRecognitions, allSurveys, allResponses
    ] = await Promise.all([
      prisma.intern.findMany({
        where: { deletedAt: null, status: 'ACTIVE' },
        select: { id: true, userId: true, name: true, bidang: true, periodStart: true, periodEnd: true }
      }),
      prisma.attendanceLog.findMany({
        where: { status: { in: ['PRESENT', 'LATE'] } },
        select: { internId: true, date: true }
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

    // Build lookup maps
    const attendanceDays = {}
    for (const log of allAttendance) {
      if (!attendanceDays[log.internId]) attendanceDays[log.internId] = new Set()
      attendanceDays[log.internId].add(log.date)
    }

    const reportDays = {}
    for (const r of allReports) {
      if (!reportDays[r.userId]) reportDays[r.userId] = new Set()
      const d = r.date ? String(r.date).slice(0, 10) : null
      if (d) reportDays[r.userId].add(d)
    }

    const latestEval = {}
    for (const ev of allEvals) {
      if (!latestEval[ev.internId] || new Date(ev.createdAt) > new Date(latestEval[ev.internId].createdAt)) {
        latestEval[ev.internId] = ev
      }
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

    const getWorkingDays = (startStr) => {
      const start = new Date(startStr || '2026-01-01')
      const end = new Date()
      let count = 0
      const d = new Date(start)
      while (d <= end) {
        if (d.getDay() !== 0 && d.getDay() !== 6) count++
        d.setDate(d.getDate() + 1)
      }
      return Math.max(count, 1)
    }

    const leaderboard = allInterns.map(intern => {
      const workingDays = getWorkingDays(intern.periodStart)
      const attDays = attendanceDays[intern.id]?.size || 0
      const repDays = reportDays[intern.userId]?.size || 0
      const evalScore = latestEval[intern.id]?.finalScore || 0
      const stars = starCount[intern.id] || 0
      const surveysCompleted = surveysDone[intern.userId]?.size || 0

      const attendanceScore = Math.min((attDays / workingDays) * 100, 100)
      const reportScore = attDays > 0 ? Math.min((repDays / attDays) * 100, 100) : 0
      const evalNormalized = (evalScore / 10) * 100
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
        composite: +composite.toFixed(1)
      }
    })
      .sort((a, b) => b.composite - a.composite)

    const rankedLeaderboard = leaderboard.map((item, i) => ({ ...item, rank: i + 1 }))
    
    // Find user's rank
    const userRank = userId ? rankedLeaderboard.find(l => l.userId === userId) : null
    
    return NextResponse.json({
      top5: rankedLeaderboard.slice(0, 5),
      userRank,
      totalActive: allInterns.length
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

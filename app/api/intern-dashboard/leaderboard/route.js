import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { INDONESIA_HOLIDAYS_2026 } from '@/lib/constants'

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
    const monthParam = searchParams.get('month') || new Date().toISOString().slice(0, 7)
    
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
        select: { id: true, userId: true, name: true, bidang: true, periodStart: true, periodEnd: true }
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

    const holidaySet = new Set([
      ...allEvents.map(e => e.date),
      ...INDONESIA_HOLIDAYS_2026
    ])

    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)
    const allInterns = allInternsRaw.filter(i => {
      if (!i.periodEnd) return true
      const end = new Date(i.periodEnd)
      return end.getTime() >= startOfMonth.getTime()
    })

    const mandatorySurveyIds = allSurveys.map(s => s.id)
    const totalMandatory = mandatorySurveyIds.length

    // Build lookup maps
    const attendanceScores = {}
    for (const log of allAttendance) {
      if (!attendanceScores[log.internId]) attendanceScores[log.internId] = 0
      if (log.status === 'PRESENT' || log.status === 'LATE') attendanceScores[log.internId] += 1
      else if (log.status === 'SAKIT' || log.status === 'IZIN') attendanceScores[log.internId] += 0.5
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

    const getWorkingDays = (periodStartStr, periodEndStr) => {
      let mStart = new Date(startOfMonth)
      let mEnd = new Date(endOfMonth.getTime() - 1)
      const now = new Date()
      
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

    const leaderboard = allInterns.map(intern => {
      const workingDays = getWorkingDays(intern.periodStart, intern.periodEnd)
      const attPoints = attendanceScores[intern.id] || 0
      const repDays = reportDays[intern.userId]?.size || 0
      const stars = starCount[intern.id] || 0
      const surveysCompleted = surveysDone[intern.userId]?.size || 0

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

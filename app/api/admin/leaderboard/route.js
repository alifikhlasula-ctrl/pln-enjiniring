import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { INDONESIA_HOLIDAYS_2026 } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const WEIGHTS = { attendance: 0.35, reports: 0.30, kudostars: 0.25, surveys: 0.10 }

async function computeLeaderboardForMonth(monthParam) {
  const startOfMonth = new Date(`${monthParam}-01T00:00:00.000Z`)
  const endOfMonth = new Date(startOfMonth)
  endOfMonth.setMonth(endOfMonth.getMonth() + 1)

  const [allInternsRaw, allAttendance, allReports, allRecognitions, allSurveys, allResponses, allEvents] = await Promise.all([
    prisma.intern.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: { id: true, userId: true, name: true, bidang: true, periodStart: true, periodEnd: true }
    }),
    prisma.attendanceLog.findMany({
      where: { date: { startsWith: monthParam } },
      select: { internId: true, date: true, status: true, editedBy: true, isOverride: true }
    }),
    prisma.dailyReport.findMany({
      where: { status: { not: 'DRAFT' }, date: { startsWith: monthParam } },
      select: { userId: true, date: true, createdAt: true, isOverride: true }
    }),
    prisma.recognition.findMany({
      where: { createdAt: { gte: startOfMonth, lt: endOfMonth } },
      select: { toInternId: true }
    }),
    prisma.survey.findMany({ where: { targetRole: { in: ['INTERN', 'ALL'] }, deadline: { not: null } }, select: { id: true } }),
    prisma.surveyResponse.findMany({
      where: { submittedAt: { gte: startOfMonth, lt: endOfMonth } },
      select: { surveyId: true, respondentId: true }
    }),
    prisma.event.findMany({
      where: { type: { in: ['HOLIDAY', 'LIBUR'] }, date: { startsWith: monthParam } },
      select: { date: true }
    })
  ])

  const holidaySet = new Set([...allEvents.map(e => e.date), ...INDONESIA_HOLIDAYS_2026])
  const allInterns = allInternsRaw.filter(i => {
    if (!i.periodEnd) return true
    return new Date(i.periodEnd) >= startOfMonth
  })

  const mandatorySurveyIds = allSurveys.map(s => s.id)
  const attendanceScores = {}
  for (const log of allAttendance) {
    if (!attendanceScores[log.internId]) attendanceScores[log.internId] = 0
    let score = 0
    if (log.status === 'PRESENT' || log.status === 'LATE') score = 1
    else if (log.status === 'SAKIT' || log.status === 'IZIN') score = 0.5
    if (log.editedBy && !log.isOverride) score = score > 0 ? 0.5 : 0
    attendanceScores[log.internId] += score
  }

  const reportScores = {}
  for (const r of allReports) {
    if (!reportScores[r.userId]) reportScores[r.userId] = new Map()
    const d = r.date ? String(r.date).slice(0, 10) : null
    if (d) {
      let score = 1.0
      if (r.createdAt && !r.isOverride) {
        const createdWIB = new Date(r.createdAt.getTime() + 7 * 3600000)
        if (createdWIB.toISOString().split('T')[0] !== d) score = 0.5
      }
      const existing = reportScores[r.userId].get(d) || 0
      if (score > existing) reportScores[r.userId].set(d, score)
    }
  }

  const starCount = {}
  for (const r of allRecognitions) starCount[r.toInternId] = (starCount[r.toInternId] || 0) + 1
  const maxStars = Math.max(...Object.values(starCount), 1)

  const surveysDone = {}
  for (const r of allResponses) {
    if (mandatorySurveyIds.includes(r.surveyId)) {
      if (!surveysDone[r.respondentId]) surveysDone[r.respondentId] = new Set()
      surveysDone[r.respondentId].add(r.surveyId)
    }
  }

  const getWorkingDays = (periodStartStr, periodEndStr) => {
    const now = new Date()
    let mStart = new Date(startOfMonth)
    let mEnd = mStart.getFullYear() === now.getFullYear() && mStart.getMonth() === now.getMonth()
      ? now : new Date(endOfMonth.getTime() - 1)
    const pStart = periodStartStr ? new Date(periodStartStr) : new Date(0)
    const pEnd = periodEndStr ? new Date(periodEndStr) : new Date(8640000000000000)
    let start = pStart > mStart ? pStart : mStart
    let end = pEnd < mEnd ? pEnd : mEnd
    let count = 0
    let d = new Date(start); d.setHours(0, 0, 0, 0)
    while (d <= end) {
      const day = d.getDay()
      const dateStr = d.toISOString().split('T')[0]
      if (day !== 0 && day !== 6 && !holidaySet.has(dateStr)) count++
      d.setDate(d.getDate() + 1)
    }
    return count
  }

  const leaderboard = allInterns.map(intern => {
    const workingDays = getWorkingDays(intern.periodStart, intern.periodEnd)
    const attPoints = attendanceScores[intern.id] || 0
    let repPoints = 0
    const repMap = reportScores[intern.userId]
    if (repMap) for (const score of repMap.values()) repPoints += score
    const stars = starCount[intern.id] || 0
    const surveysCompleted = surveysDone[intern.userId]?.size || 0

    let composite = 0
    if (workingDays > 0) {
      const attendanceScore = Math.min((attPoints / workingDays) * 100, 100)
      const reportScore = Math.min((repPoints / workingDays) * 100, 100)
      const kudoScore = maxStars > 0 ? (stars / maxStars) * 100 : 0
      const surveyScore = mandatorySurveyIds.length > 0 ? (surveysCompleted / mandatorySurveyIds.length) * 100 : 100
      composite = attendanceScore * WEIGHTS.attendance + reportScore * WEIGHTS.reports + kudoScore * WEIGHTS.kudostars + surveyScore * WEIGHTS.surveys
    }
    return { internId: intern.id, userId: intern.userId, name: intern.name, bidang: intern.bidang, composite: +composite.toFixed(1) }
  }).sort((a, b) => b.composite - a.composite)

  return leaderboard.map((item, i) => ({ ...item, rank: i + 1 }))
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month') || new Date().toISOString().slice(0, 7)
    const userId = searchParams.get('userId')

    // Check if snapshot exists in JsonStore
    const snapshotKey = `leaderboard_${monthParam}`
    let ranked

    const stored = await prisma.jsonStore.findUnique({ where: { key: snapshotKey } }).catch(() => null)
    if (stored?.data) {
      ranked = stored.data
    } else {
      // Compute on-the-fly (for current month or missing snapshots)
      ranked = await computeLeaderboardForMonth(monthParam)
    }

    const top5 = ranked.slice(0, 5)
    const userRank = userId ? ranked.find(l => l.userId === userId) : null

    return NextResponse.json({ top5, userRank, totalActive: ranked.length, month: monthParam, fromSnapshot: !!stored })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Called by cron on 1st of each month to save snapshot of previous month
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const cronSecret = request.headers.get('x-cron-secret') || body.secret
    if (cronSecret !== process.env.CRON_SECRET && cronSecret !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Snapshot previous month
    const now = new Date()
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const monthParam = prevMonth.toISOString().slice(0, 7)
    const snapshotKey = `leaderboard_${monthParam}`

    // Check if already snapshotted
    const existing = await prisma.jsonStore.findUnique({ where: { key: snapshotKey } }).catch(() => null)
    if (existing) return NextResponse.json({ message: `Snapshot ${monthParam} already exists`, skipped: true })

    const ranked = await computeLeaderboardForMonth(monthParam)
    await prisma.jsonStore.upsert({
      where: { key: snapshotKey },
      update: { data: ranked },
      create: { key: snapshotKey, data: ranked }
    })

    return NextResponse.json({ success: true, month: monthParam, total: ranked.length })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

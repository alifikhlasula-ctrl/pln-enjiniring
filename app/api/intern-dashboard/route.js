import { NextResponse } from 'next/server'
import { getDB, saveDB } from '@/lib/db'
import { prisma } from '@/lib/prisma'
import { INDONESIA_HOLIDAYS_2026 } from '@/lib/constants'

export const dynamic = 'force-dynamic'

// GET /api/intern-dashboard?userId=u3
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 })

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // ── Find intern profile (Primary: Prisma Relational, Fallback: JSON) ──
    let intern = await prisma.intern.findUnique({ where: { userId } }).catch(() => null)

    if (!intern || intern.deletedAt) {
      // Fallback: try the legacy JSON store for older interns
      const legacyDB = await getDB();
      const legacyIntern = (legacyDB.interns || []).find(i => i.userId === userId && !i.deletedAt)
      if (!legacyIntern) {
        return NextResponse.json({ error: 'Profil intern tidak ditemukan' }, { status: 404 })
      }
      intern = legacyIntern;
    }

    // ── Today attendance status (SQL) ───────────────
    const todayLog = await prisma.attendanceLog.findUnique({
      where: { internId_date: { internId: intern.id, date: todayStr } },
      select: { checkIn: true, checkOut: true, status: true, checkInLoc: true, faceInUrl: true }
    }).catch(() => null)

    const todayAttendance = todayLog ? {
      checkedIn: !!todayLog.checkIn,
      checkedOut: !!todayLog.checkOut,
      checkInTime: todayLog.checkIn?.toISOString() || null,
      checkOutTime: todayLog.checkOut?.toISOString() || null,
      status: todayLog.status,
      checkInLoc: todayLog.checkInLoc,
      faceUrl: todayLog.faceInUrl,
    } : { checkedIn: false, checkedOut: false }

    // ── Attendance stats (SQL - optimized for Egress diet) ────────
    const rawLogs = await prisma.attendanceLog.findMany({
      where: { internId: intern.id },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        checkIn: true,
        checkOut: true,
        status: true,
        checkInLoc: true,
        faceInUrl: true
      }
    }).catch(() => [])

    const attendanceLogs = rawLogs.slice(0, 30).map(l => ({
      id: l.id,
      date: l.date,
      checkIn: l.checkIn?.toISOString() || null,
      checkOut: l.checkOut?.toISOString() || null,
      status: l.status,
      checkInLoc: l.checkInLoc,
      faceInUrl: l.faceInUrl, 
    }))

    const presentDays = rawLogs.filter(l => l.status === 'PRESENT').length
    const lateDays = rawLogs.filter(l => l.status === 'LATE').length
    const excusedDays = rawLogs.filter(l => ['SAKIT', 'IZIN'].includes(l.status)).length
    const totalDays = rawLogs.length
    
    // Performance Score Calculation: SAKIT and IZIN should not negatively impact the score.
    // We only calculate the onTimeRate based on days they actually worked.
    const performanceDays = presentDays + lateDays
    const onTimeRate = performanceDays > 0 ? Math.round((presentDays / performanceDays) * 100) : (totalDays > 0 && excusedDays === totalDays ? 100 : 0)

    // Weekly streak (last 7 days) — compute from already-fetched rawLogs (no extra DB call)
    const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
    const weeklyStreak = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (6 - i))
      const ds = d.toISOString().split('T')[0]
      const log = rawLogs.find(l => l.date === ds)
      return { day: DAYS[d.getDay()], date: ds, status: log?.status || null, hadir: !!log }
    })

    // ── Period countdown ────────────────────────────
    const periodEnd = intern.periodEnd ? new Date(intern.periodEnd) : null
    const daysRemaining = periodEnd ? Math.max(0, Math.ceil((periodEnd - today) / 86400000)) : null
    const periodStart = intern.periodStart ? new Date(intern.periodStart) : null
    const totalDuration = (periodStart && periodEnd) ? Math.ceil((periodEnd - periodStart) / 86400000) : null
    const elapsedDays = (periodStart) ? Math.ceil((today - periodStart) / 86400000) : null
    const progressPct = (totalDuration && elapsedDays) ? Math.min(100, Math.round((elapsedDays / totalDuration) * 100)) : 0

    // Fetch residual JSON data for rare fields (evals/mood/announcements) safely
    let data; 
    try {
      data = await getDB();
    } catch(e) {
      data = {}; // graceful
    }

    // ── Evaluations (from Prisma — only own) ─────────────────────────────
    const [myEvals, criteriaRows] = await Promise.all([
      prisma.evaluation.findMany({
        where: { internId: intern.id },
        orderBy: { createdAt: 'desc' },
        take: 10
      }).catch(() => []),
      prisma.evaluationCriteria.findMany({ orderBy: { order: 'asc' } }).catch(() => [])
    ])

    const DEFAULT_CRITERIA_FALLBACK = [
      { key: 'discipline', name: 'Kedisiplinan', weight: 25 },
      { key: 'integrity', name: 'Kualitas Kerja', weight: 30 },
      { key: 'technical', name: 'Kreativitas', weight: 20 },
      { key: 'teamwork', name: 'Sikap & Attitude', weight: 15 },
      { key: 'communication', name: 'Komunikasi', weight: 10 },
    ]
    const criteria = criteriaRows.length > 0 ? criteriaRows : DEFAULT_CRITERIA_FALLBACK
    const myEvalsMapped = myEvals.map(e => ({ ...e, createdAt: e.createdAt.toISOString() }))
    const latestEval = myEvalsMapped[0] || null
    const radarData = latestEval ? criteria.map(c => ({
      name: c.name,
      score: latestEval.scores?.[c.key] || 0,
      max: 10
    })) : []

    // ── Helper: Normalize date string to YYYY-MM-DD ─────
    const normalizeDate = (d) => {
      if (!d || typeof d !== 'string') return null
      // Match YYYY-MM-DD
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(d)) {
        const [y, m, day] = d.split('-')
        return `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
      return d 
    }

    // ── Allowance / Payroll ──
    // Query Prisma PayrollRecord first (most recent by updatedAt)
    // This avoids period key mismatch between admin batch (date range) and monthly format
    const prismaPayroll = await prisma.payrollRecord.findFirst({
      where: { internId: intern.id },
      orderBy: { updatedAt: 'desc' }
    }).catch(() => null)

    const nowMonth = new Date()
    const periodKey = `${nowMonth.getFullYear()}-${String(nowMonth.getMonth() + 1).padStart(2, '0')}`
    // Fallback to JSON only if Prisma has nothing
    const myPayroll = prismaPayroll || (data.payrolls || []).find(p => p.internId === intern.id)
    
    const allValidAttendance = rawLogs.filter(l => ['PRESENT', 'LATE'].includes(l.status))

    // ── [FIX] Ambil laporan dari kedua layer ─────────────────────────
    // Layer 1: Relational PostgreSQL (intern baru 2026)
    const relationalReports = await prisma.dailyReport.findMany({
        where: { userId: userId, status: { not: 'DRAFT' } }
    }).catch(() => []);

    // Layer 2: Legacy JSON (intern lama 2024-2025)
    const legacyReports = (data.reports || []).filter(
      r => r.userId === userId && r.status !== 'DRAFT'
    );

    // Cross-check: hari yang punya ABSEN + LAPORAN (cek di kedua layer)
    const allVerifiedDays = allValidAttendance.filter(l => {
      const lNorm = normalizeDate(l.date)
      // Cek di relational
      const inRelational = relationalReports.some(r => normalizeDate(r.date) === lNorm)
      // Cek di legacy JSON
      const inLegacy = legacyReports.some(r => normalizeDate(r.date || r.reportDate) === lNorm)
      return inRelational || inLegacy
    })

    // Hari yang hadir tapi belum punya laporan
    const missingReportDays = allValidAttendance.filter(l => {
      const lNorm = normalizeDate(l.date)
      const inRelational = relationalReports.some(r => normalizeDate(r.date) === lNorm)
      const inLegacy = legacyReports.some(r => normalizeDate(r.date || r.reportDate) === lNorm)
      return !inRelational && !inLegacy
    })

    const allowanceRate = 25000 
    const estimatedAllowanceTotal = allVerifiedDays.length * allowanceRate
    
    const allowanceInfo = {
      period: myPayroll?.period || periodKey,
      status: myPayroll?.status || 'PENDING',
      paidAt: myPayroll?.paidAt ? new Date(myPayroll.paidAt).toISOString() : null,
      totalAllowance: myPayroll?.totalAllowance || estimatedAllowanceTotal,
      presenceCount: allVerifiedDays.length,
      missingReportsCount: missingReportDays.length,
      totalPresenceDays: allValidAttendance.length,
      allowanceRate,
    }

    // ── Announcements (Prisma + JSON Fallback) ──────────────────────
    const [announcementsRaw, eventsRaw] = await Promise.all([
      prisma.announcement.findMany({
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        take: 5
      }).catch(() => []),
      prisma.event.findMany({
        where: { date: { gte: todayStr } },
        orderBy: { date: 'asc' },
        take: 10
      }).catch(() => [])
    ])
    
    // Merge SQL announcements with Legacy JSON announcements
    const legacyAnnouncements = data.announcements || []
    const allAnnouncements = [
      ...announcementsRaw.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })),
      ...legacyAnnouncements
    ]
    // Remove duplicates by ID (just in case)
    const uniqueAnnouncements = Array.from(new Map(allAnnouncements.map(item => [item.id, item])).values())
    // Sort: Pinned first, then newest
    const announcements = uniqueAnnouncements
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return new Date(b.createdAt) - new Date(a.createdAt)
      })
      .slice(0, 5)

    // ── Events (Prisma + holidays) ─────────────────────────────────
    const dbEvents = eventsRaw.map(ev => ({ ...ev, createdAt: ev.createdAt.toISOString() }))
    const holidayEvents = INDONESIA_HOLIDAYS_2026
      .filter(h => new Date(h) >= today)
      .map(h => ({ id: 'h' + h, title: 'Hari Libur Nasional', date: h, type: 'HOLIDAY', description: 'Libur resmi nasional Indonesia' }))
    const events = [...dbEvents, ...holidayEvents]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 10)

    // ── Onboarding progress (SQL) ────────────────────
    const myOnboarding = await prisma.onboarding.findMany({ where: { internId: intern.id } });
    const onboardingTotal = myOnboarding.length
    const onboardingDone = myOnboarding.filter(o => o.status === 'APPROVED').length

    // ── Mood check (stored in DB) ────────────────────
    const todayMood = (data.moodLogs || []).find(m => m.userId === userId && m.date === todayStr)

    // ── Active Unanswered Surveys ────────────────────
    const activeSurveys = await prisma.survey.findMany({
      where: { active: true, targetRole: { in: ['INTERN', 'ALL'] } }
    }).catch(() => [])

    const userResponses = await prisma.surveyResponse.findMany({
      where: { userId: userId },
      select: { surveyId: true }
    }).catch(() => [])
    
    const respondedSurveyIds = userResponses.map(r => r.surveyId)

    // ── Survey Compliance & Skor Keaktifan ──
    const allMandatorySurveys = await prisma.survey.findMany({
      where: { 
        targetRole: { in: ['INTERN', 'ALL'] },
        deadline: { not: null } 
      }
    }).catch(() => [])

    const missedMandatoryCount = allMandatorySurveys.filter(s => {
      const deadlineDate = new Date(s.deadline)
      deadlineDate.setHours(23, 59, 59, 999) // End of deadline day
      return deadlineDate < new Date() && !respondedSurveyIds.includes(s.id)
    }).length

    const surveyPenalty = missedMandatoryCount * 5 // Deduct 5 points per missed mandatory survey
    const finalKeaktifanScore = Math.max(0, onTimeRate - surveyPenalty)

    // ── Recognition Badges (SQL) ────────────────────
    const myRecognitions = await prisma.recognition.findMany({
      where: { toInternId: intern.id }
    }).catch(() => [])

    const categoryCounts = {}
    myRecognitions.forEach(r => {
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1
    })

    const badges = []
    if (myRecognitions.length >= 1) {
      badges.push({ id: 'b1', name: 'Rising Star', icon: 'Zap', color: '#6366f1', desc: 'Mendapat apresiasi pertama dari rekan kerja.' })
    }
    if (myRecognitions.length >= 5) {
      badges.push({ id: 'b2', name: 'Top Contributor', icon: 'Award', color: '#f59e0b', desc: 'Mendapat 5+ apresiasi atas kontribusi yang konsisten.' })
    }
    if (categoryCounts['TEAMWORK'] >= 3) {
      badges.push({ id: 'b3', name: 'Team Player', icon: 'Users', color: '#10b981', desc: 'Terbukti sebagai rekan tim yang sangat membantu.' })
    }
    if (categoryCounts['INNOVATION'] >= 2) {
      badges.push({ id: 'b4', name: 'Problem Solver', icon: 'Brain', color: '#8b5cf6', desc: 'Memberikan solusi kreatif dalam pekerjaan.' })
    }
    if (categoryCounts['LEADERSHIP'] >= 2) {
      badges.push({ id: 'b5', name: 'Future Leader', icon: 'Target', color: '#f43f5e', desc: 'Menunjukkan inisiatif kepemimpinan yang baik.' })
    }

    const response = NextResponse.json({
      intern: {
        id: intern.id,
        name: intern.name,
        university: intern.university,
        bidang: intern.bidang,
        jenjang: intern.jenjang,
        periodStart: intern.periodStart,
        periodEnd: intern.periodEnd,
        status: intern.status,
      },
      todayAttendance,
      attendanceLogs,
      attendanceStats: { presentDays, lateDays, totalDays, onTimeRate: finalKeaktifanScore, baseAttendanceScore: onTimeRate, missedSurveys: missedMandatoryCount },
      weeklyStreak,
      countdown: { daysRemaining, totalDuration, elapsedDays, progressPct, periodEnd: intern.periodEnd },
      evaluations: myEvals.slice(0, 5).map(e => ({ ...e, supervisorName: (data.users || []).find(u => u.id === e.supervisorId)?.name || 'Supervisor' })),
      latestEval,
      radarData,
      criteria,
      allowanceInfo,
      announcements,
      events,
      onboarding: { total: onboardingTotal, done: onboardingDone },
      todayMood: todayMood?.mood || null,
      pendingSurveys,
      badges,
    })

    // Edge Caching: Serve from cache for 30 seconds, keeping database unburdened during traffic spikes
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=59')
    return response

  } catch (err) {
    console.error('[GET /api/intern-dashboard] Fatal Error:', err)
    const errStr = String(err?.message || '')
    const isBusy = errStr.includes('57014') || 
                   errStr.toLowerCase().includes('statement timeout') || 
                   errStr.toLowerCase().includes('connection') ||
                   errStr.toLowerCase().includes('pool');
                   
    if (isBusy) {
      return NextResponse.json({ 
        error: 'Sistem sedang sangat sibuk (Database Queue). Mohon tunggu 5-10 detik lalu muat ulang halaman.' 
      }, { status: 503 })
    }
    
    return NextResponse.json({ 
      error: 'Terjadi kesalahan sistem saat memuat data. Mohon coba beberapa saat lagi.' 
    }, { status: 500 })
  }
}

// POST: Save mood check
export async function POST(request) {
  try {
    const { userId, mood } = await request.json()
    if (!userId || !mood) return NextResponse.json({ error: 'userId dan mood diperlukan' }, { status: 400 })

    const data = await getDB()
    const todayStr = new Date().toISOString().split('T')[0]

    if (!data.moodLogs) data.moodLogs = []
    const existing = data.moodLogs.findIndex(m => m.userId === userId && m.date === todayStr)
    if (existing >= 0) {
      data.moodLogs[existing].mood = mood
    } else {
      data.moodLogs.push({ id: 'mood_' + Date.now(), userId, mood, date: todayStr, createdAt: new Date().toISOString() })
    }

    await saveDB(data)
    return NextResponse.json({ success: true, mood })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

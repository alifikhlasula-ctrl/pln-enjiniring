import { NextResponse } from 'next/server'
import { getDB, saveDB } from '@/lib/db'
import { prisma } from '@/lib/prisma'
import { INDONESIA_HOLIDAYS_2026 } from '@/lib/constants'

// GET /api/intern-dashboard?userId=u3
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 })

    const data = await getDB()
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // ── Find intern profile ─────────────────────────
    const intern = (data.interns || []).find(i => i.userId === userId && !i.deletedAt)
      || (data.interns || []).find(i => i.userId === userId)

    if (!intern) {
      return NextResponse.json({ error: 'Profil intern tidak ditemukan' }, { status: 404 })
    }

    // ── Today attendance status (SQL) ───────────────
    const todayLog = await prisma.attendanceLog.findUnique({
      where: { internId_date: { internId: intern.id, date: todayStr } }
    }).catch(() => null)

    const todayAttendance = todayLog ? {
      checkedIn: !!todayLog.checkIn,
      checkedOut: !!todayLog.checkOut,
      checkInTime: todayLog.checkIn?.toISOString() || null,
      checkOutTime: todayLog.checkOut?.toISOString() || null,
      status: todayLog.status,
      checkInLoc: todayLog.checkInLoc,
      faceBase64: todayLog.faceInBase64,
    } : { checkedIn: false, checkedOut: false }

    // ── Attendance stats (SQL - fetch all for accurate stats) ────────
    const rawLogs = await prisma.attendanceLog.findMany({
      where: { internId: intern.id },
      orderBy: { date: 'desc' }
    }).catch(() => [])

    const attendanceLogs = rawLogs.slice(0, 30).map(l => ({
      id: l.id,
      date: l.date,
      checkIn: l.checkIn?.toISOString() || null,
      checkOut: l.checkOut?.toISOString() || null,
      status: l.status,
      checkInLoc: l.checkInLoc,
      faceInBase64: l.faceInBase64 ? l.faceInBase64.substring(0, 50) + '...' : null, 
    }))

    const presentDays = rawLogs.filter(l => l.status === 'PRESENT').length
    const lateDays = rawLogs.filter(l => l.status === 'LATE').length
    const totalDays = rawLogs.length
    const onTimeRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0

    // Weekly streak (last 7 days)
    const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
    const weeklyStreak = await Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const d = new Date(today); d.setDate(d.getDate() - (6 - i))
        const ds = d.toISOString().split('T')[0]
        const log = rawLogs.find(l => l.date === ds)
        return { day: DAYS[d.getDay()], date: ds, status: log?.status || null, hadir: !!log }
      })
    )

    // ── Period countdown ────────────────────────────
    const periodEnd = intern.periodEnd ? new Date(intern.periodEnd) : null
    const daysRemaining = periodEnd ? Math.max(0, Math.ceil((periodEnd - today) / 86400000)) : null
    const periodStart = intern.periodStart ? new Date(intern.periodStart) : null
    const totalDuration = (periodStart && periodEnd) ? Math.ceil((periodEnd - periodStart) / 86400000) : null
    const elapsedDays = (periodStart) ? Math.ceil((today - periodStart) / 86400000) : null
    const progressPct = (totalDuration && elapsedDays) ? Math.min(100, Math.round((elapsedDays / totalDuration) * 100)) : 0

    // ── Evaluations (only own) ───────────────────────
    const myEvals = ((data.evaluations || []).filter(e => e.internId === intern.id))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    const criteria = data.evaluationCriteria || [
      { id: 'c1', name: 'Kedisiplinan', weight: 25 },
      { id: 'c2', name: 'Kualitas Kerja', weight: 30 },
      { id: 'c3', name: 'Kreativitas', weight: 20 },
      { id: 'c4', name: 'Sikap & Attitude', weight: 15 },
      { id: 'c5', name: 'Komunikasi', weight: 10 },
    ]
    const latestEval = myEvals[0] || null
    const radarData = latestEval ? criteria.map(c => ({
      name: c.name,
      score: latestEval.scores?.[c.id] || 0,
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
      // Match D/M/YYYY or DD/MM/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)) {
        const [day, m, y] = d.split('/')
        return `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
      return d 
    }

    // ── Allowance / Payroll (Real-time from SQL - seluruh masa magang) ──
    const nowMonth = new Date()
    const periodKey = `${nowMonth.getFullYear()}-${String(nowMonth.getMonth() + 1).padStart(2, '0')}`
    const myPayroll = (data.payrolls || []).find(p => p.internId === intern.id && p.period === periodKey)
    
    // Semua hari yang hadir (PRESENT atau LATE) dari SQL, seluruh masa magang
    const allValidAttendance = rawLogs.filter(l =>
      ['PRESENT', 'LATE'].includes(l.status)
    )

    // Kehadiran bulan ini saja
    const attendanceThisMonth = allValidAttendance.filter(l => {
      const norm = normalizeDate(l.date)
      return norm && norm.startsWith(periodKey)
    })

    // Laporan harian seluruh masa (non-draft)
    const allReports = (data.reports || []).filter(r =>
      r.userId === userId && r.status !== 'DRAFT'
    )

    // Laporan harian bulan ini
    const reportsThisMonth = allReports.filter(r => {
      const rDate = r.date || r.reportDate
      const norm = normalizeDate(rDate)
      return norm && norm.startsWith(periodKey)
    })
    
    // Cross-check total: hari yang punya ABSEN + LAPORAN (seluruh masa magang)
    const allVerifiedDays = allValidAttendance.filter(l => {
      const lNorm = normalizeDate(l.date)
      return allReports.some(r => normalizeDate(r.date || r.reportDate) === lNorm)
    })

    // Cross-check bulan ini saja
    const verifiedThisMonth = attendanceThisMonth.filter(l => {
      const lNorm = normalizeDate(l.date)
      return reportsThisMonth.some(r => normalizeDate(r.date || r.reportDate) === lNorm)
    })

    const allowanceRate = 25000 // FLAT_RATE seragam Rp 25.000/hari
    const estimatedAllowanceTotal = allVerifiedDays.length * allowanceRate
    const estimatedAllowanceThisMonth = verifiedThisMonth.length * allowanceRate
    
    const allowanceInfo = {
      period: periodKey,
      status: myPayroll?.status || 'PENDING',
      paidAt: myPayroll?.paidAt || null,
      totalAllowance: myPayroll?.totalAllowance || estimatedAllowanceTotal,
      presenceCount: allVerifiedDays.length,       // Total verified seluruh masa magang
      presenceThisMonth: verifiedThisMonth.length,  // Verified bulan ini
      attendanceOnlyCount: allValidAttendance.length, // Total hadir seluruh masa
      allowanceRate,
    }

    // ── Announcements (read-only, all published) ─────
    const announcements = [...(data.announcements || [])]
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return new Date(b.createdAt) - new Date(a.createdAt)
      })
      .slice(0, 5)
      .map(a => ({ id: a.id, title: a.title, content: a.content, priority: a.priority, pinned: a.pinned, createdAt: a.createdAt, createdBy: a.createdBy }))

    // ── Events (filtered by Bidang + National Holidays) ──
    const dbEvents = (data.events || [])
      .filter(ev => {
        const isFuture = new Date(ev.date) >= today
        const isTargeted = !ev.targetGroup || ev.targetGroup === 'ALL' || ev.targetGroup === intern.bidang
        return isFuture && isTargeted
      })
      .map(ev => ({ id: ev.id, title: ev.title, date: ev.date, type: ev.type, description: ev.description }))

    const holidayEvents = INDONESIA_HOLIDAYS_2026
      .filter(h => new Date(h) >= today)
      .map(h => ({ id: 'h' + h, title: 'Hari Libur Nasional', date: h, type: 'HOLIDAY', description: 'Libur resmi nasional Indonesia' }))

    const events = [...dbEvents, ...holidayEvents]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 10)

    // ── Onboarding progress (own) ────────────────────
    const myOnboarding = (data.onboarding || []).filter(o => o.internId === intern.id)
    const onboardingTotal = myOnboarding.length
    const onboardingDone = myOnboarding.filter(o => o.status === 'APPROVED').length

    // ── Mood check (stored in DB) ────────────────────
    const todayMood = (data.moodLogs || []).find(m => m.userId === userId && m.date === todayStr)

    return NextResponse.json({
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
      attendanceStats: { presentDays, lateDays, totalDays, onTimeRate },
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
    })
  } catch (err) {
    console.error('[GET /api/intern-dashboard]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
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

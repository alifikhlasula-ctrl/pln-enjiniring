import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { INDONESIA_HOLIDAYS_2026 } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const idr = (v) => `Rp ${new Intl.NumberFormat('id-ID').format(v || 0)}`

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month') || new Date().toISOString().slice(0, 7)

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    const startOfMonth = new Date(`${monthParam}-01T00:00:00.000Z`)
    const endOfMonth = new Date(startOfMonth)
    endOfMonth.setMonth(endOfMonth.getMonth() + 1)

    // ── Fetch all data in parallel ──
    const [
      allInterns, allReports, allPayrolls, allEvals,
      allAttendance, allRecognitions, allSurveys, allResponses,
      allEvents, allQuotas
    ] = await Promise.all([
      prisma.intern.findMany({ where: { deletedAt: null } }),
      prisma.dailyReport.findMany({
        where: { status: { not: 'DRAFT' } },
        select: { userId: true, date: true, mood: true, activity: true, createdAt: true, isOverride: true, internName: true, skills: true }
      }),
      prisma.payrollRecord.findMany({
        select: { internId: true, period: true, status: true, presenceCount: true, totalAllowance: true, paidAt: true }
      }),
      prisma.evaluation.findMany(),
      prisma.attendanceLog.findMany({
        where: { date: { startsWith: monthParam } },
        select: { internId: true, date: true, status: true, editedBy: true, isOverride: true }
      }),
      prisma.recognition.findMany({
        where: { createdAt: { gte: startOfMonth, lt: endOfMonth } },
        select: { toInternId: true, fromUserId: true, category: true }
      }),
      prisma.survey.findMany({ where: { targetRole: { in: ['INTERN', 'ALL'] } }, select: { id: true } }),
      prisma.surveyResponse.findMany({
        where: { submittedAt: { gte: startOfMonth, lt: endOfMonth } },
        select: { surveyId: true, respondentId: true }
      }),
      prisma.event.findMany({
        where: { type: { in: ['HOLIDAY', 'LIBUR'] }, date: { startsWith: monthParam } },
        select: { date: true }
      }),
      prisma.departmentQuota.findMany()
    ])

    const internById = Object.fromEntries(allInterns.map(i => [i.id, i]))
    const internByUserId = Object.fromEntries(allInterns.map(i => [i.userId, i]))
    const holidaySet = new Set([...allEvents.map(e => e.date), ...INDONESIA_HOLIDAYS_2026])

    const wb = XLSX.utils.book_new()

    // ══════════════════════════════════════════════
    // SHEET 1: OVERVIEW
    // ══════════════════════════════════════════════
    const activeInterns = allInterns.filter(i => {
      const s = (i.status || 'ACTIVE').toUpperCase()
      return s === 'ACTIVE' && (!i.periodEnd || i.periodEnd >= todayStr) && (!i.periodStart || i.periodStart <= todayStr)
    })
    const pendingInterns = allInterns.filter(i => i.periodStart && i.periodStart > todayStr)
    const alumniInterns = allInterns.filter(i => {
      const s = (i.status || '').toUpperCase()
      return s === 'COMPLETED' || (i.periodEnd && i.periodEnd < todayStr)
    })

    const bidangCount = {}
    const uniCount = {}
    const jenjangCount = {}
    for (const i of activeInterns) {
      bidangCount[i.bidang] = (bidangCount[i.bidang] || 0) + 1
      uniCount[i.university] = (uniCount[i.university] || 0) + 1
      jenjangCount[i.jenjang] = (jenjangCount[i.jenjang] || 0) + 1
    }

    const overviewData = [
      ['📊 OVERVIEW INTERN — HC Executive Report', `Periode: ${monthParam}`],
      [],
      ['RINGKASAN UMUM', ''],
      ['Total Intern Terdaftar', allInterns.length],
      ['Aktif Saat Ini', activeInterns.length],
      ['Pending (Belum Mulai)', pendingInterns.length],
      ['Alumni', alumniInterns.length],
      [],
      ['DISTRIBUSI PER BIDANG', 'Jumlah Aktif'],
      ...Object.entries(bidangCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v]),
      [],
      ['DISTRIBUSI PER UNIVERSITAS', 'Jumlah Aktif'],
      ...Object.entries(uniCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v]),
      [],
      ['DISTRIBUSI PER JENJANG', 'Jumlah Aktif'],
      ...Object.entries(jenjangCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v]),
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(overviewData)
    ws1['!cols'] = [{ wch: 35 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, ws1, '1. Overview')

    // ══════════════════════════════════════════════
    // SHEET 2: WELL-BEING & LAPORAN
    // ══════════════════════════════════════════════
    const monthReports = allReports.filter(r => r.date && String(r.date).startsWith(monthParam))
    const moodLabels = { GREAT: '😄 Semangat', GOOD: '😊 Baik', OKAY: '😐 Biasa', BAD: '😞 Kurang', TIRED: '😫 Lelah' }
    const moodDist = {}
    const reportCountPerUser = {}
    for (const r of monthReports) {
      if (r.mood) moodDist[r.mood] = (moodDist[r.mood] || 0) + 1
      reportCountPerUser[r.userId] = (reportCountPerUser[r.userId] || 0) + 1
    }
    const wellbeingData = [
      ['💚 WELL-BEING & LAPORAN HARIAN', `Periode: ${monthParam}`],
      [],
      ['DISTRIBUSI MOOD BULAN INI', 'Jumlah'],
      ...Object.entries(moodDist).map(([k, v]) => [moodLabels[k] || k, v]),
      [],
      ['LAPORAN BULANAN PER INTERN', 'Nama', 'Bidang', 'Jumlah Laporan'],
      ...Object.entries(reportCountPerUser).map(([userId, count]) => {
        const intern = internByUserId[userId]
        return [intern?.name || userId, intern?.name || '-', intern?.bidang || '-', count]
      }).sort((a, b) => b[3] - a[3]).map(r => [r[1], r[2], r[3]]),
    ]
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['💚 WELL-BEING & LAPORAN HARIAN', `Periode: ${monthParam}`],
      [],
      ['DISTRIBUSI MOOD BULAN INI', 'Jumlah'],
      ...Object.entries(moodDist).map(([k, v]) => [moodLabels[k] || k, v]),
      [],
      ['LAPORAN BULANAN PER INTERN', 'Bidang', 'Jumlah Laporan'],
      ...Object.entries(reportCountPerUser).map(([userId, count]) => {
        const intern = internByUserId[userId]
        return [intern?.name || '-', intern?.bidang || '-', count]
      }).sort((a, b) => b[2] - a[2])
    ])
    ws2['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, ws2, '2. Wellbeing & Laporan')

    // ══════════════════════════════════════════════
    // SHEET 3: ABSENSI & KEAKTIFAN
    // ══════════════════════════════════════════════
    const attByIntern = {}
    for (const log of allAttendance) {
      if (!attByIntern[log.internId]) attByIntern[log.internId] = { PRESENT: 0, LATE: 0, SAKIT: 0, IZIN: 0, MANUAL: 0 }
      const s = log.status
      if (attByIntern[log.internId][s] !== undefined) attByIntern[log.internId][s]++
      if (log.editedBy && !log.isOverride) attByIntern[log.internId].MANUAL++
    }

    // Calculate working days for month
    let workingDays = 0
    const d = new Date(startOfMonth)
    while (d < endOfMonth && d <= today) {
      const day = d.getDay()
      const ds = d.toISOString().split('T')[0]
      if (day !== 0 && day !== 6 && !holidaySet.has(ds)) workingDays++
      d.setDate(d.getDate() + 1)
    }

    const absensiRows = activeInterns.map(intern => {
      const att = attByIntern[intern.id] || { PRESENT: 0, LATE: 0, SAKIT: 0, IZIN: 0, MANUAL: 0 }
      const hadir = att.PRESENT + att.LATE
      const pct = workingDays > 0 ? Math.round((hadir / workingDays) * 100) : 0
      return [intern.name, intern.bidang, hadir, att.LATE, att.SAKIT, att.IZIN, att.MANUAL, `${pct}%`]
    }).sort((a, b) => b[2] - a[2])

    const ws3 = XLSX.utils.aoa_to_sheet([
      ['📋 ABSENSI & KEAKTIFAN', `Periode: ${monthParam} | Hari Kerja: ${workingDays}`],
      [],
      ['Nama Intern', 'Bidang', 'Hadir', 'Terlambat', 'Sakit', 'Izin', 'Edit Manual', '% Kehadiran'],
      ...absensiRows
    ])
    ws3['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws3, '3. Absensi & Keaktifan')

    // ══════════════════════════════════════════════
    // SHEET 4: LEADERBOARD
    // ══════════════════════════════════════════════
    const starCount = {}
    for (const r of allRecognitions) starCount[r.toInternId] = (starCount[r.toInternId] || 0) + 1
    const maxStars = Math.max(...Object.values(starCount), 1)

    const surveysDone = {}
    const mandatoryIds = allSurveys.map(s => s.id)
    for (const r of allResponses) {
      if (mandatoryIds.includes(r.surveyId)) {
        if (!surveysDone[r.respondentId]) surveysDone[r.respondentId] = 0
        surveysDone[r.respondentId]++
      }
    }

    const reportMonthCount = {}
    for (const r of monthReports) reportMonthCount[r.userId] = (reportMonthCount[r.userId] || 0) + 1

    const leaderboardRows = activeInterns.map(intern => {
      const att = attByIntern[intern.id] || { PRESENT: 0, LATE: 0 }
      const hadir = att.PRESENT + att.LATE
      const attScore = workingDays > 0 ? Math.min((hadir / workingDays) * 100, 100) : 0
      const repCount = reportMonthCount[intern.userId] || 0
      const repScore = workingDays > 0 ? Math.min((repCount / workingDays) * 100, 100) : 0
      const stars = starCount[intern.id] || 0
      const kudoScore = (stars / maxStars) * 100
      const surveyScore = mandatoryIds.length > 0 ? ((surveysDone[intern.userId] || 0) / mandatoryIds.length) * 100 : 100
      const composite = (attScore * 0.35 + repScore * 0.30 + kudoScore * 0.25 + surveyScore * 0.10).toFixed(1)
      return [intern.name, intern.bidang, attScore.toFixed(1), repScore.toFixed(1), kudoScore.toFixed(1), surveyScore.toFixed(1), composite]
    }).sort((a, b) => parseFloat(b[6]) - parseFloat(a[6])).map((r, i) => [i + 1, ...r])

    const ws4 = XLSX.utils.aoa_to_sheet([
      ['🏆 LEADERBOARD KOMPOSIT', `Periode: ${monthParam}`],
      ['Bobot: Absensi (35%) | Laporan (30%) | Kudostars (25%) | Survei (10%)'],
      [],
      ['#', 'Nama Intern', 'Bidang', 'Skor Absensi', 'Skor Laporan', 'Skor Kudo', 'Skor Survei', 'KOMPOSIT'],
      ...leaderboardRows
    ])
    ws4['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws4, '4. Leaderboard')

    // ══════════════════════════════════════════════
    // SHEET 5: KUDOSTARS & BADGES
    // ══════════════════════════════════════════════
    const kudoReceived = {}
    const kudoGiven = {}
    const catCount = {}
    for (const r of allRecognitions) {
      kudoReceived[r.toInternId] = (kudoReceived[r.toInternId] || 0) + 1
      kudoGiven[r.fromUserId] = (kudoGiven[r.fromUserId] || 0) + 1
      catCount[r.category] = (catCount[r.category] || 0) + 1
    }

    const kudoRows = allInterns.filter(i => kudoReceived[i.id] || kudoGiven[i.userId]).map(i => [
      i.name, i.bidang,
      kudoReceived[i.id] || 0,
      kudoGiven[i.userId] || 0
    ]).sort((a, b) => b[2] - a[2])

    const ws5 = XLSX.utils.aoa_to_sheet([
      ['⭐ KUDOSTARS & BADGES', `Periode: ${monthParam}`],
      [],
      ['KATEGORI TERBANYAK', 'Jumlah'],
      ...Object.entries(catCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v]),
      [],
      ['Nama Intern', 'Bidang', 'Bintang Diterima', 'Bintang Dikirim'],
      ...kudoRows
    ])
    ws5['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 18 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws5, '5. Kudostars & Badges')

    // ══════════════════════════════════════════════
    // SHEET 6: WORKFORCE PLANNING
    // ══════════════════════════════════════════════
    const quotaMap = Object.fromEntries(allQuotas.map(q => [q.name, q]))
    const activeByBidang = {}
    for (const i of activeInterns) {
      activeByBidang[i.bidang] = (activeByBidang[i.bidang] || 0) + 1
    }
    const allBidangs = new Set([...Object.keys(activeByBidang), ...allQuotas.map(q => q.name)])

    const workforceRows = [...allBidangs].map(bidang => {
      const quota = quotaMap[bidang]?.quota || 0
      const active = activeByBidang[bidang] || 0
      const remaining = Math.max(0, quota - active)
      const pct = quota > 0 ? Math.round((active / quota) * 100) : '-'
      const status = quota === 0 ? 'Tidak Ada Kuota' : active >= quota ? '🔴 PENUH' : active >= quota * 0.8 ? '🟡 HAMPIR PENUH' : '🟢 TERSEDIA'
      return [quotaMap[bidang]?.direktorat || '-', bidang, quota, active, remaining, pct === '-' ? '-' : `${pct}%`, status]
    }).sort((a, b) => a[0].localeCompare(b[0]))

    const ws6 = XLSX.utils.aoa_to_sheet([
      ['🏢 WORKFORCE PLANNING', `Periode: ${monthParam}`],
      [],
      ['Direktorat', 'Bidang', 'Kuota', 'Aktif', 'Sisa', '% Terisi', 'Status'],
      ...workforceRows
    ])
    ws6['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, ws6, '6. Workforce Planning')

    // ══════════════════════════════════════════════
    // SHEET 7: ALLOWANCE / PAYROLL
    // ══════════════════════════════════════════════
    const payrollRows = allPayrolls.map(pr => {
      const intern = internById[pr.internId]
      return [
        intern?.name || '-',
        intern?.bidang || '-',
        pr.period,
        pr.presenceCount,
        idr(pr.totalAllowance),
        pr.status,
        pr.paidAt ? new Date(pr.paidAt).toLocaleDateString('id-ID') : '-'
      ]
    }).sort((a, b) => a[2].localeCompare(b[2]))

    const ws7 = XLSX.utils.aoa_to_sheet([
      ['💰 ALLOWANCE & PAYROLL', `Generated: ${new Date().toLocaleDateString('id-ID')}`],
      [],
      ['Nama Intern', 'Bidang', 'Periode', 'Hari Hadir', 'Total Allowance', 'Status', 'Tanggal Bayar'],
      ...payrollRows
    ])
    ws7['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws7, '7. Allowance & Payroll')

    // ── Generate & Return ──
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `HC_Executive_Report_${monthParam}.xlsx`

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })
  } catch (err) {
    console.error('[GET /api/admin/export/executive-report]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

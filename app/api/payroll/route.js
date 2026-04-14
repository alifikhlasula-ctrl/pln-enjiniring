import { NextResponse } from 'next/server'
import { getDB, saveDB, db } from '@/lib/db'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

/* ── Helpers ───────────────────────────────────────── */
const FLAT_RATE = 25000

function normalizeDate(d) {
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

function buildPayrollItem(intern, data, month, year) {
  const user = data.users.find(u => u.id === intern.userId)
  const periodKey = month && year ? `${year}-${String(month).padStart(2, '0')}` : null

  // Filter attendances by month/year if provided
  let attendances = data.attendances.filter(a => a.internId === intern.id && a.status === 'PRESENT')
  if (periodKey) {
    attendances = attendances.filter(a => {
      const norm = normalizeDate(a.date || a.checkIn)
      return norm && norm.startsWith(periodKey)
    })
  }

  // Cross-Validate with Reports
  let validPresenceCount = 0
  let missingReportsCount = 0

  attendances.forEach(att => {
    const attNorm = normalizeDate(att.date || att.checkIn)
    const reportExists = (data.reports || []).some(
      r => r.userId === intern.userId && 
           normalizeDate(r.date || r.reportDate) === attNorm && 
           r.status !== 'DRAFT'
    )
    if (reportExists) {
      validPresenceCount++
    } else {
      missingReportsCount++
    }
  })

  // Tarif seragam Rp25.000 sesuai permintaan baru
  const allowanceRate = FLAT_RATE
  const totalAllowance = validPresenceCount * allowanceRate

  // Find existing payroll record for this period
  const existingPayroll = periodKey
    ? (data.payrolls || []).find(p => p.internId === intern.id && p.period === periodKey)
    : null

  return {
    id: existingPayroll?.id || intern.id,
    internId: intern.id,
    userId: intern.userId,
    name: user?.name || intern.name,
    university: intern.university,
    jenjang: intern.jenjang || 'S1',
    bidang: intern.bidang,
    presenceCount: attendances.length, 
    validPresenceCount,
    missingReportsCount,
    allowanceRate,
    totalAllowance,
    period: periodKey,
    status: existingPayroll?.status || 'PENDING',
    paidAt: existingPayroll?.paidAt || null,
    paidBy: existingPayroll?.paidBy || null,
    notes: existingPayroll?.notes || ''
  }
}

/* ── GET: list payroll ─────────────────────────────── */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  const year = searchParams.get('year') || new Date().getFullYear()
  const startDate = searchParams.get('startDate') // format YYYY-MM-DD
  const endDate = searchParams.get('endDate') // format YYYY-MM-DD
  const format = searchParams.get('format') // 'excel' | 'json'
  const filterUserId = searchParams.get('userId') // Untuk filter personal (intern portal)

  const data = await getDB()
  let activeInterns = (await db.getInterns(false)).filter(i => i.status === 'ACTIVE')

  if (filterUserId) {
    activeInterns = activeInterns.filter(i => i.userId === filterUserId)
  }

  // ── Ambil semua AttendanceLog dari Prisma SQL (filtered by intern IDs) ──
  const pKey = month && year ? `${year}-${String(month).padStart(2, '0')}` : null
  const internIds = activeInterns.map(i => i.id)

  const attendanceWhere = { internId: { in: internIds }, status: { in: ['PRESENT','LATE'] } }
  if (startDate && endDate) {
    attendanceWhere.date = { gte: startDate, lte: endDate }
  } else if (pKey) {
    attendanceWhere.date = { startsWith: pKey }
  }

  let allSqlLogs = []
  try {
    allSqlLogs = await prisma.attendanceLog.findMany({ where: attendanceWhere })
  } catch (e) {
    console.error('[payroll] Failed to fetch SQL logs, falling back to JSON:', e.message)
    allSqlLogs = []
  }

  // ── Ambil DailyReport dari Prisma SQL (filtered by userIds) ──────────
  const userIds = activeInterns.map(i => i.userId).filter(Boolean)
  let allRelationalReports = []
  try {
    allRelationalReports = await prisma.dailyReport.findMany({
      where: { userId: { in: userIds }, status: { not: 'DRAFT' } },
      select: { userId: true, date: true }
    })
  } catch (e) {
    console.error('[payroll] Failed to fetch relational reports:', e.message)
    allRelationalReports = []
  }

  // ── Ambil PayrollRecord dari Prisma untuk status PAID ─────────────────
  let existingPayrolls = []
  try {
    existingPayrolls = await prisma.payrollRecord.findMany({
      where: { internId: { in: internIds } }
    })
  } catch (e) {
    // Tabel mungkin belum ada di production lama — fallback ke JSON
    existingPayrolls = (data.payrolls || [])
  }

  // Modifikasi buildItem menggunakan SQL logs + relational reports
  const buildItem = (intern) => {
    // Filter SQL logs untuk intern ini yang statusnya valid
    let sqlLogs = allSqlLogs.filter(l => 
      l.internId === intern.id && ['PRESENT', 'LATE'].includes(l.status)
    )

    // Gunakan SQL logs jika ada, jika tidak fallback ke JSON legacy
    let attendances = sqlLogs.length > 0
      ? sqlLogs.map(l => ({ date: l.date, checkIn: l.checkIn, status: l.status, internId: l.internId }))
      : (data.attendances || []).filter(a => a.internId === intern.id && ['PRESENT', 'LATE'].includes(a.status))

    // Filter by tanggal
    if (startDate && endDate) {
      const s = normalizeDate(startDate)
      const e = normalizeDate(endDate)
      attendances = attendances.filter(a => {
        const norm = normalizeDate(a.date || a.checkIn)
        return norm && norm >= s && norm <= e
      })
    } else if (pKey) {
      attendances = attendances.filter(a => {
        const norm = normalizeDate(a.date || a.checkIn)
        return norm && norm.startsWith(pKey)
      })
    }

    let validPresenceCount = 0
    let missingReportsCount = 0

    attendances.forEach(att => {
      const attNorm = normalizeDate(att.date || att.checkIn)

      // ── [FIX] Cross-validate laporan di KEDUA lapisan database ──
      // Layer 1: Tabel relational PostgreSQL (intern baru 2026)
      const reportInRelational = allRelationalReports.some(
        r => r.userId === intern.userId && normalizeDate(r.date) === attNorm
      )
      // Layer 2: JSON legacy (intern lama 2024-2025)
      const reportInLegacy = (data.reports || []).some(
        r => r.userId === intern.userId && 
             normalizeDate(r.date || r.reportDate) === attNorm && 
             r.status !== 'DRAFT'
      )

      if (reportInRelational || reportInLegacy) {
        validPresenceCount++
      } else {
        missingReportsCount++
      }
    })

    // Hitung missingReportsCount untuk sekedar peringatan (warning), 
    // NAMUN kembalikan validPresenceCount agar sama dengan jumlah total absensi 
    // sesuai instruksi user (allowance kembali normal).
    // Note: missingReportsCount is already populated correctly by the loop.
    validPresenceCount = attendances.length

    const allowanceRate = FLAT_RATE
    // Restore normal calculation: Pay based on total attendances, not strictly limited by missing reports
    const totalAllowance = attendances.length * allowanceRate
    const periodKey = startDate && endDate ? `${startDate}_${endDate}` : pKey
    
    // Check PayrollRecord first, then fall back to JSON payrolls
    const existingPayroll = periodKey
      ? (existingPayrolls.find(p => p.internId === intern.id && p.period === periodKey)
         || (data.payrolls || []).find(p => p.internId === intern.id && p.period === periodKey))
      : null

    return {
      id: existingPayroll?.id || intern.id,
      internId: intern.id,
      userId: intern.userId,
      name: intern.name,
      university: intern.university,
      jenjang: intern.jenjang || 'S1',
      bidang: intern.bidang,
      spk: intern.spk || '-',
      tanggalSPK: intern.tanggalSPK || '-',
      periodStart: intern.periodStart || '-',
      periodEnd: intern.periodEnd || '-',
      bankAccount: intern.bankAccount || '-',
      bankAccountName: intern.bankAccountName || intern.name,
      bankName: intern.bankName || '-',
      presenceCount: attendances.length, 
      validPresenceCount,
      missingReportsCount,
      allowanceRate,
      totalAllowance,
      period: periodKey,
      status: existingPayroll?.status || 'PENDING',
      paidAt: existingPayroll?.paidAt || null,
      paidBy: existingPayroll?.paidBy || null,
      notes: existingPayroll?.notes || ''
    }
  }

  const payrollList = activeInterns.map(intern => buildItem(intern))

  // ── Export to Excel (Admin Only) ──────────────────
  if (format === 'excel' && !filterUserId) {
    // 1. Setup Headings
    const sDateSplit = startDate ? startDate.split('-') : []
    const eDateSplit = endDate ? endDate.split('-') : []
    const MONTHS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    
    let subTitle1 = 'BULAN INI'
    let subTitle2 = '(Periode Keseluruhan)'
    if (startDate && endDate && sDateSplit.length === 3 && eDateSplit.length === 3) {
      subTitle1 = `${MONTHS[parseInt(eDateSplit[1])].toUpperCase()} ${eDateSplit[0]}`
      subTitle2 = `(Periode : ${sDateSplit[2]} ${MONTHS[parseInt(sDateSplit[1])]} ${sDateSplit[0]} - ${eDateSplit[2]} ${MONTHS[parseInt(eDateSplit[1])]} ${eDateSplit[0]})`
    } else if (month && year) {
      subTitle1 = `${MONTHS[parseInt(month)].toUpperCase()} ${year}`
      subTitle2 = `(Periode : Bulan Penuh)`
    }

    const exportDataRows = [
      ['DAFTAR PEMBAYARAN UANG SAKU MAGANG'],
      [subTitle1],
      [subTitle2],
      [], // Empty row
      [
        'No', 'Nama', 'Nomor Perjanjian Magang', 'Tanggal Perjanjian Magang', 
        'Periode Magang', 'No Rekening', 'Nama Rekening', 'Bank', 'Bidang', 
        'Jumlah Kehadiran (Hari)', 'Uang Saku Perhari', 'Jumlah Uang Saku per Orang'
      ]
    ]

    // 2. Data Rows
    let totalAllowanceSum = 0
    payrollList.forEach((p, idx) => {
      exportDataRows.push([
        idx + 1,
        p.name,
        p.spk,
        p.tanggalSPK,
        `${p.periodStart} s.d ${p.periodEnd}`,
        p.bankAccount,
        p.bankAccountName,
        p.bankName,
        p.bidang || '-',
        p.validPresenceCount,
        p.allowanceRate,
        p.totalAllowance
      ])
      totalAllowanceSum += p.totalAllowance
    })

    // 3. Summary Row
    exportDataRows.push(['', '', '', '', '', '', '', '', 'TOTAL', '', '', totalAllowanceSum])

    // Generate worksheet dari AOA (Array of Arrays)
    const ws = XLSX.utils.aoa_to_sheet(exportDataRows)
    
    // Set widths matching screenshot density
    ws['!cols'] = [
      { wch: 5 }, { wch: 25 }, { wch: 28 }, { wch: 20 },
      { wch: 28 }, { wch: 18 }, { wch: 25 }, { wch: 12 }, { wch: 20 },
      { wch: 22 }, { wch: 18 }, { wch: 25 }
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Data_Payroll`)
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })

    const fileNameDate = startDate && endDate ? `${startDate}_to_${endDate}` : `${month}_${year}`
    const fileName = `Payroll_${fileNameDate}.xlsx`
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Length': buf.length.toString(),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    })
  }

  const summary = {
    total: payrollList.reduce((s, p) => s + p.totalAllowance, 0),
    paid: payrollList.filter(p => p.status === 'PAID').reduce((s, p) => s + p.totalAllowance, 0),
    pending: payrollList.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.totalAllowance, 0),
    countPaid: payrollList.filter(p => p.status === 'PAID').length,
    countPending: payrollList.filter(p => p.status === 'PENDING').length
  }

  return NextResponse.json({ data: payrollList, summary })
}

/* ── POST: process payment (single or bulk) ────────── */
export async function POST(request) {
  try {
    const body = await request.json()
    const { internIds, period, notes = '', processedBy = 'Admin HR' } = body

    if (!internIds?.length || !period) {
      return NextResponse.json({ error: 'internIds dan period diperlukan.' }, { status: 400 })
    }

    const data = await getDB()
    if (!data.payrolls) data.payrolls = []

    const [year, month] = period.split('-')
    let processed = 0

    for (const internId of internIds) {
      const intern = (data.interns || []).find(i => i.id === internId && !i.deletedAt)
        || await prisma.intern.findUnique({ where: { id: internId } }).catch(() => null)
      if (!intern) continue

      const item = buildPayrollItem(intern, data, month, year)

      try {
        // Write to PayrollRecord table (new relational)
        await prisma.payrollRecord.upsert({
          where: { internId_period: { internId, period } },
          update: {
            status: 'PAID',
            paidAt: new Date(),
            paidBy: processedBy,
            notes,
            totalAllowance: item.totalAllowance,
            presenceCount: item.presenceCount,
            validPresenceCount: item.validPresenceCount,
            allowanceRate: FLAT_RATE
          },
          create: {
            internId,
            period,
            status: 'PAID',
            presenceCount: item.presenceCount,
            validPresenceCount: item.validPresenceCount,
            allowanceRate: FLAT_RATE,
            totalAllowance: item.totalAllowance,
            paidAt: new Date(),
            paidBy: processedBy,
            notes
          }
        })
      } catch (dbErr) {
        // Fallback to JSON if Prisma table isn't available yet
        console.warn('[PAYROLL] Prisma upsert failed, using JSON fallback:', dbErr.message)
        const existing = (data.payrolls || []).find(p => p.internId === internId && p.period === period)
        if (existing) {
          existing.status = 'PAID'
          existing.paidAt = new Date().toISOString()
          existing.paidBy = processedBy
          existing.notes = notes
        } else {
          if (!data.payrolls) data.payrolls = []
          data.payrolls.push({
            id: 'pay' + Date.now() + processed,
            internId, period, status: 'PAID',
            presenceCount: item.presenceCount,
            validPresenceCount: item.validPresenceCount,
            allowanceRate: FLAT_RATE,
            totalAllowance: item.totalAllowance,
            paidAt: new Date().toISOString(),
            paidBy: processedBy, notes
          })
          await saveDB(data).catch(() => {})
        }
      }
      processed++
    }

    // BUG-06 FIX: Use processedBy as the log user identifier instead of hardcoded 'u1'
    await db.addLog(processedBy || 'admin', 'PAYROLL_PROCESS', { period, internIds, processed })

    return NextResponse.json({ success: true, processed })
  } catch (err) {
    console.error('[PAYROLL] POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/* ── PATCH: Intern mengkonfirmasi penerimaan dana ────────── */
export async function PATCH(request) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Payroll ID diperlukan.' }, { status: 400 })

    const data = await getDB()
    const existing = (data.payrolls || []).find(p => p.id === id)
    
    if (!existing) return NextResponse.json({ error: 'Data payroll tidak ditemukan.' }, { status: 404 })

    existing.status = 'PAID'
    existing.paidAt = new Date().toISOString()
    
    await saveDB(data)
    await db.addLog(existing.internId, 'PAYROLL_CONFIRMED', { payrollId: id, period: existing.period })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

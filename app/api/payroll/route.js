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

  // ── Ambil semua AttendanceLog dari Prisma SQL ──────────────────────
  // Mengambil semua logs lalu filter di JS (lebih reliable daripada Prisma startsWith di SQLite)
  const pKey = month && year ? `${year}-${String(month).padStart(2, '0')}` : null

  let allSqlLogs = []
  try {
    allSqlLogs = await prisma.attendanceLog.findMany()
  } catch (e) {
    console.error('[payroll] Failed to fetch SQL logs, falling back to JSON:', e.message)
    allSqlLogs = []
  }

  // Modifikasi buildItem menggunakan SQL logs
  const buildItem = (intern) => {
    // Filter SQL logs untuk intern ini yang statusnya valid
    let sqlLogs = allSqlLogs.filter(l => 
      l.internId === intern.id && ['PRESENT', 'LATE'].includes(l.status)
    )

    // Finalisasi attendances setelah filter date (SQL sudah diambil semua, filter di JS)
    let attendances = sqlLogs.length > 0
      ? sqlLogs.map(l => ({ date: l.date, checkIn: l.checkIn, status: l.status, internId: l.internId }))
      : (data.attendances || []).filter(a => a.internId === intern.id && ['PRESENT', 'LATE'].includes(a.status))

    // Filter by tanggal (di JS, bukan Prisma query)
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
      const reportExists = (data.reports || []).some(
        r => r.userId === intern.userId && 
             normalizeDate(r.date || r.reportDate) === attNorm && 
             r.status !== 'DRAFT'
      )
      if (reportExists) validPresenceCount++
      else missingReportsCount++
    })

    const allowanceRate = FLAT_RATE
    const totalAllowance = validPresenceCount * allowanceRate
    const periodKey = startDate && endDate ? `${startDate}_${endDate}` : pKey
    const existingPayroll = periodKey ? (data.payrolls || []).find(p => p.internId === intern.id && p.period === periodKey) : null

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
      const intern = data.interns.find(i => i.id === internId && !i.deletedAt)
      if (!intern) continue

      const existing = data.payrolls.find(p => p.internId === internId && p.period === period)
      const item = buildPayrollItem(intern, data, month, year)

      if (existing) {
        existing.status = 'PAID'
        existing.paidAt = new Date().toISOString()
        existing.paidBy = processedBy
        existing.notes = notes
        existing.totalAllowance = item.totalAllowance
        existing.presenceCount = item.presenceCount
        existing.validPresenceCount = item.validPresenceCount
        existing.allowanceRate = FLAT_RATE
      } else {
        data.payrolls.push({
          id: 'pay' + Date.now() + processed,
          internId,
          period,
          status: 'PAID',
          presenceCount: item.presenceCount,
          validPresenceCount: item.validPresenceCount,
          allowanceRate: FLAT_RATE,
          totalAllowance: item.totalAllowance,
          paidAt: new Date().toISOString(),
          paidBy: processedBy,
          notes
        })
      }
      processed++
    }

    await saveDB(data)
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

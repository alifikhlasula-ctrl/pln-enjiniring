import { NextResponse } from 'next/server'
import { getDB, db } from '@/lib/db'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'xlsx'

    // 1. Fetch same data as the dashboard
    const interns = await db.getInterns(false)
    const data = await getDB()
    const attendances = data.attendances || []
    const reports = data.reports || []
    const settings = data.settings || {}
    const targets = settings.capacityTargets || {}

    const FLAT_RATE = 25000
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    // --- REUSE CALCULATION LOGIC ---
    const activeInterns = interns.filter(i => i.status === 'ACTIVE')
    const internRates = {}
    activeInterns.forEach(intern => {
      const pastAttendances = attendances.filter(a => a.internId === intern.id && a.status === 'PRESENT')
      const pastValid = pastAttendances.filter(att => 
        reports.some(r => r.userId === intern.userId && (r.date === att.date || r.reportDate === att.date) && r.status !== 'DRAFT')
      ).length
      internRates[intern.id] = pastAttendances.length > 0 ? (pastValid / pastAttendances.length) : 0.9
    })

    const months = []
    const forecastActive = []
    const forecastBudget = []
    const forecastGap = []

    for (let m = 0; m < 6; m++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + m, 1)
      const monthLabel = targetDate.toLocaleString('default', { month: 'short', year: '2-digit' })
      months.push(monthLabel)

      let activeInMonthCount = 0
      let estimatedMonthBudget = 0
      const bidangCountsInMonth = {}

      interns.forEach(i => {
        if (!i.periodStart || !i.periodEnd) return
        const start = new Date(i.periodStart)
        const end = new Date(i.periodEnd)
        const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
        const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)

        if (start <= monthEnd && end >= monthStart) {
          activeInMonthCount++
          bidangCountsInMonth[i.bidang] = (bidangCountsInMonth[i.bidang] || 0) + 1
          const rate = internRates[i.id] || 0.9
          estimatedMonthBudget += (22 * FLAT_RATE * rate)
        }
      })

      forecastActive.push(activeInMonthCount)
      forecastBudget.push(estimatedMonthBudget)

      let monthGap = 0
      Object.keys(targets).forEach(bidang => {
        const current = bidangCountsInMonth[bidang] || 0
        const target = targets[bidang] || 0
        if (current < target) monthGap += (target - current)
      })
      forecastGap.push(monthGap)
    }

    // --- GENERATE EXCEL ---
    if (format === 'xlsx') {
      const forecastRows = months.map((m, i) => ({
        'Bulan': m,
        'Proyeksi Aktif': forecastActive[i],
        'Estimasi Budget': forecastBudget[i],
        'Gap Kapasitas': forecastGap[i]
      }))

      const ws1 = XLSX.utils.json_to_sheet(forecastRows)
      ws1['!cols'] = [{ wch: 15 }, { wch: 18 }, { wch: 22 }, { wch: 16 }]

      const bidangData = interns.reduce((acc, i) => {
        if (i.status === 'ACTIVE') acc[i.bidang] = (acc[i.bidang] || 0) + 1
        return acc
      }, {})

      const distributionRows = Object.entries(targets).map(([bidang, target]) => ({
        'Bidang': bidang,
        'Aktif Saat Ini': bidangData[bidang] || 0,
        'Target Kapasitas': target,
        'Gap': Math.max(target - (bidangData[bidang] || 0), 0)
      }))

      const ws2 = XLSX.utils.json_to_sheet(distributionRows)
      ws2['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 20 }, { wch: 12 }]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws1, 'Forecasting')
      XLSX.utils.book_append_sheet(wb, ws2, 'Bidang_Distribution')

      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
      const timestamp = new Date().toISOString().split('T')[0]

      const fileName = `PLN_ENJINIRING_Analytics_${timestamp}.xlsx`
      
      return new Response(buf, {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
          'Content-Length': buf.length.toString(),
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      })
    }

    // --- GENERATE PDF (Server-Side) ---
    if (format === 'pdf') {
      const { jsPDF } = await import('jspdf')
      // jsPDF in node often needs a polyfill or specific setup if it uses browser globals
      // But simple text and rect usually work. For autotable, it's more complex.
      // If jspdf-autotable fails in node, we'll use a simpler PDF layout.
      
      const doc = new jsPDF()
      const timestamp = new Date().toISOString().split('T')[0]
      
      doc.setFontSize(18)
      doc.text('PLN ENJINIRING Analytics Report', 105, 15, { align: 'center' })
      doc.setFontSize(10)
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 22, { align: 'center' })
      
      doc.setFontSize(14)
      doc.text('Forecasting Summary (6 Months)', 14, 35)
      
      let y = 45
      doc.setFontSize(10)
      doc.text('Month | Active | Budget | Gap', 14, y)
      y += 5
      doc.line(14, y, 100, y)
      y += 7
      
      months.forEach((m, i) => {
        doc.text(`${m} | ${forecastActive[i]} | Rp${forecastBudget[i].toLocaleString()} | ${forecastGap[i]}`, 14, y)
        y += 7
      })
      
      const pdfBuf = Buffer.from(doc.output('arraybuffer'))
      const fileName = `PLN_ENJINIRING_Analytics_${timestamp}.pdf`
      
      return new Response(pdfBuf, {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
          'Content-Length': pdfBuf.length.toString(),
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      })
    }

    return NextResponse.json({ error: 'Format not supported on server-side yet.' }, { status: 400 })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

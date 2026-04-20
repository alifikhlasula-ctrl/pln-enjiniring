import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDB } from '@/lib/db'
import { INDONESIA_HOLIDAYS_2026 } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId   = searchParams.get('userId')
    const internId = searchParams.get('internId')
    const startDate = searchParams.get('startDate') || ''
    const endDate   = searchParams.get('endDate') || ''

    // Dynamic imports for server-side jsPDF
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default

    // ── 1. Resolve targetUserId ──────────────────────────────
    let targetUserId = userId
    if (!targetUserId && internId) {
      // Try Prisma first
      const prismaIntern = await prisma.intern.findUnique({ where: { id: internId } }).catch(() => null)
      if (prismaIntern) {
        targetUserId = prismaIntern.userId
      } else {
        // Fallback: legacy JSON
        const legacyDB = await getDB()
        const legacyIntern = (legacyDB.interns || []).find(i => i.id === internId)
        if (legacyIntern) targetUserId = legacyIntern.userId
      }
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID tidak ditemukan' }, { status: 400 })
    }

    // ── 2. Fetch Intern Metadata (Prisma Primary, JSON Fallback) ─
    let internMeta = await prisma.intern.findUnique({ where: { userId: targetUserId } }).catch(() => null)
    
    // If not in Prisma, try legacy JSON
    if (!internMeta || internMeta.deletedAt) {
      const legacyDB = await getDB()
      const legacyIntern = (legacyDB.interns || []).find(i => i.userId === targetUserId && !i.deletedAt)
      if (legacyIntern) internMeta = legacyIntern
    }

    const internName       = internMeta?.name || 'Unknown'
    const internIdResolved = internMeta?.id   || ''

    // ── 3. Fetch Attendance Logs (Prisma by internId) ────────────
    const allAttendances = internIdResolved
      ? await prisma.attendanceLog.findMany({ where: { internId: internIdResolved } }).catch(() => [])
      : []

    // ── 4. Fetch Daily Reports: DUAL LAYER ───────────────────────
    // Layer A: PostgreSQL (primary - all new reports)
    const sqlReports = await prisma.dailyReport.findMany({
      where: { userId: targetUserId, status: { not: 'DRAFT' } },
      orderBy: { date: 'asc' }
    }).catch(() => [])

    // Layer B: Legacy JSON (fallback for older interns pre-SQL migration)
    let legacyJsonReports = []
    try {
      const legacyDB = await getDB()
      legacyJsonReports = (legacyDB.reports || []).filter(
        r => r.userId === targetUserId && r.status !== 'DRAFT'
      )
    } catch (e) {
      console.warn('[PDF Export] Legacy JSON read skipped:', e.message)
    }

    // ── 5. Merge: SQL takes precedence over JSON for same date ────
    // Build a unified map keyed by date string
    const reportMap = new Map()

    // Add legacy JSON first (lower priority)
    for (const r of legacyJsonReports) {
      const d = r.date || r.reportDate
      if (d) reportMap.set(d, { date: d, activity: r.activity || r.content || '', supervisor: r.supervisor || '', field: r.field || '' })
    }

    // Overwrite/add SQL reports (higher priority — most current)
    for (const r of sqlReports) {
      if (r.date) reportMap.set(r.date, { date: r.date, activity: r.activity || '', supervisor: r.supervisor || '', field: r.field || '' })
    }

    // ── 6. Filter to requested date range ────────────────────────
    const start = new Date(startDate)
    const end   = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Format tanggal tidak valid' }, { status: 400 })
    }

    // ── 7. Get metadata from profile (Always uniform) ───────────
    const supervisor = internMeta?.supervisorName || '-'
    const bidang     = internMeta?.bidang         || '-'

    // ── 8. Build row data for every calendar day in range ────────
    const rows = []
    let current = new Date(start)
    let index = 1

    while (current <= end) {
      const dateStr  = current.toISOString().split('T')[0]
      const isWeekend = current.getDay() === 0 || current.getDay() === 6
      const isHoliday = INDONESIA_HOLIDAYS_2026.includes(dateStr)
      const isLibur   = isWeekend || isHoliday

      const att = allAttendances.find(a => a.date === dateStr)
      const rep = reportMap.get(dateStr)

      // Format attendance times (WIB)
      const inTime  = att?.checkIn  ? new Date(att.checkIn).toLocaleTimeString('id-ID',  { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).replace(':', '.') : '-'
      const outTime = att?.checkOut ? new Date(att.checkOut).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).replace(':', '.') : '-'

      rows.push({
        no: index++,
        tanggal:    current.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        jam_datang: isLibur ? '' : inTime,
        jam_pulang: isLibur ? '' : outTime,
        kegiatan:   isLibur ? 'L I B U R' : (rep?.activity || ''),
        isLibur
      })

      current.setDate(current.getDate() + 1)
    }

    // ── 9. Build PDF ─────────────────────────────────────────────
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()

    // Header Box 1: Title
    doc.setLineWidth(0.4)
    doc.rect(10, 10, pageWidth - 20, 8)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('DAFTAR HADIR MAGANG', pageWidth / 2, 15.5, { align: 'center' })

    // Header Box 2: Logo area (blank)
    doc.rect(10, 18, pageWidth - 20, 8)

    // Header Box 3: Metadata
    doc.rect(10, 26, pageWidth - 20, 21)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Nama',       12, 31)
    doc.text('Pembimbing', 12, 38)
    doc.text('Bidang',     12, 45)
    doc.setFont('helvetica', 'normal')
    doc.text(`: ${internName}`, 38, 31)
    doc.text(`: ${supervisor}`, 38, 38)
    doc.text(`: ${bidang}`,     38, 45)

    // Date range label (yellow background)
    const sFmt = start.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()
    const eFmt = end.toLocaleDateString(  'id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()
    const monthName = `${sFmt} - ${eFmt}`
    const monthTextWidth = doc.getTextWidth(monthName)
    doc.setFillColor(255, 255, 0)
    doc.rect((pageWidth / 2) - (monthTextWidth / 2) - 10, 52, monthTextWidth + 20, 7, 'F')
    doc.setDrawColor(0)
    doc.rect((pageWidth / 2) - (monthTextWidth / 2) - 10, 52, monthTextWidth + 20, 7, 'D')
    doc.setFont('helvetica', 'bold')
    doc.text(monthName, pageWidth / 2, 57, { align: 'center' })

    // Main table
    const tableData = rows.map(r => [
      r.no + '.',
      r.tanggal,
      r.jam_datang,
      r.jam_pulang,
      r.kegiatan ? (r.isLibur ? r.kegiatan : `\u2022 ${r.kegiatan}`) : '',
      '', // TTD Peserta
      ''  // TTD Pembimbing
    ])

    autoTable(doc, {
      startY: 65,
      head: [['NO.', 'TANGGAL /BULAN /TAHUN', 'JAM DATANG', 'JAM PULANG', 'KEGIATAN', 'TTD PESERTA MAGANG', 'TTD PEMBIMBING MAGANG']],
      body: tableData,
      theme: 'grid',
      styles:     { fontSize: 8.5, cellPadding: 4, textColor: 0, lineColor: [0,0,0], lineWidth: 0.3, valign: 'middle' },
      headStyles: { fillColor: [255,255,255], textColor: 0, fontStyle: 'bold', halign: 'center', lineWidth: 0.3 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'center', cellWidth: 28 },
        2: { halign: 'center', cellWidth: 22 },
        3: { halign: 'center', cellWidth: 22 },
        4: { halign: 'left' },
        5: { halign: 'center', cellWidth: 25 },
        6: { halign: 'center', cellWidth: 25 },
      },
      didDrawCell: (data) => {
        if (data.row.section === 'body') {
          const rowIndex = data.row.index
          if (rows[rowIndex]?.isLibur) {
            doc.setFillColor(255, 217, 102)
            if (data.column.index >= 2 && data.column.index <= 6) {
              doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F')
              doc.setFont('helvetica', 'bold')
              if (data.column.index === 4) {
                doc.text('L I B U R', data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2) + 1.5, { align: 'center' })
              }
            }
          }
        }
      },
      margin: { left: 10, right: 10, bottom: 20 },
    })

    // ── 10. Return PDF ───────────────────────────────────────────
    const pdfBuf = Buffer.from(doc.output('arraybuffer'))
    const docName = `Daftar_Hadir_${internName.replace(/\s+/g, '_')}_${startDate}_sd_${endDate}.pdf`

    return new Response(pdfBuf, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${docName}"; filename*=UTF-8''${encodeURIComponent(docName)}`,
        'Content-Length': pdfBuf.length.toString(),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    })

  } catch (err) {
    console.error('[PDF Export Error]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

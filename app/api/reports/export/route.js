import { NextResponse } from 'next/server'
import { getDB, db } from '@/lib/db'
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
    
    // 1. Fetch Data
    const data = await getDB()
    const allReports = data.reports || []
    const allAttendances = data.attendances || []
    
    let targetUserId = userId
    if (internId && !targetUserId) {
      const intern = (data.interns || []).find(i => i.id === internId)
      if (intern) targetUserId = intern.userId
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID tidak ditemukan' }, { status: 400 })
    }

    const intern = (data.interns || []).find(i => i.userId === targetUserId)
    const internName = intern?.name || 'Unknown'
    
    // 2. Filter Reports & Attendances for this user/range
    const targetReps = allReports.filter(r => 
      r.userId === targetUserId && 
      (r.date >= startDate && r.date <= endDate || r.reportDate >= startDate && r.reportDate <= endDate) &&
      r.status !== 'DRAFT'
    )

    // Point 1: Get Supervisor and Field from the reports themselves
    // If multiple reports, take from the first one that has data, otherwise fallback to intern profile
    const reportWithMetadata = targetReps.find(r => r.supervisor || r.field)
    const supervisor = reportWithMetadata?.supervisor || intern?.supervisorName || '-'
    const bidang     = reportWithMetadata?.field || intern?.bidang || '-'

    // 3. Prepare Date Range Data
    const rows = []
    const start = new Date(startDate)
    const end   = new Date(endDate)
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
       return NextResponse.json({ error: 'Format tanggal tidak valid' }, { status: 400 })
    }

    let current = new Date(start)
    let index = 1
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      const isWeekend = current.getDay() === 0 || current.getDay() === 6
      const isHoliday = INDONESIA_HOLIDAYS_2026.includes(dateStr)
      const isLibur   = isWeekend || isHoliday
      
      const att = allAttendances.find(a => a.userId === targetUserId && a.date === dateStr)
      const rep = targetReps.find(r => r.date === dateStr || r.reportDate === dateStr)
      
      // Point 2: Jam Datang and Jam Pulang strictly follow attendance data
      const inTime  = att?.checkIn ? new Date(att.checkIn).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }).replace(':', '.') : '-'
      const outTime = att?.checkOut ? new Date(att.checkOut).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }).replace(':', '.') : '-'
      
      rows.push({
        no: index++,
        tanggal: current.toLocaleDateString('id-ID', { day:'2-digit', month:'2-digit', year:'numeric' }),
        jam_datang: isLibur ? '' : inTime,
        jam_pulang: isLibur ? '' : outTime,
        kegiatan: isLibur ? 'L I B U R' : (rep?.activity || rep?.content || ''),
        isLibur
      })
      
      current.setDate(current.getDate() + 1)
    }

    // 4. Initialize PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    
    // --- Header Box 1 (Title) ---
    doc.setLineWidth(0.4)
    doc.rect(10, 10, pageWidth - 20, 8) 
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('DAFTAR HADIR MAGANG', pageWidth / 2, 15.5, { align: 'center' })
    
    // --- Header Box 2 (Space) ---
    doc.rect(10, 18, pageWidth - 20, 8)

    // --- Header Box 3 (Metadata) ---
    doc.rect(10, 26, pageWidth - 20, 21) // Metadata box
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Nama', 12, 31)
    doc.text('Pembimbing', 12, 38)
    doc.text('Bidang', 12, 45)
    
    doc.setFont('helvetica', 'normal')
    doc.text(`: ${internName}`, 38, 31)
    doc.text(`: ${supervisor}`, 38, 38)
    doc.text(`: ${bidang}`, 38, 45)
    
    // --- Month Decoration ---
    const monthName = start.toLocaleDateString('id-ID', { month: 'long' }).toUpperCase()
    const monthTextWidth = doc.getTextWidth(monthName)
    doc.setFillColor(255, 255, 0) // Bright Yellow
    doc.rect((pageWidth/2) - (monthTextWidth/2) - 10, 52, monthTextWidth + 20, 7, 'F')
    doc.setDrawColor(0)
    doc.rect((pageWidth/2) - (monthTextWidth/2) - 10, 52, monthTextWidth + 20, 7, 'D')
    doc.setFont('helvetica', 'bold')
    doc.text(monthName, pageWidth / 2, 57, { align: 'center' })

    // 4. Main Table
    const tableData = rows.map(r => [
      r.no + '.',
      r.tanggal,
      r.jam_datang,
      r.jam_pulang,
      r.kegiatan ? (r.isWeekend ? r.kegiatan : `\u2022 ${r.kegiatan}`) : '', 
      '', // TTD Peserta
      ''  // TTD Pembimbing
    ])

    autoTable(doc, {
      startY: 65,
      head: [['NO.', 'TANGGAL /BULAN /TAHUN', 'JAM DATANG', 'JAM PULANG', 'KEGIATAN', 'TTD PESERTA MAGANG', 'TTD PEMBIMBING MAGANG']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: 4,
        textColor: 0,
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: 0,
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: 0.3,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
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
            if (rows[rowIndex].isWeekend) {
                doc.setFillColor(255, 217, 102) // Yellowish orange
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

    // 5. Finalize PDF
    const pdfBuf = Buffer.from(doc.output('arraybuffer'))
    const docName = `Daftar_Hadir_${internName.replace(/\s+/g, '_')}_${startDate}.pdf`
    
    return new Response(pdfBuf, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream', // Force download instead of opening in browser viewer
        'Content-Disposition': `attachment; filename="${docName}"; filename*=UTF-8''${encodeURIComponent(docName)}`,
        'Content-Length': pdfBuf.length.toString(),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    })

  } catch (err) {
    console.error('PDF Export Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

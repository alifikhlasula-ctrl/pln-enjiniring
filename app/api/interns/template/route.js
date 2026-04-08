import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

const TEMPLATE_HEADERS = [
  'Nama Lengkap', 'NIM/NIS', 'Jenis Kelamin', 'Perguruan Tinggi/Sekolah',
  'Jenjang', 'Jurusan', 'Status', 'Bidang', 'Wilayah Kerja', 'Tahun',
  'Tanggal Mulai', 'Tanggal Selesai', 'SPK/Perjanjian', 'Tanggal SPK',
  'Surat Penerimaan', 'Tanggal Surat Penerimaan',
  'Surat Selesai', 'Tanggal Surat Selesai'
]

export async function GET() {
  try {
    const sampleData = [
      TEMPLATE_HEADERS,
      [
        'John Doe', '20210001', 'Laki-laki', 'Universitas Indonesia',
        'S1', 'Informatika', 'ACTIVE', 'IT Development', 'Jakarta Selatan',
        '2026', '2026-01-01', '2026-06-30', 'SPK-001', '2026-01-01',
        'SP-001', '2025-12-15', '', ''
      ],
      [
        'Jane Smith', '20210002', 'Perempuan', 'Universitas Gadjah Mada',
        'D3', 'Akuntansi', 'ACTIVE', 'Keuangan', 'Yogyakarta',
        '2026', '2026-02-01', '2026-07-31', '', '',
        '', '', '', ''
      ]
    ]

    const ws = XLSX.utils.aoa_to_sheet(sampleData)

    // Set column widths
    ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 26 }))

    // Bold header row
    TEMPLATE_HEADERS.forEach((_, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIndex })
      if (ws[cellRef]) {
        ws[cellRef].s = { font: { bold: true } }
      }
    })

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template Intern')

    // Write as Buffer
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': "attachment; filename=\"Template_Import_Intern.xlsx\"; filename*=UTF-8''Template_Import_Intern.xlsx",
        'Content-Length': String(buf.length),
        'Cache-Control': 'no-store, no-cache'
      }
    })
  } catch (err) {
    console.error('[TEMPLATE_DOWNLOAD] Error:', err)
    return NextResponse.json({ error: 'Gagal membuat file templat' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

const TEMPLATE_HEADERS = [
  'Nama Lengkap', 'NIM/NIS', 'Jenis Kelamin', 'No. Handphone', 'NIK', 'Tanggal Lahir', 'Alamat',
  'Perguruan Tinggi/Sekolah', 'Jenjang', 'Jurusan', 'Nama Bank', 'Nomor Rekening', 'Pemilik Rekening',
  'Status', 'Bidang', 'Wilayah Kerja', 'Tahun', 'Tanggal Mulai', 'Tanggal Selesai',
  'SPK/Perjanjian', 'Tanggal SPK', 'Surat Penerimaan', 'Tanggal Surat Penerimaan',
  'Surat Selesai', 'Tanggal Surat Selesai'
]

export async function GET() {
  try {
    const sampleData = [
      TEMPLATE_HEADERS,
      [
        'John Doe', '20210001', 'Laki-laki', '081234567890', '1234567890123456', '2000-01-01', 'Jl. Merdeka No. 1, Jakarta',
        'Universitas Indonesia', 'S1', 'Informatika', 'BCA', '8877665544', 'JOHN DOE',
        'ACTIVE', 'IT Development', 'Jakarta Selatan', '2026', '2026-01-01', '2026-06-30',
        'SPK-001', '2026-01-01', 'SP-001', '2025-12-15', '', ''
      ],
      [
        'Jane Smith', '20210002', 'Perempuan', '08987654321', '6543210987654321', '2001-05-20', 'Jl. Sudirman No. 10, Jakarta',
        'Universitas Gadjah Mada', 'D3', 'Akuntansi', 'Mandiri', '1122334455', 'JANE SMITH',
        'ACTIVE', 'Keuangan', 'Yogyakarta', '2026', '2026-02-01', '2026-07-31',
        '', '', '', '', '', ''
      ]
    ]

    const ws = XLSX.utils.aoa_to_sheet(sampleData)
    ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 26 }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template Intern')

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })

    return new NextResponse(buf, {
      status: 200,
      headers: {
        // Force octet-stream so the browser doesn't try to "preview" it with an extension (which causes UUID names)
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="Template_Import_Intern.xlsx"',
        'Cache-Control': 'no-store, max-age=0'
      }
    })
  } catch (err) {
    console.error('[TEMPLATE] Error:', err)
    return NextResponse.json({ error: 'Gagal membuat file templat' }, { status: 500 })
  }
}

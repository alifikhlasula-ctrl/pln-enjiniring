import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const interns = await db.getInterns(false) // Get all interns with calculated status

    const wsData = interns.map(i => ({
      'Nama Lengkap':          i.name || '',
      'Email':                 i.email || i.user?.email || '',
      'NIM/NIS':               i.nim_nis || '',
      'Jenis Kelamin':         i.gender || '',
      'No. Handphone':         i.phone || '',
      'NIK':                   i.nik || '',
      'Instansi':              i.university || '',
      'Jenjang':               i.jenjang || '',
      'Jurusan':               i.major || '',
      'Bidang':                i.bidang || '',
      'Wilayah':               i.wilayah || '',
      'Mulai':                 i.periodStart || '',
      'Selesai':               i.periodEnd || '',
      'Durasi':                i.duration || '',
      'Tahun':                 i.tahun || '',
      'Status':                i.status || '',
      'Nama Pembimbing':       i.supervisorName || '',
      'Jabatan Pembimbing':    i.supervisorTitle || '',
      'Bank':                  i.bankName || '',
      'No. Rekening':          i.bankAccount || '',
      'Atas Nama Rekening':    i.bankAccountName || '',
    }))

    const ws = XLSX.utils.json_to_sheet(wsData)
    const colWidths = Object.keys(wsData[0] || {}).map(k => ({ wch: Math.max(k.length + 2, 15) }))
    ws['!cols'] = colWidths

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data_Intern')

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
    const timestamp = new Date().toISOString().split('T')[0]

    const fileName = `HRIS_PLNE_Export_${timestamp}.xlsx`
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

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

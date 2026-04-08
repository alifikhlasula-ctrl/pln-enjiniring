import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getDB()
    const requests = data.onboarding || []

    const wsData = requests.map(r => ({
      'Tanggal Pengajuan':   r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('id-ID') : '-',
      'Nama Pemohon':        r.applicant?.name || '-',
      'Email':               r.applicant?.email || '-',
      'NIM / NIS':           r.applicant?.nim_nis || '-',
      'Universitas/Sekolah': r.applicant?.university || '-',
      'Fakultas/Jurusan':    r.applicant?.major || '-',
      'Jenjang':             r.applicant?.jenjang || '-',
      'Bidang':              r.applicant?.bidang || '-',
      'Mulai':               r.applicant?.periodStart || '-',
      'Selesai':             r.applicant?.periodEnd || '-',
      'Status':              r.status || 'PENDING',
      'Catatan':             r.catatan || '-'
    }))

    const ws = XLSX.utils.json_to_sheet(wsData)
    const colWidths = Object.keys(wsData[0] || {}).map(k => ({ wch: Math.max(k.length + 2, 18) }))
    ws['!cols'] = colWidths

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Onboarding')

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
    const timestamp = new Date().toISOString().split('T')[0]

    const fileName = `Onboarding_Requests_${timestamp}.xlsx`
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

import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getDB()
    const requests = data.onboardingRequests || []

    const wsData = requests.map(r => ({
      'Tanggal Pengajuan':   r.createdAt ? new Date(r.createdAt).toLocaleDateString('id-ID') : '-',
      'Nama Pemohon':        r.requestedBy || '-',
      'Unit/Divisi':         r.targetUnit || '-',
      'Jumlah Peserta':      r.count || 0,
      'Posisi/Bidang':      r.position || '-',
      'Mulai':               r.startDate || '-',
      'Selesai':             r.endDate || '-',
      'Status':              r.status || 'PENDING',
      'Catatan':             r.notes || '-'
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

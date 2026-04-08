import { NextResponse } from 'next/server'
import { getDB, saveDB } from '@/lib/db'

/* ── GET: Compute auto-alerts + custom alerts ── */
export async function GET() {
  const data    = await getDB()
  const today   = new Date(); today.setHours(0,0,0,0)
  const cfg     = data.notificationSettings || { contractDays: 14, evalDays: 7, payrollDays: 3 }
  const alerts  = []

  // 1. Intern contracts expiring
  const inT = cfg.contractDays || 14
  const inE = new Date(today.getTime() + inT * 86400000)
  ;(data.interns || []).filter(i => !i.deletedAt && i.status === 'ACTIVE' && i.periodEnd).forEach(i => {
    const end = new Date(i.periodEnd); const diff = Math.ceil((end - today) / 86400000)
    if (diff >= 0 && diff <= inT) alerts.push({
      id: 'c_' + i.id, type: 'CONTRACT', severity: diff <= 3 ? 'URGENT' : diff <= 7 ? 'HIGH' : 'MEDIUM',
      title: `Kontrak ${i.name} berakhir ${diff === 0 ? 'hari ini' : `${diff} hari lagi`}`,
      detail: `${i.university} · ${i.major} · Berakhir: ${i.periodEnd}`,
      link: '/interns', internId: i.id, daysLeft: diff, createdAt: new Date().toISOString()
    })
  })

  // 2. Payroll still PENDING
  const payT = cfg.payrollDays || 3
  ;(data.payrolls || []).filter(p => p.status === 'PENDING').forEach(p => {
    const intern = (data.interns || []).find(i => i.id === p.internId)
    const age = Math.floor((Date.now() - new Date(p.createdAt || today)) / 86400000)
    if (age >= payT) alerts.push({
      id: 'p_' + p.id, type: 'PAYROLL', severity: age >= 7 ? 'URGENT' : 'HIGH',
      title: `Payroll pending: ${intern?.name || 'Intern'} (${MONTHS[p.bulan - 1]} ${p.tahun})`,
      detail: `Sudah ${age} hari belum diproses · Total: Rp ${new Intl.NumberFormat('id-ID').format(p.total || 0)}`,
      link: '/payroll', createdAt: new Date().toISOString()
    })
  })

  // 3. Evaluations due (interns with no eval in last 30 days)
  const evalT = cfg.evalDays || 30
  const cutoff = new Date(today.getTime() - evalT * 86400000)
  ;(data.interns || []).filter(i => !i.deletedAt && i.status === 'ACTIVE').forEach(i => {
    const lastEval = (data.evaluations || []).filter(e => e.internId === i.id).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
    if (!lastEval || new Date(lastEval.createdAt) < cutoff) {
      const days = lastEval ? Math.floor((today - new Date(lastEval.createdAt)) / 86400000) : null
      alerts.push({
        id: 'e_' + i.id, type: 'EVALUATION', severity: 'MEDIUM',
        title: `Evaluasi belum dilakukan: ${i.name}`,
        detail: lastEval ? `Evaluasi terakhir ${days} hari lalu` : 'Belum pernah dievaluasi',
        link: '/evaluations', internId: i.id, createdAt: new Date().toISOString()
      })
    }
  })

  // 4. Onboarding pending > 3 days
  ;(data.onboarding || []).filter(o => o.status === 'PENDING').forEach(o => {
    const age = Math.floor((Date.now() - new Date(o.submittedAt || today)) / 86400000)
    if (age >= 2) alerts.push({
      id: 'ob_' + o.id, type: 'ONBOARDING', severity: age >= 5 ? 'URGENT' : 'HIGH',
      title: `Onboarding pending: ${o.applicant?.name}`,
      detail: `Sudah ${age} hari menunggu review`,
      link: '/admin/onboarding', createdAt: new Date().toISOString()
    })
  })

  // 5. Custom/manual alerts
  const custom = (data.customAlerts || []).filter(a => !a.dismissed)

  // Sort: URGENT → HIGH → MEDIUM
  const SEV = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  alerts.sort((a, b) => (SEV[a.severity] || 2) - (SEV[b.severity] || 2))

  return NextResponse.json({ alerts: [...custom, ...alerts], settings: cfg, total: alerts.length + custom.length })
}

// MONTHS helper
const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

/* ── PUT: Update notification settings (thresholds) ── */
export async function PUT(request) {
  const body = await request.json()
  const data = await getDB()
  data.notificationSettings = { ...(data.notificationSettings || {}), ...body }
  await saveDB(data)
  return NextResponse.json({ success: true, settings: data.notificationSettings })
}

/* ── POST: Create custom manual alert ── */
export async function POST(request) {
  const body = await request.json()
  const data = await getDB()
  if (!data.customAlerts) data.customAlerts = []
  const alert = { id: 'ca' + Date.now(), type: 'CUSTOM', severity: body.severity || 'MEDIUM', title: body.title, detail: body.detail || '', link: body.link || '', dismissed: false, createdAt: new Date().toISOString() }
  data.customAlerts.push(alert)
  await saveDB(data)
  return NextResponse.json(alert)
}

/* ── DELETE: Dismiss a custom alert ── */
export async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const id   = searchParams.get('id')
  const data = await getDB()
  const ca   = (data.customAlerts || []).find(a => a.id === id)
  if (ca) { ca.dismissed = true; await saveDB(data) }
  return NextResponse.json({ success: true })
}

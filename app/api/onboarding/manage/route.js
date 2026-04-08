import { NextResponse } from 'next/server'
import { getDB, saveDB, db } from '@/lib/db'
import fs from 'fs'
import path from 'path'

/* ── GET: all submissions (Admin HR) or by email (Intern) ── */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const email  = searchParams.get('email')   // Intern check own status
  const status = searchParams.get('status')  // Admin filter
  const data   = await getDB()

  let list = data.onboarding || []
  if (email)  list = list.filter(o => o.applicant?.email === email)
  if (status && status !== 'ALL') list = list.filter(o => o.status === status)

  // Sort newest first
  list = [...list].sort((a, b) => new Date(b.submittedAt || b.timestamp) - new Date(a.submittedAt || a.timestamp))

  // Stats for Admin HR badge
  const stats = {
    total:    (data.onboarding || []).length,
    pending:  (data.onboarding || []).filter(o => o.status === 'PENDING').length,
    approved: (data.onboarding || []).filter(o => o.status === 'APPROVED').length,
    rejected: (data.onboarding || []).filter(o => o.status === 'REJECTED').length,
  }

  return NextResponse.json({ list, stats })
}

/* ── POST: Intern submits onboarding ───────────────────────── */
export async function POST(request) {
  try {
    const formData = await request.formData()
    const ts   = Date.now()
    const id   = 'ob' + ts
    const body = {}
    const docs = {}

    // Extract all fields
    const fields = ['name', 'email', 'phone', 'nim_nis', 'gender', 'university', 'major', 'jenjang', 'bidang', 'wilayah', 'tahun', 'periodStart', 'periodEnd', 'catatan', 'nik', 'birthDate', 'address', 'bankName', 'bankAccount', 'bankAccountName']
    fields.forEach(f => { body[f] = formData.get(f) })

    if (!body.name || !body.email) {
      return NextResponse.json({ error: 'Nama dan email wajib diisi.' }, { status: 400 })
    }

    const data = await getDB()

    // Check duplicate: same email + still PENDING
    const existing = (data.onboarding || []).find(o => o.applicant?.email === body.email && o.status === 'PENDING')
    if (existing) {
      return NextResponse.json({ error: 'Anda sudah memiliki pengajuan yang sedang menunggu review.', existingId: existing.id }, { status: 409 })
    }

    // Save files as base64 data URLs (serverless-compatible)
    const fileKeys = ['surat_permohonan', 'ktp', 'mbanking']
    for (const key of fileKeys) {
      const file = formData.get(key)
      if (file && typeof file !== 'string') {
        const buffer = Buffer.from(await file.arrayBuffer())
        const base64 = buffer.toString('base64')
        const mimeType = file.type || 'application/pdf'
        docs[key] = `data:${mimeType};base64,${base64}`
      }
    }

    const entry = {
      id,
      status:      'PENDING',
      submittedAt: new Date().toISOString(),
      reviewedAt:  null,
      reviewedBy:  null,
      reviewNote:  '',
      applicant: { ...body, docs },
      catatan:   body.catatan || '',
      timeline: [
        { action: 'SUBMITTED', at: new Date().toISOString(), by: body.name, note: 'Pengajuan dikirim oleh intern' }
      ]
    }

    if (!data.onboarding) data.onboarding = []
    data.onboarding.push(entry)
    await saveDB(data)

    await db.addLog('INTERN', 'ONBOARDING_SUBMIT', { id: entry.id, name: body.name, email: body.email })
    return NextResponse.json({ success: true, id: entry.id })
  } catch (err) {
    console.error('Error submitting onboarding:', err)
    return NextResponse.json({ error: 'Gagal memproses data.' }, { status: 500 })
  }
}

/* ── PATCH: Admin HR reviews (approve / reject / request revision) */
export async function PATCH(request) {
  const { id, status, reviewNote, reviewedBy } = await request.json()
  if (!id || !status) return NextResponse.json({ error: 'id dan status diperlukan' }, { status: 400 })

  const VALID = ['APPROVED', 'REJECTED', 'REVISION']
  if (!VALID.includes(status)) return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })

  const data = await getDB()
  const idx  = (data.onboarding || []).findIndex(o => o.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Pengajuan tidak ditemukan' }, { status: 404 })

  const entry = data.onboarding[idx]
  const at    = new Date().toISOString()

  entry.status     = status
  entry.reviewedAt = at
  entry.reviewedBy = reviewedBy || 'Admin HR'
  entry.reviewNote = reviewNote || ''

  if (!entry.timeline) entry.timeline = []
  entry.timeline.push({
    action: status, at, by: reviewedBy || 'Admin HR',
    note: reviewNote || ''
  })

  // ── Auto-create Intern record when APPROVED ───────
  let internCreated = false
  let internId      = null
  let internData    = null

  if (status === 'APPROVED' && !entry.internId) {
    const a   = entry.applicant || {}
    const ts  = Date.now()

    // Check duplicate by nim_nis or email (more accurate than name matching)
    const dupIntern = (data.interns || []).find(i =>
      !i.deletedAt &&
      ((a.nim_nis && i.nim_nis === a.nim_nis) || (a.email && i.email === a.email))
    )
    if (!dupIntern) {
      // Calculate duration
      const calcDur = (s, e) => {
        const a=new Date(s), b=new Date(e)
        if(isNaN(a)||isNaN(b)||b<a) return ''
        const d=Math.ceil(Math.abs(b-a)/86400000), m=Math.floor(d/30), r=d%30
        return `${m>0?m+' Bulan ':''}${r>0?r+' Hari':''}`
      }

      // Use applicant's NIM/NIS, or fallback to auto-generated from timestamp
      const nim = a.nim_nis || ('OB' + ts.toString().slice(-8))

      const newUser = {
        id:       'u' + ts,
        email:    a.email || `intern${ts}@hris.com`,
        password: 'password123',
        name:     a.name,
        role:     'INTERN',
        mustChangePassword: true
      }

      const newIntern = {
        id:          'i' + ts,
        userId:      newUser.id,
        name:        a.name || '',
        nim_nis:     nim,
        gender:      a.gender || 'Laki-laki',
        university:  a.university || '',
        jenjang:     a.jenjang || 'S1',
        major:       a.major || '',
        status:      'ACTIVE',
        bidang:      a.bidang || '',
        wilayah:     a.wilayah || '',
        tahun:       a.tahun || new Date().getFullYear().toString(),
        periodStart: a.periodStart || '',
        periodEnd:   a.periodEnd   || '',
        duration:    calcDur(a.periodStart, a.periodEnd),
        phone:       a.phone || '',
        // Expansion Fields
        nik:              a.nik || '',
        birthDate:        a.birthDate || '',
        address:          a.address || '',
        bankName:         a.bankName || '',
        bankAccount:      a.bankAccount || '',
        bankAccountName:  a.bankAccountName || '',
        // Docs placeholder — HR can fill in later
        suratPenerimaan: '', tanggalSuratPenerimaan: '',
        spk: '', tanggalSPK: '',
        amandemen: '', tanggalAmandemen: '',
        suratSelesai: '', tanggalSuratSelesai: '',
        // Source tracking
        fromOnboarding: entry.id,
        deletedAt: null
      }

      if (!data.users)   data.users   = []
      if (!data.interns) data.interns = []
      data.users.push(newUser)
      data.interns.push(newIntern)

      // Link back to onboarding entry
      entry.internId = newIntern.id
      internId       = newIntern.id
      internData     = newIntern
      internCreated  = true

      await db.addLog('u1', 'AUTO_CREATE_INTERN_FROM_ONBOARDING', {
        onboardingId: entry.id,
        internId:     newIntern.id,
        name:         a.name
      })
    }
  }

  await saveDB(data)
  await db.addLog('u1', `ONBOARDING_${status}`, { id, applicant: entry.applicant?.name, note: reviewNote })

  return NextResponse.json({ success: true, entry, internCreated, internId, internData })
}

/* ── DELETE: Remove a rejected/old submission ──────────────── */
export async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const id   = searchParams.get('id')
  const data = await getDB()
  const before = (data.onboarding || []).length
  data.onboarding = (data.onboarding || []).filter(o => o.id !== id)
  if (data.onboarding.length === before) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  await saveDB(data)
  await db.addLog('u1', 'ONBOARDING_DELETE', { id })
  return NextResponse.json({ success: true })
}

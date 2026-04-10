import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDB, db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/* ── GET: all submissions (Admin HR) or by email (Intern) ── */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email  = searchParams.get('email')   // Intern check own status
    const id     = searchParams.get('id')      // Specific document fetch
    const status = searchParams.get('status')  // Admin filter
    
    // ── Specific Document Fetch (Lazy Loading) ──
    if (id && searchParams.has('docs')) {
      const docStore = await prisma.jsonStore.findUnique({ where: { key: `docs_${id}` } })
      return NextResponse.json({ docs: docStore?.data || {} })
    }

    const where = {};
    if (status && status !== 'ALL') where.status = status;
    
    let list = await prisma.onboarding.findMany({
      where,
      orderBy: { submittedAt: 'desc' }
    });

    if (email) {
      list = list.filter(o => o.applicant?.email === email);
    }

    // Stats for Admin HR badge
    const all = await prisma.onboarding.findMany({ select: { status: true } });
    const stats = {
      total:    all.length,
      pending:  all.filter(o => o.status === 'PENDING').length,
      approved: all.filter(o => o.status === 'APPROVED').length,
      rejected: all.filter(o => o.status === 'REJECTED').length,
    }

    return NextResponse.json({ list, stats })
  } catch(err) {
    console.error(err)
    return NextResponse.json({ error: 'Gagal', list: [], stats: {} })
  }
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

    // Check duplicate
    const existing = await prisma.onboarding.findFirst({
        where: { 
            status: 'PENDING',
            applicant: { path: ['email'], equals: body.email }
        }
    });

    if (existing) {
      return NextResponse.json({ error: 'Anda sudah memiliki pengajuan yang sedang menunggu review.', existingId: existing.id }, { status: 409 })
    }

    // Save files as base64 data URLs in a partition
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

    // ─── PARTITIONING: Save heavy docs to a separate locker ───
    await prisma.jsonStore.upsert({
      where: { key: `docs_${id}` },
      update: { data: docs },
      create: { key: `docs_${id}`, data: docs }
    })

    const entry = await prisma.onboarding.create({
        data: {
            id,
            status: 'PENDING',
            applicant: { ...body, hasDocs: true },
            catatan: body.catatan || '',
            timeline: [
               { action: 'SUBMITTED', at: new Date().toISOString(), by: body.name, note: 'Pengajuan dikirim oleh intern' }
            ]
        }
    });

    db.addLog('INTERN', 'ONBOARDING_SUBMIT', { id: entry.id, name: body.name, email: body.email }).catch(()=>{})
    return NextResponse.json({ success: true, id: entry.id })
  } catch (err) {
    console.error('Error submitting onboarding:', err)
    return NextResponse.json({ error: 'Gagal memproses data.' }, { status: 500 })
  }
}

/* ── PATCH: Admin HR reviews (approve / reject / request revision) */
export async function PATCH(request) {
  try {
      const { id, status, reviewNote, reviewedBy } = await request.json()
      if (!id || !status) return NextResponse.json({ error: 'id dan status diperlukan' }, { status: 400 })

      const VALID = ['APPROVED', 'REJECTED', 'REVISION']
      if (!VALID.includes(status)) return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })

      const entry = await prisma.onboarding.findUnique({ where: { id } })
      if (!entry) return NextResponse.json({ error: 'Pengajuan tidak ditemukan' }, { status: 404 })

      const at = new Date().toISOString()
      const timeline = entry.timeline || [];
      timeline.push({
        action: status, at, by: reviewedBy || 'Admin HR', note: reviewNote || ''
      });

      // ── Auto-create Intern record when APPROVED ───────
      let internCreated = false
      let internId      = null
      let internData    = null

      if (status === 'APPROVED' && !entry.internId) {
        const a = entry.applicant || {}
        const ts = Date.now()
        
        // Find duplicate by NIS or email
        const dupIntern = await prisma.intern.findFirst({
            where: {
                OR: [
                    { nim_nis: a.nim_nis },
                    { email: a.email }
                ],
                deletedAt: null
            }
        });

        if (!dupIntern) {
          const calcDur = (s, e) => {
            const aD=new Date(s), bD=new Date(e)
            if(isNaN(aD)||isNaN(bD)||bD<aD) return ''
            const d=Math.ceil(Math.abs(bD-aD)/86400000), m=Math.floor(d/30), r=d%30
            return `${m>0?m+' Bulan ':''}${r>0?r+' Hari':''}`
          }

          const nim = a.nim_nis || ('OB' + ts.toString().slice(-8))
          const userId = 'u' + ts;

          await prisma.user.create({
              data: {
                  id: userId,
                  email: a.email || `intern${ts}@hris.com`,
                  password: 'password123',
                  name: a.name,
                  role: 'INTERN',
                  mustChangePassword: true
              }
          })

          const newIntern = await prisma.intern.create({
             data: {
                id: 'i' + ts,
                userId: userId,
                name: a.name || '',
                nim_nis: nim,
                email: a.email || '',
                gender: a.gender || 'Laki-laki',
                university: a.university || '',
                jenjang: a.jenjang || 'S1',
                major: a.major || '',
                status: 'ACTIVE',
                bidang: a.bidang || '',
                wilayah: a.wilayah || '',
                tahun: a.tahun || new Date().getFullYear().toString(),
                periodStart: a.periodStart || '',
                periodEnd: a.periodEnd || '',
                duration: calcDur(a.periodStart, a.periodEnd),
                phone: a.phone || '',
                nik: a.nik || '',
                birthDate: a.birthDate || '',
                address: a.address || '',
                bankName: a.bankName || '',
                bankAccount: a.bankAccount || '',
                bankAccountName: a.bankAccountName || '',
                fromOnboarding: entry.id,
             }
          });

          internId = newIntern.id
          internData = newIntern
          internCreated = true
        } else {
          internId = dupIntern.id;
        }
      }

      const updated = await prisma.onboarding.update({
          where: { id },
          data: {
              status,
              reviewedAt: new Date(),
              reviewedBy: reviewedBy || 'Admin HR',
              reviewNote: reviewNote || '',
              timeline: timeline,
              internId: internId
          }
      });

      db.addLog('u1', `ONBOARDING_${status}`, { id, applicant: entry.applicant?.name, note: reviewNote }).catch(()=>{})

      return NextResponse.json({ success: true, entry: updated, internCreated, internId, internData })
  } catch (err) {
      console.error(err);
      return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

/* ── DELETE: Remove a rejected/old submission ──────────────── */
export async function DELETE(request) {
  try {
      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'id dibutuhkan' }, { status: 400 })

      await prisma.onboarding.delete({ where: { id } })
      
      // Attempt to clean docs partition too
      prisma.jsonStore.delete({ where: { key: `docs_${id}` } }).catch(()=>{})

      db.addLog('u1', 'ONBOARDING_DELETE', { id }).catch(()=>{})
      return NextResponse.json({ success: true })
  } catch (err) {
      return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  }
}

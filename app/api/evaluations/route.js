import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { db } from '@/lib/db'

const DEFAULT_CRITERIA = [
  { key: 'discipline',    name: 'Kedisiplinan dan Kepatuhan',       weight: 15, desc: 'Kehadiran tepat waktu, menaati tata tertib', order: 1 },
  { key: 'integrity',    name: 'Integritas dan Etika Kerja',        weight: 15, desc: 'Jujur, bertanggung jawab, menjaga kerahasiaan', order: 2 },
  { key: 'teamwork',     name: 'Kerjasama dan Adaptabilitas',       weight: 15, desc: 'Kerja tim, menghargai perbedaan, adaptif', order: 3 },
  { key: 'initiative',   name: 'Inisiatif dan Motivasi',            weight: 10, desc: 'Proaktif, kemauan belajar tinggi', order: 4 },
  { key: 'communication',name: 'Komunikasi dan Interaksi',          weight: 10, desc: 'Menyampaikan ide, sopan, menerima umpan balik', order: 5 },
  { key: 'performance',  name: 'Kinerja dan Hasil Kerja',           weight: 20, desc: 'Tuntas sesuai target & kualitas', order: 6 },
  { key: 'technical',    name: 'Pengetahuan & Kompetensi Teknis',   weight: 15, desc: 'Penguasaan dasar teknis sesuai jurusan', order: 7 },
]

async function getOrCreateCriteria() {
  const existing = await prisma.evaluationCriteria.findMany({ orderBy: { order: 'asc' } })
  if (existing.length > 0) return existing
  // Seed defaults on first run
  await prisma.evaluationCriteria.createMany({ data: DEFAULT_CRITERIA, skipDuplicates: true })
  return await prisma.evaluationCriteria.findMany({ orderBy: { order: 'asc' } })
}

/* ── GET: List evaluations ── */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const supervisorId = searchParams.get('supervisorId')
    const internId     = searchParams.get('internId')

    const criteria = await getOrCreateCriteria()

    const where = {}
    if (supervisorId) where.supervisorId = supervisorId
    if (internId)     where.internId = internId

    const evals = await prisma.evaluation.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    // Fetch intern+user names for enrichment
    const internIds = [...new Set(evals.map(e => e.internId))]
    const interns = await prisma.intern.findMany({ where: { id: { in: internIds } } })
    const supervisorIds = [...new Set(evals.map(e => e.supervisorId).filter(Boolean))]
    const users = await prisma.user.findMany({ where: { id: { in: supervisorIds } } })

    const enriched = evals.map(e => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      internName:     interns.find(i => i.id === e.internId)?.name || e.internId,
      supervisorName: users.find(u => u.id === e.supervisorId)?.name || 'Admin HR',
    }))

    // Intern list for evaluation page (ACTIVE/COMPLETED finishing soon)
    const EVAL_START = '2026-03-01'
    
    // Fetch from both Prisma and Legacy JSON
    const pRelational = prisma.intern.findMany({
      where: { 
        deletedAt: null, 
        status: { in: ['COMPLETED', 'ACTIVE'] },
        periodEnd: { gte: EVAL_START }
      }
    })
    const pLegacy = db.getInterns() // This helper already merges relational, but we need raw filters
    
    const [relationalInterns, allInternsRaw] = await Promise.all([pRelational, pLegacy])
    
    // Filter the merged list to match our criteria
    const filteredInterns = allInternsRaw.filter(i => 
      !i.deletedAt && 
      ['COMPLETED', 'ACTIVE'].includes(i.status) && 
      i.periodEnd >= EVAL_START
    )

    const internsList = filteredInterns.map(i => {
      const myEvals = evals.filter(e => e.internId === i.id).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
      return { ...i, latestEval: myEvals[0] || null, evalCount: myEvals.length }
    }).sort((a, b) => new Date(a.periodEnd) - new Date(b.periodEnd)) // Show those finishing soonest first

    return NextResponse.json({ evaluations: enriched, interns: internsList, criteria })
  } catch (err) {
    console.error('[GET /api/evaluations]', err)
    return NextResponse.json({ error: 'Gagal mengambil data evaluasi' }, { status: 500 })
  }
}

/* ── POST: Create evaluation ── */
export async function POST(request) {
  try {
    const body = await request.json()
    const { internId, supervisorId, scores, overallNote, period, keunggulan, pengembangan, rekomendasi, tindakLanjut } = body
    if (!internId || !scores) return NextResponse.json({ error: 'internId dan scores diperlukan' }, { status: 400 })

    const criteria = await getOrCreateCriteria()
    const totalWeight   = criteria.reduce((s, c) => s + c.weight, 0)
    const weightedTotal = criteria.reduce((sum, c) => sum + ((scores[c.id] || 0) * c.weight), 0)
    const finalScore    = totalWeight > 0 ? Math.round((weightedTotal / totalWeight) * 10) / 10 : 0
    const grade         = finalScore >= 9 ? 'A' : finalScore >= 8 ? 'B' : finalScore >= 7 ? 'C' : finalScore >= 5 ? 'D' : 'E'
    
    // Inject qualitative notes into scores JSON to avoid schema changes
    const enrichedScores = { ...scores, keunggulan, pengembangan, rekomendasi, tindakLanjut }

    const entry = await prisma.evaluation.create({
      data: {
        internId,
        supervisorId: supervisorId || 'u1',
        scores: enrichedScores,
        finalScore,
        grade,
        overallNote: overallNote || '',
        period: period || new Date().toISOString().slice(0, 7),
      }
    })

    db.addLog(supervisorId || 'u1', 'CREATE_EVALUATION', { internId, finalScore, period: entry.period }).catch(() => {})
    return NextResponse.json({ ...entry, createdAt: entry.createdAt.toISOString(), updatedAt: entry.updatedAt.toISOString() })
  } catch (err) {
    console.error('[POST /api/evaluations]', err)
    return NextResponse.json({ error: 'Gagal menyimpan evaluasi' }, { status: 500 })
  }
}

/* ── PUT: Update evaluation ── */
export async function PUT(request) {
  try {
    const body   = await request.json()
    const criteria = await getOrCreateCriteria()
    const totalWeight   = criteria.reduce((s, c) => s + c.weight, 0)
    const weightedTotal = criteria.reduce((sum, c) => sum + (((body.scores || {})[c.id] || 0) * c.weight), 0)
    const finalScore    = totalWeight > 0 ? Math.round((weightedTotal / totalWeight) * 10) / 10 : 0
    const grade         = finalScore >= 9 ? 'A' : finalScore >= 8 ? 'B' : finalScore >= 7 ? 'C' : finalScore >= 5 ? 'D' : 'E'

    // Inject qualitative notes into scores JSON
    const enrichedScores = { ...body.scores, keunggulan: body.keunggulan, pengembangan: body.pengembangan, rekomendasi: body.rekomendasi, tindakLanjut: body.tindakLanjut }

    const updated = await prisma.evaluation.update({
      where: { id: body.id },
      data: { scores: enrichedScores, finalScore, grade, overallNote: body.overallNote, period: body.period }
    })
    return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() })
  } catch (err) {
    return NextResponse.json({ error: 'Gagal mengupdate evaluasi' }, { status: 500 })
  }
}

/* ── PATCH: Acknowledge evaluation ── */
export async function PATCH(request) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Evaluation ID diperlukan' }, { status: 400 })
    const updated = await prisma.evaluation.update({
      where: { id },
      data: { acknowledgedAt: new Date() }
    })
    db.addLog(updated.internId, 'EVAL_ACKNOWLEDGED', { evaluationId: id }).catch(() => {})
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/* ── DELETE: Remove evaluation ── */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    await prisma.evaluation.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Gagal menghapus evaluasi' }, { status: 500 })
  }
}

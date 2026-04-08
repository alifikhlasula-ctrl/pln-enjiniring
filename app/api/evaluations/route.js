import { NextResponse } from 'next/server'
import { getDB, saveDB, db } from '@/lib/db'

const DEFAULT_CRITERIA = [
  { id: 'discipline',    name: 'Kedisiplinan dan Kepatuhan',       weight: 15, desc: 'Kehadiran tepat waktu, menaati tata tertib' },
  { id: 'integrity',    name: 'Integritas dan Etika Kerja',        weight: 15, desc: 'Jujur, bertanggung jawab, menjaga kerahasiaan' },
  { id: 'teamwork',     name: 'Kerjasama dan Adaptabilitas',       weight: 15, desc: 'Kerja tim, menghargai perbedaan, adaptif' },
  { id: 'initiative',   name: 'Inisiatif dan Motivasi',            weight: 10, desc: 'Proaktif, kemauan belajar tinggi' },
  { id: 'communication',name: 'Komunikasi dan Interaksi',          weight: 10, desc: 'Menyampaikan ide, sopan, menerima umpan balik' },
  { id: 'performance',  name: 'Kinerja dan Hasil Kerja',           weight: 20, desc: 'Tuntas sesuai target & kualitas' },
  { id: 'technical',    name: 'Pengetahuan & Kompetensi Teknis',   weight: 15, desc: 'Penguasaan dasar teknis sesuai jurusan' },
]

/* ── GET: List evaluations (optionally filtered) ── */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const supervisorId = searchParams.get('supervisorId')
  const internId     = searchParams.get('internId')
  const data         = await getDB()

  // Ensure criteria exist
  if (!data.evaluationCriteria) {
    data.evaluationCriteria = DEFAULT_CRITERIA; await saveDB(data)
  }

  let evals = [...(data.evaluations || [])]
  if (supervisorId) evals = evals.filter(e => e.supervisorId === supervisorId)
  if (internId)     evals = evals.filter(e => e.internId === internId)

  // Enrich with intern + supervisor names
  const enriched = evals.map(e => ({
    ...e,
    internName:      (data.interns || []).find(i => i.id === e.internId)?.name || e.internId,
    supervisorName:  (data.users   || []).find(u => u.id === e.supervisorId)?.name || 'Admin HR',
  })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  // Hanya intern COMPLETED dengan periodEnd >= Maret 2026 yang masuk evaluasi
  const EVAL_START = '2026-03-01'
  const interns = (data.interns || []).filter(i =>
    !i.deletedAt &&
    String(i.status || '').toUpperCase() === 'COMPLETED' &&
    i.periodEnd >= EVAL_START
  ).map(i => ({
    ...i,
    latestEval: evals.filter(e => e.internId === i.id).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt))[0] || null,
    evalCount: evals.filter(e => e.internId === i.id).length
  }))

  return NextResponse.json({ evaluations: enriched, interns, criteria: data.evaluationCriteria || DEFAULT_CRITERIA })
}

/* ── POST: Create new evaluation ── */
export async function POST(request) {
  const body = await request.json()
  const { internId, supervisorId, scores, overallNote, period } = body
  if (!internId || !scores) return NextResponse.json({ error: 'internId dan scores diperlukan' }, { status: 400 })

  const data     = await getDB()
  const criteria = data.evaluationCriteria || DEFAULT_CRITERIA

  // Compute weighted total
  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0)
  const weightedTotal = criteria.reduce((sum, c) => {
    const score = scores[c.id] || 0
    return sum + (score * c.weight)
  }, 0)
  const finalScore = totalWeight > 0 ? Math.round((weightedTotal / totalWeight) * 10) / 10 : 0

  const entry = {
    id:          'ev' + Date.now(),
    internId, supervisorId: supervisorId || 'u1',
    scores,            // { criteriaId: 1-10 }
    finalScore,        // weighted average
    overallNote: overallNote || '',
    period:      period || new Date().toISOString().slice(0, 7), // YYYY-MM
    grade:       finalScore >= 9 ? 'A' : finalScore >= 8 ? 'B' : finalScore >= 7 ? 'C' : finalScore >= 5 ? 'D' : 'E',
    createdAt:   new Date().toISOString()
  }

  if (!data.evaluations) data.evaluations = []
  data.evaluations.push(entry)
  await saveDB(data)
  await db.addLog(supervisorId || 'u1', 'CREATE_EVALUATION', { internId, finalScore, period: entry.period })
  return NextResponse.json(entry)
}

/* ── PUT: Update evaluation ── */
export async function PUT(request) {
  const body = await request.json()
  const data = await getDB()
  const idx  = (data.evaluations || []).findIndex(e => e.id === body.id)
  if (idx === -1) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  const criteria    = data.evaluationCriteria || DEFAULT_CRITERIA
  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0)
  const weightedTotal = criteria.reduce((sum, c) => sum + ((body.scores?.[c.id] || 0) * c.weight), 0)
  const finalScore    = totalWeight > 0 ? Math.round((weightedTotal / totalWeight) * 10) / 10 : 0
  const grade         = finalScore >= 9 ? 'A' : finalScore >= 8 ? 'B' : finalScore >= 7 ? 'C' : finalScore >= 5 ? 'D' : 'E'
  data.evaluations[idx] = { ...data.evaluations[idx], ...body, finalScore, grade, updatedAt: new Date().toISOString() }
  await saveDB(data)
  return NextResponse.json(data.evaluations[idx])
}

/* ── PATCH: Intern konfirmasi sudah membaca evaluasi ── */
export async function PATCH(request) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Evaluation ID diperlukan' }, { status: 400 })
    const data = await getDB()
    const idx  = (data.evaluations || []).findIndex(e => e.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
    data.evaluations[idx].acknowledgedAt = new Date().toISOString()
    await saveDB(data)
    await db.addLog(data.evaluations[idx].internId, 'EVAL_ACKNOWLEDGED', { evaluationId: id })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/* ── DELETE: Remove evaluation ── */
export async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const id   = searchParams.get('id')
  const data = await getDB()
  data.evaluations = (data.evaluations || []).filter(e => e.id !== id)
  await saveDB(data)
  return NextResponse.json({ success: true })
}

import { NextResponse } from 'next/server'
import { getDB, saveDB, db } from '@/lib/db'

/* ── GET: List surveys ── */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const id   = searchParams.get('id')
  const data = await getDB()

  if (id) {
    const survey = (data.surveys || []).find(s => s.id === id)
    if (!survey) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
    // Aggregate responses
    const responses = (data.surveyResponses || []).filter(r => r.surveyId === id)
    const aggregated = (survey.questions || []).map(q => {
      const ans = responses.map(r => r.answers?.[q.id]).filter(Boolean)
      if (q.type === 'RATING') {
        const avg = ans.length ? (ans.reduce((s, v) => s + Number(v), 0) / ans.length).toFixed(1) : null
        const dist = [1,2,3,4,5].map(v => ({ value: v, count: ans.filter(a => Number(a) === v).length }))
        return { ...q, responseCount: ans.length, avg, dist }
      }
      if (q.type === 'MULTIPLE_CHOICE') {
        const dist = (q.options || []).map(o => ({ option: o, count: ans.filter(a => a === o).length }))
        return { ...q, responseCount: ans.length, dist }
      }
      return { ...q, responseCount: ans.length, texts: ans.slice(0, 20) }
    })
    return NextResponse.json({ survey, responses, aggregated, totalResponses: responses.length })
  }

  const surveys = [...(data.surveys || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(s => ({
    ...s,
    responseCount: (data.surveyResponses || []).filter(r => r.surveyId === s.id).length
  }))
  return NextResponse.json(surveys)
}

/* ── POST: Create survey ── */
export async function POST(request) {
  const body = await request.json()
  const { title, description, questions, targetRole, deadline, active } = body
  if (!title || !questions?.length) return NextResponse.json({ error: 'Judul dan pertanyaan diperlukan' }, { status: 400 })

  const data   = await getDB()
  if (!data.surveys) data.surveys = []
  const survey = {
    id: 'sv' + Date.now(), title, description: description || '',
    questions: (questions || []).map((q, i) => ({ ...q, id: `q${i+1}_${Date.now()}` })),
    targetRole: targetRole || 'INTERN', deadline: deadline || null,
    active: active !== false, createdAt: new Date().toISOString(), createdBy: 'Admin HR'
  }
  data.surveys.push(survey)
  await saveDB(data)
  await db.addLog('u1', 'CREATE_SURVEY', { id: survey.id, title })
  return NextResponse.json(survey)
}

/* ── PUT: Update survey ── */
export async function PUT(request) {
  const body = await request.json()
  const data = await getDB()
  const idx  = (data.surveys || []).findIndex(s => s.id === body.id)
  if (idx === -1) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  data.surveys[idx] = { ...data.surveys[idx], ...body, updatedAt: new Date().toISOString() }
  await saveDB(data)
  return NextResponse.json(data.surveys[idx])
}

/* ── DELETE: Remove survey ── */
export async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const id   = searchParams.get('id')
  const data = await getDB()
  data.surveys         = (data.surveys || []).filter(s => s.id !== id)
  data.surveyResponses = (data.surveyResponses || []).filter(r => r.surveyId !== id)
  await saveDB(data)
  return NextResponse.json({ success: true })
}

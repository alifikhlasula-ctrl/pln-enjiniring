import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { db } from '@/lib/db'

/* ── GET: List surveys ── */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      const survey = await prisma.survey.findUnique({ where: { id } })
      if (!survey) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

      const responses = await prisma.surveyResponse.findMany({ where: { surveyId: id } })
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
      return NextResponse.json({
        survey: { ...survey, createdAt: survey.createdAt.toISOString() },
        responses,
        aggregated,
        totalResponses: responses.length
      })
    }

    const surveys = await prisma.survey.findMany({ orderBy: { createdAt: 'desc' } })
    const counts = await prisma.surveyResponse.groupBy({
      by: ['surveyId'],
      _count: { id: true }
    })
    const countMap = Object.fromEntries(counts.map(c => [c.surveyId, c._count.id]))

    return NextResponse.json(surveys.map(s => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      responseCount: countMap[s.id] || 0
    })))
  } catch (err) {
    console.error('[GET /api/surveys]', err)
    return NextResponse.json({ error: 'Gagal mengambil survei' }, { status: 500 })
  }
}

/* ── POST: Create survey ── */
export async function POST(request) {
  try {
    const body = await request.json()
    const { title, description, questions, targetRole, deadline, active } = body
    if (!title || !questions?.length) return NextResponse.json({ error: 'Judul dan pertanyaan diperlukan' }, { status: 400 })

    const survey = await prisma.survey.create({
      data: {
        title,
        description: description || '',
        questions: (questions || []).map((q, i) => ({ ...q, id: `q${i+1}_${Date.now()}` })),
        targetRole: targetRole || 'INTERN',
        deadline: deadline ? new Date(deadline) : null,
        active: active !== false,
        createdBy: 'Admin HR'
      }
    })

    db.addLog('u1', 'CREATE_SURVEY', { id: survey.id, title }).catch(() => {})
    return NextResponse.json({ ...survey, createdAt: survey.createdAt.toISOString() })
  } catch (err) {
    return NextResponse.json({ error: 'Gagal membuat survei' }, { status: 500 })
  }
}

/* ── PUT: Update survey ── */
export async function PUT(request) {
  try {
    const body = await request.json()
    const updated = await prisma.survey.update({
      where: { id: body.id },
      data: {
        title: body.title,
        description: body.description,
        questions: body.questions,
        targetRole: body.targetRole,
        deadline: body.deadline ? new Date(body.deadline) : null,
        active: body.active
      }
    })
    return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString() })
  } catch (err) {
    return NextResponse.json({ error: 'Gagal mengupdate survei' }, { status: 500 })
  }
}

/* ── DELETE: Remove survey ── */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    await prisma.surveyResponse.deleteMany({ where: { surveyId: id } })
    await prisma.survey.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Gagal menghapus survei' }, { status: 500 })
  }
}

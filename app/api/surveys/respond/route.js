import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request) {
  try {
    const { surveyId, respondentId, respondentName, respondentRole, answers } = await request.json()
    if (!surveyId || !answers) return NextResponse.json({ error: 'surveyId dan answers diperlukan' }, { status: 400 })

    const survey = await prisma.survey.findUnique({ where: { id: surveyId } })
    if (!survey) return NextResponse.json({ error: 'Survei tidak ditemukan' }, { status: 404 })
    if (!survey.active) return NextResponse.json({ error: 'Survei sudah ditutup' }, { status: 403 })
    if (survey.deadline && new Date(survey.deadline) < new Date()) {
      return NextResponse.json({ error: 'Batas waktu survei sudah berakhir' }, { status: 403 })
    }

    // Check duplicate response
    const dup = await prisma.surveyResponse.findUnique({
      where: { surveyId_respondentId: { surveyId, respondentId: respondentId || 'anon' } }
    })
    if (dup) return NextResponse.json({ error: 'Anda sudah mengisi survei ini sebelumnya.' }, { status: 409 })

    const resp = await prisma.surveyResponse.create({
      data: {
        surveyId,
        respondentId: respondentId || 'anon',
        respondentName: respondentName || 'Anonymous',
        respondentRole: respondentRole || 'INTERN',
        answers
      }
    })
    return NextResponse.json({ success: true, id: resp.id })
  } catch (err) {
    console.error('[POST /api/surveys/respond]', err)
    return NextResponse.json({ error: 'Gagal menyimpan respons' }, { status: 500 })
  }
}

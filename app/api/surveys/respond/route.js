import { NextResponse } from 'next/server'
import { getDB, saveDB } from '@/lib/db'

export async function POST(request) {
  const { surveyId, respondentId, respondentName, respondentRole, answers } = await request.json()
  if (!surveyId || !answers) return NextResponse.json({ error: 'surveyId dan answers diperlukan' }, { status: 400 })

  const data   = await getDB()
  const survey = (data.surveys || []).find(s => s.id === surveyId)
  if (!survey) return NextResponse.json({ error: 'Survei tidak ditemukan' }, { status: 404 })
  if (!survey.active) return NextResponse.json({ error: 'Survei sudah ditutup' }, { status: 403 })
  if (survey.deadline && new Date(survey.deadline) < new Date()) return NextResponse.json({ error: 'Batas waktu survei sudah berakhir' }, { status: 403 })

  // Check duplicate response
  const dup = (data.surveyResponses || []).find(r => r.surveyId === surveyId && r.respondentId === respondentId)
  if (dup) return NextResponse.json({ error: 'Anda sudah mengisi survei ini sebelumnya.' }, { status: 409 })

  if (!data.surveyResponses) data.surveyResponses = []
  const resp = {
    id: 'sr' + Date.now(), surveyId, respondentId: respondentId || 'anon',
    respondentName: respondentName || 'Anonymous', respondentRole: respondentRole || 'INTERN',
    answers, submittedAt: new Date().toISOString()
  }
  data.surveyResponses.push(resp)
  await saveDB(data)
  return NextResponse.json({ success: true, id: resp.id })
}

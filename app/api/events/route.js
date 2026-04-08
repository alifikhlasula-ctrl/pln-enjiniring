import { NextResponse } from 'next/server'
import { getDB, saveDB } from '@/lib/db'

export async function GET() {
  const data  = await getDB()
  const today = new Date(); today.setHours(0,0,0,0)
  const list  = (data.events || [])
    .sort((a,b) => new Date(a.date) - new Date(b.date))
  return NextResponse.json(list)
}

export async function POST(request) {
  const body = await request.json()
  const data = await getDB()
  if (!data.events) data.events = []
  const nu = {
    id: 'evt' + Date.now(),
    title: body.title || '', date: body.date || '',
    type: body.type || 'GENERAL', description: body.description || '',
    createdAt: new Date().toISOString()
  }
  data.events.push(nu)
  await saveDB(data)
  return NextResponse.json(nu)
}

export async function PUT(request) {
  const body = await request.json()
  const data = await getDB()
  const idx  = (data.events || []).findIndex(e => e.id === body.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  data.events[idx] = { ...data.events[idx], ...body }
  await saveDB(data)
  return NextResponse.json(data.events[idx])
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const id   = searchParams.get('id')
  const data = await getDB()
  data.events = (data.events || []).filter(e => e.id !== id)
  await saveDB(data)
  return NextResponse.json({ success: true })
}

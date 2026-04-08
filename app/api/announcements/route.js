import { NextResponse } from 'next/server'
import { getDB, saveDB } from '@/lib/db'

export async function GET() {
  const data = await getDB()
  const list = (data.announcements || []).sort((a,b) => {
    if (a.pinned !== b.pinned) return b.pinned ? 1 : -1
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
  return NextResponse.json(list)
}

export async function POST(request) {
  const body = await request.json()
  const data = await getDB()
  if (!data.announcements) data.announcements = []
  const nu = {
    id: 'ann' + Date.now(),
    title: body.title || '', content: body.content || '',
    priority: body.priority || 'INFO', pinned: body.pinned || false,
    createdAt: new Date().toISOString(), createdBy: 'Admin HR'
  }
  data.announcements.push(nu)
  await saveDB(data)
  return NextResponse.json(nu)
}

export async function PUT(request) {
  const body = await request.json()
  const data = await getDB()
  const idx  = (data.announcements || []).findIndex(a => a.id === body.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  data.announcements[idx] = { ...data.announcements[idx], ...body, updatedAt: new Date().toISOString() }
  await saveDB(data)
  return NextResponse.json(data.announcements[idx])
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const id   = searchParams.get('id')
  const data = await getDB()
  data.announcements = (data.announcements || []).filter(a => a.id !== id)
  await saveDB(data)
  return NextResponse.json({ success: true })
}

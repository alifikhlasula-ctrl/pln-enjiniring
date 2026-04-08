import { NextResponse } from 'next/server'
import { getDB, saveDB } from '@/lib/db'

export async function GET() {
  const data = await getDB()
  const list = (data.hrTasks || []).sort((a,b) => {
    const PRIO = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    return (PRIO[a.priority] || 2) - (PRIO[b.priority] || 2)
  })
  return NextResponse.json(list)
}

export async function POST(request) {
  const body = await request.json()
  const data = await getDB()
  if (!data.hrTasks) data.hrTasks = []
  const nu = {
    id: 'task' + Date.now(),
    title: body.title || '', dueDate: body.dueDate || '',
    priority: body.priority || 'MEDIUM', completed: false,
    createdAt: new Date().toISOString()
  }
  data.hrTasks.push(nu)
  await saveDB(data)
  return NextResponse.json(nu)
}

export async function PUT(request) {
  const body = await request.json()
  const data = await getDB()
  const idx  = (data.hrTasks || []).findIndex(t => t.id === body.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  data.hrTasks[idx] = { ...data.hrTasks[idx], ...body }
  await saveDB(data)
  return NextResponse.json(data.hrTasks[idx])
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const id   = searchParams.get('id')
  const data = await getDB()
  data.hrTasks = (data.hrTasks || []).filter(t => t.id !== id)
  await saveDB(data)
  return NextResponse.json({ success: true })
}

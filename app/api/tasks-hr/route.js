import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const PRIO = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

export async function GET() {
  try {
    const list = await prisma.hrTask.findMany()
    const sorted = list.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return (PRIO[a.priority] || 2) - (PRIO[b.priority] || 2)
    })
    return NextResponse.json(sorted.map(t => ({ ...t, createdAt: t.createdAt.toISOString() })))
  } catch (err) {
    return NextResponse.json({ error: 'Gagal mengambil tugas HR' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const task = await prisma.hrTask.create({
      data: {
        title: body.title || '',
        dueDate: body.dueDate || null,
        priority: body.priority || 'MEDIUM',
        completed: false
      }
    })
    return NextResponse.json({ ...task, createdAt: task.createdAt.toISOString() })
  } catch (err) {
    return NextResponse.json({ error: 'Gagal membuat tugas HR' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()
    const updated = await prisma.hrTask.update({
      where: { id: body.id },
      data: {
        title: body.title,
        dueDate: body.dueDate,
        priority: body.priority,
        completed: body.completed
      }
    })
    return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString() })
  } catch (err) {
    return NextResponse.json({ error: 'Gagal mengupdate tugas HR' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    await prisma.hrTask.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Gagal menghapus tugas HR' }, { status: 500 })
  }
}

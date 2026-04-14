import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const list = await prisma.event.findMany({ orderBy: { date: 'asc' } })
    return NextResponse.json(list.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })))
  } catch (err) {
    return NextResponse.json({ error: 'Gagal mengambil event' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const ev = await prisma.event.create({
      data: {
        title: body.title || '',
        date: body.date || '',
        type: body.type || 'GENERAL',
        description: body.description || ''
      }
    })
    return NextResponse.json({ ...ev, createdAt: ev.createdAt.toISOString() })
  } catch (err) {
    return NextResponse.json({ error: 'Gagal membuat event' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()
    const updated = await prisma.event.update({
      where: { id: body.id },
      data: { title: body.title, date: body.date, type: body.type, description: body.description }
    })
    return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString() })
  } catch (err) {
    return NextResponse.json({ error: 'Gagal mengupdate event' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    await prisma.event.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Gagal menghapus event' }, { status: 500 })
  }
}

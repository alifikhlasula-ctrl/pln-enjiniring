import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withCache } from '@/lib/cache-headers'

export async function GET() {
  try {
    const list = await prisma.announcement.findMany({
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }]
    })
    return withCache(
      NextResponse.json(list.map(a => ({ ...a, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() }))),
      'MEDIUM'  // 30s cache — announcements are set by Admin, not real-time
    )
  } catch (err) {
    return NextResponse.json({ error: 'Gagal mengambil pengumuman' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const ann = await prisma.announcement.create({
      data: {
        title: body.title || '',
        content: body.content || '',
        priority: body.priority || 'INFO',
        pinned: body.pinned || false,
        createdBy: 'Admin HR'
      }
    })
    return NextResponse.json({ ...ann, createdAt: ann.createdAt.toISOString(), updatedAt: ann.updatedAt.toISOString() })
  } catch (err) {
    return NextResponse.json({ error: 'Gagal membuat pengumuman' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()
    const updated = await prisma.announcement.update({
      where: { id: body.id },
      data: {
        title: body.title,
        content: body.content,
        priority: body.priority,
        pinned: body.pinned
      }
    })
    return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() })
  } catch (err) {
    return NextResponse.json({ error: 'Gagal mengupdate pengumuman' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    await prisma.announcement.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Gagal menghapus pengumuman' }, { status: 500 })
  }
}

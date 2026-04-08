import { NextResponse } from 'next/server'
import { getDB, saveDB } from '@/lib/db'

// PUT /api/admin/announcements/[id]
export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, content, priority, pinned } = body

    const data = await getDB()
    const index = (data.announcements || []).findIndex(a => a.id === id)
    if (index === -1) return NextResponse.json({ error: 'Pengumuman tidak ditemukan' }, { status: 404 })

    const updated = {
      ...data.announcements[index],
      title: title || data.announcements[index].title,
      content: content || data.announcements[index].content,
      priority: priority || data.announcements[index].priority,
      pinned: !!pinned,
      updatedAt: new Date().toISOString()
    }

    data.announcements[index] = updated
    await saveDB(data)
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/admin/announcements/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const data = await getDB()
    const index = (data.announcements || []).findIndex(a => a.id === id)
    if (index === -1) return NextResponse.json({ error: 'Pengumuman tidak ditemukan' }, { status: 404 })

    data.announcements.splice(index, 1)
    await saveDB(data)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

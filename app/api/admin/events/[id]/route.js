import { NextResponse } from 'next/server'
import { getDB, saveDB } from '@/lib/db'

// PUT /api/admin/events/[id]
export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, date, type, description, targetGroup } = body

    const data = await getDB()
    const index = (data.events || []).findIndex(e => e.id === id)
    if (index === -1) return NextResponse.json({ error: 'Kegiatan tidak ditemukan' }, { status: 404 })

    const updated = {
      ...data.events[index],
      title: title || data.events[index].title,
      date: date || data.events[index].date,
      type: type || data.events[index].type,
      description: description || data.events[index].description,
      targetGroup: targetGroup || data.events[index].targetGroup,
      updatedAt: new Date().toISOString()
    }

    data.events[index] = updated
    await saveDB(data)
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/admin/events/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const data = await getDB()
    const index = (data.events || []).findIndex(e => e.id === id)
    if (index === -1) return NextResponse.json({ error: 'Kegiatan tidak ditemukan' }, { status: 404 })

    data.events.splice(index, 1)
    await saveDB(data)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

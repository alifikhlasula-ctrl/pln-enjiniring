import { NextResponse } from 'next/server'
import { getDB, saveDB } from '@/lib/db'

// GET /api/admin/announcements
export async function GET(request) {
  try {
    const data = await getDB()
    const list = [...(data.announcements || [])]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return NextResponse.json(list)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/admin/announcements
export async function POST(request) {
  try {
    const body = await request.json()
    const { title, content, priority, pinned, createdBy } = body
    
    if (!title || !content) return NextResponse.json({ error: 'Judul dan isi diperlukan' }, { status: 400 })

    const data = await getDB()
    const newAnn = {
      id: 'ann' + Date.now(),
      title,
      content,
      priority: priority || 'INFO',
      pinned: !!pinned,
      createdAt: new Date().toISOString(),
      createdBy: createdBy || 'Admin HR'
    }

    if (!data.announcements) data.announcements = []
    data.announcements.push(newAnn)
    
    await saveDB(data)
    return NextResponse.json(newAnn)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

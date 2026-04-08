import { NextResponse } from 'next/server'
import { getDB, saveDB } from '@/lib/db'

// GET /api/admin/events
export async function GET(request) {
  try {
    const data = await getDB()
    const list = [...(data.events || [])]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
    return NextResponse.json(list)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/admin/events
export async function POST(request) {
  try {
    const body = await request.json()
    const { title, date, type, description, targetGroup } = body
    
    if (!title || !date) return NextResponse.json({ error: 'Judul dan tanggal diperlukan' }, { status: 400 })

    const data = await getDB()
    const newEvt = {
      id: 'evt' + Date.now(),
      title,
      date,
      type: type || 'GENERAL',
      description: description || '',
      targetGroup: targetGroup || 'ALL', // 'ALL' or specific Bidang (e.g. 'IT Development')
      createdAt: new Date().toISOString()
    }

    if (!data.events) data.events = []
    data.events.push(newEvt)
    
    await saveDB(data)
    return NextResponse.json(newEvt)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

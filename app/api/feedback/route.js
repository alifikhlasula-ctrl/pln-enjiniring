import { NextResponse } from 'next/server'
import { getDB, saveDB, db } from '@/lib/db'

/* ── GET: List Feedbacks ── */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')
  const internId = searchParams.get('internId')
  
  const data = await getDB()
  let feedbacks = [...(data.internFeedbacks || [])]

  if (role === 'INTERN' && internId) {
    feedbacks = feedbacks.filter(f => f.internId === internId)
  } else if (role !== 'ADMIN_HR') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  feedbacks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  
  return NextResponse.json(feedbacks)
}

/* ── POST: Create Feedback (Intern) ── */
export async function POST(request) {
  try {
    const body = await request.json()
    const { internId, internName, category, sentimentScore, content, isAnonymous } = body

    if (!category || !sentimentScore || !content) {
      return NextResponse.json({ error: 'Semua field (Kategori, Rating Emoji, dan Pesan) wajib diisi!' }, { status: 400 })
    }

    const data = await getDB()
    if (!data.internFeedbacks) data.internFeedbacks = []

    const feedback = {
      id: 'fb' + Date.now(),
      internId,
      internName: isAnonymous ? 'Anonim' : internName,
      isAnonymous,
      category,
      sentimentScore: Number(sentimentScore),
      content,
      isRead: false,
      createdAt: new Date().toISOString()
    }

    data.internFeedbacks.push(feedback)
    await saveDB(data)
    
    // Optional: log to db.logs
    await db.addLog(internId, 'SUBMIT_FEEDBACK', { category, sentimentScore })

    return NextResponse.json({ success: true, feedback })
  } catch (error) {
    console.error('Submit Feedback Error:', error)
    return NextResponse.json({ error: 'Gagal mengirim feedback' }, { status: 500 })
  }
}

/* ── PUT: Update or Reply Feedback (Admin) ── */
export async function PUT(request) {
  try {
    const { id, reply, adminName } = await request.json()
    if (!id) return NextResponse.json({ error: 'ID Feedback wajib dilampirkan' }, { status: 400 })

    const data = await getDB()
    const idx = (data.internFeedbacks || []).findIndex(f => f.id === id)
    
    if (idx === -1) return NextResponse.json({ error: 'Feedback tidak ditemukan' }, { status: 404 })

    if (reply !== undefined) {
      data.internFeedbacks[idx].adminReply = reply
      data.internFeedbacks[idx].repliedBy = adminName || 'Admin HR'
      data.internFeedbacks[idx].repliedAt = new Date().toISOString()
      data.internFeedbacks[idx].isRead = true // Automatically mark read when replied
    } else {
      data.internFeedbacks[idx].isRead = true
    }
    
    await saveDB(data)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Update Feedback Error:', err)
    return NextResponse.json({ error: 'Gagal memperbarui status feedback' }, { status: 500 })
  }
}

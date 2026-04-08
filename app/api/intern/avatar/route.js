import { NextResponse } from 'next/server'
import { getDB, saveDB, db } from '@/lib/db'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const userId = formData.get('userId')
    const file = formData.get('avatar')

    if (!userId || !file || typeof file === 'string') {
      return NextResponse.json({ error: 'User ID dan file avatar diperlukan' }, { status: 400 })
    }

    const data = await getDB()
    const userIndex = (data.users || []).findIndex(u => u.id === userId)
    if (userIndex === -1) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

    // Convert file to base64 data URL (serverless-compatible, no filesystem needed)
    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'image/png'
    const dataUrl = `data:${mimeType};base64,${base64}`

    // Save data URL directly in user record
    data.users[userIndex].image = dataUrl

    await saveDB(data)
    await db.addLog(userId, 'AVATAR_UPLOAD', { type: mimeType })

    return NextResponse.json({ success: true, url: dataUrl })
  } catch (err) {
    console.error('Error uploading avatar:', err)
    return NextResponse.json({ error: 'Gagal mengunggah avatar' }, { status: 500 })
  }
}

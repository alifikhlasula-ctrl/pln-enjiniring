import { NextResponse } from 'next/server'
import { getDB, saveDB, db } from '@/lib/db'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return new NextResponse('User ID required', { status: 400 })

    const record = await prisma.jsonStore.findUnique({ where: { key: 'avatars' } })
    const avatars = record?.data || {}
    const dataUrl = avatars[userId]

    if (!dataUrl) {
      // Return a transparent 1x1 pixel or fallback
      const transparentPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')
      return new NextResponse(transparentPixel, { headers: { 'Content-Type': 'image/png' } })
    }

    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
    if (!matches || matches.length !== 3) return new NextResponse('Invalid image data', { status: 400 })

    const mimeType = matches[1]
    const buffer = Buffer.from(matches[2], 'base64')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch (err) {
    return new NextResponse('Internal Error', { status: 500 })
  }
}

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

    // Optional: Could add server-side compression here, but separation already solves Egress issue
    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'image/png'
    const dataUrl = `data:${mimeType};base64,${base64}`

    // 1. Save Base64 to `avatars` store
    const record = await prisma.jsonStore.findUnique({ where: { key: 'avatars' } })
    const avatarsData = record?.data || {}
    avatarsData[userId] = dataUrl

    await prisma.jsonStore.upsert({
      where: { key: 'avatars' },
      update: { data: avatarsData },
      create: { key: 'avatars', data: avatarsData }
    })

    // 2. Set the user image to the proxy endpoint with a cache-buster version string
    const proxyUrl = `/api/intern/avatar?userId=${userId}&v=${Date.now()}`
    data.users[userIndex].image = proxyUrl
    await saveDB(data)

    await db.addLog(userId, 'AVATAR_UPLOAD', { type: mimeType, proxyUrl })

    return NextResponse.json({ success: true, url: proxyUrl })
  } catch (err) {
    console.error('Error uploading avatar:', err)
    return NextResponse.json({ error: 'Gagal mengunggah avatar' }, { status: 500 })
  }
}

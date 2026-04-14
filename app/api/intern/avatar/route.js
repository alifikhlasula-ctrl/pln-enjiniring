import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { prisma } from '@/lib/prisma'
import { uploadBase64Photo, avatarPath, BUCKET, supabase } from '@/lib/supabase-storage'

export const dynamic = 'force-dynamic'

/* ── GET: Return avatar URL for a user ── */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return new NextResponse('User ID required', { status: 400 })

    // 1. Try User.image field in DB first (contains Supabase public URL for new uploads)
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { image: true } })
    if (user?.image && user.image.startsWith('http')) {
      // Redirect to Supabase URL directly — no proxying needed
      return NextResponse.redirect(user.image)
    }

    // 2. Fallback: legacy Base64 stored in JsonStore (old uploads)
    const record = await prisma.jsonStore.findUnique({ where: { key: 'avatars' } })
    const avatars = record?.data || {}
    const dataUrl = avatars[userId]

    if (!dataUrl) {
      // Return a transparent 1×1 placeholder
      const transparentPixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64'
      )
      return new NextResponse(transparentPixel, {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' }
      })
    }

    const matches = dataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
    if (!matches || matches.length !== 3) {
      return new NextResponse('Invalid image data', { status: 400 })
    }

    const buffer = Buffer.from(matches[2], 'base64')
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': matches[1],
        'Cache-Control': 'public, max-age=86400'
      }
    })
  } catch (err) {
    console.error('[GET /api/intern/avatar]', err)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

/* ── POST: Upload new avatar photo ── */
export async function POST(request) {
  try {
    const formData = await request.formData()
    const userId   = formData.get('userId')
    const file     = formData.get('avatar')

    if (!userId || !file || typeof file === 'string') {
      return NextResponse.json({ error: 'User ID dan file avatar diperlukan' }, { status: 400 })
    }

    // Read file
    const buffer   = Buffer.from(await file.arrayBuffer())
    const mimeType = file.type || 'image/jpeg'

    // Convert to base64 data URL to use shared uploader
    const base64   = buffer.toString('base64')
    const dataUrl  = `data:${mimeType};base64,${base64}`

    // Upload to Supabase Storage → avatars/{userId}.jpg
    const path      = avatarPath(userId)
    const publicUrl = await uploadBase64Photo(path, dataUrl)

    // Persist the public URL to User.image in Prisma
    await prisma.user.update({
      where: { id: userId },
      data:  { image: publicUrl }
    })

    // Also update the legacy JSON DB so the layout header and old code paths still work
    try {
      const data      = await import('@/lib/db').then(m => m.getDB())
      const userIndex = (data.users || []).findIndex(u => u.id === userId)
      if (userIndex !== -1) {
        data.users[userIndex].image = publicUrl
        const { saveDB } = await import('@/lib/db')
        await saveDB(data)
      }
    } catch (_) { /* non-critical */ }

    await db.addLog(userId, 'AVATAR_UPLOAD', { path, url: publicUrl })

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (err) {
    console.error('[POST /api/intern/avatar]', err)

    // Graceful degradation: if Supabase upload fails, save as Base64 in JsonStore (old method)
    try {
      const formData = await request.formData().catch(() => null)
      if (!formData) throw err

      const userId = formData.get('userId')
      const file   = formData.get('avatar')
      if (!userId || !file || typeof file === 'string') throw err

      const buffer   = Buffer.from(await file.arrayBuffer())
      const base64   = buffer.toString('base64')
      const mimeType = file.type || 'image/png'
      const dataUrl  = `data:${mimeType};base64,${base64}`

      const record     = await prisma.jsonStore.findUnique({ where: { key: 'avatars' } })
      const avatarsData = record?.data || {}
      avatarsData[userId] = dataUrl

      await prisma.jsonStore.upsert({
        where:  { key: 'avatars' },
        update: { data: avatarsData },
        create: { key: 'avatars', data: avatarsData }
      })

      const proxyUrl = `/api/intern/avatar?userId=${userId}&v=${Date.now()}`
      return NextResponse.json({ success: true, url: proxyUrl, fallback: true })
    } catch (_) {}

    return NextResponse.json({ error: 'Gagal mengunggah avatar: ' + err.message }, { status: 500 })
  }
}

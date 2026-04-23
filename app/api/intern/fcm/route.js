import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req) {
  try {
    const { userId, fcmToken } = await req.json()
    if (!userId || !fcmToken) {
      return NextResponse.json({ success: false, error: 'Missing data' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { fcmToken }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('FCM Token Save Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

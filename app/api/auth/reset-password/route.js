import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { db } from '@/lib/db'

export async function POST(request) {
  try {
    const { email, newPassword } = await request.json()

    // Find and update user password natively
    const user = await prisma.user.update({
        where: { email },
        data: {
            password: newPassword,
            mustChangePassword: false
        }
    }).catch(() => null)

    if (!user) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan.' }, { status: 404 })
    }

    await db.addLog(user.id, 'PASSWORD_RESET_SUCCESS', { email })

    return NextResponse.json({
      success: true,
      message: 'Kata sandi berhasil diperbarui.'
    })

  } catch (err) {
    console.error('[AUTH_LOG] Reset Password Error:', err)
    return NextResponse.json({ 
      success: false, 
      error: 'Terjadi kesalahan sistem saat memperbarui kata sandi.' 
    }, { status: 500 })
  }
}

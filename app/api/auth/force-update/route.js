import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { db } from '@/lib/db'

export async function POST(request) {
  try {
    const { userId, newEmail, newPassword } = await request.json()

    if (!userId || !newEmail || !newPassword) {
      return NextResponse.json({ error: 'Data tidak lengkap (Email dan Password dibutuhkan)' }, { status: 400 })
    }

    // Cari akun pengguna secara native
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 })
    }

    // Pastikan ini adalah update pertama kali (mustChangePassword === true)
    if (!user.mustChangePassword) {
      return NextResponse.json({ error: 'Invalid operation. Akun ini tidak meminta update wajib.' }, { status: 400 })
    }

    const oldEmail = user.email

    // Perbarui kredensial pengguna dan sinkronisasikan ke tabel intern secara atomik
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          email: newEmail,
          password: newPassword,
          mustChangePassword: false
        }
      }),
      prisma.intern.update({
        where: { userId: userId },
        data: {
          email: newEmail
        }
      })
    ]).catch(err => {
        // Jika intern record tidak ada (kasus langka), cukup update usernya saja
        console.warn(`[FORCE_UPDATE] Intern record missing for user ${userId}, continuing with user only update.`);
        return prisma.user.update({
            where: { id: userId },
            data: {
              email: newEmail,
              password: newPassword,
              mustChangePassword: false
            }
          });
    })

    // Catat log audit
    await db.addLog(userId, 'FORCE_PROFILE_UPDATE', {
      oldEmail,
      newEmail,
      message: 'User completed forced profile update upon first login.'
    })

    return NextResponse.json({
      success: true,
      message: 'Profil Anda berhasil diperbarui.'
    })

  } catch (err) {
    console.error('[POST /api/auth/force-update] error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan sistem: ' + err.message }, { status: 500 })
  }
}

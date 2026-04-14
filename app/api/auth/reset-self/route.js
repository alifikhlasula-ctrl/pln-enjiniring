import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { db } from '@/lib/db'

export async function POST(request) {
  try {
    const { name, nim_nis, newEmail, newPassword } = await request.json()

    if (!name || !nim_nis || !newEmail || !newPassword) {
      return NextResponse.json({ error: 'Harap lengkapi semua data (Nama, NIM/NIS, Email & Password Baru)' }, { status: 400 })
    }

    const nameLower = name.toLowerCase().replace(/\s+/g, ' ').trim()
    const nimTrim = String(nim_nis).trim()

    // Find intern by name and nim_nis natively
    const intern = await prisma.intern.findFirst({
        where: {
            name: { equals: nameLower, mode: 'insensitive' },
            nim_nis: nimTrim,
            deletedAt: null
        }
    })

    if (!intern) {
      return NextResponse.json({ 
        error: 'Data tidak ditemukan. Pastikan Nama Lengkap dan NIM/NIS sudah sesuai dengan yang terdaftar di HR.' 
      }, { status: 404 })
    }

    // Perbarui kredensial pengguna secara native
    const oldUser = await prisma.user.findUnique({ where: { id: intern.userId } })
    if (!oldUser) {
        return NextResponse.json({ error: 'Akun login tidak ditemukan untuk profil ini.' }, { status: 404 })
    }

    const oldEmail = oldUser.email

    await prisma.$transaction([
        prisma.user.update({
            where: { id: intern.userId },
            data: {
                email: newEmail,
                password: newPassword,
                mustChangePassword: false
            }
        }),
        prisma.intern.update({
            where: { id: intern.id },
            data: { email: newEmail }
        })
    ])

    // Log the self-reset action
    await db.addLog(intern.userId, 'SELF_RESET_ACCOUNT', { 
      name: intern.name, 
      oldEmail, 
      newEmail 
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Akun berhasil diperbarui. Silakan login menggunakan Email dan Password baru Anda.' 
    })

  } catch (err) {
    console.error('[POST /api/auth/reset-self] error:', err)
    return NextResponse.json({ error: 'Gagal memproses reset: ' + err.message }, { status: 500 })
  }
}

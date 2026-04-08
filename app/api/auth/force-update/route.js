import { NextResponse } from 'next/server'
import { getDB, saveDB, db } from '@/lib/db'

export async function POST(request) {
  try {
    const { userId, newEmail, newPassword } = await request.json()

    if (!userId || !newEmail || !newPassword) {
      return NextResponse.json({ error: 'Data tidak lengkap (Email dan Password dibutuhkan)' }, { status: 400 })
    }

    const data = await getDB()

    // Cari akun pengguna
    const userIdx = data.users.findIndex(u => u.id === userId)
    if (userIdx === -1) {
      return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 })
    }

    // Pastikan ini adalah update pertama kali (mustChangePassword === true)
    if (!data.users[userIdx].mustChangePassword) {
      return NextResponse.json({ error: 'Invalid operation. Akun ini tidak meminta update wajib.' }, { status: 400 })
    }

    const oldEmail = data.users[userIdx].email

    // Perbarui kredensial pengguna
    data.users[userIdx].email = newEmail
    data.users[userIdx].password = newPassword
    data.users[userIdx].mustChangePassword = false

    // Sinkronisasikan ke tabel intern (agar tabel Admin HR terupdate otomatis)
    const internIdx = (data.interns || []).findIndex(i => i.userId === userId && !i.deletedAt)
    if (internIdx !== -1) {
      data.interns[internIdx].email = newEmail
    }

    await saveDB(data)

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

import { NextResponse } from 'next/server'
import { getDB, saveDB, db } from '@/lib/db'

export async function POST(request) {
  try {
    const { name, nim_nis, newEmail, newPassword } = await request.json()

    if (!name || !nim_nis || !newEmail || !newPassword) {
      return NextResponse.json({ error: 'Harap lengkapi semua data (Nama, NIM/NIS, Email & Password Baru)' }, { status: 400 })
    }

    const data = await getDB()
    const nameLower = name.toLowerCase().trim()
    const nimTrim = String(nim_nis).trim()

    // Find intern by name and nim_nis
    const intern = data.interns.find(i => 
      !i.deletedAt && 
      i.name.toLowerCase().trim() === nameLower && 
      String(i.nim_nis).trim() === nimTrim
    )

    if (!intern) {
      return NextResponse.json({ 
        error: 'Data tidak ditemukan. Pastikan Nama Lengkap dan NIM/NIS sudah sesuai dengan yang terdaftar di HR.' 
      }, { status: 404 })
    }

    // Find the associated user
    const userIdx = data.users.findIndex(u => u.id === intern.userId)
    if (userIdx === -1) {
      return NextResponse.json({ error: 'Akun login tidak ditemukan untuk profil ini.' }, { status: 404 })
    }

    // Update credentials
    const oldEmail = data.users[userIdx].email
    data.users[userIdx].email = newEmail
    data.users[userIdx].password = newPassword

    await saveDB(data)

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

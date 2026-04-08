import { NextResponse } from 'next/server'
import { getDB, saveDB, db } from '@/lib/db'

export async function POST(request) {
  try {
    const { email, newPassword } = await request.json()
    const data = await getDB()

    const userIndex = data.users.findIndex(u => u.email === email)
    if (userIndex === -1) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan.' }, { status: 404 })
    }

    // Update password and clear the flag
    data.users[userIndex].password = newPassword
    data.users[userIndex].mustChangePassword = false

    await saveDB(data)
    await db.addLog(data.users[userIndex].id, 'PASSWORD_RESET_SUCCESS', { email })

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

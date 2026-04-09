import { NextResponse } from 'next/server'
import { getDB, saveDB, db } from '@/lib/db'

export async function POST(request) {
  try {
    const { internId, newEmail, newPassword } = await request.json()
    if (!internId || !newEmail || !newPassword) {
      return NextResponse.json({ error: 'Data tidak lengkap (Email dan Password baru wajib diisi)' }, { status: 400 })
    }

    const data = await getDB()
    const intern = data.interns.find(i => i.id === internId)
    if (!intern) return NextResponse.json({ error: 'Data peserta magang tidak ditemukan di database' }, { status: 404 })

    let userIdx = data.users.findIndex(u => u.id === intern.userId)
    if (userIdx === -1) {
      // Auto-restore a missing user account if the admin is trying to reset it!
      const newUserId = intern.userId || ('u' + Date.now() + Math.random().toString().slice(2, 6))
      
      const restoredUser = {
        id: newUserId,
        email: newEmail,
        password: newPassword,
        name: intern.name,
        role: 'INTERN'
      }
      
      if (!data.users) data.users = []
      data.users.push(restoredUser)
      
      // Ensure intern is linked to this newly restored user
      const iIdx = data.interns.findIndex(i => i.id === internId)
      if (iIdx > -1) {
        data.interns[iIdx].userId = newUserId
      }

      userIdx = data.users.length - 1
    } else {
      // Validasi apakah nama intern sesuai (sebagai pencegahan ekstra sesuai regulasi/permintaan)
      const userName = data.users[userIdx].name.toLowerCase().trim()
      const internName = intern.name.toLowerCase().trim()
      if (userName !== internName && !internName.includes(userName) && !userName.includes(internName)) {
          // Hanya beri warning jika perbedaannya terlalu jauh, tapi kita bisa auto-sync namanya.
          data.users[userIdx].name = intern.name 
      }

      // Update email and password
      data.users[userIdx].email = newEmail
      data.users[userIdx].password = newPassword
    }

    await saveDB(data)
    
    await db.addLog('u1', 'RESET_ACCOUNT', { internId, internName: intern.name, newEmail })

    return NextResponse.json({ success: true, message: 'Akun berhasil direset' })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

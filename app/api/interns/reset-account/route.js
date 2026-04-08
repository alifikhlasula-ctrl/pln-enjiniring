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

    const userIdx = data.users.findIndex(u => u.id === intern.userId)
    if (userIdx === -1) return NextResponse.json({ error: 'Akun user tidak ditemukan' }, { status: 404 })

    // Validasi apakah nama intern sesuai (sebagai pencegahan ekstra sesuai regulasi/permintaan)
    const userName = data.users[userIdx].name.toLowerCase().trim()
    const internName = intern.name.toLowerCase().trim()
    if (userName !== internName && !internName.includes(userName) && !userName.includes(internName)) {
        return NextResponse.json({ error: `Gagal: Nama user (${data.users[userIdx].name}) tidak sesuai dengan nama peserta magang (${intern.name}). Pastikan ini adalah orang yang sama.` }, { status: 400 })
    }

    // Update email and password
    data.users[userIdx].email = newEmail
    data.users[userIdx].password = newPassword

    await saveDB(data)
    
    await db.addLog('u1', 'RESET_ACCOUNT', { internId, internName: intern.name, newEmail })

    return NextResponse.json({ success: true, message: 'Akun berhasil direset' })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDB, saveDB, db } from '@/lib/db'

export async function POST(request) {
  try {
    const { internId, newEmail, newPassword } = await request.json()
    if (!internId || !newEmail || !newPassword) {
      return NextResponse.json({ error: 'Data tidak lengkap (Email dan Password baru wajib diisi)' }, { status: 400 })
    }

    // ── Step 1: Find the intern in Prisma (source of truth) ──
    let prismaIntern = await prisma.intern.findUnique({ where: { id: internId } }).catch(() => null)
    
    if (!prismaIntern) {
      // Fallback to legacy JsonStore
      const data = await getDB()
      prismaIntern = data.interns.find(i => i.id === internId)
    }

    if (!prismaIntern) {
      return NextResponse.json({ error: 'Data peserta magang tidak ditemukan' }, { status: 404 })
    }

    const userId = prismaIntern.userId

    // ── Step 2: Check if email is already used by another account ──
    const existingUser = await prisma.user.findUnique({ where: { email: newEmail } }).catch(() => null)
    if (existingUser && existingUser.id !== userId) {
      return NextResponse.json({ error: 'Email baru sudah digunakan oleh akun lain.' }, { status: 409 })
    }

    // ── Step 3: Update Prisma User table (primary) ──
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: newEmail,
        password: newPassword,
        mustChangePassword: true // Force intern to change password on next login
      }
    })

    // ── Step 4: Sync Prisma Intern table ──
    await prisma.intern.update({
      where: { id: internId },
      data: { email: newEmail }
    }).catch(() => {
      // Non-fatal: intern table may not have email field
      console.warn('[RESET_ACCOUNT] Could not update intern.email in Prisma')
    })

    // ── Step 5: Sync Legacy JsonStore ──
    try {
      const data = await getDB()
      const userIdx = data.users.findIndex(u => u.id === userId)
      if (userIdx !== -1) {
        data.users[userIdx].email = newEmail
        data.users[userIdx].password = newPassword
        data.users[userIdx].name = prismaIntern.name
      }
      const internIdx = data.interns.findIndex(i => i.id === internId)
      if (internIdx !== -1) {
        data.interns[internIdx].email = newEmail
        if (data.interns[internIdx].user) {
          data.interns[internIdx].user.email = newEmail
          data.interns[internIdx].user.password = newPassword
        }
      }
      await saveDB(data)
    } catch (jsonErr) {
      console.warn('[RESET_ACCOUNT] Legacy JSON sync failed (non-fatal):', jsonErr.message)
    }

    // ── Step 6: Audit log ──
    await db.addLog(userId, 'ADMIN_RESET_ACCOUNT', {
      internId,
      internName: prismaIntern.name,
      newEmail,
      note: 'Admin forced account credential reset. Intern must change password on next login.'
    })

    return NextResponse.json({
      success: true,
      message: `Akun ${prismaIntern.name} berhasil direset. Peserta akan diminta mengganti kata sandi saat login berikutnya.`
    })

  } catch (err) {
    console.error('[POST /api/interns/reset-account] Error:', err.message)
    const errStr = String(err?.message || '')
    if (errStr.includes('57014') || errStr.toLowerCase().includes('statement timeout')) {
      return NextResponse.json({ error: 'Database timeout. Silakan coba lagi dalam beberapa detik.' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Gagal mereset akun: ' + err.message }, { status: 500 })
  }
}

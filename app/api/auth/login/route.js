import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { db } from '@/lib/db'

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    // Find user by email and password natively
    const userMatched = await prisma.user.findFirst({
      where: { email, password }
    })

    if (userMatched) {
      // Remove password from response for security
      const { password: _, ...userSafe } = userMatched
      
      // Include intern status if INTERN role (for UI locking)
      if (userMatched.role === 'INTERN') {
        const intern = await prisma.intern.findUnique({
          where: { userId: userMatched.id }
        })

        if (!intern || intern.deletedAt) {
          console.warn(`[AUTH_LOG] Rejected login for ${email}: Intern profile deleted or disabled.`)
          return NextResponse.json({ 
            success: false, 
            error: 'Akun Anda telah dinonaktifkan atau dihapus oleh Administrator.' 
          }, { status: 403 })
        }

        // --- ACTIVE YEAR RESTRICTION ---
        // Allow login if year is 2026 OR if the intern is still ACTIVE (legacy interns)
        if (intern.tahun !== '2026' && intern.status !== 'ACTIVE') {
          console.warn(`[AUTH_LOG] Rejected login for ${email}: Batch mismatch (${intern.tahun}) and not ACTIVE.`)
          return NextResponse.json({ 
            success: false, 
            error: `Akses ditolak. Akun Anda terdaftar di tahun ${intern.tahun || 'Unknown'} dan status saat ini adalah ${intern.status}. Hanya intern aktif yang dapat masuk.` 
          }, { status: 403 })
        }

        userSafe.internStatus = intern.status
        userSafe.internId = intern.id
      }

      console.log(`[AUTH_LOG] User ${email} logged in successfully.`)
      db.addLog(userMatched.id, 'LOGIN_MANUAL_SUCCESS', { email }).catch(() => {})

      return NextResponse.json({
        success: true,
        user: userSafe,
        mustChangePassword: userMatched.mustChangePassword || false
      })
    } else {
      console.warn(`[AUTH_LOG] Failed login attempt for ${email}.`)
      return NextResponse.json({ 
        success: false, 
        error: 'Email atau password salah.' 
      }, { status: 401 })
    }

  } catch (err) {
    console.error('[AUTH_LOG] Login Error:', err)

    // Detect specific database errors and return user-friendly messages
    const errStr = String(err?.message || '')
    if (errStr.includes('57014') || errStr.toLowerCase().includes('statement timeout') || errStr.toLowerCase().includes('connection')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Sistem sedang sibuk. Silakan coba lagi dalam beberapa detik.' 
      }, { status: 503 })
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Terjadi kesalahan sistem saat login. Silakan coba lagi.' 
    }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getDB, db } from '@/lib/db'

export async function POST(request) {
  try {
    const { email, password } = await request.json()
    const data = await getDB()

    // Find user by email and password
    const userMatched = data.users.find(u => u.email === email && u.password === password)

    if (userMatched) {
      // Remove password from response for security
      const { password: _, ...userSafe } = userMatched
      
      // Include intern status if INTERN role (for UI locking)
      if (userMatched.role === 'INTERN') {
        const intern = (data.interns || []).find(i => i.userId === userMatched.id && !i.deletedAt)
        if (intern) {
          userSafe.internStatus = intern.status
          userSafe.internId = intern.id
        }
      }

      console.log(`[AUTH_LOG] User ${email} logged in successfully via Manual Auth.`)
      // addLog is non-critical — wrapped independently so it never blocks login
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
    return NextResponse.json({ 
      success: false, 
      error: 'Terjadi kesalahan sistem saat login.' 
    }, { status: 500 })
  }
}

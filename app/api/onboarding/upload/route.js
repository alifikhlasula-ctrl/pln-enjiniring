import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { RateLimiterMemory } from 'rate-limiter-flexible'

// Simple rate limiter for uploads (5 uploads per minute per IP)
const rateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
})

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = [
  'application/pdf', 
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
  'image/jpeg', 
  'image/png'
]

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
  
  // 1. Rate Limiting (Local)
  try {
    await rateLimiter.consume(ip)
  } catch (err) {
    console.error(`[UPLOAD_AUDIT] Local rate limit exceeded for IP: ${ip}`)
    return NextResponse.json({ error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' }, { status: 429 })
  }

  try {
    // 2. Parse Form Data
    const formData = await request.formData()
    const name = formData.get('name')
    const email = formData.get('email')
    const phone = formData.get('phone')
    const period = formData.get('period')
    
    if (!name || !email) {
      return NextResponse.json({ error: 'Metadata (Nama/Email) diperlukan.' }, { status: 400 })
    }

    const fileEntries = [
      { key: 'surat_permohonan', type: 'SURAT_PERMOHONAN' },
      { key: 'ktp', type: 'KTP' },
      { key: 'mbanking', type: 'MBANKING' }
    ]

    const files = []
    for (const entry of fileEntries) {
      const file = formData.get(entry.key)
      if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: `File ${entry.type} tidak ditemukan.` }, { status: 400 })
      }
      
      // 3. Validation
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: `Ukuran file ${entry.type} melebihi batas 5MB.` }, { status: 400 })
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: `Format file ${entry.type} tidak didukung.` }, { status: 400 })
      }
      
      files.push({ ...entry, file })
    }

    // 4. Local File Handling (Mock Since Google Drive is Rolled Back)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    
    const driveResults = files.map(f => ({
      type: f.type,
      driveUrl: `${protocol}://${host}/uploads/${f.type}_${timestamp}`, // Mock local URL
      name: `${name}_${f.type}_${timestamp}`,
      status: 'PENDING'
    }))

    // 5. Database Persistence
    const onboardingEntry = await db.submitOnboarding({
      applicant: { name, email, phone, period },
      files: driveResults,
      timestamp
    })

    await db.addLog('ANON', 'ONBOARDING_UPLOAD_SUCCESS', { name, email, id: onboardingEntry.id })
    console.log(`[UPLOAD_AUDIT] Onboarding successfully processed: ${onboardingEntry.id}`)

    return NextResponse.json({ success: true, id: onboardingEntry.id })

  } catch (err) {
    console.error('[UPLOAD_AUDIT] Critical Upload Error:', err)
    return NextResponse.json({ 
      error: 'Terjadi kesalahan sistem saat memproses unggahan.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    }, { status: 500 })
  }
}

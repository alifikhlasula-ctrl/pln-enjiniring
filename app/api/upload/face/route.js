import { NextResponse } from 'next/server'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET        = 'attendance-photos'

/**
 * POST /api/upload/face
 * Upload a face photo to Supabase Storage and return a public URL.
 * Body: FormData with `file` (Blob) + `internId` + `type` ('in' | 'out') + `date`
 */
export async function POST(request) {
  try {
    const form     = await request.formData()
    const file     = form.get('file')
    const internId = form.get('internId') || 'unknown'
    const type     = form.get('type')     || 'in'
    const date     = form.get('date')     || new Date().toISOString().split('T')[0]

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'File tidak valid' }, { status: 400 })
    }

    const buffer   = Buffer.from(await file.arrayBuffer())
    const ext      = file.type?.includes('png') ? 'png' : 'jpg'
    const fileName = `${internId}/${date}_${type}.${ext}`
    const mimeType = file.type || 'image/jpeg'

    // Upload to Supabase Storage via REST API
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': mimeType,
        'x-upsert': 'true'
      },
      body: buffer
    })

    if (!uploadRes.ok) {
      const err = await uploadRes.text()
      console.error('[face-upload] Supabase Storage error:', err)
      return NextResponse.json({ error: 'Gagal mengunggah foto: ' + err }, { status: 502 })
    }

    // Construct the public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`
    return NextResponse.json({ success: true, url: publicUrl, path: fileName })
  } catch (err) {
    console.error('[POST /api/upload/face]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

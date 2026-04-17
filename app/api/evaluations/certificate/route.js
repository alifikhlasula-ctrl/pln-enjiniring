import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { db } from '@/lib/db'
import { uploadToStorage } from '@/lib/supabase-storage'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

export async function POST(request) {
  try {
    // Auth via custom header set by middleware/AuthContext
    const role = request.headers.get('x-user-role')
    const userId = request.headers.get('x-user-id')

    if (!role || role !== 'ADMIN_HR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const evaluationId = formData.get('evaluationId')

    if (!file || !evaluationId) {
      return NextResponse.json({ error: 'File dan Evaluation ID wajib diisi' }, { status: 400 })
    }

    // Validate file
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Ukuran file maksimal 5MB' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Format file tidak didukung. Gunakan PDF, JPG, atau PNG.' }, { status: 400 })
    }

    // Find evaluation
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId }
    })
    if (!evaluation) {
      return NextResponse.json({ error: 'Evaluasi tidak ditemukan' }, { status: 404 })
    }

    // Convert to buffer for Supabase upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const fileExt = file.name.split('.').pop() || 'pdf'
    const path = `certificates/${evaluationId}_cert.${fileExt}`

    // Upload to Supabase Storage (bucket: hris_documents or certificates)
    let publicUrl = ''
    try {
      publicUrl = await uploadToStorage('hris_documents', path, buffer, file.type)
    } catch {
      // Fallback to 'certificates' bucket if hris_documents doesn't have that path
      publicUrl = await uploadToStorage('certificates', path, buffer, file.type)
    }

    // Update evaluation scores JSON with certificate URL
    const currentScores = (evaluation.scores && typeof evaluation.scores === 'object') ? evaluation.scores : {}
    const updatedScores = { ...currentScores, certificateUrl: publicUrl }

    await prisma.evaluation.update({
      where: { id: evaluationId },
      data: { scores: updatedScores }
    })

    // Log the action
    if (userId) {
      await db.addLog(userId, 'UPLOAD_CERTIFICATE', { evaluationId, url: publicUrl })
    }

    return NextResponse.json({ success: true, url: publicUrl })

  } catch (error) {
    console.error('[CERTIFICATE_UPLOAD_ERROR]', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat mengunggah sertifikat' },
      { status: 500 }
    )
  }
}

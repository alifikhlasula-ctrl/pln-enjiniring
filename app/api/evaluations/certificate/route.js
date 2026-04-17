import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { supabase, uploadToStorage } from '@/lib/supabase-storage'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

const BUCKET = 'hris_documents' // Use existing or create 'certificates'

export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN_HR') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const evaluationId = formData.get('evaluationId')

    if (!file || !evaluationId) {
      return NextResponse.json({ error: 'File and Evaluation ID required' }, { status: 400 })
    }

    // 1. Find evaluation
    const evaluation = await db.evaluation.findUnique({
      where: { id: evaluationId }
    })
    if (!evaluation) {
      return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
    }

    // 2. Upload to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${evaluationId}_cert.${fileExt}`
    const path = `certificates/${fileName}`

    // Convert file to Buffer/Blob for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Note: User must create 'certificates' bucket or we use 'hris_documents'
    // Let's use 'hris_documents' as it's more likely to exist, or try 'certificates'
    let publicUrl = ''
    try {
      publicUrl = await uploadToStorage('hris_documents', path, buffer, file.type)
    } catch (e) {
      // Fallback if bucket doesn't exist? No, let's assume 'hris_documents' for now
      // Or just try 'certificates' as requested in UI
      publicUrl = await uploadToStorage('certificates', path, buffer, file.type)
    }

    // 3. Update Evaluation scores JSON
    const currentScores = evaluation.scores || {}
    const updatedScores = { ...currentScores, certificateUrl: publicUrl }

    await db.evaluation.update({
      where: { id: evaluationId },
      data: { scores: updatedScores }
    })

    await db.addLog(session.user.id, 'UPLOAD_CERTIFICATE', { evaluationId, url: publicUrl })

    return NextResponse.json({ success: true, url: publicUrl })

  } catch (error) {
    console.error('[CERTIFICATE_UPLOAD_ERROR]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

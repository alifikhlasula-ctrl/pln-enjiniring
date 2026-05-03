import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const internId = searchParams.get('internId')
    if (!internId) return NextResponse.json({ error: 'internId required' }, { status: 400 })

    // Check if intern is approaching end date (H-3)
    const intern = await prisma.intern.findFirst({
      where: { id: internId, deletedAt: null },
      select: { id: true, periodEnd: true, name: true, suratSelesai: true }
    })
    if (!intern) return NextResponse.json({ error: 'Intern not found' }, { status: 404 })

    let daysUntilEnd = null
    if (intern.periodEnd) {
      const today = new Date(); today.setHours(0,0,0,0)
      const end = new Date(intern.periodEnd); end.setHours(0,0,0,0)
      daysUntilEnd = Math.ceil((end - today) / 86400000)
    }

    const record = await prisma.offboardingRecord.findUnique({ where: { internId } }).catch(() => null)

    return NextResponse.json({
      shouldTrigger: daysUntilEnd !== null && daysUntilEnd >= 0 && daysUntilEnd <= 3,
      daysUntilEnd,
      periodEnd: intern.periodEnd,
      internName: intern.name,
      hasSuratSelesai: !!intern.suratSelesai,
      offboarding: record ? {
        id: record.id,
        status: record.status,
        idCardReturned: record.idCardReturned,
        confirmedAt: record.confirmedAt,
        hasExitSurvey: !!record.exitSurveyData
      } : null
    })
  } catch (err) {
    console.error('[GET /api/offboarding]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { internId, exitSurveyData, idCardReturned, confirm } = await request.json()
    if (!internId) return NextResponse.json({ error: 'internId required' }, { status: 400 })

    const intern = await prisma.intern.findFirst({
      where: { id: internId, deletedAt: null },
      select: { id: true, name: true, bidang: true, suratSelesai: true }
    })
    if (!intern) return NextResponse.json({ error: 'Intern not found' }, { status: 404 })

    const existing = await prisma.offboardingRecord.findUnique({ where: { internId } }).catch(() => null)

    const updateData = {}
    if (exitSurveyData) updateData.exitSurveyData = exitSurveyData
    if (idCardReturned !== undefined) updateData.idCardReturned = idCardReturned
    if (confirm) {
      updateData.confirmedAt = new Date()
      updateData.status = 'DONE'
    }

    const record = await prisma.offboardingRecord.upsert({
      where: { internId },
      update: { ...updateData, updatedAt: new Date() },
      create: { internId, ...updateData }
    })

    // If fully confirmed, create HC notification task
    if (confirm) {
      await prisma.hrTask.create({
        data: {
          title: `✅ Offboarding Selesai: ${intern.name} (${intern.bidang})`,
          dueDate: new Date().toISOString().split('T')[0],
          priority: 'MEDIUM',
          completed: false
        }
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      status: record.status,
      confirmedAt: record.confirmedAt,
      hasSuratSelesai: !!intern.suratSelesai
    })
  } catch (err) {
    console.error('[POST /api/offboarding]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

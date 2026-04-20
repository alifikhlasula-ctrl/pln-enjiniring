import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDB, saveDB } from '@/lib/db'

export async function POST(request) {
  try {
    // 1. Clear PostgreSQL Relational Tables
    await prisma.intern.deleteMany({})
    await prisma.user.deleteMany({ where: { role: 'INTERN' } })
    await prisma.attendanceLog.deleteMany({})
    await prisma.attendanceCorrection.deleteMany({})
    await prisma.dailyReport.deleteMany({})
    await prisma.onboarding.deleteMany({})
    await prisma.evaluation.deleteMany({})
    await prisma.payrollRecord.deleteMany({})

    // 2. Clear Active JSON Store
    const activeData = await getDB('ACTIVE')
    activeData.interns = []
    activeData.users = (activeData.users || []).filter(u => u.role !== 'INTERN')
    activeData.attendances = []
    activeData.reports = []
    activeData.evaluations = []
    activeData.payrolls = []
    activeData.onboarding = []
    await saveDB(activeData)

    // 3. Clear Archive JSON Store
    const archiveData = await getDB('ARCHIVE')
    archiveData.interns = []
    archiveData.users = (archiveData.users || []).filter(u => u.role !== 'INTERN')
    archiveData.attendances = []
    archiveData.reports = []
    archiveData.evaluations = []
    archiveData.payrolls = []
    archiveData.onboarding = []
    // To save the archive, we need to temporarily trick saveDB, but wait: 
    // saveDB always saves to 'main' (STORE_KEY).
    // Let's manually upsert to the archive key.
    await prisma.jsonStore.upsert({
      where: { key: 'archive' },
      update: { data: archiveData },
      create: { key: 'archive', data: archiveData }
    })

    return NextResponse.json({ success: true, message: 'Seluruh data uji coba berhasil di-reset.' })
  } catch (err) {
    console.error('Reset Data Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDB } from '@/lib/db'

export const dynamic = 'force-dynamic' // No caching
export const revalidate = 0

export async function GET(request) {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const logs = await prisma.attendanceLog.findMany({
      where: { date: todayStr },
      orderBy: { checkIn: 'desc' }
    })

    // Fetch interns from both Prisma and Legacy JSON
    const prismaInterns = await prisma.intern.findMany({
      where: { 
        deletedAt: null, 
        status: { equals: 'ACTIVE', mode: 'insensitive' } 
      },
      select: { id: true, name: true, bidang: true }
    })

    let legacyInterns = []
    try {
      const db = await getDB()
      legacyInterns = (db.interns || []).filter(i => 
        !i.deletedAt && i.status?.toUpperCase() === 'ACTIVE'
      )
    } catch(e) {}

    const internMap = new Map()
    legacyInterns.forEach(i => internMap.set(i.id, { id: i.id, name: i.name, bidang: i.bidang || '-' }))
    prismaInterns.forEach(i => internMap.set(i.id, i)) 

    const allActiveInterns = Array.from(internMap.values())

    const payload = allActiveInterns.map(i => {
      const log = logs.find(l => l.internId === i.id)
      return {
        internId: i.id,
        name: i.name,
        bidang: i.bidang,
        status: log ? log.status : 'ABSENT',
        checkIn: log?.checkIn || null,
        checkOut: log?.checkOut || null,
        checkInLoc: log?.checkInLoc || null,
        // Return actual face photo URL (Supabase Storage URL preferred, then Base64 flag)
        faceInUrl: log?.faceInUrl || null,
        faceInBase64: log?.faceInBase64 ? true : false,
      }
    })

    // Sort by status: PRESENT first, LATE, then ABSENT, then by checkIn time desc
    const sorted = payload.sort((a,b) => {
      if (a.status !== b.status) {
        const order = { 'PRESENT': 0, 'LATE': 1, 'ABSENT': 2 }
        return order[a.status] - order[b.status]
      }
      if (a.checkIn && b.checkIn) return new Date(b.checkIn) - new Date(a.checkIn)
      return 0
    })

    return NextResponse.json({ live: sorted, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[GET /api/admin/attendance/live]', err)
    return NextResponse.json({ error: 'Failed to fetch live attendance' }, { status: 500 })
  }
}

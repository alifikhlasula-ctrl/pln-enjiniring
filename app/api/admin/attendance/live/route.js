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

      // For Supabase Storage URLs: send directly (short string, fast)
      // For Base64: DON'T embed in response (too large) — send logId for lazy-load
      const faceInUrl  = log?.faceInUrl  || null   // Supabase URL (always safe to send)
      const faceOutUrl = log?.faceOutUrl || null   // Supabase URL (always safe to send)
      const hasBase64In  = !faceInUrl  && !!log?.faceInBase64   // has old-style Base64
      const hasBase64Out = !faceOutUrl && !!log?.faceOutBase64  // has old-style Base64

      return {
        internId:    i.id,
        name:        i.name,
        bidang:      i.bidang,
        status:      log ? log.status : 'ABSENT',
        checkIn:     log?.checkIn  || null,
        checkOut:    log?.checkOut || null,
        checkInLoc:  log?.checkInLoc || null,
        logId:       log?.id || null,         // used for lazy photo load
        faceInUrl,                             // direct URL if available
        faceOutUrl,                            // direct URL if available
        hasBase64In,                           // true = fetch via /photo?logId=&type=in
        hasBase64Out,                          // true = fetch via /photo?logId=&type=out
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

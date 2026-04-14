import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDB } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days')) || 7

    const today = new Date(); today.setHours(23, 59, 59, 999)
    const startDate = new Date(today); startDate.setDate(startDate.getDate() - (days - 1))
    startDate.setHours(0, 0, 0, 0)

    const startDateStr = startDate.toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]

    const logs = await prisma.attendanceLog.findMany({
      where: { date: { gte: startDateStr, lte: todayStr } }
    })

    const prismaInterns = await prisma.intern.findMany({ select: { id:true, name: true, bidang: true } })
    
    let legacyInterns = []
    try {
      const db = await getDB()
      legacyInterns = db.interns || []
    } catch(e) {}

    const internMap = new Map()
    legacyInterns.forEach(i => internMap.set(i.id, i))
    prismaInterns.forEach(i => internMap.set(i.id, i))
    
    // Group by Date for Chart
    const DAYS_LABEL = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
    const history = []
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      const dayLogs = logs.filter(l => l.date === ds)
      const present = dayLogs.filter(l => l.status === 'PRESENT' || l.status === 'LATE')
      
      history.push({
        date: ds,
        label: DAYS_LABEL[d.getDay()],
        count: present.length,
        interns: present.map(l => ({ name: internMap.get(l.internId)?.name || 'Unknown', status: l.status, time: l.checkIn }))
      })
    }

    // List representation
    const recent = logs.sort((a,b) => new Date(b.date) - new Date(a.date)).map(l => ({
      ...l,
      internName: internMap.get(l.internId)?.name || 'Unknown',
      bidang: internMap.get(l.internId)?.bidang || '-'
    }))

    return NextResponse.json({ history, recent })
  } catch (err) {
    console.error('[GET /api/admin/attendance/stats]', err)
    return NextResponse.json({ error: 'Failed to fetch attendance stats' }, { status: 500 })
  }
}

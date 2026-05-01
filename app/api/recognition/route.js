import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const CATEGORIES = ['TEAMWORK', 'HELPFUL', 'CREATIVE', 'LEADERSHIP', 'INITIATIVE']
const MONTHLY_LIMIT = 5

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // ── Fetch all recognitions with sender/receiver names ──
    const [allRecognitions, allInterns, allUsers] = await Promise.all([
      prisma.recognition.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.intern.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, bidang: true, userId: true, university: true }
      }),
      prisma.user.findMany({
        select: { id: true, name: true, role: true }
      })
    ])

    const internMap = Object.fromEntries(allInterns.map(i => [i.id, i]))
    const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]))

    // ── Enrich recognitions ──
    const recognitions = allRecognitions.map(r => ({
      id: r.id,
      fromUserName: userMap[r.fromUserId]?.name || 'Unknown',
      toInternName: internMap[r.toInternId]?.name || 'Unknown',
      toInternBidang: internMap[r.toInternId]?.bidang || '-',
      message: r.message,
      category: r.category,
      createdAt: r.createdAt.toISOString()
    }))

    // ── Leaderboard: stars received per intern ──
    const starsByIntern = {}
    for (const r of allRecognitions) {
      if (!starsByIntern[r.toInternId]) starsByIntern[r.toInternId] = { count: 0, categories: {} }
      starsByIntern[r.toInternId].count++
      starsByIntern[r.toInternId].categories[r.category] = (starsByIntern[r.toInternId].categories[r.category] || 0) + 1
    }
    const topReceivers = Object.entries(starsByIntern)
      .map(([id, d]) => ({
        internId: id,
        name: internMap[id]?.name || 'Unknown',
        bidang: internMap[id]?.bidang || '-',
        university: internMap[id]?.university || '-',
        stars: d.count,
        categories: d.categories
      }))
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 20)

    // ── Category breakdown ──
    const categoryBreakdown = {}
    for (const c of CATEGORIES) categoryBreakdown[c] = 0
    for (const r of allRecognitions) {
      categoryBreakdown[r.category] = (categoryBreakdown[r.category] || 0) + 1
    }

    // ── Current user monthly budget ──
    let userBudget = null
    if (userId) {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const sentThisMonth = allRecognitions.filter(
        r => r.fromUserId === userId && new Date(r.createdAt) >= monthStart
      ).length
      const myStars = allRecognitions.filter(r => {
        const intern = allInterns.find(i => i.userId === userId)
        return intern && r.toInternId === intern.id
      }).length

      userBudget = {
        sent: sentThisMonth,
        remaining: Math.max(0, MONTHLY_LIMIT - sentThisMonth),
        limit: MONTHLY_LIMIT,
        received: myStars,
        recentReceived: allRecognitions
          .filter(r => {
            const intern = allInterns.find(i => i.userId === userId)
            return intern && r.toInternId === intern.id
          })
          .slice(0, 5)
          .map(r => ({
            fromName: userMap[r.fromUserId]?.name || 'Someone',
            message: r.message,
            category: r.category,
            createdAt: r.createdAt.toISOString()
          }))
      }
    }

    // ── Active interns list for giving stars ──
    const activeInterns = allInterns
      .filter(i => !userId || i.userId !== userId)
      .map(i => ({ id: i.id, name: i.name, bidang: i.bidang }))
      .sort((a, b) => a.name.localeCompare(b.name))

    const response = NextResponse.json({
      recognitions: recognitions.slice(0, 50),
      topReceivers,
      categoryBreakdown,
      userBudget,
      activeInterns,
      totalStars: allRecognitions.length
    })
    response.headers.set('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30')
    return response
  } catch (err) {
    console.error('[GET /api/recognition]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { fromUserId, toInternId, message, category } = await request.json()

    if (!fromUserId || !toInternId || !message) {
      return NextResponse.json({ error: 'fromUserId, toInternId, dan message diperlukan' }, { status: 400 })
    }
    if (category && !CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `Kategori tidak valid. Pilih: ${CATEGORIES.join(', ')}` }, { status: 400 })
    }

    // ── Check self-recognition ──
    const targetIntern = await prisma.intern.findUnique({ where: { id: toInternId }, select: { userId: true } })
    if (targetIntern && targetIntern.userId === fromUserId) {
      return NextResponse.json({ error: 'Tidak bisa memberikan bintang kepada diri sendiri' }, { status: 400 })
    }

    // ── Check monthly limit ──
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const sentThisMonth = await prisma.recognition.count({
      where: {
        fromUserId,
        createdAt: { gte: monthStart }
      }
    })
    if (sentThisMonth >= MONTHLY_LIMIT) {
      return NextResponse.json({
        error: `Batas bulanan tercapai! Kamu sudah mengirim ${MONTHLY_LIMIT} bintang bulan ini. Coba lagi bulan depan.`
      }, { status: 429 })
    }

    // ── Create recognition ──
    const recognition = await prisma.recognition.create({
      data: {
        fromUserId,
        toInternId,
        message: message.slice(0, 500),
        category: category || 'TEAMWORK'
      }
    })

    return NextResponse.json({
      success: true,
      recognition: { ...recognition, createdAt: recognition.createdAt.toISOString() },
      remaining: MONTHLY_LIMIT - sentThisMonth - 1
    })
  } catch (err) {
    console.error('[POST /api/recognition]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

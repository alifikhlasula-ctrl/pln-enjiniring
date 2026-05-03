import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const bidang = searchParams.get('bidang') || ''
    const university = searchParams.get('university') || ''
    const minScore = parseFloat(searchParams.get('minScore') || '0')

    const today = new Date().toISOString().split('T')[0]

    // Fetch alumni interns (COMPLETED status or periodEnd in the past)
    const alumni = await prisma.intern.findMany({
      where: {
        deletedAt: null,
        OR: [
          { status: 'COMPLETED' },
          { periodEnd: { lt: today } }
        ]
      }
    })

    // Fetch evaluations for scoring
    const allEvals = await prisma.evaluation.findMany({
      select: { internId: true, finalScore: true, grade: true }
    })
    const evalByIntern = Object.fromEntries(allEvals.map(e => [e.internId, e]))

    // Fetch recognitions (total stars received)
    const allRecognitions = await prisma.recognition.findMany({ select: { toInternId: true, category: true } })
    const starsByIntern = {}
    const categoriesByIntern = {}
    for (const r of allRecognitions) {
      starsByIntern[r.toInternId] = (starsByIntern[r.toInternId] || 0) + 1
      if (!categoriesByIntern[r.toInternId]) categoriesByIntern[r.toInternId] = {}
      categoriesByIntern[r.toInternId][r.category] = (categoriesByIntern[r.toInternId][r.category] || 0) + 1
    }

    // Fetch badges from JsonStore
    const badgeStores = await prisma.jsonStore.findMany({
      where: { key: { startsWith: 'badges_' } },
      select: { key: true, data: true }
    })
    const badgesByUserId = {}
    for (const store of badgeStores) {
      const userId = store.key.replace('badges_', '')
      badgesByUserId[userId] = store.data || []
    }

    // Build alumni profiles
    let profiles = alumni.map(intern => {
      const evalData = evalByIntern[intern.id]
      const stars = starsByIntern[intern.id] || 0
      const badges = badgesByUserId[intern.userId] || []
      const topCategories = Object.entries(categoriesByIntern[intern.id] || {})
        .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cat]) => cat)

      return {
        id: intern.id,
        userId: intern.userId,
        name: intern.name,
        university: intern.university,
        major: intern.major,
        jenjang: intern.jenjang,
        bidang: intern.bidang,
        supervisorName: intern.supervisorName,
        periodStart: intern.periodStart,
        periodEnd: intern.periodEnd,
        phone: intern.phone,
        email: intern.email,
        finalScore: evalData?.finalScore || null,
        grade: evalData?.grade || null,
        totalStars: stars,
        topCategories,
        badgeCount: badges.length,
        badges: badges.slice(0, 4)
      }
    })

    // Apply filters
    if (search) {
      const q = search.toLowerCase()
      profiles = profiles.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.university.toLowerCase().includes(q) ||
        p.major?.toLowerCase().includes(q)
      )
    }
    if (bidang) profiles = profiles.filter(p => p.bidang === bidang)
    if (university) profiles = profiles.filter(p => p.university === university)
    if (minScore > 0) profiles = profiles.filter(p => (p.finalScore || 0) >= minScore)

    profiles.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))

    // Aggregate filter options
    const allBidangs = [...new Set(alumni.map(i => i.bidang).filter(Boolean))].sort()
    const allUniversities = [...new Set(alumni.map(i => i.university).filter(Boolean))].sort()

    return NextResponse.json({
      alumni: profiles,
      total: profiles.length,
      filters: { bidangs: allBidangs, universities: allUniversities }
    })
  } catch (err) {
    console.error('[GET /api/admin/talent-scout]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

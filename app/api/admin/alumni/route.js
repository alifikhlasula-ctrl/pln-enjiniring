import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase() || ''
    const sortBy = searchParams.get('sort') || 'score' // score | date | name
    const filterBidang = searchParams.get('bidang') || ''

    // ── Fetch completed interns + their evaluations + their report skills ──
    const [allInterns, allEvals, allReports] = await Promise.all([
      prisma.intern.findMany({
        where: { deletedAt: null },
        select: {
          id: true, userId: true, name: true, university: true, major: true,
          bidang: true, jenjang: true, gender: true,
          periodStart: true, periodEnd: true, status: true,
          supervisorName: true, email: true, phone: true
        }
      }),
      prisma.evaluation.findMany({
        select: { internId: true, finalScore: true, grade: true, scores: true, createdAt: true }
      }),
      prisma.dailyReport.findMany({
        where: { status: { not: 'DRAFT' } },
        select: { userId: true, skills: true }
      })
    ])

    const todayStr = new Date().toISOString().split('T')[0]

    // Filter to completed interns (status COMPLETED or period ended)
    const completedInterns = allInterns.filter(i => {
      const s = (i.status || '').toUpperCase()
      return s === 'COMPLETED' || (i.periodEnd && i.periodEnd < todayStr && s !== 'TERMINATED')
    })

    // ── Build evaluation map (best eval per intern) ──
    const evalMap = {}
    for (const ev of allEvals) {
      if (!evalMap[ev.internId] || ev.finalScore > evalMap[ev.internId].finalScore) {
        evalMap[ev.internId] = ev
      }
    }

    // ── Build skills map per userId ──
    const skillsMap = {}
    for (const r of allReports) {
      if (r.skills && Array.isArray(r.skills)) {
        if (!skillsMap[r.userId]) skillsMap[r.userId] = {}
        for (const sk of r.skills) {
          const normalized = sk.trim()
          if (normalized) skillsMap[r.userId][normalized] = (skillsMap[r.userId][normalized] || 0) + 1
        }
      }
    }

    // ── Enrich alumni data ──
    let alumni = completedInterns.map(i => {
      const ev = evalMap[i.id] || evalMap[i.userId] || null
      const userSkills = skillsMap[i.userId] || {}
      const topSkills = Object.entries(userSkills)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([skill, count]) => ({ skill, count }))

      // Calculate duration
      let durationMonths = null
      if (i.periodStart && i.periodEnd) {
        const start = new Date(i.periodStart)
        const end = new Date(i.periodEnd)
        durationMonths = Math.round((end - start) / (30 * 86400000))
      }

      return {
        id: i.id,
        name: i.name,
        university: i.university,
        major: i.major,
        bidang: i.bidang,
        jenjang: i.jenjang,
        gender: i.gender,
        periodStart: i.periodStart,
        periodEnd: i.periodEnd,
        durationMonths,
        supervisorName: i.supervisorName,
        email: i.email,
        phone: i.phone,
        evaluation: ev ? {
          score: ev.finalScore,
          grade: ev.grade,
          date: ev.createdAt?.toISOString()
        } : null,
        topSkills,
        skillCount: Object.keys(userSkills).length,
        // Search composite string
        _searchStr: `${i.name} ${i.university} ${i.major} ${i.bidang} ${topSkills.map(s => s.skill).join(' ')}`.toLowerCase()
      }
    })

    // ── Apply search filter ──
    if (search) {
      alumni = alumni.filter(a => a._searchStr.includes(search))
    }
    if (filterBidang) {
      alumni = alumni.filter(a => a.bidang === filterBidang)
    }

    // ── Sort ──
    if (sortBy === 'score') {
      alumni.sort((a, b) => (b.evaluation?.score || 0) - (a.evaluation?.score || 0))
    } else if (sortBy === 'date') {
      alumni.sort((a, b) => (b.periodEnd || '').localeCompare(a.periodEnd || ''))
    } else {
      alumni.sort((a, b) => a.name.localeCompare(b.name))
    }

    // Remove internal _searchStr
    alumni = alumni.map(({ _searchStr, ...rest }) => rest)

    // ── Aggregated analytics ──
    const bidangList = [...new Set(completedInterns.map(i => i.bidang).filter(Boolean))].sort()
    const byBidang = {}
    const byUniversity = {}
    const byJenjang = {}
    for (const a of completedInterns) {
      byBidang[a.bidang || 'Lainnya'] = (byBidang[a.bidang || 'Lainnya'] || 0) + 1
      byUniversity[a.university || 'Lainnya'] = (byUniversity[a.university || 'Lainnya'] || 0) + 1
      byJenjang[a.jenjang || 'Lainnya'] = (byJenjang[a.jenjang || 'Lainnya'] || 0) + 1
    }

    // Top skills across all alumni
    const globalSkills = {}
    for (const userId of Object.keys(skillsMap)) {
      for (const [sk, count] of Object.entries(skillsMap[userId])) {
        globalSkills[sk] = (globalSkills[sk] || 0) + count
      }
    }
    const topGlobalSkills = Object.entries(globalSkills)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([skill, count]) => ({ skill, count }))

    const avgScore = alumni.filter(a => a.evaluation).length > 0
      ? +(alumni.filter(a => a.evaluation).reduce((s, a) => s + a.evaluation.score, 0) / alumni.filter(a => a.evaluation).length).toFixed(1)
      : null

    const response = NextResponse.json({
      alumni: alumni.slice(0, 100),
      total: alumni.length,
      stats: {
        totalAlumni: completedInterns.length,
        avgScore,
        byBidang,
        byUniversity,
        byJenjang,
        topSkills: topGlobalSkills,
        bidangList
      }
    })
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=59')
    return response
  } catch (err) {
    console.error('[GET /api/admin/alumni]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDB, saveDB, db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/* ── GET: Ambil Laporan Harian ────────────────────────── */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const internId = searchParams.get('internId') // For HR tracking
    
    let targetUserId = userId;

    if (!targetUserId && internId) {
      const intern = await prisma.intern.findUnique({ where: { id: internId } })
      if (intern) targetUserId = intern.userId;
    }

    const where = targetUserId ? { userId: targetUserId } : {};

    const reports = await prisma.dailyReport.findMany({
      where,
      orderBy: { date: 'desc' }
    })
    
    // Fallback: Merge Legacy JSON Reports for older interns
    try {
      const dbData = await getDB()
      const legacyReports = (dbData.reports || []).filter(r => targetUserId ? r.userId === targetUserId : true)
      
      legacyReports.forEach(lr => {
        const dateKey = lr.date || lr.reportDate
        if (dateKey && !reports.some(r => r.date === dateKey)) {
          reports.push({
            id: lr.id,
            userId: lr.userId,
            date: dateKey,
            activity: lr.activity || lr.content || '-',
            supervisor: lr.supervisor || '',
            field: lr.field || '',
            internName: lr.internName || 'Unknown',
            status: lr.status || 'TERCATAT',
            createdAt: new Date(lr.createdAt || new Date()),
            _isLegacy: true
          })
        }
      })
      // Re-sort effectively
      reports.sort((a, b) => new Date(b.date) - new Date(a.date))
    } catch (e) {
      console.warn('[GET /api/reports] Legacy merge skipped:', e.message)
    }

    let stats = {};
    let periodStart = null;

    if (targetUserId) {
      const internMeta = await prisma.intern.findUnique({ where: { userId: targetUserId } })
      periodStart = internMeta?.periodStart || null;

      stats = {
        total: reports.length,
        tercatat: reports.filter(r => r.status === 'TERCATAT').length,
        draft: reports.filter(r => r.status === 'DRAFT').length
      }
    }

    return NextResponse.json({ reports, stats, periodStart })
  } catch (err) {
    console.error('[GET /api/reports] Error:', err)
    return NextResponse.json({ error: 'Gagal mengambil laporan' }, { status: 500 })
  }
}

/* ── POST: Simpan Laporan Harian ───────────────────────── */
export async function POST(request) {
  try {
    const body = await request.json()
    const { userId, supervisor, field } = body
    const date     = body.date     || body.reportDate
    const activity = body.activity || body.content

    if (!userId || !date || !activity) {
      return NextResponse.json({ error: 'Data tidak lengkap (Poin aktivitas wajib diisi)' }, { status: 400 })
    }

    const intern = await prisma.intern.findUnique({ where: { userId } })
    
    if (intern?.periodStart && date < intern.periodStart) {
       return NextResponse.json({ error: `Anda tidak dapat mengisi laporan sebelum tanggal mulai magang (${intern.periodStart})` }, { status: 400 })
    }

    // Check if report for this date already exists for this user
    const existing = await prisma.dailyReport.findFirst({
      where: { userId, date }
    })
    
    const dataObj = {
      userId,
      date,
      activity,
      supervisor: supervisor || '',
      field: field || '',
      internName: intern?.name || 'Unknown',
      nim_nis: intern?.nim_nis || '-',
      status: body.isDraft ? 'DRAFT' : 'TERCATAT',
      mood: body.mood || null,
      challenges: body.challenges || null,
      nextWeek: body.nextWeek || null,
      skills: Array.isArray(body.skills) ? body.skills : []
    }

    let report;
    if (existing) {
      report = await prisma.dailyReport.update({
        where: { id: existing.id },
        data: dataObj
      })
    } else {
      report = await prisma.dailyReport.create({
        data: dataObj
      })
    }
    
    // Log action
    db.addLog(userId, 'SUBMIT_DAILY_REPORT', { date }).catch(()=>{})

    return NextResponse.json({ success: true, report })
  } catch (err) {
    console.error('[POST /api/reports] Error:', err)
    return NextResponse.json({ error: 'Gagal menyimpan laporan' }, { status: 500 })
  }
}

/* ── PUT: Update Laporan (Edit / Status Change) ───────── */
export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, action, statusChange, commentText, reviewerId, reviewerName, isDraft } = body

    if (!id) return NextResponse.json({ error: 'ID laporan wajib ada' }, { status: 400 })

    let existing = await prisma.dailyReport.findUnique({ where: { id } })
    
    // Check Legacy JSON if not in Prisma
    if (!existing) {
       const dbData = await getDB()
       const legacyRep = (dbData.reports || []).find(r => r.id === id)
       if (legacyRep) {
          // Migrate on the fly
          existing = await prisma.dailyReport.create({
            data: {
              id: legacyRep.id, // preserve ID
              userId: legacyRep.userId,
              date: legacyRep.date || legacyRep.reportDate,
              activity: legacyRep.activity || legacyRep.content || '-',
              supervisor: legacyRep.supervisor || '',
              field: legacyRep.field || '',
              internName: legacyRep.internName || 'Unknown',
              nim_nis: legacyRep.nim_nis || '-',
              status: legacyRep.status || 'TERCATAT'
            }
          })
       } else {
          return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 })
       }
    }

    const dataObj = {}
    if (statusChange) dataObj.status = statusChange
    if (commentText !== undefined) dataObj.commentText = commentText
    if (reviewerId) dataObj.reviewerId = reviewerId
    if (reviewerName) dataObj.reviewerName = reviewerName
    
    if (body.activity !== undefined || body.content !== undefined) dataObj.activity = body.activity || body.content
    if (body.supervisor !== undefined) dataObj.supervisor = body.supervisor
    if (body.field !== undefined) dataObj.field = body.field
    if (isDraft !== undefined) dataObj.status = isDraft ? 'DRAFT' : 'TERCATAT'
    if (body.isLiked !== undefined) dataObj.isLiked = body.isLiked
    if (body.mood !== undefined) dataObj.mood = body.mood
    if (body.challenges !== undefined) dataObj.challenges = body.challenges
    if (body.nextWeek !== undefined) dataObj.nextWeek = body.nextWeek
    if (body.skills !== undefined) dataObj.skills = Array.isArray(body.skills) ? body.skills : []

    const report = await prisma.dailyReport.update({
      where: { id },
      data: dataObj
    })
    
    // Log audit activity
    if (!isDraft && !action) {
      db.addLog(report.userId, 'SUBMIT_DAILY_REPORT', { date: report.date }).catch(()=>{})
    }

    return NextResponse.json({ success: true, report })
  } catch (err) {
    console.error('[PUT /api/reports] Error:', err)
    return NextResponse.json({ error: 'Gagal memperbarui laporan' }, { status: 500 })
  }
}

/* ── DELETE: Hapus Laporan (Admin Reject / User Draft) ────── */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID wajib ada' }, { status: 400 })

    // 1. Relational Deletion (Prisma)
    let rep = null
    try {
      rep = await prisma.dailyReport.findUnique({ where: { id } })
      if (rep) {
        await prisma.dailyReport.delete({ where: { id } })
      }
    } catch (e) {
      console.warn('[DELETE /api/reports] Prisma delete skipped (not found or already deleted)')
    }

    // 2. Legacy Sync (JSON Store)
    const data = await getDB()
    const initialLen = (data.reports || []).length
    data.reports = (data.reports || []).filter(r => r.id !== id)
    
    if (data.reports.length !== initialLen) {
      await saveDB(data)
      console.log(`[DELETE /api/reports] Legacy JSON record removed: ${id}`)
    }

    // 3. Log Audit Activity
    if (rep || id) {
      db.addLog(rep?.userId || 'UNKNOWN', 'ADMIN_REJECT_REPORT', { 
        id, 
        date: rep?.date, 
        internName: rep?.internName 
      }).catch(()=>{})
    }

    return NextResponse.json({ success: true, message: 'Laporan berhasil dihapus dari sistem.' })
  } catch (err) {
    console.error('[DELETE /api/reports] Fatal Error:', err)
    return NextResponse.json({ error: 'Gagal menghapus laporan secara sistem' }, { status: 500 })
  }
}

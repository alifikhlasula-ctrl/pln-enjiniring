import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { db } from '@/lib/db'

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
      status: body.isDraft ? 'DRAFT' : 'TERCATAT'
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
    const { id, action, statusChange, commentText, reviewerId, reviewerName } = body

    if (!id) return NextResponse.json({ error: 'ID laporan wajib ada' }, { status: 400 })

    const existing = await prisma.dailyReport.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 })

    const report = await prisma.dailyReport.update({
      where: { id },
      data: {
        ...body,
        status: body.isDraft ? 'DRAFT' : 'TERCATAT'
      }
    })
    
    // Log audit activity
    if (!body.isDraft) {
      db.addLog(report.userId, 'SUBMIT_DAILY_REPORT', { date: report.date }).catch(()=>{})
    }

    return NextResponse.json({ success: true, report })
  } catch (err) {
    console.error('[PUT /api/reports] Error:', err)
    return NextResponse.json({ error: 'Gagal memperbarui laporan' }, { status: 500 })
  }
}

/* ── DELETE: Hapus Laporan (Draft) ───────────────────── */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID wajib ada' }, { status: 400 })

    const rep = await prisma.dailyReport.findUnique({ where: { id } })
    if (!rep) return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 })

    await prisma.dailyReport.delete({ where: { id } })
    
    db.addLog(rep.userId, 'DELETE_DAILY_REPORT', { date: rep.date }).catch(()=>{})
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/reports] Error:', err)
    return NextResponse.json({ error: 'Gagal menghapus laporan' }, { status: 500 })
  }
}

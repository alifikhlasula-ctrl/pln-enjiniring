import { NextResponse } from 'next/server'
import { getDB, saveDB, db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/* ── GET: Ambil Laporan Harian ────────────────────────── */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const internId = searchParams.get('internId') // For HR tracking
    
    const data = await getDB()
    let reports = data.reports || []

    if (userId) {
      reports = reports.filter(r => r.userId === userId)
    } else if (internId) {
      // Find the user ID for this internId
      const intern = (data.interns || []).find(i => i.id === internId)
      if (intern) {
        reports = reports.filter(r => r.userId === intern.userId)
      }
    }

    // Sort by date desc
    reports.sort((a, b) => new Date(b.date) - new Date(a.date))

    // Calculate stats for intern view (simplified)
    let periodStart = null
    const stats = userId ? {
      total: reports.length,
      tercatat: reports.filter(r => r.status === 'TERCATAT').length,
      draft: reports.filter(r => r.status === 'DRAFT').length
    } : {}
    
    if (userId) {
       const internMeta = (data.interns || []).find(i => i.userId === userId)
       periodStart = internMeta?.periodStart || null
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

    const data = await getDB()
    const intern = (data.interns || []).find(i => i.userId === userId)
    
    if (intern?.periodStart && date < intern.periodStart) {
       return NextResponse.json({ error: `Anda tidak dapat mengisi laporan sebelum tanggal mulai magang (${intern.periodStart})` }, { status: 400 })
    }
    
    if (!data.reports) data.reports = []

    // Check if report for this date already exists for this user
    const existingIdx = data.reports.findIndex(r => r.userId === userId && r.date === date)
    
    const newReport = {
      id: existingIdx !== -1 ? data.reports[existingIdx].id : 'rep' + Date.now(),
      userId,
      date,
      activity,
      supervisor: supervisor || '',
      field: field || '',
      internName: intern?.name || 'Unknown',
      nim_nis: intern?.nim_nis || '-',
      status: body.isDraft ? 'DRAFT' : 'TERCATAT',
      updatedAt: new Date().toISOString()
    }

    if (existingIdx !== -1) {
      data.reports[existingIdx] = newReport
    } else {
      newReport.createdAt = new Date().toISOString()
      data.reports.push(newReport)
    }

    await saveDB(data)
    
    // Log action
    await db.addLog(userId, 'SUBMIT_DAILY_REPORT', { date })

    return NextResponse.json({ success: true, report: newReport })
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

    const data = await getDB()
    const idx = (data.reports || []).findIndex(r => r.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 })

    const report = data.reports[idx]

    // Action based logic (Simplified for Intern only)
    Object.assign(report, {
      ...body,
      updatedAt: new Date().toISOString(),
      status: body.isDraft ? 'DRAFT' : 'TERCATAT'
    })

    await saveDB(data)
    
    // Log audit activity
    if (!body.isDraft) {
      await db.addLog(report.userId, 'SUBMIT_DAILY_REPORT', { date: report.date })
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

    const data = await getDB()
    const idx = (data.reports || []).findIndex(r => r.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 })

    const rep = data.reports[idx]
    data.reports.splice(idx, 1)
    await saveDB(data)
    
    await db.addLog(rep.userId, 'DELETE_DAILY_REPORT', { date: rep.date })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/reports] Error:', err)
    return NextResponse.json({ error: 'Gagal menghapus laporan' }, { status: 500 })
  }
}

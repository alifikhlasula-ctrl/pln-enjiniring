import { NextResponse } from 'next/server'
import { getDB, saveDB, db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/* ── GET: paginated, filtered, sorted + stats ─────── */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const page    = parseInt(searchParams.get('page'))  || 1
  const limit   = parseInt(searchParams.get('limit')) || 10
  const search  = searchParams.get('search')?.toLowerCase() || ''
  const status  = searchParams.get('status')  || ''
  const tahun   = searchParams.get('tahun')   || ''
  const jenjang = searchParams.get('jenjang') || ''
  const bidang  = searchParams.get('bidang')?.toLowerCase()  || ''
  const wilayah = searchParams.get('wilayah')?.toLowerCase() || ''
  const sortBy  = searchParams.get('sortBy')  || 'name'
  const sortDir = searchParams.get('sortDir') || 'asc'

  const today = new Date(); today.setHours(0,0,0,0)

  // ── Transform all interns (status automatically calculated in db.getInterns) ──
  const allInterns = await db.getInterns(false)

  // ── Global stats (all interns, pre-filter) ──────
  const in14  = new Date(today.getTime() + 14 * 86400000)
  const stats = {
    total:        allInterns.length,
    active:       allInterns.filter(i => i.status === 'ACTIVE').length,
    completed:    allInterns.filter(i => i.status === 'COMPLETED').length,
    terminated:   allInterns.filter(i => i.status === 'TERMINATED').length,
    expiringSoon: allInterns.filter(i => {
      if (i.status !== 'ACTIVE' || !i.periodEnd) return false
      const e = new Date(i.periodEnd)
      return e >= today && e <= in14
    }).length
  }

  // ── Filter ──────────────────────────────────────
  let filtered = allInterns.filter(i =>
    i.name?.toLowerCase().includes(search) ||
    i.nim_nis?.toLowerCase().includes(search) ||
    i.university?.toLowerCase().includes(search)
  )
  if (status && status !== 'ALL') {
    // Gunakan status virtual (Normalized Uppercase) untuk filtering
    const sFilter = status.toUpperCase()
    filtered = filtered.filter(i => i.status === sFilter)
  }
  if (tahun)   filtered = filtered.filter(i => i.tahun   === tahun)
  if (jenjang) filtered = filtered.filter(i => i.jenjang === jenjang)
  if (bidang)  filtered = filtered.filter(i => i.bidang?.toLowerCase().includes(bidang))
  if (wilayah) filtered = filtered.filter(i => i.wilayah?.toLowerCase().includes(wilayah))

  // ── Sort ────────────────────────────────────────
  filtered.sort((a, b) => {
    const av = String(a[sortBy] || ''), bv = String(b[sortBy] || '')
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  const total      = filtered.length
  const all        = searchParams.get('all') === 'true'
  const startIndex = (page - 1) * limit
  const paginated  = all ? filtered : filtered.slice(startIndex, startIndex + limit)

  return NextResponse.json({
    data:       paginated,
    pagination: { total, page, limit: all ? total : limit, totalPages: all ? 1 : (Math.ceil(total / limit) || 1) },
    stats
  })
}

/* ── POST: single create or batch import ─────────── */
export async function POST(request) {
  try {
    const body = await request.json()

    if (Array.isArray(body)) {
      // ── Batch import (UPSERT) ─────────────────────
      const data    = await getDB()
      const results = { imported: 0, updated: 0, skipped: 0, errors: [], ids: [] }

      for (const item of body) {
        if (!item.name || !item.nim_nis) {
          results.skipped++
          results.errors.push(`Data tidak lengkap (${item.name || '-'})`)
          continue
        }

        // Search for existing intern by nim_nis (UPSERT CHECK)
        const nNis = String(item.nim_nis).trim()
        const existing = data.interns.find(i => i.nim_nis === nNis && !i.deletedAt)

        if (existing) {
          // UPDATE EXISTING
          const uIdx = data.users.findIndex(u => u.id === existing.userId)
          if (uIdx !== -1) {
            data.users[uIdx].name = String(item.name || data.users[uIdx].name).trim()
            data.users[uIdx].email = item.email || data.users[uIdx].email
          }
          
          existing.name = String(item.name || existing.name).trim()
          existing.gender = item.gender || existing.gender
          existing.university = String(item.university || existing.university).trim()
          existing.jenjang = item.jenjang || existing.jenjang
          existing.major = String(item.major || existing.major).trim()
          existing.bidang = String(item.bidang || existing.bidang).trim()
          existing.wilayah = String(item.wilayah || existing.wilayah).trim()
          existing.tahun = String(item.tahun || existing.tahun).trim()
          existing.periodStart = item.periodStart || existing.periodStart
          existing.periodEnd = item.periodEnd || existing.periodEnd
          existing.duration = item.duration || existing.duration
          
          results.ids.push(existing.id)
          results.updated++
        } else {
          // CREATE NEW
          const ts = Date.now() + results.imported + results.updated
          const nu = { id: 'u' + ts, email: item.email || `intern${ts}@hris.com`, password: 'password123', name: item.name, role: 'INTERN' }
          const ni = {
            id: 'i' + ts, userId: nu.id,
            name: String(item.name || '').trim(),
            nim_nis: nNis,
            gender: item.gender || 'Laki-laki',
            university: String(item.university || '').trim(),
            jenjang: item.jenjang || 'S1',
            major: String(item.major || '').trim(),
            status: item.status || 'ACTIVE',
            bidang: String(item.bidang || '').trim(),
            wilayah: String(item.wilayah || '').trim(),
            tahun: String(item.tahun || new Date().getFullYear()),
            periodStart: item.periodStart || '', periodEnd: item.periodEnd || '',
            duration: item.duration || '',
            fromImport: 'EXCEL_BATCH', deletedAt: null
          }
          data.users.push(nu)
          data.interns.push(ni)
          results.ids.push(ni.id)
          results.imported++
        }
      }
      await saveDB(data)
      await db.addLog('u1', 'BATCH_UPSERT_INTERNS', { 
        total: body.length, 
        imported: results.imported, 
        updated: results.updated, 
        skipped: results.skipped,
        summary: `Admin HR meng-handle ${body.length} data via Excel (${results.imported} baru & ${results.updated} diperbarui)`
      })
      return NextResponse.json({ success: true, ...results })
    }

    // ── Single create ─────────────────────────────
    const data = await getDB()
    const ts = Date.now()
    const nu = { id: 'u' + ts, email: body.email || `intern${ts}@hris.com`, password: 'password123', name: body.name, role: 'INTERN' }
    const ni = { id: 'i' + ts, userId: nu.id, ...body, status: body.status || 'ACTIVE', deletedAt: null }
    data.users.push(nu); data.interns.push(ni)
    await saveDB(data)
    await db.addLog('u1', 'CREATE_INTERN', { id: ni.id, name: ni.name })
    return NextResponse.json(ni)

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/* ── PUT: single update ───────────────────────────── */
export async function PUT(request) {
  const body  = await request.json()
  const data  = await getDB()
  const index = data.interns.findIndex(i => i.id === body.id)
  if (index === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const old = { ...data.interns[index] }

  // Merge body over existing, but do NOT allow empty strings to wipe existing date/period values
  const safeMerge = (existing, incoming) => {
    const result = { ...existing, ...incoming }
    const protectedDateFields = ['periodStart', 'periodEnd', 'duration', 'tanggalSPK', 'tanggalSuratPenerimaan', 'tanggalSuratSelesai', 'tanggalAmandemen']
    for (const f of protectedDateFields) {
      if (existing[f] && (!incoming[f] || incoming[f] === '')) {
        result[f] = existing[f] // Keep old value if new is blank
      }
    }
    return result
  }

  data.interns[index] = safeMerge(data.interns[index], body)

  // Recalculate duration if both dates present
  const s = data.interns[index].periodStart, e = data.interns[index].periodEnd
  if (s && e) {
    const a = new Date(s), b = new Date(e)
    if (!isNaN(a) && !isNaN(b) && b > a) {
      const days = Math.ceil(Math.abs(b - a) / 86400000)
      const m = Math.floor(days / 30), r = days % 30
      data.interns[index].duration = `${m > 0 ? m + ' Bulan ' : ''}${r > 0 ? r + ' Hari' : ''}`
    }
  }

  // Sync name to user account if it changed
  if (body.name && data.interns[index].userId) {
    const uIdx = data.users.findIndex(u => u.id === data.interns[index].userId)
    if (uIdx !== -1) {
      data.users[uIdx].name = body.name
      if (body.email) data.users[uIdx].email = body.email
    }
  }

  await saveDB(data)
  await db.addLog('u1', 'UPDATE_INTERN', { id: body.id, changes: Object.keys(body).filter(k => body[k] !== old[k]) })
  return NextResponse.json(data.interns[index])
}

/* ── PATCH: bulk status update ────────────────────── */
export async function PATCH(request) {
  try {
    const { ids, status } = await request.json()
    if (!ids?.length || !status) return NextResponse.json({ error: 'ids dan status diperlukan' }, { status: 400 })
    const data = await getDB()
    let updated = 0
    for (const id of ids) {
      const idx = data.interns.findIndex(i => i.id === id)
      if (idx !== -1) { data.interns[idx].status = status; updated++ }
    }
    await saveDB(data)
    await db.addLog('u1', 'BULK_STATUS_UPDATE', { ids, status, updated })
    return NextResponse.json({ success: true, updated })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/* ── DELETE: soft delete ──────────────────────────── */
export async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const id   = searchParams.get('id')
  const data = await getDB()
  const idx  = data.interns.findIndex(i => i.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  data.interns[idx].deletedAt = new Date().toISOString()
  await saveDB(data)
  await db.addLog('u1', 'SOFT_DELETE_INTERN', { id, name: data.interns[idx].name })
  return NextResponse.json({ success: true })
}

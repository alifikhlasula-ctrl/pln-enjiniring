import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDB, saveDB, db } from '@/lib/db'
import { withCache } from '@/lib/cache-headers'

export const dynamic = 'force-dynamic'
// No force-dynamic: allow SHORT cache (15s) for GET listing

/* ── GET: paginated, filtered, sorted + stats ─────── */
export async function GET(request) {
  try {
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
    const view    = searchParams.get('view')    || 'active' // active | archive

    const today = new Date(); today.setHours(0,0,0,0)

    // ── Parallel Execution: Fetch from both sources simultaneously ──
    const [relationalInterns, data] = await Promise.all([
      prisma.intern.findMany({ where: { deletedAt: null } }),
      getDB('ACTIVE', { clone: false })
    ])

    const legacyInterns = (data.interns || []).filter(i => !i.deletedAt)

    // ── Merge and Deduplicate by ID ──
    const idMap = new Map();
    [...relationalInterns, ...legacyInterns].forEach(i => {
        if (!idMap.has(i.id)) idMap.set(i.id, i)
    })
    
    // ── PRE-FILTER: Program Separation (2026 vs History) ──
    const rawList = Array.from(idMap.values())
    let programFiltered = []

    if (view === 'archive') {
      // Archive mode: EXCLUDE 2026
      programFiltered = rawList.filter(i => i.tahun !== '2026')
    } else {
      // Active mode (default): ONLY 2026
      programFiltered = rawList.filter(i => i.tahun === '2026')
    }

    const allInterns = programFiltered.map(i => ({
        ...i,
        status: db.getEffectiveStatus(i) // Calculate virtual status (COMPLETED etc)
    }))

    // ── Global stats ──────
    const stats = {
      total:        allInterns.length,
      active:       allInterns.filter(i => i.status === 'ACTIVE').length,
      completed:    allInterns.filter(i => i.status === 'COMPLETED').length,
      terminated:   allInterns.filter(i => i.status === 'TERMINATED').length,
      expiringSoon: 0 // Will calc later if needed
    }

    // ── Filter ──────────────────────────────────────
    let filtered = allInterns.filter(i =>
      i.name?.toLowerCase().includes(search) ||
      i.nim_nis?.toLowerCase().includes(search) ||
      i.university?.toLowerCase().includes(search)
    )
    if (status && status !== 'ALL') {
      const sFilter = status.toUpperCase()
      filtered = filtered.filter(i => i.status === sFilter)
    }
    if (tahun)   filtered = filtered.filter(i => i.tahun === tahun)
    if (jenjang) filtered = filtered.filter(i => i.jenjang === jenjang)
    if (bidang)  filtered = filtered.filter(i => i.bidang?.toLowerCase().includes(bidang))
    if (wilayah) filtered = filtered.filter(i => i.wilayah?.toLowerCase().includes(wilayah))

    // ── Sort ────────────────────────────────────────
    filtered.sort((a, b) => {
      const av = String(a[sortBy] || ''), bv = String(b[sortBy] || '')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })

    const total      = filtered.length
    const allPar     = searchParams.get('all') === 'true'
    const startIndex = (page - 1) * limit
    const paginated  = allPar ? filtered : filtered.slice(startIndex, startIndex + limit)

    return withCache(
      NextResponse.json({
        data:       paginated,
        pagination: { total, page, limit: allPar ? total : limit, totalPages: allPar ? 1 : (Math.ceil(total / limit) || 1) },
        stats
      }),
      'SHORT'  // 15s cache — intern list changes infrequently; safe to serve slightly stale
    )
  } catch (err) {
      console.error('[GET /api/interns] Error:', err)
      return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/* ── POST: single create or batch import ─────────── */
export async function POST(request) {
  try {
    const body = await request.json()

    if (Array.isArray(body)) {
      // ── Batch import (UPSERT into Prisma) ─────────
      const results = { imported: 0, updated: 0, skipped: 0, errors: [], ids: [] }

      for (const item of body) {
        if (!item.name || !item.nim_nis) {
          results.skipped++
          results.errors.push(`Data tidak lengkap (${item.name || '-'})`)
          continue
        }

        const nNis = String(item.nim_nis).trim()
        
        // Cek apakah intern sudah ada di Prisma (by nim_nis)
        const existing = await prisma.intern.findFirst({
          where: { nim_nis: nNis, deletedAt: null }
        })

        if (existing) {
          // UPDATE EXISTING
          await prisma.$transaction([
            prisma.user.update({
              where: { id: existing.userId },
              data: {
                name: String(item.name || existing.name).trim(),
                ...(item.email && { email: item.email })
              }
            }),
            prisma.intern.update({
              where: { id: existing.id },
              data: {
                name: String(item.name || existing.name).trim(),
                gender: item.gender || existing.gender,
                university: String(item.university || existing.university).trim(),
                jenjang: item.jenjang || existing.jenjang,
                major: String(item.major || existing.major).trim(),
                bidang: String(item.bidang || existing.bidang).trim(),
                wilayah: String(item.wilayah || existing.wilayah).trim(),
                tahun: String(item.tahun || existing.tahun).trim(),
                periodStart: item.periodStart || existing.periodStart,
                periodEnd: item.periodEnd || existing.periodEnd,
                duration: item.duration || existing.duration
              }
            })
          ])
          results.ids.push(existing.id)
          results.updated++
        } else {
          // CREATE NEW in Prisma
          const ts = Date.now() + results.imported + results.updated
          const userId = 'u' + ts
          const internId = 'i' + ts
          
          await prisma.$transaction([
            prisma.user.create({
              data: {
                id: userId,
                email: item.email || `intern${ts}@hris.com`,
                password: 'password123',
                name: String(item.name).trim(),
                role: 'INTERN'
              }
            }),
            prisma.intern.create({
              data: {
                id: internId,
                userId: userId,
                name: String(item.name).trim(),
                nim_nis: nNis,
                gender: item.gender || 'Laki-laki',
                university: String(item.university || '').trim(),
                jenjang: item.jenjang || 'S1',
                major: String(item.major || '').trim(),
                status: item.status || 'ACTIVE',
                bidang: String(item.bidang || '').trim(),
                wilayah: String(item.wilayah || '').trim(),
                tahun: String(item.tahun || new Date().getFullYear()),
                periodStart: item.periodStart || '',
                periodEnd: item.periodEnd || '',
                duration: item.duration || '',
                fromImport: 'EXCEL_BATCH',
                deletedAt: null
              }
            })
          ])
          results.ids.push(internId)
          results.imported++
        }
      }

      await db.addLog('u1', 'BATCH_UPSERT_INTERNS_PRISMA', { 
        total: body.length, imported: results.imported, updated: results.updated 
      })
      return NextResponse.json({ success: true, ...results })
    }

    // ── Single create (in Prisma) ───────────────────
    const ts = Date.now()
    const userId = 'u' + ts
    const internId = 'i' + ts

    const [user, intern] = await prisma.$transaction([
      prisma.user.create({
        data: {
          id: userId,
          email: body.email || `intern${ts}@hris.com`,
          password: 'password123',
          name: body.name,
          role: 'INTERN'
        }
      }),
      prisma.intern.create({
        data: {
          id: internId,
          userId: userId,
          ...body,
          status: body.status || 'ACTIVE',
          deletedAt: null
        }
      })
    ])

    await db.addLog('u1', 'CREATE_INTERN_PRISMA', { id: internId, name: intern.name })
    return NextResponse.json(intern)

  } catch (err) {
    console.error('[POST /api/interns] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/* ── PUT: single update ───────────────────────────── */
export async function PUT(request) {
  try {
    const body = await request.json()
    if (!body.id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })

    // ── Pre-process: Logic Penggabungan Data (Safe Merge) ─────
    const safeMerge = (existing, incoming) => {
      const result = { ...existing, ...incoming }
      const protectedDateFields = ['periodStart', 'periodEnd', 'duration', 'tanggalSPK', 'tanggalSuratPenerimaan', 'tanggalSuratSelesai', 'tanggalAmandemen']
      for (const f of protectedDateFields) {
        if (existing[f] && (!incoming[f] || incoming[f] === '')) {
          result[f] = existing[f] // Pertahankan nilai lama jika baru kosong (proteksi date)
        }
      }
      return result
    }

    // ── LAYER 1: Relational PostgreSQL (Primary) ─────────────
    const relationalIntern = await prisma.intern.findUnique({ where: { id: body.id } })
    
    if (relationalIntern) {
      const updatedData = safeMerge(relationalIntern, body)
      
      // Hitung ulang durasi jika tanggal berubah
      if (updatedData.periodStart && updatedData.periodEnd) {
        const a = new Date(updatedData.periodStart), b = new Date(updatedData.periodEnd)
        if (!isNaN(a) && !isNaN(b) && b > a) {
          const days = Math.ceil(Math.abs(b - a) / 86400000)
          const m = Math.floor(days / 30), r = days % 30
          updatedData.duration = `${m > 0 ? m + ' Bulan ' : ''}${r > 0 ? r + ' Hari' : ''}`
        }
      }

      // Update intern via Prisma
      const updatedIntern = await prisma.intern.update({
        where: { id: body.id },
        data: updatedData
      })

      // Sync ke User account jika ada perubahan nama/email
      if (updatedIntern.userId && (body.name || body.email)) {
        await prisma.user.update({
          where: { id: updatedIntern.userId },
          data: {
            ...(body.name && { name: body.name }),
            ...(body.email && { email: body.email })
          }
        }).catch(err => console.error('[PUT Sync User] Error:', err))
      }

      await db.addLog('u1', 'UPDATE_INTERN_RELATIONAL', { id: body.id, changes: Object.keys(body) })
      return NextResponse.json(updatedIntern)
    }

    // ── LAYER 2: Legacy JSON Store (Fallback) ───────────────
    const data  = await getDB()
    const index = data.interns.findIndex(i => i.id === body.id)
    if (index === -1) return NextResponse.json({ error: 'Data tidak ditemukan di sistem manapun' }, { status: 404 })

    const old = { ...data.interns[index] }
    data.interns[index] = safeMerge(data.interns[index], body)

    if (data.interns[index].periodStart && data.interns[index].periodEnd) {
      const a = new Date(data.interns[index].periodStart), b = new Date(data.interns[index].periodEnd)
      if (!isNaN(a) && !isNaN(b) && b > a) {
        const days = Math.ceil(Math.abs(b - a) / 86400000)
        const m = Math.floor(days / 30), r = days % 30
        data.interns[index].duration = `${m > 0 ? m + ' Bulan ' : ''}${r > 0 ? r + ' Hari' : ''}`
      }
    }

    if (body.name && data.interns[index].userId) {
      const uIdx = data.users.findIndex(u => u.id === data.interns[index].userId)
      if (uIdx !== -1) {
        data.users[uIdx].name = body.name
        if (body.email) data.users[uIdx].email = body.email
      }
    }

    await saveDB(data)
    await db.addLog('u1', 'UPDATE_INTERN_LEGACY', { id: body.id, changes: Object.keys(body).filter(k => body[k] !== old[k]) })
    return NextResponse.json(data.interns[index])

  } catch (err) {
    console.error('[PUT /api/interns] ERROR:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/* ── PATCH: bulk status update ────────────────────── */
export async function PATCH(request) {
  try {
    const { ids, status } = await request.json()
    if (!ids?.length || !status) return NextResponse.json({ error: 'ids dan status diperlukan' }, { status: 400 })
    
    // ── LAYER 1: Prisma ────────────────────────────
    const prismaUpdate = await prisma.intern.updateMany({
      where: { id: { in: ids } },
      data: { status }
    })

    // ── LAYER 2: Legacy JSON ───────────────────────
    const data = await getDB()
    let legacyUpdated = 0
    for (const id of ids) {
      const idx = data.interns.findIndex(i => i.id === id)
      if (idx !== -1) { 
        data.interns[idx].status = status
        legacyUpdated++ 
      }
    }
    if (legacyUpdated > 0) await saveDB(data)

    await db.addLog('u1', 'BULK_STATUS_UPDATE_DUAL', { ids, status, prismaCount: prismaUpdate.count, legacyCount: legacyUpdated })
    return NextResponse.json({ success: true, updated: prismaUpdate.count + legacyUpdated })
  } catch (err) {
    console.error('[PATCH /api/interns] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/* ── DELETE: soft delete ──────────────────────────── */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })

    const delTs = new Date().toISOString()

    // ── LAYER 1: Prisma ────────────────────────────
    const inPrisma = await prisma.intern.findUnique({ where: { id } })
    if (inPrisma) {
      await prisma.intern.update({
        where: { id },
        data: { deletedAt: delTs }
      })
    }

    // ── LAYER 2: Legacy JSON ───────────────────────
    const data = await getDB()
    const idx = data.interns.findIndex(i => i.id === id)
    if (idx !== -1) {
      data.interns[idx].deletedAt = delTs
      await saveDB(data)
    }

    if (!inPrisma && idx === -1) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
    }

    await db.addLog('u1', 'SOFT_DELETE_INTERN_DUAL', { id, timestamp: delTs })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/interns] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

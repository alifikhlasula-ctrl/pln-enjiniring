import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getDB, saveDB, db } from '@/lib/db'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/* ── Column definitions per import type ───────────── */
const SCHEMA = {
  INTERNS: {
    cols: ['Nama','Email','Telepon','Instansi','Jurusan','Jenjang','Bidang','Wilayah','Tahun','Tanggal Mulai','Tanggal Selesai','NIM/NIS','Gender'],
    required: ['Nama','Instansi','Jurusan'],
    sample: [
      ['Budi Santoso','budi@kampus.ac.id','+62812345678','Universitas Indonesia','Teknik Informatika','S1','IT Development','Jakarta Selatan','2026','2026-01-01','2026-06-30','TI001','Laki-laki'],
      ['Sari Dewi','sari@kampus.ac.id','+62898765432','BINUS University','Sistem Informasi','S1','Data Analytics','Jakarta Barat','2026','2026-02-01','2026-07-31','SI002','Perempuan'],
    ]
  },
  ATTENDANCE: {
    cols: ['Nama Intern','Tanggal','Status','Jam Masuk','Jam Keluar','Keterangan'],
    required: ['Nama Intern','Tanggal','Status'],
    sample: [
      ['Alice Intern','2026-03-27','PRESENT','08:00','17:00',''],
      ['Alice Intern','2026-03-28','LATE','09:15','17:00','Macet'],
      ['Alice Intern','2026-03-29','ABSENT','','','Sakit'],
    ]
  },
  PAYROLL: {
    cols: ['Nama Intern','Bulan','Tahun','Hari Hadir','Tarif Harian','Bonus','Potongan','Keterangan'],
    required: ['Nama Intern','Bulan','Tahun'],
    sample: [
      ['Alice Intern','3','2026','22','80000','0','0',''],
      ['Budi Santoso','3','2026','20','80000','100000','0','Insentif kinerja'],
    ]
  }
}

/* ── Parse & validate a single row ────────────────── */
function parseRow(type, rawRow, rowIndex, data) {
  const schema = SCHEMA[type]
  const row    = {}
  const errors = []

  // Map column header → value with Export file fallback support
  schema.cols.forEach((col, i) => {
    let val = rawRow[col]
    if (val === undefined && type === 'INTERNS') {
      const EXPORT_MAP = {
        'Nama': 'Nama Lengkap',
        'Telepon': 'No. Handphone',
        'Gender': 'Jenis Kelamin',
        'Tanggal Mulai': 'Mulai',
        'Tanggal Selesai': 'Selesai'
      }
      if (EXPORT_MAP[col] && rawRow[EXPORT_MAP[col]] !== undefined) {
        val = rawRow[EXPORT_MAP[col]]
      }
    }
    row[col] = val !== undefined ? String(val).trim() : ''
  })

  // Required field validation
  schema.required.forEach(col => {
    if (!row[col]) errors.push(`"${col}" wajib diisi`)
  })

  // Type-specific validation & normalization
  if (type === 'INTERNS') {
    const JENJANG = ['S1','D3','D4','S2','SMK/SMA','SMP']
    if (row['Jenjang'] && !JENJANG.includes(row['Jenjang'])) {
      row['Jenjang'] = 'S1' // default
    }
    if (row['Tanggal Mulai'] && isNaN(Date.parse(row['Tanggal Mulai'])))  errors.push('"Tanggal Mulai" format tidak valid (YYYY-MM-DD)')
    if (row['Tanggal Selesai'] && isNaN(Date.parse(row['Tanggal Selesai']))) errors.push('"Tanggal Selesai" format tidak valid (YYYY-MM-DD)')

    // Match check by NIM/NIS or Email (Upsert detection)
    const existing = (data.interns || []).find(i => !i.deletedAt && (
      (row['NIM/NIS'] && i.nim_nis === row['NIM/NIS']) ||
      (row['Email'] && i.email === row['Email'])
    ))
    if (existing) {
      row._isUpdate = true
      row._existingId = existing.id
      row._existingUserId = existing.userId
    }
  }

  if (type === 'ATTENDANCE') {
    const VALID_STATUS = ['PRESENT','ABSENT','LATE','HALF_DAY','HOLIDAY','PERMISSION']
    if (row['Status'] && !VALID_STATUS.includes(row['Status'].toUpperCase())) {
      errors.push(`"Status" harus: ${VALID_STATUS.join(', ')}`)
    } else row['Status'] = row['Status'].toUpperCase()
    if (row['Tanggal'] && isNaN(Date.parse(row['Tanggal']))) errors.push('"Tanggal" format tidak valid (YYYY-MM-DD)')

    // Find intern by name
    const intern = (data.interns || []).find(i => !i.deletedAt && i.name.toLowerCase() === (row['Nama Intern']||'').toLowerCase())
    if (!intern) errors.push(`Intern "${row['Nama Intern']}" tidak ditemukan di sistem`)
    else row._internId = intern.id
  }

  if (type === 'PAYROLL') {
    if (isNaN(parseInt(row['Bulan'])) || parseInt(row['Bulan']) < 1 || parseInt(row['Bulan']) > 12) errors.push('"Bulan" harus angka 1-12')
    if (isNaN(parseInt(row['Tahun']))) errors.push('"Tahun" harus angka')
    const intern = (data.interns || []).find(i => !i.deletedAt && i.name.toLowerCase() === (row['Nama Intern']||'').toLowerCase())
    if (!intern) errors.push(`Intern "${row['Nama Intern']}" tidak ditemukan di sistem`)
    else row._internId = intern.id
  }

  return { row, rowIndex, errors, valid: errors.length === 0 }
}

/* ── POST: Parse Excel → preview (no save) ─────────── */
export async function POST(request) {
  try {
    const formData = await request.formData()
    const file     = formData.get('file')
    const type     = (formData.get('type') || 'INTERNS').toUpperCase()

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File Excel wajib diunggah.' }, { status: 400 })
    }
    if (!SCHEMA[type]) {
      return NextResponse.json({ error: `Tipe import tidak valid: ${type}` }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran file maks 10MB.' }, { status: 400 })
    }

    const bytes    = await file.arrayBuffer()
    const buffer   = Buffer.from(bytes)
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheet    = workbook.Sheets[workbook.SheetNames[0]]
    const rawRows  = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'File Excel kosong atau tidak ada data.' }, { status: 400 })
    }
    if (rawRows.length > 500) {
      return NextResponse.json({ error: 'Maksimal 500 baris per import.' }, { status: 400 })
    }

    const data    = await getDB()
    const results = rawRows.map((rawRow, i) => parseRow(type, rawRow, i + 2, data))
    const valid   = results.filter(r => r.valid).length
    const invalid = results.filter(r => !r.valid).length

    return NextResponse.json({
      success: true, type,
      totalRows: rawRows.length, valid, invalid,
      preview: results.slice(0, 10), // first 10 rows for preview
      allResults: results            // full for save step
    })

  } catch (err) {
    console.error('[EXCEL_IMPORT] Parse error:', err)
    return NextResponse.json({ error: 'Gagal membaca file Excel: ' + err.message }, { status: 500 })
  }
}

/* ── PUT: Save validated rows to DB ────────────────── */
export async function PUT(request) {
  try {
    const { type, rows } = await request.json()
    if (!SCHEMA[type] || !Array.isArray(rows)) {
      return NextResponse.json({ error: 'Payload tidak valid' }, { status: 400 })
    }

    const data    = await getDB()
    const ts      = Date.now()
    let   created = 0
    const errors  = []

    if (type === 'INTERNS') {
      let updated = 0
      for (const { row } of rows) {
        const calcDur = (s, e) => {
          const a=new Date(s),b=new Date(e); if(isNaN(a)||isNaN(b)||b<a) return ''
          const d=Math.ceil(Math.abs(b-a)/86400000),m=Math.floor(d/30),r=d%30
          return `${m>0?m+' Bulan ':''}${r>0?r+' Hari':''}`
        }

        // ── 1. Update Legacy JSON ──
        const existing = data.interns.find(i => !i.deletedAt && (
          (row['NIM/NIS'] && i.nim_nis === row['NIM/NIS']) ||
          (row['Email'] && i.email === row['Email'])
        ))

        let legacyId = null
        let legacyUserId = null

        if (existing) {
          legacyId = existing.id
          legacyUserId = existing.userId
          const uIdx = data.users.findIndex(u => u.id === existing.userId)
          if (uIdx !== -1) {
            data.users[uIdx].name = row['Nama'] || data.users[uIdx].name
            data.users[uIdx].email = row['Email'] || data.users[uIdx].email
          }
          existing.name = row['Nama'] || existing.name
          existing.email = row['Email'] || existing.email
          existing.nim_nis = row['NIM/NIS'] || existing.nim_nis
          existing.gender = row['Gender'] || existing.gender
          existing.university = row['Instansi'] || existing.university
          existing.major = row['Jurusan'] || existing.major
          existing.jenjang = row['Jenjang'] || existing.jenjang
          existing.bidang = row['Bidang'] || existing.bidang
          existing.wilayah = row['Wilayah'] || existing.wilayah
          existing.tahun = row['Tahun'] || existing.tahun
          existing.periodStart = row['Tanggal Mulai'] || existing.periodStart
          existing.periodEnd = row['Tanggal Selesai'] || existing.periodEnd
          existing.duration = calcDur(existing.periodStart, existing.periodEnd)
          updated++
        } else {
          const ts2    = Date.now() + created + updated
          legacyUserId = 'u' + ts2
          legacyId = 'i' + ts2
          const newUser = {
            id: legacyUserId, email: row['Email'] || `intern${ts2}@hris.com`,
            password: 'password123', name: row['Nama'], role: 'INTERN'
          }
          const newIntern = {
            id: legacyId, userId: legacyUserId, email: row['Email'] || '',
            name: row['Nama'] || '', nim_nis: row['NIM/NIS'] || ('EXC'+ts2.toString().slice(-6)),
            gender: row['Gender'] || 'Laki-laki', university: row['Instansi'] || '',
            jenjang: row['Jenjang'] || 'S1', major: row['Jurusan'] || '',
            status: 'ACTIVE', bidang: row['Bidang'] || '', wilayah: row['Wilayah'] || '',
            tahun: row['Tahun'] || String(new Date().getFullYear()),
            periodStart: row['Tanggal Mulai'] || '', periodEnd: row['Tanggal Selesai'] || '',
            duration: calcDur(row['Tanggal Mulai'], row['Tanggal Selesai']),
            suratPenerimaan:'',tanggalSuratPenerimaan:'',spk:'',tanggalSPK:'',
            amandemen:'',tanggalAmandemen:'',suratSelesai:'',tanggalSuratSelesai:'',
            fromImport: 'EXCEL', deletedAt: null
          }
          data.users.push(newUser)
          data.interns.push(newIntern)
          created++
        }

        // ── 2. Update Prisma ──
        const nNis = (row['NIM/NIS'] || '').trim()
        const email = (row['Email'] || '').trim()
        
        let prismaExisting = null
        if (nNis) prismaExisting = await prisma.intern.findFirst({ where: { nim_nis: nNis, deletedAt: null } })
        
        if (prismaExisting) {
          // UPDATE Prisma
          await prisma.$transaction([
            prisma.user.update({
              where: { id: prismaExisting.userId },
              data: {
                name: row['Nama'] || prismaExisting.name,
                ...(email && { email })
              }
            }).catch(() => null),
            prisma.intern.update({
              where: { id: prismaExisting.id },
              data: {
                name: row['Nama'] || prismaExisting.name,
                gender: row['Gender'] || prismaExisting.gender,
                university: row['Instansi'] || prismaExisting.university,
                jenjang: row['Jenjang'] || prismaExisting.jenjang,
                major: row['Jurusan'] || prismaExisting.major,
                bidang: row['Bidang'] || prismaExisting.bidang,
                wilayah: row['Wilayah'] || prismaExisting.wilayah,
                tahun: row['Tahun'] || prismaExisting.tahun,
                periodStart: row['Tanggal Mulai'] || prismaExisting.periodStart,
                periodEnd: row['Tanggal Selesai'] || prismaExisting.periodEnd,
                duration: calcDur(row['Tanggal Mulai'], row['Tanggal Selesai'])
              }
            })
          ])
        } else {
          // CREATE Prisma (gunakan ID yang sama dengan legacy jika baru, agar sinkron)
          await prisma.$transaction([
            prisma.user.create({
              data: {
                id: legacyUserId,
                email: email || `intern${legacyUserId}@hris.com`,
                password: 'password123',
                name: row['Nama'],
                role: 'INTERN'
              }
            }),
            prisma.intern.create({
              data: {
                id: legacyId,
                userId: legacyUserId,
                name: row['Nama'] || '',
                nim_nis: nNis || ('EXC'+legacyId),
                gender: row['Gender'] || 'Laki-laki',
                university: row['Instansi'] || '',
                jenjang: row['Jenjang'] || 'S1',
                major: row['Jurusan'] || '',
                status: 'ACTIVE',
                bidang: row['Bidang'] || '',
                wilayah: row['Wilayah'] || '',
                tahun: row['Tahun'] || String(new Date().getFullYear()),
                periodStart: row['Tanggal Mulai'] || '',
                periodEnd: row['Tanggal Selesai'] || '',
                duration: calcDur(row['Tanggal Mulai'], row['Tanggal Selesai']),
                fromImport: 'EXCEL',
                deletedAt: null
              }
            })
          ])
        }
      }
      // Overwrite the created count locally or handle differently if needed
      // We will adjust the return to include updated count
      const finalRes = { success: true, created, updated, errors }
      await saveDB(data)
      await db.addLog('u1', 'EXCEL_IMPORT', { type, created, updated, ts: new Date().toISOString() })
      
      // Update history
      const histData = await getDB()
      if (!histData.importHistory) histData.importHistory = []
      histData.importHistory.unshift({
        id: 'imp' + ts, type, created, updated, errors: errors.length,
        importedAt: new Date().toISOString(), importedBy: 'Admin HR'
      })
      if (histData.importHistory.length > 50) histData.importHistory = histData.importHistory.slice(0, 50)
      await saveDB(histData)
      
      return NextResponse.json(finalRes)
    }

    if (type === 'ATTENDANCE') {
      for (const { row } of rows) {
        data.attendances = data.attendances || []
        data.attendances.push({
          id: 'att' + (Date.now() + created),
          internId: row._internId, date: row['Tanggal'],
          status: row['Status'], checkIn: row['Jam Masuk'] || '',
          checkOut: row['Jam Keluar'] || '', notes: row['Keterangan'] || ''
        })
        created++
      }
    }

    if (type === 'PAYROLL') {
      data.payrolls = data.payrolls || []
      for (const { row } of rows) {
        const hari   = parseInt(row['Hari Hadir']) || 0
        const tarif  = parseInt(row['Tarif Harian']) || 0
        const bonus  = parseInt(row['Bonus']) || 0
        const pot    = parseInt(row['Potongan']) || 0
        data.payrolls.push({
          id: 'pay' + (Date.now() + created),
          internId: row._internId, bulan: parseInt(row['Bulan']),
          tahun: parseInt(row['Tahun']), hariHadir: hari,
          tarifHarian: tarif, bonus, potongan: pot,
          total: (hari * tarif) + bonus - pot,
          status: 'PENDING', notes: row['Keterangan'] || '',
          createdAt: new Date().toISOString()
        })
        created++
      }
    }

    await saveDB(data)
    await db.addLog('u1', 'EXCEL_IMPORT', { type, created, ts: new Date().toISOString() })

    // Persist import history
    const histData = await getDB()
    if (!histData.importHistory) histData.importHistory = []
    histData.importHistory.unshift({
      id: 'imp' + ts, type, created, errors: errors.length,
      importedAt: new Date().toISOString(), importedBy: 'Admin HR'
    })
    if (histData.importHistory.length > 50) histData.importHistory = histData.importHistory.slice(0, 50)
    await saveDB(histData)

    return NextResponse.json({ success: true, created, errors })

  } catch (err) {
    console.error('[EXCEL_IMPORT] Save error:', err)
    return NextResponse.json({ error: 'Gagal menyimpan data: ' + err.message }, { status: 500 })
  }
}

/* ── GET: Download template + Import history ────────── */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'history') {
    const data = await getDB()
    return NextResponse.json(data.importHistory || [])
  }

  if (action === 'template') {
    const type   = (searchParams.get('type') || 'INTERNS').toUpperCase()
    const schema = SCHEMA[type]
    if (!schema) return NextResponse.json({ error: 'Tipe tidak valid' }, { status: 400 })

    const wb  = XLSX.utils.book_new()
    const ws  = XLSX.utils.aoa_to_sheet([schema.cols, ...schema.sample])

    // Style header row
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1')
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = XLSX.utils.encode_cell({ r: 0, c })
      if (!ws[cell]) ws[cell] = {}
      ws[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: '4F46E5' } }, fontColor: { rgb: 'FFFFFF' } }
    }
    ws['!cols'] = schema.cols.map(() => ({ wch: 20 }))

    // Add instruction sheet
    const instrWs = XLSX.utils.aoa_to_sheet([
      ['PANDUAN IMPORT EXCEL - ' + type],
      [''],
      ['Kolom Wajib:', schema.required.join(', ')],
      ['Format Tanggal:', 'YYYY-MM-DD (contoh: 2026-03-27)'],
      ...(type === 'ATTENDANCE' ? [['Status Valid:', 'PRESENT, ABSENT, LATE, HALF_DAY, HOLIDAY, PERMISSION']] : []),
      ...(type === 'INTERNS' ? [['Jenjang Valid:', 'S1, D3, D4, S2, SMK/SMA, SMP']] : []),
      ['Maks Baris:', '500 per file'],
      ['Maks Ukuran:', '10MB'],
    ])
    instrWs['!cols'] = [{ wch: 20 }, { wch: 60 }]

    XLSX.utils.book_append_sheet(wb, ws, 'Data')
    XLSX.utils.book_append_sheet(wb, instrWs, 'Panduan')

    const buf  = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const safeName = `Template_Import_${type}.xlsx`
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Cache-Control': 'no-store, max-age=0',
      }
    })
  }

  return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 })
}

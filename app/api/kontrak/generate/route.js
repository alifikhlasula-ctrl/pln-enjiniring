import { NextResponse } from 'next/server'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import fs from 'fs'
import path from 'path'
import CloudConvert from 'cloudconvert'
import { parseTanggal, formatJangkaWaktu } from '@/lib/kontrakUtils'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY)

export async function POST(req) {
  try {
    const { intern, nomorSurat } = await req.json()

    if (!intern || !intern.id) {
      return NextResponse.json({ error: 'Data intern tidak valid' }, { status: 400 })
    }

    if (!process.env.CLOUDCONVERT_API_KEY) {
      return NextResponse.json({ error: 'CloudConvert API Key belum dikonfigurasi di server (.env)' }, { status: 500 })
    }

    // 1. Ambil template (Cek DB dulu, baru fallback ke file fisik)
    let content = null

    const dbTemplate = await prisma.jsonStore.findUnique({
      where: { key: 'spm_template' }
    })

    if (dbTemplate?.data?.base64) {
      content = Buffer.from(dbTemplate.data.base64, 'base64')
    } else {
      const templatePath = path.resolve(process.cwd(), 'public', 'templates', 'template_spm.docx')
      if (fs.existsSync(templatePath)) {
        content = fs.readFileSync(templatePath)
      }
    }

    // 2. Persiapkan data template
    const today = parseTanggal(new Date().toISOString().split('T')[0])
    const jangkaWaktu = formatJangkaWaktu(intern.periodStart, intern.periodEnd)

    // FIX: Consistent supervisor name (was 'RIZIKI' in old code — corrected to 'RIZKI')
    const templateData = {
      nomor_surat:             nomorSurat || `____.Pj/S.01.01/PLNE01100/${today?.tahun || '2026'}`,
      hari_surat:              today?.hari || '',
      tanggal_surat_terbilang: today?.tanggalTerbilang || '',
      bulan_surat:             today?.bulan || '',
      tahun_surat_terbilang:   today?.tahunTerbilang || '',
      pihak_pertama_nama:      intern.supervisorName  || 'RIZKI YAYU FEBERINA',
      pihak_pertama_jabatan:   intern.supervisorTitle || 'Vice President Sumber Daya Enjiniring dan Umum',
      nama_intern:             (intern.name || '').toUpperCase(),
      nik_intern:              intern.nik     || '',
      jenis_kelamin:           intern.gender === 'Perempuan' ? 'Wanita' : 'Pria',
      alamat_intern:           intern.address || '',
      bidang_magang:           intern.bidang  || '',
      universitas:             intern.university || '',
      program_studi:           intern.major   || '',
      jangka_waktu:            jangkaWaktu,
      uang_saku:               '25.000',
    }

    // 3. Proses docxtemplater JIKA template tersedia
    if (content) {
      try {
        const zip = new PizZip(content)
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks:    true,
          // nullGetter: gracefully handle missing/unknown tags
          nullGetter(part) {
            if (!part.module && part.value === '') return ''
            return `[${part.tag || 'unknown'}]`
          },
        })

        doc.render(templateData)

        const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
        const base64Docx = buf.toString('base64')
        const safeName   = (intern.name || 'Intern').replace(/\s+/g, '_')
        const fileName   = `SPM_${safeName}.docx`

        // 4. CloudConvert: DOCX → PDF
        let job = await cloudConvert.jobs.create({
          tasks: {
            'import-my-file':  { operation: 'import/base64',  file: base64Docx, filename: fileName },
            'convert-my-file': { operation: 'convert', input: 'import-my-file', input_format: 'docx', output_format: 'pdf' },
            'export-my-file':  { operation: 'export/url', input: 'convert-my-file' }
          }
        })
        job = await cloudConvert.jobs.wait(job.id)

        const exportTask = job.tasks.find(t => t.name === 'export-my-file')
        const file       = exportTask.result.files[0]

        return NextResponse.json({
          success: true,
          pdfUrl:  file.url,
          filename: `SPM_${safeName}.pdf`,
          method:  'docxtemplater'
        })

      } catch (docxErr) {
        // Collect docxtemplater multi-error details for logs
        let detail = docxErr.message || 'Unknown docxtemplater error'
        if (docxErr.properties?.errors instanceof Array) {
          detail = docxErr.properties.errors
            .map(e => e.properties?.explanation || e.message)
            .join(' | ')
        }
        console.error('[kontrak/generate] docxtemplater failed, falling back to jsPDF:', detail)
        // Falls through to jsPDF fallback below
      }
    }

    // 5. FALLBACK: Template tidak ada atau docxtemplater gagal (split-tag/corrupt DOCX)
    //    → kirim useFallback:true agar KontrakModal generate PDF via jsPDF (generateKontrakPDF)
    return NextResponse.json({
      success:        true,
      useFallback:    true,
      fallbackReason: content
        ? 'Template DOCX bermasalah (tag terpecah/corrupt). Menggunakan generator PDF bawaan sistem.'
        : 'Template DOCX tidak ditemukan. Menggunakan generator PDF bawaan sistem.',
      intern:     { ...intern, supervisorName: intern.supervisorName || 'RIZKI YAYU FEBERINA' },
      nomorSurat,
    })

  } catch (error) {
    console.error('[kontrak/generate] Error:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan saat membuat PDF' }, { status: 500 })
  }
}

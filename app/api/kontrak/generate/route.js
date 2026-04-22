import { NextResponse } from 'next/server'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import fs from 'fs'
import path from 'path'
import CloudConvert from 'cloudconvert'
import { parseTanggal, formatJangkaWaktu } from '@/lib/kontrakUtils'
import prisma from '@/lib/prisma'

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

    // 1. Ambil template (Cek JsonStore dulu, baru fallback ke file fisik)
    let content;
    let isBase64 = false;

    const dbTemplate = await prisma.jsonStore.findUnique({
      where: { key: 'spm_template' }
    });

    if (dbTemplate && dbTemplate.data && dbTemplate.data.base64) {
      content = Buffer.from(dbTemplate.data.base64, 'base64');
      isBase64 = true;
    } else {
      const templatePath = path.resolve(process.cwd(), 'public', 'templates', 'template_spm.docx')
      if (!fs.existsSync(templatePath)) {
        return NextResponse.json({ error: `Template tidak ditemukan. Silakan upload template di menu pengaturan.` }, { status: 404 })
      }
      content = fs.readFileSync(templatePath, 'binary')
    }

    // 2. Persiapkan data untuk mengisi template
    const today = parseTanggal(new Date().toISOString().split('T')[0])
    const jangkaWaktu = formatJangkaWaktu(intern.periodStart, intern.periodEnd)
    
    const templateData = {
      nomor_surat: nomorSurat || `____.Pj/S.01.01/PLNE01100/${today?.tahun || '2026'}`,
      hari_surat: today?.hari || '',
      tanggal_surat_terbilang: today?.tanggalTerbilang || '',
      bulan_surat: today?.bulan || '',
      tahun_surat_terbilang: today?.tahunTerbilang || '',
      pihak_pertama_nama: intern.supervisorName || 'RIZIKI YAYU FEBERINA',
      pihak_pertama_jabatan: intern.supervisorTitle || 'Vice President Sumber Daya Enjiniring dan Umum',
      nama_intern: (intern.name || '').toUpperCase(),
      nik_intern: intern.nik || '',
      jenis_kelamin: intern.gender === 'Perempuan' ? 'Wanita' : 'Pria',
      alamat_intern: intern.address || '',
      bidang_magang: intern.bidang || '',
      universitas: intern.university || '',
      program_studi: intern.major || '',
      jangka_waktu: jangkaWaktu,
      uang_saku: '25.000'
    }

    // 3. Proses pengisian tag menggunakan docxtemplater
    const zip = new PizZip(content)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    })

    doc.render(templateData)

    // Dapatkan buffer dari file .docx yang sudah diisi
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })

    // Ubah buffer ke base64 untuk dikirim ke CloudConvert
    const base64Docx = buf.toString('base64')
    const safeName = (intern.name || 'Intern').replace(/\s+/g, '_')
    const fileName = `SPM_${safeName}.docx`

    // 4. Integrasi dengan CloudConvert
    let job = await cloudConvert.jobs.create({
      tasks: {
        'import-my-file': {
          operation: 'import/base64',
          file: base64Docx,
          filename: fileName
        },
        'convert-my-file': {
          operation: 'convert',
          input: 'import-my-file',
          input_format: 'docx',
          output_format: 'pdf'
        },
        'export-my-file': {
          operation: 'export/url',
          input: 'convert-my-file'
        }
      }
    })

    // Tunggu proses selesai
    job = await cloudConvert.jobs.wait(job.id)

    // 5. Ambil URL hasil convert
    const exportTask = job.tasks.filter(task => task.name === 'export-my-file')[0]
    const file = exportTask.result.files[0]

    return NextResponse.json({ 
      success: true, 
      pdfUrl: file.url,
      filename: `SPM_${safeName}.pdf`
    })

  } catch (error) {
    console.error('Error generate PDF:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan saat membuat PDF' }, { status: 500 })
  }
}

/**
 * scripts/generateTemplate.js
 * Script untuk membuat file template_spm.docx yang valid secara programatik.
 * Jalankan dengan: node scripts/generateTemplate.js
 */

const {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  Header, ImageRun, HeadingLevel, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType,
} = require('docx')
const fs = require('fs')
const path = require('path')

// ── Helper untuk teks biasa (tidak bold) ─────────────────────────────────────
const p = (text, opts = {}) => new Paragraph({
  alignment: opts.align || AlignmentType.JUSTIFIED,
  spacing: { line: 276, lineRule: 'auto' }, // 1.15 spacing
  children: [new TextRun({ text, font: 'Arial', size: 20, ...opts.run })]
})

// ── Helper untuk teks bold ────────────────────────────────────────────────────
const bold = (text) => new TextRun({ text, font: 'Arial', size: 20, bold: true })
const normal = (text) => new TextRun({ text, font: 'Arial', size: 20 })

// ── Helper untuk paragraf campuran (bold + normal) ───────────────────────────
const mixed = (runs, align = AlignmentType.JUSTIFIED) => new Paragraph({
  alignment: align,
  spacing: { line: 276, lineRule: 'auto' },
  children: runs
})

// ── Helper untuk spasi kosong ─────────────────────────────────────────────────
const space = () => new Paragraph({ spacing: { line: 276 }, children: [new TextRun('')] })

// ── Helper untuk heading pasal (tengah) ──────────────────────────────────────
const pasalHeader = (nomorPasal, judulPasal) => [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 276 },
    children: [new TextRun({ text: `Pasal ${nomorPasal}`, font: 'Arial', size: 20 })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 276 },
    children: [new TextRun({ text: judulPasal, font: 'Arial', size: 20, bold: true })]
  }),
  space()
]

// ── Helper untuk item list bernomor/huruf ────────────────────────────────────
const listItem = (bullet, runs) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED,
  spacing: { line: 276, lineRule: 'auto' },
  indent: { left: 0 },
  children: [
    new TextRun({ text: `${bullet}\t`, font: 'Arial', size: 20 }),
    ...(Array.isArray(runs) ? runs : [new TextRun({ text: runs, font: 'Arial', size: 20 })])
  ]
})

async function generateTemplate() {
  // ── Logo (opsional, hanya jika file logo ada) ──────────────────────────────
  const logoPath = path.resolve(process.cwd(), 'public', 'images', 'logo-pln.png')
  let headerChildren = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 120 },
      children: [new TextRun({ text: 'PT PRIMA LAYANAN NASIONAL ENJINIRING', font: 'Arial', size: 20, bold: true })]
    })
  ]

  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath)
    headerChildren = [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 120 },
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 182, height: 63 } // ~48mm x 16.8mm
          })
        ]
      })
    ]
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,    // 2.54cm = 1440 twip
            bottom: 1440,
            right: 1440,
            left: 1621    // 2.86cm = 1621 twip
          }
        }
      },
      headers: {
        default: new Header({ children: headerChildren })
      },
      children: [
        // ── JUDUL ────────────────────────────────────────────────────────────
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { line: 276 },
          children: [new TextRun({ text: 'SURAT PERJANJIAN MAGANG', font: 'Arial', size: 20, bold: true })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { line: 276, after: 200 },
          children: [new TextRun({ text: 'Nomor : {nomor_surat}', font: 'Arial', size: 20, bold: true })]
        }),

        space(),

        // ── PARAGRAF PEMBUKA ─────────────────────────────────────────────────
        mixed([
          normal('Perjanjian Magang ini dibuat dan ditandatangani di Jakarta pada hari ini '),
          bold('{hari_surat}'),
          normal(' tanggal '),
          bold('{tanggal_surat_terbilang}'),
          normal(' bulan '),
          bold('{bulan_surat}'),
          normal(' tahun '),
          bold('{tahun_surat_terbilang}'),
          normal(', oleh dan antara :'),
        ]),

        space(),

        // ── PIHAK PERTAMA ────────────────────────────────────────────────────
        mixed([
          normal('1.\t'),
          bold('PT PRIMA LAYANAN NASIONAL ENJINIRING ("PLN Enjiniring")'),
          normal(', suatu Perseroan Terbatas yang didirikan berdasarkan Akta Notaris Haryanto, SH Nomor 9 tanggal 3 Oktober 2002 dan perubahan terakhir Akta Notaris Lenny Janis Ishak, SH Nomor 22 tanggal 12 Desember 2012 melalui pengesahan Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia Nomor AHU-05116.AH.01.02 Tahun 2013 tanggal 8 Februari 2013, dalam hal ini diwakili oleh '),
          bold('{pihak_pertama_nama}'),
          normal(', selaku {pihak_pertama_jabatan} untuk dan atas nama PT Prima Layanan Nasional Enjiniring, berkedudukan di Jl. Aipda KS Tubun I No.2 Jakarta 11420, yang selanjutnya disebut sebagai '),
          bold('PIHAK PERTAMA'),
          normal('; dan'),
        ]),

        space(),

        // ── PIHAK KEDUA ──────────────────────────────────────────────────────
        mixed([
          normal('2.\t'),
          bold('{nama_intern}'),
          normal(', Pemegang identitas KTP Nomor {nik_intern}, {jenis_kelamin}, beralamat {alamat_intern}, dalam hal ini bertindak untuk dan atas nama sendiri yang selanjutnya dalam perjanjian ini disebut sebagai '),
          bold('PIHAK KEDUA'),
          normal('.'),
        ]),

        space(),

        // ── KESIMPULAN ───────────────────────────────────────────────────────
        mixed([
          bold('PIHAK PERTAMA'),
          normal(' dan '),
          bold('PIHAK KEDUA'),
          normal(' masing-masing disebut '),
          bold('PIHAK'),
          normal(', dan secara bersama-sama disebut '),
          bold('PARA PIHAK'),
          normal('. Selanjutnya '),
          bold('PARA PIHAK'),
          normal(' sepakat untuk menandatangani dan melaksanakan Perjanjian ini dengan ketentuan-ketentuan dan syarat-syarat sebagai berikut:'),
        ]),

        space(),

        // ── PASAL 1 ──────────────────────────────────────────────────────────
        ...pasalHeader('1', 'PENEMPATAN'),
        mixed([
          bold('PIHAK PERTAMA'),
          normal(' bersedia menerima '),
          bold('PIHAK KEDUA'),
          normal(' untuk Magang, dan '),
          bold('PIHAK KEDUA'),
          normal(' bersedia Magang untuk memperoleh pengalaman dalam Bidang {bidang_magang} di PT PLN Enjiniring.'),
        ]),
        space(),

        // ── PASAL 2 ──────────────────────────────────────────────────────────
        ...pasalHeader('2', 'HAK DAN KEWAJIBAN'),
        listItem('1.', [bold('HAK PIHAK PERTAMA :')]),
        listItem('a.', [normal('Memberhentikan '), bold('PIHAK KEDUA'), normal(' apabila menyimpang dari ketentuan yang telah disepakati dalam Perjanjian Magang tanpa kompensasi;')]),
        listItem('b.', 'Memanfaatkan hasil peserta Magang; dan'),
        listItem('c.', 'Memberlakukan Tata Tertib dan Perjanjian Magang.'),
        listItem('2.', [normal('Penyimpangan sebagaimana dimaksud pada pasal (2) ayat (1) huruf a, meliputi:')]),
        listItem('a.', [normal('Melakukan kelalaian dan tindakan yang tidak bertanggung jawab walaupun telah mendapat peringatan dari '), bold('PIHAK PERTAMA'), normal('; dan')]),
        listItem('b.', [bold('PIHAK KEDUA'), normal(' melanggar dari ketentuan yang telah disepakati dalam Perjanjian Magang ini.')]),
        listItem('3.', [bold('KEWAJIBAN PIHAK PERTAMA :')]),
        listItem('a.', 'Membimbing peserta Magang;'),
        listItem('b.', 'Memenuhi hak peserta Magang sesuai dengan Perjanjian Magang;'),
        listItem('c.', 'Mengevaluasi peserta Magang; dan'),
        listItem('d.', 'Memberikan Surat Keterangan Magang atau Sertifikat.'),
        listItem('4.', [bold('HAK PIHAK KEDUA :')]),
        listItem('a.', 'Memperoleh bimbingan dari pembimbing Magang;'),
        listItem('b.', 'Memperoleh Surat Keterangan Magang atau Sertifikat; dan'),
        listItem('5.', [bold('KEWAJIBAN PIHAK KEDUA :')]),
        listItem('a.', 'Mematuhi ketentuan yang telah disepakati dalam Perjanjian Magang;'),
        listItem('b.', 'Mengikuti program Magang sampai selesai;'),
        listItem('c.', 'Mentaati tata tertib yang berlaku di Perusahaan;'),
        listItem('d.', 'Mentaati instruksi dari pembimbing Magang; dan'),
        listItem('e.', [normal('Tidak menuntut untuk dijadikan karyawan di Perusahaan setelah selesai Magang.')]),
        space(),

        // ── PASAL 3 ──────────────────────────────────────────────────────────
        ...pasalHeader('3', 'WAKTU PELAKSANAAN DAN PENGAKHIRAN PERJANJIAN'),
        listItem('1.', [normal('Jangka waktu pelaksanaan Magang terhitung tanggal '), bold('{jangka_waktu}'), normal('.')]),
        listItem('2.', [normal('Jika '), bold('PIHAK KEDUA'), normal(' ingin menyelesaikan Perjanjian Magang sebelum jangka waktu berakhir, dapat melayangkan surat pribadi kepada '), bold('PIHAK PERTAMA'), normal(' minimal 7 (tujuh) hari sebelum hari aktif terakhir Magang; dan')]),
        listItem('3.', 'Tidak ada kompensasi dalam bentuk apapun terhadap pengakhiran perjanjian tersebut pada ayat di atas.'),
        space(),

        // ── PASAL 4 ──────────────────────────────────────────────────────────
        ...pasalHeader('4', 'PEMBAYARAN UANG SAKU'),
        listItem('1.', [normal('Uang saku untuk peserta Magang, adalah sebesar Rp. '), bold('{uang_saku}'), normal(' /hari; dan')]),
        listItem('2.', [normal('Uang saku dibayarkan berdasarkan kehadiran yang dibuktikan dengan (Timesheet/Logbook/Daftar Hadir) yang telah disetujui oleh '), bold('PIHAK PERTAMA'), normal('.')]),
        space(),

        // ── PASAL 5 ──────────────────────────────────────────────────────────
        ...pasalHeader('5', 'HARI MAGANG'),
        mixed([
          bold('PIHAK KEDUA'),
          normal(' dalam melaksanakan Magang mengikuti aturan Hari Kerja dan Jam Kerja yang berlaku di lingkungan '),
          bold('PIHAK PERTAMA'),
          normal(' sebagai berikut:'),
        ]),
        listItem('a.', "Hari Kerja   :   Senin sampai dengan Jum'at;"),
        listItem('b.', "Jam Kerja    :   07.30 sampai dengan 16.00 WIB (kecuali hari Jum'at dari pukul 07.30 sampai dengan 16.30 WIB); dan"),
        listItem('c.', [normal('Pengaturan   :   Sesuai aturan yang berlaku di lingkungan kerja '), bold('PIHAK PERTAMA'), normal('.')]),
        space(),

        // ── PASAL 6 ──────────────────────────────────────────────────────────
        ...pasalHeader('6', 'TATA TERTIB'),
        mixed([
          bold('PIHAK KEDUA'),
          normal(' bersedia untuk mentaati ketentuan yang berlaku di PLN Enjiniring, yaitu:'),
        ]),
        listItem('a.', 'Melaksanakan semua tugas Magang dengan sebaik-baiknya;'),
        listItem('b.', 'Menjaga dan memelihara barang-barang milik Perusahaan dengan sebaik-baiknya;'),
        listItem('c.', 'Berpakaian rapi dan bersikap sopan santun; dan'),
        listItem('d.', [normal('Apabila tidak hadir harap memberi informasi kepada '), bold('PIHAK PERTAMA'), normal('.')]),
        space(),

        // ── PASAL 7 ──────────────────────────────────────────────────────────
        ...pasalHeader('7', 'KERAHASIAAN'),
        listItem('1.', [bold('PIHAK KEDUA'), normal(' tidak boleh memberikan/menyampaikan kepada seseorang atau Pihak Lain segala informasi yang dipercayakan kepada '), bold('PIHAK KEDUA'), normal(' atau yang ditemukan oleh '), bold('PIHAK KEDUA'), normal(' dalam rangka Magang tanpa persetujuan tertulis dari '), bold('PIHAK PERTAMA'), normal(';')]),
        listItem('2.', [bold('PIHAK KEDUA'), normal(' wajib menjaga kerahasiaan dan tidak diperbolehkan untuk mempublikasikan seluruh data, berkas dan dokumen serta informasi yang dipinjamkan oleh '), bold('PIHAK PERTAMA'), normal('; dan')]),
        listItem('3.', [bold('PIHAK KEDUA'), normal(' bertanggung jawab terhadap kerugian '), bold('PIHAK PERTAMA'), normal(', sebagai akibat pelanggaran kerahasiaan data/dokumen yang dilakukan oleh '), bold('PIHAK KEDUA'), normal('.')]),
        space(),

        // ── PASAL 8 ──────────────────────────────────────────────────────────
        ...pasalHeader('8', 'PENYELESAIAN PERSELISIHAN'),
        mixed([
          normal('Jika terjadi perselisihan antara '),
          bold('PARA PIHAK'),
          normal(' maka akan diselesaikan secara musyawarah untuk mencapai mufakat dan Apabila melalui musyawarah tidak dapat diselesaikan dalam jangka waktu 30 (tiga puluh) hari, maka '),
          bold('PARA PIHAK'),
          normal(' sepakat untuk menyelesaikan perselisihan melalui Instansi Terkait.'),
        ]),
        space(),

        // ── PARAGRAF PENUTUP ─────────────────────────────────────────────────
        mixed([
          normal('Surat perjanjian ini dibuat dalam rangkap 2 (dua) asli, yang mempunyai kekuatan hukum yang sama, 1 (satu) rangkap untuk '),
          bold('PIHAK PERTAMA'),
          normal(', 1 (satu) rangkap untuk '),
          bold('PIHAK KEDUA'),
          normal(', dan dibubuhi meterai secukupnya serta ditandatangani di Jakarta pada hari, tanggal, bulan dan tahun tersebut pada permulaan perjanjian ini.'),
        ]),

        space(),
        space(),

        // ── TANDA TANGAN ─────────────────────────────────────────────────────
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: 'PIHAK KEDUA', font: 'Arial', size: 20, bold: true })]
                    })
                  ]
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: 'PIHAK PERTAMA', font: 'Arial', size: 20, bold: true })]
                    })
                  ]
                }),
              ]
            }),
            // Ruang tanda tangan
            new TableRow({
              children: [
                new TableCell({
                  children: [space(), space(), space(), space(), space()]
                }),
                new TableCell({
                  children: [space(), space(), space(), space(), space()]
                }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: '{nama_intern}', font: 'Arial', size: 20, bold: true })]
                    })
                  ]
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: '{pihak_pertama_nama}', font: 'Arial', size: 20, bold: true })]
                    })
                  ]
                }),
              ]
            }),
          ]
        }),
      ]
    }]
  })

  const outputPath = path.resolve(process.cwd(), 'public', 'templates', 'template_spm.docx')
  const buffer = await Packer.toBuffer(doc)
  fs.writeFileSync(outputPath, buffer)
  console.log(`✅ Template berhasil dibuat: ${outputPath}`)
}

generateTemplate().catch(console.error)

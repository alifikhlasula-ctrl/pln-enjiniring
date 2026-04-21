/**
 * kontrakUtils.js
 * Utility untuk pembuatan Surat Perjanjian Magang (SPM) otomatis.
 *
 * Spesifikasi Dokumen (Sesuai Revisi Final):
 *  - Font    : Helvetica (Arial equivalent in PDF standard)
 *  - Size    : 10pt
 *  - Margin  : Kiri 2.86cm | Kanan 2.54cm | Atas 2.54cm | Bawah 2.54cm
 *  - Paper   : A4 (210 x 297 mm)
 *  - Spasi   : Multiple 1.15
 */

// ─── Terbilang (Angka → Kata Indonesia) ─────────────────────────────────────
const SATUAN = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan',
  'Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas',
  'Enam Belas', 'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas']
const PULUHAN = ['', '', 'Dua Puluh', 'Tiga Puluh', 'Empat Puluh', 'Lima Puluh',
  'Enam Puluh', 'Tujuh Puluh', 'Delapan Puluh', 'Sembilan Puluh']

function terbilangRatusan(n) {
  if (n < 20) return SATUAN[n]
  if (n < 100) return PULUHAN[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + SATUAN[n % 10] : '')
  const ratus = Math.floor(n / 100)
  const sisa  = n % 100
  const ratusStr = ratus === 1 ? 'Seratus' : SATUAN[ratus] + ' Ratus'
  return ratusStr + (sisa !== 0 ? ' ' + terbilangRatusan(sisa) : '')
}

export function terbilang(n) {
  if (n === 0) return 'Nol'
  if (n < 0)   return 'Minus ' + terbilang(-n)
  if (n < 1000) return terbilangRatusan(n)
  if (n < 1000000) {
    const ribuan = Math.floor(n / 1000)
    const sisa   = n % 1000
    const ribuStr = ribuan === 1 ? 'Seribu' : terbilang(ribuan) + ' Ribu'
    return ribuStr + (sisa !== 0 ? ' ' + terbilang(sisa) : '')
  }
  if (n < 1000000000) {
    const juta = Math.floor(n / 1000000)
    const sisa = n % 1000000
    return terbilang(juta) + ' Juta' + (sisa !== 0 ? ' ' + terbilang(sisa) : '')
  }
  return String(n)
}

// ─── Format Tanggal Indonesia ────────────────────────────────────────────────
const BULAN_ID = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]
const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export function parseTanggal(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return {
    hari:             HARI_ID[date.getDay()],
    tanggal:          String(d).padStart(2, '0'),
    tanggalTerbilang: terbilang(d),
    bulan:            BULAN_ID[m],
    bulanAngka:       String(m).padStart(2, '0'),
    tahun:            String(y),
    tahunTerbilang:   terbilang(y),
    format:           `${String(d).padStart(2, '0')} ${BULAN_ID[m]} ${y}`,
  }
}

export function formatJangkaWaktu(periodStart, periodEnd) {
  const s = parseTanggal(periodStart)
  const e = parseTanggal(periodEnd)
  if (!s || !e) return '-'
  return `${s.format} s.d ${e.format}`
}

// ─── Helper: load image as base64 (browser-safe) ────────────────────────────
async function loadImageBase64(url) {
  try {
    const res  = await fetch(url)
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null // logo gagal dimuat, lanjut tanpa logo
  }
}

// ─── Konstanta Layout ────────────────────────────────────────────────────────
const ML   = 28.6  // margin kiri  (2.86 cm)
const MR   = 25.4  // margin kanan (2.54 cm)
const MT   = 25.4  // margin atas  (2.54 cm)
const MB   = 25.4  // margin bawah (2.54 cm)
const W    = 210   // lebar A4
const H    = 297   // tinggi A4
const TW   = W - ML - MR   // text width = 156mm
const FS   = 10    // font size 10pt
const LH   = 4.1   // line height for 1.15 spacing

// ─── Generate PDF ─────────────────────────────────────────────────────────────
export async function generateKontrakPDF(intern, nomorSurat, jsPDFLib) {
  const { jsPDF } = jsPDFLib
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const today    = parseTanggal(new Date().toISOString().split('T')[0])
  const start    = parseTanggal(intern.periodStart)
  const end      = parseTanggal(intern.periodEnd)
  const jangka   = formatJangkaWaktu(intern.periodStart, intern.periodEnd)
  const allowance = 25000
  const p1Name   = intern.supervisorName  || 'RIZIKI YAYU FEBERINA'
  const p1Title  = intern.supervisorTitle || 'Vice President Sumber Daya Enjiniring dan Umum'
  const noSurat  = nomorSurat || `____.Pj/S.01.01/PLNE01100/${today?.tahun || '2026'}`

  // Muat logo untuk header
  const logoBase64 = await loadImageBase64('/images/logo-pln.png')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FS)

  // Header Logo di setiap halaman (kecuali kita handle di loop akhir)
  // Tapi kita butuh y yang tepat di halaman 1
  let y = MT + 18 // Mulai di bawah area logo (Logo tinggi ~16mm + padding)

  // ────────── RICH TEXT RENDERER (BOLD & JUSTIFY) ───────────────────────────
  function writeRichText(text, x, startY, maxWidth, justify = true) {
    const paragraphs = text.split('\n')
    let currentY = startY

    paragraphs.forEach(paragraph => {
      if (!paragraph.trim()) {
        currentY += LH
        return
      }

      const words = []
      const tokens = paragraph.split(/(\s+)/)
      
      let isBold = false
      let isItalic = false
      tokens.forEach(token => {
        if (!token) return
        if (token.match(/^\s+$/)) {
          words.push({ text: ' ', font: isBold ? 'bold' : (isItalic ? 'italic' : 'normal'), isSpace: true })
          return
        }
        
        let parts = token.split(/(\*\*|_)/)
        parts.forEach(part => {
          if (part === '**') {
            isBold = !isBold
          } else if (part === '_') {
            isItalic = !isItalic
          } else if (part) {
            let font = 'normal'
            if (isBold && isItalic) font = 'bolditalic'
            else if (isBold) font = 'bold'
            else if (isItalic) font = 'italic'
            words.push({ text: part, font: font, isSpace: false })
          }
        })
      })

      // Word Wrap
      let lines = []
      let currentLine = []
      let currentLineWidth = 0

      words.forEach(word => {
        doc.setFont('helvetica', word.font)
        const wordWidth = doc.getTextWidth(word.text)
        
        if (word.isSpace) {
          if (currentLine.length > 0 && currentLineWidth + wordWidth <= maxWidth) {
            currentLine.push(word)
            currentLineWidth += wordWidth
          }
        } else {
          if (currentLine.length === 0) {
            currentLine.push(word)
            currentLineWidth = wordWidth
          } else {
            if (currentLineWidth + wordWidth <= maxWidth) {
              currentLine.push(word)
              currentLineWidth += wordWidth
            } else {
              while (currentLine.length > 0 && currentLine[currentLine.length - 1].isSpace) {
                const popped = currentLine.pop()
                doc.setFont('helvetica', popped.font)
                currentLineWidth -= doc.getTextWidth(popped.text)
              }
              lines.push({ words: currentLine, width: currentLineWidth })
              currentLine = [word]
              currentLineWidth = wordWidth
            }
          }
        }
      })
      
      if (currentLine.length > 0) {
        while (currentLine.length > 0 && currentLine[currentLine.length - 1].isSpace) {
          const popped = currentLine.pop()
          doc.setFont('helvetica', popped.font)
          currentLineWidth -= doc.getTextWidth(popped.text)
        }
        lines.push({ words: currentLine, width: currentLineWidth })
      }

      // Render Baris
      lines.forEach((line, index) => {
        const isLastLine = index === lines.length - 1
        let currentX = x
        let extraSpace = 0
        
        if (justify && !isLastLine && line.words.length > 1) {
          const spaceCount = line.words.filter(w => w.isSpace).length
          if (spaceCount > 0) {
            extraSpace = (maxWidth - line.width) / spaceCount
          }
        }

        line.words.forEach(word => {
          doc.setFont('helvetica', word.font)
          if (word.isSpace) {
            currentX += doc.getTextWidth(word.text) + extraSpace
          } else {
            if (currentY + LH > H - MB) {
               doc.addPage()
               currentY = MT + 20 // Reset ke bawah area logo di halaman baru
            }
            doc.text(word.text, currentX, currentY)
            currentX += doc.getTextWidth(word.text)
          }
        })
        currentY += LH
      })
    })
    
    return currentY
  }

  // ────────── HEADER (Halaman 1) ───────────────────────────────────────────

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(FS)
  doc.text('SURAT PERJANJIAN MAGANG', W / 2, y, { align: 'center' })
  y += LH
  doc.text(`Nomor : ${noSurat}`, W / 2, y, { align: 'center' })
  
  y += LH * 2 // Jarak ke paragraf pembuka

  // ────────── PARAGRAF PEMBUKA ─────────────────────────────────────────────

  y = writeRichText(
    `Perjanjian Magang ini dibuat dan ditandatangani di Jakarta pada hari ini **${today.hari}** tanggal **${today.tanggalTerbilang}** bulan **${today.bulan}** tahun **${today.tahunTerbilang}**, oleh dan antara :`,
    ML, y, TW, true
  )
  y += LH * 0.5

  // PIHAK PERTAMA
  doc.setFont('helvetica', 'normal')
  doc.text('1.', ML, y)
  y = writeRichText(
    `**PT PRIMA LAYANAN NASIONAL ENJINIRING ("PLN Enjiniring")**, suatu Perseroan Terbatas yang didirikan berdasarkan Akta Notaris Haryanto, SH Nomor 9 tanggal 3 Oktober 2002 dan perubahan terakhir Akta Notaris Lenny Janis Ishak, SH Nomor 22 tanggal 12 Desember 2012 melalui pengesahan Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia Nomor AHU-05116.AH.01.02 Tahun 2013 tanggal 8 Februari 2013, dalam hal ini diwakili oleh **${p1Name}**, selaku ${p1Title} untuk dan atas nama PT Prima Layanan Nasional Enjiniring, berkedudukan di Jl. Aipda KS Tubun I No.2 Jakarta 11420, yang selanjutnya disebut sebagai **PIHAK PERTAMA**; dan`,
    ML + 8, y, TW - 8, true
  )
  y += LH * 0.5

  // PIHAK KEDUA
  const jkStr = intern.gender === 'Perempuan' ? 'Wanita' : 'Pria'
  doc.setFont('helvetica', 'normal')
  doc.text('2.', ML, y)
  y = writeRichText(
    `**${(intern.name || '_______________').toUpperCase()}**, Pemegang identitas KTP Nomor ${intern.nik || '________________'}, ${jkStr}, beralamat ${intern.address || '________________'}, dalam hal ini bertindak untuk dan atas nama sendiri yang selanjutnya dalam perjanjian ini disebut sebagai **PIHAK KEDUA**.`,
    ML + 8, y, TW - 8, true
  )
  y += LH * 0.5

  // KESIMPULAN PARA PIHAK
  y = writeRichText(
    `**PIHAK PERTAMA** dan **PIHAK KEDUA** masing-masing disebut **PIHAK**, dan secara bersama-sama disebut **PARA PIHAK**. Selanjutnya **PARA PIHAK** sepakat untuk menandatangani dan melaksanakan Perjanjian ini dengan ketentuan-ketentuan dan syarat-syarat sebagai berikut:`,
    ML, y, TW, true
  )
  y += LH

  // ────────── PASAL-PASAL ──────────────────────────────────────────────────
  
  const renderPasal = (nomor, judul) => {
    if (y + LH * 4 > H - MB) { doc.addPage(); y = MT + 20 }
    doc.setFont('helvetica', 'normal')
    doc.text(`Pasal ${nomor}`, W / 2, y, { align: 'center' })
    y += LH
    doc.setFont('helvetica', 'bold')
    doc.text(judul, W / 2, y, { align: 'center' })
    y += LH * 1.5
    doc.setFont('helvetica', 'normal')
  }

  // List Helper
  const writeList = (items, startIndent, bulletIndent) => {
    items.forEach(item => {
      if (!item.text) { y += LH * 0.5; return }
      doc.setFont('helvetica', 'normal')
      doc.text(item.bullet, ML + startIndent, y)
      y = writeRichText(item.text, ML + startIndent + bulletIndent, y, TW - startIndent - bulletIndent, true)
    })
  }

  // --- Pasal 1
  renderPasal('1', 'PENEMPATAN')
  y = writeRichText(`**PIHAK PERTAMA** bersedia menerima **PIHAK KEDUA** untuk Magang, dan **PIHAK KEDUA** bersedia Magang untuk memperoleh pengalaman dalam Bidang ${intern.bidang || '_______________'} di PT PLN Enjiniring.`, ML, y, TW, true)
  y += LH

  // --- Pasal 2
  renderPasal('2', 'HAK DAN KEWAJIBAN')
  writeList([
    { bullet: '1.', text: 'HAK PIHAK PERTAMA :' },
    { bullet: 'a.', text: 'Memberhentikan PIHAK KEDUA apabila menyimpang dari ketentuan yang telah disepakati dalam Perjanjian Magang tanpa kompensasi;' },
    { bullet: 'b.', text: 'Memanfaatkan hasil peserta Magang; dan' },
    { bullet: 'c.', text: 'Memberlakukan Tata Tertib dan Perjanjian Magang.' },
    { bullet: '2.', text: 'Penyimpangan sebagaimana dimaksud pada pasal (2) ayat (1) huruf a, meliputi:' },
    { bullet: 'a.', text: 'Melakukan kelalaian dan tindakan yang tidak bertanggung jawab walaupun telah mendapat peringatan dari **PIHAK PERTAMA**; dan' },
    { bullet: 'b.', text: '**PIHAK KEDUA** melanggar dari ketentuan yang telah disepakati dalam Perjanjian Magang ini.' },
    { bullet: '3.', text: 'KEWAJIBAN PIHAK PERTAMA :' },
    { bullet: 'a.', text: 'Membimbing peserta Magang;' },
    { bullet: 'b.', text: 'Memenuhi hak peserta Magang sesuai dengan Perjanjian Magang;' },
    { bullet: 'c.', text: 'Mengevaluasi peserta Magang; dan' },
    { bullet: 'd.', text: 'Memberikan Surat Keterangan Magang atau Sertifikat.' },
    { bullet: '4.', text: 'HAK PIHAK KEDUA :' },
    { bullet: 'a.', text: 'Memperoleh bimbingan dari pembimbing Magang;' },
    { bullet: 'b.', text: 'Memperoleh Surat Keterangan Magang atau Sertifikat; dan' },
    { bullet: '5.', text: 'KEWAJIBAN PIHAK KEDUA :' },
    { bullet: 'a.', text: 'Mematuhi ketentuan yang telah disepakati dalam Perjanjian Magang;' },
    { bullet: 'b.', text: 'Mengikuti program Magang sampai selesai;' },
    { bullet: 'c.', text: 'Mentaati tata tertib yang berlaku di Perusahaan;' },
    { bullet: 'd.', text: 'Mentaati instruksi dari pembimbing Magang; dan' },
    { bullet: 'e.', text: 'Tidak menuntut untuk dijadikan karyawan di Perusahaan setelah selesai Magang.' }
  ], 0, 8)
  y += LH

  // --- Pasal 3
  renderPasal('3', 'WAKTU PELAKSANAAN DAN PENGAKHIRAN PERJANJIAN')
  writeList([
    { bullet: '1.', text: `Jangka waktu pelaksanaan Magang terhitung tanggal ${jangka}.` },
    { bullet: '2.', text: 'Jika **PIHAK KEDUA** ingin menyelesaikan Perjanjian Magang sebelum jangka waktu berakhir, dapat melayangkan surat pribadi kepada **PIHAK PERTAMA** minimal 7 (tujuh) hari sebelum hari aktif terakhir Magang; dan' },
    { bullet: '3.', text: 'Tidak ada kompensasi dalam bentuk apapun terhadap pengakhiran perjanjian tersebut pada ayat di atas.' }
  ], 0, 8)
  y += LH

  // --- Pasal 4
  renderPasal('4', 'PEMBAYARAN UANG SAKU')
  writeList([
    { bullet: '1.', text: `Uang saku untuk peserta Magang, adalah sebesar Rp. ${allowance.toLocaleString('id-ID')} /hari; dan` },
    { bullet: '2.', text: 'Uang saku dibayarkan berdasarkan kehadiran yang dibuktikan dengan (_Timesheet_/_Logbook_/Daftar Hadir) yang telah disetujui oleh **PIHAK PERTAMA**.' }
  ], 0, 8)
  y += LH

  // --- Pasal 5
  renderPasal('5', 'HARI MAGANG')
  y = writeRichText('**PIHAK KEDUA** dalam melaksanakan Magang mengikuti aturan Hari Kerja dan Jam Kerja yang berlaku di lingkungan **PIHAK PERTAMA** sebagai berikut:', ML, y, TW, true)
  writeList([
    { bullet: 'a.', text: 'Hari Kerja   :   Senin sampai dengan Jum\'at;' },
    { bullet: 'b.', text: 'Jam Kerja    :   07.30 sampai dengan 16.00 WIB (kecuali hari Jum\'at dari pukul 07.30 sampai dengan 16.30 WIB); dan' },
    { bullet: 'c.', text: 'Pengaturan   :   Sesuai aturan yang berlaku di lingkungan kerja **PIHAK PERTAMA**.' }
  ], 8, 8)
  y += LH

  // --- Pasal 6
  renderPasal('6', 'TATA TERTIB')
  y = writeRichText('**PIHAK KEDUA** bersedia untuk mentaati ketentuan yang berlaku di PLN Enjiniring, yaitu:', ML, y, TW, true)
  writeList([
    { bullet: 'a.', text: 'Melaksanakan semua tugas Magang dengan sebaik-baiknya;' },
    { bullet: 'b.', text: 'Menjaga dan memelihara barang-barang milik Perusahaan dengan sebaik-baiknya;' },
    { bullet: 'c.', text: 'Berpakaian rapi dan bersikap sopan santun; dan' },
    { bullet: 'd.', text: 'Apabila tidak hadir harap memberi informasi kepada **PIHAK PERTAMA**.' }
  ], 8, 8)
  y += LH

  // --- Pasal 7
  renderPasal('7', 'KERAHASIAAN')
  writeList([
    { bullet: '1.', text: '**PIHAK KEDUA** tidak boleh memberikan/menyampaikan kepada seseorang atau Pihak Lain segala informasi yang dipercayakan kepada **PIHAK KEDUA** atau yang ditemukan oleh **PIHAK KEDUA** dalam rangka Magang tanpa persetujuan tertulis dari **PIHAK PERTAMA**;' },
    { bullet: '2.', text: '**PIHAK KEDUA** wajib menjaga kerahasiaan dan tidak diperbolehkan untuk mempublikasikan seluruh data, berkas dan dokumen serta informasi yang dipinjamkan oleh **PIHAK PERTAMA**; dan' },
    { bullet: '3.', text: '**PIHAK KEDUA** bertanggung jawab terhadap kerugian **PIHAK PERTAMA**, sebagai akibat pelanggaran kerahasiaan data/dokumen yang dilakukan oleh **PIHAK KEDUA**.' }
  ], 0, 8)
  y += LH

  // --- Pasal 8
  renderPasal('8', 'PENYELESAIAN PERSELISIHAN')
  y = writeRichText('Jika terjadi perselisihan antara **PARA PIHAK** maka akan diselesaikan secara musyawarah untuk mencapai mufakat dan Apabila melalui musyawarah tidak dapat diselesaikan dalam jangka waktu 30 (tiga puluh) hari, maka **PARA PIHAK** sepakat untuk menyelesaikan perselisihan melalui Instansi Terkait.', ML, y, TW, true)
  y += LH
  y = writeRichText('Surat perjanjian ini dibuat dalam rangkap 2 (dua) asli, yang mempunyai kekuatan hukum yang sama, 1 (satu) rangkap untuk **PIHAK PERTAMA**, 1 (satu) rangkap untuk **PIHAK KEDUA**, dan dibubuhi meterai secukupnya serta ditandatangani di Jakarta pada hari, tanggal, bulan dan tahun tersebut pada permulaan perjanjian ini.', ML, y, TW, true)

  // ────────── TANDA TANGAN ─────────────────────────────────────────────────
  if (y + LH * 8 > H - MB) { doc.addPage(); y = MT + 20 }
  y += LH * 2
  const colLeft  = ML + TW * 0.15
  const colRight = ML + TW * 0.85

  doc.setFont('helvetica', 'bold')
  doc.text('PIHAK KEDUA', colLeft, y, { align: 'center' })
  doc.text('PIHAK PERTAMA', colRight, y, { align: 'center' })
  y += LH * 6

  doc.text((intern.name || '_______________').toUpperCase(), colLeft, y, { align: 'center' })
  doc.text(p1Name, colRight, y, { align: 'center' })
  doc.setFont('helvetica', 'normal')

  // ────────── FOOTER & HEADER LOGO (Semua Halaman) ─────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    
    // --- Header Logo ---
    if (logoBase64) {
      // Rasio asli logo PLN Enjiniring: 1184 / 400 = 2.96
      const logoW = 55
      const logoH = logoW / 2.96
      // Posisi di kiri atas dengan sedikit offset dari margin atas agar tidak "mendek" (terlalu mepet)
      doc.addImage(logoBase64, 'PNG', ML, MT - 14, logoW, logoH)
    }

    // --- Footer ---
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100)
    const footerY = H - MB + 8
    doc.setLineWidth(0.3)
    doc.setDrawColor(150)
    doc.line(ML, footerY - 4, W - MR, footerY - 4)
    doc.text('PT Prima Layanan Nasional Enjiniring', ML, footerY + 4)
    doc.text(`Halaman ${i} dari ${pageCount}`, W - MR, footerY + 4, { align: 'right' })
    doc.setTextColor(0)
    doc.setDrawColor(0)
    doc.setFontSize(FS)
  }

  // ────────── DOWNLOAD ──────────────────────────────────────────────────────
  const safeName = (intern.name || 'Intern').replace(/\s+/g, '_')
  const yr = today?.tahun || new Date().getFullYear()
  doc.save(`SPM_${safeName}_${intern.periodStart || yr}.pdf`)
}

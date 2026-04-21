/**
 * kontrakUtils.js
 * Utility untuk pembuatan Surat Perjanjian Magang (SPM) otomatis.
 *
 * Spesifikasi Dokumen:
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
// Line height: 10pt × 1.15 × 0.352778mm/pt ≈ 4.057mm → pakai 4.1mm untuk keterbacaan
const LH   = FS * 1.15 * 0.352778  // ≈ 4.057 mm per line

// ─── Generate PDF ─────────────────────────────────────────────────────────────
export async function generateKontrakPDF(intern, nomorSurat, jsPDFLib) {
  const { jsPDF } = jsPDFLib
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const today    = parseTanggal(new Date().toISOString().split('T')[0])
  const start    = parseTanggal(intern.periodStart)
  const end      = parseTanggal(intern.periodEnd)
  const jangka   = formatJangkaWaktu(intern.periodStart, intern.periodEnd)
  const allowance = 25000
  const p1Name   = intern.supervisorName  || 'RIZKI YAYU FEBERINA'
  const p1Title  = intern.supervisorTitle || 'Vice President Sumber Daya Enjiniring dan Umum'
  const noSurat  = nomorSurat || `____.Pj/S.01.01/PLNE01100/${today?.tahun || '2026'}`

  // Muat logo
  const logoBase64 = await loadImageBase64('/images/logo-pln.png')

  // ── Setup font (Helvetica = Arial PDF equivalent) ──
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FS)

  let y = MT  // posisi y mulai dari margin atas

  // ────────── HELPER FUNCTIONS ──────────────────────────────────────────────

  // Tambah halaman baru jika mendekati batas bawah
  const checkPage = (neededHeight = LH * 3) => {
    if (y + neededHeight > H - MB) {
      doc.addPage()
      y = MT
    }
  }

  // Tulis paragraf justify dengan line spacing 1.15
  const writeParagraf = (text, indent = 0, bold = false) => {
    checkPage()
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(FS)
    const lines = doc.splitTextToSize(text, TW - indent)
    lines.forEach(line => {
      if (y + LH > H - MB) { doc.addPage(); y = MT }
      doc.text(line, ML + indent, y)
      y += LH
    })
    doc.setFont('helvetica', 'normal')
  }

  // Tulis teks dengan Bold inline (manual bold segments)
  const writeMixed = (segments) => {
    // segments = [{text, bold}]
    checkPage()
    // Simplified: render each segment on its own line if too complex, or join and write
    const full = segments.map(s => s.text).join('')
    writeParagraf(full)
  }

  // Spasi antar pasal
  const addSpace = (lines = 1) => { y += LH * lines }

  // ────────── HEADER ───────────────────────────────────────────────────────

  // Logo PLN (kiri atas)
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', ML, y - 4, 40, 14)
  } else {
    // Fallback teks jika logo gagal dimuat
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('PLN', ML, y)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Enjiniring', ML, y + 4.5)
    doc.setFontSize(FS)
  }

  // Judul di tengah
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('SURAT PERJANJIAN MAGANG', W / 2, y + 4, { align: 'center' })
  doc.setFontSize(FS)
  doc.text(`Nomor : ${noSurat}`, W / 2, y + 4 + LH, { align: 'center' })
  doc.setFont('helvetica', 'normal')

  y += 16 // geser y melewati header logo

  // Garis bawah header
  doc.setLineWidth(0.4)
  doc.line(ML, y, W - MR, y)
  y += LH * 1.5

  // ────────── PARAGRAF PEMBUKA ─────────────────────────────────────────────

  writeParagraf(
    `Perjanjian Magang ini dibuat dan ditandatangani di Jakarta pada hari ini ${today.hari} tanggal ${today.tanggalTerbilang} bulan ${today.bulan} tahun ${today.tahunTerbilang}, oleh dan antara :`
  )
  addSpace(0.5)

  // PIHAK PERTAMA
  writeParagraf(
    `1. PT PRIMA LAYANAN NASIONAL ENJINIRING ("PLN Enjiniring"), suatu Perseroan Terbatas yang didirikan berdasarkan Akta Notaris Haryanto, SH Nomor 9 tanggal 3 Oktober 2002 dan perubahan terakhir Akta Notaris Lenny Janis Ishak, SH Nomor 22 tanggal 12 Desember 2012 melalui pengesahan Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia Nomor AHU-05116.AH.01.02 Tahun 2013 tanggal 8 Februari 2013, dalam hal ini diwakili oleh ${p1Name}, selaku ${p1Title}, berkedudukan di Jl. Alpda KS Tubun I No.2 Jakarta 11420, yang selanjutnya disebut sebagai PIHAK PERTAMA; dan`
  )
  addSpace(0.5)

  // PIHAK KEDUA
  writeParagraf(
    `2. ${(intern.name || '_______________').toUpperCase()}, Pemegang identitas KTP Nomor ${intern.nik || '________________'}, ${intern.gender === 'Perempuan' ? 'bertempat tinggal' : 'beralamat'} di ${intern.address || '________________'}, dalam hal ini bertindak untuk dan atas nama sendiri yang selanjutnya dalam perjanjian ini disebut sebagai PIHAK KEDUA.`
  )
  addSpace(0.5)

  writeParagraf(
    `PIHAK PERTAMA dan PIHAK KEDUA masing-masing disebut PIHAK, dan secara bersama-sama disebut PARA PIHAK. Selanjutnya PARA PIHAK sepakat untuk menandatangani dan melaksanakan Perjanjian ini dengan ketentuan-ketentuan dan syarat-syarat sebagai berikut:`
  )
  addSpace(1)

  // ────────── HELPER: RENDER PASAL ────────────────────────────────────────

  const pasal = (nomor, judul, isi) => {
    checkPage(LH * 6)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(FS)
    doc.text(`Pasal ${nomor}`, W / 2, y, { align: 'center' })
    y += LH
    doc.text(judul, W / 2, y, { align: 'center' })
    y += LH * 1.2
    doc.setFont('helvetica', 'normal')
    isi.forEach(item => {
      if (!item) { y += LH * 0.4; return }
      checkPage()
      const indent = item.startsWith('   ') ? 6 : item.startsWith('  ') ? 4 : 0
      const cleaned = item.trimStart()
      const lines = doc.splitTextToSize(cleaned, TW - indent)
      lines.forEach(line => {
        if (y + LH > H - MB) { doc.addPage(); y = MT }
        doc.text(line, ML + indent, y)
        y += LH
      })
    })
    addSpace(0.8)
  }

  // ────────── PASAL 1 ──────────────────────────────────────────────────────
  pasal('1', 'PENEMPATAN', [
    `PIHAK PERTAMA bersedia menerima PIHAK KEDUA untuk Magang, dan PIHAK KEDUA bersedia Magang untuk memperoleh pengalaman dalam Bidang ${intern.bidang || '_______________'} di PT PLN Enjiniring.`
  ])

  // ────────── PASAL 2 ──────────────────────────────────────────────────────
  pasal('2', 'HAK DAN KEWAJIBAN', [
    '1. HAK PIHAK PERTAMA :',
    '   a. Memberhentikan PIHAK KEDUA apabila menyimpang dari ketentuan yang telah disepakati dalam Perjanjian Magang tanpa kompensasi;',
    '   b. Memanfaatkan hasil peserta Magang; dan',
    '   c. Memberlakukan Tata Tertib dan Perjanjian Magang.',
    '2. Penyimpangan sebagaimana dimaksud pada pasal (2) ayat (1) huruf a, meliputi:',
    '   a. Melakukan kelalaian dan tindakan yang tidak bertanggung jawab walaupun telah mendapat peringatan dari PIHAK PERTAMA; dan',
    '   b. PIHAK KEDUA melanggar dari ketentuan yang telah disepakati dalam Perjanjian Magang ini.',
    '3. KEWAJIBAN PIHAK PERTAMA :',
    '   a. Membimbing peserta Magang;',
    '   b. Memenuhi hak peserta Magang sesuai dengan Perjanjian Magang;',
    '   c. Mengevaluasi peserta Magang; dan',
    '   d. Memberikan Surat Keterangan Magang atau Sertifikat.',
    '4. HAK PIHAK KEDUA :',
    '   a. Memperoleh bimbingan dari pembimbing Magang; dan',
    '   b. Memperoleh Surat Keterangan Magang atau Sertifikat; dan',
    '5. KEWAJIBAN PIHAK KEDUA :',
    '   a. Mematuhi ketentuan yang telah disepakati dalam Perjanjian Magang;',
    '   b. Mengikuti program Magang sampai selesai;',
    '   c. Menjaga tata tertib yang berlaku di Perusahaan;',
    '   d. Menjaga sikap kepada pembimbing Magang; dan',
    '   e. Tidak menuntut untuk dijadikan karyawan di Perusahaan setelah selesai Magang.',
  ])

  // ────────── PASAL 3 ──────────────────────────────────────────────────────
  pasal('3', 'WAKTU PELAKSANAAN DAN PENGAKHIRAN PERJANJIAN', [
    `1. Jangka waktu pelaksanaan Magang terhitung tanggal ${jangka}.`,
    '2. Jika PIHAK KEDUA ingin menyelesaikan Perjanjian Magang sebelum jangka waktu berakhir, dapat menyampaikan surat pribadi kepada PIHAK PERTAMA minimal 7 (tujuh) hari sebelum hari aktif terakhir Magang; dan',
    '3. Tidak ada kompensasi dalam bentuk apapun terhadap pengakhiran perjanjian tersebut pada ayat di atas.',
  ])

  // ────────── PASAL 4 ──────────────────────────────────────────────────────
  pasal('4', 'PEMBAYARAN UANG SAKU', [
    `1. Uang saku untuk peserta Magang, adalah sebesar Rp. ${allowance.toLocaleString('id-ID')}/hari; dan`,
    '2. Uang saku dibayarkan berdasarkan kehadiran yang dibuktikan dengan Timesheet/Logbook/Daftar Hadir yang telah disetujui oleh PIHAK PERTAMA.',
  ])

  // ────────── PASAL 5 ──────────────────────────────────────────────────────
  pasal('5', 'HARI MAGANG', [
    'PIHAK KEDUA dalam melaksanakan Magang mengikuti aturan Hari Kerja dan Jam Kerja yang berlaku di lingkungan PIHAK PERTAMA sebagai berikut:',
    '   a. Hari Kerja  :  Senin sampai dengan Jumat;',
    '   b. Jam Kerja   :  07.30 sampai dengan 16.00 WIB (kecuali hari Jumat dari pukul 07.30 sampai dengan 16.30 WIB); dan',
    '   c. Pengaturan  :  Sesuai aturan yang berlaku di lingkungan kerja PIHAK PERTAMA.',
  ])

  // ────────── PASAL 6 ──────────────────────────────────────────────────────
  pasal('6', 'TATA TERTIB', [
    'PIHAK KEDUA bersedia untuk mentaati ketentuan yang berlaku di PLN Enjiniring, yaitu:',
    '   a. Melaksanakan semua tugas Magang dengan sebaik-baiknya;',
    '   b. Menjaga dan memelihara barang-barang milik Perusahaan dengan sebaik-baiknya;',
    '   c. Berpakaian rapi dan bersikap sopan santun; dan',
    '   d. Apabila tidak hadir harap memberi informasi kepada PIHAK PERTAMA.',
  ])

  // ────────── PASAL 7 ──────────────────────────────────────────────────────
  pasal('7', 'KERAHASIAAN', [
    '1. PIHAK KEDUA tidak boleh memberikan/menyampaikan kepada seseorang atau Pihak Lain segala informasi yang diperoleh PIHAK KEDUA atau yang ditemukan oleh PIHAK KEDUA dalam rangka Magang tanpa persetujuan tertulis dari PIHAK PERTAMA;',
    '2. PIHAK KEDUA wajib menjaga kerahasiaan dan tidak diperbolehkan untuk mempublikasikan seluruh daftar dokumen serta informasi yang dipinjamkan oleh PIHAK PERTAMA; dan',
    '3. PIHAK KEDUA bertanggung jawab terhadap kerugian PIHAK PERTAMA, sebagai akibat pelanggaran kerahasiaan data/dokumen yang dilakukan oleh PIHAK KEDUA.',
  ])

  // ────────── PASAL 8 ──────────────────────────────────────────────────────
  pasal('8', 'PENYELESAIAN PERSELISIHAN', [
    'Jika terjadi perselisihan antara PARA PIHAK maka akan diselesaikan secara musyawarah untuk mencapai mufakat dan Apabila melalui musyawarah tidak dapat diselesaikan dalam jangka waktu 30 (tiga puluh) hari, maka PARA PIHAK sepakat untuk menyelesaikan perselisihan melalui Instansi Terkait.',
    '',
    'Surat perjanjian ini dibuat dalam rangkap 2 (dua) asli, yang mempunyai kekuatan hukum yang sama, 1 (satu) rangkap untuk PIHAK PERTAMA, 1 (satu) rangkap untuk PIHAK KEDUA, dan dibubuhi meterai secukupnya serta ditandatangani di Jakarta pada hari, tanggal, bulan dan tahun tersebut pada permulaan perjanjian ini.',
  ])

  // ────────── TANDA TANGAN ─────────────────────────────────────────────────
  checkPage(LH * 8)
  addSpace(1)
  const colLeft  = ML + TW * 0.15
  const colRight = ML + TW * 0.65

  doc.text('PIHAK KEDUA', colLeft, y, { align: 'center' })
  doc.text('PIHAK PERTAMA', colRight, y, { align: 'center' })
  y += LH * 5  // ruang tanda tangan (5 baris)

  doc.setFont('helvetica', 'bold')
  doc.text((intern.name || '_______________').toUpperCase(), colLeft, y, { align: 'center' })
  doc.text(p1Name, colRight, y, { align: 'center' })
  doc.setFont('helvetica', 'normal')

  // ────────── FOOTER SETIAP HALAMAN ────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100)
    doc.line(ML, H - MB + 4, W - MR, H - MB + 4)
    doc.text('PT Prima Layanan Nasional Enjiniring', ML, H - MB + 8)
    doc.text(`Halaman ${i} dari ${pageCount}`, W - MR, H - MB + 8, { align: 'right' })
    doc.setTextColor(0)
    doc.setFontSize(FS)
  }

  // ────────── DOWNLOAD ──────────────────────────────────────────────────────
  const safeName = (intern.name || 'Intern').replace(/\s+/g, '_')
  const yr = today?.tahun || new Date().getFullYear()
  doc.save(`SPM_${safeName}_${intern.periodStart || yr}.pdf`)
}

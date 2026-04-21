/**
 * kontrakUtils.js
 * Utility untuk pembuatan Surat Perjanjian Magang (SPM) otomatis.
 * Menyediakan: terbilang(), formatTanggalIndonesia(), generateKontrakPDF()
 */

// ─── Terbilang (Angka → Kata) ───────────────────────────────────────────────
const SATUAN = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan',
  'Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas',
  'Enam Belas', 'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas']
const PULUHAN = ['', '', 'Dua Puluh', 'Tiga Puluh', 'Empat Puluh', 'Lima Puluh',
  'Enam Puluh', 'Tujuh Puluh', 'Delapan Puluh', 'Sembilan Puluh']

function terbilangRatusan(n) {
  if (n < 20) return SATUAN[n]
  if (n < 100) return PULUHAN[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + SATUAN[n % 10] : '')
  const ratus = Math.floor(n / 100)
  const sisa = n % 100
  const ratusStr = ratus === 1 ? 'Seratus' : SATUAN[ratus] + ' Ratus'
  return ratusStr + (sisa !== 0 ? ' ' + terbilangRatusan(sisa) : '')
}

export function terbilang(n) {
  if (n === 0) return 'Nol'
  if (n < 0) return 'Minus ' + terbilang(-n)
  if (n < 1000) return terbilangRatusan(n)
  if (n < 1000000) {
    const ribuan = Math.floor(n / 1000)
    const sisa = n % 1000
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

/**
 * Mengubah string tanggal (YYYY-MM-DD) menjadi objek dengan berbagai format
 * @param {string} dateStr - "2026-04-01"
 * @returns {{ hari, tanggal, tanggalTerbilang, bulan, tahun, tahunTerbilang, format, formatAdmin }}
 */
export function parseTanggal(dateStr) {
  if (!dateStr) return null
  // Parse tanpa timezone issue
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return {
    hari:           HARI_ID[date.getDay()],
    tanggal:        String(d).padStart(2, '0'),
    tanggalTerbilang: terbilang(d),
    bulan:          BULAN_ID[m],
    bulanAngka:     String(m).padStart(2, '0'),
    tahun:          String(y),
    tahunTerbilang: terbilang(y),
    // "01 April 2026"
    format:         `${String(d).padStart(2, '0')} ${BULAN_ID[m]} ${y}`,
    // "01 April 2026" (sama, dipakai di pasal)
    formatAdmin:    `${String(d).padStart(2, '0')} ${BULAN_ID[m]} ${y}`,
  }
}

/**
 * Format jangka waktu: "01 April 2026 s.d 01 Juli 2026"
 */
export function formatJangkaWaktu(periodStart, periodEnd) {
  const s = parseTanggal(periodStart)
  const e = parseTanggal(periodEnd)
  if (!s || !e) return '-'
  return `${s.format} s.d ${e.format}`
}

// ─── Generate PDF ────────────────────────────────────────────────────────────
/**
 * Membuat PDF Surat Perjanjian Magang menggunakan jsPDF
 * @param {object} intern  - data dari model Intern (prisma)
 * @param {string} nomorSurat - diisi manual oleh HR
 * @param {object} jsPDFLib - instance dari window.jspdf.jsPDF
 */
export function generateKontrakPDF(intern, nomorSurat, jsPDFLib) {
  const { jsPDF } = jsPDFLib
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const today   = parseTanggal(new Date().toISOString().split('T')[0])
  const start   = parseTanggal(intern.periodStart)
  const end     = parseTanggal(intern.periodEnd)
  const jangka  = formatJangkaWaktu(intern.periodStart, intern.periodEnd)
  const allowance = 25000

  // ── Dimensi & margin ──────────────────────────────
  const W = 210, ml = 20, mr = 20, tw = W - ml - mr // text width

  let y = 18

  // ─────── Header Logo + Nama Perusahaan ────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('PLN', ml, y)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Enjiniring', ml, y + 4)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('SURAT PERJANJIAN MAGANG', W / 2, y + 2, { align: 'center' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Nomor : ${nomorSurat || '______/PLNE/HC/____/____/2026'}`, W / 2, y + 8, { align: 'center' })

  // Garis bawah header
  y += 14
  doc.setLineWidth(0.5)
  doc.line(ml, y, W - mr, y)
  y += 8

  // ─────── Paragraf Pembuka ─────────────────────────
  doc.setFontSize(10)
  const pembuka = `Perjanjian Magang ini dibuat dan ditandatangani di Jakarta pada hari ini ${today.hari} tanggal ${today.tanggalTerbilang} bulan ${today.bulan} tahun ${today.tahunTerbilang}, oleh dan antara :`
  const pembukaSplit = doc.splitTextToSize(pembuka, tw)
  doc.text(pembukaSplit, ml, y)
  y += pembukaSplit.length * 5 + 4

  // ─────── PIHAK PERTAMA ────────────────────────────
  const p1Name = intern.supervisorName || 'RIZKI YAYU FEBERINA'
  const p1Title = intern.supervisorTitle || 'Vice President Sumber Daya Enjiniring dan Umum'
  const p1Text = `1. PT PRIMA LAYANAN NASIONAL ENJINIRING ("PLN Enjiniring"), suatu Perseroan Terbatas yang didirikan berdasarkan Akta Notaris Haryanto, SH Nomor 9 tanggal 3 Oktober 2002, berkedudukan di Jl. Alpda KS Tubun I No.2 Jakarta 11420, dalam hal ini diwakili oleh ${p1Name}, selaku ${p1Title}, selanjutnya disebut sebagai PIHAK PERTAMA; dan`
  const p1Split = doc.splitTextToSize(p1Text, tw)
  doc.text(p1Split, ml, y)
  y += p1Split.length * 5 + 4

  // ─────── PIHAK KEDUA ──────────────────────────────
  const p2Text = `2. ${intern.name?.toUpperCase() || '_______________'}, Pemegang identitas KTP Nomor ${intern.nik || '________________'}, beralamat di ${intern.address || '________________'}, dalam hal ini bertindak untuk dan atas nama sendiri yang selanjutnya dalam perjanjian ini disebut sebagai PIHAK KEDUA.`
  const p2Split = doc.splitTextToSize(p2Text, tw)
  doc.text(p2Split, ml, y)
  y += p2Split.length * 5 + 4

  // Keterangan para pihak
  const paraText = `PIHAK PERTAMA dan PIHAK KEDUA masing-masing disebut PIHAK, dan secara bersama-sama disebut PARA PIHAK. Selanjutnya PARA PIHAK sepakat untuk menandatangani dan melaksanakan Perjanjian ini dengan ketentuan-ketentuan dan syarat-syarat sebagai berikut:`
  const paraSplit = doc.splitTextToSize(paraText, tw)
  doc.text(paraSplit, ml, y)
  y += paraSplit.length * 5 + 6

  // ─────── PASAL-PASAL ──────────────────────────────
  const addPasal = (nomor, judul, items) => {
    if (y > 260) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(`Pasal ${nomor}`, W / 2, y, { align: 'center' })
    y += 5
    doc.text(judul, W / 2, y, { align: 'center' })
    y += 6
    doc.setFont('helvetica', 'normal')
    items.forEach(item => {
      if (y > 270) { doc.addPage(); y = 20 }
      const lines = doc.splitTextToSize(item, tw)
      doc.text(lines, ml, y)
      y += lines.length * 5 + 2
    })
    y += 3
  }

  addPasal('1', 'PENEMPATAN', [
    `PIHAK PERTAMA bersedia menerima PIHAK KEDUA untuk Magang, dan PIHAK KEDUA bersedia Magang untuk memperoleh pengalaman dalam Bidang ${intern.bidang || '_______________'} di PT PLN Enjiniring.`
  ])

  addPasal('2', 'HAK DAN KEWAJIBAN', [
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

  addPasal('3', 'WAKTU PELAKSANAAN DAN PENGAKHIRAN PERJANJIAN', [
    `1. Jangka waktu pelaksanaan Magang terhitung tanggal ${jangka}.`,
    '2. Jika PIHAK KEDUA ingin menyelesaikan Perjanjian Magang sebelum jangka waktu berakhir, dapat menyampaikan surat pribadi kepada PIHAK PERTAMA minimal 7 (tujuh) hari sebelum hari aktif terakhir Magang; dan',
    '3. Tidak ada kompensasi dalam bentuk apapun terhadap pengakhiran perjanjian tersebut pada ayat di atas.',
  ])

  addPasal('4', 'PEMBAYARAN UANG SAKU', [
    `1. Uang saku untuk peserta Magang, adalah sebesar Rp. ${allowance.toLocaleString('id-ID')}/hari; dan`,
    '2. Uang saku dibayarkan berdasarkan kehadiran yang dibuktikan dengan Timesheet/Logbook/Daftar Hadir yang telah disetujui oleh PIHAK PERTAMA.',
  ])

  addPasal('5', 'HARI MAGANG', [
    'PIHAK KEDUA dalam melaksanakan Magang mengikuti aturan Hari Kerja dan Jam Kerja yang berlaku di lingkungan PIHAK PERTAMA sebagai berikut:',
    '   a. Hari Kerja  :  Senin sampai dengan Jumat;',
    '   b. Jam Kerja   :  07.30 sampai dengan 16.00 WIB (kecuali hari Jumat dari pukul 07.30 sampai dengan 16.30 WIB); dan',
    '   c. Pengaturan  :  Sesuai aturan yang berlaku di lingkungan kerja PIHAK PERTAMA.',
  ])

  addPasal('6', 'TATA TERTIB', [
    'PIHAK KEDUA bersedia untuk mentaati ketentuan yang berlaku di PLN Enjiniring, yaitu:',
    '   a. Melaksanakan semua tugas Magang dengan sebaik-baiknya;',
    '   b. Menjaga dan memelihara barang-barang milik Perusahaan dengan sebaik-baiknya;',
    '   c. Berpakaian rapi dan bersikap sopan santun; dan',
    '   d. Apabila tidak hadir harap memberi informasi kepada PIHAK PERTAMA.',
  ])

  addPasal('7', 'KERAHASIAAN', [
    '1. PIHAK KEDUA tidak boleh memberikan/menyampaikan kepada seseorang atau Pihak Lain segala informasi yang diperoleh PIHAK KEDUA atau yang ditemukan oleh PIHAK KEDUA dalam rangka Magang tanpa persetujuan tertulis dari PIHAK PERTAMA;',
    '2. PIHAK KEDUA wajib menjaga kerahasiaan dan tidak diperbolehkan untuk mempublikasikan seluruh daftar dokumen serta informasi yang dipinjamkan oleh PIHAK PERTAMA; dan',
    '3. PIHAK KEDUA bertanggung jawab terhadap kerugian PIHAK PERTAMA, sebagai akibat pelanggaran kerahasiaan data/dokumen yang dilakukan oleh PIHAK KEDUA.',
  ])

  addPasal('8', 'PENYELESAIAN PERSELISIHAN', [
    'Jika terjadi perselisihan antara PARA PIHAK maka akan diselesaikan secara musyawarah untuk mencapai mufakat dan Apabila melalui musyawarah tidak dapat diselesaikan dalam jangka waktu 30 (tiga puluh) hari, maka PARA PIHAK sepakat untuk menyelesaikan perselisihan melalui Instansi Terkait.',
    '',
    'Surat perjanjian ini dibuat dalam rangkap 2 (dua) asli, yang mempunyai kekuatan hukum yang sama, 1 (satu) rangkap untuk PIHAK PERTAMA, 1 (satu) rangkap untuk PIHAK KEDUA, dan dibubuhi meterai secukupnya serta ditandatangani di Jakarta pada hari, tanggal, bulan dan tahun tersebut pada permulaan perjanjian ini.',
  ])

  // ─────── Tanda Tangan ─────────────────────────────
  if (y > 240) { doc.addPage(); y = 20 }
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.text('PIHAK KEDUA', ml + 10, y, { align: 'center' })
  doc.text('PIHAK PERTAMA', W - mr - 10, y, { align: 'center' })
  y += 30
  doc.setFont('helvetica', 'bold')
  doc.text(intern.name?.toUpperCase() || '_______________', ml + 10, y, { align: 'center' })
  doc.text(p1Name, W - mr - 10, y, { align: 'center' })

  // ─────── Footer setiap halaman ────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(128)
    doc.line(ml, 287, W - mr, 287)
    doc.text('PT Prima Layanan Nasional Enjiniring', ml, 291)
    doc.text(`Halaman ${i} dari ${pageCount}`, W - mr, 291, { align: 'right' })
    doc.setTextColor(0)
  }

  // ─────── Download ──────────────────────────────────
  const safeName = (intern.name || 'Intern').replace(/\s+/g, '_')
  doc.save(`SPM_${safeName}_${intern.periodStart || 'nodate'}.pdf`)
}

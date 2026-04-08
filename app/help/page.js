'use client'
import React, { useState } from 'react'
import { BookOpen, MapPin, Camera, FileText, Send, Lock, HelpCircle, Printer, Download, Clock } from 'lucide-react'

export default function HelpCenterPage() {
  const [activeAccordion, setActiveAccordion] = useState(null)

  const toggleAccordion = (idx) => {
    setActiveAccordion(prev => prev === idx ? null : idx)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      {/* ── HEADER ── */}
      <div className="print-hide" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 className="title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={24} strokeWidth={2} /> Pusat Bantuan
          </h1>
          <p className="subtitle">Buku panduan penggunaan sistem InternHub bagi mahasiswa magang.</p>
        </div>
        <button className="btn btn-secondary" onClick={handlePrint} style={{ gap: 8, fontWeight: 700 }}>
          <Download size={16} strokeWidth={2} /> Cetak / Download PDF
        </button>
      </div>

      {/* ── PRINT HEADER (Only visible when printing) ── */}
      <div className="print-only" style={{ textAlign: 'center', marginBottom: '2rem', display: 'none' }}>
        <h1 style={{ fontSize: '24pt', fontWeight: 900, marginBottom: '8pt', color: '#000' }}>PANDUAN INTERNHUB PLN ENJINIRING</h1>
        <p style={{ fontSize: '12pt', color: '#555' }}>Tata Cara Penggunaan Sistem Kehadiran & Pelaporan Anak Magang</p>
        <hr style={{ margin: '20pt 0', border: '1px solid #ddd' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* SECTION 1 */}
        <div className="card guide-card" style={{ padding: '2rem', pageBreakInside: 'avoid', borderLeft: '4px solid var(--primary)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '1.2rem', marginBottom: '1rem' }}>
            <Lock size={20} color="var(--primary)" /> 1. Mengakses Akun (Login)
          </h2>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <p style={{ marginBottom: '0.5rem' }}>Langkah awal setelah Anda diterima sebagai peserta magang adalah memastikan akun Anda dapat diakses.</p>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Buka website <strong>internhub-plne.vercel.app</strong> melalui browser (disarankan Chrome atau Safari).</li>
              <li>Gunakan <strong>Email Address</strong> yang telah Anda daftarkan.</li>
              <li>Masukkan password standar (default) jika belum pernah mengubahnya.</li>
              <li>Setelah berhasil login pertama kali, sistem akan memaksa Anda untuk mengubah password demi alasan keamanan. Masukkan password baru yang kuat.</li>
            </ul>
          </div>
        </div>

        {/* SECTION 2 */}
        <div className="card guide-card" style={{ padding: '2rem', pageBreakInside: 'avoid', borderLeft: '4px solid var(--primary)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '1.2rem', marginBottom: '1rem' }}>
            <Camera size={20} color="var(--primary)" /> 2. Melakukan Absensi Harian (Wajah & GPS)
          </h2>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <p style={{ marginBottom: '0.5rem' }}>Kehadiran dicatat menggunakan teknologi pengenal wajah berbasis AI yang memerlukan <strong>Izin Kamera</strong> dan <strong>Izin Lokasi (GPS)</strong>.</p>
            <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <li>Navigasi ke menu <strong>Absensi</strong>.</li>
              <li>Klik tombol <strong>Check In</strong> (Masuk) atau <strong>Check Out</strong> (Pulang).</li>
              <li>Browser mungkin akan memunculkan peringatan *"Allow Camera"* dan *"Allow Location"*. Klik <strong>Allow/Izinkan</strong>. Meleset mengizinkan hal ini membuat absensi tidak dapat dilanjutkan.</li>
              <li>Posisikan wajah Anda pada lingkaran panduan. Jika latar belakang terlalu gelap, AI mungkin tidak mendeteksi wajah Anda.</li>
              <li>Tunggu hingga kotak hijau bertuliskan "Wajah Terdeteksi" muncul, lalu klik "Ambil Foto".</li>
            </ol>
            <div style={{ background: 'var(--warning-light)', padding: '1rem', borderRadius: 'var(--radius-md)', color: 'var(--warning)' }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Clock size={16}/> Klaim Susulan</strong>
              Jika Anda terlupa melakukan absen, Anda dapat menekan tombol <strong>Klaim Absensi Terlewat</strong> di halaman Absensi, yang tersedia <strong>Maksimal H-1</strong>. Susulan tidak bisa dikerjakan di akhir pekan atau sebelum tanggal masa mulai magang Anda.
            </div>
          </div>
        </div>

        {/* SECTION 3 */}
        <div className="card guide-card" style={{ padding: '2rem', pageBreakInside: 'avoid', borderLeft: '4px solid var(--primary)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '1.2rem', marginBottom: '1rem' }}>
            <FileText size={20} color="var(--primary)" /> 3. Mengisi Laporan Harian
          </h2>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <p style={{ marginBottom: '0.5rem' }}>Anda diwajibkan menuliskan Ringkasan Kegiatan Harian (Logbook) pada setiap hari aktif kerja.</p>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Navigasi ke menu <strong>Laporan</strong>.</li>
              <li>Klik salah satu kotak kalender yang belum terisi di Grid, atau klik tombol <strong>+ Buat Laporan</strong>.</li>
              <li>Isilah *"Aktivitas hari ini"*, *"Pembimbing/Supervisor"*, *"Departemen/Bidang"*, dan opsional pada bagian Kendala / Skill.</li>
              <li>Klik <strong>Simpan Draft</strong> jika belum selesai, atau tombol <strong>Kirim</strong> untuk menyerahkan laporan tersebut secara resmi. Laporan yang sudah ditandai "Tercatat" (Sent) akan memengaruhi kalkulasi *Allowance* (Uang Saku) Anda.</li>
            </ul>
          </div>
        </div>

        {/* SECTION 4 */}
        <div className="card guide-card" style={{ padding: '2rem', pageBreakInside: 'avoid', borderLeft: '4px solid var(--primary)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '1.2rem', marginBottom: '1rem' }}>
            <Send size={20} color="var(--primary)" /> 4. Mengirimkan Feedback (Kendala Operasional)
          </h2>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <p style={{ marginBottom: '0.5rem' }}>Jika Anda menemukan kendala saat magang (seperti fasilitas, perizinan khusus, usulan), Anda dapat langsung menceritakannya ke Tim Admin HR.</p>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Navigasi ke menu <strong>Survei & Feedback</strong>.</li>
              <li>Pindah ke tab <strong>💡 Kirim Feedback Terbuka</strong>.</li>
              <li>Pilih kategori kendala, beri rating sentimen emoji, tuliskan kendalanya, centang bagian <em>Anonim</em> jika tidak ingin dikenali identitasnya, lalu kirim.</li>
              <li>Anda dapat menunggu pesan balasan dari pihak HR, dan bisa saling berbalas pesan hingga admin/Anda mengklik tombol <strong>Tandai Masalah Selesai</strong>.</li>
            </ul>
          </div>
        </div>

      </div>

      {/* ── PRINT CSS INJECTION ── */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { 
            background: #fff !important; 
            color: #000 !important;
            font-size: 11pt !important;
          }
          nav.sidebar, header.top-header, .print-hide, .theme-toggle { 
            display: none !important; 
          }
          .main-content {
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-only {
            display: block !important;
          }
          .card.guide-card {
            box-shadow: none !important;
            border: 1pt solid #ccc !important;
            border-left: 4pt solid #d97706 !important;
            break-inside: avoid;
            margin-bottom: 20pt;
          }
        }
      `}} />
    </div>
  )
}

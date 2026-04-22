'use client'
import React, { useState, useEffect } from 'react'
import { FileText, Download, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { parseTanggal, formatJangkaWaktu } from '@/lib/kontrakUtils'

/**
 * KontrakModal — Modal preview + generate PDF Surat Perjanjian Magang
 * Props:
 *   intern    : object dari model Intern
 *   onClose   : fungsi menutup modal
 */
export default function KontrakModal({ intern, onClose }) {
  const [nomorSurat, setNomorSurat] = useState('')
  const [generating, setGenerating] = useState(false)

  // Auto-generate suggested nomor surat
  useEffect(() => {
    const now = new Date()
    const yr = now.getFullYear()
    setNomorSurat(`____.Pj/S.01.01/PLNE01100/${yr}`)
  }, [])



  const handleDownload = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/kontrak/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intern, nomorSurat })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan internal')

      // Trigger download dari URL CloudConvert
      const link = document.createElement('a')
      link.href = data.pdfUrl
      link.download = data.filename || 'SPM_Intern.pdf'
      // Untuk pastikan download berjalan
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

    } catch (e) {
      console.error('Gagal generate PDF:', e)
      alert('Gagal membuat PDF: ' + e.message)
    } finally {
      setGenerating(false)
    }
  }

  const today  = parseTanggal(new Date().toISOString().split('T')[0])
  const jangka = formatJangkaWaktu(intern.periodStart, intern.periodEnd)

  // Data fields that will be auto-filled
  const fields = [
    { label: 'Nama Intern (PIHAK KEDUA)', value: intern.name?.toUpperCase() || '-', ok: !!intern.name },
    { label: 'NIK / No. KTP', value: intern.nik || '-', ok: !!intern.nik },
    { label: 'Alamat Lengkap', value: intern.address || '-', ok: !!intern.address },
    { label: 'Bidang Magang', value: intern.bidang || '-', ok: !!intern.bidang },
    { label: 'Program Studi / Jurusan', value: `${intern.major || '-'} (${intern.jenjang || '-'})`, ok: !!intern.major },
    { label: 'Jenis Kelamin', value: intern.gender || '-', ok: !!intern.gender },
    { label: 'Jangka Waktu', value: jangka, ok: !!intern.periodStart && !!intern.periodEnd },
    { label: 'Tanggal Surat (Otomatis)', value: `${today?.hari}, ${today?.tanggal} ${today?.bulan} ${today?.tahun}`, ok: true },
    { label: 'PIHAK PERTAMA (Pembimbing)', value: intern.supervisorName || 'RIZKI YAYU FEBERINA (Default)', ok: true },
  ]

  const missingFields = fields.filter(f => !f.ok)
  const isComplete = missingFields.length === 0

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div className="card" style={{
        width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto',
        animation: 'slideUpKontrak 0.3s cubic-bezier(0.34,1.56,0.64,1)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'var(--primary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FileText size={18} color="var(--primary)" />
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: '0.95rem' }}>Buat Surat Perjanjian Magang</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{intern.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Nomor Surat Input */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: 6 }}>
            Nomor Surat <span style={{ color: 'var(--danger)' }}>*</span>
            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>(isi angka urutan)</span>
          </label>
          <input
            type="text"
            className="input"
            value={nomorSurat}
            onChange={e => setNomorSurat(e.target.value)}
            placeholder="Contoh: 001/PLNE/HC/SPM/IV/2026"
          />
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Contoh: <code>0001.Pj/S.01.01/PLNE01100/2026</code> — ganti <code>____</code> dengan nomor urut.
          </p>
        </div>

        {/* Data yang akan diisi otomatis */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.05em' }}>
            Data yang akan diisi otomatis
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {fields.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '0.6rem 0.875rem',
                background: f.ok ? 'var(--bg-main)' : '#fef2f2',
                border: `1px solid ${f.ok ? 'var(--border)' : '#fecaca'}`,
                borderRadius: 8
              }}>
                {f.ok
                  ? <CheckCircle2 size={14} color="var(--secondary)" style={{ flexShrink: 0, marginTop: 1 }} />
                  : <AlertCircle size={14} color="var(--danger)" style={{ flexShrink: 0, marginTop: 1 }} />
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{f.label}</p>
                  <p style={{
                    fontSize: '0.82rem', fontWeight: 600, marginTop: 1,
                    color: f.ok ? 'var(--text-primary)' : 'var(--danger)',
                    wordBreak: 'break-word'
                  }}>{f.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warning jika ada data kosong */}
        {!isComplete && (
          <div style={{
            background: '#fef3c7', border: '1px solid #fbbf24',
            borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem',
            display: 'flex', alignItems: 'flex-start', gap: 8
          }}>
            <AlertCircle size={15} color="#b45309" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: '0.8rem', color: '#92400e' }}>
              <strong>{missingFields.length} data belum lengkap.</strong> PDF tetap bisa dibuat, namun bagian yang kosong akan tampil sebagai tanda <code>___</code>. Lengkapi data di profil intern untuk hasil terbaik.
            </p>
          </div>
        )}



        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Batal
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onClick={handleDownload}
            disabled={generating || !nomorSurat.trim()}
          >
            {generating
              ? <><Loader2 size={15} style={{ animation: 'spinKontrak 0.8s linear infinite' }} /> Memproses Template...</>
              : <><Download size={15} /> Download PDF Kontrak</>
            }
          </button>
        </div>

        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
          PDF akan otomatis terunduh ke perangkat Anda. Dokumen ini perlu dicetak dan ditandatangani kedua pihak.
        </p>
      </div>

      <style>{`
        @keyframes slideUpKontrak {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spinKontrak { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

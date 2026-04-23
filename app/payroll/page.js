'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Wallet, Clock, CheckCircle2, Banknote, Download,
  RefreshCw, ChevronDown, ChevronUp, AlertCircle, 
  TrendingUp, CalendarDays, ExternalLink, Printer,
  History, CreditCard, ShieldCheck
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import Swal from 'sweetalert2'
import { useRouter } from 'next/navigation'

/* ── Format helpers ───────────────────────────────── */
const idr = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0)

const MONTHS = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1
const YEARS = Array.from({ length: 3 }, (_, i) => currentYear - 1 + i)

/* ── Opsi Slip Dihilangkan Sesuai Instruksi ────────── */

/* ── Main Page ────────────────────────────────────── */
export default function InternAllowancePage() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [proofFile, setProofFile] = useState(null)
  const router = useRouter()

  const fetchPersonalAllowance = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll?startDate=${startDate}&endDate=${endDate}&userId=${user.id}`)
      const json = await res.json()
      setData(json.data?.[0] || null)
    } catch {
      Swal.fire('Error', 'Gagal memuat data allowance.', 'error')
    } finally {
      setLoading(false)
    }
  }, [user?.id, startDate, endDate])

  useEffect(() => { fetchPersonalAllowance() }, [fetchPersonalAllowance])

  const handleConfirm = async () => {
    if (!data?.id) return
    if (!proofFile) {
      return Swal.fire('Perhatian', 'Bukti transfer wajib diunggah!', 'warning')
    }

    setLoading(true)
    try {
      const reader = new FileReader()
      reader.readAsDataURL(proofFile)
      reader.onload = async () => {
        const base64 = reader.result
        const res = await fetch('/api/payroll', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: data.id, proofBase64: base64 })
        })
        const result = await res.json()
        if (result.success) {
          Swal.fire('Berhasil Terkonfirmasi!', 'Terima kasih telah mengkonfirmasi penerimaan uang saku Anda.', 'success')
          setProofFile(null)
          fetchPersonalAllowance()
        } else {
          throw new Error(result.error)
        }
      }
    } catch {
      Swal.fire('Gagal', 'Terjadi kesalahan saat mengkonfirmasi.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleComplain = () => {
    Swal.fire({
      title: 'Belum Terima Uang?',
      text: 'Anda akan diarahkan ke halaman Survei untuk mengisi laporan kendala penerimaan uang saku.',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Ya, Lapor Sekarang',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        router.push('/surveys?type=payroll_issue')
      }
    })
  }

  const fmtPeriod = (d) => {
    if (!d) return ''
    const options = { day: '2-digit', month: 'short', year: 'numeric' }
    return new Date(d).toLocaleDateString('id-ID', options)
  }

  const periodLabel = `${fmtPeriod(startDate)} - ${fmtPeriod(endDate)}`

  return (
    <div className="allowance-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="title" style={{ display:'flex', alignItems:'center', gap:12 }}>
            <Wallet size={28} className="text-primary" /> Allowance & Uang Saku
          </h1>
          <p className="subtitle">Lihat akumulasi pendapatan Anda berdasarkan kehadiran harian.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchPersonalAllowance} disabled={loading}>
          <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {data?.status === 'TRANSFERRED' && (
        <div style={{ background: '#e0f2fe', border: '1px solid #7dd3fc', padding: '1.5rem', borderRadius: 12, marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ color: '#0369a1', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={18} /> Dana Telah Diajukan
            </h4>
            <p style={{ color: '#0c4a6e', fontSize: '0.85rem', marginTop: 4 }}>
              Admin mengkonfirmasi bahwa uang saku Anda sudah diajukan/ditransfer. Mohon cek mutasi rekening Anda.
            </p>
          </div>
          
          <div style={{ background: '#fff', padding: '1rem', borderRadius: 8, border: '1px dashed #7dd3fc' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0369a1', marginBottom: '0.5rem' }}>Upload Bukti Mutasi / Transfer (Wajib)</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={e => setProofFile(e.target.files[0])}
              style={{ fontSize: '0.8rem', color: '#0c4a6e', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" style={{ background: '#0284c7', flex: 1 }} onClick={handleConfirm} disabled={loading || !proofFile}>
              <CheckCircle2 size={16} /> Sudah Menerima Uang
            </button>
            <button className="btn btn-secondary" style={{ flex: 1, color: '#b91c1c', borderColor: '#fca5a5' }} onClick={handleComplain} disabled={loading}>
              <AlertCircle size={16} /> Belum Terima Uang
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Card */}
        <div className="lg:col-span-2">
           <div className="card" style={{ 
             background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', 
             color: '#fff', 
             padding: '2.5rem',
             position: 'relative',
             overflow: 'hidden',
             border: 'none',
             boxShadow: '0 20px 40px rgba(79,70,229,0.2)'
           }}>
              <div style={{ position:'absolute', top:'-20px', right:'-20px', width:150, height:150, background:'rgba(255,255,255,0.1)', borderRadius:'50%' }} />
              <div style={{ position:'relative', zIndex:1 }}>
                 <div className="flex justify-between items-center mb-10">
                    <div>
                      <p style={{ fontSize:'0.8rem', opacity:0.8, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Estimasi Allowance — {periodLabel}</p>
                      <h2 style={{ fontSize:'3rem', fontWeight:900, marginTop:8 }}>{idr(data?.totalAllowance || 0)}</h2>
                    </div>
                    <div style={{ background:'rgba(255,255,255,0.2)', padding:15, borderRadius:15, backdropFilter:'blur(10px)' }}>
                       <Banknote size={32} />
                    </div>
                 </div>

                 <div className="grid grid-cols-3 gap-4">
                    <div style={{ background:'rgba(0,0,0,0.15)', padding:'1rem', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.1)' }}>
                       <p style={{ fontSize:'0.65rem', opacity:0.7, fontWeight:800, marginBottom:4 }}>HADIR VALID</p>
                       <p style={{ fontSize:'1.2rem', fontWeight:800 }}>{data?.validPresenceCount || 0} <span style={{fontSize:'0.8rem'}}>Hari</span></p>
                    </div>
                    <div style={{ background:'rgba(0,0,0,0.15)', padding:'1rem', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.1)' }}>
                       <p style={{ fontSize:'0.65rem', opacity:0.7, fontWeight:800, marginBottom:4 }}>TARIF FLAT</p>
                       <p style={{ fontSize:'1.2rem', fontWeight:800 }}>25K <span style={{fontSize:'0.8rem'}}>/ Hari</span></p>
                    </div>
                    <div style={{ background:'rgba(0,0,0,0.15)', padding:'1rem', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.1)' }}>
                       <p style={{ fontSize:'0.65rem', opacity:0.7, fontWeight:800, marginBottom:4 }}>STATUS</p>
                       <p style={{ fontSize:'0.85rem', fontWeight:900, background: data?.status === 'PAID' ? '#10b981' : data?.status === 'TRANSFERRED' ? '#0284c7' : '#f59e0b', padding:'3px 8px', borderRadius:6, textAlign:'center' }}>
                         {data?.status === 'PAID' ? 'DITERIMA (PAID)' : data?.status === 'TRANSFERRED' ? 'SUDAH DIAJUKAN' : 'PENDING'}
                       </p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Detail Breakdown */}
           <div className="card mt-6">
              <h3 style={{ fontWeight:800, fontSize:'1rem', marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
                <Clock size={18} className="text-primary" /> Rincian Aktivitas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div style={{ padding:'1.25rem', border:'1.5px dashed var(--border)', borderRadius:16 }}>
                    <div className="flex items-center gap-3 mb-3">
                       <CheckCircle2 className="text-secondary" size={18} />
                       <span style={{ fontWeight:700, fontSize:'0.9rem' }}>Kehadiran Berhasil</span>
                    </div>
                    <p style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}>
                      Anda tercatat hadir <strong>{data?.presenceCount || 0} hari</strong> di sistem. Namun hanya kehadiran dengan <strong>laporan harian</strong> yang akan dihitung sebagai uang saku.
                    </p>
                 </div>
                 <div style={{ padding:'1.25rem', border:'1.5px dashed var(--border)', borderRadius:16 }}>
                    <div className="flex items-center gap-3 mb-3">
                       <AlertCircle className="text-danger" size={18} />
                       <span style={{ fontWeight:700, fontSize:'0.9rem' }}>Laporan Belum Disetor</span>
                    </div>
                    <p style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}>
                      Terdapat <strong>{data?.missingReportsCount || 0} hari</strong> di mana Anda tidak mengisi laporan harian. Segera lengkapi laporan Anda agar masuk dalam hitungan gaji!
                    </p>
                 </div>
              </div>

              {data?.status === 'PAID' && (
                <div style={{ marginTop:25, borderTop:'1px solid var(--border)', paddingTop:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                   <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <ShieldCheck className="text-secondary" size={20} />
                      <div>
                        <p style={{ fontSize:'0.85rem', fontWeight:800, color:'var(--secondary)' }}>Telah Anda Konfirmasi</p>
                        <p style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>Pada {new Date(data.paidAt).toLocaleDateString('id-ID')} · Oleh Anda (Intern)</p>
                      </div>
                   </div>
                   <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                       <Clock className="text-primary" size={20} />
                       <div>
                         <p style={{ fontSize:'0.85rem', fontWeight:800, color:'var(--primary)' }}>Status Allowance</p>
                         <p style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>Disetujui oleh Admin</p>
                       </div>
                   </div>
                </div>
              )}
           </div>
        </div>

        {/* Sidebar Filters & Info */}
        <div className="flex flex-col gap-6">
           <div className="card">
              <h3 style={{ fontWeight:800, fontSize:'1rem', marginBottom:15, display:'flex', alignItems:'center', gap:10 }}>
                <CalendarDays size={18} className="text-primary" /> Filter Periode
              </h3>
              <div className="form-group">
                <label className="label">Tanggal Mulai</label>
                <input 
                  type="date" 
                  className="input" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  style={{ background:'var(--bg-main)', color:'var(--text)', border:'1px solid var(--border)', padding:'8px', borderRadius:'8px', width:'100%' }}
                />
              </div>
              <div className="form-group mt-3">
                <label className="label">Tanggal Selesai</label>
                <input 
                  type="date" 
                  className="input" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  style={{ background:'var(--bg-main)', color:'var(--text)', border:'1px solid var(--border)', padding:'8px', borderRadius:'8px', width:'100%' }}
                />
              </div>
           </div>

           <div className="card" style={{ background:'var(--bg-main)', border:'1px solid var(--border)' }}>
              <div className="flex items-center gap-3 mb-4">
                 <TrendingUp className="text-primary" size={18} />
                 <h4 style={{ fontWeight:800, fontSize:'0.85rem' }}>INFO GAJI (GAJI FLAT)</h4>
              </div>
              <p style={{ fontSize:'0.75rem', lineHeight:1.6, color:'var(--text-secondary)' }}>
                Sesuai kebijakan terbaru, seluruh intern tanpa memandang jenjang mendapatkan uang saku sebesar <strong>Rp25.000 per kehadiran valid</strong>. <br/><br/>
                Kehadiran valid didefinisikan sebagai hari di mana status absensi adalah <strong>PRESENT</strong> dan telah men-submit <strong>Laporan Harian</strong>.
              </p>
           </div>

           <div className="card" style={{ padding: '1rem', textAlign:'center' }}>
              <CreditCard size={32} style={{ margin:'0 auto 12px', opacity:0.3 }} />
              <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Butuh bantuan terkait pembayaran? Hubungi <strong>Divisi Keuangan HR</strong>.</p>
           </div>
        </div>
      </div>

      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

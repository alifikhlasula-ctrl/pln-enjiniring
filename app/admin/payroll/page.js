'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Wallet, Clock, CheckCircle2, Banknote, Download,
  FileSpreadsheet, RefreshCw, ChevronDown, ChevronUp,
  X, Loader2, AlertCircle, TrendingUp, CalendarDays, 
  Filter, SquareCheck, Square, Printer
} from 'lucide-react'
import Swal from 'sweetalert2'

/* ── Format helpers ───────────────────────────────── */
const idr = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0)

const MONTHS = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1
const YEARS = Array.from({ length: 4 }, (_, i) => currentYear - 1 + i)

/* ── Fitur Cetak Slip ditiadakan. ────────────────────── */

/* ── Stat Card ────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color, bg }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-3)' }}>
        <div className="stat-icon-wrap" style={{ background: bg, color }}>{icon}</div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

/* ── Main Admin Page ──────────────────────────────── */
export default function AdminPayrollPage() {
  const [data, setData] = useState([])
  const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0, countPaid: 0, countPending: 0 })
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(currentYear, currentMonth - 1, 1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(currentYear, currentMonth, 0)
    return d.toISOString().split('T')[0]
  })
  const [selected, setSelected] = useState([])
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [expandedRow, setExpandedRow] = useState(null)
  const [search, setSearch] = useState('')

  const fetchPayroll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll?startDate=${startDate}&endDate=${endDate}`)
      const json = await res.json()
      setData(json.data || [])
      setSummary(json.summary || {})
      setSelected([])
    } catch {
      Swal.fire('Error', 'Gagal memuat data payroll.', 'error')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => { fetchPayroll() }, [fetchPayroll])

  const periodLabel = `${new Date(startDate).toLocaleDateString('id-ID', {day:'numeric',month:'short'})} - ${new Date(endDate).toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'})}`
  const periodKey = `${startDate}_${endDate}`

  const filteredData = data.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.university.toLowerCase().includes(search.toLowerCase()) ||
    d.bidang?.toLowerCase().includes(search.toLowerCase())
  )

  const toggleSelect = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const toggleAll = () =>
    setSelected(selected.length === filteredData.length ? [] : filteredData.map(d => d.internId))

  const pendingSelected = selected.filter(id => {
    const item = data.find(d => d.internId === id)
    return item?.status === 'PENDING'
  })

  const confirmBulkPay = async () => {
    setShowNotes(false)
    setProcessing(true)
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internIds: pendingSelected, period: periodKey, notes, processedBy: 'Admin HR' })
      })
      const result = await res.json()
      if (result.success) {
        Swal.fire('Berhasil!', `Pembayaran berhasil diproses untuk ${result.processed} intern.`, 'success')
        fetchPayroll()
        setNotes('')
      }
    } catch {
      Swal.fire('Gagal', 'Terjadi kesalahan sistem.', 'error')
    } finally {
      setProcessing(false)
    }
  }

  /* ── Export Excel (Server-Side) ── */
  const exportExcel = async () => {
    setProcessing(true)
    const url = `/api/payroll?startDate=${startDate}&endDate=${endDate}&format=excel&t=${Date.now()}&ext=.xlsx`
    
    try {
      // Use hidden anchor for direct server download
      const a = document.createElement('a')
      a.href = url
      a.download = `Payroll_${startDate}_to_${endDate}.xlsx` // Fallback name
      document.body.appendChild(a)
      a.click()
      setTimeout(() => document.body.removeChild(a), 100)

      Swal.fire({ icon: 'success', title: 'Excel Berhasil!', text: 'Data payroll sedang diunduh.', timer: 1500, showConfirmButton: false })
    } catch (e) {
      console.error('Payroll export error:', e)
      Swal.fire('Error', 'Gagal export Excel.', 'error')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Banknote size={28} className="text-primary" /> Kelola Payroll HR
          </h1>
          <p className="subtitle">Lakukan rekapitulasi dan pembayaran allowance seluruh intern.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={fetchPayroll} disabled={loading}>
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button className="btn btn-secondary" onClick={exportExcel}>
            <FileSpreadsheet size={15} /> Export Excel
          </button>
          {pendingSelected.length > 0 && (
            <button className="btn btn-primary" onClick={() => setShowNotes(true)} disabled={processing}>
              <CheckCircle2 size={15} /> Bayar {pendingSelected.length} Terpilih
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card md:col-span-1" style={{ padding: '1rem' }}>
           <label className="label" style={{ fontSize: '0.7rem', marginBottom: 8, display: 'block' }}>Pilih Rentang Tanggal</label>
           <div className="flex gap-2">
             <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '0.5rem', flex: 1 }} />
             <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '0.5rem', flex: 1 }} />
           </div>
        </div>
        <div className="card md:col-span-3" style={{ padding: '1rem', display:'flex', alignItems:'center' }}>
           <div style={{ position: 'relative', width: '100%' }}>
             <Filter size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
             <input 
               type="text" 
               className="input" 
               placeholder="Cari berdasarkan nama, universitas, atau bidang..." 
               value={search}
               onChange={e => setSearch(e.target.value)}
               style={{ paddingLeft: '2.5rem' }}
             />
           </div>
        </div>
      </div>

      <div className="stat-grid mb-6">
        <StatCard
          icon={<Wallet size={19} />}
          label="Anggaran Periode Ini"
          value={idr(summary.total)}
          sub={`${data.length} intern aktif`}
          color="var(--primary)" bg="var(--primary-light)"
        />
        <StatCard
          icon={<CheckCircle2 size={19} />}
          label="Sudah Dikonfirmasi"
          value={idr(summary.paid)}
          sub={`${summary.countPaid} intern`}
          color="var(--success)" bg="var(--success-light)"
        />
        <StatCard
          icon={<Clock size={19} />}
          label="Sdg. Ditransfer (Perlu Konfirmasi)"
          value={idr(data.filter(p => p.status === 'TRANSFERRED').reduce((s, p) => s + p.totalAllowance, 0))}
          sub={`${data.filter(p => p.status === 'TRANSFERRED').length} intern`}
          color="var(--warning)" bg="var(--warning-light)"
        />
        <StatCard
          icon={<TrendingUp size={19} />}
          label="Belum Ditransfer"
          value={idr(summary.pending)}
          sub={`${summary.countPending} intern menunggu`}
          color="var(--danger)" bg="var(--danger-light)"
        />
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <button onClick={toggleAll} style={{ background:'none', border:'none', cursor:'pointer' }}>
                    {selected.length === filteredData.length && filteredData.length > 0 ? <SquareCheck size={18} className="text-primary" /> : <Square size={18} />}
                  </button>
                </th>
                <th>Informasi Peserta</th>
                <th>Presensi Valid</th>
                <th>Tarif (Flat)</th>
                <th>Total Allowance</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign:'center', padding:'4rem' }}><Loader2 className="spin" /> Memuat data...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign:'center', padding:'4rem' }}>Data tidak ditemukan.</td></tr>
              ) : filteredData.map(item => (
                <React.Fragment key={item.internId}>
                  <tr style={{ background: selected.includes(item.internId) ? 'var(--primary-light)' : '' }}>
                    <td>
                      <button onClick={() => toggleSelect(item.internId)} style={{ background:'none', border:'none', cursor:'pointer' }}>
                        {selected.includes(item.internId) ? <SquareCheck size={16} className="text-primary" /> : <Square size={16} />}
                      </button>
                    </td>
                    <td>
                      <p style={{ fontWeight: 700 }}>{item.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.university} · {item.bidang || '-'}</p>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{item.validPresenceCount}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}> hr</span>
                      {item.missingReportsCount > 0 && (
                        <p style={{ fontSize:'0.65rem', color:'var(--danger)', fontWeight:700 }}>⚠️ {item.missingReportsCount} Lap. Kosong</p>
                      )}
                    </td>
                    <td>{idr(item.allowanceRate)}</td>
                    <td><span style={{ fontWeight: 800 }}>{idr(item.totalAllowance)}</span></td>
                    <td>
                      <span className={`badge ${item.status === 'PAID' ? 'badge-success' : item.status === 'TRANSFERRED' ? 'badge-info' : 'badge-warning'}`}
                        style={{
                          backgroundColor: item.status === 'TRANSFERRED' ? '#e0f2fe' : undefined,
                          color: item.status === 'TRANSFERRED' ? '#0369a1' : undefined,
                          borderColor: item.status === 'TRANSFERRED' ? '#7dd3fc' : undefined
                        }}
                      >
                        {item.status === 'PAID' ? 'TERIMA' : item.status === 'TRANSFERRED' ? 'DITRANSFER' : 'PENDING'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {item.status === 'PAID' || item.status === 'TRANSFERRED' ? (
                           <button className="btn btn-sm btn-secondary" onClick={() => setExpandedRow(expandedRow === item.internId ? null : item.internId)}>
                             Detail
                           </button>
                        ) : (
                          <button className="btn btn-sm" style={{ background:'var(--secondary)', color:'#fff' }} onClick={() => setSelected([item.internId]) || setShowNotes(true)}>
                            Bayar
                          </button>
                        )}
                        <button className="btn btn-sm btn-secondary" onClick={() => setExpandedRow(expandedRow === item.internId ? null : item.internId)}>
                          {expandedRow === item.internId ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRow === item.internId && (
                    <tr style={{ background: 'var(--bg-main)' }}>
                      <td colSpan={7} style={{ padding: '1rem' }}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="card" style={{ padding: '0.75rem' }}>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800 }}>TOTAL PRESENSI</p>
                            <p style={{ fontWeight: 700 }}>{item.presenceCount} Hari</p>
                          </div>
                          <div className="card" style={{ padding: '0.75rem' }}>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800 }}>DIBAYARKAN OLEH</p>
                            <p style={{ fontWeight: 700 }}>{item.paidBy || '-'}</p>
                          </div>
                          <div className="card" style={{ padding: '0.75rem' }}>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800 }}>TANGGAL BAYAR</p>
                            <p style={{ fontWeight: 700 }}>{item.paidAt ? new Date(item.paidAt).toLocaleDateString('id-ID') : '-'}</p>
                          </div>
                          <div className="card" style={{ padding: '0.75rem' }}>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800 }}>CATATAN</p>
                            <p style={{ fontWeight: 700 }}>{item.notes || '-'}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNotes && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', justifyContent:'center', alignItems:'center' }}>
          <div className="card" style={{ width:'90%', maxWidth:400, padding:'2rem', animation:'scaleUp 0.2s' }}>
             <h3 style={{ fontWeight:800, marginBottom:12 }}>Konfirmasi Pembayaran</h3>
             <p style={{ fontSize:'0.85rem', color:'var(--text-secondary)', marginBottom:20 }}>Memproses total allowance untuk <strong>{pendingSelected.length || 1} orang</strong> periode {periodLabel}.</p>
             <div className="form-group">
               <label className="label">Catatan Admin (Opsional)</label>
               <textarea className="input" rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Tulis catatan transfer atau referensi batch..." />
             </div>
             <div className="flex gap-2 mt-6">
                <button className="btn btn-secondary flex-1" onClick={()=>setShowNotes(false)}>Batal</button>
                <button className="btn btn-primary flex-1" onClick={confirmBulkPay} style={{ background:'var(--secondary)' }}>
                  {processing ? <Loader2 className="spin" size={16}/> : 'Ya, Bayar Sekarang'}
                </button>
             </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scaleUp { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
      `}</style>
    </div>
  )
}

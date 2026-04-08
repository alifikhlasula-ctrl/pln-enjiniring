'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { 
  FileText, Search, Printer, Download, RefreshCw, 
  User, Calendar, Briefcase, CheckCircle2, Clock, 
  MapPin, GraduationCap, X, ChevronRight, XCircle
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import Swal from 'sweetalert2'

const fmtDate = dt => dt ? new Date(dt).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) : '-'

export default function AdminReportsPage() {
  const { user } = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [exportModal, setExportModal] = useState(false)
  const [exportRange, setExportRange] = useState({ start: '', end: '' })
  
  // State for drill-down
  const [selectedUserId, setSelectedUserId] = useState(null)
  
  const fetchAllReports = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reports') // GET all reports
      const data = await res.json()
      setReports(data.reports || [])
    } catch (e) {
      console.error(e)
      Swal.fire('Error', 'Gagal memuat data laporan', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.role === 'ADMIN_HR') fetchAllReports()
  }, [user, fetchAllReports])

  const rejectAndNotify = async (rep) => {
    const { isConfirmed } = await Swal.fire({
      title: 'Tolak Laporan?',
      text: `Laporan ${rep.internName} pada ${fmtDate(rep.date || rep.reportDate)} akan dihapus dan intern akan diminta input ulang.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      confirmButtonText: 'Ya, Tolak & Hapus',
      cancelButtonText: 'Batal'
    })

    if (isConfirmed) {
      try {
        // 1. Delete the report
        await fetch(`/api/reports?id=${rep.id}`, { method: 'DELETE' })
        
        // 2. Create notification for intern
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            severity: 'HIGH',
            title: 'Laporan Perlu di Input Ulang',
            detail: `Admin HR menolak laporan Anda tanggal ${fmtDate(rep.date || rep.reportDate)}. Silakan isi kembali dengan data yang benar.`,
            link: '/reports'
          })
        })

        Swal.fire('Berhasil', 'Laporan ditolak dan notifikasi telah dikirim.', 'success')
        fetchAllReports()
      } catch (err) {
        Swal.fire('Error', 'Gagal memproses penolakan.', 'error')
      }
    }
  }

  const handleExportGlobalPDF = async (e) => {
    e.preventDefault()
    try {
      Swal.fire({ title: 'Menyiapkan Data Rekap...', didOpen: () => Swal.showLoading() })
      
      const { start, end } = exportRange
      if (!start || !end) return Swal.fire('Error', 'Harap isi Range Tanggal', 'error')

      let targetReps = reports.filter(r => {
        const d = r.date || r.reportDate
        return d >= start && d <= end
      })
      if (searchTerm) {
        targetReps = targetReps.filter(r => r.internName?.toLowerCase().includes(searchTerm.toLowerCase()))
      }
      targetReps.sort((a, b) => new Date(a.date || a.reportDate) - new Date(b.date || b.reportDate))

      if (targetReps.length === 0) {
        return Swal.fire('Kosong', 'Tidak ada laporan di rentang tersebut (Cek filter Nama)', 'info')
      }

      // Fetch attendance data
      const uids = [...new Set(targetReps.map(r => r.userId))]
      const attMap = {}
      for (const uid of uids) {
        const aRes = await fetch(`/api/attendance?userId=${uid}`)
        const aLogs = await aRes.json()
        attMap[uid] = aLogs || []
      }

      // Call server-side PDF generation for robust filename preservation
      const fileName = `Rekap_Laporan_${start}_to_${end}.pdf`
      const url = `/api/reports/export?startDate=${start}&endDate=${end}&format=pdf&t=${Date.now()}`
      
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      setTimeout(() => document.body.removeChild(a), 100)

      Swal.close()
      setExportModal(false)
      Swal.fire({ icon: 'success', title: 'PDF Berhasil!', text: 'Laporan sedang diunduh.', timer: 2000, showConfirmButton: false })
    } catch (err) {
      console.error('PDF export error:', err)
      Swal.fire('Error', 'Gagal ekspor PDF.', 'error')
    }
  }

  // Filtering & Grouping Logic
  const filtered = (reports || []).filter(r => {
    const matchesSearch = r.internName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (r.activity || r.content)?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDate = !dateFilter || (r.date || r.reportDate) === dateFilter
    return matchesSearch && matchesDate
  })

  // Group by Intern
  const internGroups = filtered.reduce((acc, rep) => {
    const uid = rep.userId
    if (!acc[uid]) {
      acc[uid] = {
        userId: uid,
        name: rep.internName || 'Intern',
        nim_nis: rep.nim_nis || '-',
        field: rep.field || '-',
        supervisor: rep.supervisor || '-',
        reports: []
      }
    }
    acc[uid].reports.push(rep)
    return acc
  }, {})

  const internList = Object.values(internGroups).sort((a,b) => a.name.localeCompare(b.name))
  const selectedIntern = selectedUserId ? internGroups[selectedUserId] : null

  return (
    <div className="container" style={{paddingBottom:'4rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'2rem',flexWrap:'wrap',gap:'1rem'}}>
        <div>
          <h1 className="title" style={{display:'flex',alignItems:'center',gap:10}}><FileText size={24} strokeWidth={2.5} color="var(--primary)"/> Monitor Laporan Harian</h1>
          <p className="subtitle">Pantau aktivitas harian per individu peserta magang.</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button className="btn btn-secondary" onClick={()=>setExportModal(true)}>
             <Printer size={14} style={{marginRight:6}}/> Cetak PDF Penuh
          </button>
          <button className="btn btn-primary" onClick={fetchAllReports} disabled={loading}>
            <RefreshCw size={14} className={loading?'spin':''} style={{marginRight:6}}/> Segarkan
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4" style={{display:'flex',gap:'1rem',alignItems:'center',flexWrap:'wrap', background:'var(--bg-card)'}}>
        <div style={{flex:1,minWidth:250,position:'relative'}}>
          <Search size={16} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}}/>
          <input type="text" className="input" placeholder="Cari nama peserta atau isi laporan..." style={{paddingLeft:40}} value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
        </div>
        <div style={{width:200,position:'relative'}}>
          <Calendar size={16} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}}/>
          <input type="date" className="input" style={{paddingLeft:40}} value={dateFilter} onChange={e=>setDateFilter(e.target.value)}/>
        </div>
        {(searchTerm || dateFilter) && (
          <button className="btn btn-secondary btn-sm" onClick={()=>{setSearchTerm('');setDateFilter('')}} style={{color:'var(--danger)',borderColor:'var(--danger-light)'}}>Reset</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 320px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Sidebar/Intern List */}
        <div className="card" style={{ padding: '0.75rem', maxHeight: '72vh', overflowY: 'auto', border: '1px solid var(--border)', position: 'sticky', top: '1.5rem' }}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem', padding: '0 0.5rem', textTransform: 'uppercase', letterSpacing: 1.2 }}>Daftar Peserta ({internList.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {loading ? (
              [1,2,3,4,5].map(i => <div key={i} style={{ height: 62, background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s infinite', marginBottom: 8 }} />)
            ) : internList.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Data tidak ditemukan.</p>
            ) : internList.map(intern => (
              <div 
                key={intern.userId}
                onClick={() => setSelectedUserId(intern.userId)}
                style={{ 
                  padding: '1rem', 
                  borderRadius: 'var(--radius-lg)', 
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: selectedUserId === intern.userId ? 'var(--primary-light)' : 'transparent',
                  border: `1px solid ${selectedUserId === intern.userId ? 'var(--primary)' : 'transparent'}`,
                  boxShadow: selectedUserId === intern.userId ? 'var(--shadow-sm)' : 'none'
                }}
                onMouseEnter={e => { if(selectedUserId !== intern.userId) e.currentTarget.style.background = 'var(--bg-main)' }}
                onMouseLeave={e => { if(selectedUserId !== intern.userId) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ fontWeight: 800, color: selectedUserId === intern.userId ? 'var(--primary)' : 'var(--text-primary)', fontSize: '0.95rem' }}>{intern.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{intern.field}</span>
                  <span style={{ fontSize: '0.65rem', background: 'var(--bg-main)', padding: '2px 8px', borderRadius: 999, fontWeight: 700, border:'1px solid var(--border)' }}>{intern.reports.length} Lap</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        <div style={{ minHeight: '60vh' }}>
          {!selectedIntern ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 2rem', textAlign: 'center', height: '100%', borderStyle: 'dashed' }}>
               <User size={64} style={{ opacity: 0.1, marginBottom: '1.5rem', color: 'var(--text-primary)' }} />
               <h3 style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>Pilih Peserta</h3>
               <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 300, marginTop: 8, lineHeight: 1.6 }}>Klik nama peserta di panel kiri untuk memantau rincian laporan harian mereka secara spesifik.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.3s ease-out' }}>
               {/* Detail Header */}
               <div className="card" style={{ padding: '1.75rem', backgroundImage: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', color: '#fff', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                         <h2 style={{ fontWeight: 900, fontSize: '1.75rem', margin: 0 }}>{selectedIntern.name}</h2>
                         <span style={{ background:'rgba(255,255,255,0.2)', padding:'4px 12px', borderRadius:999, fontSize:'0.75rem', fontWeight:800 }}>{selectedIntern.reports.length} Total Laporan</span>
                      </div>
                      <p style={{ opacity: 0.9, fontSize: '0.9rem', display:'flex', alignItems:'center', gap:8 }}>
                         <Briefcase size={14}/> {selectedIntern.field} · <GraduationCap size={14}/> {selectedIntern.nim_nis}
                      </p>
                      <p style={{ opacity: 0.8, fontSize: '0.8rem', marginTop: 6, fontStyle:'italic' }}>Supervisor: {selectedIntern.supervisor}</p>
                    </div>
                    <FileText size={56} style={{ opacity: 0.2 }} />
                  </div>
               </div>

               {/* Reports Feed for Selected Intern */}
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {selectedIntern.reports.sort((a,b) => new Date(b.date || b.reportDate) - new Date(a.date || a.reportDate)).map((rep, idx) => (
                    <div key={rep.id} className="card" style={{ 
                      padding: '1.5rem', 
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      animation: `slideUp 0.4s ease forwards ${idx * 0.05}s`,
                      borderLeft: '5px solid var(--primary)',
                      opacity: 0,
                      boxShadow: 'var(--shadow-sm)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                        <div>
                          <p style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 1.2 }}>{fmtDate(rep.date || rep.reportDate)}</p>
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
                             <Clock size={12} style={{ color:'var(--text-muted)' }}/>
                             <span style={{ fontSize:'0.75rem', color:'var(--text-muted)', fontWeight:600 }}>ID: #{rep.id.slice(-8).toUpperCase()}</span>
                          </div>
                        </div>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => rejectAndNotify(rep)}
                          style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--danger)', gap: 8, padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-md)', borderColor: 'var(--danger-light)', background:'#fff' }}
                        >
                          <XCircle size={15} /> Tolak & Input Ulang
                        </button>
                      </div>

                      <div style={{ background: 'var(--bg-main)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.95rem', lineHeight: 1.8, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                          {rep.activity || rep.content}
                        </p>
                        
                        {(rep.challenges || rep.nextWeek) && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '2px dashed var(--border)' }}>
                            {rep.challenges && (
                              <div style={{ background: '#fff7ed', padding:'1rem', borderRadius:'var(--radius-md)', border:'1px solid #fed7aa' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 900, color: '#c2410c', marginBottom: 6, display:'flex', alignItems:'center', gap:6 }}>⚠️ KENDALA</p>
                                <p style={{ fontSize: '0.85rem', color: '#9a3412', lineHeight: 1.6 }}>{rep.challenges}</p>
                              </div>
                            )}
                            {rep.nextWeek && (
                              <div style={{ background: '#f0fdf4', padding:'1rem', borderRadius:'var(--radius-md)', border:'1px solid #bbf7d0' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 900, color: '#15803d', marginBottom: 6, display:'flex', alignItems:'center', gap:6 }}>📅 RENCANA HARI ESOK</p>
                                <p style={{ fontSize: '0.85rem', color: '#166534', lineHeight: 1.6 }}>{rep.nextWeek}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Global PDF Modal for Admin */}
      {exportModal && (
         <div style={{position:'fixed',inset:0,zIndex:999,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)',display:'flex',justifyContent:'center',alignItems:'center'}}>
            <div className="card" style={{width:'90%',maxWidth:360,padding:'1.5rem',animation:'slideUp 0.3s'}}>
              <h3 style={{fontWeight:800,marginBottom:'1rem',display:'flex',alignItems:'center',gap:8}}><Printer size={18}/> Cetak Rekapan PDF</h3>
              <p style={{fontSize:'0.75rem',color:'var(--text-muted)',marginBottom:'1rem',lineHeight:1.5}}>
                <strong>Tips:</strong> Ketikkan nama peserta di kotak pencarian panel utama jika ingin memfilter data PDF lebih spesifik!
              </p>
              <form onSubmit={handleExportGlobalPDF} style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
                 <div>
                   <label className="label" style={{fontSize:'0.75rem'}}>Dari Tanggal</label>
                   <input type="date" required className="input" value={exportRange.start} onChange={e=>setExportRange({...exportRange,start:e.target.value})} />
                 </div>
                 <div>
                   <label className="label" style={{fontSize:'0.75rem'}}>Sampai Tanggal</label>
                   <input type="date" required className="input" value={exportRange.end} onChange={e=>setExportRange({...exportRange,end:e.target.value})} />
                 </div>
                 <div style={{display:'flex',gap:'0.5rem',marginTop:'0.5rem'}}>
                    <button type="button" className="btn btn-secondary" style={{flex:1}} onClick={()=>setExportModal(false)}>Batal</button>
                    <button type="submit" className="btn btn-primary" style={{flex:1}}>Download</button>
                 </div>
              </form>
            </div>
         </div>
      )}
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}} 
        @keyframes pulse{0%{opacity:1}50%{opacity:0.5}100%{opacity:1}} 
        @keyframes fadeIn{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}} 
        @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @media (max-width: 768px) {
          .container > div:last-of-type {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

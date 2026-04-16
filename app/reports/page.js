'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { FileText, Send, CheckCircle2, Clock, Star, MessageSquare, Plus, X, Trash, Trash2, Edit, RefreshCw, AlertCircle, Save, Download, Printer, Heart } from 'lucide-react'
import Swal from 'sweetalert2'
import { INDONESIA_HOLIDAYS_2026 } from '@/lib/constants'

const STATUS_STYLE = {
  DRAFT: { label: 'Draft', color: 'var(--text-muted)', bg: 'var(--border)', icon: <Save size={13} strokeWidth={2}/> },
  PENDING: { label: 'Menunggu Review', color: 'var(--warning)', bg: 'var(--warning-light)', icon: <Clock size={13} strokeWidth={2}/> },
  REVISION: { label: 'Perlu Revisi', color: 'var(--danger)', bg: 'var(--danger-light)', icon: <AlertCircle size={13} strokeWidth={2}/> },
  APPROVED: { label: 'Disetujui', color: 'var(--secondary)', bg: 'var(--secondary-light)', icon: <CheckCircle2 size={13} strokeWidth={2}/> },
}

const fmtDate = dt => dt ? new Date(dt).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-'

/* ── Modal Form: Create & Edit Report ──────────────────── */
function ReportModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    reportDate: initial?.reportDate || new Date().toISOString().split('T')[0],
    content: initial?.content || '',
    supervisor: initial?.supervisor || '',
    field: initial?.field || '',
    challenges: initial?.challenges || '',
    nextWeek: initial?.nextWeek || '',
    skills: initial?.skills?.join(', ') || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (isDraft) => {
    if (!isDraft && !form.content.trim()) {
      return Swal.fire('Data Belum Lengkap', 'Aktivitas pada hari ini wajib diisi sebelum dikirim.', 'warning')
    }
    setSaving(true)
    const payload = {
      ...form,
      skills: form.skills.split(',').map(s=>s.trim()).filter(Boolean),
      isDraft,
      ...(initial?.id ? { id: initial.id } : {})
    }
    await onSave(payload, !!initial?.id)
    setSaving(false)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center',backdropFilter:'blur(4px)'}}>
      <div className="card" style={{width:'100%',maxWidth:700,maxHeight:'90vh',overflowY:'auto',margin:'1rem',borderRadius:'var(--radius-xl)',animation:'slideUp 0.3s ease'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem',borderBottom:'1px solid var(--border)',paddingBottom:'1rem'}}>
          <div>
            <h3 style={{fontWeight:800}}>{initial?.id ? 'Edit Laporan' : 'Laporan Harian Baru'}</h3>
            <p style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>Dokumentasikan aktivitas hari ini, kendala, dan rencana esok.</p>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={20} strokeWidth={2}/></button>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div>
            <label className="label" style={{marginBottom:'0.25rem'}}>Tanggal Laporan</label>
            <input type="date" className="input" value={form.reportDate} onChange={e=>setForm(p=>({...p,reportDate:e.target.value}))}/>
          </div>

          <div>
            <label className="label" style={{marginBottom:'0.25rem'}}>Aktivitas pada hari ini <span style={{color:'var(--danger)'}}>*</span></label>
            <textarea className="input" rows={4} placeholder="Jelaskan detail aktivitas dan pencapaian Anda hari ini..." value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))}/>
          </div>
          
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <div>
              <label className="label" style={{marginBottom:'0.25rem'}}>Pembimbing / Atasan <span style={{color:'var(--danger)'}}>*</span></label>
              <input className="input" placeholder="Nama Pembimbing Lapangan" value={form.supervisor} onChange={e=>setForm(p=>({...p,supervisor:e.target.value}))}/>
            </div>
            <div>
              <label className="label" style={{marginBottom:'0.25rem'}}>Bidang / Departemen <span style={{color:'var(--danger)'}}>*</span></label>
              <input className="input" placeholder="Misal: IT Development" value={form.field} onChange={e=>setForm(p=>({...p,field:e.target.value}))}/>
            </div>
          </div>
          
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <div>
              <label className="label" style={{marginBottom:'0.25rem'}}>Kendala / Hambatan</label>
              <textarea className="input" rows={3} placeholder="Apa kesulitan yang Anda hadapi?" value={form.challenges} onChange={e=>setForm(p=>({...p,challenges:e.target.value}))}/>
            </div>
            <div>
              <label className="label" style={{marginBottom:'0.25rem'}}>Rencana hari esok</label>
              <textarea className="input" rows={3} placeholder="Fokus & tugas untuk besok?" value={form.nextWeek} onChange={e=>setForm(p=>({...p,nextWeek:e.target.value}))}/>
            </div>
          </div>

          <div>
            <label className="label" style={{marginBottom:'0.25rem'}}>Skill / Keterampilan yang Dipelajari</label>
            <input className="input" placeholder="Pisahkan dengan koma (Contoh: React, Riset Pasar, Excel)" value={form.skills} onChange={e=>setForm(p=>({...p,skills:e.target.value}))}/>
          </div>
        </div>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'1.5rem',borderTop:'1px solid var(--border)',paddingTop:'1rem'}}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Batal</button>
          <div style={{display:'flex',gap:'0.5rem'}}>
            <button className="btn btn-secondary" onClick={()=>handleSubmit(true)} disabled={saving} style={{gap:6}}>
              <Save size={14} strokeWidth={2}/> Simpan Draft
            </button>
            <button className="btn btn-primary" onClick={()=>handleSubmit(false)} disabled={saving} style={{gap:6}}>
              {saving?<RefreshCw size={14} className="spin" strokeWidth={2}/>:<Send size={14} strokeWidth={2}/>} 
              Kirim untuk Review
            </button>
          </div>
        </div>
        <style>{`@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}.spin{animation:spin 1s linear infinite}`}</style>
      </div>
    </div>
  )
}


function isOffDay(dateString) {
  const dt = new Date(dateString)
  if (dt.getDay() === 0 || dt.getDay() === 6) return true // Sabtu, Minggu
  return INDONESIA_HOLIDAYS_2026.includes(dateString)
}

function CalendarTimesheet({ reports, periodStart, onDayClick }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  // Calendar UI setup for current month
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const daysInMonth = lastDay.getDate()
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // Start Monday
  
  const days = []
  for (let i = 0; i < startOffset; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))

  const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginTop: '1rem' }
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  if (isMobile) {
     gridStyle.gridTemplateColumns = 'repeat(1, 1fr)'
     gridStyle.alignItems = 'center'
  }

  const handlePrev = () => setCurrentDate(new Date(year, month - 1, 1))
  const handleNext = () => setCurrentDate(new Date(year, month + 1, 1))

  const td = new Date()
  const todayStr = td.getFullYear() + '-' + String(td.getMonth() + 1).padStart(2, '0') + '-' + String(td.getDate()).padStart(2, '0')

  return (
    <div className="card" style={{ padding: '1.5rem', animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={handlePrev}>&laquo; Sblm</button>
        <h3 style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0 }}>
          {firstDay.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
        </h3>
        <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={handleNext}>Lanjut &raquo;</button>
      </div>
      
      {!isMobile && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center', fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(d => <div key={d}>{d}</div>)}
        </div>
      )}

      <div style={gridStyle}>
        {days.map((dt, i) => {
          if (!dt) return !isMobile ? <div key={`empty-${i}`} /> : null
          
          const dtStr =
            dt.getFullYear() + '-' +
            String(dt.getMonth() + 1).padStart(2, '0') + '-' +
            String(dt.getDate()).padStart(2, '0')
          
          const rep = reports.find(r => (r.date || r.reportDate) === dtStr)
          
          const isSystemOff = isOffDay(dtStr)
          const isPastLocked = periodStart ? (dtStr < periodStart) : (dtStr < '2026-03-13')
          const isFutureLocked = dtStr > todayStr
          
          // Laporan yang "DRAFT" tidak boleh dikunci, sehingga Intern masih bisa edit
          const isTercatat = rep && rep.status !== 'DRAFT'
          const locked = isSystemOff || isPastLocked || isFutureLocked || isTercatat
          
          let lockedLabel = ''
          if (isSystemOff) lockedLabel = 'Off Day'
          else if (isFutureLocked) lockedLabel = 'Belum/Terkunci'
          else if (isPastLocked) lockedLabel = 'Terkunci'
          else if (isTercatat) lockedLabel = 'Selesai (Terkunci)'

          return (
            <div 
              key={dtStr} 
              onClick={() => !locked && onDayClick(rep || { reportDate: dtStr })}
              style={{
                aspectRatio: isMobile ? 'auto' : '1/1',
                padding: '1rem',
                minHeight: isMobile ? '80px' : 'auto',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                background: locked ? 'var(--bg-card)' : 'var(--bg-main)',
                opacity: locked ? 0.6 : 1,
                cursor: locked ? 'not-allowed' : 'pointer',
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
                transition: 'all 0.2s',
                ...(locked && { borderStyle: 'dashed' }),
                ...(!locked && { _hover: { transform: 'translateY(-2px)', boxShadow: 'var(--shadow-sm)' } })
              }}
              onMouseEnter={(e) => { if(!locked) { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='var(--shadow-md)'; e.currentTarget.style.borderColor='var(--primary)' } }}
              onMouseLeave={(e) => { if(!locked) { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor='var(--border)' } }}
            >
              <div style={{ display:'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: locked ? 'var(--danger)' : 'var(--text-primary)', fontSize: isMobile?'1rem':'0.9rem' }}>
                  {dt.getDate()} {isMobile && dt.toLocaleDateString('id-ID', { weekday: 'short' })}
                </span>
                {rep ? (
                   rep.status === 'DRAFT' ? (
                     <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999, background: 'var(--warning-light)', color: 'var(--warning)', fontWeight: 800 }}>Draft (Edit)</span>
                   ) : (
                     <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999, background: 'var(--secondary-light)', color: 'var(--secondary)', fontWeight: 800 }}>Tercatat</span>
                   )
                ) : !locked && (
                   <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999, background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 800 }}>+ Isi</span>
                )}
                {locked && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>{lockedLabel}</span>}
              </div>
              
              {rep && rep.activity && (
                 <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                   {rep.activity}
                 </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Reports Page ─────────────────────────────────────── */
export default function ReportsPage() {
  const { user } = useAuth()
  const [data, setData] = useState({ reports: [], stats: {}, periodStart: null })
  const [loading, setLoading] = useState(true)
  const [modalFor, setModalFor] = useState(null) // null | 'new' | existing object
  const [commentingId, setCommentingId] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [viewMode, setViewMode] = useState('calendar') // 'list' or 'calendar'

  const [exportModal, setExportModal] = useState(false)
  const [exportRange, setExportRange] = useState({ start: '', end: '' })

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?userId=${user.id}&role=${user.role}&_t=${Date.now()}`, { cache: 'no-store' })
      const json = await res.json()
      setData(json)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => { if (user) fetchReports() }, [fetchReports])

  const saveReport = async (payload, isEdit) => {
    try {
      const url = '/api/reports'
      const method = isEdit ? 'PUT' : 'POST'
      
      // Standardize naming before sending to API
      const bodyPayload = {
        ...payload,
        userId: user.id,
        date: payload.reportDate,
        activity: payload.content
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      })
      
      const resData = await res.json()
      if (!res.ok) throw new Error(resData.error || 'Gagal menyimpan laporan')

      setModalFor(null)
      fetchReports()
      Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Laporan harian telah diperbarui.', timer: 1500, showConfirmButton: false })
    } catch (err) {
      console.error('Save report error:', err)
      Swal.fire('Gagal Simpan', err.message, 'error')
    }
  }

  // Fitur hapus laporan oleh intern telah dinonaktifkan sesuai SOP. Hanya Admin HR yang berhak menghapus/menolak laporan.

  const handleExportGlobalPDF = async (e) => {
    e.preventDefault()
    try {
      Swal.fire({ title: 'Menyiapkan Data PDF...', didOpen: () => Swal.showLoading() })
      const { start, end } = exportRange
      if (!start || !end) return Swal.fire('Error', 'Harap isi Range Tanggal', 'error')

      const filteredReps = data.reports.filter(r => {
        const d = r.date || r.reportDate
        return d >= start && d <= end
      }).sort((a, b) => new Date(a.date || a.reportDate) - new Date(b.date || b.reportDate))

      if (filteredReps.length === 0) {
        return Swal.fire('Kosong', 'Tidak ada laporan di rentang tanggal tersebut', 'info')
      }

      const attRes  = await fetch(`/api/attendance?userId=${user.id}`)
      const attLogs = await attRes.json()

      // Call server-side PDF generation for robust filename preservation
      const { internName } = filteredReps[0]
      const url = `/api/reports/export?startDate=${start}&endDate=${end}&userId=${user.id}&format=pdf&t=${Date.now()}&ext=.pdf`
      
      const a = document.createElement('a')
      a.href = url
      // Use the server-provided filename eventually, but set download attribute properly
      a.download = `Daftar_Hadir_${internName.replace(/\s+/g, '_')}_${start}_sd_${end}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      Swal.close()
      setExportModal(false)
      Swal.fire({ icon: 'success', title: 'PDF Berhasil!', text: 'Laporan sedang diunduh.', timer: 2000, showConfirmButton: false })
    } catch (err) {
      console.error('PDF error:', err)
      Swal.fire('Error', 'Gagal ekspor PDF.', 'error')
    }
  }

  if (loading) return <div className="container" style={{display:'flex',justifyContent:'center',padding:'4rem'}}><RefreshCw className="spin" size={24} style={{animation:'spin 1s linear infinite',color:'var(--primary)'}}/></div>

  return (
    <div className="container" style={{paddingBottom:'4rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.5rem',flexWrap:'wrap',gap:'1rem'}}>
        <div>
          <h1 className="title" style={{display:'flex',alignItems:'center',gap:8}}><FileText size={22} strokeWidth={2}/> Laporan Harian</h1>
          <p className="subtitle">Kegiatan harian, dokumentasi, dan diskusi langsung dengan supervisor.</p>
        </div>
        {user?.role === 'INTERN' && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <a href={`/portfolio?userId=${user.id}`} target="_blank" className="btn btn-secondary" style={{ gap: 6, textDecoration: 'none' }}>
              <Printer size={16} strokeWidth={2}/> Portofolio Saya
            </a>
            <button className="btn btn-primary" onClick={() => setModalFor('new')} style={{gap:6}}>
              <Plus size={16} strokeWidth={2}/> Buat Laporan
            </button>
          </div>
        )}
      </div>

        <div style={{display:'flex',gap:'1rem',marginBottom:'2rem',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:120,background:'var(--bg-main)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.5rem',textAlign:'center'}}>
            <div style={{fontWeight:900,fontSize:'2.5rem',color:'var(--primary)',lineHeight:1,display:'flex',justifyContent:'center'}}>
              {data.stats.total || 0}
            </div>
            <div style={{fontSize:'0.82rem',color:'var(--text-muted)',marginTop:8,fontWeight:700}}>Total Laporan (Tercatat)</div>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',flex:1,minWidth:200,gap:8}}>
             <button className="btn btn-secondary" style={{padding:'1.5rem 1rem',gap:8, flex:1}} onClick={()=>setExportModal(true)}>
                <Printer size={20} /> PDF
             </button>
             {user?.role === 'INTERN' && (
                <div style={{display:'flex',gap:4, background:'var(--bg-main)', padding:4, borderRadius:'var(--radius-lg)', border:'1px solid var(--border)'}}>
                  <button onClick={()=>setViewMode('calendar')} style={{padding:'0.8rem 1.2rem',borderRadius:'var(--radius-md)',border:'none',cursor:'pointer',fontWeight:800,fontSize:'0.85rem',transition:'all 0.2s',background:viewMode==='calendar'?'var(--primary)':'transparent',color:viewMode==='calendar'?'#fff':'var(--text-muted)'}}>📅 Grid</button>
                  <button onClick={()=>setViewMode('list')} style={{padding:'0.8rem 1.2rem',borderRadius:'var(--radius-md)',border:'none',cursor:'pointer',fontWeight:800,fontSize:'0.85rem',transition:'all 0.2s',background:viewMode==='list'?'var(--primary)':'transparent',color:viewMode==='list'?'#fff':'var(--text-muted)'}}>🗂️ List</button>
                </div>
             )}
          </div>
        </div>

      {user?.role === 'INTERN' && viewMode === 'calendar' ? (
         <CalendarTimesheet reports={data.reports} periodStart={data.periodStart} onDayClick={setModalFor} />
      ) : data.reports.length === 0 ? (
        <div className="card" style={{textAlign:'center',padding:'4rem 1rem'}}>
          <FileText size={48} style={{margin:'0 auto 1rem',opacity:0.2,color:'var(--text-muted)'}}/>
          <p style={{fontWeight:700,color:'var(--text-secondary)'}}>Belum Ada Laporan</p>
          {user?.role === 'INTERN' && <p style={{fontSize:'0.82rem',color:'var(--text-muted)',marginTop:8}}>Klik "Buat Laporan" untuk memulai draft mingguan Anda.</p>}
        </div>
      ) : (
        <div style={{position:'relative',paddingLeft:'1.25rem',borderLeft:'2px dashed var(--border)'}}>
          {data.reports.map((rep) => {
            const st = STATUS_STYLE[rep.status] || STATUS_STYLE.DRAFT
            return (
              <div key={rep.id} style={{position:'relative',marginBottom:'1.5rem',paddingLeft:'1.5rem'}}>
                {/* Timeline Dot */}
                <div style={{position:'absolute',left:-23,top:16,width:14,height:14,borderRadius:7,background:st.bg,border:`2px solid ${st.color}`,zIndex:2}}/>
                
                <div className="card" style={{boxShadow:'var(--shadow-sm)',border:`1px solid ${rep.status==='REVISION'?'var(--danger-light)':'var(--border)'}`,animation:'slideUp 0.3s ease'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1rem',flexWrap:'wrap',gap:'1rem'}}>
                    <div>
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <h3 style={{fontWeight:800,fontSize:'1.05rem',color:'var(--text-primary)'}}>
                          {fmtDate(rep.date || rep.reportDate).split(',')[0]}
                        </h3>
                        {user.role === 'SUPERVISOR' && <span style={{fontSize:'0.75rem',color:'var(--primary)',background:'var(--primary-light)',padding:'2px 8px',borderRadius:999,fontWeight:700}}>{rep.internName}</span>}
                      </div>
                      <p style={{fontSize:'0.72rem',color:'var(--text-muted)',marginTop:4}}>Dibuat: {fmtDate(rep.createdAt)} {rep.submittedAt && `· Dikirim: ${fmtDate(rep.submittedAt)}`}</p>
                    </div>
                    <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap',alignItems:'center'}}>
                      {rep.isLiked && (
                        <span style={{display:'flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:999,background:'var(--danger-light)',color:'var(--danger)',fontSize:'0.72rem',fontWeight:800}}>
                          <Heart size={14} fill="currentColor" /> Diapresiasi Admin
                        </span>
                      )}
                      <span style={{display:'flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:999,background:'var(--secondary-light)',color:'var(--secondary)',fontSize:'0.72rem',fontWeight:800}}>
                        <CheckCircle2 size={14} /> Tercatat
                      </span>
                    </div>
                  </div>

                  <div style={{background:'var(--bg-main)',padding:'1rem',borderRadius:'var(--radius-md)',marginBottom:'1rem'}}>
                    <p style={{fontWeight:700,fontSize:'0.82rem',color:'var(--text-secondary)',marginBottom:6}}>Aktivitas pada hari ini</p>
                    <p style={{fontSize:'0.85rem',whiteSpace:'pre-wrap',lineHeight:1.6}}>{rep.activity || rep.content}</p>

                    {(rep.challenges || rep.nextWeek) && (
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginTop:'1rem',borderTop:'1px solid var(--border)',paddingTop:'1rem'}}>
                        {rep.challenges && <div>
                          <p style={{fontWeight:700,fontSize:'0.8rem',color:'var(--warning)',marginBottom:4}}>Kendala</p>
                          <p style={{fontSize:'0.8rem',color:'var(--text-secondary)'}}>{rep.challenges}</p>
                        </div>}
                        {rep.nextWeek && <div>
                          <p style={{fontWeight:700,fontSize:'0.8rem',color:'var(--primary)',marginBottom:4}}>Rencana hari esok</p>
                          <p style={{fontSize:'0.8rem',color:'var(--text-secondary)'}}>{rep.nextWeek}</p>
                        </div>}
                      </div>
                    )}
                  </div>

                  {(rep.skills && rep.skills.length > 0) && (
                    <div style={{display:'flex',gap:'0.375rem',flexWrap:'wrap',marginBottom:'1rem'}}>
                      <span style={{fontSize:'0.72rem',color:'var(--text-muted)',marginRight:4,alignSelf:'center'}}>Skills:</span>
                      {rep.skills.map((sk,i) => <span key={i} style={{fontSize:'0.7rem',background:'var(--primary-light)',color:'var(--primary)',padding:'2px 8px',borderRadius:4,fontWeight:600}}>{sk}</span>)}
                    </div>
                  )}

                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalFor && <ReportModal initial={modalFor==='new'?null:modalFor} onSave={saveReport} onClose={()=>setModalFor(null)}/>}
      
      {/* Global PDF Modal */}
      {exportModal && (
         <div style={{position:'fixed',inset:0,zIndex:999,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)',display:'flex',justifyContent:'center',alignItems:'center'}}>
            <div className="card" style={{width:'90%',maxWidth:360,padding:'1.5rem',animation:'slideUp 0.3s'}}>
              <h3 style={{fontWeight:800,marginBottom:'1rem',display:'flex',alignItems:'center',gap:8}}><Printer size={18}/> Rekap PDF Laporan</h3>
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

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

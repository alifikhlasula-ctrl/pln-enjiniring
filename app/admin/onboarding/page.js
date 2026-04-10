'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  FileCheck, FileX, Eye, Search, Filter, CheckCircle2, AlertCircle, X,
  FileSpreadsheet, Loader2, RefreshCw, Bell, Clock, RotateCcw,
  ChevronDown, ChevronUp, User, GraduationCap, MapPin, CalendarDays,
  MessageSquare, Trash2, FileText
} from 'lucide-react'
// import * as XLSX from 'xlsx/xlsx.mjs' (Dihapus untuk dynamic import)
import Swal from 'sweetalert2'

/* ── Helpers ─────────────────────────────────────── */
const fmtDate = dt => dt ? new Date(dt).toLocaleString('id-ID', { day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit' }) : '-'
const timeAgo = ts => {
  const d = Math.floor((Date.now()-new Date(ts))/1000)
  if(d<60) return `${d}d lalu`; if(d<3600) return `${Math.floor(d/60)}m lalu`
  if(d<86400) return `${Math.floor(d/3600)}j lalu`; return `${Math.floor(d/86400)} hari lalu`
}

const STATUS_STYLE = {
  PENDING:  { bg:'#fef3c7', color:'#92400e', cls:'badge-warning',  icon:'⏳', label:'Menunggu' },
  APPROVED: { bg:'#dcfce7', color:'#065f46', cls:'badge-success',  icon:'✅', label:'Disetujui' },
  REJECTED: { bg:'#fee2e2', color:'#991b1b', cls:'badge-danger',   icon:'❌', label:'Ditolak' },
  REVISION: { bg:'#ede9fe', color:'#5b21b6', cls:'badge-primary',  icon:'🔄', label:'Revisi' },
}

/* ── Skeleton Row ────────────────────────────────── */
const Skel = () => (
  <tr>{[1,2,3,4,5].map(i=><td key={i}><div style={{height:14,width:'80%',background:'var(--border)',borderRadius:4,animation:'pulse 1.4s ease-in-out infinite'}}/></td>)}</tr>
)

/* ── Timeline ────────────────────────────────────── */
function Timeline({ items }) {
  if (!items?.length) return <p style={{color:'var(--text-muted)',fontSize:'0.78rem'}}>Belum ada riwayat.</p>
  const C = { SUBMITTED:'var(--primary)',APPROVED:'var(--secondary)',REJECTED:'var(--danger)',REVISION:'#8b5cf6' }
  const L = { SUBMITTED:'Pengajuan Masuk',APPROVED:'Disetujui',REJECTED:'Ditolak',REVISION:'Revisi Diminta' }
  return (
    <div style={{position:'relative',paddingLeft:'1.5rem'}}>
      <div style={{position:'absolute',left:'0.45rem',top:0,bottom:0,width:2,background:'var(--border)'}}/>
      {items.map((item,i)=>(
        <div key={i} style={{position:'relative',marginBottom:i<items.length-1?'0.875rem':0,paddingLeft:'0.75rem'}}>
          <div style={{position:'absolute',left:'-1.075rem',top:3,width:10,height:10,borderRadius:'50%',background:C[item.action]||'var(--primary)',border:'2px solid var(--bg-card)'}}/>
          <p style={{fontSize:'0.8rem',fontWeight:700,color:C[item.action]||'var(--primary)'}}>{L[item.action]||item.action}</p>
          <p style={{fontSize:'0.7rem',color:'var(--text-muted)',margin:'2px 0'}}>{fmtDate(item.at)} · {item.by}</p>
          {item.note&&<p style={{fontSize:'0.78rem',padding:'0.375rem 0.625rem',background:'var(--bg-main)',borderRadius:'var(--radius-md)',marginTop:3,color:'var(--text-secondary)'}}>{item.note}</p>}
        </div>
      ))}
    </div>
  )
}

/* ── Review Drawer (right panel) ─────────────────── */
function ReviewDrawer({ req, onClose, onAction }) {
  const [note,   setNote]   = useState('')
  const [action, setAction] = useState(null) // 'APPROVED'|'REJECTED'|'REVISION'
  const [saving, setSaving] = useState(false)
  const [docs,   setDocs]   = useState(req?.applicant?.docs || null)
  const [loadingDocs, setLoadingDocs] = useState(false)
  const a = req?.applicant || {}

  useEffect(() => {
    if (req?.id && !docs && a.hasDocs) {
      setLoadingDocs(true)
      fetch(`/api/onboarding/manage?id=${req.id}&docs=true`)
        .then(r => r.json())
        .then(d => setDocs(d.docs || {}))
        .catch(e => console.error('Failed to load docs:', e))
        .finally(() => setLoadingDocs(false))
    }
  }, [req?.id, docs, a.hasDocs])

  const handleSubmit = async () => {
    if ((action==='REJECTED'||action==='REVISION') && !note.trim()) {
      Swal.fire('Catatan Diperlukan', 'Berikan catatan untuk ' + (action==='REJECTED'?'penolakan':'permintaan revisi') + '.', 'warning')
      return
    }
    const confirm = await Swal.fire({ title:`${action==='APPROVED'?'Setujui':'Proses'} pengajuan ini?`, icon:'question', showCancelButton:true, confirmButtonText:'Ya', cancelButtonText:'Batal', confirmButtonColor:'var(--primary)' })
    if (!confirm.isConfirmed) return
    setSaving(true)
    await onAction(req.id, action, note)
    setSaving(false); setNote(''); setAction(null)
  }

  return (
    <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',justifyContent:'flex-end'}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.45)',backdropFilter:'blur(3px)'}}/>
      <div style={{position:'relative',width:'100%',maxWidth:480,background:'var(--bg-card)',overflowY:'auto',boxShadow:'-12px 0 48px rgba(0,0,0,0.2)',animation:'slideInRight 0.28s cubic-bezier(0.34,1.56,0.64,1)',display:'flex',flexDirection:'column'}}>
        {/* Header */}
        <div style={{padding:'1.25rem 1.5rem',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--bg-main)'}}>
          <div>
            <p style={{fontWeight:800,fontSize:'1rem'}}>Review Onboarding</p>
            <p style={{fontSize:'0.72rem',color:'var(--text-muted)',fontFamily:'monospace'}}>ID: {req?.id}</p>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={20} strokeWidth={2}/></button>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'1.25rem 1.5rem'}}>
          {/* Status badge */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
            <div style={{...STATUS_STYLE[req?.status],padding:'5px 12px',borderRadius:999,fontSize:'0.78rem',fontWeight:700}}>
              {STATUS_STYLE[req?.status]?.icon} {STATUS_STYLE[req?.status]?.label}
            </div>
            <span style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>Masuk: {timeAgo(req?.submittedAt)}</span>
          </div>

          {/* Applicant info */}
          <section style={{marginBottom:'1.25rem'}}>
            <p style={{fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)',marginBottom:'0.75rem',letterSpacing:'0.05em'}}>Data Pemohon</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.625rem'}}>
              {[
                [<User size={13} strokeWidth={2}/>, 'Nama', a.name],
                [null, 'Email', a.email],
                [null, 'Telepon', a.phone||'-'],
                [null, 'NIK', a.nik||'-'],
                [null, 'Tgl Lahir', a.birthDate||'-'],
                [null, 'NIM/NIS', a.nim_nis||'-'],
                [null, 'Gender', a.gender||'-'],
                [null, 'Alamat', a.address||'-'],
                [<GraduationCap size={13} strokeWidth={2}/>, 'Instansi', a.university],
                [null, 'Jurusan', a.major], [null, 'Jenjang', a.jenjang],
                [<MapPin size={13} strokeWidth={2}/>, 'Bidang', a.bidang||'-'],
                [null, 'Wilayah', a.wilayah||'-'],
                [<CalendarDays size={13} strokeWidth={2}/>, 'Periode', `${a.periodStart||'-'} → ${a.periodEnd||'-'}`],
              ].map(([icon,k,v],i)=>(
                <div key={i} style={{gridColumn:(k==='Periode'||k==='Alamat')?'span 2':'auto'}}>
                  <p style={{fontSize:'0.65rem',color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',display:'flex',alignItems:'center',gap:3}}>
                    {icon}{k}
                  </p>
                  <p style={{fontSize:'0.82rem',fontWeight:600,marginTop:2}}>{v}</p>
                </div>
              ))}
            </div>

            {/* Rekening section in Review */}
            <div style={{marginTop:'1.25rem',padding:'1rem',background:'var(--bg-main)',borderRadius:'var(--radius-md)',border:'1px solid var(--border)'}}>
               <p style={{fontSize:'0.68rem',color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',marginBottom:'0.75rem'}}>Data Rekening & Pembayaran</p>
               <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
                  <div>
                    <p style={{fontSize:'0.65rem',color:'var(--text-muted)',fontWeight:700}}>NAMA BANK</p>
                    <p style={{fontSize:'0.85rem',fontWeight:700,color:'var(--primary)'}}>{a.bankName || '-'}</p>
                  </div>
                  <div>
                    <p style={{fontSize:'0.65rem',color:'var(--text-muted)',fontWeight:700}}>NO. REKENING</p>
                    <p style={{fontSize:'0.85rem',fontWeight:700}}>{a.bankAccount || '-'}</p>
                  </div>
                  <div style={{gridColumn:'span 2',marginTop:4,paddingTop:8,borderTop:'1px dashed var(--border)'}}>
                    <p style={{fontSize:'0.65rem',color:'var(--text-muted)',fontWeight:700}}>NAMA PEMILIK REKENING</p>
                    <p style={{fontSize:'0.85rem',fontWeight:700}}>{a.bankAccountName || '-'}</p>
                  </div>
               </div>
            </div>

            {req?.catatan&&(
              <div style={{marginTop:'0.75rem',padding:'0.75rem',background:'var(--bg-main)',borderRadius:'var(--radius-md)'}}>
                <p style={{fontSize:'0.68rem',color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase'}}>Catatan Intern</p>
                <p style={{fontSize:'0.82rem',marginTop:4}}>{req.catatan}</p>
              </div>
            )}
          </section>

          {/* Documents */}
          {loadingDocs ? (
            <div style={{padding:'2rem',textAlign:'center',color:'var(--text-muted)'}}>
              <Loader2 size={24} style={{animation:'spin 1s linear infinite',margin:'0 auto 0.5rem'}}/>
              <p style={{fontSize:'0.75rem'}}>Memuat dokumen...</p>
            </div>
          ) : docs && Object.keys(docs).length > 0 ? (
            <section style={{marginBottom:'1.25rem',paddingTop:'1.25rem',borderTop:'1px solid var(--border)'}}>
              <p style={{fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)',marginBottom:'0.75rem',letterSpacing:'0.05em'}}>Dokumen Terlampir</p>
              <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
                {[
                  {key:'surat_permohonan', label:'Surat Permohonan Magang'},
                  {key:'ktp',              label:'Scan KTP / Identitas'},
                  {key:'mbanking',         label:'Rekening Bank'}
                ].map(doc => docs[doc.key] && (
                  <a key={doc.key} href={docs[doc.key]} target="_blank" rel="noopener noreferrer"
                    style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.625rem 0.875rem',background:'var(--bg-main)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',textDecoration:'none',color:'inherit',transition:'all 0.2s'}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='var(--primary)'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                    <FileText size={16} style={{color:'var(--primary)'}} strokeWidth={2}/>
                    <span style={{fontSize:'0.78rem',fontWeight:600}}>{doc.label}</span>
                    <span style={{marginLeft:'auto',fontSize:'0.65rem',color:'var(--text-muted)'}}>Lihat →</span>
                  </a>
                ))}
              </div>
            </section>
          ) : a.hasDocs ? (
            <section style={{marginBottom:'1.25rem',paddingTop:'1.25rem',borderTop:'1px solid var(--border)'}}>
              <p style={{fontSize:'0.75rem',textAlign:'center',color:'var(--text-muted)'}}>⚠ Gagal memuat dokumen.</p>
            </section>
          ) : null}

          {/* Timeline */}
          <section style={{marginBottom:'1.25rem',paddingTop:'1.25rem',borderTop:'1px solid var(--border)'}}>
            <p style={{fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)',marginBottom:'0.875rem',letterSpacing:'0.05em'}}>Riwayat</p>
            <Timeline items={req?.timeline}/>
          </section>

          {/* Action form — only if PENDING */}
          {req?.status==='PENDING'&&(
            <section style={{paddingTop:'1.25rem',borderTop:'1px solid var(--border)'}}>
              <p style={{fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)',marginBottom:'0.875rem',letterSpacing:'0.05em'}}>Ambil Keputusan</p>

              {/* Action select pills */}
              <div style={{display:'flex',gap:'0.5rem',marginBottom:'0.875rem',flexWrap:'wrap'}}>
                {[
                  {v:'APPROVED', label:'Setujui',       bg:'var(--secondary-light)', color:'var(--secondary)', border:'var(--secondary)'},
                  {v:'REVISION', label:'Minta Revisi',  bg:'var(--primary-light)',   color:'var(--primary)',   border:'var(--primary)'},
                  {v:'REJECTED', label:'Tolak',          bg:'var(--danger-light)',    color:'var(--danger)',    border:'var(--danger)'},
                ].map(opt=>(
                  <button key={opt.v} onClick={()=>setAction(prev=>prev===opt.v?null:opt.v)}
                    style={{padding:'0.5rem 1rem',borderRadius:'var(--radius-full)',fontWeight:700,fontSize:'0.8rem',border:`2px solid ${action===opt.v?opt.border:'var(--border)'}`,background:action===opt.v?opt.bg:'transparent',color:action===opt.v?opt.color:'var(--text-secondary)',cursor:'pointer',transition:'all 0.15s'}}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {action&&(
                <div style={{animation:'fadeIn 0.2s ease'}}>
                  <textarea className="input" rows={3} placeholder={
                    action==='APPROVED'?'(Opsional) Catatan untuk intern...'
                    :action==='REVISION'?'Jelaskan dokumen/informasi yang perlu diperbaiki... *'
                    :'Alasan penolakan... *'
                  } value={note} onChange={e=>setNote(e.target.value)} style={{resize:'vertical',marginBottom:'0.75rem'}}/>
                  <button className={`btn ${action==='APPROVED'?'btn-primary':action==='REVISION'?'btn-secondary':'btn-danger'}`}
                    style={{width:'100%',fontWeight:700}} onClick={handleSubmit} disabled={saving}>
                    {saving?<Loader2 size={15} style={{animation:'spin 0.8s linear infinite'}}/>:
                      action==='APPROVED'?<><FileCheck size={15} strokeWidth={2}/> Setujui Pengajuan</>
                      :action==='REVISION'?<><RotateCcw size={15} strokeWidth={2}/> Kirim Permintaan Revisi</>
                      :<><FileX size={15} strokeWidth={2}/> Tolak Pengajuan</>}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Already reviewed */}
          {req?.status!=='PENDING'&&req?.reviewNote&&(
            <section style={{paddingTop:'1.25rem',borderTop:'1px solid var(--border)'}}>
              <p style={{fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)',marginBottom:'0.625rem',letterSpacing:'0.05em'}}>Catatan Review</p>
              <div style={{padding:'0.875rem',background:req.status==='APPROVED'?'var(--secondary-light)':'var(--danger-light)',borderRadius:'var(--radius-lg)'}}>
                <p style={{fontSize:'0.85rem'}}>{req.reviewNote}</p>
                <p style={{fontSize:'0.7rem',color:'var(--text-muted)',marginTop:6}}>{req.reviewedBy} · {fmtDate(req.reviewedAt)}</p>
              </div>
            </section>
          )}
          {/* Direct link to created intern */}
          {req?.internId&&(
            <section style={{paddingTop:'1.25rem',borderTop:'1px solid var(--border)'}}>
              <div style={{background:'var(--secondary-light)',borderRadius:'var(--radius-lg)',padding:'0.875rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'0.75rem'}}>
                <div style={{display:'flex',alignItems:'center',gap:'0.625rem'}}>
                  <CheckCircle2 size={18} strokeWidth={2} style={{color:'var(--secondary)',flexShrink:0}}/>
                  <div>
                    <p style={{fontSize:'0.82rem',fontWeight:700,color:'#065f46'}}>Intern Berhasil Dibuat</p>
                    <p style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>ID: <code style={{fontFamily:'monospace'}}>{req.internId}</code></p>
                  </div>
                </div>
                <a href="/interns" style={{padding:'0.5rem 0.875rem',borderRadius:'var(--radius-full)',background:'var(--secondary)',color:'#fff',fontSize:'0.78rem',fontWeight:700,textDecoration:'none',flexShrink:0,display:'flex',alignItems:'center',gap:4}}>
                  Lihat Profil →
                </a>
              </div>
            </section>
          )}
        </div>

        <style jsx>{`
          @keyframes slideInRight { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
          @keyframes spin    { to{transform:rotate(360deg)} }
          @keyframes fadeIn  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        `}</style>
      </div>
    </div>
  )
}

/* ── Main: Admin Onboarding Management Page ──────── */
export default function AdminOnboardingPage() {
  const [requests, setRequests]   = useState([])
  const [stats,    setStats]      = useState({total:0,pending:0,approved:0,rejected:0})
  const [loading,  setLoading]    = useState(true)
  const [search,   setSearch]     = useState('')
  const [filter,   setFilter]     = useState('ALL')
  const [selected, setSelected]   = useState(null)
  const [newCount, setNewCount]   = useState(0)
  const prevPending = useRef(0)
  const pollRef    = useRef()

  // ── Fetch + notify on new submissions ───────────
  const fetchRequests = useCallback(async (silent=false) => {
    if (!silent) setLoading(true)
    try {
      const r = await fetch(`/api/onboarding/manage?_t=${Date.now()}`, { cache: 'no-store' })
      const d = await r.json()
      setRequests(d.list || [])
      setStats(d.stats || {})

      // Detect new PENDING submissions since last poll
      const newPending = (d.stats?.pending || 0) - prevPending.current
      if (prevPending.current > 0 && newPending > 0) {
        setNewCount(nc => nc + newPending)
      }
      prevPending.current = d.stats?.pending || 0
    } catch(e) { console.error(e) }
    finally { if (!silent) setLoading(false) }
  }, [])

  useEffect(() => {
    fetchRequests()
    // Poll every 15 seconds - near real-time for Admin HR
    pollRef.current = setInterval(() => fetchRequests(true), 15000)
    return () => clearInterval(pollRef.current)
  }, [fetchRequests])

  // ── Handle Review Action ─────────────────────────
  const handleAction = async (id, status, reviewNote) => {
    const res  = await fetch('/api/onboarding/manage', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, reviewNote, reviewedBy: 'Admin HR' })
    })
    const result = await res.json()
    if (res.ok) {
      if (status === 'APPROVED' && result.internCreated) {
        await Swal.fire({
          icon: 'success',
          title: 'Pengajuan Disetujui!',
          html: `
            <p style="margin-bottom:12px">Data <strong>${result.internData?.name}</strong> berhasil ditambahkan ke Manajemen Peserta Magang.</p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;text-align:left;font-size:13px">
              <p>👤 <strong>${result.internData?.name}</strong></p>
              <p>🎓 ${result.internData?.university} · ${result.internData?.jenjang}</p>
              <p>📅 ${result.internData?.periodStart} → ${result.internData?.periodEnd}</p>
              <p>🆔 NIM/NIS: <code>${result.internData?.nim_nis}</code></p>
              <p>👫 Gender: <strong>${result.internData?.gender}</strong></p>
            </div>`,
          showCancelButton: true,
          confirmButtonText: '📋 Lihat di Manajemen Intern',
          cancelButtonText: 'Tutup',
          confirmButtonColor: 'var(--primary)'
        }).then(r => { if (r.isConfirmed) window.location.href = '/interns' })
      } else {
        Swal.fire({
          icon: 'success',
          title: status==='APPROVED'?'Pengajuan Disetujui!':status==='REJECTED'?'Pengajuan Ditolak':'Revisi Diminta',
          timer: 2000, showConfirmButton: false
        })
      }
      setSelected(null); fetchRequests()
    } else {
      Swal.fire('Gagal', result.error || 'Terjadi kesalahan.', 'error')
    }
  }

  const handleDelete = async id => {
    const { isConfirmed } = await Swal.fire({ title:'Hapus pengajuan ini?', icon:'warning', showCancelButton:true, confirmButtonColor:'var(--danger)', confirmButtonText:'Hapus', cancelButtonText:'Batal' })
    if (!isConfirmed) return
    await fetch(`/api/onboarding/manage?id=${id}`, { method:'DELETE' })
    fetchRequests()
  }

  const exportExcel = async () => {
    const timestamp = new Date().toISOString().split('T')[0]
    const url = `/api/onboarding/export?t=${Date.now()}&ext=.xlsx`
    
    try {
      const a = document.createElement('a')
      a.href = url
      a.download = `Onboarding_${timestamp}.xlsx`
      document.body.appendChild(a)
      a.click()
      setTimeout(() => document.body.removeChild(a), 100)
      
      Swal.fire({ icon: 'success', title: 'Ekspor Berhasil!', text: `${requests.length} data diekspor.`, timer: 2000, showConfirmButton: false })
    } catch (e) {
      console.error(e)
      Swal.fire('Gagal Ekspor', 'Terjadi kesalahan.', 'error')
    }
  }

  const filtered = requests.filter(r => {
    const s = r.applicant?.name?.toLowerCase().includes(search.toLowerCase()) ||
              r.applicant?.email?.toLowerCase().includes(search.toLowerCase()) ||
              r.applicant?.university?.toLowerCase().includes(search.toLowerCase())
    const f = filter === 'ALL' || r.status === filter
    return s && f
  })

  return (
    <div className="container" style={{paddingBottom:'4rem'}}>
      {/* ── Header ── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.5rem',flexWrap:'wrap',gap:'0.75rem'}}>
        <div>
          <h1 className="title" style={{display:'flex',alignItems:'center',gap:8}}>
            Manajemen Onboarding
            {newCount>0&&(
              <span style={{padding:'3px 10px',borderRadius:999,background:'var(--danger)',color:'#fff',fontSize:'0.75rem',fontWeight:800,animation:'pulse 2s ease-in-out infinite'}}>
                +{newCount} Baru
              </span>
            )}
          </h1>
          <p className="subtitle">Review dan kelola pengajuan onboarding peserta magang. Auto-refresh setiap 15 detik.</p>
        </div>
        <div style={{display:'flex',gap:'0.625rem',alignItems:'center',flexWrap:'wrap'}}>
          <div style={{fontSize:'0.72rem',color:'var(--text-muted)',display:'flex',alignItems:'center',gap:4}}>
            <RefreshCw size={11} strokeWidth={2} style={{color:'var(--secondary)'}}/> Live polling aktif
          </div>
          <button className="btn btn-secondary btn-sm" onClick={()=>{fetchRequests();setNewCount(0)}} disabled={loading} title="Refresh">
            <RefreshCw size={14} strokeWidth={2} style={{animation:loading?'spin 1s linear infinite':'none'}}/>
          </button>
          <button className="btn btn-secondary" onClick={exportExcel}>
            <FileSpreadsheet size={16} strokeWidth={2}/> Export Excel
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.75rem',marginBottom:'1.25rem'}}>
        {[
          {label:'Total Pengajuan', value:stats.total,    color:'var(--primary)',   bg:'var(--primary-light)'},
          {label:'Menunggu Review', value:stats.pending,  color:'#92400e',         bg:'#fef3c7'},
          {label:'Disetujui',       value:stats.approved, color:'var(--secondary)', bg:'var(--secondary-light)'},
          {label:'Ditolak',         value:stats.rejected,  color:'var(--danger)',   bg:'var(--danger-light)'},
        ].map((s,i)=>(
          <div key={i} className="stat-card" style={{padding:'0.875rem',cursor:'pointer'}}
            onClick={()=>setFilter(['ALL','PENDING','APPROVED','REJECTED'][i])}>
            <div className="stat-value" style={{color:s.color,fontSize:'1.75rem'}}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
            {stats.pending>0&&i===1&&<div style={{width:'100%',height:3,background:s.color,borderRadius:2,marginTop:6,animation:'pulse 2s ease-in-out infinite'}}/>}
          </div>
        ))}
      </div>

      {/* ── Search & Filter ── */}
      <div className="card mb-4" style={{padding:'0.875rem 1rem'}}>
        <div style={{display:'flex',gap:'0.75rem',alignItems:'center',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:220,position:'relative'}}>
            <Search size={15} style={{position:'absolute',left:'0.75rem',top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}} strokeWidth={2}/>
            <input type="text" className="input" placeholder="Cari nama, email, atau instansi..." style={{paddingLeft:'2.25rem'}} value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="select" value={filter} onChange={e=>setFilter(e.target.value)} style={{width:170}}>
            <option value="ALL">Semua Status</option>
            <option value="PENDING">⏳ Menunggu</option>
            <option value="APPROVED">✅ Disetujui</option>
            <option value="REJECTED">❌ Ditolak</option>
            <option value="REVISION">🔄 Perlu Revisi</option>
          </select>
          {filter!=='ALL'&&<button className="btn btn-secondary btn-sm" onClick={()=>setFilter('ALL')}><X size={13} strokeWidth={2}/></button>}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="table-container">
        <table className="table">
          <thead style={{position:'sticky',top:0,background:'var(--bg-card)',zIndex:10}}>
            <tr>
              <th>Pemohon</th>
              <th>Instansi & Jurusan</th>
              <th>Periode</th>
              <th>Dikirim</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(5)].map((_,i)=><Skel key={i}/>)
              : filtered.length===0
                ? <tr><td colSpan={6} style={{textAlign:'center',padding:'3rem',color:'var(--text-muted)'}}>
                    <AlertCircle size={36} style={{margin:'0 auto 1rem',opacity:0.3}}/>
                    <p>Tidak ada pengajuan ditemukan.</p>
                  </td></tr>
                : filtered.map(req => {
                    const s = STATUS_STYLE[req.status] || STATUS_STYLE.PENDING
                    const isNew = req.status==='PENDING' && (Date.now()-new Date(req.submittedAt))<900000 // < 15 min
                    return (
                      <tr key={req.id} style={{background:isNew?'rgba(99,102,241,0.04)':'transparent',transition:'background 0.2s'}}>
                        <td>
                          <p style={{fontWeight:700,fontSize:'0.875rem',display:'flex',alignItems:'center',gap:5}}>
                            {isNew&&<span style={{width:7,height:7,borderRadius:'50%',background:'var(--primary)',flexShrink:0,display:'inline-block'}}/>}
                            {req.applicant?.name}
                          </p>
                          <p style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{req.applicant?.email}</p>
                          {req.applicant?.phone&&<p style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{req.applicant.phone}</p>}
                        </td>
                        <td>
                          <p style={{fontSize:'0.85rem'}}>{req.applicant?.university}</p>
                          <small style={{color:'var(--text-muted)'}}>{req.applicant?.major} / {req.applicant?.jenjang}</small>
                        </td>
                        <td>
                          <p style={{fontSize:'0.8rem'}}>{req.applicant?.periodStart} → {req.applicant?.periodEnd}</p>
                          {req.applicant?.bidang&&<small style={{color:'var(--text-muted)'}}>{req.applicant.bidang}</small>}
                        </td>
                        <td>
                          <p style={{fontSize:'0.8rem'}}>{timeAgo(req.submittedAt)}</p>
                          <small style={{color:'var(--text-muted)'}}>{fmtDate(req.submittedAt)?.split(',')[0]}</small>
                        </td>
                        <td>
                          <span style={{padding:'4px 10px',borderRadius:999,fontSize:'0.72rem',fontWeight:800,background:s.bg,color:s.color}}>
                            {s.icon} {s.label}
                          </span>
                          {req.reviewedAt&&<p style={{fontSize:'0.65rem',color:'var(--text-muted)',marginTop:3}}>{timeAgo(req.reviewedAt)}</p>}
                          {req.internId&&(
                            <a href="/interns" style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:'0.65rem',fontWeight:700,color:'var(--secondary)',textDecoration:'none',marginTop:3}}>
                              <CheckCircle2 size={10} strokeWidth={3}/> Intern Dibuat
                            </a>
                          )}
                        </td>
                        <td>
                          <div style={{display:'flex',gap:'0.375rem'}}>
                            <button className="btn btn-primary btn-sm" onClick={()=>setSelected(req)} title="Review Detail">
                              <Eye size={13} strokeWidth={2}/> Review
                            </button>
                            <button className="btn btn-secondary btn-sm btn-icon" style={{color:'var(--danger)'}} onClick={()=>handleDelete(req.id)} title="Hapus">
                              <Trash2 size={13} strokeWidth={2}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
            }
          </tbody>
        </table>
      </div>

      {/* ── Review Drawer ── */}
      {selected&&(
        <ReviewDrawer
          req={selected}
          onClose={()=>setSelected(null)}
          onAction={handleAction}
        />
      )}

      <style jsx>{`
        @keyframes spin  { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
      `}</style>
    </div>
  )
}

'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  Upload, FileText, File, CheckCircle2, AlertCircle, Loader2, X,
  Trash2, Clock, ChevronRight, ArrowRight, RefreshCw, Send,
  GraduationCap, MapPin, CalendarDays, User, Bell
} from 'lucide-react'
import Swal from 'sweetalert2'

/* ── Helpers ─────────────────────────────────────── */
const fmtDate = dt => dt ? new Date(dt).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '-'
const calcDuration = (s, e) => {
  const a=new Date(s),b=new Date(e)
  if(isNaN(a)||isNaN(b)||b<a) return ''
  const d=Math.ceil(Math.abs(b-a)/86400000), m=Math.floor(d/30), r=d%30
  return `${m>0?m+' Bulan ':''}${r>0?r+' Hari':''}`
}

const STATUS_STYLE = {
  PENDING:  { bg:'#fef3c7', color:'#92400e', icon:'⏳', label:'Menunggu Review' },
  APPROVED: { bg:'#dcfce7', color:'#065f46', icon:'✅', label:'Disetujui' },
  REJECTED: { bg:'#fee2e2', color:'#991b1b', icon:'❌', label:'Ditolak' },
  REVISION: { bg:'#ede9fe', color:'#5b21b6', icon:'🔄', label:'Perlu Revisi' },
}

/* ── File Upload Zone ────────────────────────────── */
function UploadZone({ label, desc, file, onFile, onClear, accept='.pdf,.doc,.docx,.jpg,.jpeg,.png', required=false }) {
  const ref = useRef()
  const [drag, setDrag] = useState(false)

  const validate = f => {
    if (!f) return
    if (f.size > 5*1024*1024) { Swal.fire('File Terlalu Besar', 'Maksimal 5MB per file.', 'warning'); return }
    const ok = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png']
    if (!ok.includes(f.type)) { Swal.fire('Format Tidak Didukung', 'Gunakan PDF, Word, JPG, atau PNG.', 'warning'); return }
    onFile(f)
  }

  return (
    <div>
      <label style={{fontSize:'0.82rem',fontWeight:700,marginBottom:'0.375rem',display:'block'}}>
        {label} {required&&<span style={{color:'var(--danger)'}}>*</span>}
        {desc&&<span style={{fontWeight:400,color:'var(--text-muted)',marginLeft:6}}>({desc})</span>}
      </label>
      {file ? (
        <div style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.875rem 1rem',background:'var(--secondary-light)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'var(--radius-lg)'}}>
          <FileText size={22} style={{color:'var(--secondary)',flexShrink:0}} strokeWidth={1.5}/>
          <div style={{flex:1,minWidth:0}}>
            <p style={{fontWeight:600,fontSize:'0.85rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{file.name}</p>
            <p style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{(file.size/1024).toFixed(1)} KB</p>
          </div>
          <button onClick={onClear} style={{background:'var(--danger-light)',border:'none',borderRadius:'var(--radius-md)',padding:'0.375rem',cursor:'pointer',color:'var(--danger)',flexShrink:0}}>
            <Trash2 size={15} strokeWidth={2}/>
          </button>
        </div>
      ) : (
        <div
          onClick={()=>ref.current?.click()}
          onDragOver={e=>{e.preventDefault();setDrag(true)}}
          onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault();setDrag(false);validate(e.dataTransfer.files[0])}}
          style={{border:`2px dashed ${drag?'var(--primary)':'var(--border)'}`,borderRadius:'var(--radius-lg)',padding:'1.5rem',textAlign:'center',cursor:'pointer',background:drag?'var(--primary-light)':'var(--bg-main)',transition:'all 0.2s'}}>
          <Upload size={24} style={{color:'var(--text-muted)',margin:'0 auto 0.5rem'}} strokeWidth={1.5}/>
          <p style={{fontSize:'0.8rem',color:'var(--text-secondary)',fontWeight:500}}>Klik atau Drag &amp; Drop file</p>
          <p style={{fontSize:'0.68rem',color:'var(--text-muted)',marginTop:4}}>PDF, Word, JPG, PNG · Maks 5MB</p>
          <input ref={ref} type="file" accept={accept} style={{display:'none'}} onChange={e=>validate(e.target.files[0])}/>
        </div>
      )}
    </div>
  )
}

/* ── Timeline Component ──────────────────────────── */
function Timeline({ items }) {
  if (!items?.length) return null
  return (
    <div style={{position:'relative',paddingLeft:'1.5rem'}}>
      <div style={{position:'absolute',left:'0.45rem',top:0,bottom:0,width:2,background:'var(--border)'}}/>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        const colors = { SUBMITTED:'var(--primary)', APPROVED:'var(--secondary)', REJECTED:'var(--danger)', REVISION:'#8b5cf6' }
        return (
          <div key={i} style={{position:'relative',marginBottom:isLast?0:'1rem',paddingLeft:'0.75rem'}}>
            <div style={{position:'absolute',left:'-1.075rem',top:3,width:10,height:10,borderRadius:'50%',background:colors[item.action]||'var(--primary)',border:'2px solid var(--bg-card)'}}/>
            <p style={{fontSize:'0.8rem',fontWeight:700,color:colors[item.action]||'var(--primary)'}}>{
              {SUBMITTED:'Pengajuan Dikirim',APPROVED:'Disetujui',REJECTED:'Ditolak',REVISION:'Perlu Revisi'}[item.action]||item.action
            }</p>
            <p style={{fontSize:'0.72rem',color:'var(--text-muted)',margin:'2px 0'}}>{fmtDate(item.at)} · {item.by}</p>
            {item.note&&<p style={{fontSize:'0.78rem',color:'var(--text-secondary)',marginTop:3,padding:'0.375rem 0.625rem',background:'var(--bg-main)',borderRadius:'var(--radius-md)'}}>{item.note}</p>}
          </div>
        )
      })}
    </div>
  )
}

/* ── Status Tracker Card ─────────────────────────── */
function StatusTracker({ entry, onRefresh, loading }) {
  if (!entry) return null
  const s = STATUS_STYLE[entry.status] || STATUS_STYLE.PENDING
  return (
    <div className="card" style={{marginBottom:'1.5rem',border:`2px solid ${s.bg}`,borderRadius:'var(--radius-xl)',overflow:'hidden'}}>
      {/* Status Header */}
      <div style={{background:`linear-gradient(135deg, ${s.bg}, transparent)`,padding:'1.25rem 1.5rem',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'0.75rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:'0.875rem'}}>
          <span style={{fontSize:36}}>{s.icon}</span>
          <div>
            <p style={{fontWeight:800,fontSize:'1rem',color:s.color}}>{s.label}</p>
            <p style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>ID: <code style={{fontFamily:'monospace'}}>{entry.id}</code> · Dikirim: {fmtDate(entry.submittedAt)}</p>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onRefresh} disabled={loading} title="Refresh status">
          <RefreshCw size={13} strokeWidth={2} style={{animation:loading?'spin 1s linear infinite':'none'}}/> Cek Status
        </button>
      </div>

      {/* Review Note */}
      {entry.reviewNote&&(
        <div style={{padding:'0.875rem 1.5rem',background:entry.status==='APPROVED'?'#f0fdf4':entry.status==='REJECTED'?'#fef2f2':'#f5f3ff',borderBottom:'1px solid var(--border)'}}>
          <p style={{fontSize:'0.8rem',fontWeight:700,color:s.color,marginBottom:4}}>Catatan Review dari Admin HR:</p>
          <p style={{fontSize:'0.85rem',color:'var(--text-secondary)'}}>{entry.reviewNote}</p>
          {entry.reviewedAt&&<p style={{fontSize:'0.7rem',color:'var(--text-muted)',marginTop:4}}>Diulas oleh {entry.reviewedBy||'Admin HR'} · {fmtDate(entry.reviewedAt)}</p>}
        </div>
      )}

      {/* Timeline */}
      <div style={{padding:'1.25rem 1.5rem'}}>
        <p style={{fontSize:'0.75rem',fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)',marginBottom:'0.875rem',letterSpacing:'0.05em'}}>Riwayat Pengajuan</p>
        <Timeline items={entry.timeline}/>
      </div>

      {/* REVISION: show re-submit hint */}
      {entry.status==='REVISION'&&(
        <div style={{padding:'0.875rem 1.5rem',borderTop:'1px solid var(--border)',background:'var(--primary-light)',display:'flex',gap:'0.75rem',alignItems:'center'}}>
          <AlertCircle size={16} style={{color:'var(--primary)',flexShrink:0}}/>
          <p style={{fontSize:'0.82rem',color:'var(--primary)',fontWeight:600}}>Silakan lakukan pengajuan ulang setelah memperbaiki dokumen sesuai catatan dari Admin HR.</p>
        </div>
      )}

      {/* Auto-created intern info */}
      {entry.status==='APPROVED'&&entry.internId&&(
        <div style={{padding:'1.25rem 1.5rem',borderTop:'1px solid var(--border)',background:'var(--secondary-light)',display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div style={{display:'flex',gap:'0.75rem',alignItems:'center'}}>
            <CheckCircle2 size={16} style={{color:'var(--secondary)',flexShrink:0}}/>
            <div>
              <p style={{fontSize:'0.82rem',fontWeight:700,color:'#065f46'}}>🎉 Aktivasi Akun Berhasil!</p>
              <p style={{fontSize:'0.75rem',color:'var(--text-secondary)',marginTop:2}}>Data Anda telah terdaftar di sistem HRIS. Kami sudah menyiapkan portal login untuk Anda.</p>
            </div>
          </div>
          
          <div style={{background:'rgba(255,255,255,0.6)',borderRadius:'var(--radius-md)',padding:'1rem',border:'1px solid rgba(16,185,129,0.2)'}}>
            <p style={{fontSize:'0.75rem',fontWeight:700,color:'var(--secondary)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.4px'}}>Panduan Login Intern:</p>
            <ul style={{listStyle:'none',fontSize:'0.82rem',display:'flex',flexDirection:'column',gap:6}}>
              <li style={{display:'flex',gap:8}}><ArrowRight size={14} style={{marginTop:2,flexShrink:0,color:'var(--secondary)'}}/> Gunakan Alamat Email Anda saat pendaftaran</li>
              <li style={{display:'flex',gap:8}}><ArrowRight size={14} style={{marginTop:2,flexShrink:0,color:'var(--secondary)'}}/> Password Default: <code style={{fontWeight:800,background:'#fff',padding:'0 4px',borderRadius:4,border:'1px solid var(--border)'}}>password123</code></li>
              <li style={{display:'flex',gap:8}}><AlertCircle size={14} style={{marginTop:2,flexShrink:0,color:'var(--warning)'}}/> <strong>Penting:</strong> Anda wajib mengganti password ini saat login pertama kali.</li>
            </ul>
            <a href="/" className="btn btn-primary btn-sm" style={{marginTop:'1rem',width:'100%',textAlign:'center',textDecoration:'none'}}>Pergi ke Halaman Login</a>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main: Intern Onboarding Page ────────────────── */
export default function OnboardingPage() {
  const { user } = useAuth()
  const [mySubmission, setMySubmission] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [step, setStep] = useState(1) // 1=info, 2=docs, 3=konfirmasi
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)

  const [form, setForm] = useState({
    name: user?.name || '', email: user?.email || '',
    phone: '', nim_nis: '', gender: 'Laki-laki',
    university: '', major: '', jenjang: 'S1',
    bidang: '', wilayah: '', tahun: new Date().getFullYear().toString(),
    periodStart: '', periodEnd: '', catatan: '',
    // New Fields
    nik: '', birthDate: '', address: '',
    bankName: '', bankAccount: '', bankAccountName: ''
  })
  const [files, setFiles] = useState({ surat_permohonan: null, ktp: null, mbanking: null })

  const duration = form.periodStart && form.periodEnd ? calcDuration(form.periodStart, form.periodEnd) : ''

  // ── Check existing submission for this user ──────
  const checkStatus = async () => {
    if (!user?.email) {
      setLoadingStatus(false)
      return
    }
    setLoadingStatus(true)
    try {
      const r = await fetch(`/api/onboarding/manage?email=${encodeURIComponent(user.email)}`)
      const d = await r.json()
      const latest = d.list?.[0] || null
      setMySubmission(latest)
    } catch(e) { console.error(e) }
    finally { setLoadingStatus(false) }
  }

  useEffect(() => {
    checkStatus()
    // Poll every 30s to detect Admin HR review
    const t = setInterval(checkStatus, 30000)
    return () => clearInterval(t)
  }, [user?.email])

  const set = (k, v) => setForm(p => ({...p, [k]: v}))

  // ── Submit handler ───────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true)
    const interval = setInterval(() => setProgress(p => Math.min(p+12, 88)), 400)
    try {
      const fd = new FormData()
      // Add text fields
      Object.keys(form).forEach(k => fd.append(k, form[k]))
      // Add files
      if (files.surat_permohonan) fd.append('surat_permohonan', files.surat_permohonan)
      if (files.ktp) fd.append('ktp', files.ktp)
      if (files.mbanking) fd.append('mbanking', files.mbanking)

      const res  = await fetch('/api/onboarding/manage', {
        method: 'POST',
        body: fd
      })
      clearInterval(interval); setProgress(100)
      const data = await res.json()
      if (res.ok) {
        await Swal.fire({ icon:'success', title:'Pengajuan Terkirim!', text:'Admin HR akan segera mereview pengajuan Anda.', confirmButtonColor:'var(--primary)' })
        setStep(1); setProgress(0); checkStatus()
      } else {
        Swal.fire({ icon:'error', title:'Gagal', text: data.error, confirmButtonColor:'var(--primary)' })
      }
    } catch { Swal.fire({ icon:'error', title:'Error', text:'Gagal terhubung ke server.', confirmButtonColor:'var(--primary)' }) }
    finally { clearInterval(interval); setSubmitting(false) }
  }

  // ── Validation per step ──────────────────────────
  const step1Valid = form.name && form.email && form.phone && form.nim_nis && form.university && form.major && form.periodStart && form.periodEnd &&
                     form.nik && form.birthDate && form.address && form.bankName && form.bankAccount && form.bankAccountName
  const step2Valid = files.surat_permohonan && files.ktp && files.mbanking

  // ── If approved, show congratulation ──────────────
  if (loadingStatus) return (
    <div className="container" style={{textAlign:'center',padding:'4rem'}}>
      <Loader2 size={40} style={{animation:'spin 1s linear infinite',color:'var(--primary)',margin:'0 auto 1rem'}}/>
      <p style={{color:'var(--text-muted)'}}>Memeriksa status pengajuan...</p>
      <style jsx>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div className="container" style={{paddingBottom:'4rem'}}>
      {/* ── Header ── */}
      <div style={{marginBottom:'1.5rem'}}>
        <h1 className="title">Pengajuan Onboarding Magang</h1>
        <p className="subtitle">Lengkapi formulir dan unggah dokumen untuk memulai program magang Anda.</p>
      </div>

      {/* ── Status Tracker (if already submitted) ── */}
      {mySubmission && (
        <StatusTracker entry={mySubmission} onRefresh={checkStatus} loading={loadingStatus}/>
      )}

      {/* ── Block form if pending or approved ── */}
      {(mySubmission?.status === 'PENDING' || mySubmission?.status === 'APPROVED') ? (
        <div className="card" style={{textAlign:'center',padding:'3rem 2rem'}}>
          <span style={{fontSize:56,display:'block',marginBottom:'1rem'}}>{mySubmission.status==='APPROVED'?'🎉':'📋'}</span>
          <h3 style={{fontWeight:800,fontSize:'1.2rem',marginBottom:'0.5rem'}}>
            {mySubmission.status==='APPROVED' ? 'Selamat! Pengajuan Anda Disetujui' : 'Pengajuan Sedang Dalam Review'}
          </h3>
          <p style={{color:'var(--text-secondary)',fontSize:'0.875rem'}}>
            {mySubmission.status==='APPROVED'
              ? 'Tim HR akan menghubungi Anda untuk langkah selanjutnya. Selamat bergabung!'
              : 'Admin HR sedang mereview berkas Anda. Halaman ini akan otomatis diperbarui setiap 30 detik.'}
          </p>
          {mySubmission.status==='PENDING'&&(
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginTop:'1.25rem',color:'var(--text-muted)',fontSize:'0.78rem'}}>
              <RefreshCw size={13} strokeWidth={2} style={{animation:'spin 2s linear infinite'}}/>
              Auto-refresh berjalan...
            </div>
          )}
          <style jsx>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        /* ── Onboarding Form ── */
        <div className="card" style={{animation:'scaleUp 0.25s ease'}}>
          {/* Step indicator */}
          <div style={{display:'flex',gap:'0.25rem',marginBottom:'1.75rem'}}>
            {['Informasi Diri','Unggah Dokumen','Konfirmasi & Kirim'].map((label,i)=>(
              <div key={i} style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:'0.375rem',marginBottom:'0.375rem'}}>
                  <div style={{width:26,height:26,borderRadius:'50%',background:step>i+1?'var(--secondary)':step===i+1?'var(--primary)':'var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.75rem',fontWeight:800,color:step>=i+1?'#fff':'var(--text-muted)',transition:'all 0.2s',flexShrink:0}}>
                    {step>i+1?'✓':i+1}
                  </div>
                  <span style={{fontSize:'0.75rem',fontWeight:step===i+1?700:400,color:step===i+1?'var(--primary)':step>i+1?'var(--secondary)':'var(--text-muted)'}}>
                    {label}
                  </span>
                </div>
                {i<2&&<div style={{height:2,background:step>i+1?'var(--secondary)':'var(--border)',borderRadius:2,transition:'background 0.3s'}}/>}
              </div>
            ))}
          </div>

          {/* ── STEP 1: Informasi Diri ── */}
          {step===1&&(
            <div style={{animation:'fadeIn 0.2s ease'}}>
              <p style={{fontSize:'0.88rem',fontWeight:700,color:'var(--primary)',display:'flex',alignItems:'center',gap:6,marginBottom:'1.25rem'}}>
                <User size={15} strokeWidth={2}/> Data Pribadi &amp; Akademik
              </p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.875rem'}}>
                {[
                  {label:'Nama Lengkap',key:'name',required:true,ph:'Contoh: Budi Santoso'},
                  {label:'Email',key:'email',type:'email',required:true,ph:'email@universitas.ac.id'},
                  {label:'No. Handphone',key:'phone',type:'tel',required:true,ph:'+62 8xx-xxxx-xxxx'},
                  {label:'NIM / NIS',key:'nim_nis',required:true,ph:'Contoh: 12345678'},
                  {label:'Jenis Kelamin',key:'gender',type:'select',opts:['Laki-laki','Perempuan']},
                  {label:'NIK (KTP)',key:'nik',required:true,ph:'16 digit nomor NIK'},
                  {label:'Tanggal Lahir',key:'birthDate',type:'date',required:true},
                  {label:'Alamat Lengkap (KTP)',key:'address',required:true,ph:'Isi alamat lengkap beserta RT/RW, Kec, Kota...',style:{gridColumn:'span 2'}},
                  {label:'Perguruan Tinggi / Sekolah',key:'university',required:true,ph:'Universitas Indonesia'},
                  {label:'Jurusan',key:'major',required:true,ph:'Teknik Informatika'},
                  {label:'Jenjang',key:'jenjang',type:'select',opts:['S1','D3','SMK/SMA']},
                  {label:'Bidang Magang',key:'bidang',ph:'Mis: IT Development'},
                  {label:'Wilayah Kerja',key:'wilayah',ph:'Mis: Jakarta Selatan'},
                  {label:'Tahun',key:'tahun',ph:'2026'},
                  {label:'Tanggal Mulai',key:'periodStart',type:'date',required:true},
                  {label:'Tanggal Selesai',key:'periodEnd',type:'date',required:true},
                  ...(duration?[{label:'Durasi (Otomatis)',key:'_dur',readonly:true,value:duration}]:[])
                ].map((f,i)=>(
                  <div key={i} className="form-group" style={{margin:0, ...f.style}}>
                    <label className="label" style={{marginBottom:'0.25rem'}}>
                      {f.label} {f.required&&<span style={{color:'var(--danger)'}}>*</span>}
                    </label>
                    {f.type==='select'
                      ?<select className="select" value={form[f.key]} onChange={e=>set(f.key,e.target.value)}>
                        {f.opts.map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                      :<input type={f.type||'text'} className="input" placeholder={f.ph} required={f.required}
                        value={f.readonly?f.value:form[f.key]} readOnly={f.readonly}
                        style={f.readonly?{background:'var(--bg-main)',fontWeight:700}:{}}
                        onChange={!f.readonly?e=>set(f.key,e.target.value):undefined}/>}
                  </div>
                ))}

                {/* Section: Rekening */}
                <div style={{gridColumn:'span 2',marginTop:'1rem',paddingTop:'1rem',borderTop:'1px solid var(--border)'}}>
                  <p style={{fontSize:'0.82rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Data Rekening & Pembayaran</p>
                </div>
                {[
                  {label:'Nama Bank',key:'bankName',required:true,ph:'Mis: BCA, Mandiri, BNI...'},
                  {label:'Nomor Rekening',key:'bankAccount',required:true,ph:'Isi nomor rekening aktif'},
                  {label:'Nama Pemilik Rekening',key:'bankAccountName',required:true,ph:'Sesuai nama di buku tabungan',style:{gridColumn:'span 2'}},
                ].map((f,i)=>(
                  <div key={i} className="form-group" style={{margin:0, ...f.style}}>
                    <label className="label" style={{marginBottom:'0.25rem'}}>
                      {f.label} {f.required&&<span style={{color:'var(--danger)'}}>*</span>}
                    </label>
                    <input type="text" className="input" placeholder={f.ph} required={f.required}
                      value={form[f.key]} onChange={e=>set(f.key,e.target.value)}/>
                  </div>
                ))}

                <div className="form-group" style={{margin:0,gridColumn:'span 2',marginTop:'0.5rem'}}>
                  <label className="label" style={{marginBottom:'0.25rem'}}>Catatan Tambahan</label>
                  <textarea className="input" rows={2} placeholder="Informasi tambahan yang perlu diketahui Admin HR..." value={form.catatan} onChange={e=>set('catatan',e.target.value)} style={{resize:'vertical'}}/>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',marginTop:'1.5rem'}}>
                <button className="btn btn-primary" disabled={!step1Valid} onClick={()=>setStep(2)}>
                  Lanjut ke Dokumen <ChevronRight size={16} strokeWidth={2}/>
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Unggah Dokumen ── */}
          {step===2&&(
            <div style={{animation:'fadeIn 0.2s ease'}}>
              <p style={{fontSize:'0.88rem',fontWeight:700,color:'var(--primary)',display:'flex',alignItems:'center',gap:6,marginBottom:'1.25rem'}}>
                <Upload size={15} strokeWidth={2}/> Dokumen yang Diperlukan
              </p>
              <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
                <UploadZone
                  label="Surat Permohonan Magang" desc="dari institusi/kampus" required
                  file={files.surat_permohonan} onFile={f=>setFiles(p=>({...p,surat_permohonan:f}))}
                  onClear={()=>setFiles(p=>({...p,surat_permohonan:null}))}/>
                <UploadZone
                  label="Scan KTP / Kartu Identitas" desc="JPG, PNG, atau PDF" required
                  file={files.ktp} onFile={f=>setFiles(p=>({...p,ktp:f}))}
                  onClear={()=>setFiles(p=>({...p,ktp:null}))}/>
                <UploadZone
                  label="Screenshot Rekening Bank" desc="untuk keperluan pembayaran allowance" required
                  file={files.mbanking} onFile={f=>setFiles(p=>({...p,mbanking:f}))}
                  onClear={()=>setFiles(p=>({...p,mbanking:null}))}/>
              </div>
              <p style={{fontSize:'0.75rem',color:'var(--text-muted)',marginTop:'0.875rem'}}>
                ⚠ Catatan: File disimpan secara lokal untuk keperluan demo. Ukuran maks 5MB per file.
              </p>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:'1.5rem'}}>
                <button className="btn btn-secondary" onClick={()=>setStep(1)}>← Kembali</button>
                <button className="btn btn-primary" disabled={!step2Valid} onClick={()=>setStep(3)}>
                  Lanjut ke Konfirmasi <ChevronRight size={16} strokeWidth={2}/>
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Konfirmasi ── */}
          {step===3&&(
            <div style={{animation:'fadeIn 0.2s ease'}}>
              <p style={{fontSize:'0.88rem',fontWeight:700,color:'var(--primary)',display:'flex',alignItems:'center',gap:6,marginBottom:'1.25rem'}}>
                <CheckCircle2 size={15} strokeWidth={2}/> Konfirmasi Pengajuan
              </p>

              {/* Summary card */}
              <div style={{background:'var(--bg-main)',borderRadius:'var(--radius-lg)',padding:'1.25rem',marginBottom:'1.25rem'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.625rem'}}>
                  {[
                    ['Nama', form.name], ['Email', form.email], ['No. HP', form.phone],
                    ['NIM/NIS', form.nim_nis], ['Jenis Kelamin', form.gender],
                    ['Instansi', form.university], ['Jurusan', form.major], ['Jenjang', form.jenjang],
                    ['Bidang', form.bidang||'-'], ['Wilayah', form.wilayah||'-'],
                    ['Periode', `${form.periodStart} → ${form.periodEnd}`], ['Durasi', duration||'-'],
                  ].map(([k,v])=>(
                    <div key={k}>
                      <p style={{fontSize:'0.68rem',color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase'}}>{k}</p>
                      <p style={{fontSize:'0.85rem',fontWeight:600,marginTop:2}}>{v}</p>
                    </div>
                  ))}
                </div>
                {form.catatan&&<div style={{marginTop:'0.875rem',paddingTop:'0.875rem',borderTop:'1px solid var(--border)'}}>
                  <p style={{fontSize:'0.68rem',color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase'}}>Catatan</p>
                  <p style={{fontSize:'0.82rem',marginTop:2}}>{form.catatan}</p>
                </div>}
              </div>

              <div style={{background:'var(--secondary-light)',borderRadius:'var(--radius-lg)',padding:'1rem',marginBottom:'1.25rem',display:'flex',gap:'0.75rem',alignItems:'flex-start'}}>
                <CheckCircle2 size={16} style={{color:'var(--secondary)',flexShrink:0,marginTop:2}}/>
                <div>
                  <p style={{fontSize:'0.82rem',fontWeight:700,color:'#065f46'}}>3 Dokumen Siap Diunggah</p>
                  {['Surat Permohonan Magang','Scan KTP','Screenshot Rekening Bank'].map((d,i)=>(
                    <p key={i} style={{fontSize:'0.75rem',color:'var(--text-secondary)',marginTop:2}}>✓ {d} — {files[['surat_permohonan','ktp','mbanking'][i]]?.name}</p>
                  ))}
                </div>
              </div>

              {submitting&&(
                <div style={{marginBottom:'1rem'}}>
                  <div style={{height:6,background:'var(--border)',borderRadius:3,overflow:'hidden'}}>
                    <div style={{width:`${progress}%`,height:'100%',background:'var(--primary)',borderRadius:3,transition:'width 0.4s'}}/>
                  </div>
                  <p style={{fontSize:'0.72rem',color:'var(--primary)',fontWeight:600,marginTop:4,textAlign:'center'}}>
                    {progress<100?'Mengirim pengajuan...':'Berhasil dikirim!'}
                  </p>
                </div>
              )}

              <div style={{display:'flex',justifyContent:'space-between'}}>
                <button className="btn btn-secondary" onClick={()=>setStep(2)} disabled={submitting}>← Kembali</button>
                <button className="btn btn-primary" style={{gap:'0.5rem'}} onClick={handleSubmit} disabled={submitting}>
                  {submitting?<Loader2 size={15} style={{animation:'spin 0.8s linear infinite'}}/>:<Send size={15} strokeWidth={2}/>}
                  {submitting?'Mengirim...':'Kirim Pengajuan'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes scaleUp { from{transform:scale(0.97);opacity:0}to{transform:scale(1);opacity:1} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
        @media(max-width:600px){
          .ob-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

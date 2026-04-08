'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Plus, Trash, Eye, ToggleLeft, ToggleRight, Send, X, CheckCircle2, Loader2, RefreshCw, Star } from 'lucide-react'
import Swal from 'sweetalert2'
import { useAuth } from '@/context/AuthContext'

const Q_TYPES = [
  { value:'RATING',          label:'Skala Nilai (1-5)',      icon:'⭐' },
  { value:'MULTIPLE_CHOICE', label:'Pilihan Ganda',          icon:'☑️' },
  { value:'TEXT',            label:'Jawaban Teks',           icon:'📝' },
]

const fmtDate = dt => dt ? new Date(dt).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}) : '-'

/* ── Survey results modal ── */
function ResultsModal({ surveyId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    fetch(`/api/surveys?id=${surveyId}`).then(r=>r.json()).then(d=>{setData(d);setLoading(false)}).catch(()=>setLoading(false))
  },[surveyId])

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}}>
      <div className="card" style={{width:'100%',maxWidth:600,maxHeight:'85vh',overflowY:'auto',margin:'1rem',position:'relative',animation:'scaleUp 0.2s ease'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
          <h3 style={{fontWeight:800}}>{data?.survey?.title||'Hasil Survei'}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={20} strokeWidth={2}/></button>
        </div>
        {loading?<div style={{textAlign:'center',padding:'2rem'}}><Loader2 size={28} style={{animation:'spin 1s linear infinite',color:'var(--primary)',margin:'0 auto'}}/></div>
         :<>
           <div style={{display:'flex',gap:'0.625rem',marginBottom:'1.25rem'}}>
             <div style={{flex:1,textAlign:'center',padding:'0.75rem',background:'var(--primary-light)',borderRadius:'var(--radius-lg)'}}>
               <p style={{fontWeight:800,fontSize:'1.5rem',color:'var(--primary)'}}>{data?.totalResponses||0}</p>
               <p style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>Total Responden</p>
             </div>
             <div style={{flex:1,textAlign:'center',padding:'0.75rem',background:'var(--secondary-light)',borderRadius:'var(--radius-lg)'}}>
               <p style={{fontWeight:800,fontSize:'1.5rem',color:'var(--secondary)'}}>{data?.survey?.questions?.length||0}</p>
               <p style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>Pertanyaan</p>
             </div>
           </div>
           <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
             {(data?.aggregated||[]).map((q,i)=>(
               <div key={i} style={{padding:'1rem',background:'var(--bg-main)',borderRadius:'var(--radius-lg)'}}>
                 <p style={{fontWeight:700,fontSize:'0.85rem',marginBottom:'0.625rem'}}>{i+1}. {q.text}</p>
                 <p style={{fontSize:'0.72rem',color:'var(--text-muted)',marginBottom:'0.625rem'}}>{q.responseCount} responden</p>
                 {q.type==='RATING'&&q.avg&&(
                   <><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                     <span style={{fontWeight:800,fontSize:'1.5rem',color:'var(--primary)'}}>{q.avg}</span>
                     <span style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>/ 5.0 rata-rata</span>
                   </div>
                   {(q.dist||[]).map((d,di)=>(
                     <div key={di} style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                       <span style={{width:12,fontSize:'0.72rem',color:'var(--text-muted)'}}>{d.value}</span>
                       <div style={{flex:1,height:8,background:'var(--border)',borderRadius:4,overflow:'hidden'}}>
                         <div style={{width:`${q.responseCount?(d.count/q.responseCount*100):0}%`,height:'100%',background:'#f59e0b',borderRadius:4}}/>
                       </div>
                       <span style={{width:20,fontSize:'0.7rem',color:'var(--text-muted)',textAlign:'right'}}>{d.count}</span>
                     </div>
                   ))}</>
                 )}
                 {q.type==='MULTIPLE_CHOICE'&&(
                   (q.dist||[]).map((d,di)=>(
                     <div key={di} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                       <span style={{fontSize:'0.75rem',minWidth:80,color:'var(--text-secondary)'}}>{d.option}</span>
                       <div style={{flex:1,height:8,background:'var(--border)',borderRadius:4,overflow:'hidden'}}>
                         <div style={{width:`${q.responseCount?(d.count/q.responseCount*100):0}%`,height:'100%',background:'var(--primary)',borderRadius:4}}/>
                       </div>
                       <span style={{fontSize:'0.7rem',color:'var(--text-muted)',width:30}}>{d.count}</span>
                     </div>
                   ))
                 )}
                 {q.type==='TEXT'&&(q.texts||[]).map((t,ti)=>(
                   <div key={ti} style={{padding:'0.5rem 0.75rem',background:'var(--bg-card)',borderRadius:'var(--radius-md)',marginBottom:4,fontSize:'0.8rem',color:'var(--text-secondary)'}}>{t}</div>
                 ))}
               </div>
             ))}
           </div>
         </>}
        <style>{`@keyframes scaleUp{from{transform:scale(0.95);opacity:0}to{transform:scale(1);opacity:1}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )
}

/* ── Survey Builder Modal ── */
function BuilderModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial||{title:'',description:'',deadline:'',targetRole:'INTERN',active:true})
  const [questions, setQs] = useState(initial?.questions||[{type:'RATING',text:'',options:[]}])
  const [saving, setSaving] = useState(false)

  const addQ  = ()  => setQs(p=>[...p, {type:'RATING',text:'',options:[]}])
  const delQ  = i   => setQs(p=>p.filter((_,pi)=>pi!==i))
  const setQ  = (i,k,v) => setQs(p=>p.map((q,qi)=>qi===i?{...q,[k]:v}:q))
  const addOpt= i   => setQs(p=>p.map((q,qi)=>qi===i?{...q,options:[...(q.options||[]),'Option']}: q))
  const setOpt= (i,oi,v) => setQs(p=>p.map((q,qi)=>qi===i?{...q,options:(q.options||[]).map((o,oli)=>oli===oi?v:o)}:q))
  const delOpt= (i,oi) => setQs(p=>p.map((q,qi)=>qi===i?{...q,options:(q.options||[]).filter((_,oli)=>oli!==oi)}:q))

  const handleSave = async () => {
    if (!form.title.trim()||!questions.length) return
    setSaving(true)
    await onSave({...form,questions})
    setSaving(false)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center',backdropFilter:'blur(4px)'}}>
      <div className="card" style={{width:'100%',maxWidth:640,maxHeight:'90vh',overflowY:'auto',margin:'1rem',borderRadius:'var(--radius-xl)',animation:'slideUp 0.3s ease'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
          <h3 style={{fontWeight:800}}>{initial?'Edit Survei':'Buat Survei Baru'}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={20} strokeWidth={2}/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'0.75rem',marginBottom:'1.25rem'}}>
          <input className="input" placeholder="Judul survei *" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}/>
          <textarea className="input" placeholder="Deskripsi (opsional)" rows={2} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} style={{resize:'vertical'}}/>
          <div style={{display:'flex',gap:'0.625rem'}}>
            <select className="select" value={form.targetRole} onChange={e=>setForm(p=>({...p,targetRole:e.target.value}))}>
              <option value="INTERN">Intern</option><option value="ALL">Semua</option>
            </select>
            <input type="date" className="input" value={form.deadline} onChange={e=>setForm(p=>({...p,deadline:e.target.value}))} style={{flex:1}} placeholder="Batas waktu"/>
          </div>
        </div>
        <p style={{fontWeight:700,fontSize:'0.82rem',marginBottom:'0.75rem'}}>Daftar Pertanyaan</p>
        <div style={{display:'flex',flexDirection:'column',gap:'0.875rem',marginBottom:'1rem'}}>
          {questions.map((q,i)=>(
            <div key={i} style={{padding:'1rem',background:'var(--bg-main)',borderRadius:'var(--radius-lg)',border:'1px solid var(--border)'}}>
              <div style={{display:'flex',gap:'0.5rem',marginBottom:'0.625rem'}}>
                <select className="select" value={q.type} onChange={e=>setQ(i,'type',e.target.value)} style={{width:170}}>
                  {Q_TYPES.map(t=><option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
                <input className="input" placeholder={`Pertanyaan ${i+1} *`} value={q.text} onChange={e=>setQ(i,'text',e.target.value)} style={{flex:1}}/>
                <button onClick={()=>delQ(i)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)'}}><Trash size={15} strokeWidth={2}/></button>
              </div>
              {q.type==='MULTIPLE_CHOICE'&&(
                <div style={{paddingLeft:'0.5rem'}}>
                  {(q.options||[]).map((opt,oi)=>(
                    <div key={oi} style={{display:'flex',gap:'0.375rem',marginBottom:4}}>
                      <input className="input" value={opt} onChange={e=>setOpt(i,oi,e.target.value)} style={{flex:1,height:36,fontSize:'0.8rem'}} placeholder={`Pilihan ${oi+1}`}/>
                      <button onClick={()=>delOpt(i,oi)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)'}}><X size={13} strokeWidth={2}/></button>
                    </div>
                  ))}
                  <button className="btn btn-secondary btn-sm" onClick={()=>addOpt(i)} style={{fontSize:'0.75rem',marginTop:4}}>+ Tambah Pilihan</button>
                </div>
              )}
              {q.type==='RATING'&&<p style={{fontSize:'0.72rem',color:'var(--text-muted)',paddingLeft:'0.5rem'}}>Responden akan memilih nilai 1–5 bintang</p>}
            </div>
          ))}
          <button className="btn btn-secondary" onClick={addQ} style={{fontSize:'0.8rem'}}><Plus size={14} strokeWidth={2}/> Tambah Pertanyaan</button>
        </div>
        <div style={{display:'flex',gap:'0.5rem',justifyContent:'flex-end'}}>
          <button className="btn btn-secondary" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving||!form.title.trim()}>
            {saving?<Loader2 size={15} style={{animation:'spin 1s linear infinite'}}/>:<><CheckCircle2 size={15} strokeWidth={2}/> {initial?'Simpan':'Buat Survei'}</>}
          </button>
        </div>
        <style>{`@keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )
}

/* ── Main Surveys Page ── */
export default function SurveysPage() {
  const { user } = useAuth()
  const [surveys,  setSurveys] = useState([])
  const [loading,  setLoading] = useState(true)
  const [builder,  setBuilder] = useState(null)   // null | 'new' | survey object
  const [viewing,  setViewing] = useState(null)   // surveyId
  const [tab,      setTab]     = useState(user?.role==='ADMIN_HR'?'manage':'fill')

  // For intern filling a survey
  const [fillSv,   setFillSv]  = useState(null)
  const [answers,  setAnswers] = useState({})
  const [submitting,setSub]    = useState(false)
  const [submitted, setSubmitted] = useState(null)
  
  // For interactive Feedback
  const [feedbacks, setFeedbacks] = useState([])
  const [suggest, setSuggest] = useState({ category: '💡 Ide / Saran', sentimentScore: 5, content: '', isAnonymous: false })
  const [sendingFb, setSendingFb] = useState(false)
  const [draftReplies, setDraftReplies] = useState({}) // { [feedbackId]: string }

  const fetchSurveys = useCallback(async () => {
    setLoading(true)
    try { 
      const [r1, r2] = await Promise.all([
        fetch('/api/surveys'),
        fetch(`/api/feedback?role=${user?.role}&internId=${user?.id}`)
      ])
      setSurveys(await r1.json())
      setFeedbacks(await r2.json())
    }
    catch(e){console.error(e)}finally{setLoading(false)}
  },[user])

  useEffect(()=>{ fetchSurveys() },[fetchSurveys])

  const handleSave = async (data) => {
    const isEdit = builder && builder !== 'new'
    const method = isEdit ? 'PUT' : 'POST'
    const body   = isEdit ? { ...data, id: builder.id } : data
    await fetch('/api/surveys',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    setBuilder(null); fetchSurveys()
  }

  const toggleActive = async sv => {
    await fetch('/api/surveys',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:sv.id,active:!sv.active})})
    fetchSurveys()
  }

  const deleteSv = async id => {
    const { isConfirmed } = await Swal.fire({title:'Hapus survei ini?',text:'Semua respons juga akan dihapus.',icon:'warning',showCancelButton:true,confirmButtonColor:'var(--danger)',confirmButtonText:'Hapus',cancelButtonText:'Batal'})
    if(isConfirmed){await fetch(`/api/surveys?id=${id}`,{method:'DELETE'});fetchSurveys()}
  }

  const handleFillSubmit = async () => {
    setSub(true)
    const res = await fetch('/api/surveys/respond',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({surveyId:fillSv.id,respondentId:user?.id,respondentName:user?.name,respondentRole:user?.role,answers})})
    const d = await res.json()
    setSub(false)
    if(res.ok){setSubmitted(fillSv.id);setFillSv(null);setAnswers({})}
    else Swal.fire('Gagal',d.error,'error')
  }

  const handleSuggestSubmit = async () => {
    if(!suggest.content.trim()) return Swal.fire('Oops','Silakan tulis masukan Anda!','warning')
    setSendingFb(true)
    const res = await fetch('/api/feedback', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({...suggest, internId: user.id, internName: user.name})
    })
    const d = await res.json()
    setSendingFb(false)
    if(res.ok) {
      Swal.fire('Terkirim!', 'Terima kasih atas masukannya secara proaktif.', 'success')
      setSuggest({ category: '💡 Ide / Saran', sentimentScore: 5, content: '', isAnonymous: false })
      fetchSurveys() // Refresh history
    } else Swal.fire('Gagal', d.error, 'error')
  }

  const handleReplySubmit = async (id) => {
    const reply = draftReplies[id]
    if(!reply?.trim()) return Swal.fire('Oops','Balasan tidak boleh kosong!','warning')
    const res = await fetch('/api/feedback', {
      method: 'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id, action: 'REPLY', reply, senderRole: user?.role, senderName: user?.name })
    })
    if(res.ok) {
      Swal.fire('Terkirim', 'Balasan Anda telah dikirim.', 'success')
      setDraftReplies(p => { const np={...p}; delete np[id]; return np })
      fetchSurveys()
    } else {
      const d = await res.json()
      Swal.fire('Gagal', d.error, 'error')
    }
  }

  const handleResolveSubmit = async (id) => {
    const { isConfirmed } = await Swal.fire({title:'Tandai Selesai?',text:'Anda yakin kendala ini sudah terselesaikan sepenuhnya?',icon:'question',showCancelButton:true,confirmButtonColor:'var(--secondary)'})
    if(!isConfirmed) return
    await fetch('/api/feedback', { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id, action: 'RESOLVE'}) })
    fetchSurveys()
  }

  const markRead = async id => {
    await fetch('/api/feedback', { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id, action: 'READ'}) })
    setFeedbacks(p => p.map(f => f.id === id ? {...f, isRead: true} : f))
  }

  const activeSurveys = surveys.filter(s=>s.active)
  
  const unreadCount = feedbacks.filter(f => {
    if (f.isRead) return false
    const lastSender = f.replies?.length ? f.replies[f.replies.length - 1].senderRole : 'INTERN'
    return lastSender !== user?.role
  }).length

  return (
    <div className="container" style={{paddingBottom:'3rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.5rem',flexWrap:'wrap',gap:'0.75rem'}}>
        <div>
          <h1 className="title" style={{display:'flex',alignItems:'center',gap:8}}><MessageSquare size={22} strokeWidth={2}/> Survei & Feedback</h1>
          <p className="subtitle">Buat survei kepuasan, pulse check, dan kumpulkan feedback intern.</p>
        </div>
        <div style={{display:'flex',gap:'0.625rem'}}>
          <button className="btn btn-secondary btn-sm" onClick={fetchSurveys} disabled={loading}><RefreshCw size={14} strokeWidth={2}/></button>
          {user?.role==='ADMIN_HR'&&<button className="btn btn-primary" onClick={()=>setBuilder('new')}><Plus size={15} strokeWidth={2}/> Buat Survei</button>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:'0.375rem',marginBottom:'1.25rem',overflowX:'auto',paddingBottom:4}}>
        {user?.role==='ADMIN_HR' ? (
          <>
            <button onClick={()=>setTab('manage')} style={{padding:'0.5rem 1rem',borderRadius:'var(--radius-full)',border:'2px solid',borderColor:tab==='manage'?'var(--primary)':'var(--border)',background:tab==='manage'?'var(--primary-light)':'transparent',color:tab==='manage'?'var(--primary)':'var(--text-secondary)',fontWeight:700,fontSize:'0.8rem',cursor:'pointer',transition:'all 0.15s',whiteSpace:'nowrap'}}>Kelola Survei</button>
            <button onClick={()=>setTab('inbox')} style={{padding:'0.5rem 1rem',borderRadius:'var(--radius-full)',border:'2px solid',borderColor:tab==='inbox'?'var(--primary)':'var(--border)',background:tab==='inbox'?'var(--primary-light)':'transparent',color:tab==='inbox'?'var(--primary)':'var(--text-secondary)',fontWeight:700,fontSize:'0.8rem',cursor:'pointer',transition:'all 0.15s',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:6}}>
              Kotak Masuk {unreadCount>0&&<span style={{background:'var(--danger)',color:'#fff',padding:'2px 6px',borderRadius:99,fontSize:'0.65rem'}}>{unreadCount}</span>}
            </button>
            <button onClick={()=>setTab('fill')} style={{padding:'0.5rem 1rem',borderRadius:'var(--radius-full)',border:'2px solid',borderColor:tab==='fill'?'var(--primary)':'var(--border)',background:tab==='fill'?'var(--primary-light)':'transparent',color:tab==='fill'?'var(--primary)':'var(--text-secondary)',fontWeight:700,fontSize:'0.8rem',cursor:'pointer',transition:'all 0.15s',whiteSpace:'nowrap'}}>Preview Survei</button>
          </>
        ) : (
          <>
            <button onClick={()=>setTab('fill')} style={{padding:'0.5rem 1rem',borderRadius:'var(--radius-full)',border:'2px solid',borderColor:tab==='fill'?'var(--primary)':'var(--border)',background:tab==='fill'?'var(--primary-light)':'transparent',color:tab==='fill'?'var(--primary)':'var(--text-secondary)',fontWeight:700,fontSize:'0.8rem',cursor:'pointer',transition:'all 0.15s',whiteSpace:'nowrap'}}>📝 Jawab Survei</button>
            <button onClick={()=>setTab('suggest')} style={{padding:'0.5rem 1rem',borderRadius:'var(--radius-full)',border:'2px solid',borderColor:tab==='suggest'?'#f59e0b':'var(--border)',background:tab==='suggest'?'#fef3c7':'transparent',color:tab==='suggest'?'#d97706':'var(--text-secondary)',fontWeight:700,fontSize:'0.8rem',cursor:'pointer',transition:'all 0.15s',whiteSpace:'nowrap'}}>💡 Kirim Feedback Terbuka</button>
          </>
        )}
      </div>

      {/* ── Admin: Manage Tab ── */}
      {(user?.role==='ADMIN_HR'&&tab==='manage')&&(
        <div style={{display:'flex',flexDirection:'column',gap:'0.875rem'}}>
          {loading?[...Array(2)].map((_,i)=><div key={i} style={{height:80,background:'var(--border)',borderRadius:'var(--radius-lg)',animation:'pulse_ 1.4s ease-in-out infinite'}}/>)
           :surveys.length===0?<div className="card" style={{textAlign:'center',padding:'3rem'}}><MessageSquare size={40} style={{margin:'0 auto 1rem',opacity:0.3,color:'var(--text-muted)'}}/><p style={{color:'var(--text-muted)'}}>Belum ada survei. Klik "Buat Survei" untuk memulai.</p></div>
           :surveys.map(sv=>(
             <div key={sv.id} className="card" style={{display:'flex',gap:'1rem',alignItems:'center',flexWrap:'wrap'}}>
               <div style={{flex:1,minWidth:0}}>
                 <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                   <p style={{fontWeight:800,fontSize:'0.95rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sv.title}</p>
                   <span style={{padding:'2px 8px',borderRadius:999,fontSize:'0.65rem',fontWeight:700,background:sv.active?'var(--secondary-light)':'var(--border)',color:sv.active?'var(--secondary)':'var(--text-muted)',flexShrink:0}}>{sv.active?'Aktif':'Nonaktif'}</span>
                 </div>
                 <p style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{sv.questions?.length||0} pertanyaan · {sv.responseCount||0} respons · {sv.targetRole} · Dibuat: {fmtDate(sv.createdAt)}{sv.deadline?' · Batas: '+fmtDate(sv.deadline):''}</p>
               </div>
               <div style={{display:'flex',gap:'0.5rem',flexShrink:0,flexWrap:'wrap'}}>
                 <button className="btn btn-secondary btn-sm" onClick={()=>setViewing(sv.id)}><Eye size={13} strokeWidth={2}/> Hasil</button>
                 <button className="btn btn-secondary btn-sm" onClick={()=>setBuilder(sv)}><MessageSquare size={13} strokeWidth={2}/> Edit</button>
                 <button className="btn btn-secondary btn-sm" onClick={()=>toggleActive(sv)} title={sv.active?'Nonaktifkan':'Aktifkan'}>{sv.active?<ToggleRight size={15} strokeWidth={2} style={{color:'var(--secondary)'}}/>:<ToggleLeft size={15} strokeWidth={2}/>}</button>
                 <button className="btn btn-secondary btn-sm btn-icon" onClick={()=>deleteSv(sv.id)} style={{color:'var(--danger)'}}><Trash size={13} strokeWidth={2}/></button>
               </div>
             </div>
           ))
          }
        </div>
      )}

      {/* ── Fill Tab (Intern / Preview) ── */}
      {tab === 'fill' && (
        <div>
          {submitted&&<div style={{padding:'0.875rem 1.25rem',background:'var(--secondary-light)',borderRadius:'var(--radius-lg)',marginBottom:'1rem',display:'flex',gap:8,alignItems:'center',color:'#065f46',fontWeight:600}}>
            <CheckCircle2 size={16} strokeWidth={2}/> Terima kasih! Respons Anda sudah tercatat.
          </div>}
          {fillSv?(
            <div className="card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
                <h3 style={{fontWeight:800}}>{fillSv.title}</h3>
                <button onClick={()=>{setFillSv(null);setAnswers({})}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={18} strokeWidth={2}/></button>
              </div>
              {fillSv.description&&<p style={{color:'var(--text-secondary)',fontSize:'0.85rem',marginBottom:'1.25rem'}}>{fillSv.description}</p>}
              <div style={{display:'flex',flexDirection:'column',gap:'1.25rem',marginBottom:'1.25rem'}}>
                {(fillSv.questions||[]).map((q,qi)=>(
                  <div key={qi} style={{padding:'1rem',background:'var(--bg-main)',borderRadius:'var(--radius-lg)'}}>
                    <p style={{fontWeight:700,fontSize:'0.875rem',marginBottom:'0.875rem'}}>{qi+1}. {q.text}</p>
                    {q.type==='RATING'&&(
                      <div style={{display:'flex',gap:'0.5rem'}}>
                        {[1,2,3,4,5].map(v=>(
                          <button key={v} onClick={()=>setAnswers(p=>({...p,[q.id]:v}))}
                            style={{width:44,height:44,borderRadius:'50%',border:'2px solid',borderColor:answers[q.id]===v?'#f59e0b':'var(--border)',background:answers[q.id]===v?'#fef3c7':'var(--bg-card)',cursor:'pointer',fontSize:'1.25rem',transition:'all 0.15s'}}>
                            <Star size={20} strokeWidth={1.5} fill={answers[q.id]>=v?'#f59e0b':'none'} color={answers[q.id]>=v?'#f59e0b':'var(--border)'}/>
                          </button>
                        ))}
                        {answers[q.id]&&<span style={{marginLeft:8,fontWeight:700,color:'#f59e0b',lineHeight:'44px'}}>{answers[q.id]}/5</span>}
                      </div>
                    )}
                    {q.type==='MULTIPLE_CHOICE'&&(
                      <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
                        {(q.options||[]).map((opt,oi)=>(
                          <label key={oi} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'0.5rem 0.75rem',borderRadius:'var(--radius-md)',background:answers[q.id]===opt?'var(--primary-light)':'var(--bg-card)',border:`1.5px solid ${answers[q.id]===opt?'var(--primary)':'var(--border)'}`,transition:'all 0.15s'}}>
                            <input type="radio" name={q.id} checked={answers[q.id]===opt} onChange={()=>setAnswers(p=>({...p,[q.id]:opt}))} style={{accentColor:'var(--primary)'}}/>
                            <span style={{fontSize:'0.85rem'}}>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {q.type==='TEXT'&&(
                      <textarea className="input" rows={3} placeholder="Tulis jawaban Anda..." value={answers[q.id]||''} onChange={e=>setAnswers(p=>({...p,[q.id]:e.target.value}))} style={{resize:'vertical'}}/>
                    )}
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" style={{width:'100%',fontWeight:700}} onClick={handleFillSubmit} disabled={submitting}>
                {submitting?<><Loader2 size={15} style={{animation:'spin 1s linear infinite'}}/> Mengirim...</>:<><Send size={15} strokeWidth={2}/> Kirim Respons</>}
              </button>
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:'0.875rem'}}>
              {activeSurveys.length===0?<div className="card" style={{textAlign:'center',padding:'3rem'}}><MessageSquare size={40} style={{margin:'0 auto 1rem',opacity:0.3,color:'var(--text-muted)'}}/><p style={{color:'var(--text-muted)'}}>Tidak ada survei aktif saat ini.</p></div>
               :activeSurveys.map(sv=>(
                 <div key={sv.id} className="card">
                   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'0.75rem'}}>
                     <div>
                       <p style={{fontWeight:800,fontSize:'0.95rem'}}>{sv.title}</p>
                       <p style={{fontSize:'0.75rem',color:'var(--text-muted)',marginTop:3}}>{sv.questions?.length||0} pertanyaan{sv.deadline?' · Batas: '+fmtDate(sv.deadline):''}{submitted===sv.id?' · ✅ Sudah diisi':''}</p>
                       {sv.description&&<p style={{fontSize:'0.8rem',color:'var(--text-secondary)',marginTop:4}}>{sv.description}</p>}
                     </div>
                     {submitted===sv.id
                       ?<span style={{padding:'6px 14px',borderRadius:999,background:'var(--secondary-light)',color:'var(--secondary)',fontWeight:700,fontSize:'0.8rem'}}>✅ Selesai</span>
                       :<button className="btn btn-primary" onClick={()=>{setFillSv(sv);setAnswers({})}}><Send size={14} strokeWidth={2}/> Isi Sekarang</button>}
                   </div>
                 </div>
               ))
              }
            </div>
          )}
        </div>
      )}

      {/* ── Intern: Suggest / Feedback Tab ── */}
      {tab === 'suggest' && user?.role === 'INTERN' && (
         <div className="card" style={{animation:'fadeIn 0.3s ease'}}>
           <h3 style={{fontWeight:800,marginBottom:'1rem'}}>Kotak Saran & Pesan Langsung</h3>
           <p style={{fontSize:'0.85rem',color:'var(--text-secondary)',marginBottom:'1.5rem'}}>Kirimkan keluhan, ide, atau apresiasi Anda ke tim Admin HR secara langsung.</p>
           
           <div style={{display:'flex',gap:'0.75rem',marginBottom:'1.25rem',flexWrap:'wrap'}}>
             {['💡 Ide / Saran', '⚠️ Keluhan Fasilitas', '🌟 Apresiasi', '🧑‍🏫 Mentor / Pembimbing'].map(cat => (
               <button key={cat} onClick={()=>setSuggest(p=>({...p,category:cat}))} style={{padding:'0.5rem 1rem',borderRadius:'var(--radius-full)',border:'1px solid',borderColor:suggest.category===cat?'var(--primary)':'var(--border)',background:suggest.category===cat?'var(--primary-light)':'var(--bg-card)',color:suggest.category===cat?'var(--primary)':'var(--text-secondary)',fontWeight:700,fontSize:'0.8rem',cursor:'pointer',transition:'all 0.15s'}}>
                 {cat}
               </button>
             ))}
           </div>
           
           <div style={{marginBottom:'1.25rem'}}>
             <label className="label" style={{marginBottom:'0.5rem'}}>Bagaimana sentimen / kepuasan Anda?</label>
             <div style={{display:'flex',gap:'0.5rem'}}>
               {[
                 { v: 1, e: '😡' }, { v: 2, e: '🙁' }, { v: 3, e: '😐' }, { v: 4, e: '🙂' }, { v: 5, e: '😍' }
               ].map(r => (
                 <button key={r.v} onClick={()=>setSuggest(p=>({...p,sentimentScore:r.v}))}
                   style={{width:48,height:48,borderRadius:'50%',border:'2px solid',borderColor:suggest.sentimentScore===r.v?'var(--primary)':'var(--border)',background:suggest.sentimentScore===r.v?'var(--primary-light)':'var(--bg-card)',cursor:'pointer',fontSize:'1.5rem',transition:'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',transform:suggest.sentimentScore===r.v?'scale(1.15)':'scale(1)'}}>
                   {r.e}
                 </button>
               ))}
             </div>
           </div>

           <div style={{marginBottom:'1rem'}}>
             <label className="label" style={{marginBottom:'0.5rem'}}>Pesan Anda <span style={{color:'var(--danger)'}}>*</span></label>
             <textarea className="input" rows={5} placeholder="Ceritakan sedetail mungkin usulan atau masalah yang Anda temui..." value={suggest.content} onChange={e=>setSuggest(p=>({...p,content:e.target.value}))}/>
           </div>
           
           <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'1.5rem'}}>
             <input type="checkbox" id="anonToggle" checked={suggest.isAnonymous} onChange={e=>setSuggest(p=>({...p,isAnonymous:e.target.checked}))} style={{width:16,height:16,accentColor:'var(--primary)'}}/>
             <label htmlFor="anonToggle" style={{fontSize:'0.85rem',color:'var(--text-secondary)',cursor:'pointer'}}>Kirim sebagai Anonim (Sembunyikan Identitas)</label>
           </div>
           
           <button className="btn btn-primary" onClick={handleSuggestSubmit} disabled={sendingFb} style={{width:'100%',fontWeight:800}}>
             {sendingFb?<><Loader2 size={15} style={{animation:'spin 1s linear infinite'}}/> Mengirim...</>:<><Send size={15} strokeWidth={2}/> Kirim Feedback Sekarang</>}
           </button>

           {/* Intern History */}
           <div style={{marginTop:'3rem',borderTop:'1px solid var(--border)',paddingTop:'2rem'}}>
             <h3 style={{fontWeight:800,marginBottom:'1.25rem',fontSize:'1.1rem'}}>Riwayat Aspirasi Anda</h3>
             {feedbacks.length === 0 ? <p style={{fontSize:'0.85rem',color:'var(--text-muted)'}}>Anda belum pernah mengirim feedback langsung.</p> : (
               <div style={{display:'flex',flexDirection:'column',gap:'0.875rem'}}>
                 {feedbacks.map(fb => (
                   <div key={fb.id} style={{padding:'1rem',background:'var(--bg-main)',borderRadius:'var(--radius-lg)',border:'1px solid var(--border)'}}>
                     <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:'0.75rem'}}>
                       <span style={{fontSize:'1.25rem'}}>{['😡','🙁','😐','🙂','😍'][fb.sentimentScore-1]}</span>
                       <div>
                         <p style={{fontWeight:800,fontSize:'0.9rem'}}>{fb.category} {fb.status==='RESOLVED'&&<span style={{fontSize:'0.65rem',padding:'2px 8px',borderRadius:999,background:'var(--secondary-light)',color:'var(--secondary)',marginLeft:8}}>🔒 Selesai</span>}</p>
                         <p style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{fmtDate(fb.createdAt)}</p>
                       </div>
                     </div>
                     <p style={{fontSize:'0.85rem',color:'var(--text-secondary)'}}>{fb.content}</p>
                     
                     <div style={{display:'flex',flexDirection:'column',gap:12,marginTop:'1.25rem'}}>
                       {(fb.adminReply && (!fb.replies || fb.replies.length === 0)) && (
                         <div style={{padding:'0.875rem',background:'var(--primary-light)',borderRadius:'var(--radius-md)',borderLeft:'3px solid var(--primary)'}}>
                           <p style={{fontWeight:800,fontSize:'0.75rem',color:'var(--primary)',marginBottom:4}}>Tanggapan dari {fb.repliedBy||'Admin HR'} ({fmtDate(fb.repliedAt)}):</p>
                           <p style={{fontSize:'0.8rem',color:'var(--text-primary)'}}>{fb.adminReply}</p>
                         </div>
                       )}
                       {(fb.replies||[]).map(r => (
                         <div key={r.id} style={{padding:'0.75rem 1rem', borderRadius:'var(--radius-md)', background:r.senderRole==='INTERN'?'var(--border)':'var(--primary-light)', alignSelf:r.senderRole==='INTERN'?'flex-end':'flex-start', maxWidth:'90%', borderLeft:r.senderRole==='ADMIN_HR'?'3px solid var(--primary)':'none', borderRight:r.senderRole==='INTERN'?'3px solid var(--text-muted)':'none'}}>
                           <p style={{fontWeight:800,fontSize:'0.75rem',color:r.senderRole==='INTERN'?'var(--text-secondary)':'var(--primary)',marginBottom:4}}>{r.senderName} ({fmtDate(r.createdAt)}):</p>
                           <p style={{fontSize:'0.8rem',color:'var(--text-primary)'}}>{r.text}</p>
                         </div>
                       ))}
                     </div>
                     
                     <div style={{marginTop:'1.25rem', borderTop:'1px solid var(--border)', paddingTop:'1rem'}}>
                       {!fb.isRead && ((fb.replies?.length ? fb.replies[fb.replies.length-1].senderRole : 'ADMIN_HR') !== user?.role) && (
                         <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'0.75rem'}}>
                           <button className="btn btn-secondary btn-sm" onClick={()=>markRead(fb.id)} style={{fontWeight:700,fontSize:'0.75rem'}}><CheckCircle2 size={14}/> Tandai Sudah Dibaca</button>
                         </div>
                       )}
                       {fb.status === 'RESOLVED' ? (
                         <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'0.5rem',background:'var(--bg-card)',color:'var(--text-muted)',borderRadius:'var(--radius-full)',fontSize:'0.8rem',fontWeight:700}}>
                           <CheckCircle2 size={16}/> Masalah ini telah ditandai Selesai
                         </div>
                       ) : (
                         <div style={{display:'flex',gap:'0.5rem',flexDirection:'column'}}>
                           <div style={{display:'flex',gap:'0.5rem'}}>
                             <input className="input" placeholder="Tulis balasan..." style={{flex:1,fontSize:'0.8rem'}} value={draftReplies[fb.id]||''} onChange={e=>setDraftReplies(p=>({...p,[fb.id]:e.target.value}))}/>
                             <button className="btn btn-primary" style={{padding:'0 1rem',fontWeight:700,fontSize:'0.8rem'}} onClick={()=>handleReplySubmit(fb.id)}>Kirim Balasan</button>
                           </div>
                           <button className="btn btn-secondary btn-sm" style={{alignSelf:'flex-end',color:'var(--secondary)',fontWeight:700}} onClick={()=>handleResolveSubmit(fb.id)}>✅ Tandai Selesai</button>
                         </div>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
         </div>
      )}

      {/* ── Admin HR: Inbox Tab ── */}
      {tab === 'inbox' && user?.role === 'ADMIN_HR' && (
         <div style={{display:'flex',flexDirection:'column',gap:'0.875rem'}}>
           {feedbacks.length === 0 ? <div className="card" style={{textAlign:'center',padding:'4rem 1rem'}}><MessageSquare size={48} style={{margin:'0 auto 1rem',opacity:0.2,color:'var(--text-muted)'}}/><p style={{fontWeight:700,color:'var(--text-secondary)'}}>Kotak masuk kosong</p><p style={{fontSize:'0.82rem',color:'var(--text-muted)',marginTop:8}}>Belum ada feedback yang masuk dari intern.</p></div>
            : feedbacks.map(fb => (
              <div key={fb.id} className="card" style={{borderLeft:!fb.isRead?'4px solid var(--primary)':'1px solid var(--border)',background:!fb.isRead?'var(--bg-main)':'var(--bg-card)',padding:!fb.isRead?'1.5rem':'1rem',transition:'all 0.3s'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.75rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{fontSize:'1.8rem',background:'var(--bg-card)',borderRadius:'50%',width:48,height:48,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'var(--shadow-sm)'}}>{['😡','🙁','😐','🙂','😍'][fb.sentimentScore-1]}</div>
                    <div>
                      <p style={{fontWeight:800,fontSize:'1rem',color:'var(--text-primary)'}}>{fb.category} {fb.status==='RESOLVED'&&<span style={{fontSize:'0.65rem',padding:'2px 8px',borderRadius:999,background:'var(--secondary-light)',color:'var(--secondary)',marginLeft:8}}>🔒 Selesai</span>}</p>
                      <p style={{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:2}}>Dari: <span style={{fontWeight:fb.isAnonymous?700:500}}>{fb.isAnonymous ? '🕵️‍♂️ Anonim' : fb.internName}</span> · {fmtDate(fb.createdAt)}</p>
                    </div>
                  </div>
                  {(!fb.isRead && ((fb.replies?.length ? fb.replies[fb.replies.length-1].senderRole : 'INTERN') !== user?.role)) && <span style={{fontSize:'0.7rem',padding:'4px 10px',borderRadius:999,background:'var(--primary-light)',color:'var(--primary)',fontWeight:800,animation:'pulse_ 2s infinite'}}>Pesan Baru</span>}
                </div>
                <div style={{padding:'1rem',background:'var(--bg-card)',borderRadius:'var(--radius-md)',fontSize:'0.875rem',color:'var(--text-secondary)',lineHeight:1.6,whiteSpace:'pre-wrap',border:'1px solid var(--border)'}}>
                  {fb.content}
                </div>
                
                <div style={{marginTop:'1.25rem',display:'flex',flexDirection:'column',gap:12}}>
                  {(fb.adminReply && (!fb.replies || fb.replies.length === 0)) && (
                    <div style={{padding:'0.875rem',background:'var(--primary-light)',borderRadius:'var(--radius-md)',borderLeft:'3px solid var(--primary)'}}>
                      <p style={{fontWeight:800,fontSize:'0.75rem',color:'var(--primary)',marginBottom:4}}>Tanggapan dari {fb.repliedBy||'Admin HR'} ({fmtDate(fb.repliedAt)}):</p>
                      <p style={{fontSize:'0.8rem',color:'var(--text-primary)'}}>{fb.adminReply}</p>
                    </div>
                  )}
                  {(fb.replies||[]).map(r => (
                    <div key={r.id} style={{padding:'0.75rem 1rem', borderRadius:'var(--radius-md)', background:r.senderRole==='ADMIN_HR'?'var(--primary-light)':'var(--border)', alignSelf:r.senderRole==='ADMIN_HR'?'flex-end':'flex-start', maxWidth:'90%', borderLeft:r.senderRole==='INTERN'?'3px solid var(--text-muted)':'none', borderRight:r.senderRole==='ADMIN_HR'?'3px solid var(--primary)':'none'}}>
                      <p style={{fontWeight:800,fontSize:'0.75rem',color:r.senderRole==='ADMIN_HR'?'var(--primary)':'var(--text-secondary)',marginBottom:4}}>{r.senderName} ({fmtDate(r.createdAt)}):</p>
                      <p style={{fontSize:'0.8rem',color:'var(--text-primary)'}}>{r.text}</p>
                    </div>
                  ))}
                </div>
                
                <div style={{marginTop:'1.25rem', borderTop:'1px solid var(--border)', paddingTop:'1rem'}}>
                  {!fb.isRead && ((fb.replies?.length ? fb.replies[fb.replies.length-1].senderRole : 'INTERN') !== user?.role) && (
                    <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'0.75rem'}}>
                      <button className="btn btn-secondary btn-sm" onClick={()=>markRead(fb.id)} style={{fontWeight:700,fontSize:'0.75rem'}}><CheckCircle2 size={14}/> Tandai Sudah Dibaca</button>
                    </div>
                  )}
                  {fb.status === 'RESOLVED' ? (
                    <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'0.5rem',background:'var(--bg-card)',color:'var(--text-muted)',borderRadius:'var(--radius-full)',fontSize:'0.8rem',fontWeight:700}}>
                      <CheckCircle2 size={16}/> Masalah ini telah ditandai Selesai
                    </div>
                  ) : (
                    <div style={{display:'flex',gap:'0.5rem',flexDirection:'column'}}>
                      <div style={{display:'flex',gap:'0.5rem'}}>
                        <input className="input" placeholder="Tulis balasan untuk intern..." style={{flex:1,fontSize:'0.8rem'}} value={draftReplies[fb.id]||''} onChange={e=>setDraftReplies(p=>({...p,[fb.id]:e.target.value}))}/>
                        <button className="btn btn-primary" style={{padding:'0 1rem',fontWeight:700,fontSize:'0.8rem'}} onClick={()=>handleReplySubmit(fb.id)}>Kirim Balasan</button>
                      </div>
                      <button className="btn btn-secondary btn-sm" style={{alignSelf:'flex-end',color:'var(--secondary)',fontWeight:700}} onClick={()=>handleResolveSubmit(fb.id)}>✅ Tandai Selesai</button>
                    </div>
                  )}
                </div>
              </div>
            ))
           }
         </div>
      )}

      {builder&&<BuilderModal initial={builder==='new'?null:builder} onSave={handleSave} onClose={()=>setBuilder(null)}/>}
      {viewing&&<ResultsModal surveyId={viewing} onClose={()=>setViewing(null)}/>}
      <style>{`@keyframes pulse_{0%,100%{opacity:1}50%{opacity:0.4}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Search, Trash, Edit, Download, X, Loader2, AlertCircle, Filter,
  Upload, FileUp, CheckCircle2, Info, TriangleAlert, ArrowRight,
  ChevronRight, ChevronLeft, FileSpreadsheet, ArrowUpDown,
  ChevronDown, ChevronUp, SquareCheck, Square, Eye, EyeOff,
  Settings2, Bell, RefreshCw, User
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
// import * as XLSX from 'xlsx/xlsx.mjs' (Dihapus untuk dynamic import)
import Swal from 'sweetalert2'
import { ProfileDrawer } from './ProfileDrawer'

/* ─── Helpers ─────────────────────────────────────── */
const calcDuration = (s, e) => {
  const a=new Date(s), b=new Date(e)
  if(isNaN(a)||isNaN(b)||b<a) return ''
  const d=Math.ceil(Math.abs(b-a)/86400000), m=Math.floor(d/30), r=d%30
  return `${m>0?m+' Bulan ':''}${r>0?r+' Hari':''}`
}
const excelDateToISO = v => {
  if(!v) return ''
  if(typeof v==='number'){const d=new Date(Math.round((v-25568)*86400*1000));return d.toISOString().split('T')[0]}
  const p=new Date(v); return isNaN(p)?String(v):p.toISOString().split('T')[0]
}
const sisaHari = end => {
  if(!end) return null
  const t=new Date(); t.setHours(0,0,0,0)
  return Math.ceil((new Date(end)-t)/86400000)
}
const progressPct = (s,e) => {
  const a=new Date(s),b=new Date(e),t=new Date()
  if(isNaN(a)||isNaN(b)||b<=a) return 0
  return Math.min(100,Math.max(0,Math.round(((t-a)/(b-a))*100)))
}

const TEMPLATE_HEADERS=['Nama Lengkap','Email','NIM/NIS','Jenis Kelamin','No. Handphone','NIK','Tanggal Lahir','Alamat','Perguruan Tinggi/Sekolah','Jenjang','Jurusan','Nama Bank','Nomor Rekening','Pemilik Rekening','Status','Bidang','Wilayah Kerja','Tahun','Tanggal Mulai','Tanggal Selesai','SPK/Perjanjian','Tanggal SPK','Surat Penerimaan','Tanggal Surat Penerimaan','Surat Selesai','Tanggal Surat Selesai']
const HEADER_MAP={'Nama Lengkap':'name','Email':'email','NIM/NIS':'nim_nis','Jenis Kelamin':'gender','No. Handphone':'phone','NIK':'nik','Tanggal Lahir':'birthDate','Alamat':'address','Perguruan Tinggi/Sekolah':'university','Jenjang':'jenjang','Jurusan':'major','Nama Bank':'bankName','Nomor Rekening':'bankAccount','Pemilik Rekening':'bankAccountName','Status':'status','Bidang':'bidang','Wilayah Kerja':'wilayah','Tahun':'tahun','Tanggal Mulai':'periodStart','Tanggal Selesai':'periodEnd','SPK/Perjanjian':'spk','Tanggal SPK':'tanggalSPK','Surat Penerimaan':'suratPenerimaan','Tanggal Surat Penerimaan':'tanggalSuratPenerimaan','Surat Selesai':'suratSelesai','Tanggal Surat Selesai':'tanggalSuratSelesai'}
const emptyForm={name:'',email:'',nim_nis:'',gender:'Laki-laki',phone:'',nik:'',birthDate:'',address:'',university:'',jenjang:'S1',major:'',status:'ACTIVE',bidang:'',wilayah:'',tahun:new Date().getFullYear().toString(),periodStart:'',periodEnd:'',duration:'',bankName:'',bankAccount:'',bankAccountName:'',suratPenerimaan:'',tanggalSuratPenerimaan:'',spk:'',tanggalSPK:'',amandemen:'',tanggalAmandemen:'',suratSelesai:'',tanggalSuratSelesai:'',supervisorName:'',supervisorTitle:''}

/* ─── Skeleton ─────────────────────────────────────── */
const SkeletonRow = ({cols}) => (
  <tr>{[...Array(cols)].map((_,i)=>(
    <td key={i}><div style={{height:12,width:'80%',background:'var(--border)',borderRadius:4,animation:'pulse 1.4s ease-in-out infinite'}}/></td>
  ))}</tr>
)

/* ─── Sisa Hari Badge ──────────────────────────────── */
const SisaBadge = ({end}) => {
  const s=sisaHari(end)
  if(s===null) return <span style={{color:'var(--text-muted)'}}>-</span>
  if(s<0) return <span style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>Selesai</span>
  const color=s<=7?'var(--danger)':s<=14?'var(--warning)':'var(--secondary)'
  return <span style={{fontWeight:700,fontSize:'0.82rem',color}}>{s<=7?'⚠ ':''}{s}h</span>
}

/* ─── Sort Header ──────────────────────────────────── */
const SortTh = ({label,field,sortConfig,onSort,style={}}) => {
  const active=sortConfig.key===field
  return (
    <th onClick={()=>onSort(field)} style={{cursor:'pointer',userSelect:'none',...style}}>
      <div style={{display:'flex',alignItems:'center',gap:4}}>
        {label}
        <span style={{opacity:active?1:0.3,color:active?'var(--primary)':'inherit'}}>
          {active&&sortConfig.dir==='asc'?'↑':active&&sortConfig.dir==='desc'?'↓':<ArrowUpDown size={11} strokeWidth={2}/>}
        </span>
      </div>
    </th>
  )
}

/* ─── Import Modal ─────────────────────────────────── */
function ImportModal({onClose, onImported}) {
  const [step,setStep]=useState('upload')
  const [file,setFile]=useState(null)
  const [rows,setRows]=useState([])
  const [importResult,setImportResult]=useState(null)
  const [isDragging,setIsDragging]=useState(false)
  const [didImport,setDidImport]=useState(false)
  const inputRef=useRef()

  // Custom onClose to ensure refresh if we imported anything
  const handleClose = () => {
    if (didImport && onImported) {
      onImported(importResult?.ids || []);
    }
    onClose();
  };

  const parseFile = async (f) => {
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx')
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false })
        if (raw.length < 2) { Swal.fire('File Kosong', 'Sheet tidak memiliki data.', 'warning'); return }
        const headers = raw[0]
        const parsed = raw.slice(1).filter(r => r.some(c => c)).map(row => {
          const obj = {}
          headers.forEach((h, i) => {
            const key = HEADER_MAP[h?.trim()] || h
            const val = row[i]
            if (['periodStart','periodEnd','tanggalSPK','tanggalSuratPenerimaan','tanggalSuratSelesai','tanggalAmandemen'].includes(key)) {
              obj[key] = excelDateToISO(val)
            } else {
              obj[key] = val !== undefined ? String(val).trim() : ''
            }
          })
          if (obj.periodStart && obj.periodEnd) obj.duration = calcDuration(obj.periodStart, obj.periodEnd)
          return obj
        })
        setRows(parsed); setStep('preview')
      } catch (err) {
        console.error('Parse Excel error:', err)
        Swal.fire('Error', 'Gagal membaca file Excel: ' + (err.message || ''), 'error')
      }
    }
    reader.readAsArrayBuffer(f)
  }


  const downloadTemplate = (e) => {
    e.preventDefault();
    // Gunakan window.location.assign (Snippet 4 approach) daripada blob: agar browser mematuhi header server
    // dan tidak generate UUID. Tambahkan timestamp untuk menghindari cache.
    window.location.assign(`/api/download/Template_Import_Intern.xlsx?t=${Date.now()}`);
  }

  const handleDrop = e => {
    e.preventDefault(); setIsDragging(false)
    const f=e.dataTransfer.files[0]
    if(f&&(f.name.endsWith('.xlsx')||f.name.endsWith('.xls'))) parseFile(f)
    else Swal.fire('Format Salah','Hanya .xlsx / .xls','warning')
  }

  const doImport = async () => {
    setStep('importing')
    try{
      const res=await fetch('/api/interns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(rows)})
      const result=await res.json()
      setImportResult(result); setStep('done'); setDidImport(true)
    }catch{Swal.fire('Gagal','Terjadi kesalahan.','error');setStep('preview')}
  }

  const BOX={position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'1rem'}
  const CARD={background:'var(--bg-card)',borderRadius:'var(--radius-xl)',width:'100%',maxWidth:step==='preview'?'860px':'520px',maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'var(--shadow-xl)',animation:'scaleUp 0.25s ease'}

  return (
    <div style={BOX}>
      <div style={CARD}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1.25rem 1.5rem',borderBottom:'1px solid var(--border)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.625rem'}}>
            <div style={{width:36,height:36,borderRadius:'var(--radius-md)',background:'var(--primary-light)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--primary)'}}><FileUp size={18} strokeWidth={2}/></div>
            <div>
              <p style={{fontWeight:700,fontSize:'0.95rem'}}>Import dari Templat</p>
              <p style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>
                {step==='upload'&&'Langkah 1: Upload file Excel'}
                {step==='preview'&&`Langkah 2: Preview ${rows.length} data`}
                {step==='importing'&&'Mengimpor data...'}
                {step==='done'&&'Import selesai!'}
              </p>
            </div>
          </div>
          {step!=='importing'&&<button onClick={handleClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:4,borderRadius:'50%',transition:'background 0.2s',display:'flex',alignItems:'center',justifyContent:'center'}} onMouseEnter={e=>e.target.style.background='var(--border)'} onMouseLeave={e=>e.target.style.background='none'}><X size={20} strokeWidth={2}/></button>}
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'1.5rem'}}>
          {step==='upload'&&(
            <div>
              <div style={{background:'var(--primary-light)',border:'1px solid rgba(99,102,241,0.15)',borderRadius:'var(--radius-lg)',padding:'1rem 1.25rem',marginBottom:'1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'1rem'}}>
                <div>
                  <p style={{fontWeight:700,fontSize:'0.875rem',color:'var(--primary)'}}>Belum punya file templat?</p>
                  <p style={{fontSize:'0.8rem',color:'var(--text-secondary)',marginTop:2}}>Unduh templat Excel resmi dengan format dan contoh data yang sudah sesuai.</p>
                </div>
                <button 
                  onClick={downloadTemplate} 
                  className="btn btn-primary" 
                  style={{flexShrink:0,fontSize:'0.8rem',padding:'0.5rem 1rem'}}
                >
                  <Download size={15} strokeWidth={2}/> Unduh Templat
                </button>
              </div>
              <div onDragOver={e=>{e.preventDefault();setIsDragging(true)}} onDragLeave={()=>setIsDragging(false)} onDrop={handleDrop} onClick={()=>inputRef.current?.click()}
                style={{border:`2px dashed ${isDragging?'var(--primary)':'var(--border)'}`,borderRadius:'var(--radius-lg)',background:isDragging?'var(--primary-light)':'var(--bg-main)',padding:'3rem 2rem',textAlign:'center',cursor:'pointer',transition:'all 0.2s'}}>
                <Upload size={40} strokeWidth={1.5} style={{color:'var(--text-muted)',margin:'0 auto 1rem'}}/>
                <p style={{fontWeight:700,fontSize:'0.95rem',marginBottom:'0.375rem'}}>{isDragging?'Lepaskan file di sini':'Drag & Drop file Excel'}</p>
                <p style={{fontSize:'0.8rem',color:'var(--text-muted)',marginBottom:'1rem'}}>atau klik untuk memilih file</p>
                <span style={{padding:'4px 12px',background:'var(--border)',borderRadius:'var(--radius-full)',fontSize:'0.7rem',color:'var(--text-secondary)',fontWeight:600}}>.xlsx · .xls · Maks 10MB</span>
                <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={e=>parseFile(e.target.files[0])}/>
              </div>
              <div style={{marginTop:'1.25rem',padding:'0.875rem 1rem',background:'var(--secondary-light)',borderRadius:'var(--radius-md)',display:'flex',gap:'0.625rem',alignItems:'flex-start'}}>
                <Info size={16} strokeWidth={2} style={{color:'var(--secondary)',flexShrink:0,marginTop:2}}/>
                <p style={{fontSize:'0.8rem',color:'var(--text-secondary)',lineHeight:1.5}}>Sistem cerdas aktif: Data dengan <strong>NIM/NIS sama</strong> akan otomatis <strong>diperbarui (Update)</strong>, bukan dilewati.</p>
              </div>
            </div>
          )}

          {step==='preview'&&(
            <div>
              <div style={{display:'flex',gap:'0.75rem',marginBottom:'1rem',padding:'0.875rem 1rem',background:'var(--secondary-light)',borderRadius:'var(--radius-md)',alignItems:'center'}}>
                <CheckCircle2 size={18} strokeWidth={2} style={{color:'var(--secondary)',flexShrink:0}}/>
                <div>
                  <p style={{fontSize:'0.875rem',fontWeight:700,color:'#065f46'}}>{rows.length} baris berhasil dibaca dari <strong>{file?.name}</strong></p>
                  <p style={{fontSize:'0.75rem',color:'var(--text-secondary)'}}>Tinjau data sebelum diimpor.</p>
                </div>
              </div>
              <div style={{overflowX:'auto',borderRadius:'var(--radius-md)',border:'1px solid var(--border)'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem'}}>
                  <thead>
                    <tr style={{background:'var(--bg-main)'}}>
                      {['#','Nama','NIM/NIS','Instansi','Jurusan','Periode','Status'].map(h=>(
                        <th key={h} style={{padding:'0.625rem 0.875rem',textAlign:'left',fontWeight:700,fontSize:'0.68rem',textTransform:'uppercase',color:'var(--text-muted)',borderBottom:'1px solid var(--border)',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r,i)=>{
                      const err=!r.name||!r.nim_nis
                      return(
                        <tr key={i} style={{background:err?'rgba(239,68,68,0.04)':'transparent'}}>
                          <td style={{padding:'0.625rem 0.875rem',color:'var(--text-muted)',borderBottom:'1px solid var(--border)'}}>{i+1}</td>
                          <td style={{padding:'0.625rem 0.875rem',fontWeight:600,borderBottom:'1px solid var(--border)',whiteSpace:'nowrap'}}>{err?<span style={{color:'var(--danger)'}}><TriangleAlert size={12} style={{display:'inline',marginRight:4}}/>Tidak lengkap</span>:r.name}</td>
                          <td style={{padding:'0.625rem 0.875rem',fontFamily:'monospace',borderBottom:'1px solid var(--border)'}}>{r.nim_nis}</td>
                          <td style={{padding:'0.625rem 0.875rem',borderBottom:'1px solid var(--border)',whiteSpace:'nowrap'}}>{r.university}</td>
                          <td style={{padding:'0.625rem 0.875rem',borderBottom:'1px solid var(--border)'}}>{r.major} <span style={{color:'var(--text-muted)'}}>/ {r.jenjang}</span></td>
                          <td style={{padding:'0.625rem 0.875rem',borderBottom:'1px solid var(--border)',whiteSpace:'nowrap'}}>{r.periodStart}→{r.periodEnd}{r.duration&&<span style={{display:'block',fontSize:'0.65rem',color:'var(--primary)',fontWeight:700}}>{r.duration}</span>}</td>
                          <td style={{padding:'0.625rem 0.875rem',borderBottom:'1px solid var(--border)'}}><span className={`badge ${r.status==='ACTIVE'?'badge-success':'badge-primary'}`}>{r.status||'ACTIVE'}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step==='importing'&&(
            <div style={{textAlign:'center',padding:'2rem 0'}}>
              <div style={{width:64,height:64,margin:'0 auto 1.5rem',border:'4px solid var(--primary-light)',borderTopColor:'var(--primary)',borderRadius:'50%',animation:'spin 0.9s linear infinite'}}/>
              <p style={{fontWeight:700,fontSize:'1rem',marginBottom:'0.5rem'}}>Mengimpor {rows.length} data...</p>
            </div>
          )}

          {step==='done'&&importResult&&(
            <div style={{textAlign:'center',padding:'1rem 0'}}>
              <CheckCircle2 size={56} strokeWidth={1.5} style={{color:'var(--secondary)',margin:'0 auto 1.25rem'}}/>
              <p style={{fontWeight:800,fontSize:'1.2rem',marginBottom:'1.5rem'}}>Import Selesai!</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:'0.75rem',marginBottom:'1.5rem'}}>
                <div style={{padding:'1rem',background:'var(--primary-light)',borderRadius:'var(--radius-lg)',textAlign:'center'}}>
                  <p style={{fontSize:'1.75rem',fontWeight:800,color:'var(--primary)'}}>{importResult.imported}</p>
                  <p style={{fontSize:'0.7rem',color:'var(--text-secondary)',marginTop:4,fontWeight:700}}>BARU</p>
                </div>
                <div style={{padding:'1rem',background:'var(--secondary-light)',borderRadius:'var(--radius-lg)',textAlign:'center'}}>
                  <p style={{fontSize:'1.75rem',fontWeight:800,color:'var(--secondary)'}}>{importResult.updated || 0}</p>
                  <p style={{fontSize:'0.7rem',color:'var(--text-secondary)',marginTop:4,fontWeight:700}}>UPDATE</p>
                </div>
                <div style={{padding:'1rem',background:'var(--warning-light)',borderRadius:'var(--radius-lg)',textAlign:'center'}}>
                  <p style={{fontSize:'1.75rem',fontWeight:800,color:'var(--warning)'}}>{importResult.skipped}</p>
                  <p style={{fontSize:'0.7rem',color:'var(--text-secondary)',marginTop:4,fontWeight:700}}>SKIPPED</p>
                </div>
              </div>
              {importResult.errors?.length>0&&(
                <div style={{background:'var(--warning-light)',borderRadius:'var(--radius-md)',padding:'0.875rem',textAlign:'left',maxHeight:120,overflowY:'auto'}}>
                  {importResult.errors.map((e,i)=><p key={i} style={{fontSize:'0.75rem',color:'var(--text-secondary)',marginBottom:4}}>• {e}</p>)}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{padding:'1rem 1.5rem',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:'0.625rem'}}>
          {step==='upload'&&<button className="btn btn-secondary" onClick={handleClose}>Batal</button>}
          {step==='preview'&&<>
            <button className="btn btn-secondary" onClick={()=>{setStep('upload');setRows([]);setFile(null)}}>← Ganti File</button>
            <button className="btn btn-primary" onClick={doImport}>Impor {rows.length} Data <ArrowRight size={16} strokeWidth={2}/></button>
          </>}
          {step==='done'&&<button className="btn btn-primary" onClick={handleClose}>
            <CheckCircle2 size={16} strokeWidth={2}/> Selesai & Refresh
          </button>}
        </div>
      </div>
    </div>
  )
}

/* ─── Main Page ────────────────────────────────────── */
export default function InternsPage() {
  const [interns, setInterns]       = useState([])
  const [pagination, setPagination] = useState({total:0,page:1,limit:10,totalPages:1})
  const [stats, setStats]           = useState({total:0,active:0,pending:0,completed:0,terminated:0,expiringSoon:0})
  const [loading, setLoading]       = useState(true)
  const [newlyAdded, setNewlyAdded] = useState([])

  // Filter & sort
  const [searchTerm, setSearchTerm]     = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [advFilters, setAdvFilters]     = useState({tahun:'2026',jenjang:'',bidang:'',wilayah:''})
  const [showAdv, setShowAdv]           = useState(false)
  const [programView, setProgramView]   = useState('active') // 'active' = 2026, 'archive' = all others
  const [sortConfig, setSortConfig]     = useState({key:'name',dir:'asc'})

  // UI state
  const [visibleCols, setVisibleCols] = useState({school:true,major:true,location:true,mulai:true,selesai:true,progress:true,sisaHari:true})
  const [showColToggle, setShowColToggle] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [profileTarget, setProfileTarget] = useState(null)
  const [quickEditId, setQuickEditId] = useState(null)

  // Filter & sort handling...
  const searchParams = useSearchParams()

  // Form & UI States
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode]   = useState(false)
  const [activeTab, setActiveTab] = useState(1)
  const [formData, setFormData]   = useState(emptyForm)
  const [showImport, setShowImport] = useState(false)
  const colToggleRef = useRef()

  // Handle URL Filters (Jenjang/Bidang) on mount
  useEffect(() => {
    const j = searchParams.get('jenjang')
    const b = searchParams.get('bidang')
    const s = searchParams.get('status')
    const t = searchParams.get('tahun')
    if (j || b || s || t) {
      setAdvFilters(p => ({
        ...p,
        ...(j && { jenjang: j }),
        ...(b && { bidang: b }),
        ...(t && { tahun: t })
      }))
      if (s) setStatusFilter(s.toUpperCase())
      if (j || b) setShowAdv(true)
      if (t && t !== '2026') setProgramView('archive')
    }
  }, [searchParams])

  // Handle program view toggle
  const handleProgramView = (view) => {
    setProgramView(view)
    if (view === 'active') {
      setAdvFilters(p => ({ ...p, tahun: '2026' }))
    } else {
      setAdvFilters(p => ({ ...p, tahun: '' }))
    }
    setPagination(p => ({ ...p, page: 1 }))
  }

  // Close col toggle on outside click
  useEffect(() => {
    const handler = e => { if(colToggleRef.current&&!colToggleRef.current.contains(e.target)) setShowColToggle(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchInterns = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({
        page: pagination.page, limit: pagination.limit,
        search: searchTerm, status: statusFilter,
        sortBy: sortConfig.key, sortDir: sortConfig.dir,
        view: programView,
        ...(advFilters.tahun   && {tahun: advFilters.tahun}),
        ...(advFilters.jenjang && {jenjang: advFilters.jenjang}),
        ...(advFilters.bidang  && {bidang: advFilters.bidang}),
        ...(advFilters.wilayah && {wilayah: advFilters.wilayah}),
      })
      const res  = await fetch(`/api/interns?${p}`)
      const data = await res.json()
      setInterns(data.data || [])
      setPagination(data.pagination || {})
      setStats(data.stats || {})
      setSelectedIds([])
    } catch { Swal.fire('Error','Gagal memuat data peserta','error') }
    finally { setLoading(false) }
  }, [pagination.page, pagination.limit, searchTerm, statusFilter, sortConfig, advFilters])

  useEffect(() => { const t=setTimeout(fetchInterns,400); return ()=>clearTimeout(t) }, [searchTerm, statusFilter, pagination.page, sortConfig, advFilters])

  const handleSetStatusFilter = (newStatus) => {
    setStatusFilter(prev => prev === newStatus ? 'ALL' : newStatus);
    setPagination(p => ({ ...p, page: 1 }));
  };

  useEffect(() => {
    if(formData.periodStart&&formData.periodEnd)
      setFormData(p=>({...p,duration:calcDuration(p.periodStart,p.periodEnd)}))
  }, [formData.periodStart, formData.periodEnd])

  const set = (k, v) => setFormData(p => ({...p, [k]: v}))
  const resetForm = () => { setFormData(emptyForm); setEditMode(false); setActiveTab(1) }

  const handleSort = key => setSortConfig(c => ({key, dir: c.key===key&&c.dir==='asc'?'desc':'asc'}))

  const toggleSelect = id => setSelectedIds(p => p.includes(id)?p.filter(x=>x!==id):[...p,id])
  const toggleAll    = () => setSelectedIds(selectedIds.length===interns.length?[]:interns.map(i=>i.id))

  const handleEdit   = intern => { setEditMode(true); setFormData({...intern, email: intern.email || intern.user?.email || ''}); setShowModal(true); setProfileTarget(null) }
  const handleDelete = async id => {
    const r = await Swal.fire({title:'Hapus Peserta?',text:'Data akan diarsipkan.',icon:'warning',showCancelButton:true,confirmButtonColor:'var(--danger)',confirmButtonText:'Ya, Hapus!',cancelButtonText:'Batal'})
    if(r.isConfirmed){ await fetch(`/api/interns?id=${id}`,{method:'DELETE'}); Swal.fire('Terhapus!','','success'); fetchInterns(); if(profileTarget?.id===id) setProfileTarget(null) }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    try {
      const method = editMode?'PUT':'POST'
      const res  = await fetch('/api/interns',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(formData)})
      const data = await res.json()
      if(res.ok){
        Swal.fire('Berhasil',`Data ${editMode?'diperbarui':'ditambahkan'}.`,'success')
        setShowModal(false); fetchInterns(); resetForm()
        if(!editMode&&data.id){ setNewlyAdded(p=>[...p,data.id]); setTimeout(()=>setNewlyAdded(p=>p.filter(x=>x!==data.id)),3000) }
      }
    } catch { Swal.fire('Gagal','Terjadi kesalahan.','error') }
  }

  const handleBulkStatus = async status => {
    const { isConfirmed } = await Swal.fire({title:`Ubah ${selectedIds.length} intern ke "${status}"?`,icon:'question',showCancelButton:true,confirmButtonText:'Ya',cancelButtonText:'Batal'})
    if(!isConfirmed) return
    await fetch('/api/interns',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:selectedIds,status})})
    Swal.fire('Berhasil','Status diperbarui.','success')
    fetchInterns()
  }

  const handleBulkDelete = async () => {
    const { isConfirmed } = await Swal.fire({title:`Hapus ${selectedIds.length} peserta?`,icon:'warning',showCancelButton:true,confirmButtonColor:'var(--danger)',confirmButtonText:'Ya, Hapus!',cancelButtonText:'Batal'})
    if(!isConfirmed) return
    await Promise.all(selectedIds.map(id=>fetch(`/api/interns?id=${id}`,{method:'DELETE'})))
    Swal.fire('Terhapus!','','success'); fetchInterns()
  }

  const handleQuickStatus = async (id, status) => {
    await fetch('/api/interns',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:[id],status})})
    setQuickEditId(null); fetchInterns()
  }

  const exportToExcel = async (onlySelected=false) => {
    try {
      // Dynamic import XLSX — handle both ESM default export and named exports
      const xlsxMod = await import('xlsx')
      const XLSX = xlsxMod.default || xlsxMod

      let src = []
      if (onlySelected && selectedIds.length) {
        src = interns.filter(i => selectedIds.includes(i.id))
      } else {
        Swal.fire({ title: 'Menyiapkan Data...', text: 'Mengambil seluruh database peserta sesuai filter.', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })
        const p = new URLSearchParams({
          all: 'true',
          search: searchTerm, status: statusFilter,
          sortBy: sortConfig.key, sortDir: sortConfig.dir,
          ...(advFilters.tahun   && {tahun: advFilters.tahun}),
          ...(advFilters.jenjang && {jenjang: advFilters.jenjang}),
          ...(advFilters.bidang  && {bidang: advFilters.bidang}),
          ...(advFilters.wilayah && {wilayah: advFilters.wilayah}),
        })
        const res = await fetch(`/api/interns?${p}`)
        const data = await res.json()
        src = data.data || []
        Swal.close()
      }

      if (!src.length) {
        Swal.fire('Data Kosong', 'Tidak ada data peserta untuk diekspor.', 'warning')
        return
      }

      const timestamp = new Date().toISOString().split('T')[0]
      const url = `/api/interns/export?t=${Date.now()}&ext=.xlsx`
      
      const a = document.createElement('a')
      a.href = url
      a.download = `PLN_ENJINIRING_Export_${timestamp}.xlsx`
      document.body.appendChild(a)
      a.click()
      setTimeout(() => document.body.removeChild(a), 100)

      Swal.fire({ icon: 'success', title: 'Ekspor Berhasil!', text: `Data sedang diunduh.`, timer: 2000, showConfirmButton: false })
    } catch (err) {
      console.error('Export error:', err)
      Swal.fire('Gagal Ekspor', 'Terjadi kesalahan saat memproses data Excel: ' + err.message, 'error')
    }
  }


  const totalCols = 2 + Object.values(visibleCols).filter(Boolean).length + 2 // checkbox+name + visible + status+aksi

  return (
    <div className="container">
      {/* ── Program View Tab ── */}
      <div style={{display:'flex',gap:'0.25rem',marginBottom:'1rem',background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'4px',border:'1px solid var(--border)',width:'fit-content'}}>
        <button onClick={()=>handleProgramView('active')} style={{
          padding:'0.5rem 1.25rem',borderRadius:'var(--radius-md)',border:'none',cursor:'pointer',
          fontSize:'0.82rem',fontWeight:700,transition:'all 0.2s',
          background:programView==='active'?'var(--primary)':'transparent',
          color:programView==='active'?'#fff':'var(--text-secondary)',
          boxShadow:programView==='active'?'0 2px 8px rgba(99,102,241,0.3)':'none'
        }}>
          🎯 Program 2026
        </button>
        <button onClick={()=>handleProgramView('archive')} style={{
          padding:'0.5rem 1.25rem',borderRadius:'var(--radius-md)',border:'none',cursor:'pointer',
          fontSize:'0.82rem',fontWeight:700,transition:'all 0.2s',
          background:programView==='archive'?'var(--text-muted)':'transparent',
          color:programView==='archive'?'#fff':'var(--text-muted)',
          boxShadow:programView==='archive'?'0 2px 8px rgba(0,0,0,0.15)':'none'
        }}>
          📁 Arsip (2024-2025)
        </button>
      </div>

      {/* ── Archive Banner ── */}
      {programView==='archive'&&(
        <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:'var(--radius-lg)',padding:'0.75rem 1.25rem',marginBottom:'1rem',display:'flex',alignItems:'center',gap:'0.75rem'}}>
          <span style={{fontSize:18}}>📁</span>
          <div>
            <p style={{fontSize:'0.85rem',fontWeight:700,color:'var(--warning)'}}>Mode Arsip — Data Historis (2024 & 2025)</p>
            <p style={{fontSize:'0.75rem',color:'var(--text-secondary)'}}>Menampilkan peserta dari program sebelumnya. Data ini tetap dapat diedit jika diperlukan.</p>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-4" style={{flexWrap:'wrap',gap:'0.75rem'}}>
        <div>
          <h1 className="title">Manajemen Peserta Magang {programView==='archive'?'— Arsip':''}</h1>
          <div style={{display:'flex',gap:'0.5rem',marginTop:'0.375rem',flexWrap:'wrap'}}>
            {[
              {label:`${stats.active} Aktif`,   filter:'ACTIVE',     color:'var(--secondary)'},
              {label:`${stats.pending} Pending`, filter:'PENDING',    color:'#f59e0b'},
              {label:`${stats.completed} Selesai`, filter:'COMPLETED', color:'var(--primary)'},
              {label:`${stats.terminated} Dihentikan`, filter:'TERMINATED', color:'var(--danger)'},
              ...(stats.expiringSoon>0?[{label:`⚠ ${stats.expiringSoon} Akan Berakhir`,filter:'ACTIVE',color:'var(--warning)'}]:[])
            ].map((s,i)=>{
              const isActive = statusFilter === s.filter;
              return (
                <button key={i} onClick={()=>handleSetStatusFilter(s.filter)}
                  className={`status-chip ${isActive ? 'active' : ''}`}
                  style={{
                    background: isActive ? s.color + '22' : 'transparent',
                    border: isActive ? `1.5px solid ${s.color}` : '1.5px solid transparent',
                    cursor:'pointer', fontSize:'0.78rem', fontWeight:700, color:s.color, padding:'4px 10px', borderRadius:'var(--radius-full)', transition:'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isActive ? `0 0 12px ${s.color}33` : 'none',
                    transform: isActive ? 'translateY(-1px)' : 'none'
                  }}>
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2" style={{flexWrap:'wrap'}}>
          <button className="btn btn-secondary" onClick={fetchInterns} title="Refresh" disabled={loading}>
            <RefreshCw size={15} strokeWidth={2} style={{animation:loading?'spin 1s linear infinite':'none'}}/>
          </button>
          <div ref={colToggleRef} style={{position:'relative'}}>
            <button className="btn btn-secondary" onClick={()=>setShowColToggle(p=>!p)} title="Tampilkan/Sembunyikan Kolom">
              <Settings2 size={15} strokeWidth={2}/>
            </button>
            {showColToggle&&(
              <div style={{position:'absolute',right:0,top:'calc(100% + 6px)',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'0.75rem',zIndex:50,minWidth:180,boxShadow:'var(--shadow-lg)'}}>
                <p style={{fontSize:'0.72rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',marginBottom:'0.5rem'}}>Tampilkan Kolom</p>
                {Object.entries({school:'Sekolah/Kampus',major:'Jurusan/Jenjang',location:'Wilayah & Bidang',mulai:'Mulai',selesai:'Selesai',progress:'Progress',sisaHari:'Sisa Hari'}).map(([key,label])=>(
                  <label key={key} style={{display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.25rem 0',cursor:'pointer',fontSize:'0.82rem'}}>
                    <input type="checkbox" checked={visibleCols[key]} onChange={()=>setVisibleCols(p=>({...p,[key]:!p[key]}))} style={{cursor:'pointer'}}/>
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-secondary" onClick={()=>exportToExcel(false)} title="Export Excel"><FileSpreadsheet size={15} strokeWidth={2}/></button>
          <button className="btn btn-secondary" style={{borderColor:'var(--primary)',color:'var(--primary)'}} onClick={()=>setShowImport(true)}>
            <Upload size={15} strokeWidth={2}/> Import
          </button>
          <button className="btn btn-primary" onClick={()=>{resetForm();setShowModal(true)}}>
            <Plus size={15} strokeWidth={2}/> Tambah Peserta
          </button>
        </div>
      </div>

      {/* ── Expiring Soon Banner ── */}
      {stats.expiringSoon>0&&(
        <div style={{background:'var(--warning-light)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:'var(--radius-lg)',padding:'0.75rem 1.25rem',marginBottom:'1rem',display:'flex',alignItems:'center',gap:'0.75rem'}}>
          <Bell size={16} style={{color:'var(--warning)',flexShrink:0}}/>
          <p style={{fontSize:'0.85rem',color:'#92400e',fontWeight:600}}>
            <strong>{stats.expiringSoon} peserta magang</strong> akan mengakhiri periode dalam 14 hari ke depan. Segera proses surat selesai.
          </p>
        </div>
      )}

      {/* ── Bulk Action Bar ── */}
      {selectedIds.length>0&&(
        <div style={{background:'var(--primary-light)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'var(--radius-lg)',padding:'0.75rem 1.25rem',marginBottom:'1rem',display:'flex',alignItems:'center',gap:'0.875rem',flexWrap:'wrap'}}>
          <span style={{fontSize:'0.85rem',fontWeight:700,color:'var(--primary)'}}>{selectedIds.length} dipilih</span>
          <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
            {['ACTIVE','PENDING','COMPLETED','TERMINATED'].map(s=>(
              <button key={s} className="btn btn-secondary" style={{fontSize:'0.75rem',padding:'0.375rem 0.75rem'}} onClick={()=>handleBulkStatus(s)}>→ {s}</button>
            ))}
            <button className="btn btn-secondary" style={{fontSize:'0.75rem',padding:'0.375rem 0.75rem'}} onClick={()=>exportToExcel(true)}><FileSpreadsheet size={13} strokeWidth={2}/> Export Terpilih</button>
            <button className="btn btn-secondary" style={{fontSize:'0.75rem',padding:'0.375rem 0.75rem',color:'var(--danger)'}} onClick={handleBulkDelete}><Trash size={13} strokeWidth={2}/> Hapus Terpilih</button>
          </div>
          <button onClick={()=>setSelectedIds([])} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={16} strokeWidth={2}/></button>
        </div>
      )}

      {/* ── Search & Filter ── */}
      <div className="card mb-4">
        <div className="flex gap-3 items-center" style={{flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:260,position:'relative'}}>
            <Search size={16} strokeWidth={2} style={{position:'absolute',left:'0.75rem',top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}}/>
            <input type="text" className="input" placeholder="Cari nama, NIM/NIS, atau instansi..." style={{paddingLeft:'2.5rem'}} value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
          </div>
          <select className="select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{width:150}}>
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PENDING">PENDING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="TERMINATED">TERMINATED</option>
          </select>
          <button className="btn btn-secondary" style={{borderColor:showAdv?'var(--primary)':'',color:showAdv?'var(--primary)':''}} onClick={()=>setShowAdv(p=>!p)}>
            <Filter size={15} strokeWidth={2}/> Filter Lanjutan {showAdv?<ChevronUp size={13}/>:<ChevronDown size={13}/>}
          </button>
        </div>

        {/* Advanced Filter Panel */}
        {showAdv&&(
          <div style={{marginTop:'1rem',paddingTop:'1rem',borderTop:'1px solid var(--border)',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'0.75rem'}}>
            {[
              {label:'Tahun',key:'tahun',type:'text',placeholder:'Mis: 2026'},
              {label:'Jenjang',key:'jenjang',type:'select',opts:['','S1','D3','SMK/SMA'],labels:['Semua Jenjang','S1','D3','SMK/SMA']},
              {label:'Bidang',key:'bidang',type:'text',placeholder:'Mis: IT Development'},
              {label:'Wilayah',key:'wilayah',type:'text',placeholder:'Mis: Jakarta'},
            ].map(f=>(
              <div key={f.key} className="form-group" style={{margin:0}}>
                <label className="label" style={{marginBottom:'0.25rem'}}>{f.label}</label>
                {f.type==='select'
                  ?<select className="select" value={advFilters[f.key]} onChange={e=>setAdvFilters(p=>({...p,[f.key]:e.target.value}))}>
                    {f.opts.map((o,i)=><option key={o} value={o}>{f.labels[i]}</option>)}
                  </select>
                  :<input type="text" className="input" placeholder={f.placeholder} value={advFilters[f.key]} onChange={e=>setAdvFilters(p=>({...p,[f.key]:e.target.value}))}/>}
              </div>
            ))}
            <div style={{display:'flex',alignItems:'flex-end'}}>
              <button className="btn btn-secondary" style={{width:'100%',fontSize:'0.8rem'}} 
                onClick={() => setAdvFilters({
                  tahun: programView === 'active' ? '2026' : '',
                  jenjang: '',
                  bidang: '',
                  wilayah: ''
                })}
              >
                <X size={13} strokeWidth={2}/> Reset Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="table-container">
        <table className="table" style={{tableLayout:'auto'}}>
          <thead style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-card)'}}>
            <tr>
              <th style={{width:36}}>
                <button onClick={toggleAll} style={{background:'none',border:'none',cursor:'pointer',display:'flex',color:'var(--text-muted)'}}>
                  {selectedIds.length===interns.length&&interns.length>0?<SquareCheck size={16} strokeWidth={2} color="var(--primary)"/>:<Square size={16} strokeWidth={2}/>}
                </button>
              </th>
              <SortTh label="Nama, Email & NIM/NIS" field="name" sortConfig={sortConfig} onSort={handleSort}/>
              {visibleCols.school    && <SortTh label="Sekolah/Kampus"  field="university" sortConfig={sortConfig} onSort={handleSort}/>}
              {visibleCols.major     && <SortTh label="Jurusan/Jenjang" field="major"      sortConfig={sortConfig} onSort={handleSort}/>}
              {visibleCols.location  && <th>Wilayah & Bidang</th>}
              {visibleCols.mulai     && <SortTh label="Mulai" field="periodStart" sortConfig={sortConfig} onSort={handleSort}/>}
              {visibleCols.selesai   && <SortTh label="Selesai" field="periodEnd" sortConfig={sortConfig} onSort={handleSort}/>}
              {visibleCols.progress  && <th>Progress</th>}
              {visibleCols.sisaHari  && <SortTh label="Sisa" field="periodEnd" sortConfig={sortConfig} onSort={handleSort} style={{textAlign:'center'}}/>}
              <SortTh label="Status" field="status" sortConfig={sortConfig} onSort={handleSort}/>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(5)].map((_,i)=><SkeletonRow key={i} cols={totalCols}/>)
              : interns.length===0
                ? <tr><td colSpan={totalCols} style={{textAlign:'center',padding:'3rem',color:'var(--text-muted)'}}>
                    <AlertCircle size={40} style={{margin:'0 auto 0.75rem',opacity:0.3}}/>
                    <p>Tidak ada data peserta ditemukan.</p>
                  </td></tr>
                : interns.map(intern=>{
                    const isNew      = newlyAdded.includes(intern.id)
                    const isSelected = selectedIds.includes(intern.id)
                    const pct        = progressPct(intern.periodStart, intern.periodEnd)
                    const sc = {ACTIVE:{bg:'#dcfce7',color:'#065f46'},PENDING:{bg:'#fef3c7',color:'#92400e'},COMPLETED:{bg:'#ede9fe',color:'#5b21b6'},TERMINATED:{bg:'#fee2e2',color:'#991b1b'}}[intern.status]||{}
                    return (
                      <tr key={intern.id} style={{
                        background:isNew?'rgba(99,102,241,0.08)':isSelected?'var(--primary-light)':'transparent',
                        animation:isNew?'highlightNew 3s ease':'none',
                        transition:'background 0.2s'
                      }}>
                        <td>
                          <button onClick={()=>toggleSelect(intern.id)} style={{background:'none',border:'none',cursor:'pointer',display:'flex',color:'var(--text-muted)'}}>
                            {isSelected?<SquareCheck size={15} strokeWidth={2} color="var(--primary)"/>:<Square size={15} strokeWidth={2}/>}
                          </button>
                        </td>
                        <td>
                          <button onClick={()=>setProfileTarget(intern)} style={{background:'none',border:'none',cursor:'pointer',textAlign:'left',padding:0}}>
                            <p style={{fontWeight:700,fontSize:'0.875rem',color:'var(--primary)',textDecoration:'underline',textDecorationStyle:'dotted',textUnderlineOffset:2}}>{intern.name}</p>
                            <p style={{fontSize:'0.72rem',color:'var(--text-secondary)',marginTop:2}}>{intern.email || intern.user?.email || '-'}</p>
                            <p style={{fontSize:'0.72rem',color:'var(--text-muted)',fontFamily:'monospace',marginTop:2}}>{intern.nim_nis}</p>
                          </button>
                        </td>
                        {visibleCols.school   && <td style={{color:'var(--text-secondary)',fontSize:'0.85rem'}}>{intern.university}</td>}
                        {visibleCols.major    && <td><p style={{fontSize:'0.85rem'}}>{intern.major}</p><small style={{color:'var(--text-muted)'}}>{intern.jenjang}</small></td>}
                        {visibleCols.location && <td><p style={{fontSize:'0.85rem'}}>{intern.wilayah}</p><small style={{color:'var(--text-muted)'}}>{intern.bidang}</small></td>}
                        {visibleCols.mulai && <td><span style={{fontSize:'0.85rem',whiteSpace:'nowrap'}}>{intern.periodStart || '-'}</span></td>}
                        {visibleCols.selesai && <td><span style={{fontSize:'0.85rem',whiteSpace:'nowrap'}}>{intern.periodEnd || '-'}</span></td>}
                        {visibleCols.progress && <td style={{minWidth:120}}>
                          <div style={{height:5,background:'var(--border)',borderRadius:3,marginBottom:4,overflow:'hidden'}}>
                            <div style={{width:`${pct}%`,height:'100%',background:'var(--primary)',borderRadius:3,transition:'width 0.5s'}}/>
                          </div>
                          <span style={{color:'var(--primary)',fontWeight:700,fontSize:'0.75rem',whiteSpace:'nowrap'}}>{intern.duration} · {pct}%</span>
                        </td>}
                        {visibleCols.sisaHari && <td style={{textAlign:'center'}}><SisaBadge end={intern.periodEnd}/></td>}
                        <td>
                          {quickEditId===intern.id ? (
                            <div style={{display:'flex',flexDirection:'column',gap:3,position:'relative'}}>
                              {['ACTIVE','PENDING','COMPLETED','TERMINATED'].map(s=>(
                                <button key={s} onClick={()=>handleQuickStatus(intern.id,s)}
                                  style={{fontSize:'0.68rem',fontWeight:700,padding:'3px 8px',borderRadius:4,border:'none',cursor:'pointer',background:s===intern.status?sc.bg:'var(--bg-main)',color:s===intern.status?sc.color:'var(--text-secondary)',textAlign:'left'}}>
                                  {s}
                                </button>
                              ))}
                              <button onClick={()=>setQuickEditId(null)} style={{position:'absolute',right:-4,top:-4,background:'var(--border)',border:'none',borderRadius:'50%',cursor:'pointer',width:14,height:14,display:'flex',alignItems:'center',justifyContent:'center'}}>
                                <X size={8} strokeWidth={3}/>
                              </button>
                            </div>
                          ) : (
                            <button onClick={()=>setQuickEditId(intern.id)}
                              style={{padding:'4px 10px',borderRadius:999,fontSize:'0.72rem',fontWeight:700,background:sc.bg,color:sc.color,border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:4,transition:'all 0.15s'}}
                              title="Klik untuk ubah status">
                              {intern.status}
                              <ChevronDown size={10} strokeWidth={2.5}/>
                            </button>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <button className="btn btn-secondary btn-sm btn-icon" onClick={()=>setProfileTarget(intern)} title="Lihat Profil"><User size={13} strokeWidth={2}/></button>
                            <button className="btn btn-secondary btn-sm btn-icon" onClick={()=>handleEdit(intern)} title="Edit"><Edit size={13} strokeWidth={2}/></button>
                            <button className="btn btn-secondary btn-sm btn-icon" style={{color:'var(--danger)'}} onClick={()=>handleDelete(intern.id)} title="Hapus"><Trash size={13} strokeWidth={2}/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
            }
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {!loading&&interns.length>0&&(
        <div className="flex justify-between items-center mt-4" style={{flexWrap:'wrap',gap:'0.75rem'}}>
          <p style={{fontSize:'0.8rem',color:'var(--text-secondary)'}}>
            Menampilkan {(pagination.page-1)*pagination.limit+1}–{Math.min(pagination.page*pagination.limit,pagination.total)} dari {pagination.total} Peserta
          </p>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" disabled={pagination.page===1} onClick={()=>setPagination(p=>({...p,page:p.page-1}))}><ChevronLeft size={15} strokeWidth={2}/> Prev</button>
            {[...Array(Math.min(pagination.totalPages,7))].map((_,i)=>(
              <button key={i} className={`btn btn-sm ${pagination.page===i+1?'btn-primary':'btn-secondary'}`} onClick={()=>setPagination(p=>({...p,page:i+1}))}>{i+1}</button>
            ))}
            <button className="btn btn-secondary btn-sm" disabled={pagination.page===pagination.totalPages} onClick={()=>setPagination(p=>({...p,page:p.page+1}))}>Next <ChevronRight size={15} strokeWidth={2}/></button>
          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {showModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(4px)',padding:'1rem'}}>
          <div className="card" style={{width:'100%',maxWidth:800,maxHeight:'90vh',overflowY:'auto',position:'relative',animation:'scaleUp 0.25s ease'}}>
            <button onClick={()=>{setShowModal(false);resetForm()}} style={{position:'absolute',right:'1.25rem',top:'1.25rem',background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={22} strokeWidth={2}/></button>
            <h3 style={{marginBottom:'1.25rem',fontWeight:700}}>{editMode?'Edit Data Peserta':'Tambah Peserta Magang'}</h3>
            <div style={{display:'flex',gap:'0.15rem',marginBottom:'1.5rem',borderBottom:'1px solid var(--border)',overflowX:'auto'}}>
              {['Data Diri','Akademik','Penempatan','Pembayaran','Dokumen'].map((label,i)=>(
                <button key={i} type="button" onClick={()=>setActiveTab(i+1)} style={{padding:'0.625rem 0.85rem',fontWeight:600,fontSize:'0.78rem',background:'none',border:'none',cursor:'pointer',borderBottom:activeTab===i+1?'2px solid var(--primary)':'2px solid transparent',color:activeTab===i+1?'var(--primary)':'var(--text-secondary)',transition:'all 0.2s',whiteSpace:'nowrap'}}>{label}</button>
              ))}
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                {activeTab===1&&<>
                  <div className="form-group"><label className="label">Nama Lengkap *</label><input type="text" className="input" required value={formData.name} onChange={e=>set('name',e.target.value)}/></div>
                  <div className="form-group"><label className="label">Email *</label><input type="email" className="input" required placeholder="email@perusahaan.com" value={formData.email || ''} onChange={e=>set('email',e.target.value)}/></div>
                  <div className="form-group"><label className="label">NIM/NIS *</label><input type="text" className="input" required value={formData.nim_nis} onChange={e=>set('nim_nis',e.target.value)}/></div>
                  <div className="form-group"><label className="label">No. Handphone / WhatsApp</label><input type="tel" className="input" placeholder="Contoh: 0812..." value={formData.phone} onChange={e=>set('phone',e.target.value)}/></div>
                  <div className="form-group"><label className="label">Jenis Kelamin</label><select className="select" value={formData.gender} onChange={e=>set('gender',e.target.value)}><option>Laki-laki</option><option>Perempuan</option></select></div>
                  <div className="form-group"><label className="label">NIK (KTP)</label><input type="text" className="input" value={formData.nik} onChange={e=>set('nik',e.target.value)}/></div>
                  <div className="form-group"><label className="label">Tanggal Lahir</label><input type="date" className="input" value={formData.birthDate} onChange={e=>set('birthDate',e.target.value)}/></div>
                  <div className="form-group" style={{gridColumn:'span 2'}}><label className="label">Alamat Lengkap</label><textarea className="input" rows={2} value={formData.address} onChange={e=>set('address',e.target.value)}/></div>
                </>}
                {activeTab===2&&<>
                  <div className="form-group"><label className="label">Perguruan Tinggi/Sekolah *</label><input type="text" className="input" required value={formData.university} onChange={e=>set('university',e.target.value)}/></div>
                  <div className="form-group"><label className="label">Jurusan *</label><input type="text" className="input" required value={formData.major} onChange={e=>set('major',e.target.value)}/></div>
                  <div className="form-group"><label className="label">Jenjang</label><select className="select" value={formData.jenjang} onChange={e=>set('jenjang',e.target.value)}><option value="S1">S1</option><option value="D3">D3</option><option value="SMK/SMA">SMK/SMA</option></select></div>
                  <div className="form-group"><label className="label">Status</label><select className="select" value={formData.status} onChange={e=>set('status',e.target.value)}><option value="ACTIVE">ACTIVE</option><option value="PENDING">PENDING</option><option value="COMPLETED">COMPLETED</option><option value="TERMINATED">TERMINATED</option></select></div>
                </>}
                {activeTab===3&&<>
                  <div className="form-group"><label className="label">Bidang</label><input type="text" className="input" value={formData.bidang} onChange={e=>set('bidang',e.target.value)}/></div>
                  <div className="form-group"><label className="label">Wilayah Kerja</label><input type="text" className="input" value={formData.wilayah} onChange={e=>set('wilayah',e.target.value)}/></div>
                  <div className="form-group"><label className="label">Tahun</label><input type="text" className="input" value={formData.tahun} onChange={e=>set('tahun',e.target.value)}/></div>
                  <div className="form-group"><label className="label">Tanggal Mulai</label><input type="date" className="input" value={formData.periodStart} onChange={e=>set('periodStart',e.target.value)}/></div>
                  <div className="form-group"><label className="label">Tanggal Selesai</label><input type="date" className="input" value={formData.periodEnd} onChange={e=>set('periodEnd',e.target.value)}/></div>
                  <div className="form-group"><label className="label">Durasi (Otomatis)</label><input type="text" className="input" readOnly value={formData.duration} style={{background:'var(--bg-main)',fontWeight:700}}/></div>
                  <div className="form-group"><label className="label">Nama Pembimbing Lapangan</label><input type="text" className="input" placeholder="Nama mentor/atasan langsung" value={formData.supervisorName} onChange={e=>set('supervisorName',e.target.value)}/></div>
                  <div className="form-group"><label className="label">Jabatan Pembimbing</label><input type="text" className="input" placeholder="Contoh: Kepala Divisi IT" value={formData.supervisorTitle} onChange={e=>set('supervisorTitle',e.target.value)}/></div>
                </>}
                {activeTab===4&&<>
                  <div className="form-group"><label className="label">Nama Bank *</label><input type="text" className="input" required placeholder="Contoh: BCA, Mandiri..." value={formData.bankName} onChange={e=>set('bankName',e.target.value)}/></div>
                  <div className="form-group"><label className="label">Nomor Rekening *</label><input type="text" className="input" required value={formData.bankAccount} onChange={e=>set('bankAccount',e.target.value)}/></div>
                  <div className="form-group" style={{gridColumn:'span 2'}}><label className="label">Nama Pemilik Rekening *</label><input type="text" className="input" required placeholder="Sesuai buku tabungan" value={formData.bankAccountName} onChange={e=>set('bankAccountName',e.target.value)}/></div>
                </>}
                {activeTab===5&&<>
                  <div className="form-group"><label className="label">Surat Penerimaan</label><input type="text" className="input" value={formData.suratPenerimaan} onChange={e=>set('suratPenerimaan',e.target.value)}/></div>
                  <div className="form-group"><label className="label">Tgl Surat Penerimaan</label><input type="date" className="input" value={formData.tanggalSuratPenerimaan} onChange={e=>set('tanggalSuratPenerimaan',e.target.value)}/></div>
                  <div className="form-group"><label className="label">SPK/Perjanjian</label><input type="text" className="input" value={formData.spk} onChange={e=>set('spk',e.target.value)}/></div>
                  <div className="form-group"><label className="label">Tanggal SPK</label><input type="date" className="input" value={formData.tanggalSPK} onChange={e=>set('tanggalSPK',e.target.value)}/></div>
                  <div className="form-group"><label className="label">Surat Selesai</label><input type="text" className="input" value={formData.suratSelesai} onChange={e=>set('suratSelesai',e.target.value)}/></div>
                  <div className="form-group"><label className="label">Tanggal Surat Selesai</label><input type="date" className="input" value={formData.tanggalSuratSelesai} onChange={e=>set('tanggalSuratSelesai',e.target.value)}/></div>
                </>}
              </div>
              <div className="flex justify-between mt-6 pt-4" style={{borderTop:'1px solid var(--border)'}}>
                <div className="flex gap-2">
                  {activeTab>1&&<button type="button" className="btn btn-secondary" onClick={()=>setActiveTab(p=>p-1)}><ChevronLeft size={15} strokeWidth={2}/> Prev</button>}
                  {activeTab<5&&<button type="button" className="btn btn-secondary" onClick={()=>setActiveTab(p=>p+1)}>Next <ChevronRight size={15} strokeWidth={2}/></button>}
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-secondary" onClick={()=>{setShowModal(false);resetForm()}}>Tutup</button>
                  {activeTab===5&&<button type="submit" className="btn btn-primary">{editMode?'Simpan Perubahan':'Simpan Database'}</button>}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Import Modal ── */}
      {showImport&&(
        <ImportModal
          onClose={()=>setShowImport(false)}
          onImported={ids=>{
            setPagination(p => ({ ...p, page: 1 }));
            fetchInterns()
            if(ids?.length){ setNewlyAdded(p=>[...p,...ids]); setTimeout(()=>setNewlyAdded(p=>p.filter(x=>!ids.includes(x))),3000) }
          }}
        />
      )}

      {/* ── Profile Drawer ── */}
      {profileTarget&&(
        <ProfileDrawer
          intern={profileTarget}
          onClose={()=>setProfileTarget(null)}
          onEdit={intern=>{handleEdit(intern);setProfileTarget(null)}}
          onDelete={id=>{handleDelete(id);setProfileTarget(null)}}
        />
      )}

      <style jsx>{`
        @keyframes scaleUp{from{transform:scale(0.95);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes highlightNew{0%{background:rgba(99,102,241,0.15)}80%{background:rgba(99,102,241,0.08)}100%{background:transparent}}
        .status-chip:hover { transform: translateY(-1px); filter: brightness(0.95); boxShadow: var(--shadow-sm); }
        .status-chip.active { animation: shadowPulse 2s infinite; }
        @keyframes shadowPulse { 0% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); } 70% { box-shadow: 0 0 0 10px rgba(99,102,241,0); } 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); } }
      `}</style>
    </div>
  )
}

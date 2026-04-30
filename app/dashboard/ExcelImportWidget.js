'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle,
  X, Loader2, RefreshCw, ChevronDown, ArrowRight, Trash2,
  Table, History, Info
} from 'lucide-react'

/* ── Types ───────────────────────────────────────── */
const IMPORT_TYPES = [
  { value: 'INTERNS',    label: 'Peserta Magang', icon: '👤', color: 'var(--primary)',   desc: 'Tambah data intern baru dari Excel' },
  { value: 'ATTENDANCE', label: 'Kehadiran',       icon: '📅', color: 'var(--secondary)', desc: 'Import catatan kehadiran intern' },
  { value: 'PAYROLL',    label: 'Payroll',          icon: '💰', color: 'var(--warning)',   desc: 'Import data gaji & allowance' },
]

const STATUS_LABELS = {
  PRESENT: 'Hadir', ABSENT: 'Tidak Hadir', LATE: 'Terlambat',
  HALF_DAY: 'Setengah Hari', HOLIDAY: 'Libur', PERMISSION: 'Izin'
}

const fmtDate = dt => dt ? new Date(dt).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '-'
const fmtNum  = v  => new Intl.NumberFormat('id-ID').format(v || 0)

/* ── File Drop Zone ──────────────────────────────── */
function DropZone({ file, onFile, onClear, loading }) {
  const ref  = useRef()
  const [drag, setDrag] = useState(false)

  const validate = f => {
    if (!f) return
    const EXCEL_TYPES = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    if (!EXCEL_TYPES.includes(f.type) && !f.name.match(/\.(xlsx|xls)$/i)) {
      alert('Hanya file Excel (.xlsx / .xls) yang didukung.'); return
    }
    if (f.size > 10 * 1024 * 1024) { alert('Ukuran file maks 10MB.'); return }
    onFile(f)
  }

  if (file) return (
    <div style={{display:'flex',alignItems:'center',gap:'0.875rem',padding:'1rem 1.25rem',background:'var(--primary-light)',border:'2px solid rgba(99,102,241,0.3)',borderRadius:'var(--radius-xl)',transition:'all 0.2s'}}>
      <FileSpreadsheet size={30} style={{color:'var(--primary)',flexShrink:0}} strokeWidth={1.5}/>
      <div style={{flex:1,minWidth:0}}>
        <p style={{fontWeight:700,fontSize:'0.9rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{file.name}</p>
        <p style={{fontSize:'0.72rem',color:'var(--text-muted)',marginTop:2}}>{(file.size/1024).toFixed(1)} KB · Excel</p>
      </div>
      <button onClick={onClear} disabled={loading} style={{background:'var(--danger-light)',border:'none',borderRadius:'var(--radius-md)',padding:'0.375rem 0.625rem',cursor:'pointer',color:'var(--danger)',display:'flex',alignItems:'center',gap:4,fontSize:'0.75rem',fontWeight:600}}>
        <X size={13} strokeWidth={2}/> Ganti
      </button>
    </div>
  )

  return (
    <div
      onClick={()=>!loading&&ref.current?.click()}
      onDragOver={e=>{e.preventDefault();setDrag(true)}}
      onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);validate(e.dataTransfer.files[0])}}
      style={{border:`2px dashed ${drag?'var(--primary)':'var(--border)'}`,borderRadius:'var(--radius-xl)',padding:'2rem',textAlign:'center',cursor:loading?'not-allowed':'pointer',background:drag?'var(--primary-light)':'var(--bg-main)',transition:'all 0.2s',userSelect:'none'}}>
      <Upload size={32} style={{color:drag?'var(--primary)':'var(--text-muted)',margin:'0 auto 0.75rem',transition:'color 0.2s'}} strokeWidth={1.5}/>
      <p style={{fontWeight:700,fontSize:'0.9rem',marginBottom:'0.375rem'}}>
        {drag ? 'Lepas file di sini' : 'Klik atau drag & drop file Excel'}
      </p>
      <p style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>Format .xlsx / .xls · Maksimal 10MB · Maks 500 baris</p>
      <input ref={ref} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={e=>validate(e.target.files[0])}/>
    </div>
  )
}

/* ── Preview Table ───────────────────────────────── */
function PreviewTable({ results, type }) {
  if (!results?.length) return null

  const cols = {
    INTERNS:    ['Nama','Email','Telepon','Instansi','Jurusan','Jenjang','Bidang','Wilayah','Tahun','Tanggal Mulai','Tanggal Selesai','NIM/NIS','Gender'],
    ATTENDANCE: ['Nama Intern','Tanggal','Status','Jam Masuk','Jam Keluar'],
    PAYROLL:    ['Nama Intern','Bulan','Tahun','Hari Hadir','Tarif Harian','Total']
  }[type] || []

  const calcTotal = r => {
    const h = parseInt(r.row['Hari Hadir'])||0, t = parseInt(r.row['Tarif Harian'])||0
    const b = parseInt(r.row['Bonus'])||0, p = parseInt(r.row['Potongan'])||0
    return fmtNum((h*t)+b-p)
  }

  return (
    <div style={{overflowX:'auto',maxHeight:300,overflowY:'auto',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.78rem'}}>
        <thead style={{position:'sticky',top:0,background:'var(--bg-main)',zIndex:5}}>
          <tr>
            <th style={{padding:'0.5rem 0.625rem',textAlign:'left',fontWeight:700,fontSize:'0.7rem',color:'var(--text-muted)',textTransform:'uppercase',borderBottom:'2px solid var(--border)',width:40}}>#</th>
            <th style={{padding:'0.5rem 0.625rem',textAlign:'left',fontWeight:700,fontSize:'0.7rem',color:'var(--text-muted)',textTransform:'uppercase',borderBottom:'2px solid var(--border)',width:80}}>Status</th>
            {cols.map(c=><th key={c} style={{padding:'0.5rem 0.625rem',textAlign:'left',fontWeight:700,fontSize:'0.7rem',color:'var(--text-muted)',textTransform:'uppercase',borderBottom:'2px solid var(--border)',whiteSpace:'nowrap'}}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {results.map((r,i)=>(
            <tr key={i} style={{background:r.valid?'transparent':'rgba(239,68,68,0.04)',borderBottom:'1px solid var(--border)'}}>
              <td style={{padding:'0.5rem 0.625rem',color:'var(--text-muted)',fontFamily:'monospace',fontSize:'0.7rem'}}>{r.rowIndex}</td>
              <td style={{padding:'0.5rem 0.625rem'}}>
                {r.valid
                  ? <span style={{display:'inline-flex',alignItems:'center',gap:3,padding:'2px 8px',borderRadius:999,background:'var(--secondary-light)',color:'var(--secondary)',fontSize:'0.68rem',fontWeight:700}}><CheckCircle2 size={10} strokeWidth={3}/> OK</span>
                  : <span title={r.errors.join('\n')} style={{display:'inline-flex',alignItems:'center',gap:3,padding:'2px 8px',borderRadius:999,background:'var(--danger-light)',color:'var(--danger)',fontSize:'0.68rem',fontWeight:700,cursor:'help'}}><AlertCircle size={10} strokeWidth={3}/> Error</span>
                }
              </td>
              {cols.map(c=>(
                <td key={c} style={{padding:'0.5rem 0.625rem',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:150}}>
                  {c==='Total' ? calcTotal(r) : (r.row[c]||<span style={{color:'var(--text-muted)'}}>—</span>)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Import History ──────────────────────────────── */
function ImportHistory() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [open,    setOpen]    = useState(false)

  const TYPE_COLOR = { INTERNS:'var(--primary)', ATTENDANCE:'var(--secondary)', PAYROLL:'var(--warning)' }
  const TYPE_ICON  = { INTERNS:'👤', ATTENDANCE:'📅', PAYROLL:'💰' }

  useEffect(()=>{
    if (!open) return
    setLoading(true)
    fetch('/api/import/excel?action=history').then(r=>r.json()).then(d=>{setHistory(d);setLoading(false)}).catch(()=>setLoading(false))
  },[open])

  return (
    <div style={{borderTop:'1px solid var(--border)',paddingTop:'1rem',marginTop:'1rem'}}>
      <button onClick={()=>setOpen(p=>!p)} style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'none',cursor:'pointer',color:'var(--text-secondary)',fontWeight:600,fontSize:'0.82rem',padding:0}}>
        <History size={14} strokeWidth={2}/> Riwayat Import
        <ChevronDown size={13} strokeWidth={2} style={{transform:open?'rotate(180deg)':'none',transition:'transform 0.2s'}}/>
      </button>

      {open&&(
        <div style={{marginTop:'0.75rem',maxHeight:200,overflowY:'auto'}}>
          {loading
            ? <div style={{height:40,background:'var(--border)',borderRadius:6,animation:'pulse_ 1.4s ease-in-out infinite'}}/>
            : history.length===0
              ? <p style={{fontSize:'0.78rem',color:'var(--text-muted)',textAlign:'center',padding:'1rem'}}>Belum ada riwayat import.</p>
              : history.map(h=>(
                  <div key={h.id} style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.5rem 0.625rem',borderRadius:'var(--radius-md)',marginBottom:3}}>
                    <span style={{fontSize:18}}>{TYPE_ICON[h.type]||'📋'}</span>
                    <div style={{flex:1}}>
                      <p style={{fontSize:'0.78rem',fontWeight:600}}>
                        {h.type} — {h.created} baru
                        {h.updated > 0 && <span style={{marginLeft:4,color:'var(--secondary)'}}>· {h.updated} update</span>}
                      </p>
                      <p style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{fmtDate(h.importedAt)}</p>
                    </div>
                    <span style={{fontSize:'0.68rem',fontWeight:700,padding:'2px 8px',borderRadius:999,background:TYPE_COLOR[h.type]+'20',color:TYPE_COLOR[h.type]}}>{h.type}</span>
                  </div>
                ))
          }
        </div>
      )}
    </div>
  )
}

/* ── Main Widget ─────────────────────────────────── */
export default function ExcelImportWidget() {
  const [type,     setType]      = useState('INTERNS')
  const [file,     setFile]      = useState(null)
  const [parsing,  setParsing]   = useState(false)
  const [saving,   setSaving]    = useState(false)
  const [parseRes, setParseRes]  = useState(null)   // { preview, allResults, valid, invalid, totalRows }
  const [result,   setResult]    = useState(null)   // { created, updated }
  const [err,      setErr]       = useState(null)
  const [step,     setStep]      = useState('upload') // upload | preview | done

  const selType = IMPORT_TYPES.find(t => t.value === type)

  // Reset when type changes
  const changeType = v => { setType(v); resetAll() }
  const resetAll   = () => { setFile(null); setParseRes(null); setResult(null); setErr(null); setStep('upload') }

  /* ── Download template ───────────────────────────── */
  const downloadTemplate = () => {
    // Gunakan direct navigation (Snippet 4) untuk memaksa browser mengikuti header server
    // Ini cara paling ampuh mencegah nama file UUID di browser tertentu
    const url = `/api/import/excel?action=template&type=${type}&t=${Date.now()}`
    window.location.assign(url)
  }

  /* ── Step 1: Parse/Preview ───────────────────────── */
  const handleParse = async () => {
    if (!file) return
    setParsing(true); setErr(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', type)
      const res  = await fetch('/api/import/excel', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setErr(data.error); return }
      setParseRes(data); setStep('preview')
    } catch(e) { setErr('Gagal menghubungi server.') }
    finally { setParsing(false) }
  }

  /* ── Step 2: Confirm Save ────────────────────────── */
  const handleSave = async () => {
    if (!parseRes) return
    const valid = parseRes.allResults.filter(r => r.valid)
    if (!valid.length) { setErr('Tidak ada baris yang valid untuk disimpan.'); return }
    setSaving(true); setErr(null)
    try {
      const res  = await fetch('/api/import/excel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, rows: valid })
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error); return }
      setResult(data); setStep('done')
    } catch(e) { setErr('Gagal menyimpan data.') }
    finally { setSaving(false) }
  }

  return (
    <div className="card">
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.25rem'}}>
        <div>
          <h3 style={{fontWeight:800,fontSize:'0.95rem',display:'flex',alignItems:'center',gap:6}}>
            <FileSpreadsheet size={17} strokeWidth={2} style={{color:'var(--primary)'}}/>
            Import Excel
          </h3>
          <p style={{fontSize:'0.72rem',color:'var(--text-muted)',marginTop:2}}>{selType?.desc}</p>
        </div>
        <button onClick={downloadTemplate} className="btn btn-secondary btn-sm" title="Download template Excel" style={{gap:4}}>
          <Download size={13} strokeWidth={2}/> Template
        </button>
      </div>

      {/* Type Tabs */}
      <div style={{display:'flex',gap:'0.375rem',marginBottom:'1rem',background:'var(--bg-main)',padding:'0.25rem',borderRadius:'var(--radius-lg)'}}>
        {IMPORT_TYPES.map(t=>(
          <button key={t.value} onClick={()=>changeType(t.value)}
            style={{flex:1,padding:'0.45rem 0.25rem',borderRadius:'var(--radius-md)',border:'none',cursor:'pointer',fontWeight:700,fontSize:'0.75rem',transition:'all 0.18s',
              background:type===t.value?'var(--bg-card)':'transparent',
              color:type===t.value?t.color:'var(--text-muted)',
              boxShadow:type===t.value?'var(--shadow-sm)':'none'
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Step: Upload ── */}
      {step==='upload'&&(
        <>
          <DropZone file={file} onFile={setFile} onClear={()=>setFile(null)} loading={parsing}/>
          {err&&<div style={{marginTop:'0.75rem',padding:'0.625rem 0.875rem',background:'var(--danger-light)',borderRadius:'var(--radius-md)',color:'var(--danger)',fontSize:'0.8rem',fontWeight:600}}><AlertCircle size={13} style={{verticalAlign:'middle',marginRight:5}} strokeWidth={2}/>{err}</div>}
          <button className="btn btn-primary" style={{width:'100%',marginTop:'0.875rem',fontWeight:700}} onClick={handleParse} disabled={!file||parsing}>
            {parsing?<><Loader2 size={15} style={{animation:'spin 0.8s linear infinite'}}/> Membaca File...</>:<><Table size={15} strokeWidth={2}/> Baca & Validasi Excel</>}
          </button>
        </>
      )}

      {/* ── Step: Preview ── */}
      {step==='preview'&&parseRes&&(
        <>
          {/* Summary bar */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.5rem',marginBottom:'0.875rem'}}>
            {[
              {label:'Total Baris', value:parseRes.totalRows, color:'var(--primary)'},
              {label:'Valid ✓',     value:parseRes.valid,    color:'var(--secondary)'},
              {label:'Error ✗',     value:parseRes.invalid,  color:parseRes.invalid>0?'var(--danger)':'var(--text-muted)'},
            ].map(s=>(
              <div key={s.label} style={{textAlign:'center',padding:'0.625rem',background:'var(--bg-main)',borderRadius:'var(--radius-md)',border:`1px solid var(--border)`}}>
                <p style={{fontWeight:800,fontSize:'1.4rem',color:s.color,lineHeight:1}}>{s.value}</p>
                <p style={{fontSize:'0.65rem',color:'var(--text-muted)',marginTop:3}}>{s.label}</p>
              </div>
            ))}
          </div>

          {parseRes.invalid > 0 && (
            <div style={{padding:'0.625rem 0.875rem',background:'#fef3c7',borderRadius:'var(--radius-md)',color:'#92400e',fontSize:'0.78rem',fontWeight:600,marginBottom:'0.75rem',display:'flex',gap:6,alignItems:'flex-start'}}>
              <Info size={14} strokeWidth={2} style={{flexShrink:0,marginTop:1}}/>
              <span>Baris error akan <strong>dilewati</strong>. Hover ikon Error untuk melihat detail. Hanya baris valid yang akan disimpan.</span>
            </div>
          )}

          <p style={{fontSize:'0.72rem',color:'var(--text-muted)',marginBottom:'0.5rem',fontWeight:600}}>
            Preview {Math.min(parseRes.preview.length, 10)} baris pertama:
          </p>
          <PreviewTable results={parseRes.preview} type={type}/>

          {err&&<div style={{marginTop:'0.75rem',padding:'0.625rem 0.875rem',background:'var(--danger-light)',borderRadius:'var(--radius-md)',color:'var(--danger)',fontSize:'0.8rem',fontWeight:600}}><AlertCircle size={13} style={{verticalAlign:'middle',marginRight:5}} strokeWidth={2}/>{err}</div>}

          <div style={{display:'flex',gap:'0.5rem',marginTop:'0.875rem'}}>
            <button className="btn btn-secondary" onClick={resetAll} style={{flex:0}}>← Ganti File</button>
            <button className="btn btn-primary" style={{flex:1,fontWeight:700}} onClick={handleSave} disabled={saving||parseRes.valid===0}>
              {saving
                ?<><Loader2 size={15} style={{animation:'spin 0.8s linear infinite'}}/> Menyimpan...</>
                :<><CheckCircle2 size={15} strokeWidth={2}/> Simpan {parseRes.valid} Baris Valid ke Database</>
              }
            </button>
          </div>
        </>
      )}

      {/* ── Step: Done ── */}
      {step==='done'&&result&&(
        <div style={{textAlign:'center',padding:'1.5rem 1rem'}}>
          <div style={{width:56,height:56,borderRadius:'50%',background:'var(--secondary-light)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 0.875rem'}}>
            <CheckCircle2 size={28} strokeWidth={2} style={{color:'var(--secondary)'}}/>
          </div>
          <h3 style={{fontWeight:800,fontSize:'1.05rem',marginBottom:'0.375rem'}}>Import Berhasil!</h3>
          <p style={{fontSize:'0.875rem',color:'var(--text-secondary)',marginBottom:'1.25rem'}}>
            {result.created > 0 && <><strong style={{fontSize:'1.5rem',color:'var(--primary)'}}>{result.created}</strong> data baru <br/></>}
            {result.updated > 0 && <><strong style={{fontSize:'1.5rem',color:'var(--secondary)'}}>{result.updated}</strong> data diperbarui <br/></>}
            {result.created === 0 && result.updated === 0 && <span>Tidak ada perubahan data</span>}
          </p>
          <div style={{display:'flex',gap:'0.5rem',justifyContent:'center',flexWrap:'wrap'}}>
            <a href={type==='INTERNS'?'/interns':type==='ATTENDANCE'?'/attendance':'/payroll'}
              className="btn btn-primary btn-sm" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:4}}>
              Lihat Data <ArrowRight size={13} strokeWidth={2}/>
            </a>
            <button className="btn btn-secondary btn-sm" onClick={resetAll}>Import Lagi</button>
          </div>
        </div>
      )}

      {/* Import History */}
      <ImportHistory/>

      <style>{`
        @keyframes spin  { to{transform:rotate(360deg)} }
        @keyframes pulse_ { 0%,100%{opacity:1}50%{opacity:0.4} }
      `}</style>
    </div>
  )
}

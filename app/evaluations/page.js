'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Star, Award, Plus, Trash, Edit, X, Loader2, RefreshCw, ChevronRight, CheckCircle2, FileText, Lock } from 'lucide-react'
import Swal from 'sweetalert2'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const GRADE_STYLE = { A:{color:'#065f46',bg:'#dcfce7'}, B:{color:'#1e40af',bg:'#dbeafe'}, C:{color:'#92400e',bg:'#fef3c7'}, D:{color:'#7c3aed',bg:'#ede9fe'}, E:{color:'#991b1b',bg:'#fee2e2'} }
const fmtDate = dt => dt ? new Date(dt).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}) : '-'

const EVAL_CRITERIA = [
  { id:'discipline',   name:'Kedisiplinan dan Kepatuhan',         desc:'Kehadiran tepat waktu, menaati tata tertib',                      weight:15 },
  { id:'integrity',    name:'Integritas dan Etika Kerja',          desc:'Jujur, bertanggung jawab, menjaga kerahasiaan',                   weight:15 },
  { id:'teamwork',     name:'Kerjasama dan Adaptabilitas',         desc:'Kerja tim, menghargai perbedaan, adaptif',                        weight:15 },
  { id:'initiative',   name:'Inisiatif dan Motivasi',              desc:'Proaktif, kemauan belajar tinggi',                                weight:10 },
  { id:'communication',name:'Komunikasi dan Interaksi',            desc:'Menyampaikan ide, sopan, menerima umpan balik',                   weight:10 },
  { id:'performance',  name:'Kinerja dan Hasil Kerja',             desc:'Tuntas sesuai target & kualitas',                                 weight:20 },
  { id:'technical',    name:'Pengetahuan & Kompetensi Teknis',     desc:'Penguasaan dasar teknis sesuai jurusan',                          weight:15 },
]

/* ── Generate PDF Template Evaluasi (kosong, siap diisi mentor) ─── */
function generateEvalTemplate(intern) {
  const doc = new jsPDF('p','pt','a4')
  const pw = doc.internal.pageSize.width

  // Header
  doc.setFontSize(13); doc.setFont('helvetica','bold')
  doc.text('LEMBAR EVALUASI PESERTA MAGANG', pw/2, 45, { align:'center' })
  doc.setFontSize(10); doc.setFont('helvetica','normal')
  doc.text('Human Capital Division', pw/2, 60, { align:'center' })
  doc.setLineWidth(1.5); doc.line(40, 70, pw-40, 70)

  // Section 1: Data Umum
  doc.setFontSize(11); doc.setFont('helvetica','bold')
  doc.text('DATA UMUM PESERTA MAGANG', 40, 90)

  const dataUmum = [
    ['Nama Peserta',            intern.name || ''],
    ['NIM',                     intern.nim_nis || ''],
    ['Perguruan Tinggi / Jurusan', `${intern.university || ''} / ${intern.major || ''}`],
    ['Periode Magang',           `${intern.periodStart || ''} s.d ${intern.periodEnd || ''}`],
    ['Bidang',                  intern.bidang || ''],
    ['Nama Pembimbing Lapangan', intern.supervisorName || ''],
    ['Jabatan Pembimbing',       intern.supervisorTitle || ''],
  ]

  autoTable(doc, {
    startY: 100,
    head: [['Uraian', 'Keterangan']],
    body: dataUmum,
    theme: 'grid',
    headStyles: { fillColor:[25,60,110], textColor:255, fontStyle:'bold', fontSize:10 },
    columnStyles: { 0:{ cellWidth:200, fontStyle:'bold' }, 1:{ cellWidth:'auto' }},
    styles: { fontSize:10, cellPadding:8 }
  })

  // Section 2: Penilaian
  const afterTable1 = doc.lastAutoTable.finalY + 15
  doc.setFontSize(11); doc.setFont('helvetica','bold')
  doc.text('EVALUASI HUMAN CAPITAL – PENILAIAN', 40, afterTable1)

  const evalRows = EVAL_CRITERIA.map((c,i) => [
    i+1, c.name, c.desc, `${c.weight},00%`, '', ''
  ])
  // Add total row
  evalRows.push(['','','','TOTAL NILAI AKHIR (Skala 5)','','0,00'])
  evalRows.push(['','','','PREDIKAT','','Sangat Kurang'])

  autoTable(doc, {
    startY: afterTable1 + 8,
    head: [['No','Aspek Penilaian','Indikator Perilaku','Bobot','Skor (1–10)','Nilai Akhir\n(Bobot×Skor)']],
    body: evalRows,
    theme: 'grid',
    headStyles: { fillColor:[25,60,110], textColor:255, fontStyle:'bold', fontSize:9, halign:'center' },
    columnStyles: {
      0:{ cellWidth:30, halign:'center' },
      1:{ cellWidth:130 },
      2:{ cellWidth:130 },
      3:{ cellWidth:55, halign:'center' },
      4:{ cellWidth:60, halign:'center' },
      5:{ cellWidth:70, halign:'center' },
    },
    styles: { fontSize:9, cellPadding:7, minCellHeight:28 },
    didParseCell(data) {
      // Style teal/green for nilai akhir column
      if (data.column.index === 5 && data.section === 'body') {
        data.cell.styles.fillColor = [235, 245, 235]
      }
      // Bold total rows
      if (data.row.index >= EVAL_CRITERIA.length) {
        data.cell.styles.fontStyle = 'bold'
      }
    }
  })

  // Section 3: Catatan
  let afterTable2 = doc.lastAutoTable.finalY + 15
  
  // Safety check to prevent awkward page breaks for the notes section
  if (afterTable2 > 650) {
    doc.addPage()
    afterTable2 = 40
  }

  doc.setFontSize(11); doc.setFont('helvetica','bold')
  doc.text('Catatan Evaluasi & Saran Pengembangan (diisi Pembimbing / Human Capital)', 40, afterTable2)

  autoTable(doc, {
    startY: afterTable2 + 8,
    head: [['Aspek Keunggulan Peserta', 'Area Pengembangan', 'Rekomendasi HC', 'Tindak\nLanjut']],
    body: [[
      intern.keunggulan || '',
      intern.pengembangan || '',
      intern.rekomendasi || '',
      intern.tindakLanjut || ''
    ]],
    theme: 'grid',
    headStyles: { fillColor:[25,60,110], textColor:255, fontStyle:'bold', fontSize:9, halign:'center' },
    styles: { fontSize:9, minCellHeight:60, cellPadding:5, valign:'top' }
  })

  // Rekomendasi checkboxes
  const afterTable3 = doc.lastAutoTable.finalY + 12
  doc.setFontSize(10); doc.setFont('helvetica','normal')
  doc.text('Rekomendasi:', 40, afterTable3)
  const recs = [
    'Direkomendasikan untuk rekrutmen',
    'Direkomendasikan untuk magang lanjutan',
    'Cukup baik, perlu pengembangan',
    'Tidak direkomendasikan',
  ]
  recs.forEach((r, i) => {
    doc.rect(40, afterTable3 + 8 + i * 16, 8, 8)
    doc.text(r, 53, afterTable3 + 16 + i * 16)
  })

  // Signature area
  const sigY = afterTable3 + 20 + recs.length * 16
  doc.setFont('helvetica','bold'); doc.setFontSize(10)
  doc.text('Mengetahui,', 40, sigY)
  doc.setFont('helvetica','normal')
  doc.text('Pembimbing / HC', 40, sigY + 14)
  doc.line(40, sigY + 70, 180, sigY + 70)
  doc.setFont('helvetica','bold')
  doc.text('( ....................................... )', 40, sigY + 82)

  doc.output('dataurlnewwindow')
}

/* ── Radar Chart (pure SVG) ─────────────────────── */
function RadarChart({ scores, criteria, size=200 }) {
  if (!scores||!criteria?.length) return null
  const cx=size/2, cy=size/2, r=size*0.38
  const n=criteria.length
  const pts=(val,radius)=>criteria.map((_,i)=>{
    const angle=(Math.PI*2/n)*i-Math.PI/2
    const v=Math.max(0,Math.min(10,val[i]||0))/10*radius
    return [cx+v*Math.cos(angle), cy+v*Math.sin(angle)]
  })
  const grid=[2,4,6,8,10]
  return (
    <svg width={size} height={size} style={{overflow:'visible'}}>
      {grid.map(g=>{
        const gpts=criteria.map((_,i)=>{const a=(Math.PI*2/n)*i-Math.PI/2,v=g/10*r;return `${cx+v*Math.cos(a)},${cy+v*Math.sin(a)}`}).join(' ')
        return <polygon key={g} points={gpts} fill="none" stroke="var(--border)" strokeWidth={1}/>
      })}
      {criteria.map((_,i)=>{const a=(Math.PI*2/n)*i-Math.PI/2;return <line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(a)} y2={cy+r*Math.sin(a)} stroke="var(--border)" strokeWidth={1}/>})}
      {(() => {
        const vals=criteria.map(c=>scores[c.id]||0)
        const dpts=pts(vals,r)
        return <polygon points={dpts.map(p=>p.join(',')).join(' ')} fill="rgba(99,102,241,0.2)" stroke="var(--primary)" strokeWidth={2.5}/>
      })()}
      {criteria.map((c,i)=>{
        const a=(Math.PI*2/n)*i-Math.PI/2
        const v=Math.max(0,scores[c.id]||0)/10*r
        return <circle key={i} cx={cx+v*Math.cos(a)} cy={cy+v*Math.sin(a)} r={4} fill="var(--primary)" stroke="#fff" strokeWidth={2}/>
      })}
      {criteria.map((c,i)=>{
        const a=(Math.PI*2/n)*i-Math.PI/2
        const lx=cx+(r+20)*Math.cos(a), ly=cy+(r+20)*Math.sin(a)
        return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight={700} fill="var(--text-secondary)">{c.name.slice(0,8)}</text>
      })}
    </svg>
  )
}

/* ── Evaluation Form (Admin HR Only) ────────────── */
function EvalForm({ internId, internName, internPeriod, criteria, existing, onSave, onClose }) {
  const [scores, setScores] = useState(existing?.scores||{})
  const [note,   setNote]   = useState(existing?.overallNote||'')
  
  const [keunggulan, setKeunggulan] = useState(existing?.keunggulan||'')
  const [pengembangan, setPengembangan] = useState(existing?.pengembangan||'')
  const [rekomendasi, setRekomendasi] = useState(existing?.rekomendasi||'')
  const [tindakLanjut, setTindakLanjut] = useState(existing?.tindakLanjut||'')
  
  const [saving, setSaving] = useState(false)

  const totalWeight = criteria.reduce((s,c)=>s+c.weight,0)
  const weighted    = criteria.reduce((s,c)=>s+((scores[c.id]||0)*c.weight),0)
  const finalScore  = totalWeight>0?Math.round(weighted/totalWeight*10)/10:0
  const grade       = finalScore>=9?'A':finalScore>=8?'B':finalScore>=7?'C':finalScore>=5?'D':'E'
  const allFilled   = criteria.every(c=>scores[c.id])

  const handleSave = async () => {
    if (!allFilled) return
    setSaving(true)
    const savedPeriod = internPeriod || existing?.period || new Date().toISOString().slice(0,7);
    await onSave({internId,scores,overallNote:note, keunggulan, pengembangan, rekomendasi, tindakLanjut, period: savedPeriod,...(existing?{id:existing.id}:{})})
    setSaving(false)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}}>
      <div className="card" style={{width:'100%',maxWidth:580,maxHeight:'90vh',overflowY:'auto',margin:'1rem',animation:'scaleUp 0.2s ease'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
          <div>
            <h3 style={{fontWeight:800}}>{existing?'Edit':'Buat'} Evaluasi</h3>
            <p style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{internName}</p>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={20} strokeWidth={2}/></button>
        </div>
        <div style={{marginBottom:'1.25rem'}}>
          <label className="label" style={{marginBottom:'0.25rem'}}>Periode Evaluasi</label>
          <div style={{fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
             {internPeriod || existing?.period || '-'}
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'1rem',marginBottom:'1.25rem'}}>
          {criteria.map(c=>(
            <div key={c.id}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <div>
                  <span style={{fontWeight:700,fontSize:'0.85rem'}}>{c.name}</span>
                  <span style={{fontSize:'0.7rem',color:'var(--text-muted)',marginLeft:8}}>Bobot {c.weight}%</span>
                </div>
                <span style={{fontWeight:800,fontSize:'1.1rem',color:scores[c.id]>=8?'var(--secondary)':scores[c.id]>=6?'var(--warning)':'var(--danger)',minWidth:32,textAlign:'right'}}>{scores[c.id]||'—'}</span>
              </div>
              <p style={{fontSize:'0.7rem',color:'var(--text-muted)',marginBottom:8}}>{c.desc}</p>
              <div style={{display:'flex',gap:'0.375rem'}}>
                {[1,2,3,4,5,6,7,8,9,10].map(v=>(
                  <button key={v} onClick={()=>setScores(p=>({...p,[c.id]:v}))}
                    style={{flex:1,height:32,borderRadius:'var(--radius-sm)',border:'1.5px solid',borderColor:scores[c.id]===v?'var(--primary)':scores[c.id]>0&&scores[c.id]>=v?'var(--primary)':'var(--border)',background:scores[c.id]>=v?'var(--primary-light)':'var(--bg-main)',color:scores[c.id]>=v?'var(--primary)':'var(--text-muted)',fontWeight:scores[c.id]===v?800:400,fontSize:'0.75rem',cursor:'pointer',transition:'all 0.12s'}}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {allFilled&&(
          <div style={{display:'flex',justifyContent:'center',marginBottom:'1rem'}}>
            <RadarChart scores={scores} criteria={criteria} size={180}/>
          </div>
        )}
        <div style={{display:'flex',alignItems:'center',gap:'1rem',padding:'1rem',background:allFilled?GRADE_STYLE[grade]?.bg||'var(--bg-main)':'var(--bg-main)',borderRadius:'var(--radius-lg)',marginBottom:'1rem',transition:'background 0.3s'}}>
          <div style={{textAlign:'center'}}>
            <div style={{fontWeight:900,fontSize:'2rem',color:allFilled?GRADE_STYLE[grade]?.color||'var(--primary)':'var(--text-muted)',lineHeight:1}}>{allFilled?grade:'—'}</div>
            <div style={{fontSize:'0.65rem',color:'var(--text-muted)'}}>Grade</div>
          </div>
          <div>
            <div style={{fontWeight:800,fontSize:'1.5rem',color:allFilled?GRADE_STYLE[grade]?.color||'var(--primary)':'var(--text-muted)'}}>{allFilled?finalScore:'—'}<span style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>/10</span></div>
            <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>Skor Akhir Tertimbang</div>
          </div>
        </div>
        
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem'}}>
          <div>
             <label className="label">Aspek Keunggulan Peserta</label>
             <textarea className="input" rows={2} value={keunggulan} onChange={e=>setKeunggulan(e.target.value)} style={{resize:'vertical'}}/>
          </div>
          <div>
             <label className="label">Area Pengembangan</label>
             <textarea className="input" rows={2} value={pengembangan} onChange={e=>setPengembangan(e.target.value)} style={{resize:'vertical'}}/>
          </div>
          <div>
             <label className="label">Rekomendasi HC</label>
             <textarea className="input" rows={2} value={rekomendasi} onChange={e=>setRekomendasi(e.target.value)} style={{resize:'vertical'}}/>
          </div>
          <div>
             <label className="label">Tindak Lanjut</label>
             <textarea className="input" rows={2} value={tindakLanjut} onChange={e=>setTindakLanjut(e.target.value)} style={{resize:'vertical'}}/>
          </div>
        </div>
        
        <label className="label">Catatan Umum / Keseluruhan (Opsional)</label>
        <textarea className="input" rows={2} value={note} onChange={e=>setNote(e.target.value)} style={{resize:'vertical',marginBottom:'1rem'}}/>
        <div style={{display:'flex',gap:'0.5rem',justifyContent:'flex-end'}}>
          <button className="btn btn-secondary" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!allFilled||saving}>
            {saving?<Loader2 size={15} style={{animation:'spin 1s linear infinite'}}/>:<><CheckCircle2 size={15} strokeWidth={2}/> {existing?'Simpan Perubahan':'Buat Evaluasi'}</>}
          </button>
        </div>
        <style>{`@keyframes scaleUp{from{transform:scale(0.95);opacity:0}to{transform:scale(1);opacity:1}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )
}

/* ── Intern View: Tampilkan hasil evaluasi + Konfirmasi ─── */
function InternEvaluationView({ evaluations, criteria }) {
  const [confirming, setConfirming] = useState(false)
  const latest = evaluations[0]

  const handleConfirm = async () => {
    if (!latest?.id || latest?.acknowledgedAt) return
    setConfirming(true)
    try {
      const res = await fetch('/api/evaluations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: latest.id })
      })
      const result = await res.json()
      if (result.success) {
        Swal.fire({ icon:'success', title:'Terima Kasih!', text:'Anda telah mengkonfirmasi telah membaca hasil evaluasi ini.', timer:2000, showConfirmButton:false })
        window.location.reload()
      }
    } catch { Swal.fire('Gagal','Terjadi kesalahan.','error') }
    finally { setConfirming(false) }
  }

  if (evaluations.length === 0) return (
    <div className="card" style={{textAlign:'center',padding:'3rem'}}>
      <Award size={48} style={{margin:'0 auto 1rem',opacity:0.2}}/>
      <p style={{fontWeight:700,color:'var(--text-secondary)'}}>Belum Ada Evaluasi</p>
      <p style={{fontSize:'0.82rem',color:'var(--text-muted)',marginTop:8}}>Hasil evaluasi dari Admin HR akan ditampilkan di sini setelah selesai diinput.</p>
    </div>
  )

  const gs = GRADE_STYLE[latest.grade] || GRADE_STYLE.C

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1.5rem'}}>
      {/* Konfirmasi Banner */}
      {!latest.acknowledgedAt ? (
        <div style={{background:'#e0f2fe',border:'1px solid #7dd3fc',padding:'1rem 1.5rem',borderRadius:12,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'1rem'}}>
          <div>
            <h4 style={{color:'#0369a1',fontWeight:800,display:'flex',alignItems:'center',gap:6}}>
              <Star size={16}/> Hasil Evaluasi Anda Sudah Tersedia
            </h4>
            <p style={{color:'#0c4a6e',fontSize:'0.85rem',marginTop:4}}>
              Silakan lihat hasil di bawah, lalu klik konfirmasi sebagai tanda Anda telah membaca dan memahami hasil evaluasi ini.
            </p>
          </div>
          <button className="btn btn-primary" style={{background:'#0284c7'}} onClick={handleConfirm} disabled={confirming}>
            <CheckCircle2 size={16}/> {confirming ? 'Memproses...' : 'Saya Sudah Membaca'}
          </button>
        </div>
      ) : (
        <div style={{background:'#dcfce7',border:'1px solid #86efac',padding:'0.875rem 1.25rem',borderRadius:12,display:'flex',alignItems:'center',gap:10}}>
          <CheckCircle2 size={18} style={{color:'#15803d',flexShrink:0}}/>
          <div>
            <p style={{fontWeight:700,color:'#15803d',fontSize:'0.875rem'}}>Evaluasi telah dikonfirmasi</p>
            <p style={{fontSize:'0.75rem',color:'#166534'}}>Anda mengkonfirmasi pada {fmtDate(latest.acknowledgedAt)}</p>
          </div>
        </div>
      )}

      {/* Hasil Evaluasi Terbaru */}
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.25rem',flexWrap:'wrap',gap:'1rem'}}>
          <div>
            <h3 style={{fontWeight:800}}>Hasil Evaluasi Akhir</h3>
            <p style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>Periode: {latest.period} · Dibuat: {fmtDate(latest.createdAt)}</p>
            <div style={{marginTop:'1rem', display:'flex', gap:'0.75rem', flexWrap:'wrap'}}>
               <a href={`/portfolio?userId=${latest.internId}`} target="_blank" className="btn btn-primary" style={{textDecoration:'none', gap:6, background:'#0284c7', borderColor:'#0284c7'}}>
                 <FileText size={16} strokeWidth={2}/> Unduh CV / Portofolio
               </a>
               {latest.scores?.certificateUrl && (
                 <a href={latest.scores.certificateUrl} target="_blank" className="btn btn-secondary" style={{textDecoration:'none', gap:6, background:'#fef08a', color:'#854d0e', borderColor:'#facc15'}}>
                   <Award size={16} strokeWidth={2}/> Unduh Sertifikat Magang
                 </a>
               )}
            </div>
          </div>
          <div style={{textAlign:'center',padding:'0.75rem 1.5rem',borderRadius:'var(--radius-lg)',background:gs.bg}}>
            <div style={{fontWeight:900,fontSize:'2.5rem',color:gs.color,lineHeight:1}}>{latest.grade}</div>
            <div style={{fontWeight:800,fontSize:'0.9rem',color:gs.color}}>{latest.finalScore}/10</div>
            <div style={{fontSize:'0.7rem', color:gs.color, fontWeight:700, marginTop:4}}>NILAI AKHIR</div>
          </div>
        </div>

        <div style={{display:'flex',justifyContent:'center',marginBottom:'1.5rem'}}>
          <RadarChart scores={latest.scores} criteria={criteria} size={220}/>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:'0.625rem'}}>
          {criteria.map(c => {
            const score = latest.scores?.[c.id] || 0
            const pct = score / 10 * 100
            return (
              <div key={c.id}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:'0.8rem',fontWeight:600}}>{c.name}</span>
                  <span style={{fontSize:'0.8rem',fontWeight:800,color:score>=8?'var(--secondary)':score>=6?'var(--warning)':'var(--danger)'}}>{score}/10</span>
                </div>
                <div style={{height:6,background:'var(--border)',borderRadius:99}}>
                  <div style={{height:'100%',width:`${pct}%`,background:score>=8?'var(--secondary)':score>=6?'var(--warning)':'var(--danger)',borderRadius:99,transition:'width 0.6s ease'}}/>
                </div>
              </div>
            )
          })}
        </div>

        {latest.overallNote && (
          <div style={{marginTop:'1.25rem',padding:'1rem',background:'var(--bg-main)',borderRadius:'var(--radius-md)',borderLeft:'4px solid var(--primary)'}}>
            <p style={{fontSize:'0.75rem',fontWeight:800,color:'var(--text-muted)',marginBottom:4}}>CATATAN EVALUATOR</p>
            <p style={{fontSize:'0.875rem'}}>{latest.overallNote}</p>
          </div>
        )}
      </div>

      {/* Riwayat */}
      {evaluations.length > 1 && (
        <div className="card">
          <h4 style={{fontWeight:800,marginBottom:'1rem'}}>Riwayat Evaluasi</h4>
          <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
            {evaluations.slice(1).map(ev => {
              const evGs = GRADE_STYLE[ev.grade] || GRADE_STYLE.C
              return (
                <div key={ev.id} style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem',background:'var(--bg-main)',borderRadius:'var(--radius-md)',border:'1px solid var(--border)'}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:evGs.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{fontWeight:900,fontSize:'0.9rem',color:evGs.color}}>{ev.grade}</span>
                  </div>
                  <div style={{flex:1}}>
                    <p style={{fontWeight:700,fontSize:'0.8rem'}}>{ev.period} · {ev.finalScore}/10</p>
                    <p style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{fmtDate(ev.createdAt)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main Evaluations Page ── */
export default function EvaluationsPage() {
  const { user } = useAuth()
  const [data,    setData]   = useState({ evaluations:[], interns:[], criteria:[] })
  const [loading, setLoading] = useState(true)
  const [formFor, setFormFor] = useState(null)
  const [viewIntern, setView] = useState(null)
  const [evalTab, setEvalTab] = useState('belum') // 'belum' | 'sudah'

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/evaluations')
      setData(await r.json())
    } catch(e){console.error(e)} finally { setLoading(false) }
  },[user])

  useEffect(()=>{ if(user) fetchAll() },[fetchAll])

  const handleSave = async body => {
    const isEdit = !!body.id
    await fetch('/api/evaluations',{method:isEdit?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,supervisorId:user?.id})})
    setFormFor(null)
    // Setelah input nilai, pindah ke tab Sudah Dievaluasi
    setEvalTab('sudah')
    setView(null)
    fetchAll()
  }

  const handleDelete = async id => {
    const { isConfirmed } = await Swal.fire({title:'Hapus evaluasi ini?',icon:'warning',showCancelButton:true,confirmButtonColor:'var(--danger)',confirmButtonText:'Hapus',cancelButtonText:'Batal'})
    if(isConfirmed){await fetch(`/api/evaluations?id=${id}`,{method:'DELETE'});fetchAll()}
  }

  const criteria = data.criteria?.length ? data.criteria : EVAL_CRITERIA

  // Intern view: tampilkan hanya evaluasi mereka
  if (user?.role === 'INTERN') {
    const myEvals = data.evaluations?.filter(e => e.internId && data.interns?.find(i => i.userId === user.id && i.id === e.internId)) || []
    return (
      <div className="container" style={{paddingBottom:'3rem'}}>
        <div style={{marginBottom:'1.5rem'}}>
          <h1 className="title" style={{display:'flex',alignItems:'center',gap:8}}><Award size={22} strokeWidth={2}/> Hasil Evaluasi Saya</h1>
          <p className="subtitle">Lihat hasil penilaian kinerja Anda dari Admin HR.</p>
        </div>
        {loading ? <div style={{textAlign:'center',padding:'3rem'}}><Loader2 size={24} style={{animation:'spin 1s linear infinite',color:'var(--primary)'}}/></div>
         : <InternEvaluationView evaluations={myEvals} criteria={criteria}/>}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // Admin HR view
  const internHistory = viewIntern ? data.evaluations.filter(e=>e.internId===viewIntern.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)) : []

  // Split: belum vs sudah dievaluasi
  const belumDievaluasi = data.interns.filter(i => {
    if (i.evalCount > 0) return false;
    // Calculate days active
    if (!i.periodStart) return true;
    const start = new Date(i.periodStart);
    const today = new Date();
    const diffTime = Math.abs(today - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays >= 15;
  })
  const sudahDievaluasi = data.interns.filter(i => i.evalCount > 0)
  const activeList = evalTab === 'belum' ? belumDievaluasi : sudahDievaluasi

  return (
    <div className="container" style={{paddingBottom:'3rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.5rem',flexWrap:'wrap',gap:'0.75rem'}}>
        <div>
          <h1 className="title" style={{display:'flex',alignItems:'center',gap:8}}><Award size={22} strokeWidth={2}/> Evaluasi Kinerja</h1>
          <p className="subtitle">Input hasil penilaian & export template formulir untuk mentor. Khusus peserta <strong>Selesai Magang</strong> (Maret 2026 ke atas).</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchAll} disabled={loading}><RefreshCw size={14} strokeWidth={2} style={{animation:loading?'spin 1s linear infinite':'none'}}/></button>
      </div>

      {/* Tab Switcher */}
      <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.5rem',background:'var(--bg-main)',padding:4,borderRadius:'var(--radius-lg)',border:'1px solid var(--border)',width:'fit-content'}}>
        <button
          onClick={()=>{setEvalTab('belum');setView(null)}}
          style={{padding:'0.6rem 1.25rem',borderRadius:'var(--radius-md)',border:'none',cursor:'pointer',fontWeight:800,fontSize:'0.85rem',transition:'all 0.2s',
            background:evalTab==='belum'?'var(--warning)':'transparent',
            color:evalTab==='belum'?'#fff':'var(--text-muted)'
          }}
        >
          ⏳ Belum Dievaluasi
          <span style={{marginLeft:8,background:evalTab==='belum'?'rgba(255,255,255,0.3)':'var(--border)',color:evalTab==='belum'?'#fff':'var(--text-secondary)',padding:'1px 8px',borderRadius:999,fontSize:'0.75rem'}}>
            {belumDievaluasi.length}
          </span>
        </button>
        <button
          onClick={()=>{setEvalTab('sudah');setView(null)}}
          style={{padding:'0.6rem 1.25rem',borderRadius:'var(--radius-md)',border:'none',cursor:'pointer',fontWeight:800,fontSize:'0.85rem',transition:'all 0.2s',
            background:evalTab==='sudah'?'var(--secondary)':'transparent',
            color:evalTab==='sudah'?'#fff':'var(--text-muted)'
          }}
        >
          ✅ Sudah Dievaluasi
          <span style={{marginLeft:8,background:evalTab==='sudah'?'rgba(255,255,255,0.3)':'var(--border)',color:evalTab==='sudah'?'#fff':'var(--text-secondary)',padding:'1px 8px',borderRadius:999,fontSize:'0.75rem'}}>
            {sudahDievaluasi.length}
          </span>
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:viewIntern?'1fr 380px':'1fr',gap:'1.25rem',alignItems:'start'}}>
        {/* Intern List */}
        <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
          {loading?[...Array(4)].map((_,i)=><div key={i} style={{height:80,background:'var(--border)',borderRadius:'var(--radius-lg)',animation:'pulse_ 1.4s ease-in-out infinite'}}/>)
           :activeList.length===0?(
             <div className="card" style={{textAlign:'center',padding:'3rem'}}>
               <Award size={40} style={{margin:'0 auto 1rem',opacity:0.3}}/>
               <p style={{color:'var(--text-muted)',fontWeight:700}}>
                 {evalTab==='belum' ? 'Semua peserta sudah dievaluasi! 🎉' : 'Belum ada peserta yang dievaluasi.'}
               </p>
               {evalTab==='belum' && <p style={{fontSize:'0.8rem',color:'var(--text-muted)',marginTop:6}}>Klik tab "Sudah Dievaluasi" untuk melihat riwayat.</p>}
             </div>
           )
           :activeList.map(intern=>{
              const last=intern.latestEval
              const gs=last?GRADE_STYLE[last.grade]||GRADE_STYLE.C:null
              const sudahKonfirmasi=evalTab==='sudah'&&last?.acknowledgedAt
              const belumKonfirmasi=evalTab==='sudah'&&!last?.acknowledgedAt
              return (
                <div key={intern.id} className="card" style={{display:'flex',gap:'1rem',alignItems:'center',flexWrap:'wrap',cursor:'pointer',border:`1.5px solid ${viewIntern?.id===intern.id?'var(--primary)':'var(--border)'}`,transition:'all 0.15s'}} onClick={()=>setView(viewIntern?.id===intern.id?null:intern)}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:2}}>
                      <p style={{fontWeight:800,fontSize:'0.9rem',margin:0}}>{intern.name}</p>
                      {sudahKonfirmasi&&<span style={{fontSize:'0.65rem',background:'#dcfce7',color:'#15803d',padding:'1px 8px',borderRadius:999,fontWeight:700}}>Sudah dibaca intern</span>}
                      {belumKonfirmasi&&<span style={{fontSize:'0.65rem',background:'#fef3c7',color:'#b45309',padding:'1px 8px',borderRadius:999,fontWeight:700}}>Belum dikonfirmasi intern</span>}
                    </div>
                    <p style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{intern.university}{intern.bidang?` - ${intern.bidang}`:''} - Selesai: {intern.periodEnd||'-'}</p>
                    {last?<p style={{fontSize:'0.72rem',color:'var(--text-muted)',marginTop:2}}>Evaluasi: {fmtDate(last.createdAt)} - Skor: {last.finalScore} - {intern.evalCount} sesi</p>:<p style={{fontSize:'0.72rem',color:'var(--warning)',marginTop:2}}>Belum pernah dievaluasi</p>}
                  </div>
                  {last?<div style={{textAlign:'center',padding:'0.5rem 1rem',borderRadius:'var(--radius-md)',background:gs?.bg,flexShrink:0}}>
                    <div style={{fontWeight:900,fontSize:'1.75rem',color:gs?.color,lineHeight:1}}>{last.grade}</div>
                    <div style={{fontSize:'0.65rem',color:gs?.color,fontWeight:700}}>{last.finalScore}/10</div>
                  </div>:null}
                  <div style={{display:'flex',gap:'0.5rem',flexShrink:0}}>
                    <button className="btn btn-secondary btn-sm" onClick={e=>{e.stopPropagation();generateEvalTemplate(intern)}} style={{gap:4,fontSize:'0.73rem'}}><FileText size={13} strokeWidth={2}/> Template</button>
                    {evalTab==='belum'
                      ?<button className="btn btn-primary btn-sm" onClick={e=>{e.stopPropagation();setFormFor({internId:intern.id,internName:intern.name, internPeriod: `${intern.periodStart || ''} s.d ${intern.periodEnd || ''}`})}} style={{gap:4}}><Plus size={13} strokeWidth={2}/> Input Nilai</button>
                      :<button className="btn btn-secondary btn-sm" onClick={e=>{e.stopPropagation();setFormFor({internId:intern.id,internName:intern.name, internPeriod: `${intern.periodStart || ''} s.d ${intern.periodEnd || ''}`})}} style={{gap:4,color:'var(--primary)'}}><Plus size={13} strokeWidth={2}/> Tambah Evaluasi</button>
                    }
                    <ChevronRight size={16} strokeWidth={2} style={{color:'var(--text-muted)',alignSelf:'center',transform:viewIntern?.id===intern.id?'rotate(90deg)':'none',transition:'transform 0.2s'}}/>
                  </div>
                </div>
              )
            })
          }
        </div>

        {/* Detail/History Panel */}
        {viewIntern&&(
          <div className="card" style={{position:'sticky',top:80}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
              <div>
                <p style={{fontWeight:800,fontSize:'0.95rem'}}>{viewIntern.name}</p>
                <p style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{internHistory.length} evaluasi</p>
              </div>
              <button onClick={()=>setView(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={16} strokeWidth={2}/></button>
            </div>
            {internHistory[0]&&(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:'1rem',paddingBottom:'1rem',borderBottom:'1px solid var(--border)'}}>
                <RadarChart scores={internHistory[0].scores} criteria={criteria} size={200}/>
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:'0.625rem',maxHeight:300,overflowY:'auto'}}>
              {internHistory.length===0?<p style={{color:'var(--text-muted)',textAlign:'center',fontSize:'0.82rem',padding:'1rem'}}>Belum ada evaluasi</p>
               :internHistory.map(ev=>{
                 const gs=GRADE_STYLE[ev.grade]||GRADE_STYLE.C
                 return (
                   <div key={ev.id} style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem',background:'var(--bg-main)',borderRadius:'var(--radius-md)',border:'1px solid var(--border)'}}>
                     <div style={{width:40,height:40,borderRadius:'50%',background:gs.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                       <span style={{fontWeight:900,fontSize:'1rem',color:gs.color}}>{ev.grade}</span>
                     </div>
                     <div style={{flex:1,minWidth:0}}>
                       <p style={{fontWeight:700,fontSize:'0.8rem'}}>{ev.period} · {ev.finalScore}/10</p>
                       {ev.acknowledgedAt && <p style={{fontSize:'0.65rem',color:'var(--secondary)'}}>✓ Dibaca intern</p>}
                       {ev.overallNote&&<p style={{fontSize:'0.7rem',color:'var(--text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.overallNote}</p>}
                       {ev.scores?.certificateUrl ? (
                          <p style={{fontSize:'0.65rem',color:'var(--warning)',fontWeight:700,marginTop:2}}>✓ Sertifikat Diunggah</p>
                       ) : (
                          <button onClick={() => Swal.fire('Info', 'Fitur upload ke Supabase Storage (bucket: certificates) akan aktif setelah konfigurasi storage selesai.', 'info')} style={{fontSize:'0.65rem', background:'var(--border)', color:'var(--text-secondary)', border:'none', padding:'2px 8px', borderRadius:4, cursor:'pointer', marginTop:4}}>+ Upload Sertifikat</button>
                       )}
                     </div>
                     <div style={{display:'flex',gap:4,flexShrink:0}}>
                       <button onClick={()=>setFormFor({internId:viewIntern.id,internName:viewIntern.name, internPeriod: `${viewIntern.periodStart || ''} s.d ${viewIntern.periodEnd || ''}`, existing:ev})} style={{background:'none',border:'none',cursor:'pointer',color:'var(--primary)'}}><Edit size={13} strokeWidth={2}/></button>
                       <button onClick={()=>handleDelete(ev.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)'}}><Trash size={13} strokeWidth={2}/></button>
                     </div>
                   </div>
                 )
               })
              }
            </div>
          </div>
        )}
      </div>

      {formFor&&<EvalForm {...formFor} criteria={criteria} onSave={handleSave} onClose={()=>setFormFor(null)}/>}
      <style>{`@keyframes pulse_{0%,100%{opacity:1}50%{opacity:0.4}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

'use client'
import React, { useRef, useState, useEffect, useCallback } from 'react'

const C = {
  purple: '#a855f7', purpleBg: 'rgba(168,85,247,0.10)', purpleBd: 'rgba(168,85,247,0.25)',
  blue:   '#3b82f6', blueBg:   'rgba(59,130,246,0.08)',  blueBd:   'rgba(59,130,246,0.22)',
  amber:  '#f59e0b', amberBg:  'rgba(245,158,11,0.08)',  amberBd:  'rgba(245,158,11,0.22)',
  green:  '#22c55e', greenBg:  'rgba(34,197,94,0.08)',   greenBd:  'rgba(34,197,94,0.22)',
  red:    '#ef4444', redBg:    'rgba(239,68,68,0.08)',   redBd:    'rgba(239,68,68,0.25)',
}

function bezier(x1, y1, x2, y2) {
  const cx = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`
}

function BulletBar({ active, quota, masukCount, overCapacity }) {
  const total = active + masukCount
  const max = Math.max(quota || 0, total, 1) * 1.15
  const pA = Math.min(100, (active / max) * 100)
  const pM = Math.min(100 - pA, (masukCount / max) * 100)
  const pQ = quota > 0 ? Math.min(99, (quota / max) * 100) : null
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ position: 'relative', height: 7, background: 'rgba(255,255,255,0.07)', borderRadius: 4 }}>
        <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${pA}%`, background: overCapacity ? C.red : C.blue, borderRadius: '4px 0 0 4px', transition:'width 0.4s' }} />
        {masukCount > 0 && <div style={{ position:'absolute', left:`${pA}%`, top:0, height:'100%', width:`${pM}%`, background:C.purple, opacity:0.75 }} />}
        {pQ !== null && <div style={{ position:'absolute', left:`${pQ}%`, top:-4, bottom:-4, width:2, background:'#fff', borderRadius:2, boxShadow:'0 0 6px #fff8', zIndex:2 }} />}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:'0.65rem', color:'rgba(255,255,255,0.4)' }}>
        <span style={{ color: overCapacity ? C.red : C.blue, fontWeight:700 }}>{active} aktif</span>
        {masukCount > 0 && <span style={{ color:C.purple, fontWeight:700 }}>+{masukCount} masuk</span>}
        <span>kuota: <b style={{ color: overCapacity ? C.red : (quota > 0 ? C.green : 'rgba(255,255,255,0.25)') }}>{quota > 0 ? quota : '—'}</b></span>
      </div>
    </div>
  )
}

function ColHeader({ color, icon, label, count, sub }) {
  return (
    <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${color}33` }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:'0.7rem', fontWeight:800, letterSpacing:'0.07em', textTransform:'uppercase', color, display:'flex', alignItems:'center', gap:5 }}>
          {icon} {label}
        </span>
        <span style={{ fontSize:'1.3rem', fontWeight:900, color, lineHeight:1 }}>{count}</span>
      </div>
      {sub && <p style={{ margin:'4px 0 0', fontSize:'0.65rem', color:'rgba(255,255,255,0.35)' }}>{sub}</p>}
    </div>
  )
}

function Card({ color, bg, bd, hovered, onClick, style = {}, children }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: hovered ? bg.replace('0.08','0.15').replace('0.10','0.18') : bg,
        border: `1px solid ${hovered ? color + '88' : bd}`,
        borderRadius: 10, padding:'10px 13px', transition:'all 0.2s',
        boxShadow: hovered ? `0 0 18px ${color}22` : 'none',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export default function SankeyDashboard({ rawData }) {
  const containerRef = useRef(null)
  const [rects, setRects]         = useState({})
  const [hovered, setHovered]     = useState(null)
  const [simMode, setSimMode]     = useState(false)
  const [simData, setSimData]     = useState([])
  const [editNode, setEditNode]   = useState(null)

  const pendingRefs = useRef({})
  const bidangRefs  = useRef({})
  const keluarRefs  = useRef({})
  const alumniRef   = useRef(null)

  useEffect(() => {
    setSimData(rawData ? JSON.parse(JSON.stringify(rawData)) : [])
  }, [rawData])

  const calcRects = useCallback(() => {
    if (!containerRef.current) return
    const base = containerRef.current.getBoundingClientRect()
    const out = {}

    Object.entries(pendingRefs.current).forEach(([k, el]) => {
      if (!el) return
      const r = el.getBoundingClientRect()
      out[`p_${k}`] = { x: r.right - base.left, y: (r.top + r.bottom) / 2 - base.top }
    })
    Object.entries(bidangRefs.current).forEach(([k, el]) => {
      if (!el) return
      const r = el.getBoundingClientRect()
      out[`b_${k}`] = { xL: r.left - base.left, xR: r.right - base.left, y: (r.top + r.bottom) / 2 - base.top }
    })
    Object.entries(keluarRefs.current).forEach(([k, el]) => {
      if (!el) return
      const r = el.getBoundingClientRect()
      out[`k_${k}`] = { xL: r.left - base.left, xR: r.right - base.left, y: (r.top + r.bottom) / 2 - base.top }
    })
    if (alumniRef.current) {
      const r = alumniRef.current.getBoundingClientRect()
      out['alumni'] = { xL: r.left - base.left, y: (r.top + r.bottom) / 2 - base.top }
    }
    setRects(out)
  }, [simData])

  useEffect(() => {
    const id = requestAnimationFrame(calcRects)
    return () => cancelAnimationFrame(id)
  }, [calcRects])

  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(() => requestAnimationFrame(calcRects))
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [calcRects])

  const allDepts    = simData || []
  const depts       = allDepts.filter(d => d.active > 0 || d.masukCount > 0 || d.keluarCount > 0)
  const totalMasuk  = depts.reduce((s, d) => s + (d.masukCount  || 0), 0)
  const totalKeluar = depts.reduce((s, d) => s + (d.keluarCount || 0), 0)
  const totalAlumni = allDepts.reduce((s, d) => s + (d.selesaiCount|| 0), 0)

  // Build SVG lines
  const lines = []
  depts.forEach(d => {
    const w = v => Math.max(1.5, Math.sqrt(v) * 2.2)

    if ((d.masukCount || 0) > 0) {
      const p = rects[`p_${d.bidang}`], b = rects[`b_${d.bidang}`]
      if (p && b) lines.push({ key:`pm_${d.bidang}`, path: bezier(p.x, p.y, b.xL, b.y), color: C.purple, w: w(d.masukCount), op: hovered === null || hovered === d.bidang ? 0.55 : 0.07 })
    }
    if ((d.keluarCount || 0) > 0) {
      const b = rects[`b_${d.bidang}`], k = rects[`k_${d.bidang}`]
      if (b && k) lines.push({ key:`bk_${d.bidang}`, path: bezier(b.xR, b.y, k.xL, k.y), color: C.amber, w: w(d.keluarCount), op: hovered === null || hovered === d.bidang ? 0.55 : 0.07 })
    }
    if ((d.selesaiCount || 0) > 0) {
      const k = rects[`k_${d.bidang}`], a = rects['alumni']
      if (k && a) lines.push({ key:`ka_${d.bidang}`, path: bezier(k.xR, k.y, a.xL, a.y), color: C.green, w: w(d.selesaiCount), op: hovered === null || hovered === d.bidang ? 0.55 : 0.07 })
    }
  })

  const handleSim = e => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const masukCount = parseInt(fd.get('masukCount')) || 0
    const quota      = parseInt(fd.get('quota'))      || 0
    setSimData(prev => prev.map(d => {
      if (d.bidang !== editNode.bidang) return d
      return { ...d, masukCount, quota, overCapacity: quota > 0 && (d.active + masukCount) > quota }
    }))
    setEditNode(null)
  }

  return (
    <div style={{ background:'linear-gradient(145deg,#0c1020 0%,#0e0b1e 100%)', borderRadius:16, border:'1px solid rgba(255,255,255,0.07)', overflow:'hidden', fontFamily:"'Inter','Segoe UI',sans-serif", color:'#fff' }}>

      {/* ── Header ── */}
      <div style={{ padding:'1.1rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:'1rem', fontWeight:800 }}>
            🔀 Talent Flow Analytics
          </h2>
          <p style={{ margin:'3px 0 0', fontSize:'0.72rem', color:'rgba(255,255,255,0.4)' }}>
            Visualisasi pergerakan intern · Pending → Bidang → Akan Selesai → Alumni
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ display:'flex', gap:12, fontSize:'0.68rem' }}>
            {[[C.purple,'Akan Masuk'],[C.blue,'Aktif'],[C.amber,'Akan Selesai'],[C.green,'Alumni']].map(([c,l]) => (
              <span key={l} style={{ display:'flex', alignItems:'center', gap:4, color:'rgba(255,255,255,0.45)' }}>
                <span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background:c }} />{l}
              </span>
            ))}
          </div>
          <button
            onClick={() => { setSimMode(s => !s); setEditNode(null) }}
            style={{ padding:'6px 14px', background: simMode ? 'rgba(239,68,68,0.18)' : 'rgba(168,85,247,0.18)', color: simMode ? C.red : C.purple, border:`1px solid ${simMode ? C.red : C.purple}44`, borderRadius:8, fontWeight:700, fontSize:'0.75rem', cursor:'pointer', transition:'all 0.2s' }}
          >
            {simMode ? '✕ Keluar' : '⚡ Simulasi'}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div ref={containerRef} style={{ position:'relative', padding:'1.25rem 1.5rem' }}>

        {/* SVG overlay */}
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:1, overflow:'visible' }}>
          <defs>
            {lines.map(l => {
              const m = l.path.match(/M ([\d.]+) ([\d.]+)/)
              const e = l.path.match(/([\d.]+) ([\d.]+)$/)
              return (
                <linearGradient key={`g_${l.key}`} id={`g_${l.key}`} gradientUnits="userSpaceOnUse"
                  x1={m?.[1]||0} y1={m?.[2]||0} x2={e?.[1]||0} y2={e?.[2]||0}>
                  <stop offset="0%"   stopColor={l.color} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={l.color} stopOpacity="0.4" />
                </linearGradient>
              )
            })}
          </defs>
          {lines.map(l => (
            <path key={l.key} d={l.path} fill="none"
              stroke={`url(#g_${l.key})`} strokeWidth={l.w} strokeOpacity={l.op}
              style={{ transition:'stroke-opacity 0.25s' }} />
          ))}
        </svg>

        {/* 4 columns */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.9fr 1fr 1fr', gap:'1.25rem', position:'relative', zIndex:2 }}>

          {/* ══ COL 1: AKAN MASUK ══ */}
          <div>
            <ColHeader color={C.purple} icon="📥" label="Akan Masuk" count={totalMasuk} sub="Intern pending per bidang" />
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {depts.filter(d => (d.masukCount||0) > 0).map(d => (
                <div key={d.bidang} ref={el => { pendingRefs.current[d.bidang] = el }}
                  onMouseEnter={() => setHovered(d.bidang)} onMouseLeave={() => setHovered(null)}>
                  <Card color={C.purple} bg={C.purpleBg} bd={C.purpleBd} hovered={hovered === d.bidang}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
                      <span style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.75)', fontWeight:600, lineHeight:1.35 }}>{d.bidang}</span>
                      <span style={{ fontSize:'1.2rem', fontWeight:900, color:C.purple, flexShrink:0 }}>{d.masukCount}</span>
                    </div>
                    {(d.masuk||[]).slice(0,2).map((m,i) => (
                      <div key={i} style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.3)', marginTop:3, lineHeight:1.2 }}>
                        {(m.name||'').split(' ').slice(0,2).join(' ')} · {(m.periodStart||'').slice(0,7)}
                      </div>
                    ))}
                    {d.masukCount > 2 && <div style={{ fontSize:'0.62rem', color: C.purple+'99', marginTop:2 }}>+{d.masukCount-2} lainnya</div>}
                  </Card>
                </div>
              ))}
              {depts.filter(d=>(d.masukCount||0)>0).length === 0 && (
                <div style={{ padding:'2rem 1rem', textAlign:'center', color:'rgba(255,255,255,0.2)', fontSize:'0.75rem' }}>Tidak ada<br/>pending</div>
              )}
            </div>
          </div>

          {/* ══ COL 2: BIDANG ══ */}
          <div>
            <ColHeader color={C.blue} icon="🏢" label="Bidang" count={depts.length} sub="Kapasitas & status kuota" />
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {depts.map(d => (
                <div key={d.bidang} ref={el => { bidangRefs.current[d.bidang] = el }}
                  onMouseEnter={() => setHovered(d.bidang)} onMouseLeave={() => setHovered(null)}>
                  <Card
                    color={d.overCapacity ? C.red : C.blue}
                    bg={d.overCapacity ? C.redBg : C.blueBg}
                    bd={d.overCapacity ? C.redBd : C.blueBd}
                    hovered={hovered === d.bidang}
                    onClick={simMode ? () => setEditNode(d) : undefined}
                  >
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                      <span style={{ fontSize:'0.73rem', fontWeight:700, color:'rgba(255,255,255,0.88)', lineHeight:1.35, flex:1 }}>{d.bidang}</span>
                      <div style={{ flexShrink:0 }}>
                        {d.overCapacity
                          ? <span style={{ fontSize:'0.58rem', padding:'2px 7px', background:'rgba(239,68,68,0.2)', color:C.red, borderRadius:10, fontWeight:800, border:'1px solid rgba(239,68,68,0.35)' }}>OVER</span>
                          : d.almostFull
                          ? <span style={{ fontSize:'0.58rem', padding:'2px 7px', background:'rgba(245,158,11,0.2)', color:C.amber, borderRadius:10, fontWeight:800, border:'1px solid rgba(245,158,11,0.35)' }}>PENUH</span>
                          : d.quota > 0
                          ? <span style={{ fontSize:'0.58rem', padding:'2px 7px', background:'rgba(34,197,94,0.15)', color:C.green, borderRadius:10, fontWeight:800, border:'1px solid rgba(34,197,94,0.3)' }}>OK</span>
                          : null
                        }
                      </div>
                    </div>
                    <BulletBar active={d.active} quota={d.quota} masukCount={d.masukCount||0} overCapacity={d.overCapacity} />
                    {simMode && <div style={{ marginTop:5, fontSize:'0.62rem', color:C.purple+'99' }}>⚡ klik untuk edit simulasi</div>}
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* ══ COL 3: AKAN SELESAI ══ */}
          <div>
            <ColHeader color={C.amber} icon="⏳" label="Akan Selesai" count={totalKeluar} sub="Kontrak selesai ≤ 60 hari" />
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {depts.filter(d => (d.keluarCount||0) > 0).map(d => (
                <div key={d.bidang} ref={el => { keluarRefs.current[d.bidang] = el }}
                  onMouseEnter={() => setHovered(d.bidang)} onMouseLeave={() => setHovered(null)}>
                  <Card color={C.amber} bg={C.amberBg} bd={C.amberBd} hovered={hovered === d.bidang}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
                      <span style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.75)', fontWeight:600, lineHeight:1.35 }}>{d.bidang}</span>
                      <span style={{ fontSize:'1.2rem', fontWeight:900, color:C.amber, flexShrink:0 }}>{d.keluarCount}</span>
                    </div>
                    {(d.keluar||[]).slice(0,2).map((k,i) => (
                      <div key={i} style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.3)', marginTop:3 }}>
                        {(k.name||'').split(' ').slice(0,2).join(' ')} · {(k.periodEnd||'').slice(0,7)}
                      </div>
                    ))}
                    {d.keluarCount > 2 && <div style={{ fontSize:'0.62rem', color:C.amber+'99', marginTop:2 }}>+{d.keluarCount-2} lainnya</div>}
                  </Card>
                </div>
              ))}
              {depts.filter(d=>(d.keluarCount||0)>0).length === 0 && (
                <div style={{ padding:'2rem 1rem', textAlign:'center', color:'rgba(255,255,255,0.2)', fontSize:'0.75rem' }}>Tidak ada<br/>akan selesai</div>
              )}
            </div>
          </div>

          {/* ══ COL 4: ALUMNI POOL ══ */}
          <div>
            <ColHeader color={C.green} icon="🎓" label="Alumni" count={totalAlumni} sub="Telah menyelesaikan program" />
            <div ref={alumniRef}>
              <Card color={C.green} bg={C.greenBg} bd={C.greenBd} hovered={false}>
                <div style={{ textAlign:'center', padding:'1rem 0' }}>
                  <div style={{ fontSize:'2.5rem', fontWeight:900, color:C.green, lineHeight:1 }}>{totalAlumni}</div>
                  <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.45)', marginTop:6 }}>Total Alumni / Selesai</div>
                </div>
                <div style={{ borderTop:'1px solid rgba(34,197,94,0.15)', paddingTop:10, marginTop:8, display:'flex', flexDirection:'column', gap:5 }}>
                  {allDepts.filter(d=>(d.selesaiCount||0)>0).map(d => (
                    <div key={d.bidang} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.68rem' }}>
                      <span style={{ color:'rgba(255,255,255,0.5)', lineHeight:1.3 }}>{d.bidang.length > 22 ? d.bidang.slice(0,21)+'…' : d.bidang}</span>
                      <span style={{ color:C.green, fontWeight:800, flexShrink:0, marginLeft:6 }}>{d.selesaiCount}</span>
                    </div>
                  ))}
                  {totalAlumni === 0 && (
                    <div style={{ textAlign:'center', color:'rgba(255,255,255,0.2)', fontSize:'0.72rem', padding:'0.5rem 0' }}>Belum ada data alumni</div>
                  )}
                </div>
              </Card>
            </div>

            {/* Summary stats */}
            <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
              {[
                { label:'Over Kapasitas', val: allDepts.filter(d=>d.overCapacity).length, color: C.red },
                { label:'Hampir Penuh',   val: allDepts.filter(d=>d.almostFull).length,   color: C.amber },
                { label:'Aman',           val: allDepts.filter(d=>d.quota>0&&!d.overCapacity&&!d.almostFull).length, color: C.green },
              ].map(s => (
                <div key={s.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 12px', background:'rgba(255,255,255,0.03)', borderRadius:8, border:'1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.45)' }}>{s.label}</span>
                  <span style={{ fontSize:'0.9rem', fontWeight:800, color:s.color }}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Simulation Edit Panel ── */}
        {simMode && editNode && (
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'#111827', border:'1px solid rgba(168,85,247,0.4)', borderRadius:14, padding:'1.5rem', width:310, zIndex:100, boxShadow:'0 25px 60px rgba(0,0,0,0.7)' }}>
            <h3 style={{ margin:'0 0 4px', fontSize:'0.95rem', color:C.purple }}>⚡ Simulasi: {editNode.bidang}</h3>
            <p style={{ margin:'0 0 1.25rem', fontSize:'0.72rem', color:'rgba(255,255,255,0.4)' }}>Ubah angka untuk proyeksi What-If</p>
            <form onSubmit={handleSim} style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { name:'masukCount', label:'Proyeksi Intern Masuk', def: editNode.masukCount||0 },
                { name:'quota',      label:'Kuota Bidang',           def: editNode.quota||0 },
              ].map(f => (
                <div key={f.name}>
                  <label style={{ display:'block', fontSize:'0.72rem', color:'rgba(255,255,255,0.5)', marginBottom:5 }}>{f.label}</label>
                  <input name={f.name} type="number" min={0} defaultValue={f.def}
                    style={{ width:'100%', padding:'8px 10px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:7, color:'#fff', fontSize:'0.9rem', boxSizing:'border-box' }} />
                </div>
              ))}
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                <button type="submit" style={{ flex:1, padding:'9px', background:C.purple, color:'#fff', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:'0.82rem' }}>Terapkan</button>
                <button type="button" onClick={() => setEditNode(null)} style={{ flex:1, padding:'9px', background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, cursor:'pointer', fontSize:'0.82rem' }}>Batal</button>
              </div>
            </form>
          </div>
        )}
        {simMode && editNode && (
          <div onClick={() => setEditNode(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:99 }} />
        )}
      </div>
    </div>
  )
}

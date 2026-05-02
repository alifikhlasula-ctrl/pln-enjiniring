'use client'
import React, { useState, useEffect } from 'react'
import { BarChart3, Users, Heart, Award, Briefcase, TrendingUp, Clock, FileText, DollarSign, RefreshCw, ChevronDown, Star, Calendar, Trophy, GraduationCap, Search } from 'lucide-react'

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'wellbeing', label: 'Well-being & Laporan', icon: Heart },
  { id: 'talent', label: 'Talent & Evaluasi', icon: Award },
  { id: 'financial', label: 'Financial', icon: DollarSign },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'kudostars', label: 'Kudostars', icon: Star },
  { id: 'alumni', label: 'Alumni Pool', icon: GraduationCap },
  { id: 'workforce', label: 'Workforce Planning', icon: Briefcase },
]
const MOOD_EMOJI = { very_happy:'😄', happy:'🙂', neutral:'😐', sad:'😔', very_sad:'😢' }
const MOOD_LABEL = { very_happy:'Sangat Senang', happy:'Senang', neutral:'Biasa', sad:'Kurang Baik', very_sad:'Buruk' }
const KUDO_CATS = { TEAMWORK:'🤝 Teamwork', HELPFUL:'💡 Helpful', CREATIVE:'🎨 Creative', LEADERSHIP:'👑 Leadership', INITIATIVE:'🚀 Initiative' }
const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

function Card({ children, style, title, subtitle }) {
  return (
    <div className="card" style={{ padding:'1.25rem', ...style }}>
      {title && <h3 style={{ fontWeight:800, fontSize:'0.95rem', marginBottom: subtitle ? 2 : 12 }}>{title}</h3>}
      {subtitle && <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginBottom:12 }}>{subtitle}</p>}
      {children}
    </div>
  )
}

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div className="card" style={{ padding:'1rem', borderTop:`3px solid ${color}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <p style={{ fontSize:'0.62rem', fontWeight:800, color, letterSpacing:'0.05em', textTransform:'uppercase' }}>{label}</p>
          <p style={{ fontSize:'1.6rem', fontWeight:900, color, lineHeight:1.1, marginTop:2 }}>{value}</p>
          {sub && <p style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:4 }}>{sub}</p>}
        </div>
        <span style={{ fontSize:'1.2rem' }}>{icon}</span>
      </div>
    </div>
  )
}

function MiniBar({ items, colorFn, formatValue }) {
  const max = Math.max(...items.map(i => i.value), 1)
  const fmt = formatValue || (v => v)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {items.slice(0,12).map((item, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span title={item.label} style={{ fontSize:'0.72rem', fontWeight:700, width:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0 }}>{item.label}</span>
          <div style={{ flex:1, height:18, background:'var(--bg-main)', borderRadius:4, overflow:'hidden' }}>
            <div style={{ width:`${(item.value/max)*100}%`, height:'100%', background: colorFn ? colorFn(i) : 'var(--primary)', borderRadius:4, transition:'width 0.5s', minWidth: item.value > 0 ? 4 : 0 }} />
          </div>
          <span style={{ fontSize:'0.72rem', fontWeight:800, minWidth:50, textAlign:'right' }}>{fmt(item.value)}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Interactive SVG Pie Chart ─────────────────── */
function PieChart({ items, colorFn, title, total, size = 180 }) {
  const [hovered, setHovered] = React.useState(null)
  const sum = items.reduce((s, i) => s + i.value, 0) || 1
  const cx = size / 2, cy = size / 2, r = size * 0.38, innerR = size * 0.22

  let cumAngle = -Math.PI / 2
  const slices = items.map((item, idx) => {
    const angle = (item.value / sum) * 2 * Math.PI
    const start = cumAngle
    cumAngle += angle
    const end = cumAngle
    const color = colorFn ? colorFn(idx, item.label) : `hsl(${idx * 40}, 65%, 55%)`
    const midAngle = start + angle / 2
    const labelR = r * 0.72
    return { item, start, end, angle, color, midAngle, labelR, idx }
  })

  const describeArc = (cx, cy, r, startAngle, endAngle, expand = false) => {
    const offset = expand ? 6 : 0
    const midA = (startAngle + endAngle) / 2
    const ox = cx + Math.cos(midA) * offset, oy = cy + Math.sin(midA) * offset
    const x1 = ox + r * Math.cos(startAngle), y1 = oy + r * Math.sin(startAngle)
    const x2 = ox + r * Math.cos(endAngle),   y2 = oy + r * Math.sin(endAngle)
    const xi1 = ox + innerR * Math.cos(startAngle), yi1 = oy + innerR * Math.sin(startAngle)
    const xi2 = ox + innerR * Math.cos(endAngle),   yi2 = oy + innerR * Math.sin(endAngle)
    const large = endAngle - startAngle > Math.PI ? 1 : 0
    if (endAngle - startAngle < 0.01) return ''
    return `M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${innerR} ${innerR} 0 ${large} 0 ${xi1} ${yi1} Z`
  }

  const hov = hovered !== null ? slices[hovered] : null

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
        {/* SVG Donut */}
        <div style={{ position:'relative', flexShrink:0 }}>
          <svg width={size} height={size} style={{ overflow:'visible', filter:'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}>
            {slices.map((s, i) => (
              <path
                key={i}
                d={describeArc(cx, cy, r, s.start, s.end, hovered === i)}
                fill={s.color}
                stroke="var(--bg-card)"
                strokeWidth={2}
                style={{ cursor:'pointer', transition:'d 0.2s ease, opacity 0.2s', opacity: hovered !== null && hovered !== i ? 0.45 : 1 }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
            {/* Center Text */}
            <text x={cx} y={cy - 8} textAnchor="middle" fontSize={size * 0.16} fontWeight="900" fill="var(--text-primary)">
              {hov ? hov.item.value : total ?? sum}
            </text>
            <text x={cx} y={cy + 10} textAnchor="middle" fontSize={size * 0.07} fill="var(--text-muted)" fontWeight="700">
              {hov ? (hov.item.value / sum * 100).toFixed(1) + '%' : 'Total'}
            </text>
            {hov && (
              <text x={cx} y={cy + 24} textAnchor="middle" fontSize={size * 0.065} fill={hov.color} fontWeight="800">
                {hov.item.label.length > 10 ? hov.item.label.slice(0,10)+'…' : hov.item.label}
              </text>
            )}
          </svg>
        </div>

        {/* Legend */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:7, minWidth:120 }}>
          {slices.map((s, i) => (
            <div
              key={i}
              style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', opacity: hovered !== null && hovered !== i ? 0.45 : 1, transition:'opacity 0.15s' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div style={{ width:10, height:10, borderRadius:3, background:s.color, flexShrink:0, boxShadow:`0 0 0 2px ${s.color}30` }} />
              <span style={{ fontSize:'0.72rem', fontWeight:700, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.item.label}</span>
              <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                <span style={{ fontSize:'0.72rem', fontWeight:900, color:s.color }}>{s.item.value}</span>
                <span style={{ fontSize:'0.62rem', color:'var(--text-muted)' }}>{(s.item.value/sum*100).toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hovered detail pill */}
      {hov && (
        <div style={{ padding:'6px 14px', borderRadius:99, background:`${hov.color}18`, border:`1px solid ${hov.color}40`, fontSize:'0.72rem', fontWeight:800, color:hov.color, textAlign:'center', transition:'all 0.2s' }}>
          {hov.item.label} — {hov.item.value} intern ({(hov.item.value/sum*100).toFixed(1)}%)
        </div>
      )}
    </div>
  )
}

function ForecastDistBar({ items }) {
  if (!items || items.length === 0) return <p style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>Tidak ada data</p>
  // max based on projected or active, whichever is highest, so bars don't overflow
  const maxProjected = Math.max(...items.map(i => Math.max(i.value.active + i.value.entering, 1)))
  
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {/* Header Row */}
      <div style={{ display:'flex', alignItems:'center', gap:8, paddingBottom:6, borderBottom:'1px solid var(--border)', fontSize:'0.65rem', fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase' }}>
        <span style={{ width:160, flexShrink:0 }}>Kategori</span>
        <div style={{ flex:1, display:'flex', justifyContent:'space-between' }}>
          <span style={{ marginLeft:4 }}>Visualisasi Proyeksi</span>
          <div style={{ display:'flex', gap:8, minWidth:120, justifyContent:'flex-end' }}>
            <span style={{color:'#3b82f6', width:26, textAlign:'center'}} title="Aktif Saat Ini">AKT</span>
            <span style={{color:'#ef4444', width:26, textAlign:'center'}} title="Akan Keluar">-OUT</span>
            <span style={{color:'#22c55e', width:26, textAlign:'center'}} title="Akan Masuk">+IN</span>
            <span style={{color:'var(--text-primary)', width:26, textAlign:'center'}} title="Total Proyeksi">TOT</span>
          </div>
        </div>
      </div>

      {items.slice(0, 12).map((item, i) => {
        const d = item.value
        const projected = d.active - d.exiting + d.entering
        const activeStay = d.active - d.exiting
        
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.75rem' }} title={`Aktif: ${d.active}\nKeluar bulan ini: ${d.exiting}\nMasuk: ${d.entering}\nProyeksi: ${projected}`}>
            <span style={{ fontWeight:700, width:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0 }}>{item.label}</span>
            <div style={{ flex:1, display:'flex', alignItems:'center', gap:12 }}>
              {/* Stacked Bar */}
              <div style={{ flex:1, height:14, background:'var(--bg-main)', borderRadius:4, overflow:'hidden', display:'flex' }}>
                <div style={{ width:`${(activeStay/maxProjected)*100}%`, background:'#3b82f6', transition:'width 0.5s' }} />
                <div style={{ width:`${(d.exiting/maxProjected)*100}%`, background:'#ef4444', transition:'width 0.5s' }} />
                <div style={{ width:`${(d.entering/maxProjected)*100}%`, background:'#22c55e', transition:'width 0.5s' }} />
              </div>
              
              {/* Numbers */}
              <div style={{ display:'flex', gap:8, minWidth:120, justifyContent:'flex-end', fontWeight:800 }}>
                <span style={{color:'#3b82f6', width:26, textAlign:'center'}}>{d.active}</span>
                <span style={{color:'#ef4444', width:26, textAlign:'center'}}>{d.exiting > 0 ? `-${d.exiting}` : '0'}</span>
                <span style={{color:'#22c55e', width:26, textAlign:'center'}}>{d.entering > 0 ? `+${d.entering}` : '0'}</span>
                <span style={{color:'var(--text-primary)', width:26, textAlign:'center'}}>{projected}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CountdownList({ items, label, color }) {
  if (!items?.length) return <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', textAlign:'center', padding:'1rem' }}>Tidak ada data</p>
  
  const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  const fmtDate = (d) => {
    if (!d) return '-'
    const [y,m,day] = d.split('-')
    return `${parseInt(day)} ${MONTH_NAMES[parseInt(m)-1]} ${y}`
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 10px', borderRadius:8, background:'var(--bg-main)', border:'1px solid var(--border)' }}>
          <div>
            <p style={{ fontWeight:700, fontSize:'0.82rem' }}>{it.name}</p>
            <p style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>{it.bidang}</p>
          </div>
          <span style={{ fontWeight:900, fontSize:'0.75rem', color, padding:'4px 10px', borderRadius:99, background:`${color}18`, whiteSpace:'nowrap' }}>
            {it.periodStart ? `Masuk ${fmtDate(it.periodStart)}` : `Keluar ${fmtDate(it.periodEnd)}`}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function InternInsightPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [filter, setFilter] = useState({ month: '', year: '' })

  // Gamification tab states
  const [lbData, setLbData] = useState(null)
  const [lbLoading, setLbLoading] = useState(false)
  const [lbMonth, setLbMonth] = useState(new Date().toISOString().slice(0, 7))
  const [kudoData, setKudoData] = useState(null)
  const [kudoLoading, setKudoLoading] = useState(false)
  const [alumniData, setAlumniData] = useState(null)
  const [alumniLoading, setAlumniLoading] = useState(false)
  const [alumniSearch, setAlumniSearch] = useState('')
  const [alumniSort, setAlumniSort] = useState('score')
  const [alumniBidang, setAlumniBidang] = useState('')

  // Workforce Planning states
  const [wfData, setWfData] = useState(null)
  const [wfLoading, setWfLoading] = useState(false)
  const [wfExpanded, setWfExpanded] = useState(null)       // expanded bidang name
  const [wfEditing, setWfEditing] = useState(null)         // bidang being edited
  const [wfEditVal, setWfEditVal] = useState('')            // quota input value
  const [wfSaving, setWfSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter.month) params.append('month', filter.month)
    if (filter.year) params.append('year', filter.year)
    params.append('_t', Date.now().toString())

    fetch(`/api/admin/intern-insight?${params.toString()}`)
      .then(r => r.json()).then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filter])

  // Lazy-load gamification data on tab switch
  useEffect(() => {
    if (tab === 'leaderboard') {
      setLbLoading(true)
      fetch(`/api/admin/leaderboard?month=${lbMonth}`).then(r => r.json()).then(d => { setLbData(d); setLbLoading(false) }).catch(() => setLbLoading(false))
    }
    if (tab === 'kudostars' && !kudoData && !kudoLoading) {
      setKudoLoading(true)
      fetch('/api/recognition').then(r => r.json()).then(d => { setKudoData(d); setKudoLoading(false) }).catch(() => setKudoLoading(false))
    }
    if (tab === 'alumni' && !alumniData && !alumniLoading) {
      setAlumniLoading(true)
      fetch(`/api/admin/alumni?sort=${alumniSort}&search=${alumniSearch}&bidang=${alumniBidang}`)
        .then(r => r.json()).then(d => { setAlumniData(d); setAlumniLoading(false) }).catch(() => setAlumniLoading(false))
    }
    if (tab === 'workforce' && !wfData && !wfLoading) {
      setWfLoading(true)
      fetch('/api/admin/workforce')
        .then(r => r.json()).then(d => { setWfData(d); setWfLoading(false) }).catch(() => setWfLoading(false))
    }
  }, [tab, lbMonth])

  // Re-fetch alumni on filter change
  useEffect(() => {
    if (tab !== 'alumni') return
    setAlumniLoading(true)
    fetch(`/api/admin/alumni?sort=${alumniSort}&search=${alumniSearch}&bidang=${alumniBidang}`)
      .then(r => r.json()).then(d => { setAlumniData(d); setAlumniLoading(false) }).catch(() => setAlumniLoading(false))
  }, [alumniSearch, alumniSort, alumniBidang])

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'60vh' }}>
      <RefreshCw size={28} style={{ animation:'spin 1s linear infinite', color:'var(--primary)' }} />
    </div>
  )
  if (!data) return <div style={{ textAlign:'center', padding:'4rem', color:'var(--text-muted)' }}>Gagal memuat data.</div>

  const { overview: ov, wellbeing: wb, talent: tl, attendance: at, onboarding: ob, financial: fn } = data

  const fmtRp = v => `Rp ${(v||0).toLocaleString('id-ID')}`

  return (
    <>
      <div style={{ padding:'1.5rem', maxWidth:1400, margin:'0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom:'1.5rem', display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <h1 style={{ fontSize:'1.5rem', fontWeight:900, display:'flex', alignItems:'center', gap:8 }}>
              <TrendingUp size={22} style={{ color:'var(--primary)' }} /> Intern Insight
            </h1>
            <p style={{ color:'var(--text-secondary)', fontSize:'0.82rem', marginTop:4 }}>Dashboard analitik komprehensif untuk pemantauan peserta magang</p>
          </div>
          
          <div style={{ display:'flex', gap:8, alignItems:'center', background:'var(--bg-card)', padding:'8px 12px', borderRadius:12, border:'1px solid var(--border)' }}>
            <Calendar size={14} style={{ color:'var(--text-muted)' }} />
            <select 
              value={filter.month} 
              onChange={e => setFilter({ ...filter, month: e.target.value })}
              style={{ padding:'4px 8px', borderRadius:6, border:'1px solid var(--border)', background:'transparent', fontSize:'0.75rem', fontWeight:700, cursor:'pointer' }}
            >
              <option value="">Semua Bulan</option>
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
                <option key={m} value={m}>{['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][i]}</option>
              ))}
            </select>
            <select 
              value={filter.year} 
              onChange={e => setFilter({ ...filter, year: e.target.value })}
              style={{ padding:'4px 8px', borderRadius:6, border:'1px solid var(--border)', background:'transparent', fontSize:'0.75rem', fontWeight:700, cursor:'pointer' }}
            >
              <option value="">Tahun</option>
              {['2024','2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {(filter.month || filter.year) && (
              <button 
                onClick={() => setFilter({ month: '', year: '' })}
                style={{ background:'var(--danger-light)', color:'var(--danger)', border:'none', padding:'4px 8px', borderRadius:6, fontSize:'0.65rem', fontWeight:800, cursor:'pointer' }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:'1.5rem', background:'var(--bg-card)', padding:4, borderRadius:12, border:'1px solid var(--border)', flexWrap:'wrap' }}>
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display:'flex', alignItems:'center', gap:6, padding:'0.6rem 1rem', borderRadius:8,
                border:'none', cursor:'pointer', fontWeight:active?800:600, fontSize:'0.82rem',
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? '#fff' : 'var(--text-muted)', transition:'all 0.15s'
              }}>
                <Icon size={15} /> {t.label}
              </button>
            )
          })}
        </div>

        {/* ═══ TAB: OVERVIEW ═══ */}
        {tab === 'overview' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'0.75rem' }}>
              <StatCard label="Total Intern" value={ov.total} icon="👥" color="var(--primary)" />
              <StatCard label="Aktif" value={ov.statusCounts.ACTIVE} icon="✅" color="#22c55e" />
              <StatCard label="Pending" value={ov.statusCounts.PENDING} icon="⏳" color="#f59e0b" sub={ov.pendingInterns[0] ? `Terdekat: ${ov.pendingInterns[0].daysUntil} hari` : ''} />
              <StatCard label="Selesai" value={ov.statusCounts.COMPLETED} icon="🎓" color="#6366f1" />
              <StatCard label="Laki-laki" value={ov.genderCount['Laki-laki']||0} icon="👨" color="#3b82f6" />
              <StatCard label="Perempuan" value={ov.genderCount['Perempuan']||0} icon="👩" color="#ec4899" />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              <Card title="⏳ Pending — Countdown Masuk" subtitle="Intern yang akan segera mulai magang">
                <CountdownList items={ov.pendingInterns} label="Masuk" color="#f59e0b" />
              </Card>
              <Card title="🎓 Segera Selesai (≤30 hari)" subtitle="Intern yang kontraknya hampir berakhir">
                <CountdownList items={ov.completingSoon} label="Sisa" color="#6366f1" />
              </Card>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'1rem' }}>
              <Card title="📊 Distribusi Bidang & Proyeksi" subtitle="Analisis pergerakan intern berdasarkan bidang">
                <ForecastDistBar items={Object.entries(ov.bidangDist).map(([l,v])=>({label:l,value:v})).sort((a,b)=>(b.value.active+b.value.entering)-(a.value.active+a.value.entering))} />
              </Card>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              <Card title="🎓 Distribusi Jenjang" subtitle="Hover slice untuk detail">
                <PieChart
                  items={Object.entries(ov.jenjangDist||{}).map(([l,v])=>({label:l,value:v})).sort((a,b)=>b.value-a.value)}
                  colorFn={(i) => ['#8b5cf6','#6366f1','#a78bfa','#c4b5fd','#7c3aed'][i] || `hsl(${260+i*20},65%,55%)`}
                />
              </Card>
              <Card title="🏦 Distribusi Bank" subtitle="Hover slice untuk detail">
                <PieChart
                  items={Object.entries(ov.bankDist||{}).map(([l,v])=>({label:l,value:v})).sort((a,b)=>b.value-a.value).slice(0,8)}
                  colorFn={(i) => `hsl(${160+i*25},60%,45%)`}
                />
              </Card>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              <Card title="🎂 Ulang Tahun per Bulan" subtitle="Persebaran ulang tahun intern">
                <PieChart
                  items={ov.birthdayByMonth.map((v,i)=>({label:MONTHS[i],value:v})).filter(x=>x.value>0)}
                  colorFn={(i) => `hsl(${330+i*12},70%,55%)`}
                />
              </Card>
              <Card title="🧑‍🤝‍🧑 Distribusi Gender" subtitle="Komposisi intern berdasarkan jenis kelamin">
                <PieChart
                  items={[{label:'Laki-laki',value:ov.genderCount['Laki-laki']||0},{label:'Perempuan',value:ov.genderCount['Perempuan']||0}]}
                  colorFn={(i) => i===0?'#3b82f6':'#ec4899'}
                  size={200}
                />
              </Card>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'1rem' }}>
              <Card title="👨‍🏫 Pembimbing Lapangan & Proyeksi" subtitle="Analisis beban bimbingan berdasarkan intern masuk dan keluar">
                <ForecastDistBar items={Object.entries(ov.supervisorDist||{}).map(([l,v])=>({label:l,value:v})).sort((a,b)=>(b.value.active+b.value.entering)-(a.value.active+a.value.entering))} />
              </Card>
            </div>

            <Card title="📈 Forecast Masuk & Keluar per Bulan" subtitle="Proyeksi pergerakan intern — klik bulan untuk detail">
              {ov.forecast?.length > 0 ? (() => {
                const data = ov.forecast.slice(-12)
                const maxVal = Math.max(...data.map(f => Math.max(f.enter, f.exit)), 1)
                const totalMasuk = data.reduce((s,f) => s+f.enter, 0)
                const totalKeluar = data.reduce((s,f) => s+f.exit, 0)
                const netGrowth = totalMasuk - totalKeluar
                const peakEnter = data.reduce((p,f) => f.enter > (p?.enter||0) ? f : p, null)
                const peakExit = data.reduce((p,f) => f.exit > (p?.exit||0) ? f : p, null)
                const MONTH_SHORT = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
                const fmtMonth = (m) => { const [y,mo] = m.split('-'); return `${MONTH_SHORT[parseInt(mo)]} ${y}` }
                const nowYM = new Date().toISOString().slice(0,7)
                return (
                  <div>
                    {/* KPI Summary Row */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:20 }}>
                      {[
                        { label:'Total Masuk', value:`+${totalMasuk}`, color:'#22c55e', bg:'#22c55e18', icon:'📥', sub:'intern baru bergabung' },
                        { label:'Total Keluar', value:`-${totalKeluar}`, color:'#ef4444', bg:'#ef444418', icon:'📤', sub:'intern selesai/keluar' },
                        { label:'Net Growth', value:(netGrowth>=0?'+':'')+netGrowth, color: netGrowth>=0?'#22c55e':'#ef4444', bg:netGrowth>=0?'#22c55e18':'#ef444418', icon:'📊', sub:'pertumbuhan bersih' },
                        { label:'Bulan Paling Padat', value: peakEnter ? fmtMonth(peakEnter.month) : '-', color:'#f59e0b', bg:'#f59e0b18', icon:'🔥', sub: peakEnter ? `+${peakEnter.enter} intern masuk` : '' },
                      ].map(k => (
                        <div key={k.label} style={{ padding:'10px 14px', borderRadius:10, background:k.bg, border:`1px solid ${k.color}30` }}>
                          <p style={{ fontSize:'0.62rem', fontWeight:800, color:k.color, letterSpacing:'0.05em', textTransform:'uppercase' }}>{k.icon} {k.label}</p>
                          <p style={{ fontSize:'1.35rem', fontWeight:900, color:k.color, lineHeight:1.1, margin:'4px 0 2px' }}>{k.value}</p>
                          <p style={{ fontSize:'0.62rem', color:'var(--text-muted)' }}>{k.sub}</p>
                        </div>
                      ))}
                    </div>

                    {/* Bar Chart */}
                    <div style={{ overflowX:'auto', paddingBottom:4 }}>
                      <div style={{ display:'flex', alignItems:'flex-end', gap:6, minWidth: data.length * 68, height:180, position:'relative', padding:'0 4px' }}>
                        {/* Y-axis guide lines */}
                        {[0,0.25,0.5,0.75,1].map(pct => (
                          <div key={pct} style={{ position:'absolute', left:0, right:0, bottom:`${pct*100}%`, borderTop:'1px dashed var(--border)', opacity:0.5, zIndex:0 }}>
                            <span style={{ position:'absolute', right:'100%', fontSize:'0.5rem', color:'var(--text-muted)', paddingRight:4, transform:'translateY(-50%)' }}>
                              {Math.round(maxVal*pct)}
                            </span>
                          </div>
                        ))}
                        {data.map((f) => {
                          const enterPct = (f.enter / maxVal) * 100
                          const exitPct = (f.exit / maxVal) * 100
                          const net = f.enter - f.exit
                          const isNow = f.month === nowYM
                          const isFuture = f.month > nowYM
                          return (
                            <div key={f.month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2, zIndex:1, minWidth:52 }}
                              title={`${fmtMonth(f.month)}\nMasuk: +${f.enter}\nKeluar: -${f.exit}\nNet: ${net>=0?'+':''}${net}`}
                            >
                              {/* Net label */}
                              <span style={{ fontSize:'0.55rem', fontWeight:900, color: net>0?'#22c55e':net<0?'#ef4444':'var(--text-muted)', marginBottom:2 }}>
                                {net>0?'+':''}{net}
                              </span>
                              {/* Bars */}
                              <div style={{ display:'flex', gap:2, alignItems:'flex-end', width:'100%', height:140 }}>
                                <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-end', height:'100%' }}>
                                  <div style={{
                                    height:`${Math.max(enterPct,2)}%`,
                                    background: isNow ? '#34d399' : isFuture ? '#86efac' : '#22c55e',
                                    borderRadius:'4px 4px 0 0',
                                    opacity: isFuture ? 0.7 : 1,
                                    transition:'height 0.4s ease',
                                    position:'relative'
                                  }}>
                                    {f.enter > 0 && <span style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', fontSize:'0.55rem', fontWeight:900, color:'#22c55e', whiteSpace:'nowrap' }}>+{f.enter}</span>}
                                  </div>
                                </div>
                                <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-end', height:'100%' }}>
                                  <div style={{
                                    height:`${Math.max(exitPct,2)}%`,
                                    background: isNow ? '#f87171' : isFuture ? '#fca5a5' : '#ef4444',
                                    borderRadius:'4px 4px 0 0',
                                    opacity: isFuture ? 0.7 : 1,
                                    transition:'height 0.4s ease',
                                    position:'relative'
                                  }}>
                                    {f.exit > 0 && <span style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', fontSize:'0.55rem', fontWeight:900, color:'#ef4444', whiteSpace:'nowrap' }}>-{f.exit}</span>}
                                  </div>
                                </div>
                              </div>
                              {/* Month Label */}
                              <div style={{ textAlign:'center', marginTop:4 }}>
                                <p style={{ fontSize:'0.58rem', fontWeight: isNow ? 900 : 700, color: isNow ? 'var(--primary)' : 'var(--text-muted)', whiteSpace:'nowrap' }}>
                                  {fmtMonth(f.month)}{isNow ? ' ◀' : ''}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Legend & Insight Note */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16, flexWrap:'wrap', gap:8 }}>
                      <div style={{ display:'flex', gap:16 }}>
                        {[['#22c55e','Intern Masuk'],['#ef4444','Intern Keluar']].map(([c,l]) => (
                          <div key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.68rem', color:'var(--text-muted)', fontWeight:700 }}>
                            <div style={{ width:12, height:12, borderRadius:3, background:c }} />{l}
                          </div>
                        ))}
                        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.68rem', color:'var(--text-muted)', fontWeight:700 }}>
                          <div style={{ width:12, height:12, borderRadius:3, background:'#86efac', opacity:0.7 }} />Proyeksi
                        </div>
                      </div>
                      {peakExit && (
                        <p style={{ fontSize:'0.65rem', color:'#f59e0b', fontWeight:700, background:'#f59e0b15', padding:'4px 10px', borderRadius:99, border:'1px solid #f59e0b30' }}>
                          ⚠️ Puncak keluar: {fmtMonth(peakExit.month)} ({peakExit.exit} intern) — perlu rekrutmen pengganti
                        </p>
                      )}
                    </div>
                  </div>
                )
              })() : <p style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>Belum ada data forecast</p>}
            </Card>


            <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'1rem' }}>
              <Card title="🏫 Distribusi Universitas/Sekolah & Proyeksi">
                <ForecastDistBar items={Object.entries(ov.universityDist||{}).map(([l,v])=>({label:l,value:v})).sort((a,b)=>(b.value.active+b.value.entering)-(a.value.active+a.value.entering)).slice(0,12)} />
              </Card>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'1rem' }}>
              <Card title="📋 Onboarding Status">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {Object.entries(ob.stats||{}).map(([k,v]) => (
                    <div key={k} style={{ padding:10, borderRadius:8, background:'var(--bg-main)', textAlign:'center' }}>
                      <p style={{ fontSize:'0.65rem', fontWeight:800, color:'var(--text-muted)' }}>{k}</p>
                      <p style={{ fontSize:'1.3rem', fontWeight:900, color:'var(--primary)' }}>{v}</p>
                    </div>
                  ))}
                </div>
                {ob.avgVelocityDays !== null && <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:8, textAlign:'center' }}>⚡ Rata-rata proses: <b style={{ color:'var(--primary)' }}>{ob.avgVelocityDays} hari</b></p>}
              </Card>
            </div>
          </div>
        )}

        {/* ═══ TAB: WELL-BEING & LAPORAN ═══ */}
        {tab === 'wellbeing' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'0.75rem' }}>
              <StatCard label="Happiness Index" value={wb.happinessIndex !== null ? `${wb.happinessIndex}%` : '-'} icon="💛" color="#f59e0b" sub="Skala 0-100" />
              <StatCard label="Total Laporan" value={wb.totalReports} icon="📝" color="var(--primary)" />
              <StatCard label="Belum Submit" value={wb.neverSubmitted?.length||0} icon="⚠️" color="#ef4444" sub="Intern aktif" />
              {Object.entries(wb.moodDist||{}).map(([k,v]) => (
                <StatCard key={k} label={MOOD_LABEL[k]||k} value={v} icon={MOOD_EMOJI[k]||'😐'} color="var(--text-secondary)" />
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              <Card title="📊 Distribusi Mood Laporan" subtitle="Jumlah laporan harian berdasarkan mood">
                {wb.moodVsProductivity?.length > 0 ? (
                  <MiniBar items={wb.moodVsProductivity.map(m => ({ label:`${MOOD_EMOJI[m.mood]} ${MOOD_LABEL[m.mood]||m.mood}`, value:m.count }))} colorFn={i => ['#22c55e','#84cc16','#f59e0b','#f97316','#ef4444'][i] || '#6b7280'} />
                ) : <p style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>Belum ada data mood</p>}
              </Card>
              <Card title="🏆 Top 10 Pelapor Teraktif" subtitle="Intern dengan jumlah laporan terbanyak">
                <MiniBar items={(wb.topSubmitters||[]).map(s => ({ label:s.name, value:s.count }))} colorFn={() => '#22c55e'} />
              </Card>
            </div>

            <Card title="⚠️ Intern yang Belum Pernah Submit Laporan">
              {wb.neverSubmitted?.length > 0 ? (
                <div>
                  <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:10 }}>
                    <span style={{ fontWeight:900, color:'#f59e0b', fontSize:'1rem' }}>{wb.neverSubmitted.length}</span> intern aktif belum pernah submit laporan
                  </p>
                  <details>
                    <summary style={{ cursor:'pointer', fontSize:'0.78rem', color:'var(--text-muted)', userSelect:'none', fontWeight:700 }}>
                      Lihat daftar intern →
                    </summary>
                    <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:6 }}>
                      {wb.neverSubmitted.map((n,i) => (
                        <div key={i} style={{ padding:'4px 10px', borderRadius:20, background:'var(--bg-main)', border:'1px solid var(--border)', fontSize:'0.75rem', fontWeight:600 }}>
                          {n.name}
                          <span style={{ marginLeft:6, fontSize:'0.65rem', color:'var(--text-muted)' }}>{n.bidang?.split(' ').slice(0,2).join(' ')}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ) : <p style={{ color:'#22c55e', fontWeight:700, fontSize:'0.82rem', textAlign:'center' }}>✅ Semua intern aktif sudah pernah submit!</p>}
            </Card>

            {/* Mood Heatmap by Department */}
            {wb.moodHeatmap?.length > 0 && (
              <Card 
                title="🗺️ Mood Heatmap per Bidang" 
                subtitle="Happiness Index per departemen berdasarkan Laporan Harian (Daily Reports)"
              >
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {wb.moodHeatmap.map((dept) => {
                    const hi = dept.happinessIndex
                    const barColor = hi >= 80 ? '#22c55e' : hi >= 60 ? '#84cc16' : hi >= 40 ? '#f59e0b' : '#ef4444'
                    return (
                      <div key={dept.bidang} style={{
                        padding:'12px', borderRadius:12,
                        background: dept.alert ? '#ef444408' : 'var(--bg-main)',
                        border: dept.alert ? '1px solid #ef444430' : '1px solid var(--border)',
                        transition:'transform 0.2s'
                      }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                          <span style={{ fontWeight:800, fontSize:'0.85rem', color: dept.alert ? '#ef4444' : 'var(--text-primary)' }}>
                            {dept.alert && '⚠️ '}{dept.bidang}
                          </span>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:'0.65rem', color:'var(--text-muted)', background:'var(--bg-card)', padding:'2px 8px', borderRadius:6 }}>{dept.total} laporan</span>
                            <span style={{ fontWeight:900, fontSize:'1rem', color: barColor }}>{hi}%</span>
                          </div>
                        </div>
                        
                        <div style={{ display:'flex', gap:2, height:10, borderRadius:5, overflow:'hidden', background:'var(--bg-card)', border:'1px solid var(--border)' }}>
                          <div style={{ width:`${hi}%`, background: barColor, borderRadius:5, transition:'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                        </div>

                        <div style={{ display:'flex', gap:12, marginTop:10, flexWrap:'wrap' }}>
                          {[
                            { m:'very_happy', e:'😄', c:'#22c55e' },
                            { m:'happy', e:'🙂', c:'#84cc16' },
                            { m:'neutral', e:'😐', c:'#f59e0b' },
                            { m:'sad', e:'😔', c:'#f97316' },
                            { m:'very_sad', e:'😢', c:'#ef4444' }
                          ].map(item => (
                            <div key={item.m} style={{ display:'flex', alignItems:'center', gap:4, opacity: dept[item.m] > 0 ? 1 : 0.3 }}>
                              <span style={{ fontSize:'0.9rem' }}>{item.e}</span>
                              <span style={{ fontSize:'0.7rem', fontWeight:800, color: dept[item.m] > 0 ? item.c : 'var(--text-muted)' }}>{dept[item.m]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}

                  {/* Legend / Info */}
                  <div style={{ marginTop:8, padding:'10px', background:'var(--bg-card)', borderRadius:8, border:'1px dashed var(--border)' }}>
                    <p style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontWeight:700, marginBottom:4 }}>💡 Cara Penghitungan Happiness Index (HI):</p>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'10px' }}>
                      {[
                        { l:'Sangat Senang', v:'100%', c:'#22c55e' },
                        { l:'Senang', v:'75%', c:'#84cc16' },
                        { l:'Biasa', v:'50%', c:'#f59e0b' },
                        { l:'Kurang Baik', v:'25%', c:'#f97316' },
                        { l:'Buruk', v:'0%', c:'#ef4444' }
                      ].map(i => (
                        <span key={i.l} style={{ fontSize:'0.6rem', color:'var(--text-muted)' }}>
                          <b style={{ color:i.c }}>{i.l}</b> = {i.v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Happiness Trend Sparkline */}
            {wb.happinessTrend?.length > 0 && (
              <Card 
                title="📈 Tren Happiness Index (Mingguan)" 
                subtitle="Rata-rata tingkat kebahagiaan per minggu berdasarkan mood laporan"
              >
                {(() => {
                  const trend = wb.happinessTrend
                  const max = 100
                  return (
                    <div>
                      <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:120, padding:'10px 0 20px', borderBottom:'1px solid var(--border)' }}>
                        {trend.map((w, i) => {
                          const hasData = w.totalReports > 0
                          const color = !hasData ? 'var(--border)' : w.index >= 75 ? '#22c55e' : w.index >= 50 ? '#f59e0b' : '#ef4444'
                          const barHeight = hasData ? Math.max((w.index / max) * 100, 4) : 4
                          
                          return (
                            <div key={w.week} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6, position:'relative' }}>
                              {/* Percentage Label */}
                              <span style={{ 
                                fontSize:'0.55rem', 
                                fontWeight:900, 
                                color: hasData ? color : 'var(--text-muted)',
                                opacity: hasData ? 1 : 0.4
                              }}>
                                {hasData ? `${w.index}%` : 'N/A'}
                              </span>

                              {/* Bar */}
                              <div style={{ 
                                width:'100%', 
                                height: barHeight, 
                                background: color, 
                                borderRadius:'4px 4px 2px 2px', 
                                transition:'height 0.6s ease, background 0.3s',
                                opacity: hasData ? 1 : 0.2,
                                border: hasData ? 'none' : '1px dashed var(--text-muted)'
                              }} title={`${w.label}: ${hasData ? w.index + '%' : 'Tidak ada laporan'}`} />
                              
                              {/* X-Axis Label (The new readable label) */}
                              <div style={{ 
                                position:'absolute', 
                                bottom:-22, 
                                whiteSpace:'nowrap', 
                                transform:'rotate(-30deg)',
                                transformOrigin:'left center'
                              }}>
                                <span style={{ 
                                  fontSize:'0.5rem', 
                                  fontWeight:700, 
                                  color: hasData ? 'var(--text-primary)' : 'var(--text-muted)',
                                  opacity: hasData ? 1 : 0.5
                                }}>
                                  {w.label}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <p style={{ fontSize:'0.6rem', color:'var(--text-muted)', marginTop:24, textAlign:'right', fontStyle:'italic' }}>
                        * Menampilkan 12 minggu terakhir. N/A berarti tidak ada data laporan pada minggu tersebut.
                      </p>
                    </div>
                  )
                })()}
              </Card>
            )}

            <Card title="📈 Tren Kehadiran (30 Hari Terakhir)" subtitle="Jumlah kehadiran harian (PRESENT + LATE) dari data absensi realtime">
              {at.trend?.length > 0 ? (() => {
                const maxVal = Math.max(...at.trend.map(x => x.hadir ?? x.present), 1)
                return (
                  <div>
                    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:140, padding:'8px 0 4px' }}>
                      {at.trend.map((d,i) => {
                        const val = d.hadir ?? d.present
                        const pct = maxVal > 0 ? (val / maxVal) * 100 : 0
                        const now = new Date()
                        const wibNow = new Date(now.getTime() + (7 * 3600000))
                        const isToday = d.date === wibNow.toISOString().split('T')[0]
                        return (
                          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2, minWidth:0 }}>
                            <div
                              style={{
                                width:'100%',
                                height: pct > 0 ? `${pct}%` : 2,
                                background: isToday ? '#f59e0b' : val > 0 ? '#22c55e' : 'var(--border)',
                                borderRadius:'3px 3px 0 0',
                                transition:'height 0.3s',
                                opacity: val === 0 ? 0.3 : 1,
                                cursor:'default'
                              }}
                              title={`${d.date}\nHadir: ${val}\nPRESENT: ${d.present}  LATE: ${d.late}\nSAKIT: ${d.sakit}  IZIN: ${d.izin}`}
                            />
                            {i % 5 === 0 && (
                              <span style={{ fontSize:'0.48rem', color:'var(--text-muted)', transform:'rotate(-45deg)', transformOrigin:'top center', display:'block', marginTop:2, whiteSpace:'nowrap' }}>
                                {d.date.slice(5)}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:8 }}>
                      {[['#22c55e','Hadir'],['#f59e0b','Hari Ini'],['var(--border)','Tidak Ada Data']].map(([c,l]) => (
                        <div key={l} style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.65rem', color:'var(--text-muted)' }}>
                          <div style={{ width:10, height:10, borderRadius:2, background:c }} />{l}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })() : <p style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>Belum ada data absensi</p>}
            </Card>
          </div>
        )}

        {/* ═══ TAB: TALENT & EVALUASI ═══ */}
        {tab === 'talent' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'0.75rem' }}>
              <StatCard label="Total Evaluasi" value={tl.totalEvals} icon="📋" color="var(--primary)" />
              <StatCard label="Intern Selesai" value={tl.completedCount} icon="🎓" color="#6366f1" />
              {Object.entries(tl.scoreRanges||{}).map(([k,v]) => (
                <StatCard key={k} label={`Grade ${k}`} value={v} icon="⭐" color={k.startsWith('A')?'#22c55e':k.startsWith('B')?'#3b82f6':k.startsWith('C')?'#f59e0b':'#ef4444'} />
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              <Card title="🏆 Top 10 Performers">
                {tl.topPerformers?.length > 0 ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {tl.topPerformers.map((p,i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 10px', borderRadius:8, background:'var(--bg-main)', border:'1px solid var(--border)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontWeight:900, fontSize:'0.85rem', color: i<3 ? '#f59e0b' : 'var(--text-muted)', width:20 }}>#{i+1}</span>
                          <div>
                            <p style={{ fontWeight:700, fontSize:'0.82rem' }}>{p.name}</p>
                            <p style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>{p.bidang}</p>
                          </div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <span style={{ fontWeight:900, fontSize:'0.9rem', color:'var(--primary)' }}>{p.score}</span>
                          <span style={{ fontSize:'0.68rem', fontWeight:800, marginLeft:4, color: p.grade==='A'?'#22c55e':'#f59e0b' }}>{p.grade}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>Belum ada evaluasi</p>}
              </Card>
              <Card title="🏫 Efektivitas Universitas" subtitle="Rata-rata skor evaluasi per universitas">
                <MiniBar items={(tl.universityEffectiveness||[]).map(u => ({ label:`${u.university} (${u.evalCount})`, value:u.avgScore }))} colorFn={i => `hsl(${120+i*20},60%,45%)`} />
              </Card>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              <Card title="🔧 Skill Tracker" subtitle="Keterampilan yang paling sering dilaporkan intern">
                <MiniBar items={(tl.topSkills||[]).map(s => ({ label:s.skill, value:s.count }))} colorFn={i => `hsl(${260+i*15},65%,55%)`} />
              </Card>
              <Card title="📊 Skor Evaluasi per Bidang">
                <MiniBar items={(tl.evalByBidang||[]).map(e => ({ label:`${e.bidang} (${e.count})`, value:e.avgScore }))} colorFn={i => `hsl(${180+i*25},60%,50%)`} />
              </Card>
            </div>
          </div>
        )}

        {/* ═══ TAB: FINANCIAL ═══ */}
        {tab === 'financial' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'0.75rem' }}>
              <StatCard label="Total Anggaran" value={fmtRp(fn.totalBudgetAllTime)} icon="💰" color="var(--primary)" sub="Seluruh periode" />
              <StatCard label="Sudah Dibayar" value={fmtRp(fn.totalBudgetPaid)} icon="✅" color="#22c55e" sub="PAID + TRANSFERRED" />
              <StatCard label="Anggaran Tahun Ini" value={fmtRp(fn.totalBudgetThisYear)} icon="📅" color="#3b82f6" />
              <StatCard label="Anggaran Bulan Ini" value={fmtRp(fn.totalBudgetThisMonth)} icon="🗓️" color="#f59e0b" />
              <StatCard label="Total Record Payroll" value={fn.totalPayrolls} icon="📋" color="#6366f1" />
              {fn.avgPaymentSpeed !== null && <StatCard label="Kecepatan Bayar" value={`${fn.avgPaymentSpeed} hari`} icon="⚡" color="#22c55e" sub="Rata-rata proses" />}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              <Card title="💰 Tren Payroll per Periode" subtitle="Total allowance per periode pengajuan">
                <MiniBar items={(fn.payrollTrend||[]).map(p => ({ label:p.period, value:p.total }))} colorFn={() => '#22c55e'} formatValue={fmtRp} />
              </Card>
              <Card title="🏢 Total Allowance per Bidang">
                <MiniBar items={(fn.payrollByBidang||[]).map(p => ({ label:`${p.bidang} (${p.count} orang)`, value:p.total }))} colorFn={i => `hsl(${200+i*20},65%,50%)`} formatValue={fmtRp} />
              </Card>
            </div>

            <Card title="📊 Status Payroll">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:8 }}>
                {Object.entries(fn.payrollStatusDist||{}).map(([k,v]) => (
                  <div key={k} style={{ padding:12, borderRadius:8, background:'var(--bg-main)', textAlign:'center', border:'1px solid var(--border)' }}>
                    <p style={{ fontSize:'0.65rem', fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase' }}>{k}</p>
                    <p style={{ fontSize:'1.5rem', fontWeight:900, color: k==='PAID'?'#22c55e':k==='TRANSFERRED'?'#8b5cf6':k==='PENDING'?'#f59e0b':'var(--primary)' }}>{v}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ═══ TAB: LEADERBOARD ═══ */}
        {tab === 'leaderboard' && (
          lbLoading && !lbData ? <div style={{ display:'flex', justifyContent:'center', padding:'4rem' }}><RefreshCw size={28} style={{ animation:'spin 1s linear infinite', color:'var(--primary)' }} /></div> :
          lbData ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg-card)', padding:'12px 16px', borderRadius:12, border:'1px solid var(--border)', flexWrap:'wrap', gap:8 }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>Pilih Bulan Leaderboard</h3>
              <input 
                type="month" 
                value={lbMonth} 
                onChange={e => setLbMonth(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.9rem', background: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight:600 }}
              />
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'1rem', opacity: lbLoading ? 0.6 : 1, transition:'opacity 0.2s' }}>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'0.75rem' }}>
              <StatCard label="Intern Aktif" value={lbData.stats?.totalActive} icon="👥" color="var(--primary)" />
              <StatCard label="Rata-rata Skor" value={lbData.stats?.avgComposite} icon="📊" color="#22c55e" sub="Skala 0-100" />
              <StatCard label="Total Kudostars" value={lbData.stats?.totalStarsGiven} icon="⭐" color="#f59e0b" />
            </div>

            {/* Scoring Weights Info */}
            <Card title="📐 Bobot Penilaian Komposit" subtitle="Komponen yang membentuk skor leaderboard">
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {Object.entries(lbData.weights||{}).map(([k,v]) => {
                  const labels = { attendance:'Kehadiran', reports:'Laporan', kudostars:'Kudostars', surveys:'Survei' }
                  const colors = { attendance:'#3b82f6', reports:'#22c55e', kudostars:'#f59e0b', surveys:'#ec4899' }
                  return (
                    <div key={k} style={{ flex:1, minWidth:120, padding:'10px 14px', borderRadius:10, background:`${colors[k]}12`, border:`1.5px solid ${colors[k]}30`, textAlign:'center' }}>
                      <p style={{ fontSize:'1.1rem', fontWeight:900, color:colors[k] }}>{Math.round(v*100)}%</p>
                      <p style={{ fontSize:'0.68rem', fontWeight:700, color:colors[k] }}>{labels[k]||k}</p>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Leaderboard Table */}
            <Card title="🏆 Leaderboard Intern Aktif" subtitle="Peringkat berdasarkan skor komposit multidimensi">
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {(lbData.leaderboard||[]).map((item, i) => {
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${item.rank}`
                  const isTop3 = i < 3
                  return (
                    <div key={item.internId} style={{
                      padding:'12px 16px', borderRadius:12,
                      background: isTop3 ? `linear-gradient(135deg, ${i===0?'#fef3c720':i===1?'#f1f5f920':i===2?'#fff7ed20':'transparent'}, transparent)` : 'var(--bg-main)',
                      border: isTop3 ? `1.5px solid ${i===0?'#f59e0b40':i===1?'#94a3b840':i===2?'#ea580c40':'var(--border)'}` : '1px solid var(--border)',
                      transition:'all 0.2s'
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                        <span style={{ fontSize: isTop3 ? '1.3rem' : '0.85rem', fontWeight:900, width:36, textAlign:'center', color: isTop3 ? '#f59e0b' : 'var(--text-muted)' }}>{medal}</span>
                        <div style={{ flex:1 }}>
                          <p style={{ fontWeight:800, fontSize:'0.9rem' }}>{item.name}</p>
                          <p style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>{item.bidang} · {item.university}</p>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <p style={{ fontWeight:900, fontSize:'1.2rem', color:'var(--primary)' }}>{item.composite}</p>
                          <p style={{ fontSize:'0.62rem', color:'var(--text-muted)' }}>Skor Komposit</p>
                        </div>
                      </div>
                      {/* Breakdown bars */}
                      <div style={{ display:'flex', gap:4, height:6, borderRadius:4, overflow:'hidden', background:'var(--border)' }}>
                        <div style={{ width:`${item.breakdown.attendance}%`, background:'#3b82f6', transition:'width 0.5s' }} title={`Kehadiran: ${item.breakdown.attendance}`} />
                        <div style={{ width:`${item.breakdown.reports}%`, background:'#22c55e', transition:'width 0.5s' }} title={`Laporan: ${item.breakdown.reports}`} />
                        <div style={{ width:`${item.breakdown.kudostars}%`, background:'#f59e0b', transition:'width 0.5s' }} title={`Kudostars: ${item.breakdown.kudostars}`} />
                        <div style={{ width:`${item.breakdown.surveys}%`, background:'#ec4899', transition:'width 0.5s' }} title={`Survei: ${item.breakdown.surveys}`} />
                      </div>
                      <div style={{ display:'flex', gap:10, marginTop:6, flexWrap:'wrap' }}>
                        {[
                          { label:'Kehadiran', val:item.breakdown.attendance, color:'#3b82f6', raw:`${item.raw.attendanceDays}/${item.raw.workingDays} hari` },
                          { label:'Laporan', val:item.breakdown.reports, color:'#22c55e', raw:`${item.raw.reportDays} hari` },
                          { label:'Kudostars', val:item.breakdown.kudostars, color:'#f59e0b', raw:`${item.raw.stars} ⭐` },
                          { label:'Survei', val:item.breakdown.surveys, color:'#ec4899', raw:`${item.raw.surveysCompleted}/${item.raw.totalMandatory}` },
                        ].map(b => (
                          <span key={b.label} style={{ fontSize:'0.58rem', color:b.color, fontWeight:700 }}>
                            {b.label}: {b.val} ({b.raw})
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Top Bidang in Top 10 */}
            {lbData.stats?.topBidang && Object.keys(lbData.stats.topBidang).length > 0 && (
              <Card title="🏢 Bidang Dominan di Top 10">
                <MiniBar items={Object.entries(lbData.stats.topBidang).map(([l,v]) => ({label:l, value:v})).sort((a,b) => b.value-a.value)} colorFn={i => `hsl(${200+i*30},65%,50%)`} />
              </Card>
            )}
            </div>{/* end lbLoading wrapper */}
          </div>
          ) : <div style={{ textAlign:'center', padding:'4rem', color:'var(--text-muted)' }}>Gagal memuat data leaderboard.</div>
        )}

        {/* ═══ TAB: KUDOSTARS ═══ */}
        {tab === 'kudostars' && (
          kudoLoading ? <div style={{ display:'flex', justifyContent:'center', padding:'4rem' }}><RefreshCw size={28} style={{ animation:'spin 1s linear infinite', color:'#f59e0b' }} /></div> :
          kudoData ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'0.75rem' }}>
              <StatCard label="Total Bintang" value={kudoData.totalStars||0} icon="⭐" color="#f59e0b" />
              {Object.entries(kudoData.categoryBreakdown||{}).map(([k,v]) => (
                <StatCard key={k} label={KUDO_CATS[k]||k} value={v} icon={KUDO_CATS[k]?.split(' ')[0]||'⭐'} color="#f59e0b" />
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              {/* Top Receivers */}
              <Card title="🏆 Top Penerima Bintang" subtitle="Intern yang paling banyak mendapat apresiasi">
                {(kudoData.topReceivers||[]).length > 0 ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {kudoData.topReceivers.slice(0,15).map((r, i) => (
                      <div key={r.internId} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', borderRadius:10, background: i<3 ? '#fef3c720' : 'var(--bg-main)', border: i<3 ? '1.5px solid #f59e0b30' : '1px solid var(--border)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontWeight:900, fontSize:'0.85rem', color: i<3 ? '#f59e0b' : 'var(--text-muted)', width:24, textAlign:'center' }}>
                            {i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}
                          </span>
                          <div>
                            <p style={{ fontWeight:700, fontSize:'0.82rem' }}>{r.name}</p>
                            <p style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>{r.bidang}</p>
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          {Object.entries(r.categories||{}).slice(0,3).map(([cat, cnt]) => (
                            <span key={cat} style={{ fontSize:'0.6rem', padding:'2px 6px', borderRadius:99, background:'#fef3c7', color:'#92400e', fontWeight:700 }}>
                              {KUDO_CATS[cat]?.split(' ')[0]} {cnt}
                            </span>
                          ))}
                          <span style={{ fontWeight:900, fontSize:'1rem', color:'#f59e0b', marginLeft:4 }}>⭐ {r.stars}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>Belum ada data</p>}
              </Card>

              {/* Category Distribution */}
              <Card title="📊 Distribusi Kategori" subtitle="Breakdown bintang berdasarkan kategori apresiasi">
                <MiniBar
                  items={Object.entries(kudoData.categoryBreakdown||{}).map(([k,v]) => ({ label: KUDO_CATS[k]||k, value:v })).sort((a,b) => b.value-a.value)}
                  colorFn={i => ['#f59e0b','#8b5cf6','#ec4899','#3b82f6','#22c55e'][i] || '#6b7280'}
                />
              </Card>
            </div>

            {/* Recent Feed */}
            <Card title="📜 Feed Kudostars Terbaru" subtitle="Aktivitas apresiasi peer-to-peer terbaru">
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {(kudoData.recognitions||[]).slice(0,20).map(r => (
                  <div key={r.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', borderRadius:10, background:'var(--bg-main)', border:'1px solid var(--border)' }}>
                    <span style={{ fontSize:'1.2rem', flexShrink:0 }}>{KUDO_CATS[r.category]?.split(' ')[0] || '⭐'}</span>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:'0.82rem' }}>
                        <strong>{r.fromUserName}</strong> → <strong style={{ color:'var(--primary)' }}>{r.toInternName}</strong>
                        <span style={{ fontSize:'0.65rem', color:'var(--text-muted)', marginLeft:8 }}>{r.toInternBidang}</span>
                      </p>
                      <p style={{ fontSize:'0.78rem', color:'var(--text-secondary)', marginTop:2, lineHeight:1.4 }}>"{r.message}"</p>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <span style={{ fontSize:'0.58rem', fontWeight:700, padding:'2px 8px', borderRadius:99, background:'#fef3c7', color:'#92400e' }}>{KUDO_CATS[r.category]?.split(' ').slice(1).join(' ')}</span>
                      <p style={{ fontSize:'0.58rem', color:'var(--text-muted)', marginTop:4 }}>{new Date(r.createdAt).toLocaleDateString('id-ID', { day:'numeric', month:'short' })}</p>
                    </div>
                  </div>
                ))}
                {(!kudoData.recognitions || kudoData.recognitions.length === 0) && (
                  <p style={{ color:'var(--text-muted)', fontSize:'0.78rem', textAlign:'center', padding:'1rem' }}>Belum ada aktivitas Kudostars.</p>
                )}
              </div>
            </Card>
          </div>
          ) : <div style={{ textAlign:'center', padding:'4rem', color:'var(--text-muted)' }}>Gagal memuat data Kudostars.</div>
        )}

        {/* ═══ TAB: ALUMNI TALENT POOL ═══ */}
        {tab === 'alumni' && (
          alumniLoading ? <div style={{ display:'flex', justifyContent:'center', padding:'4rem' }}><RefreshCw size={28} style={{ animation:'spin 1s linear infinite', color:'#6366f1' }} /></div> :
          alumniData ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'0.75rem' }}>
              <StatCard label="Total Alumni" value={alumniData.stats?.totalAlumni||0} icon="🎓" color="#6366f1" />
              <StatCard label="Rata-rata Skor" value={alumniData.stats?.avgScore||'-'} icon="⭐" color="#22c55e" sub="Skala 0-10" />
              <StatCard label="Hasil Pencarian" value={alumniData.total||0} icon="🔍" color="var(--primary)" />
            </div>

            {/* Filters */}
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', padding:'12px 16px', background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)' }}>
              <Search size={14} style={{ color:'var(--text-muted)' }} />
              <input
                type="text" placeholder="Cari nama, universitas, skill..."
                value={alumniSearch} onChange={e => { setAlumniSearch(e.target.value) }}
                style={{ flex:1, minWidth:200, padding:'6px 12px', borderRadius:8, border:'1px solid var(--border)', fontSize:'0.8rem', background:'transparent' }}
              />
              <select value={alumniBidang} onChange={e => setAlumniBidang(e.target.value)}
                style={{ padding:'6px 10px', borderRadius:8, border:'1px solid var(--border)', fontSize:'0.75rem', fontWeight:700, background:'transparent', cursor:'pointer' }}>
                <option value="">Semua Bidang</option>
                {(alumniData.stats?.bidangList||[]).map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={alumniSort} onChange={e => setAlumniSort(e.target.value)}
                style={{ padding:'6px 10px', borderRadius:8, border:'1px solid var(--border)', fontSize:'0.75rem', fontWeight:700, background:'transparent', cursor:'pointer' }}>
                <option value="score">Urutkan: Skor Tertinggi</option>
                <option value="date">Urutkan: Terbaru</option>
                <option value="name">Urutkan: Nama A-Z</option>
              </select>
            </div>

            {/* Top Skills Cloud */}
            {alumniData.stats?.topSkills?.length > 0 && (
              <Card title="🔧 Top Skills Alumni" subtitle="Keterampilan yang paling sering muncul dari laporan alumni">
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {alumniData.stats.topSkills.map((s, i) => (
                    <span key={s.skill} style={{
                      padding:'4px 12px', borderRadius:99, fontSize: i < 3 ? '0.82rem' : '0.72rem',
                      fontWeight: i < 3 ? 800 : 600,
                      background: i < 3 ? '#6366f118' : 'var(--bg-main)',
                      color: i < 3 ? '#6366f1' : 'var(--text-secondary)',
                      border: `1px solid ${i < 3 ? '#6366f130' : 'var(--border)'}`,
                      cursor:'pointer'
                    }} onClick={() => setAlumniSearch(s.skill)}>
                      {s.skill} ({s.count})
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Alumni Cards */}
            <Card title={`🎓 Daftar Alumni (${alumniData.total || 0})`} subtitle="Klik skill tag untuk mencari alumni dengan keahlian serupa">
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {(alumniData.alumni||[]).map(a => (
                  <div key={a.id} style={{
                    padding:'14px 16px', borderRadius:12, background:'var(--bg-main)',
                    border: a.evaluation?.score >= 8 ? '1.5px solid #22c55e40' : '1px solid var(--border)',
                    transition:'all 0.2s'
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8, flexWrap:'wrap', gap:8 }}>
                      <div>
                        <p style={{ fontWeight:800, fontSize:'0.92rem' }}>{a.name}</p>
                        <p style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>
                          {a.university} · {a.major} · {a.jenjang}
                        </p>
                        <p style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:2 }}>
                          📌 {a.bidang} · 👤 {a.supervisorName || '-'}
                          {a.durationMonths && <> · 📅 {a.durationMonths} bulan</>}
                        </p>
                      </div>
                      {a.evaluation ? (
                        <div style={{ textAlign:'right' }}>
                          <p style={{ fontWeight:900, fontSize:'1.1rem', color: a.evaluation.score >= 8 ? '#22c55e' : a.evaluation.score >= 6 ? '#f59e0b' : '#ef4444' }}>
                            {a.evaluation.score}/10
                          </p>
                          <span style={{
                            fontSize:'0.62rem', fontWeight:800, padding:'2px 8px', borderRadius:99,
                            background: a.evaluation.grade?.startsWith('A') ? '#22c55e18' : '#f59e0b18',
                            color: a.evaluation.grade?.startsWith('A') ? '#22c55e' : '#f59e0b'
                          }}>
                            Grade {a.evaluation.grade}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize:'0.68rem', color:'var(--text-muted)', fontStyle:'italic' }}>Belum dievaluasi</span>
                      )}
                    </div>
                    {/* Skills */}
                    {a.topSkills?.length > 0 && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:4 }}>
                        {a.topSkills.map(s => (
                          <span key={s.skill} onClick={() => setAlumniSearch(s.skill)}
                            style={{ padding:'2px 8px', borderRadius:99, fontSize:'0.62rem', fontWeight:700, background:'#6366f112', color:'#6366f1', border:'1px solid #6366f120', cursor:'pointer' }}>
                            {s.skill} ×{s.count}
                          </span>
                        ))}
                        {a.skillCount > 8 && <span style={{ fontSize:'0.6rem', color:'var(--text-muted)' }}>+{a.skillCount - 8} lainnya</span>}
                      </div>
                    )}
                    {/* Contact */}
                    {(a.email || a.phone) && (
                      <div style={{ display:'flex', gap:12, marginTop:6, fontSize:'0.65rem', color:'var(--text-muted)' }}>
                        {a.email && <span>📧 {a.email}</span>}
                        {a.phone && <span>📱 {a.phone}</span>}
                      </div>
                    )}
                  </div>
                ))}
                {(!alumniData.alumni || alumniData.alumni.length === 0) && (
                  <p style={{ color:'var(--text-muted)', fontSize:'0.82rem', textAlign:'center', padding:'2rem' }}>
                    {alumniSearch ? `Tidak ditemukan alumni dengan kata kunci "${alumniSearch}"` : 'Belum ada data alumni.'}
                  </p>
                )}
              </div>
            </Card>

            {/* Distribution Charts */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              <Card title="🏢 Alumni per Bidang">
                <MiniBar items={Object.entries(alumniData.stats?.byBidang||{}).map(([l,v]) => ({label:l, value:v})).sort((a,b) => b.value-a.value)} colorFn={i => `hsl(${240+i*20},55%,55%)`} />
              </Card>
              <Card title="🎓 Alumni per Jenjang">
                <MiniBar items={Object.entries(alumniData.stats?.byJenjang||{}).map(([l,v]) => ({label:l, value:v})).sort((a,b) => b.value-a.value)} colorFn={() => '#6366f1'} />
              </Card>
            </div>
          </div>
          ) : <div style={{ textAlign:'center', padding:'4rem', color:'var(--text-muted)' }}>Gagal memuat data alumni.</div>
        )}

        {/* ═══ TAB: WORKFORCE PLANNING ═══ */}
        {tab === 'workforce' && (
          wfLoading && !wfData
            ? <div style={{ display:'flex', justifyContent:'center', padding:'4rem' }}><RefreshCw size={28} style={{ animation:'spin 1s linear infinite', color:'var(--primary)' }} /></div>
            : wfData ? (() => {
              const { departments: depts, summary: sm } = wfData

              const saveQuota = async (bidang) => {
                const q = parseInt(wfEditVal)
                if (isNaN(q) || q < 0) return
                setWfSaving(true)
                try {
                  await fetch('/api/admin/workforce', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: bidang, quota: q })
                  })
                  // Refetch workforce data
                  const res = await fetch('/api/admin/workforce')
                  const d = await res.json()
                  setWfData(d)
                } catch(e) { console.error(e) }
                setWfSaving(false)
                setWfEditing(null)
                setWfEditVal('')
              }

              const fmtDate = (d) => {
                if (!d) return '-'
                const [y,m,day] = d.split('-')
                const MN = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
                return `${parseInt(day)} ${MN[parseInt(m)]} ${y}`
              }

              return (
                <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

                  {/* ── KPI Summary Cards ── */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'0.75rem' }}>
                    {[
                      { label:'Total Bidang', value: sm.totalDepts, icon:'🏢', color:'var(--primary)' },
                      { label:'Over-Capacity 🔴', value: sm.overCapacityCount, icon:'⚠️', color:'#ef4444', sub:'Butuh perhatian' },
                      { label:'Aman / Ada Slot ✅', value: sm.safeCount, icon:'✅', color:'#22c55e', sub:'Masih tersedia' },
                      { label:'Belum Set Quota', value: sm.noQuotaCount, icon:'📝', color:'#f59e0b', sub:'Perlu dikonfigurasi' },
                      { label:'Total Slot Tersedia', value: sm.totalSlotTersedia, icon:'🪑', color:'#6366f1', sub:'Dari semua bidang' },
                    ].map(k => (
                      <div key={k.label} style={{ background:'var(--bg-card)', borderRadius:12, padding:'1rem', borderTop:`3px solid ${k.color}`, boxShadow:'0 2px 8px rgba(0,0,0,0.08)' }}>
                        <p style={{ fontSize:'0.62rem', fontWeight:800, color:k.color, letterSpacing:'0.05em', textTransform:'uppercase' }}>{k.icon} {k.label}</p>
                        <p style={{ fontSize:'1.8rem', fontWeight:900, color:k.color, lineHeight:1.1, margin:'4px 0 2px' }}>{k.value ?? '-'}</p>
                        {k.sub && <p style={{ fontSize:'0.62rem', color:'var(--text-muted)' }}>{k.sub}</p>}
                      </div>
                    ))}
                  </div>

                  {/* ── Capacity Bar Chart ── */}
                  <Card title="📊 Kapasitas per Bidang" subtitle="Bar menunjukkan intern aktif vs kuota. Garis merah = batas kuota.">
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      {/* Legend */}
                      <div style={{ display:'flex', gap:16, marginBottom:4 }}>
                        {[['#22c55e','Aktif (Aman)'],['#f59e0b','Hampir Penuh'],['#ef4444','Over-Capacity'],['rgba(239,68,68,0.7)','Garis Kuota']].map(([c,l]) => (
                          <div key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.65rem', color:'var(--text-muted)', fontWeight:700 }}>
                            <div style={{ width:12, height: l.includes('Garis') ? 2 : 12, borderRadius: l.includes('Garis') ? 0 : 3, background:c, border: l.includes('Garis') ? `2px dashed ${c}` : 'none' }} />{l}
                          </div>
                        ))}
                      </div>

                      {depts.map(dept => {
                        const hasQuota = dept.quota > 0
                        const pct = hasQuota ? Math.min((dept.active / dept.quota) * 100, 120) : 0
                        const barColor = dept.overCapacity ? '#ef4444' : dept.almostFull ? '#f59e0b' : '#22c55e'
                        const isExp = wfExpanded === dept.bidang

                        return (
                          <div key={dept.bidang}>
                            <div
                              style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'8px 10px', borderRadius:8, background: isExp ? 'var(--bg-main)' : 'transparent', transition:'background 0.15s' }}
                              onClick={() => setWfExpanded(isExp ? null : dept.bidang)}
                            >
                              {/* Bidang name */}
                              <span style={{ fontSize:'0.78rem', fontWeight:800, width:160, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {dept.overCapacity ? '🔴' : dept.almostFull ? '🟡' : dept.quota > 0 ? '🟢' : '⬜'} {dept.bidang}
                              </span>

                              {/* Bar */}
                              <div style={{ flex:1, height:20, background:'var(--bg-main)', borderRadius:6, overflow:'visible', position:'relative', border:'1px solid var(--border)' }}>
                                <div style={{
                                  width:`${Math.min(pct, 100)}%`,
                                  height:'100%',
                                  background: barColor,
                                  borderRadius:6,
                                  transition:'width 0.6s ease',
                                  opacity: hasQuota ? 1 : 0.3
                                }} />
                                {/* Overflow bar (over-capacity portion) */}
                                {dept.overCapacity && hasQuota && (
                                  <div style={{ position:'absolute', right:0, top:0, width:`${Math.min((dept.active - dept.quota) / dept.quota * 100, 20)}%`, height:'100%', background:'#ef444440', borderLeft:'2px solid #ef4444', borderRadius:'0 6px 6px 0' }} />
                                )}
                                {/* Quota line */}
                                {hasQuota && (
                                  <div style={{ position:'absolute', left:'100%', top:-2, width:2, height:24, background:'#ef4444', borderRadius:2, zIndex:2 }} title={`Kuota: ${dept.quota}`} />
                                )}
                              </div>

                              {/* Numbers */}
                              <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0, minWidth:120, justifyContent:'flex-end' }}>
                                <span style={{ fontSize:'0.75rem', fontWeight:900, color:barColor }}>{dept.active}</span>
                                <span style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>/</span>
                                <span style={{ fontSize:'0.75rem', fontWeight:700, color: hasQuota ? 'var(--text-primary)' : 'var(--text-muted)' }}>{hasQuota ? dept.quota : '—'}</span>
                                {hasQuota && dept.slotTersedia !== null && (
                                  <span style={{ fontSize:'0.65rem', fontWeight:800, padding:'2px 8px', borderRadius:99, background: dept.overCapacity ? '#ef444420' : '#22c55e20', color: dept.overCapacity ? '#ef4444' : '#22c55e', marginLeft:4 }}>
                                    {dept.overCapacity ? `+${dept.active - dept.quota} OVER` : `${dept.slotTersedia} slot`}
                                  </span>
                                )}
                                <ChevronDown size={14} style={{ color:'var(--text-muted)', transform: isExp ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', marginLeft:4 }} />
                              </div>
                            </div>

                            {/* ── Expanded Detail ── */}
                            {isExp && (
                              <div style={{ margin:'0 10px 8px 10px', padding:12, borderRadius:10, background:'var(--bg-main)', border:'1px solid var(--border)', animation:'slideUp 0.2s ease' }}>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

                                  {/* Keluar */}
                                  <div>
                                    <p style={{ fontSize:'0.68rem', fontWeight:900, color:'#ef4444', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                                      📤 AKAN KELUAR ({dept.keluar.length})
                                    </p>
                                    {dept.keluar.length > 0 ? (
                                      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                                        {dept.keluar.map((k,i) => (
                                          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 8px', borderRadius:7, background:'var(--bg-card)', border:'1px solid #ef444430' }}>
                                            <span style={{ fontSize:'0.72rem', fontWeight:700 }}>{k.name}</span>
                                            <span style={{ fontSize:'0.65rem', color:'#ef4444', fontWeight:800, whiteSpace:'nowrap', marginLeft:8 }}>📅 {fmtDate(k.periodEnd)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : <p style={{ fontSize:'0.68rem', color:'var(--text-muted)', fontStyle:'italic' }}>Tidak ada yang keluar dalam 60 hari</p>}
                                  </div>

                                  {/* Masuk */}
                                  <div>
                                    <p style={{ fontSize:'0.68rem', fontWeight:900, color:'#22c55e', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                                      📥 AKAN MASUK ({dept.masuk.length})
                                    </p>
                                    {dept.masuk.length > 0 ? (
                                      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                                        {dept.masuk.map((m,i) => (
                                          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 8px', borderRadius:7, background:'var(--bg-card)', border:'1px solid #22c55e30' }}>
                                            <span style={{ fontSize:'0.72rem', fontWeight:700 }}>{m.name}</span>
                                            <span style={{ fontSize:'0.65rem', color:'#22c55e', fontWeight:800, whiteSpace:'nowrap', marginLeft:8 }}>📅 {fmtDate(m.periodStart)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : <p style={{ fontSize:'0.68rem', color:'var(--text-muted)', fontStyle:'italic' }}>Tidak ada yang pending masuk</p>}
                                  </div>

                                </div>

                                {/* Proyeksi bulan ini */}
                                <div style={{ marginTop:10, padding:'8px 12px', borderRadius:8, background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                  <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontWeight:700 }}>📊 Proyeksi Bulan Ini:</span>
                                  <span style={{ fontSize:'0.85rem', fontWeight:900, color: dept.proyeksi > dept.quota && dept.quota > 0 ? '#ef4444' : '#22c55e' }}>
                                    {dept.proyeksi} orang {dept.quota > 0 ? `(dari kuota ${dept.quota})` : ''}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </Card>

                  {/* ── Manage Quota Table ── */}
                  <Card title="⚙️ Manage Kuota per Bidang" subtitle="Klik Edit untuk mengatur kapasitas maksimal intern per bidang">
                    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                      {/* Header */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 120px 120px', gap:8, padding:'6px 12px', fontSize:'0.62rem', fontWeight:900, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid var(--border)', marginBottom:4 }}>
                        <span>Bidang</span>
                        <span style={{ textAlign:'center' }}>Kuota</span>
                        <span style={{ textAlign:'center' }}>Aktif</span>
                        <span style={{ textAlign:'center' }}>Slot / Status</span>
                        <span style={{ textAlign:'right' }}>Action</span>
                      </div>

                      {depts.map((dept, idx) => (
                        <div key={dept.bidang} style={{
                          display:'grid', gridTemplateColumns:'1fr 80px 80px 120px 120px', gap:8, alignItems:'center',
                          padding:'9px 12px', borderRadius:8, fontSize:'0.78rem',
                          background: idx % 2 === 0 ? 'var(--bg-main)' : 'transparent',
                          border: dept.overCapacity ? '1px solid #ef444330' : '1px solid transparent',
                          transition:'background 0.15s'
                        }}>
                          {/* Bidang name */}
                          <span style={{ fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {dept.bidang}
                          </span>

                          {/* Quota — editable inline */}
                          <div style={{ textAlign:'center' }}>
                            {wfEditing === dept.bidang ? (
                              <input
                                type="number" min="0" value={wfEditVal}
                                onChange={e => setWfEditVal(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveQuota(dept.bidang); if (e.key === 'Escape') { setWfEditing(null); setWfEditVal('') } }}
                                autoFocus
                                style={{ width:56, padding:'3px 6px', borderRadius:6, border:'2px solid var(--primary)', background:'var(--bg-card)', color:'var(--text-primary)', fontSize:'0.78rem', fontWeight:800, textAlign:'center' }}
                              />
                            ) : (
                              <span style={{ fontWeight:900, color: dept.quota > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                                {dept.quota > 0 ? dept.quota : '—'}
                              </span>
                            )}
                          </div>

                          {/* Active */}
                          <span style={{ textAlign:'center', fontWeight:800, color: dept.overCapacity ? '#ef4444' : 'var(--text-primary)' }}>{dept.active}</span>

                          {/* Slot / Status */}
                          <div style={{ textAlign:'center' }}>
                            {dept.quota === 0
                              ? <span style={{ fontSize:'0.65rem', color:'#f59e0b', fontWeight:700, background:'#f59e0b15', padding:'2px 8px', borderRadius:99 }}>Belum Set</span>
                              : dept.overCapacity
                              ? <span style={{ fontSize:'0.65rem', color:'#ef4444', fontWeight:800, background:'#ef444415', padding:'2px 8px', borderRadius:99 }}>+{dept.active - dept.quota} Over</span>
                              : dept.almostFull
                              ? <span style={{ fontSize:'0.65rem', color:'#f59e0b', fontWeight:800, background:'#f59e0b15', padding:'2px 8px', borderRadius:99 }}>{dept.slotTersedia} Slot</span>
                              : <span style={{ fontSize:'0.65rem', color:'#22c55e', fontWeight:800, background:'#22c55e15', padding:'2px 8px', borderRadius:99 }}>{dept.slotTersedia} Slot ✅</span>
                            }
                          </div>

                          {/* Action */}
                          <div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                            {wfEditing === dept.bidang ? (
                              <>
                                <button
                                  onClick={() => saveQuota(dept.bidang)}
                                  disabled={wfSaving}
                                  style={{ padding:'4px 10px', borderRadius:6, border:'none', background:'var(--primary)', color:'#fff', fontSize:'0.65rem', fontWeight:800, cursor:'pointer', opacity: wfSaving ? 0.6 : 1 }}
                                >Simpan</button>
                                <button
                                  onClick={() => { setWfEditing(null); setWfEditVal('') }}
                                  style={{ padding:'4px 10px', borderRadius:6, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', fontSize:'0.65rem', fontWeight:700, cursor:'pointer' }}
                                >Batal</button>
                              </>
                            ) : (
                              <button
                                onClick={() => { setWfEditing(dept.bidang); setWfEditVal(String(dept.quota || '')) }}
                                style={{ padding:'4px 12px', borderRadius:6, border:'1px solid var(--primary)', background:'transparent', color:'var(--primary)', fontSize:'0.65rem', fontWeight:800, cursor:'pointer', transition:'all 0.15s' }}
                              >✏️ Edit</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* ── Info Box ── */}
                  <div style={{ padding:'12px 16px', borderRadius:10, background:'var(--bg-card)', border:'1px dashed var(--border)', fontSize:'0.68rem', color:'var(--text-muted)' }}>
                    💡 <b>Cara Membaca:</b> <b>Aktif</b> = intern yang sedang berjalan. <b>Slot</b> = sisa kapasitas (Kuota - Aktif). <b>Akan Keluar</b> = intern yang <i>periodEnd</i>-nya dalam 60 hari ke depan. <b>Akan Masuk</b> = intern berstatus PENDING. Proyeksi dihitung dari data aktual bidang yang sudah ada.
                  </div>

                </div>
              )
            })() : <div style={{ textAlign:'center', padding:'4rem', color:'var(--text-muted)' }}>Gagal memuat data workforce.</div>
        )}

        {/* ═══ ENHANCED WELLBEING: Mood Heatmap (injected into existing wellbeing tab) ═══ */}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )
}

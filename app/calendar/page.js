'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, X, Clock, Users, Star, Wallet, RefreshCw, Palmtree } from 'lucide-react'
import { INDONESIA_HOLIDAYS_2026 } from '@/lib/constants'

const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const DAYS_ID   = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']

const EVT_TYPES = {
  INTERN:     { color:'#6366f1', bg:'#eef2ff', label:'Periode Intern',    icon:'👤' },
  EVALUATION: { color:'#f59e0b', bg:'#fef3c7', label:'Evaluasi',          icon:'⭐' },
  PAYROLL:    { color:'#10b981', bg:'#dcfce7', label:'Payroll',           icon:'💰' },
  EVENT:      { color:'#8b5cf6', bg:'#ede9fe', label:'Event',             icon:'📅' },
  ONBOARDING: { color:'#ef4444', bg:'#fee2e2', label:'Onboarding Review', icon:'📋' },
  HOLIDAY:    { color:'#dc2626', bg:'#fef2f2', label:'Hari Libur',        icon:'🌴' },
}

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
function getFirstDayOfMonth(y, m) { return new Date(y, m, 1).getDay() }

export default function CalendarPage() {
  const now  = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [events,     setEvts]    = useState([])
  const [loading,    setLoading] = useState(true)
  const [selected,   setSelected]= useState(null) // selected date string
  const [dayEvents,  setDayEvts] = useState([])
  const [filters,    setFilters] = useState({ INTERN:true, EVALUATION:true, PAYROLL:true, EVENT:true, ONBOARDING:true, HOLIDAY:true })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [internR, evalR, payR, evtR, obR] = await Promise.all([
        fetch('/api/interns?limit=200').then(r=>r.json()),
        fetch('/api/evaluations').then(r=>r.json()),
        fetch('/api/payroll').then(r=>r.json()),
        fetch('/api/events').then(r=>r.json()),
        fetch('/api/onboarding/manage').then(r=>r.json()),
      ])

      const evts = []

      // Intern active periods
      ;(internR.data || []).filter(i => i.status === 'ACTIVE' && i.periodEnd).forEach(i => {
        if (i.periodEnd) evts.push({ date: i.periodEnd, type: 'INTERN', title: `Berakhir: ${i.name}`, detail: `${i.university} · ${i.jenjang}`, id: 'i_' + i.id })
        if (i.periodStart) evts.push({ date: i.periodStart, type: 'INTERN', title: `Mulai: ${i.name}`, detail: `${i.university} · ${i.jenjang}`, id: 'is_' + i.id })
      })

      // Evaluations
      ;(evalR.evaluations || []).forEach(e => {
        const d = (e.period || '').slice(0, 7)
        if (d) evts.push({ date: d + '-01', type: 'EVALUATION', title: `Evaluasi: ${e.internName || e.internId}`, detail: `Skor: ${e.finalScore} (${e.grade})`, id: 'ev_' + e.id })
      })

      // Payroll
      ;(payR.payrolls || payR || []).forEach(p => {
        if (p.bulan && p.tahun) {
          const dateStr = `${p.tahun}-${String(p.bulan).padStart(2,'0')}-01`
          evts.push({ date: dateStr, type: 'PAYROLL', title: `Payroll ${MONTHS_ID[(p.bulan||1)-1]} ${p.tahun}`, detail: `Status: ${p.status} · ${p.hariHadir||0} hari`, id: 'pay_' + p.id })
        }
      })

      // Events
      ;(Array.isArray(evtR)?evtR:evtR.list||[]).forEach(e => {
        if (e.date) evts.push({ date: e.date, type: 'EVENT', title: e.title, detail: e.description || e.type, id: 'ev_' + e.id })
      })

      // Onboarding pending
      ;((obR.list||obR)||[]).filter(o => o.status === 'PENDING').forEach(o => {
        if (o.submittedAt) evts.push({ date: o.submittedAt.slice(0,10), type: 'ONBOARDING', title: `Review: ${o.applicant?.name}`, detail: 'Menunggu persetujuan', id: 'ob_' + o.id })
      })

      // National Holidays
      INDONESIA_HOLIDAYS_2026.forEach(h => {
        evts.push({ date: h, type: 'HOLIDAY', title: 'Hari Libur Nasional', detail: 'Kantor Libur / Off Day', id: 'h_' + h })
      })

      setEvts(evts)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y=>y-1) } else setMonth(m=>m-1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y=>y+1) } else setMonth(m=>m+1) }
  const goToday   = () => { setYear(now.getFullYear()); setMonth(now.getMonth()) }

  const daysInMonth  = getDaysInMonth(year, month)
  const firstDay     = getFirstDayOfMonth(year, month)
  const todayStr     = now.toISOString().split('T')[0]

  const getDateStr = day => `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  const getEvtsForDay = day => {
    const ds = getDateStr(day)
    return events.filter(e => e.date === ds && filters[e.type])
  }

  const handleDayClick = day => {
    const ds = getDateStr(day)
    setSelected(ds)
    setDayEvts(events.filter(e => e.date === ds && filters[e.type]))
  }

  // Build grid cells
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="container" style={{paddingBottom:'3rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.5rem',flexWrap:'wrap',gap:'0.75rem'}}>
        <div>
          <h1 className="title" style={{display:'flex',alignItems:'center',gap:8}}><CalendarDays size={22} strokeWidth={2}/> Kalender Kegiatan</h1>
          <p className="subtitle">Semua jadwal intern, evaluasi, payroll, dan event dalam satu tampilan.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw size={14} strokeWidth={2} style={{animation:loading?'spin 1s linear infinite':'none'}}/> Refresh
        </button>
      </div>

      {/* Filter Legend */}
      <div className="card" style={{padding:'0.875rem 1.25rem',marginBottom:'1rem'}}>
        <div style={{display:'flex',gap:'0.625rem',flexWrap:'wrap',alignItems:'center'}}>
          <span style={{fontSize:'0.75rem',fontWeight:700,color:'var(--text-muted)'}}>Filter:</span>
          {Object.entries(EVT_TYPES).map(([key,t])=>(
            <button key={key} onClick={()=>setFilters(p=>({...p,[key]:!p[key]}))}
              style={{padding:'4px 10px',borderRadius:999,fontSize:'0.72rem',fontWeight:700,border:`2px solid ${filters[key]?t.color:'var(--border)'}`,background:filters[key]?t.bg:'transparent',color:filters[key]?t.color:'var(--text-muted)',cursor:'pointer',transition:'all 0.15s',display:'flex',alignItems:'center',gap:4}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:selected?'1fr 340px':'1fr',gap:'1.25rem',alignItems:'start'}}>
        {/* Calendar Grid */}
        <div className="card" style={{padding:'1.25rem'}}>
          {/* Month nav */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
            <button onClick={prevMonth} className="btn btn-secondary btn-sm btn-icon"><ChevronLeft size={16} strokeWidth={2}/></button>
            <div style={{textAlign:'center'}}>
              <p style={{fontWeight:800,fontSize:'1.1rem'}}>{MONTHS_ID[month]} {year}</p>
              <button onClick={goToday} style={{fontSize:'0.7rem',color:'var(--primary)',background:'none',border:'none',cursor:'pointer',fontWeight:600}}>Hari Ini</button>
            </div>
            <button onClick={nextMonth} className="btn btn-secondary btn-sm btn-icon"><ChevronRight size={16} strokeWidth={2}/></button>
          </div>

          {/* Day headers */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
            {DAYS_ID.map(d=><div key={d} style={{textAlign:'center',fontSize:'0.7rem',fontWeight:700,color:'var(--text-muted)',padding:'0.375rem 0'}}>{d}</div>)}
          </div>

          {/* Day cells */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
            {cells.map((day, i) => {
              if (!day) return <div key={i}/>
              const ds      = getDateStr(day)
              const dayEvts = getEvtsForDay(day)
              const isToday = ds === todayStr
              const isSel   = ds === selected
              const hasMiss = dayEvts.length > 3
              return (
                <div key={i} onClick={()=>handleDayClick(day)} style={{
                  minHeight:70,padding:'0.375rem 0.25rem',borderRadius:'var(--radius-md)',border:`1.5px solid ${isSel?'var(--primary)':isToday?'var(--secondary)':'var(--border)'}`,
                  background:isSel?'var(--primary-light)':isToday?'var(--secondary-light)':'var(--bg-card)',cursor:'pointer',transition:'all 0.15s'
                }}
                onMouseEnter={e=>!isSel&&(e.currentTarget.style.background='var(--bg-main)')}
                onMouseLeave={e=>!isSel&&(e.currentTarget.style.background=isToday?'var(--secondary-light)':'var(--bg-card)')}>
                  <p style={{fontWeight:isToday||isSel?800:400,fontSize:'0.8rem',color:isSel?'var(--primary)':isToday?'var(--secondary)':'var(--text-primary)',marginBottom:3,textAlign:'center'}}>{day}</p>
                  <div style={{display:'flex',flexDirection:'column',gap:1}}>
                    {dayEvts.slice(0,3).map((e,ei)=>{
                      const t = EVT_TYPES[e.type]||EVT_TYPES.EVENT
                      return <div key={ei} style={{fontSize:'0.6rem',fontWeight:600,color:t.color,background:t.bg,borderRadius:3,padding:'1px 4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.title}</div>
                    })}
                    {dayEvts.length>3&&<div style={{fontSize:'0.6rem',color:'var(--text-muted)',textAlign:'center'}}>+{dayEvts.length-3} lagi</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Day Detail Panel */}
        {selected&&(
          <div className="card" style={{position:'sticky',top:80}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
              <p style={{fontWeight:800,fontSize:'0.95rem'}}>{new Date(selected+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
              <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={16} strokeWidth={2}/></button>
            </div>
            {dayEvents.length===0
              ? <div style={{textAlign:'center',padding:'2rem',color:'var(--text-muted)'}}>
                  <CalendarDays size={32} style={{margin:'0 auto 0.75rem',opacity:0.3}} strokeWidth={1.5}/>
                  <p style={{fontSize:'0.82rem'}}>Tidak ada kegiatan</p>
                </div>
              : <div style={{display:'flex',flexDirection:'column',gap:'0.625rem'}}>
                  {dayEvents.map((e,i)=>{
                    const t = EVT_TYPES[e.type]||EVT_TYPES.EVENT
                    return (
                      <div key={i} style={{padding:'0.75rem',background:t.bg,borderRadius:'var(--radius-md)',borderLeft:`3px solid ${t.color}`}}>
                        <p style={{fontWeight:700,fontSize:'0.82rem',color:t.color}}>{t.icon} {e.title}</p>
                        {e.detail&&<p style={{fontSize:'0.72rem',color:'var(--text-secondary)',marginTop:4}}>{e.detail}</p>}
                        <span style={{fontSize:'0.65rem',padding:'2px 7px',borderRadius:999,background:t.color+'20',color:t.color,fontWeight:700,marginTop:6,display:'inline-block'}}>{t.label}</span>
                      </div>
                    )
                  })}
                </div>
            }
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to{transform:rotate(360deg)} }
        @media(max-width:700px){ .cal-grid{ grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}

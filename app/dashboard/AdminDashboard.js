'use client'
import React, { useState, useCallback, useRef } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import {
  Users, Clock, FileText, TrendingUp, CheckCircle2, AlertCircle,
  BarChart3, CalendarDays, Bell, Plus, Edit, Trash, X, Pin,
  ArrowRight, Loader2, RefreshCw, Megaphone, ListChecks,
  Zap, Activity, GraduationCap, Wallet, BookOpen, Settings,
  Star, MessageSquare, Camera, MapPin,
  Award, Building, Shield
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import ExcelImportWidget from './ExcelImportWidget'

/* ── Helpers ─────────────────────────────────────── */
const timeAgo = ts => {
  const d = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (d < 60)   return `${d}d lalu`
  if (d < 3600) return `${Math.floor(d/60)}m lalu`
  if (d < 86400) return `${Math.floor(d/3600)}j lalu`
  return `${Math.floor(d/86400)} hari lalu`
}
const fmtDate = dt => dt ? new Date(dt).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : '-'
const idr = v => new Intl.NumberFormat('id-ID').format(v||0)

const ACTION_META = {
  CREATE_INTERN:      { label:'Intern baru ditambahkan', icon:'👤', color:'var(--primary)' },
  BATCH_IMPORT_INTERNS:{ label:'Import batch intern', icon:'📥', color:'var(--primary)' },
  BATCH_UPSERT_INTERNS:{ label:'Update masal intern', icon:'⚡', color:'var(--secondary)' },
  UPDATE_INTERN:      { label:'Data intern diperbarui', icon:'✏️', color:'var(--warning)' },
  SOFT_DELETE_INTERN: { label:'Intern dihapus', icon:'🗑️', color:'var(--danger)' },
  BULK_STATUS_UPDATE: { label:'Status massal diubah', icon:'🔄', color:'var(--warning)' },
  PAYROLL_PROCESS:    { label:'Payroll diproses', icon:'💰', color:'var(--secondary)' },
  UPDATE_ALLOWANCE_RATE:{ label:'Tarif allowance diubah', icon:'⚙️', color:'var(--warning)' },
}

const PRIO_STYLE = {
  URGENT: { bg:'#fee2e2', color:'#991b1b', label:'URGENT' },
  HIGH:   { bg:'#fef3c7', color:'#92400e', label:'PRIORITAS' },
  MEDIUM: { bg:'#ede9fe', color:'#5b21b6', label:'SEDANG' },
  LOW:    { bg:'#f0fdf4', color:'#166534', label:'RENDAH' },
  INFO:   { bg:'var(--primary-light)', color:'var(--primary)', label:'INFO' },
  WARNING:{ bg:'var(--warning-light)',  color:'#92400e', label:'PERINGATAN' },
}
const EVT_COLORS = {
  ORIENTATION:'var(--primary)', EVALUATION:'var(--warning)',
  CLOSING:'var(--danger)', GENERAL:'var(--secondary)', TRAINING:'#8b5cf6'
}

/* ── Stat Card ───────────────────────────────────── */
function StatCard({icon,label,value,badge,badgeOk=true,color,bg,loading}) {
  return (
    <div className="stat-card" style={{cursor:'default'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'var(--sp-3)'}}>
        <div className="stat-icon-wrap" style={{background:bg,color}}>{icon}</div>
        {badge!=null&&<span className={`badge ${badgeOk?'badge-success':'badge-warning'}`}>{badge}</span>}
      </div>
      {loading
        ? <div style={{height:32,width:'60%',background:'var(--border)',borderRadius:4,animation:'pulse 1.4s ease-in-out infinite'}}/>
        : <div className="stat-value">{value}</div>}
      <div className="stat-label">{label}</div>
    </div>
  )
}

/* ── Bar Chart (interactive hover) ──────────────── */
function AttendanceChart({data,loading}) {
  const [hovered,setHovered] = useState(null)
  const max = Math.max(...(data||[]).map(d=>d.count), 1)
  return (
    <div className="card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
        <h3 style={{fontWeight:700,fontSize:'0.95rem',display:'flex',alignItems:'center',gap:6}}>
          <BarChart3 size={16} strokeWidth={2} style={{color:'var(--primary)'}}/>
          Kehadiran 7 Hari Terakhir
        </h3>
        {hovered&&<span style={{fontSize:'0.78rem',fontWeight:700,color:'var(--primary)'}}>{hovered.day}: {hovered.count} hadir</span>}
      </div>
      <div style={{display:'flex',alignItems:'flex-end',gap:6,height:120}}>
        {loading
          ? [...Array(7)].map((_,i)=><div key={i} style={{flex:1,height:`${30+i*10}%`,background:'var(--border)',borderRadius:'4px 4px 0 0',animation:'pulse 1.4s ease-in-out infinite'}}/>)
          : (data||[]).map((d,i)=>(
            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'flex-end',alignItems:'center',position:'relative'}}
              onMouseEnter={()=>setHovered(d)} onMouseLeave={()=>setHovered(null)}>
              <div style={{
                width:'100%', height:`${d.count===0?4:Math.max(8,(d.count/max)*100)}%`,
                background:hovered?.day===d.day?'var(--primary)':'var(--primary-light)',
                borderRadius:'4px 4px 0 0',
                transition:'all 0.2s', cursor:'pointer',
                boxShadow:hovered?.day===d.day?'0 -4px 12px rgba(99,102,241,0.3)':''
              }}/>
            </div>
          ))
        }
      </div>
      <div style={{display:'flex',gap:6,marginTop:8,paddingTop:8,borderTop:'1px solid var(--border)'}}>
        {(data||[]).map(d=>(
          <span key={d.day} style={{flex:1,textAlign:'center',fontSize:'0.65rem',color:hovered?.day===d.day?'var(--primary)':'var(--text-muted)',fontWeight:hovered?.day===d.day?700:400,transition:'all 0.15s'}}>{d.day}</span>
        ))}
      </div>
    </div>
  )
}

/* ── Photo Lightbox (inline, no external lib) ─────── */
function PhotoLightbox({ src, name, type, onClose }) {
  const [imgError, setImgError] = useState(false)
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1rem', cursor: 'zoom-out'
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 800, fontSize: '1rem', marginBottom: '0.75rem' }}>
          {name} <span style={{ opacity: 0.6, fontWeight: 400 }}>· {type}</span>
        </p>
        {imgError ? (
          <div style={{ padding: '2rem', background: 'var(--bg-main)', borderRadius: 16, border: '2px dashed var(--danger)'}}>
             <p style={{color: 'var(--danger)', fontWeight: 700}}>Gagal memuat foto preview.</p>
             <p style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>URL/Base64 rusak atau tidak valid.</p>
          </div>
        ) : (
          <img
            src={src} alt={`Foto ${name}`}
            onError={() => setImgError(true)}
            style={{
              maxWidth: 'min(90vw, 440px)', maxHeight: '70vh',
              borderRadius: 16, objectFit: 'contain',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              border: '3px solid rgba(255,255,255,0.15)'
            }}
          />
        )}
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', marginTop: '0.75rem' }}>
          Tekan ESC atau klik di luar untuk menutup
        </p>
      </div>
    </div>
  )
}

/* ── Attendance Monitor (Real-time) ────────────────── */
function AttendanceMonitor({data, loading}) {
  const [lightbox, setLightbox] = useState(null) // { src, name, type }

  const statusCfg = {
    PRESENT: { label: 'Hadir',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
    LATE:    { label: 'Telat',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    SAKIT:   { label: 'Sakit',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
    IZIN:    { label: 'Izin',   color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    ABSENT:  { label: 'Belum',  color: '#6b7280', bg: 'rgba(107,114,128,0.08)'},
  }

  const presentData = (data || []).filter(l => l.status !== 'ABSENT')

  return (
    <>
      {lightbox && (
        <PhotoLightbox
          src={lightbox.src}
          name={lightbox.name}
          type={lightbox.type}
          onClose={() => setLightbox(null)}
        />
      )}
      <div className="card" style={{height:'100%'}}>
        <h3 style={{fontWeight:700,fontSize:'0.95rem',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <Camera size={16} strokeWidth={2} style={{color:'var(--primary)'}}/>
            Monitor Absensi Real-time
          </div>
          <span style={{fontSize:'0.65rem',color:'var(--secondary)',fontWeight:700,background:'var(--secondary-light)',padding:'2px 8px',borderRadius:999}}>SQL LIVE</span>
        </h3>

        <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:340,overflowY:'auto'}}>
          {loading
            ? [...Array(4)].map((_,i)=><div key={i} style={{height:64,background:'var(--border)',borderRadius:8,animation:'pulse 1.4s ease-in-out infinite'}}/>)
            : presentData.length === 0
              ? <p style={{color:'var(--text-muted)',fontSize:'0.82rem',textAlign:'center',padding:'2rem'}}>Belum ada log kehadiran hari ini.</p>
              : presentData.map((log, idx) => {
                  const cfg        = statusCfg[log.status] || statusCfg.ABSENT
                  const finalFaceIn = log.faceInUrl || (log.faceInBase64 ? (log.faceInBase64.startsWith('data:') ? log.faceInBase64 : `data:image/jpeg;base64,${log.faceInBase64}`) : null)
                  const finalFaceOut = log.faceOutUrl || (log.faceOutBase64 ? (log.faceOutBase64.startsWith('data:') ? log.faceOutBase64 : `data:image/jpeg;base64,${log.faceOutBase64}`) : null)
                  const hasFaceIn  = !!finalFaceIn
                  const hasFaceOut = !!finalFaceOut
                  const hasAnyFace = hasFaceIn || hasFaceOut
                  
                  return (
                    <div
                      key={log.internId + idx}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: 10,
                        background: 'var(--bg-main)',
                        border: `1px solid ${cfg.color}22`,
                        borderLeft: `3px solid ${cfg.color}`,
                        transition: 'all 0.18s',
                        display: 'flex', alignItems: 'center', gap: '0.625rem'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = cfg.bg}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-main)'}
                    >
                      {/* ── Two Face Photo Thumbnails ── */}
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {/* Clock-In Photo */}
                        <div
                          onClick={() => hasFaceIn && setLightbox({ src: finalFaceIn, name: log.internName || log.name, type: 'Clock-In ☀️' })}
                          title={hasFaceIn ? 'Klik untuk lihat foto Clock-In' : 'Belum ada foto masuk'}
                          style={{
                            position: 'relative', width: 40, height: 40,
                            borderRadius: 8, overflow: 'hidden',
                            background: 'var(--border)', flexShrink: 0,
                            cursor: hasFaceIn ? 'zoom-in' : 'default',
                            border: `2px solid ${hasFaceIn ? '#22c55e' : 'var(--border)'}`,
                          }}
                        >
                          {hasFaceIn
                            ? <img src={finalFaceIn} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="IN"/>
                            : <Users size={16} style={{position:'absolute',top:10,left:10,color:'var(--text-muted)'}}/>
                          }
                          <div style={{position:'absolute',bottom:1,left:1,fontSize:'6px',fontWeight:800,color:'#fff',background:'#22c55e',borderRadius:2,padding:'0 2px',lineHeight:'10px'}}>IN</div>
                        </div>

                        {/* Clock-Out Photo */}
                        <div
                          onClick={() => hasFaceOut && setLightbox({ src: finalFaceOut, name: log.internName || log.name, type: 'Clock-Out 🌙' })}
                          title={hasFaceOut ? 'Klik untuk lihat foto Clock-Out' : 'Belum Clock-Out'}
                          style={{
                            position: 'relative', width: 40, height: 40,
                            borderRadius: 8, overflow: 'hidden',
                            background: 'var(--border)', flexShrink: 0,
                            cursor: hasFaceOut ? 'zoom-in' : 'default',
                            border: `2px solid ${hasFaceOut ? '#6366f1' : 'var(--border)'}`,
                          }}
                        >
                          {hasFaceOut
                            ? <img src={finalFaceOut} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="OUT"/>
                            : <Clock size={14} style={{position:'absolute',top:11,left:11,color:'var(--text-muted)'}}/>
                          }
                          <div style={{position:'absolute',bottom:1,left:1,fontSize:'6px',fontWeight:800,color:'#fff',background:'#6366f1',borderRadius:2,padding:'0 2px',lineHeight:'10px'}}>OUT</div>
                        </div>
                      </div>

                      {/* ── Name + bidang ── */}
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:'0.82rem',fontWeight:800,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',color:'var(--text-primary)'}}>
                          {log.internName || log.name}
                        </p>
                        <div style={{display:'flex',alignItems:'center',gap:4,marginTop:1}}>
                          <span style={{fontSize:'0.65rem',color:'var(--text-muted)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:110}}>
                            {log.bidang || '-'}
                          </span>
                          {log.checkInLoc && (
                            <span style={{fontSize:'0.6rem',color:'var(--text-muted)',display:'flex',alignItems:'center',gap:1}}>
                              <MapPin size={8}/> {log.checkInLoc.substring(0,10)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ── Status + Time ── */}
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <span style={{
                          fontSize:'0.68rem',fontWeight:800,color:cfg.color,
                          background:cfg.bg,padding:'2px 7px',borderRadius:99
                        }}>{cfg.label}</span>
                        <div style={{fontSize:'0.7rem',color:'var(--text-muted)',marginTop:3,fontWeight:600}}>
                          {log.checkIn ? new Date(log.checkIn).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) : '--:--'}
                          {log.checkOut && <> → {new Date(log.checkOut).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</>}
                        </div>
                        {hasAnyFace && (
                          <div style={{fontSize:'0.6rem',color:cfg.color,fontWeight:700,marginTop:1}}>
                            ✓ Face Verified
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
          }
        </div>
        <a href="/admin/attendance" className="btn btn-secondary btn-sm" style={{width:'100%',textAlign:'center',marginTop:'0.875rem',textDecoration:'none',fontSize:'0.75rem'}}>
          Buka Monitor Penuh →
        </a>
      </div>
    </>
  )
}

/* ── Today Attendance Widget ─────────────────────── */
function TodayAttendanceWidget({ data, loading, stats }) {
  const [activeTab, setActiveTab] = useState('hadir')

  const all    = data || []
  const hadir  = all.filter(x => x.status === 'PRESENT' || x.status === 'LATE')
  const izinSakit = all.filter(x => x.status === 'IZIN' || x.status === 'SAKIT')
  const belum  = all.filter(x => x.status === 'ABSENT')

  const tabData = { hadir, izinSakit, belum }
  const shown   = tabData[activeTab] || []

  const tabs = [
    {
      key: 'hadir',
      label: 'Hadir',
      emoji: '✅',
      count: hadir.length,
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.12)',
      activeBg: 'rgba(34,197,94,0.18)',
      border: '#22c55e',
    },
    {
      key: 'izinSakit',
      label: 'Izin / Sakit',
      emoji: '🏥',
      count: izinSakit.length,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.10)',
      activeBg: 'rgba(245,158,11,0.18)',
      border: '#f59e0b',
    },
    {
      key: 'belum',
      label: 'Belum Absen',
      emoji: '⏳',
      count: belum.length,
      color: '#6b7280',
      bg: 'rgba(107,114,128,0.07)',
      activeBg: 'rgba(107,114,128,0.14)',
      border: '#6b7280',
    },
  ]

  const STATUS_LABEL = {
    PRESENT: { label: 'Hadir',   color: '#22c55e' },
    LATE:    { label: 'Telat',   color: '#f59e0b' },
    IZIN:    { label: 'Izin',    color: '#6366f1' },
    SAKIT:   { label: 'Sakit',   color: '#ef4444' },
    ABSENT:  { label: 'Belum',   color: '#6b7280' },
  }

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle2 size={16} strokeWidth={2} style={{ color: 'var(--secondary)' }} />
          Laporan Kehadiran Hari Ini
        </h3>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          {loading ? '...' : `${all.length} intern aktif`}
        </span>
      </div>

      {/* Tabs / Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '0.75rem 0.5rem',
              borderRadius: 12,
              border: `2px solid ${activeTab === t.key ? t.border : 'var(--border)'}`,
              background: activeTab === t.key ? t.activeBg : t.bg,
              cursor: 'pointer',
              transition: 'all 0.15s',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.1rem', marginBottom: 2 }}>{t.emoji}</div>
            {loading
              ? <div style={{ height: 24, width: '50%', background: 'var(--border)', borderRadius: 4, margin: '4px auto', animation: 'pulse 1.4s ease-in-out infinite' }} />
              : <div style={{ fontSize: '1.5rem', fontWeight: 900, color: t.color, lineHeight: 1 }}>{t.count}</div>
            }
            <div style={{ fontSize: '0.67rem', fontWeight: 700, color: activeTab === t.key ? t.color : 'var(--text-muted)', marginTop: 2 }}>
              {t.label}
            </div>
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {loading ? (
          [...Array(4)].map((_,i) => (
            <div key={i} style={{ height: 36, background: 'var(--border)', borderRadius: 8, animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))
        ) : shown.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1.5rem' }}>
            {activeTab === 'hadir' ? 'Belum ada yang hadir hari ini.' :
             activeTab === 'izinSakit' ? 'Tidak ada yang izin / sakit hari ini.' :
             'Semua intern sudah absen! 🎉'}
          </p>
        ) : shown.map(item => {
          const s = STATUS_LABEL[item.status] || STATUS_LABEL.ABSENT
          return (
            <div
              key={item.internId}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.4rem 0.625rem', borderRadius: 8,
                background: 'var(--bg-main)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-main)'}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: s.color + '20',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 900, color: s.color, flexShrink: 0
              }}>
                {item.name.split(' ').map(w => w[0]).slice(0,2).join('')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.name}
                </p>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.bidang}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 800, color: s.color,
                  background: s.color + '18', padding: '2px 7px', borderRadius: 99, display: 'block'
                }}>{s.label}</span>
                {item.checkIn && (
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                    {item.checkIn}{item.checkOut ? ` → ${item.checkOut}` : ''}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <a href="/admin/monitor-attendance" className="btn btn-secondary btn-sm"
        style={{ width: '100%', textAlign: 'center', marginTop: '0.875rem', textDecoration: 'none', fontSize: '0.75rem' }}
      >
        Buka Monitor Penuh →
      </a>
    </div>
  )
}

/* ── Activity Feed ───────────────────────────────── */
function ActivityFeed({data,loading}) {
  return (
    <div className="card" style={{height:'100%'}}>
      <h3 style={{fontWeight:700,fontSize:'0.95rem',display:'flex',alignItems:'center',gap:6,marginBottom:'1rem'}}>
        <Activity size={16} strokeWidth={2} style={{color:'var(--secondary)'}}/>
        Aktivitas Terkini
      </h3>
      <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:280,overflowY:'auto'}}>
        {loading
          ? [...Array(5)].map((_,i)=><div key={i} style={{height:42,background:'var(--border)',borderRadius:8,animation:'pulse 1.4s ease-in-out infinite'}}/>)
          : data?.length===0
            ? <p style={{color:'var(--text-muted)',fontSize:'0.82rem',textAlign:'center',padding:'1.5rem'}}>Belum ada aktivitas.</p>
            : data?.map(log=>{
                const meta = ACTION_META[log.action] || { label:log.action, icon:'📋', color:'var(--text-muted)' }
                return (
                  <div key={log.id} style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.5rem 0.75rem',borderRadius:'var(--radius-md)',background:'var(--bg-main)',transition:'background 0.15s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--primary-light)'}
                    onMouseLeave={e=>e.currentTarget.style.background='var(--bg-main)'}>
                    <span style={{fontSize:18,flexShrink:0}}>{meta.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:'0.8rem',fontWeight:700,color:meta.color,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{meta.label}</p>
                      {log.details?.summary ? (
                         <p style={{fontSize:'0.72rem',color:'var(--text-secondary)',fontWeight:600,marginTop:2,lineHeight:1.3}}>{log.details.summary}</p>
                      ) : (
                        <p style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{log.userName} · {timeAgo(log.timestamp)}</p>
                      )}
                      {log.details?.summary && <p style={{fontSize:'0.65rem',color:'var(--text-muted)',marginTop:2}}>{log.userName} · {timeAgo(log.timestamp)}</p>}
                    </div>
                  </div>
                )
              })
        }
      </div>
    </div>
  )
}

/* ── Expiring Interns Widget ─────────────────────── */
function ExpiringWidget({data,loading}) {
  return (
    <div className="card">
      <h3 style={{fontWeight:700,fontSize:'0.95rem',display:'flex',alignItems:'center',gap:6,marginBottom:'1rem'}}>
        <Bell size={16} strokeWidth={2} style={{color:'var(--warning)'}}/>
        Akan Berakhir (30 hari)
      </h3>
      {loading
        ? [...Array(3)].map((_,i)=><div key={i} style={{height:36,background:'var(--border)',borderRadius:8,marginBottom:6,animation:'pulse 1.4s ease-in-out infinite'}}/>)
        : data?.length===0
          ? <p style={{color:'var(--text-muted)',fontSize:'0.82rem',textAlign:'center',padding:'1rem'}}>Tidak ada intern yang akan berakhir.</p>
          : data?.map(i=>(
              <a key={i.id} href="/interns"
                style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.5rem 0',borderBottom:'1px solid var(--border)',textDecoration:'none',color:'inherit',transition:'background 0.15s'}}>
                <div>
                  <p style={{fontSize:'0.82rem',fontWeight:600}}>{i.name}</p>
                  <p style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{i.university}</p>
                </div>
                <span style={{fontWeight:700,fontSize:'0.78rem',flexShrink:0,marginLeft:8,color:i.sisaHari<=7?'var(--danger)':i.sisaHari<=14?'var(--warning)':'var(--text-secondary)'}}>
                  {i.sisaHari<=0?'Selesai':`${i.sisaHari}h`}
                </span>
              </a>
            ))
      }
      <a href="/interns" className="btn btn-secondary btn-sm" style={{width:'100%',textAlign:'center',marginTop:'0.75rem',textDecoration:'none',fontSize:'0.78rem'}}>
        Lihat Semua Intern <ArrowRight size={12} strokeWidth={2}/>
      </a>
    </div>
  )
}

/* ── Evaluation Summary Widget ───────────────────── */
function EvaluationWidget({data,loading}) {
  return (
    <div className="card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
        <h3 style={{fontWeight:700,fontSize:'0.95rem',display:'flex',alignItems:'center',gap:6}}>
          <Star size={16} strokeWidth={2} style={{color:'#f59e0b'}}/>
          Ringkasan Evaluasi
        </h3>
        <a href="/evaluations" className="btn btn-secondary btn-sm" style={{textDecoration:'none',fontSize:'0.75rem'}}>Detail</a>
      </div>
      {loading ? <div style={{height:80,background:'var(--border)',borderRadius:8,animation:'pulse 1.4s ease-in-out infinite'}}/> : (
        <div style={{display:'flex',gap:'1rem',alignItems:'center'}}>
          <div style={{flex:1,textAlign:'center',padding:'1rem',background:'var(--bg-main)',borderRadius:'var(--radius-lg)',border:'1px solid var(--border)'}}>
            <p style={{fontSize:'2rem',fontWeight:800,color:'var(--primary)'}}>{data?.avgScore || 0}</p>
            <p style={{fontSize:'0.75rem',color:'var(--text-muted)',marginTop:4}}>Rata-rata Skor</p>
          </div>
          <div style={{flex:1,textAlign:'center',padding:'1rem',background:'var(--bg-main)',borderRadius:'var(--radius-lg)',border:'1px solid var(--border)'}}>
            <p style={{fontSize:'2rem',fontWeight:800,color:'var(--warning)'}}>{data?.pending || 0}</p>
            <p style={{fontSize:'0.75rem',color:'var(--text-muted)',marginTop:4}}>Belum Dievaluasi</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Survey Status Widget ────────────────────────── */
function SurveyWidget({data,loading}) {
  return (
    <div className="card">
       <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
        <h3 style={{fontWeight:700,fontSize:'0.95rem',display:'flex',alignItems:'center',gap:6}}>
          <MessageSquare size={16} strokeWidth={2} style={{color:'var(--secondary)'}}/>
          Survei & Feedback
        </h3>
        <a href="/surveys" className="btn btn-secondary btn-sm" style={{textDecoration:'none',fontSize:'0.75rem'}}>Kelola</a>
      </div>
      {loading ? <div style={{height:80,background:'var(--border)',borderRadius:8,animation:'pulse 1.4s ease-in-out infinite'}}/> : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.75rem',background:'var(--secondary-light)',borderRadius:'var(--radius-md)'}}>
            <span style={{fontSize:'0.82rem',fontWeight:600,color:'var(--secondary)'}}>Survei Aktif</span>
            <span style={{fontSize:'1.1rem',fontWeight:800,color:'var(--secondary)'}}>{data?.active || 0}</span>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.75rem',background:'var(--bg-main)',borderRadius:'var(--radius-md)'}}>
            <span style={{fontSize:'0.82rem',color:'var(--text-secondary)'}}>Total Respon</span>
            <span style={{fontWeight:700}}>{data?.responses || 0}</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Gender Distribution Widget ───────────────────── */
function GenderWidget({data,loading}) {
  if (loading) return <div style={{height:100,background:'var(--border)',borderRadius:8,animation:'pulse 1.4s ease-in-out infinite'}}/>
  
  // Normalize and calculate
  const total = Object.values(data||{}).reduce((s,v)=>s+v,0)
  const pria  = data?.['Laki-laki'] || 0
  const wan   = data?.['Perempuan'] || 0
  const pPct  = total ? Math.round((pria/total)*100) : 0
  const wPct  = total ? Math.round((wan/total)*100) : 0

  return (
    <div className="card" style={{position:'relative',overflow:'hidden',transition:'transform 0.3s ease'}}>
       <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
        <h3 style={{fontWeight:700,fontSize:'0.95rem',display:'flex',alignItems:'center',gap:8}}>
          <Users size={18} strokeWidth={2.5} style={{color:'var(--primary)'}}/>
          Distribusi Demografis
        </h3>
        <span style={{fontSize:'0.65rem',fontWeight:700,padding:'2px 8px',background:'var(--primary-light)',color:'var(--primary)',borderRadius:12,textTransform:'uppercase'}}>Gender</span>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:20}}>
        {/* Legends & Counts */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div style={{padding:'10px',background:'rgba(59,130,246,0.05)',borderRadius:12,border:'1px solid rgba(59,130,246,0.1)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'linear-gradient(135deg, #3b82f6, #6366f1)'}}/>
              <span style={{fontSize:'0.75rem',fontWeight:600,color:'var(--text-secondary)'}}>Laki-laki</span>
            </div>
            <div style={{fontSize:'1.25rem',fontWeight:800,color:'var(--text-main)'}}>{pria} <span style={{fontSize:'0.75rem',fontWeight:500,color:'rgba(59,130,246,0.8)'}}>{pPct}%</span></div>
          </div>

          <div style={{padding:'10px',background:'rgba(236,72,153,0.05)',borderRadius:12,border:'1px solid rgba(236,72,153,0.1)'}}>
             <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'linear-gradient(135deg, #ec4899, #f43f5e)'}}/>
              <span style={{fontSize:'0.75rem',fontWeight:600,color:'var(--text-secondary)'}}>Perempuan</span>
            </div>
            <div style={{fontSize:'1.25rem',fontWeight:800,color:'var(--text-main)'}}>{wan} <span style={{fontSize:'0.75rem',fontWeight:500,color:'rgba(236,72,153,0.8)'}}>{wPct}%</span></div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div style={{position:'relative'}}>
          <div style={{height:32,background:'var(--bg-main)',borderRadius:16,overflow:'hidden',display:'flex',boxShadow:'inset 0 2px 4px rgba(0,0,0,0.05)',border:'1px solid var(--border)'}}>
            <div 
              style={{
                width:`${pPct}%`,
                height:'100%',
                background:'linear-gradient(90deg, #3b82f6, #6366f1)',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                color:'#fff',
                fontSize:'0.85rem',
                fontWeight:800,
                transition:'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                position:'relative',
                overflow:'hidden'
              }}
              title={`Laki-laki: ${pria} (${pPct}%)`}
            >
              {pPct > 15 && <span style={{zIndex:2, textShadow:'0 1px 2px rgba(0,0,0,0.2)'}}>♂</span>}
              <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'linear-gradient(rgba(255,255,255,0.15), transparent)',pointerEvents:'none'}}/>
            </div>
            <div 
              style={{
                width:`${wPct}%`,
                height:'100%',
                background:'linear-gradient(90deg, #ec4899, #f43f5e)',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                color:'#fff',
                fontSize:'0.85rem',
                fontWeight:800,
                transition:'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                position:'relative',
                overflow:'hidden'
              }}
              title={`Perempuan: ${wan} (${wPct}%)`}
            >
              {wPct > 15 && <span style={{zIndex:2, textShadow:'0 1px 2px rgba(0,0,0,0.2)'}}>♀</span>}
              <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'linear-gradient(rgba(255,255,255,0.15), transparent)',pointerEvents:'none'}}/>
            </div>
          </div>
        </div>
        
        <p style={{fontSize:'0.7rem',color:'var(--text-muted)',textAlign:'center',fontStyle:'italic',opacity:0.8}}>
          Berbasis pada total data historis ({total} intern)
        </p>
      </div>
    </div>
  )
}

/* ── Generic List Chart (Top N) ─────────────────── */
function ListChart({data,title,icon,color,loading}) {
  if (loading) return <div style={{height:150,background:'var(--border)',borderRadius:8,animation:'pulse 1.4s ease-in-out infinite'}}/>
  const entries = Object.entries(data||{}).sort((a,b)=>b[1]-a[1]).slice(0, 8)
  const total   = Object.values(data||{}).reduce((s,v)=>s+v,0)

  return (
    <div className="card">
      <h3 style={{fontWeight:700,fontSize:'0.95rem',display:'flex',alignItems:'center',gap:6,marginBottom:'1rem'}}>
        {icon}
        {title}
      </h3>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {entries.length === 0 ? <p style={{color:'var(--text-muted)',fontSize:'0.82rem'}}>Tidak ada data.</p> :
          entries.map(([k,v])=>(
            <div key={k}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.75rem',marginBottom:4}}>
                <span style={{fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'70%'}}>{k}</span>
                <span>{v}</span>
              </div>
              <div style={{height:6,background:'var(--border)',borderRadius:3,overflow:'hidden'}}>
                 <div style={{width:`${total?Math.min(100,(v/total)*300):0}%`,height:'100%',background:color,transition:'width 0.5s'}}/>
              </div>
            </div>
          ))
        }
        <p style={{fontSize:'0.72rem',color:'var(--text-muted)',textAlign:'center',marginTop:'0.5rem'}}>Base: {total} (Aktif & Selesai)</p>
      </div>
    </div>
  )
}

/* ── Bidang Distribution Widget ──────────────────── */
function BidangChart({data,loading}) {
  if (loading) return <div style={{height:150,background:'var(--border)',borderRadius:12,animation:'pulse 1.4s ease-in-out infinite'}}/>
  const entries = Object.entries(data||{}).sort((a,b)=>b[1]-a[1]).slice(0, 5)
  const total   = Object.values(data||{}).reduce((s,v)=>s+v,0)
  if (!total) return <p style={{color:'var(--text-muted)',fontSize:'0.82rem',textAlign:'center',padding:'2rem'}}>Belum ada data bidang.</p>
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {entries.map(([k,v],i)=>(
        <a key={k} href={`/interns?bidang=${k}`} style={{textDecoration:'none', color:'inherit'}}>
          <div style={{
            padding:'0.625rem 0.75rem', borderRadius:10, background:'rgba(139,92,246,0.03)', border:'1px solid rgba(139,92,246,0.08)',
            transition:'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', cursor:'pointer'
          }} onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.background='rgba(139,92,246,0.06)'}}
             onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(139,92,246,0.08)'; e.currentTarget.style.background='rgba(139,92,246,0.03)'}}>
             <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.75rem',marginBottom:6}}>
               <span style={{fontWeight:700, color:'var(--text-secondary)'}}>{k}</span>
               <span style={{fontWeight:800, color:'var(--primary)'}}>{Math.round((v/total)*100)}%</span>
             </div>
             <div style={{height:5,background:'var(--border)',borderRadius:3,overflow:'hidden'}}>
                <div style={{width:`${(v/total)*100}%`,height:'100%',background:'linear-gradient(90deg, #6366f1, #8b5cf6)',borderRadius:3,transition:'width 0.8s ease'}}/>
             </div>
          </div>
        </a>
      ))}
      <p style={{fontSize:'0.72rem',color:'var(--text-muted)',textAlign:'center',marginTop:'0.5rem'}}>Base: {total} (Aktif & Selesai)</p>
    </div>
  )
}

/* ── Quick Actions ───────────────────────────────── */
function QuickActions() {
  const actions = [
    { icon:'👤', label:'Tambah Intern',  href:'/interns',     color:'var(--primary)' },
    { icon:'📥', label:'Import Excel',   href:'/interns',     color:'var(--primary)' },
    { icon:'💰', label:'Proses Payroll', href:'/payroll',     color:'var(--secondary)' },
    { icon:'📋', label:'Onboarding',     href:'/onboarding',  color:'var(--warning)' },
    { icon:'📊', label:'Laporan',        href:'/reports',     color:'#8b5cf6' },
    { icon:'📅', label:'Kehadiran',      href:'/attendance',  color:'var(--danger)' },
    { icon:'⭐', label:'Evaluasi',       href:'/evaluations', color:'#f59e0b' },
    { icon:'📝', label:'Audit Log',      href:'/logs',        color:'var(--text-muted)' },
  ]
  return (
    <div className="card">
      <h3 style={{fontWeight:700,fontSize:'0.95rem',display:'flex',alignItems:'center',gap:6,marginBottom:'1rem'}}>
        <Zap size={16} strokeWidth={2} style={{color:'var(--warning)'}}/>
        Aksi Cepat
      </h3>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.5rem'}}>
        {actions.map(a=>(
          <a key={a.label} href={a.href} style={{
            display:'flex',flexDirection:'column',alignItems:'center',gap:'0.375rem',
            padding:'0.75rem 0.25rem',borderRadius:'var(--radius-md)',
            border:'1px solid var(--border)',textDecoration:'none',
            transition:'all 0.18s',color:'var(--text-primary)',background:'var(--bg-main)'
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=a.color;e.currentTarget.style.background=a.color+'15'}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='var(--bg-main)'}}>
            <span style={{fontSize:20}}>{a.icon}</span>
            <span style={{fontSize:'0.68rem',fontWeight:600,textAlign:'center',color:'var(--text-secondary)'}}>{a.label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

/* ── Announcements Widget (CRUD) ─────────────────── */
function AnnouncementsWidget() {
  const [showForm,setShowForm] = useState(false)
  const [editItem,setEditItem] = useState(null)
  const [form,setForm]     = useState({title:'',content:'',priority:'INFO',pinned:false})
  const [saving,setSaving] = useState(false)

  // SWR automatically handles fetching, caching, deduplication, and loading state
  const { data: items, isLoading: loading, mutate } = useSWR('/api/announcements', fetcher)
  const safeItems = items || []

  const openForm = (item=null) => {
    setEditItem(item)
    setForm(item?{title:item.title,content:item.content,priority:item.priority,pinned:item.pinned}:{title:'',content:'',priority:'INFO',pinned:false})
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    if (editItem) await fetch('/api/announcements',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...editItem,...form})})
    else          await fetch('/api/announcements',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
    setSaving(false); setShowForm(false); mutate()
  }

  const handleDelete = async id => {
    if (!confirm('Hapus pengumuman ini?')) return
    await fetch(`/api/announcements?id=${id}`,{method:'DELETE'}); mutate()
  }

  const togglePin = async item => {
    await fetch('/api/announcements',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...item,pinned:!item.pinned})}); mutate()
  }

  const P = PRIO_STYLE
  return (
    <div className="card" style={{minHeight:280}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
        <h3 style={{fontWeight:700,fontSize:'0.95rem',display:'flex',alignItems:'center',gap:6}}>
          <Megaphone size={16} strokeWidth={2} style={{color:'var(--primary)'}}/>
          Pengumuman
        </h3>
        <button className="btn btn-primary btn-sm" onClick={()=>openForm()}>
          <Plus size={14} strokeWidth={2}/> Buat
        </button>
      </div>

      {showForm&&(
        <div style={{background:'var(--bg-main)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1rem',marginBottom:'0.875rem',animation:'scaleUp 0.2s ease'}}>
          <div style={{display:'flex',gap:'0.625rem',marginBottom:'0.625rem'}}>
            <input className="input" placeholder="Judul pengumuman *" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} style={{flex:1}}/>
            <select className="select" value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))} style={{width:125}}>
              {['INFO','WARNING','URGENT'].map(v=><option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <textarea className="input" placeholder="Isi pengumuman..." rows={2} value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))} style={{resize:'vertical',marginBottom:'0.625rem'}}/>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.8rem',cursor:'pointer'}}>
              <input type="checkbox" checked={form.pinned} onChange={e=>setForm(p=>({...p,pinned:e.target.checked}))} />
              📌 Pin di atas
            </label>
            <div style={{display:'flex',gap:'0.5rem'}}>
              <button className="btn btn-secondary btn-sm" onClick={()=>setShowForm(false)}>Batal</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving?<Loader2 size={13} style={{animation:'spin 0.8s linear infinite'}}/>:(editItem?'Simpan':'Buat')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:'0.5rem',maxHeight:320,overflowY:'auto'}}>
        {loading
          ? [...Array(2)].map((_,i)=><div key={i} style={{height:60,background:'var(--border)',borderRadius:8,animation:'pulse 1.4s ease-in-out infinite'}}/>)
          : safeItems.length===0
            ? <p style={{color:'var(--text-muted)',fontSize:'0.82rem',textAlign:'center',padding:'1.5rem'}}>Belum ada pengumuman. Klik "+ Buat" untuk memulai.</p>
            : safeItems.map(ann=>{
                const s = P[ann.priority]||P.INFO
                return (
                  <div key={ann.id} style={{padding:'0.75rem',background:'var(--bg-main)',borderRadius:'var(--radius-md)',border:`1px solid ${ann.pinned?'rgba(99,102,241,0.3)':'var(--border)'}`,borderLeft:`3px solid ${s.color}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                          {ann.pinned&&<span title="Disematkan" style={{color:'var(--primary)',fontSize:12}}>📌</span>}
                          <span style={{padding:'2px 8px',borderRadius:999,fontSize:'0.65rem',fontWeight:700,background:s.bg,color:s.color}}>{s.label}</span>
                          <span style={{fontSize:'0.78rem',fontWeight:700,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ann.title}</span>
                        </div>
                        <p style={{fontSize:'0.78rem',color:'var(--text-secondary)',lineHeight:1.4}}>{ann.content}</p>
                        <p style={{fontSize:'0.68rem',color:'var(--text-muted)',marginTop:4}}>{timeAgo(ann.createdAt)} · {ann.createdBy}</p>
                      </div>
                      <div style={{display:'flex',gap:3,flexShrink:0}}>
                        <button onClick={()=>togglePin(ann)} title={ann.pinned?'Unpin':'Pin'} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:14,padding:2}}>📌</button>
                        <button onClick={()=>openForm(ann)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:2}}><Edit size={13} strokeWidth={2}/></button>
                        <button onClick={()=>handleDelete(ann.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',padding:2}}><Trash size={13} strokeWidth={2}/></button>
                      </div>
                    </div>
                  </div>
                )
              })
        }
      </div>
    </div>
  )
}

/* ── HR Tasks Widget (CRUD) ──────────────────────── */
function HRTasksWidget() {
  const [showForm,setShowForm] = useState(false)
  const [form,setForm]     = useState({title:'',dueDate:'',priority:'MEDIUM'})
  const [saving,setSaving] = useState(false)

  const { data: tasks, isLoading: loading, mutate } = useSWR('/api/tasks-hr', fetcher)
  const safeTasks = tasks || []

  const handleAdd = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    await fetch('/api/tasks-hr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
    setSaving(false); setShowForm(false); setForm({title:'',dueDate:'',priority:'MEDIUM'}); mutate()
  }

  const toggleDone = async task => {
    await fetch('/api/tasks-hr',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...task,completed:!task.completed})}); mutate()
  }

  const handleDelete = async id => {
    await fetch(`/api/tasks-hr?id=${id}`,{method:'DELETE'}); mutate()
  }

  const P = PRIO_STYLE
  const done  = safeTasks.filter(t=>t.completed).length
  const total = safeTasks.length

  return (
    <div className="card" style={{minHeight:280}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
        <h3 style={{fontWeight:700,fontSize:'0.95rem',display:'flex',alignItems:'center',gap:6}}>
          <ListChecks size={16} strokeWidth={2} style={{color:'var(--secondary)'}}/>
          Tugas & Reminder HR
        </h3>
        <button className="btn btn-primary btn-sm" onClick={()=>setShowForm(p=>!p)}>
          <Plus size={14} strokeWidth={2}/> Tambah
        </button>
      </div>

      {total>0&&(
        <div style={{marginBottom:'0.75rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.72rem',color:'var(--text-muted)',marginBottom:4}}>
            <span>{done}/{total} selesai</span>
            <span>{Math.round((done/total)*100)}%</span>
          </div>
          <div style={{height:5,background:'var(--border)',borderRadius:4,overflow:'hidden'}}>
            <div style={{width:`${total?(done/total)*100:0}%`,height:'100%',background:'var(--secondary)',borderRadius:4,transition:'width 0.4s'}}/>
          </div>
        </div>
      )}

      {showForm&&(
        <div style={{background:'var(--bg-main)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'0.875rem',marginBottom:'0.75rem',animation:'scaleUp 0.2s ease'}}>
          <input className="input" placeholder="Judul tugas *" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} style={{marginBottom:'0.5rem'}}/>
          <div style={{display:'flex',gap:'0.5rem',marginBottom:'0.5rem'}}>
            <input type="date" className="input" value={form.dueDate} onChange={e=>setForm(p=>({...p,dueDate:e.target.value}))} style={{flex:1}}/>
            <select className="select" value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))} style={{width:120}}>
              {['URGENT','HIGH','MEDIUM','LOW'].map(v=><option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:'0.5rem'}}>
            <button className="btn btn-secondary btn-sm" onClick={()=>setShowForm(false)}>Batal</button>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={saving}>
              {saving?<Loader2 size={13} style={{animation:'spin 0.8s linear infinite'}}/>:'Simpan'}
            </button>
          </div>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:'0.375rem',maxHeight:300,overflowY:'auto'}}>
        {loading
          ? [...Array(3)].map((_,i)=><div key={i} style={{height:40,background:'var(--border)',borderRadius:6,animation:'pulse 1.4s ease-in-out infinite'}}/>)
          : safeTasks.length===0
            ? <p style={{color:'var(--text-muted)',fontSize:'0.82rem',textAlign:'center',padding:'1.25rem'}}>Tidak ada tugas. Klik "+ Tambah" untuk membuat reminder.</p>
            : safeTasks.map(t=>{
                const s=P[t.priority]||P.MEDIUM
                const overdue = t.dueDate && !t.completed && new Date(t.dueDate)<new Date()
                return (
                  <div key={t.id} style={{display:'flex',alignItems:'center',gap:'0.625rem',padding:'0.5rem 0.625rem',borderRadius:'var(--radius-md)',background:'var(--bg-main)',opacity:t.completed?0.6:1,transition:'all 0.2s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--border)'}
                    onMouseLeave={e=>e.currentTarget.style.background='var(--bg-main)'}>
                    <button onClick={()=>toggleDone(t)} style={{width:18,height:18,borderRadius:4,border:`2px solid ${t.completed?'var(--secondary)':'var(--border)'}`,background:t.completed?'var(--secondary)':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.15s'}}>
                      {t.completed&&<CheckCircle2 size={11} strokeWidth={3} color="#fff"/>}
                    </button>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:'0.82rem',fontWeight:600,textDecoration:t.completed?'line-through':'none',color:t.completed?'var(--text-muted)':'var(--text-primary)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.title}</p>
                      <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
                        <span style={{padding:'1px 6px',borderRadius:999,fontSize:'0.62rem',fontWeight:700,background:s.bg,color:s.color}}>{s.label}</span>
                        {t.dueDate&&<span style={{fontSize:'0.68rem',color:overdue?'var(--danger)':'var(--text-muted)',fontWeight:overdue?700:400}}>{overdue?'⚠ ':''}{fmtDate(t.dueDate)}</span>}
                      </div>
                    </div>
                    <button onClick={()=>handleDelete(t.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',opacity:0,transition:'opacity 0.15s',padding:2,flexShrink:0}}
                      onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0}>
                      <Trash size={13} strokeWidth={2}/>
                    </button>
                  </div>
                )
              })
        }
      </div>
    </div>
  )
}

/* ── Events Widget (CRUD) ────────────────────────── */
function EventsWidget() {
  const [showForm,setShowForm] = useState(false)
  const [editItem,setEditItem] = useState(null)
  const [form,setForm]     = useState({title:'',date:'',type:'GENERAL',description:''})
  const [saving,setSaving] = useState(false)

  const { data: events, isLoading: loading, mutate } = useSWR('/api/events', fetcher)
  const safeEvents = events || []

  const openForm = (item=null) => {
    setEditItem(item)
    setForm(item?{title:item.title,date:item.date,type:item.type,description:item.description}:{title:'',date:'',type:'GENERAL',description:''})
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()||!form.date) return
    setSaving(true)
    if (editItem) await fetch('/api/events',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...editItem,...form})})
    else          await fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
    setSaving(false); setShowForm(false); mutate()
  }

  const handleDelete = async id => {
    if (!confirm('Hapus event ini?')) return
    await fetch(`/api/events?id=${id}`,{method:'DELETE'}); mutate()
  }

  const today = new Date(); today.setHours(0,0,0,0)

  return (
    <div className="card" style={{minHeight:280}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
        <h3 style={{fontWeight:700,fontSize:'0.95rem',display:'flex',alignItems:'center',gap:6}}>
          <CalendarDays size={16} strokeWidth={2} style={{color:'#8b5cf6'}}/>
          Jadwal & Event
        </h3>
        <button className="btn btn-primary btn-sm" onClick={()=>openForm()}>
          <Plus size={14} strokeWidth={2}/> Tambah
        </button>
      </div>

      {showForm&&(
        <div style={{background:'var(--bg-main)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'0.875rem',marginBottom:'0.875rem',animation:'scaleUp 0.2s ease'}}>
          <div style={{display:'flex',gap:'0.5rem',marginBottom:'0.5rem'}}>
            <input className="input" placeholder="Nama event *" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} style={{flex:1}}/>
            <input type="date" className="input" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={{width:155}}/>
          </div>
          <div style={{display:'flex',gap:'0.5rem',marginBottom:'0.5rem'}}>
            <select className="select" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={{width:145}}>
              {['ORIENTATION','EVALUATION','CLOSING','TRAINING','GENERAL'].map(v=><option key={v} value={v}>{v}</option>)}
            </select>
            <input className="input" placeholder="Deskripsi event..." value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} style={{flex:1}}/>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:'0.5rem'}}>
            <button className="btn btn-secondary btn-sm" onClick={()=>setShowForm(false)}>Batal</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving?<Loader2 size={13} style={{animation:'spin 0.8s linear infinite'}}/>:(editItem?'Simpan':'Buat')}
            </button>
          </div>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:'0.5rem',maxHeight:320,overflowY:'auto'}}>
        {loading
          ? [...Array(3)].map((_,i)=><div key={i} style={{height:52,background:'var(--border)',borderRadius:8,animation:'pulse 1.4s ease-in-out infinite'}}/>)
          : safeEvents.length===0
            ? <p style={{color:'var(--text-muted)',fontSize:'0.82rem',textAlign:'center',padding:'1.5rem'}}>Belum ada event terjadwal.</p>
            : safeEvents.map(ev=>{
                const evDate  = new Date(ev.date); evDate.setHours(0,0,0,0)
                const past    = evDate < today
                const today_  = evDate.getTime()===today.getTime()
                const color   = EVT_COLORS[ev.type]||'var(--text-muted)'
                const sisaH   = Math.ceil((evDate-today)/86400000)
                return (
                  <div key={ev.id} style={{display:'flex',gap:'0.75rem',padding:'0.625rem 0.75rem',borderRadius:'var(--radius-md)',background:'var(--bg-main)',border:`1px solid ${today_?color:'var(--border)'}`,opacity:past?0.5:1,transition:'all 0.15s'}}
                    onMouseEnter={e=>!past&&(e.currentTarget.style.borderColor=color)}
                    onMouseLeave={e=>!today_&&(e.currentTarget.style.borderColor='var(--border)')}>
                    <div style={{width:4,borderRadius:2,background:color,flexShrink:0,minHeight:40}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                        <p style={{fontSize:'0.82rem',fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.title}</p>
                        <div style={{display:'flex',gap:2,flexShrink:0,marginLeft:6}}>
                          <button onClick={()=>openForm(ev)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:2}}><Edit size={12} strokeWidth={2}/></button>
                          <button onClick={()=>handleDelete(ev.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',padding:2}}><Trash size={12} strokeWidth={2}/></button>
                        </div>
                      </div>
                      <p style={{fontSize:'0.7rem',color:'var(--text-muted)',marginTop:2}}>{fmtDate(ev.date)} · {ev.type} {today_?'· 📅 Hari ini!':past?'· ✓ Selesai':sisaH>0?`· ${sisaH}h lagi`:''}</p>
                      {ev.description&&<p style={{fontSize:'0.68rem',color:'var(--text-secondary)',marginTop:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{ev.description}</p>}
                    </div>
                  </div>
                )
              })
        }
      </div>
    </div>
  )
}

/* ── Jenjang Distribution Chart ──────────────────── */
function JenjangChart({data,loading}) {
  if (loading) return <div style={{height:150,background:'var(--border)',borderRadius:12,animation:'pulse 1.4s ease-in-out infinite'}}/>
  const entries = Object.entries(data||{}).sort((a,b)=>b[1]-a[1])
  const total   = entries.reduce((s,[,v])=>s+v,0)
  
  const LEVELS = {
    'S1': { icon: <GraduationCap size={16}/>, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', grad: 'linear-gradient(135deg, #3b82f6, #6366f1)' },
    'D3': { icon: <Award size={16}/>,         color: '#10b981', bg: 'rgba(16,185,129,0.1)', grad: 'linear-gradient(135deg, #10b981, #059669)' },
    'SMK/SMA': { icon: <BookOpen size={16}/>, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' , grad: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    'Lainnya': { icon: <Settings size={16}/>, color: '#64748b', bg: 'rgba(100,116,139,0.1)', grad: 'linear-gradient(135deg, #64748b, #475569)' }
  }

  if (!total) return <p style={{color:'var(--text-muted)',fontSize:'0.82rem',textAlign:'center',padding:'2rem'}}>Belum ada data distribusi jenjang.</p>

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {entries.map(([k,v]) => {
        const meta = LEVELS[k] || LEVELS['Lainnya']
        const pct  = Math.round((v/total)*100)
        return (
          <a key={k} href={`/interns?jenjang=${k}`} style={{textDecoration:'none', color:'inherit'}}>
            <div className="jenjang-item" style={{
              padding:'0.75rem', borderRadius:12, background:'var(--bg-main)', border:'1px solid var(--border)',
              transition:'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', cursor:'pointer'
            }} onMouseEnter={e=>{e.currentTarget.style.borderColor=meta.color; e.currentTarget.style.transform='translateX(4px)'}}
               onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='none'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:28,height:28,borderRadius:8,background:meta.bg,color:meta.color,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {meta.icon}
                  </div>
                  <span style={{fontSize:'0.82rem',fontWeight:700}}>{k}</span>
                </div>
                <div style={{textAlign:'right'}}>
                   <span style={{fontSize:'0.85rem',fontWeight:800,color:'var(--text-main)'}}>{v} <small style={{fontSize:'0.65rem',color:'var(--text-muted)',fontWeight:400}}>pers.</small></span>
                </div>
              </div>
              <div style={{height:6,background:'var(--border)',borderRadius:3,overflow:'hidden',position:'relative'}}>
                <div style={{width:`${pct}%`,height:'100%',background:meta.grad,borderRadius:3,transition:'width 1s cubic-bezier(0.4, 0, 0.2, 1)'}}/>
                {pct > 5 && <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'linear-gradient(rgba(255,255,255,0.1),transparent)',pointerEvents:'none'}}/>}
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',marginTop:4}}>
                <span style={{fontSize:'0.65rem',fontWeight:700,color:meta.color}}>{pct}%</span>
              </div>
            </div>
          </a>
        )
      })}
      <p style={{fontSize:'0.72rem',color:'var(--text-muted)',textAlign:'center',marginTop:'0.5rem'}}>Base: {total} (Aktif & Selesai)</p>
    </div>
  )
}

/* ── Main Admin Dashboard ────────────────────────── */
export default function AdminDashboard() {
  const [selectedYear, setSelectedYear] = useState('2026')

  // SWR for main dashboard stats. Will automatically re-validate.
  // We use refreshInterval: 60000 to replicate the setInterval behavior without memory leak risks.
  const { data: dash, error: swrError, isLoading: loading, mutate: fetchDash } = useSWR(`/api/dashboard?tahun=${selectedYear}`, fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true, // Refresh instantly when tab is focused
  })

  // When SWR returns from cache instantly, we wouldn't know the exact fetch time 
  // without digging inside, so we'll just show the current time if it's not currently loading.
  const lastRefreshTime = new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})

  const { user, switchRole } = useAuth()

  const s = dash?.stats || {}

  // ── Role Switcher (Preview Mode) Component ──
  const RoleSwitcher = () => (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
      background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(12px)',
      padding: '6px', borderRadius: 'var(--radius-full)',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      display: 'flex', gap: '4px', alignItems: 'center'
    }}>
      <div style={{ padding: '0 12px', fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.5px' }}>PREVIEW MODE</div>
      {[
        { r: 'ADMIN_HR',   l: 'Admin', icon: <Shield size={12}/> },
        { r: 'INTERN',     l: 'Intern', icon: <Users size={12}/> },
        { r: 'SUPERVISOR', l: 'SV', icon: <BarChart3 size={12}/> }
      ].map(opt => (
        <button
          key={opt.r}
          onClick={() => switchRole(opt.r)}
          style={{
            padding: '8px 14px', borderRadius: 'var(--radius-full)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.75rem', fontWeight: 700,
            background: user?.role === opt.r ? 'var(--primary)' : 'transparent',
            color: user?.role === opt.r ? '#fff' : 'var(--text-secondary)',
            transition: 'all 0.2s'
          }}
        >
          {opt.icon} {opt.l}
        </button>
      ))}
    </div>
  )

  return (
    <div style={{animation:'slideUp 0.3s ease'}}>
      {/* ── Monthly Notification (16th) ── */}
      {new Date().getDate() === 16 && (
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)',
          animation: 'pulse 3s infinite ease-in-out'
        }}>
          <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
            <div style={{width:48,height:48,borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Bell size={24} strokeWidth={2.5}/>
            </div>
            <div>
              <p style={{fontWeight:800,fontSize:'1.1rem'}}>Pengingat Laporan Bulanan (Tanggal 16)</p>
              <p style={{fontSize:'0.85rem',opacity:0.9}}>Hari ini adalah periode rekapitulasi. Pastikan semua laporan harian peserta magang telah ditinjau.</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => window.location.href = '/admin/reports'} style={{background:'#fff',color:'var(--primary)',border:'none',fontWeight:800}}>
            Buka Laporan <ArrowRight size={16} strokeWidth={2.5} style={{marginLeft:6}}/>
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.5rem',flexWrap:'wrap',gap:'0.75rem'}}>
        <div>
          <h1 className="title">Dashboard HR</h1>
          <p className="subtitle">Selamat datang, Admin HR 👋 — Ringkasan program magang real-time</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'0.625rem'}}>
          <select 
            className="select" 
            style={{width:120, fontSize:'0.75rem', height:36}} 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="2026">Program 2026</option>
            <option value="2025">Program 2025</option>
            <option value="2024">Program 2024</option>
          </select>
          <span style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>Status: {loading ? 'Memperbarui...' : `Live (${lastRefreshTime})`}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchDash()} disabled={loading} title="Refresh data">
            <RefreshCw size={14} strokeWidth={2} style={{animation:loading?'spin 1s linear infinite':'none'}}/>
          </button>
        </div>
      </div>

      {/* ── SWR Error Banner ── */}
      {swrError && !loading && (
        <div style={{
          background: 'var(--warning-light)', border: '1px solid var(--warning)',
          borderRadius: 12, padding: '0.875rem 1.25rem', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap'
        }}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:'1.1rem'}}>⚠️</span>
            <div>
              <p style={{fontWeight:700,fontSize:'0.85rem',color:'var(--warning)'}}>Gagal memuat data dashboard</p>
              <p style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>
                {swrError.status === 503 ? 'Koneksi database lambat, coba beberapa saat lagi.' : 'Terjadi kesalahan saat mengambil data dari server.'}
              </p>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchDash()}>
            🔄 Coba Lagi
          </button>
        </div>
      )}

      {/* ── Row 1: Stats ── */}
      <div className="stat-grid" style={{marginBottom:'var(--sp-4)', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))'}}>
        <StatCard icon={<Users size={20} strokeWidth={2}/>}    label="Intern Aktif"        value={s.activeInterns??'—'}   badge={s.activeInterns>0?'+Aktif':null}  badgeOk color="var(--primary)"   bg="var(--primary-light)"   loading={loading}/>
        <StatCard icon={<CheckCircle2 size={20} strokeWidth={2}/>} label="Check-in Hari Ini" value={s.checkinToday??'—'} badge={s.activeInterns?`${Math.round((s.checkinToday/s.activeInterns)*100)||0}%`:null} badgeOk={s.checkinToday>=s.activeInterns*0.8} color="var(--secondary)" bg="var(--secondary-light)" loading={loading}/>
        <StatCard icon={<Users size={20} strokeWidth={2}/>}    label="Selesai Magang"     value={s.completedInterns??'—'} badge="Total" badgeOk color="var(--success)" bg="rgba(34,197,94,0.1)" loading={loading}/>
        <StatCard icon={<Clock size={20} strokeWidth={2}/>}    label="Mendekati Selesai"  value={s.expiringSoon??'—'} badge="<14 hari" badgeOk={s.expiringSoon===0} color="var(--danger)" bg="var(--danger-light)" loading={loading}/>
        <StatCard icon={<Wallet size={20} strokeWidth={2}/>}   label="Budget Payroll"    value={`Rp${idr(s.totalExpenses)}`}  badge={s.pendingPayroll>0?`${s.pendingPayroll} pending`:null} badgeOk={s.pendingPayroll===0} color="var(--warning)"   bg="var(--warning-light)"  loading={loading}/>
        <StatCard icon={<Star size={20} strokeWidth={2}/>}     label="Rata-rata Rating"    value={s.avgEvalScore??'—'} badge={s.pendingEvals>0?`${s.pendingEvals} pending`:null} badgeOk={s.pendingEvals===0} color="#f59e0b"  bg="rgba(245,158,11,0.1)"  loading={loading}/>
      </div>

      {/* ── Row 1.5: Today Attendance Summary ── */}
      <div style={{marginBottom:'var(--sp-4)'}}>
        <TodayAttendanceWidget
          data={dash?.todayAttendanceSummary}
          loading={loading}
          stats={s}
        />
      </div>

      {/* ── Row 2: Chart + Attendance Monitor ── */}
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.6fr) minmax(0,1fr)',gap:'var(--sp-4)',marginBottom:'var(--sp-4)'}}>
        <AttendanceChart data={dash?.weeklyAttendance} loading={loading}/>
        <AttendanceMonitor data={dash?.recentAttendance} loading={loading}/>
      </div>

      {/* ── Row 3: Evaluation + Survey + HR Tasks ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'var(--sp-4)',marginBottom:'var(--sp-4)'}}>
        <EvaluationWidget data={{avgScore:s.avgEvalScore, pending:s.pendingEvals}} loading={loading}/>
        <SurveyWidget data={{active:s.activeSurveys, responses:s.totalResponses}} loading={loading}/>
        <HRTasksWidget/>
      </div>

      {/* ── Row 4: Program Distributions (Jenjang & Bidang) ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(2, 1fr)',gap:'var(--sp-4)',marginBottom:'var(--sp-4)'}}>
        <div className="card">
          <h3 style={{fontWeight:700,fontSize:'0.95rem',display:'flex',alignItems:'center',gap:6,marginBottom:'1rem'}}>
            <GraduationCap size={16} strokeWidth={2} style={{color:'var(--primary)'}}/>
            Distribusi Jenjang (Aktif & Selesai)
          </h3>
          <JenjangChart data={dash?.byJenjang} loading={loading}/>
        </div>
        <div className="card">
          <h3 style={{fontWeight:700,fontSize:'0.95rem',display:'flex',alignItems:'center',gap:6,marginBottom:'1rem'}}>
            <BarChart3 size={16} strokeWidth={2} style={{color:'var(--primary)'}}/>
            Distribusi Bidang (Aktif & Selesai)
          </h3>
          <BidangChart data={dash?.byBidang} loading={loading}/>
        </div>
      </div>

      {/* ── Row 5: Demographic Analytics (Historical) ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:'var(--sp-4)',marginBottom:'var(--sp-4)'}}>
        <GenderWidget data={dash?.byGender} loading={loading}/>
        <ListChart 
          title="Top Jurusan" 
          icon={<ListChecks size={16} strokeWidth={2} style={{color:'var(--primary)'}}/>} 
          color="var(--primary)" 
          data={dash?.byMajor} 
          loading={loading}
        />
        <ListChart 
          title="Sekolah/Kampus" 
          icon={<GraduationCap size={16} strokeWidth={2} style={{color:'var(--secondary)'}}/>} 
          color="var(--secondary)" 
          data={dash?.byUniversity} 
          loading={loading}
        />
      </div>

      {/* ── Row 6: Quick Actions & Feed ── */}
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.2fr) minmax(0,1.8fr)',gap:'var(--sp-4)',marginBottom:'var(--sp-4)'}}>
        <QuickActions/>
        <ActivityFeed data={dash?.activityFeed} loading={loading}/>
      </div>

      {/* ── Row 7: Announcements + Events + Expiring ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3, minmax(0,1fr))',gap:'var(--sp-4)',marginBottom:'var(--sp-4)'}}>
        <AnnouncementsWidget/>
        <EventsWidget/>
        <ExpiringWidget data={dash?.expiringInterns} loading={loading}/>
      </div>

      {/* ── Row 6: Excel Import ── */}
      <div style={{marginBottom:'var(--sp-4)'}}>
        <ExcelImportWidget/>
      </div>

      {/* ── Row 6: Recent Interns (full width) ── */}
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
          <h3 style={{fontWeight:700,fontSize:'0.95rem'}}>Pendaftaran Terbaru</h3>
          <a href="/interns" className="btn btn-secondary btn-sm" style={{textDecoration:'none',fontSize:'0.78rem'}}>Lihat Semua</a>
        </div>
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Nama</th><th>Instansi</th><th>Jurusan</th><th>Status</th></tr></thead>
            <tbody>
              {loading
                ? [...Array(4)].map((_,i)=><tr key={i}>{[0,1,2,3].map(j=><td key={j}><div style={{height:12,width:'80%',background:'var(--border)',borderRadius:4,animation:'pulse 1.4s ease-in-out infinite'}}/></td>)}</tr>)
                : dash?.recentInterns?.length===0
                  ? <tr><td colSpan={4} style={{textAlign:'center',color:'var(--text-muted)',padding:'1.5rem'}}>Belum ada data intern.</td></tr>
                  : dash?.recentInterns?.map(i=>(
                      <tr key={i.id}>
                        <td style={{fontWeight:600,fontSize:'0.875rem'}}>{i.name}</td>
                        <td style={{color:'var(--text-secondary)',fontSize:'0.82rem'}}>{i.university}</td>
                        <td style={{color:'var(--text-secondary)',fontSize:'0.82rem'}}>{i.major} <small style={{color:'var(--text-muted)'}}>/ {i.jenjang}</small></td>
                        <td><span className={`badge ${i.status==='ACTIVE'?'badge-success':i.status==='COMPLETED'?'badge-primary':'badge-warning'}`}>{i.status}</span></td>
                      </tr>
                    ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Role Switcher (Preview Mode) ── */}
      <RoleSwitcher />

      <style jsx>{`
        @keyframes slideUp { from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1} }
        @keyframes scaleUp { from{transform:scale(0.97);opacity:0}to{transform:scale(1);opacity:1} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes pulse   { 0%,100%{opacity:1}50%{opacity:0.35} }
        @media(max-width:900px){
          .stat-grid{grid-template-columns:repeat(2,1fr)!important}
        }
        @media(max-width:640px){
          .stat-grid{grid-template-columns:1fr!important}
        }
      `}</style>
    </div>
  )
}

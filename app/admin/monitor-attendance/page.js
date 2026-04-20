'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Activity, Clock, MapPin, CheckCircle, AlertTriangle,
  XCircle, X, Camera, RefreshCw, Eye, EyeOff, Heart, Loader2
} from 'lucide-react'

/* ── Photo Lightbox ──────────────────────────────────────────── */
function PhotoLightbox({ src, name, type, onClose }) {
  const [imgError, setImgError] = useState(false)
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.93)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '1rem', cursor: 'zoom-out',
      animation: 'fadeIn 0.18s ease'
    }}>
      <div onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: '1rem' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: type.includes('In') || type.includes('in') ? '#22c55e' : '#6366f1' }} />
          <p style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>{name}</p>
          <span style={{
            fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99,
            background: type.includes('In') || type.includes('in') ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.2)',
            color: type.includes('In') || type.includes('in') ? '#22c55e' : '#818cf8',
            border: `1px solid ${type.includes('In') || type.includes('in') ? '#22c55e44' : '#6366f144'}`
          }}>{type}</span>
        </div>
        {imgError ? (
          <div style={{ padding: '2rem', background: 'var(--bg-main)', borderRadius: 16, border: '2px dashed var(--danger)'}}>
             <AlertTriangle size={32} style={{color: 'var(--danger)', margin: '0 auto 10px'}}/>
             <p style={{color: 'var(--text-primary)'}}>Gagal memuat foto preview.</p>
             <p style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>URL/Base64 rusak atau tidak valid.</p>
          </div>
        ) : (
          <img src={src} alt={`Foto ${name}`} onError={() => setImgError(true)} style={{
            maxWidth: 'min(92vw, 480px)', maxHeight: '74vh',
            borderRadius: 20, objectFit: 'contain',
            boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
            border: '3px solid rgba(255,255,255,0.12)'
          }} />
        )}
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.74rem', marginTop: '0.875rem' }}>
          Tekan ESC atau klik area gelap untuk menutup
        </p>
      </div>
    </div>
  )
}

/* ── Lazy Photo Thumbnail ────────────────────────────────────── */
/**
 * LazyPhoto: shows placeholder until user hovers → triggers photo load.
 * Supports both direct URL (Supabase Storage) and lazy Base64 fetch via API.
 */
function LazyPhoto({ directUrl, logId, type, label, borderColor, name, onPreview }) {
  const [src,     setSrc]     = useState(directUrl || null)
  const [loading, setLoading] = useState(false)
  const [tried,   setTried]   = useState(!!directUrl) // if directUrl given, already loaded
  const fetchedRef = useRef(false)

  // If directUrl arrives after initial render, update src
  useEffect(() => {
    if (directUrl && !src) { setSrc(directUrl); setTried(true) }
  }, [directUrl])

  const loadPhoto = useCallback(async () => {
    if (tried || fetchedRef.current || !logId) return
    fetchedRef.current = true
    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/attendance/photo?logId=${logId}&type=${type}`)
      const data = await res.json()
      if (data.url) setSrc(data.url)
    } catch (_) {}
    finally { setLoading(false); setTried(true) }
  }, [logId, type, tried])

  const hasPhoto = !!src
  const canLoad  = !tried && !!logId

  return (
    <div
      style={{
        position: 'relative', width: 52, height: 52, borderRadius: 12,
        overflow: 'hidden', background: 'var(--bg-main)', flexShrink: 0,
        border: `2.5px solid ${hasPhoto ? borderColor : canLoad ? `${borderColor}55` : 'var(--border)'}`,
        cursor: hasPhoto ? 'zoom-in' : canLoad ? 'pointer' : 'default',
        transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.2s',
      }}
      onClick={() => {
        if (hasPhoto) { onPreview(src, type === 'in' ? 'Clock-In ☀️' : 'Clock-Out 🌙') }
        else if (canLoad) { loadPhoto() }
      }}
      onMouseEnter={e => {
        if (hasPhoto) {
          e.currentTarget.style.transform = 'scale(1.1)'
          e.currentTarget.style.boxShadow = `0 4px 18px ${borderColor}55`
        } else if (canLoad && !loading) {
          loadPhoto()
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = 'none'
      }}
      title={hasPhoto ? `Klik untuk preview foto ${label}` : canLoad ? `Arahkan kursor untuk memuat foto ${label}` : `Tidak ada foto ${label}`}
    >
      {/* Photo / Placeholder */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Loader2 size={18} style={{ color: borderColor, animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : hasPhoto ? (
        <img src={src} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: canLoad ? 0.6 : 0.25 }}>
          {type === 'in' ? <Camera size={18} style={{ color: borderColor }} /> : <Clock size={16} style={{ color: borderColor }} />}
        </div>
      )}

      {/* Badge label */}
      <div style={{
        position: 'absolute', bottom: 2, left: 2, fontSize: '7px', fontWeight: 900,
        color: '#fff', borderRadius: 3, padding: '1px 3px', lineHeight: '11px',
        background: hasPhoto ? borderColor : tried ? 'rgba(107,114,128,0.5)' : `${borderColor}88`,
        letterSpacing: '0.02em'
      }}>{label}</div>

      {/* Hover hint for lazy load */}
      {canLoad && !loading && !hasPhoto && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${borderColor}15`, opacity: 0, transition: 'opacity 0.2s',
          fontSize: '7px', color: borderColor, fontWeight: 800, textAlign: 'center',
          padding: 3, lineHeight: 1.3
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0}
        >
          Klik muat foto
        </div>
      )}
    </div>
  )
}

/* ── Status Config ──────────────────────────────────────────── */
const STATUS_CFG = {
  PRESENT: { label: 'Hadir',  icon: CheckCircle,   color: '#22c55e', bg: 'rgba(34,197,94,0.07)',  border: '#22c55e33' },
  LATE:    { label: 'Telat',  icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.07)', border: '#f59e0b33' },
  SAKIT:   { label: 'Sakit',  icon: Heart,         color: '#ef4444', bg: 'rgba(239,68,68,0.07)',  border: '#ef444433' },
  IZIN:    { label: 'Izin',   icon: Eye,           color: '#6366f1', bg: 'rgba(99,102,241,0.07)', border: '#6366f133' },
  ABSENT:  { label: 'Absen',  icon: XCircle,       color: '#6b7280', bg: 'rgba(107,114,128,0.04)',border: '#6b728022' },
}

/* ── Main Page ──────────────────────────────────────────────── */
export default function MonitorAbsensiPage() {
  const [liveData,     setLiveData]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filterBidang, setFilterBidang] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [search,       setSearch]       = useState('')
  const [lastUpdate,   setLastUpdate]   = useState(null)
  const [lightbox,     setLightbox]     = useState(null)
  const [showAbsent,   setShowAbsent]   = useState(true)

  // Corrections
  const [pendingCorrections, setPendingCorrections] = useState([])
  const [showCorrections, setShowCorrections] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchCorrections = useCallback(() => {
    fetch('/api/attendance/correction')
      .then(r => r.json())
      .then(d => setPendingCorrections(d.requests || []))
      .catch(console.error)
  }, [])

  const handleAction = async (id, action) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/attendance/correction', {
        method: 'PATCH', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id, action }) // reviewedBy defaults to 'Admin HR' in backend if omitted here
      })
      if (res.ok) {
        fetchCorrections()
        fetchLive()
      } else {
        const err = await res.json()
        alert(err.error || 'Gagal merubah status')
      }
    } finally {
      setActionLoading(false)
    }
  }

  const fetchLive = useCallback(() => {
    fetch('/api/admin/attendance/live?_t=' + Date.now())
      .then(r => r.json())
      .then(d => {
        setLiveData(d.live || [])
        setLastUpdate(new Date())
        setLoading(false)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    fetchLive()
    fetchCorrections()
    const iv = setInterval(() => { fetchLive(); fetchCorrections(); }, 30000)
    return () => clearInterval(iv)
  }, [fetchLive, fetchCorrections])

  const bidangList = ['ALL', ...new Set(liveData.map(i => i.bidang).filter(Boolean))]

  const filtered = liveData.filter(i => {
    if (!showAbsent && i.status === 'ABSENT') return false
    if (filterBidang !== 'ALL' && i.bidang !== filterBidang) return false
    if (filterStatus !== 'ALL' && i.status !== filterStatus) return false
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = {
    present:   liveData.filter(i => i.status === 'PRESENT').length,
    late:      liveData.filter(i => i.status === 'LATE').length,
    sakit:     liveData.filter(i => i.status === 'SAKIT').length,
    izin:      liveData.filter(i => i.status === 'IZIN').length,
    absent:    liveData.filter(i => i.status === 'ABSENT').length,
    total:     liveData.length,
    withPhoto: liveData.filter(i => i.faceInUrl || i.hasBase64In).length,
  }

  return (
    <>
      {lightbox && (
        <PhotoLightbox
          src={lightbox.src} name={lightbox.name} type={lightbox.type}
          onClose={() => setLightbox(null)}
        />
      )}

      <div style={{ padding: '1.5rem', maxWidth: 1300, margin: '0 auto' }}>
        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Activity size={22} style={{ color: 'var(--primary)' }} /> Monitor Absensi Real-time
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.3rem', fontSize: '0.875rem' }}>
              Pantau kehadiran intern hari ini. Arahkan kursor ke kotak foto untuk memuat, klik untuk preview penuh.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {pendingCorrections.length > 0 && (
              <button onClick={() => setShowCorrections(true)} style={{
                display: 'flex', alignItems: 'center', gap: 5, background: 'var(--danger)',
                border: 'none', borderRadius: 8, padding: '6px 12px',
                fontSize: '0.8rem', fontWeight: 800, color: '#fff', cursor: 'pointer', animation: 'livePulseRed 2s infinite'
              }}>
                <AlertTriangle size={14} /> Permintaan Koreksi ({pendingCorrections.length})
              </button>
            )}
            <button onClick={() => { fetchLive(); fetchCorrections(); }} style={{
              display: 'flex', alignItems: 'center', gap: 5, background: 'none',
              border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px',
              fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer'
            }}>
              <RefreshCw size={14} /> Refresh
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: 999, border: '1px solid var(--border)' }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: '#22c55e', animation: 'livePulse 2s infinite' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#22c55e' }}>LIVE</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                | {lastUpdate ? lastUpdate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem' }}>
            <div className="loading-spinner" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Memuat data live...</p>
          </div>
        ) : (
          <>
            {/* ── Stat Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {[
                { label: 'TOTAL AKTIF', val: stats.total,     color: 'var(--text-muted)',  icon: '👥' },
                { label: 'HADIR',       val: stats.present,   color: '#22c55e',            icon: '✅' },
                { label: 'TERLAMBAT',   val: stats.late,      color: '#f59e0b',            icon: '⏰' },
                { label: 'SAKIT',       val: stats.sakit,     color: '#ef4444',            icon: '🤒' },
                { label: 'IZIN',        val: stats.izin,      color: '#6366f1',            icon: '📋' },
                { label: 'ABSEN',       val: stats.absent,    color: '#6b7280',            icon: '❌' },
                { label: 'ADA FOTO',    val: stats.withPhoto, color: 'var(--primary)',     icon: '📸' },
              ].map(s => (
                <div key={s.label} className="card" style={{ padding: '0.875rem', borderTop: `3px solid ${s.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: '0.62rem', fontWeight: 800, color: s.color, letterSpacing: '0.05em' }}>{s.label}</p>
                      <p style={{ fontSize: '1.7rem', fontWeight: 900, color: s.color, lineHeight: 1.1, marginTop: 2 }}>{s.val}</p>
                    </div>
                    <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Filters ── */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="text" placeholder="🔍 Cari nama intern..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: 180, maxWidth: 280, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
              <select value={filterBidang} onChange={e => setFilterBidang(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                {bidangList.map(b => <option key={b} value={b}>{b === 'ALL' ? 'Semua Bidang' : b}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {['ALL','PRESENT','LATE','SAKIT','IZIN','ABSENT'].map(s => {
                  const cfg = s === 'ALL' ? { color: 'var(--primary)', label: 'Semua' } : (STATUS_CFG[s] || { color: '#6b7280', label: s })
                  const active = filterStatus === s
                  return (
                    <button key={s} onClick={() => setFilterStatus(s)} style={{
                      padding: '5px 11px', borderRadius: 99, fontSize: '0.74rem', fontWeight: 700,
                      border: `1px solid ${active ? cfg.color : 'var(--border)'}`,
                      background: active ? cfg.color : 'transparent',
                      color: active ? '#fff' : cfg.color, cursor: 'pointer', transition: 'all 0.15s'
                    }}>{cfg.label}</button>
                  )
                })}
              </div>
              <button onClick={() => setShowAbsent(p => !p)} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'transparent',
                fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer'
              }}>
                {showAbsent ? <Eye size={14}/> : <EyeOff size={14}/>}
                {showAbsent ? 'Sembunyikan Absen' : 'Tampilkan Absen'}
              </button>
            </div>

            {/* ── Feed Table ── */}
            <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
              {/* Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '116px 1fr 1fr 155px 130px',
                gap: '0.5rem', padding: '0.7rem 1.25rem',
                background: 'var(--bg-main)', borderBottom: '1px solid var(--border)',
                fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)',
                letterSpacing: '0.06em', textTransform: 'uppercase'
              }}>
                <span>Foto IN / OUT</span>
                <span>Nama Intern</span>
                <span>Bidang</span>
                <span style={{ textAlign: 'right' }}>Waktu &amp; Lokasi</span>
                <span style={{ textAlign: 'center' }}>Status</span>
              </div>

              {filtered.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Tidak ada intern yang cocok dengan filter.
                </div>
              ) : filtered.map((item, idx) => {
                const cfg  = STATUS_CFG[item.status] || STATUS_CFG.ABSENT
                const Icon = cfg.icon
                const showTime = item.status !== 'ABSENT' && item.status !== 'SAKIT' && item.status !== 'IZIN'

                return (
                  <div key={item.internId} style={{
                    display: 'grid', gridTemplateColumns: '116px 1fr 1fr 155px 130px',
                    gap: '0.5rem', padding: '0.75rem 1.25rem', alignItems: 'center',
                    borderBottom: idx !== filtered.length - 1 ? '1px solid var(--border)' : 'none',
                    borderLeft: `3px solid ${cfg.color}`,
                    background: cfg.bg, transition: 'filter 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.07)'}
                    onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
                  >
                    {/* ── Col 1: Face Photos ── */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <LazyPhoto
                        directUrl={item.faceInUrl}
                        logId={item.hasBase64In ? item.logId : null}
                        type="in" label="IN"
                        borderColor="#22c55e"
                        name={item.name}
                        onPreview={(src, type) => setLightbox({ src, type, name: item.name })}
                      />
                      <LazyPhoto
                        directUrl={item.faceOutUrl}
                        logId={item.hasBase64Out ? item.logId : null}
                        type="out" label="OUT"
                        borderColor="#6366f1"
                        name={item.name}
                        onPreview={(src, type) => setLightbox({ src, type, name: item.name })}
                      />
                    </div>

                    {/* ── Col 2: Name ── */}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 800, fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </p>
                      <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                        {(item.faceInUrl  || item.hasBase64In)  && <span style={{ fontSize: '0.62rem', color: '#22c55e', fontWeight: 800 }}>📸 IN</span>}
                        {(item.faceOutUrl || item.hasBase64Out) && <span style={{ fontSize: '0.62rem', color: '#6366f1', fontWeight: 800 }}>📸 OUT</span>}
                      </div>
                    </div>

                    {/* ── Col 3: Bidang ── */}
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.bidang || '-'}
                    </p>

                    {/* ── Col 4: Time & Loc ── */}
                    <div style={{ textAlign: 'right' }}>
                      {showTime ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', fontSize: '0.85rem', fontWeight: 700 }}>
                            <Clock size={13} />
                            IN {item.checkIn ? new Date(item.checkIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </div>
                          {item.checkOut && (
                            <div style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 700 }}>
                              OUT {new Date(item.checkOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                          {item.checkInLoc && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              <MapPin size={10} />
                              <span style={{ maxWidth: 115, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.checkInLoc}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: cfg.color, fontWeight: 700 }}>
                          {item.status === 'SAKIT' ? '🤒 Laporan Sakit' : item.status === 'IZIN' ? '📋 Sedang Izin' : '—'}
                        </span>
                      )}
                    </div>

                    {/* ── Col 5: Status ── */}
                    <div style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                        borderRadius: 99, fontWeight: 800, fontSize: '0.78rem',
                        color: cfg.color, background: `${cfg.color}18`, border: `1px solid ${cfg.color}44`
                      }}>
                        <Icon size={13} strokeWidth={2.5} /> {cfg.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Menampilkan {filtered.length} dari {liveData.length} intern · Arahkan kursor ke kotak foto untuk memuat, klik untuk preview penuh
            </p>
          </>
        )}
      </div>

      {showCorrections && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: 750, padding: '2rem', animation: 'fadeIn 0.2s', maxHeight: '90vh', overflowY: 'auto' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
               <h3 style={{ fontWeight: 800 }}>Daftar Permintaan Koreksi Susulan</h3>
               <button onClick={() => setShowCorrections(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20}/></button>
             </div>
             {pendingCorrections.length === 0 ? <p style={{color: 'var(--text-muted)'}}>Tidak ada permintaan.</p> : (
               <div className="table-container">
                 <table className="table">
                   <thead><tr><th>Tgl</th><th>Intern</th><th>Tipe</th><th>Jam</th><th>Alasan</th><th>Aksi</th></tr></thead>
                   <tbody>
                     {pendingCorrections.map(c => (
                       <tr key={c.id}>
                         <td style={{fontSize: '0.8rem'}}>{new Date(c.date + 'T00:00:00').toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}</td>
                         <td style={{fontWeight: 700, fontSize: '0.85rem'}}>{c.internName}</td>
                         <td><span className={`badge ${c.type === 'IN' ? 'badge-success' : 'badge-primary'}`}>{c.type === 'IN' ? 'Masuk' : 'Pulang'}</span></td>
                         <td style={{fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem'}}>{c.time}</td>
                         <td style={{fontSize: '0.75rem', maxWidth: 150, whiteSpace: 'normal'}}>{c.reason}</td>
                         <td>
                           <div style={{display: 'flex', gap: 6}}>
                             <button className="btn btn-primary" style={{padding: '5px 10px', fontSize: '0.7rem', gap: 4}} disabled={actionLoading} onClick={() => handleAction(c.id, 'APPROVE')}><CheckCircle size={12}/> Terima</button>
                             <button className="btn btn-secondary" style={{padding: '5px 10px', fontSize: '0.7rem', gap: 4, background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5'}} disabled={actionLoading} onClick={() => handleAction(c.id, 'REJECT')}><XCircle size={12}/> Tolak</button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes livePulse {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          70%  { box-shadow: 0 0 0 7px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        @keyframes livePulseRed {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          70%  { box-shadow: 0 0 0 7px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin   { to   { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}

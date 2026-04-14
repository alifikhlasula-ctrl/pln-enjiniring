'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Activity, Clock, MapPin, CheckCircle, AlertTriangle,
  XCircle, Camera, RefreshCw, Eye, EyeOff, Heart
} from 'lucide-react'

/* ── Photo Lightbox ──────────────────────────────────────────── */
function PhotoLightbox({ src, name, type, onClose }) {
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
        background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1rem', cursor: 'zoom-out',
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          marginBottom: '1rem'
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: type.includes('In') ? '#22c55e' : '#6366f1'
          }} />
          <p style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 800, fontSize: '1.1rem' }}>
            {name}
          </p>
          <span style={{
            fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px',
            borderRadius: 99, background: type.includes('In') ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.2)',
            color: type.includes('In') ? '#22c55e' : '#818cf8',
            border: `1px solid ${type.includes('In') ? '#22c55e44' : '#6366f144'}`
          }}>
            {type}
          </span>
        </div>
        <img
          src={src} alt={`Foto ${name}`}
          style={{
            maxWidth: 'min(92vw, 460px)', maxHeight: '72vh',
            borderRadius: 20, objectFit: 'contain',
            boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
            border: '3px solid rgba(255,255,255,0.12)'
          }}
        />
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', marginTop: '0.875rem' }}>
          ESC atau klik area gelap untuk menutup
        </p>
      </div>
    </div>
  )
}

/* ── Face Photo Pair (Clock-In + Clock-Out) ─────────────────── */
function FacePair({ faceInUrl, faceOutUrl, name, onPreview }) {
  const hasIn  = !!faceInUrl
  const hasOut = !!faceOutUrl

  const thumbStyle = (color, has) => ({
    position: 'relative',
    width: 52, height: 52,
    borderRadius: 12,
    overflow: 'hidden',
    background: 'var(--bg-main)',
    border: `2.5px solid ${has ? color : 'var(--border)'}`,
    flexShrink: 0,
    cursor: has ? 'zoom-in' : 'default',
    transition: 'transform 0.15s, box-shadow 0.15s',
  })

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {/* Clock-In */}
      <div
        style={thumbStyle('#22c55e', hasIn)}
        onClick={() => hasIn && onPreview(faceInUrl, 'Clock-In ☀️')}
        title={hasIn ? 'Klik untuk preview foto masuk' : 'Belum clock-in / tidak ada foto'}
        onMouseEnter={e => { if (hasIn) { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(34,197,94,0.4)' } }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
      >
        {hasIn ? (
          <img src={faceInUrl} alt="IN" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Camera size={20} style={{ position: 'absolute', top: 14, left: 16, color: 'var(--text-muted)', opacity: 0.4 }} />
        )}
        {/* IN badge */}
        <div style={{
          position: 'absolute', bottom: 2, left: 2,
          fontSize: '7px', fontWeight: 900, color: '#fff',
          background: hasIn ? '#22c55e' : 'rgba(107,114,128,0.5)',
          borderRadius: 3, padding: '1px 3px', lineHeight: '11px',
          letterSpacing: '0.02em'
        }}>IN</div>
      </div>

      {/* Clock-Out */}
      <div
        style={thumbStyle('#6366f1', hasOut)}
        onClick={() => hasOut && onPreview(faceOutUrl, 'Clock-Out 🌙')}
        title={hasOut ? 'Klik untuk preview foto pulang' : 'Belum clock-out / tidak ada foto'}
        onMouseEnter={e => { if (hasOut) { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.4)' } }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
      >
        {hasOut ? (
          <img src={faceOutUrl} alt="OUT" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Clock size={18} style={{ position: 'absolute', top: 15, left: 17, color: 'var(--text-muted)', opacity: 0.4 }} />
        )}
        {/* OUT badge */}
        <div style={{
          position: 'absolute', bottom: 2, left: 2,
          fontSize: '7px', fontWeight: 900, color: '#fff',
          background: hasOut ? '#6366f1' : 'rgba(107,114,128,0.5)',
          borderRadius: 3, padding: '1px 3px', lineHeight: '11px',
          letterSpacing: '0.02em'
        }}>OUT</div>
      </div>
    </div>
  )
}

/* ── Status Config ──────────────────────────────────────────── */
const STATUS_CFG = {
  PRESENT: { label: 'Hadir',  icon: CheckCircle,     color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  border: '#22c55e33' },
  LATE:    { label: 'Telat',  icon: AlertTriangle,   color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: '#f59e0b33' },
  SAKIT:   { label: 'Sakit',  icon: Heart,           color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: '#ef444433' },
  IZIN:    { label: 'Izin',   icon: Eye,             color: '#6366f1', bg: 'rgba(99,102,241,0.08)', border: '#6366f133' },
  ABSENT:  { label: 'Absen',  icon: XCircle,         color: '#6b7280', bg: 'rgba(107,114,128,0.04)',border: '#6b728022' },
}

/* ── Main Page ──────────────────────────────────────────────── */
export default function MonitorAbsensiPage() {
  const [liveData,    setLiveData]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [filterBidang,setFilterBidang]= useState('ALL')
  const [filterStatus,setFilterStatus]= useState('ALL')
  const [search,      setSearch]      = useState('')
  const [lastUpdate,  setLastUpdate]  = useState(null)
  const [lightbox,    setLightbox]    = useState(null) // { src, name, type }
  const [showAbsent,  setShowAbsent]  = useState(true)

  const fetchLive = useCallback(() => {
    fetch('/api/admin/attendance/live?_t=' + Date.now())
      .then(res => res.json())
      .then(d => {
        setLiveData(d.live || [])
        setLastUpdate(new Date())
        setLoading(false)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    fetchLive()
    const interval = setInterval(fetchLive, 30000)
    return () => clearInterval(interval)
  }, [fetchLive])

  const bidangList = ['ALL', ...new Set(liveData.map(i => i.bidang).filter(Boolean))]

  const filtered = liveData.filter(i => {
    if (!showAbsent && i.status === 'ABSENT') return false
    if (filterBidang !== 'ALL' && i.bidang !== filterBidang) return false
    if (filterStatus !== 'ALL' && i.status !== filterStatus) return false
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = {
    present: liveData.filter(i => i.status === 'PRESENT').length,
    late:    liveData.filter(i => i.status === 'LATE').length,
    sakit:   liveData.filter(i => i.status === 'SAKIT').length,
    izin:    liveData.filter(i => i.status === 'IZIN').length,
    absent:  liveData.filter(i => i.status === 'ABSENT').length,
    total:   liveData.length,
    withPhoto: liveData.filter(i => i.faceInUrl).length,
  }

  const handlePreview = (src, type, name) => setLightbox({ src, type, name })

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
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Activity size={22} style={{ color: 'var(--primary)' }} /> Monitor Absensi Real-time
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
              Pantau kehadiran intern hari ini secara langsung. Klik foto untuk preview penuh. Diperbarui otomatis tiap 30 detik.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={fetchLive}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.875rem', marginBottom: '1.25rem' }}>
              {[
                { label: 'TOTAL AKTIF',  val: stats.total,     color: 'var(--text-secondary)', icon: '👥' },
                { label: 'HADIR',        val: stats.present,   color: '#22c55e',  icon: '✅' },
                { label: 'TERLAMBAT',    val: stats.late,      color: '#f59e0b',  icon: '⏰' },
                { label: 'SAKIT',        val: stats.sakit,     color: '#ef4444',  icon: '🤒' },
                { label: 'IZIN',         val: stats.izin,      color: '#6366f1',  icon: '📋' },
                { label: 'ABSEN',        val: stats.absent,    color: '#6b7280',  icon: '❌' },
                { label: 'ADA FOTO',     val: stats.withPhoto, color: 'var(--primary)', icon: '📸' },
              ].map(s => (
                <div key={s.label} className="card" style={{ padding: '1rem', borderTop: `3px solid ${s.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: '0.65rem', fontWeight: 800, color: s.color, letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</p>
                      <p style={{ fontSize: '1.6rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</p>
                    </div>
                    <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Filters ── */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text" placeholder="🔍 Cari nama intern..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: 200, maxWidth: 300, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
              <select value={filterBidang} onChange={e => setFilterBidang(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                {bidangList.map(b => <option key={b} value={b}>{b === 'ALL' ? 'Semua Bidang' : b}</option>)}
              </select>
              {/* Status filter pills */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {['ALL', 'PRESENT', 'LATE', 'SAKIT', 'IZIN', 'ABSENT'].map(s => {
                  const cfg = s === 'ALL' ? { color: 'var(--primary)', label: 'Semua' } : (STATUS_CFG[s] || { color: '#6b7280', label: s })
                  return (
                    <button key={s} onClick={() => setFilterStatus(s)} style={{
                      padding: '5px 11px', borderRadius: 99,
                      border: `1px solid ${filterStatus === s ? cfg.color : 'var(--border)'}`,
                      background: filterStatus === s ? cfg.color : 'transparent',
                      color: filterStatus === s ? '#fff' : 'var(--text-secondary)',
                      fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                    }}>
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
              {/* Toggle Absent */}
              <button onClick={() => setShowAbsent(p => !p)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: showAbsent ? 'var(--bg-main)' : 'rgba(107,114,128,0.15)',
                fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer'
              }}>
                {showAbsent ? <Eye size={14}/> : <EyeOff size={14}/>}
                {showAbsent ? 'Sembunyikan Absen' : 'Tampilkan Absen'}
              </button>
            </div>

            {/* ── Live Feed Table ── */}
            <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr 1fr 160px 140px',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                background: 'var(--bg-main)',
                borderBottom: '1px solid var(--border)',
                fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
                letterSpacing: '0.06em', textTransform: 'uppercase'
              }}>
                <span>Foto (IN / OUT)</span>
                <span>Nama Intern</span>
                <span>Bidang</span>
                <span style={{ textAlign: 'right' }}>Waktu & Lokasi</span>
                <span style={{ textAlign: 'center' }}>Status</span>
              </div>

              {/* Rows */}
              {filtered.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Tidak ada intern yang cocok dengan filter.
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const cfg = STATUS_CFG[item.status] || STATUS_CFG.ABSENT
                  const Icon = cfg.icon
                  const hasFaceIn  = !!item.faceInUrl
                  const hasFaceOut = !!item.faceOutUrl

                  return (
                    <div
                      key={item.internId}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '110px 1fr 1fr 160px 140px',
                        gap: '0.5rem',
                        padding: '0.875rem 1.25rem',
                        alignItems: 'center',
                        borderBottom: idx !== filtered.length - 1 ? '1px solid var(--border)' : 'none',
                        background: cfg.bg,
                        borderLeft: `3px solid ${cfg.color}`,
                        transition: 'filter 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.08)'}
                      onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
                    >
                      {/* ── Col 1: Photos ── */}
                      <FacePair
                        faceInUrl={item.faceInUrl}
                        faceOutUrl={item.faceOutUrl}
                        name={item.name}
                        onPreview={(src, type) => handlePreview(src, type, item.name)}
                      />

                      {/* ── Col 2: Name ── */}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </p>
                        {(hasFaceIn || hasFaceOut) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                            {hasFaceIn  && <span style={{ fontSize: '0.62rem', color: '#22c55e', fontWeight: 800 }}>📸 IN</span>}
                            {hasFaceOut && <span style={{ fontSize: '0.62rem', color: '#6366f1', fontWeight: 800, marginLeft: hasFaceIn ? 4 : 0 }}>📸 OUT</span>}
                          </div>
                        )}
                      </div>

                      {/* ── Col 3: Bidang ── */}
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.bidang || '-'}
                      </p>

                      {/* ── Col 4: Time & Location ── */}
                      <div style={{ textAlign: 'right' }}>
                        {item.status !== 'ABSENT' && item.status !== 'SAKIT' && item.status !== 'IZIN' ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
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
                                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.checkInLoc}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: cfg.color, fontWeight: 700 }}>
                            {item.status === 'SAKIT' ? '🤒 Laporan Sakit' : item.status === 'IZIN' ? '📋 Sedang Izin' : '—'}
                          </span>
                        )}
                      </div>

                      {/* ── Col 5: Status Badge ── */}
                      <div style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '5px 12px', borderRadius: 99, fontWeight: 800, fontSize: '0.78rem',
                          color: cfg.color, background: `${cfg.color}18`,
                          border: `1px solid ${cfg.color}44`
                        }}>
                          <Icon size={13} strokeWidth={2.5} />
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Menampilkan {filtered.length} dari {liveData.length} intern aktif · Klik foto untuk preview penuh
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes livePulse {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          70%  { box-shadow: 0 0 0 7px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
      `}</style>
    </>
  )
}

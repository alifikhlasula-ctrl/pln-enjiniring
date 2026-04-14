'use client'

import React, { useState, useEffect } from 'react'
import { Activity, Clock, MapPin, CheckCircle, AlertTriangle, AlertCircle, XCircle } from 'lucide-react'

export default function MonitorAbsensiPage() {
  const [liveData, setLiveData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterBidang, setFilterBidang] = useState('ALL')
  const [search, setSearch] = useState('')
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchLive = () => {
    fetch('/api/admin/attendance/live?_t=' + Date.now())
      .then(res => res.json())
      .then(d => {
        setLiveData(d.live || [])
        setLastUpdate(new Date())
        setLoading(false)
      })
      .catch(console.error)
  }

  useEffect(() => {
    fetchLive()
    const interval = setInterval(fetchLive, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])

  const filtered = liveData.filter(i => {
    if (filterBidang !== 'ALL' && i.bidang !== filterBidang) return false
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = {
    present: liveData.filter(i => i.status === 'PRESENT').length,
    late: liveData.filter(i => i.status === 'LATE').length,
    absent: liveData.filter(i => i.status === 'ABSENT').length,
    total: liveData.length
  }

  const bidangList = ['ALL', ...new Set(liveData.map(i => i.bidang).filter(Boolean))]

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity className="text-primary" /> Monitor Absensi Real-time
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            Pantau kehadiran intern hari ini secara langsung. Diperbarui otomatis tiap 30 detik.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: 999, border: '1px solid var(--border)' }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--success)', animation: 'pulse 2s infinite' }}></div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>LIVE</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            | Update terakhir: {lastUpdate ? lastUpdate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second:'2-digit' }) : '-'}
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
        </div>
      ) : (
        <>
          {/* Stats Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--text-muted)', display: 'flex', flexDir: 'column', gap: '0.25rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL INTERN AKTIF</p>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>{stats.total}</h2>
            </div>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)', display: 'flex', flexDir: 'column', gap: '0.25rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>HADIR TEPAT WAKTU</p>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>{stats.present}</h2>
            </div>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--warning)', display: 'flex', flexDir: 'column', gap: '0.25rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--warning)' }}>TERLAMBAT</p>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>{stats.late}</h2>
            </div>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--danger)', display: 'flex', flexDir: 'column', gap: '0.25rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger)' }}>BELUM HADIR / ABSEN</p>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>{stats.absent}</h2>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="Cari nama intern..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field"
              style={{ maxWidth: 300, flex: 1 }}
            />
            <select 
              value={filterBidang}
              onChange={e => setFilterBidang(e.target.value)}
              className="select-item"
              style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
            >
              {bidangList.map(b => (
                <option key={b} value={b}>{b === 'ALL' ? 'Semua Bidang' : b}</option>
              ))}
            </select>
          </div>

          {/* Feed */}
          <div className="card" style={{ border: '1px solid var(--border)' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-main)', fontWeight: 700 }}>
              Live Feed Status ({filtered.length})
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada data yang cocok dengan filter.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filtered.map((item, idx) => (
                  <div key={item.internId} style={{ 
                    display: 'flex', alignItems: 'center', justifyItems: 'center', gap: '1.5rem', 
                    padding: '1rem 1.5rem', borderBottom: idx !== filtered.length - 1 ? '1px solid var(--border-light)' : 'none',
                    transition: 'background 0.2s', ':hover': { background: 'var(--bg-main)' },
                    background: item.status === 'LATE' ? 'var(--warning-light-alpha)' : 'var(--bg-card)'
                  }}>
                    {/* Status Icon */}
                    <div style={{ flexShrink: 0 }}>
                      {item.status === 'PRESENT' && <CheckCircle size={24} color="var(--success)" />}
                      {item.status === 'LATE' && <AlertTriangle size={24} color="var(--warning)" />}
                      {item.status === 'ABSENT' && <XCircle size={24} color="var(--danger)" />}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{item.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.bidang || '-'}</p>
                    </div>

                    {/* Time & Location */}
                    {item.status !== 'ABSENT' ? (
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', fontSize: '0.875rem', fontWeight: 600 }}>
                          <Clock size={14} color="var(--text-muted)" />
                          IN {new Date(item.checkIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          {item.checkOut ? ` • OUT ${new Date(item.checkOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </div>
                        {item.checkInLoc && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <MapPin size={12} /> {item.checkInLoc}
                          </div>
                        )}
                        {item.faceInBase64 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end', fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 800 }}>
                            <Activity size={10} /> Face Verified
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: 'var(--danger)', fontStyle: 'italic' }}>
                        Belum Absen
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
      `}</style>
    </div>
  )
}

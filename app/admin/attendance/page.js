'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Clock, Camera, MapPin, CheckCircle2, XCircle, AlertTriangle,
  Edit3, Save, X, ChevronLeft, ChevronRight, BarChart3,
  Users, CalendarDays, Filter, RefreshCw, UserCheck, UserX, Timer,
  TrendingUp, Eye, Pencil
} from 'lucide-react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement
} from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso) {
  if (!iso) return '--:--'
  try { return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) }
  catch { return '--:--' }
}

function fmtTimeRaw(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  } catch { return '' }
}

function fmtDate(dateStr) {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return dateStr }
}

function getStatusConfig(status) {
  switch (status) {
    case 'PRESENT': return { label: 'Hadir',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   dot: '#22c55e' }
    case 'LATE':    return { label: 'Terlambat', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  dot: '#f59e0b' }
    case 'ABSENT':  return { label: 'Alpa',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   dot: '#ef4444' }
    default:        return { label: status || '-', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', dot: '#6b7280' }
  }
}

function FacePhoto({ src, alt, size = 56 }) {
  const [err, setErr] = useState(false)
  if (!src || err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'var(--bg-main)', border: '2px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <Camera size={size * 0.35} color="var(--text-muted)" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt || 'Foto'}
      onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }}
    />
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ log, internName, onClose, onSave }) {
  const [checkIn,  setCheckIn]  = useState(log.checkIn  ? fmtTimeRaw(log.checkIn)  : '')
  const [checkOut, setCheckOut] = useState(log.checkOut ? fmtTimeRaw(log.checkOut) : '')
  const [status,   setStatus]   = useState(log.status || 'PRESENT')
  const [note,     setNote]     = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const body = {
        id: log.id,
        internId: log.internId,
        date: log.date,
        checkIn,
        checkOut,
        status,
        note
      }

      const res  = await fetch('/api/admin/attendance', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan')
      onSave(data.log)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 480, padding: '2rem', animation: 'slideUpFade 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Edit Absensi Manual</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{internName} · {fmtDate(log.date)}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label">Jam Masuk (Clock-In)</label>
            <input type="time" className="input" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label">Jam Pulang (Clock-Out)</label>
            <input type="time" className="input" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="label">Status Kehadiran</label>
          <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="PRESENT">Hadir</option>
            <option value="LATE">Terlambat</option>
            <option value="ABSENT">Alpa</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="label">Catatan / Alasan Edit</label>
          <input type="text" className="input" placeholder="Contoh: Intern lupa clock-out" value={note} onChange={e => setNote(e.target.value)} />
        </div>

        {log.editedBy && (
          <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.78rem', color: '#b45309' }}>
            ⚠️ Pernah diedit oleh <strong>{log.editedBy}</strong>
          </div>
        )}

        {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>❌ {error}</p>}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onClose} className="btn" style={{ flex: 1 }}>Batal</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Attendance Card ──────────────────────────────────────────────────────────

function AttendanceCard({ log, onEdit }) {
  const cfg       = getStatusConfig(log.status)
  const intern    = log.intern || {}
  const isEdited  = !!log.editedBy
  const hasIn     = !!log.checkIn
  const hasOut    = !!log.checkOut
  const faceIn    = log.faceInUrl  || (log.faceInBase64  ? (log.faceInBase64.startsWith('data:') ? log.faceInBase64 : `data:image/jpeg;base64,${log.faceInBase64}`)  : null)
  const faceOut   = log.faceOutUrl || (log.faceOutBase64 ? (log.faceOutBase64.startsWith('data:') ? log.faceOutBase64 : `data:image/jpeg;base64,${log.faceOutBase64}`) : null)

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${cfg.color}33`,
      borderRadius: 16,
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      position: 'relative',
      transition: 'box-shadow 0.2s',
    }}
    className="attendance-card"
    >
      {/* Header: Name + Status Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {intern.name || 'Unknown'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {intern.university || '-'} · {intern.bidang || '-'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {isEdited && (
            <span title={`Diedit oleh ${log.editedBy}`} style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b45309', background: 'rgba(245,158,11,0.15)', padding: '2px 7px', borderRadius: 99 }}>
              EDITED
            </span>
          )}
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: cfg.color, background: cfg.bg, padding: '4px 10px', borderRadius: 99 }}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Clock In / Clock Out row with face photos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {/* Clock In */}
        <div style={{ background: 'var(--bg-main)', borderRadius: 10, padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} /> Start Time
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FacePhoto src={faceIn} alt="Foto masuk" size={48} />
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: hasIn ? '#22c55e' : 'var(--text-muted)', letterSpacing: '-0.02em' }}>
                {hasIn ? fmtTime(log.checkIn) : '--:--'}
              </div>
              {log.checkInLoc && (
                <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 2, marginTop: 2 }}>
                  <MapPin size={9} /> {log.checkInLoc.length > 20 ? log.checkInLoc.slice(0, 20) + '…' : log.checkInLoc}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Clock Out */}
        <div style={{ background: 'var(--bg-main)', borderRadius: 10, padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} /> End Time
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FacePhoto src={faceOut} alt="Foto pulang" size={48} />
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: hasOut ? '#6366f1' : '#ef4444', letterSpacing: '-0.02em' }}>
                {hasOut ? fmtTime(log.checkOut) : '--:--'}
              </div>
              {log.checkOutLoc && (
                <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 2, marginTop: 2 }}>
                  <MapPin size={9} /> {log.checkOutLoc.length > 20 ? log.checkOutLoc.slice(0, 20) + '…' : log.checkOutLoc}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer row: Edit button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => onEdit(log)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: '1px solid var(--border)',
            borderRadius: 8, padding: '4px 12px',
            fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)',
            cursor: 'pointer', transition: 'all 0.15s'
          }}
          className="edit-btn-hover"
        >
          <Pencil size={13} /> Edit
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MonitorAbsensiPage() {
  const today = new Date(new Date().getTime() + 7*3600000).toISOString().split('T')[0]

  const [date,       setDate]       = useState(today)
  const [summary,    setSummary]    = useState([])
  const [allLogs,    setAllLogs]    = useState([])
  const [history,    setHistory]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [editLog,    setEditLog]    = useState(null)
  const [filterStatus, setFilter]  = useState('ALL')
  const [histDays,   setHistDays]  = useState(7)
  const [view,       setView]      = useState('cards') // 'cards' | 'chart'

  const load = useCallback(async (d) => {
    setLoading(true)
    try {
      const [sumRes, histRes] = await Promise.all([
        fetch(`/api/admin/attendance?date=${d}`),
        fetch(`/api/admin/attendance/stats?days=${histDays}`)
      ])
      const sumData  = await sumRes.json()
      const histData = await histRes.json()
      setSummary(sumData.todaySummary || [])
      setAllLogs(sumData.logs || [])
      setHistory(histData.history || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [histDays])

  useEffect(() => { load(date) }, [date, histDays])

  const filtered = filterStatus === 'ALL' ? summary : summary.filter(l => l.status === filterStatus)

  const stats = {
    hadir: summary.filter(l => l.status === 'PRESENT').length,
    telat: summary.filter(l => l.status === 'LATE').length,
    alpa:  summary.filter(l => l.status === 'ABSENT').length,
    total: summary.length
  }

  function handleEdit(log) { setEditLog(log) }
  function handleEditClose() { setEditLog(null) }
  function handleSaved(updatedLog) {
    setSummary(prev => prev.map(l => {
      if (l.internId === updatedLog.internId) {
        return { ...l, ...updatedLog, intern: l.intern }
      }
      return l
    }))
    setEditLog(null)
    load(date)
  }

  const prevDay = () => {
    const d = new Date(date); d.setDate(d.getDate() - 1)
    setDate(d.toISOString().split('T')[0])
  }
  const nextDay = () => {
    const d = new Date(date); d.setDate(d.getDate() + 1)
    const nd = d.toISOString().split('T')[0]
    if (nd <= today) setDate(nd)
  }

  // Chart data
  const pieData = {
    labels: ['Hadir', 'Terlambat', 'Alpa'],
    datasets: [{ data: [stats.hadir, stats.telat, stats.alpa], backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'], borderWidth: 0 }]
  }
  const barData = {
    labels: history.map(d => `${d.label} ${d.date.slice(5)}`),
    datasets: [
      { label: 'Hadir', data: history.map(d => d.count), backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 6 }
    ]
  }

  return (
    <>
      {editLog && (
        <EditModal
          log={editLog}
          internName={editLog.intern?.name || 'Intern'}
          onClose={handleEditClose}
          onSave={handleSaved}
        />
      )}

      <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
              <UserCheck size={26} style={{ color: 'var(--primary)' }} /> Monitor Absensi
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Pantau kehadiran, foto verifikasi, dan edit data absensi secara langsung
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => load(date)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              {[['cards', <Users size={14} />, 'Kartu'], ['chart', <BarChart3 size={14} />, 'Grafik']].map(([v, icon, label]) => (
                <button key={v} onClick={() => setView(v)} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
                  background: view === v ? 'var(--primary)' : 'transparent',
                  color: view === v ? '#fff' : 'var(--text-secondary)',
                  border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700
                }}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Date Navigator ── */}
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button onClick={prevDay} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={18} />
            </button>
            <input
              type="date" value={date} max={today}
              onChange={e => setDate(e.target.value)}
              style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', background: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.9rem' }}
            />
            <button onClick={nextDay} disabled={date >= today} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px', cursor: date >= today ? 'not-allowed' : 'pointer', color: date >= today ? 'var(--text-muted)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', opacity: date >= today ? 0.5 : 1 }}>
              <ChevronRight size={18} />
            </button>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{fmtDate(date)}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['ALL', 'PRESENT', 'LATE', 'ABSENT'].map(s => {
              const cfg = s === 'ALL' ? { label: 'Semua', color: 'var(--primary)' } : getStatusConfig(s)
              return (
                <button key={s} onClick={() => setFilter(s)} style={{
                  padding: '5px 12px', borderRadius: 99, border: `1px solid ${filterStatus === s ? cfg.color : 'var(--border)'}`,
                  background: filterStatus === s ? cfg.color : 'transparent',
                  color: filterStatus === s ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s'
                }}>
                  {cfg.label} {s !== 'ALL' && `(${s === 'PRESENT' ? stats.hadir : s === 'LATE' ? stats.telat : stats.alpa})`}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { icon: <Users size={20} />, label: 'Total Terdaftar', val: stats.total, color: '#6366f1' },
            { icon: <UserCheck size={20} />, label: 'Hadir', val: stats.hadir, color: '#22c55e' },
            { icon: <Timer size={20} />, label: 'Terlambat', val: stats.telat, color: '#f59e0b' },
            { icon: <UserX size={20} />, label: 'Alpa', val: stats.alpa, color: '#ef4444' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main Content: Cards or Chart View ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div className="loading-spinner" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Memuat data absensi...</p>
          </div>
        ) : view === 'cards' ? (
          <>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Menampilkan {filtered.length} dari {summary.length} intern
            </div>
            {filtered.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                <AlertTriangle size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Tidak ada data absensi untuk filter ini.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {filtered.map((log, idx) => (
                  <AttendanceCard key={log.id || `${log.internId}-${idx}`} log={log} onEdit={handleEdit} />
                ))}
              </div>
            )}
          </>
        ) : (
          // Chart View
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Tren Kehadiran</h3>
                <select value={histDays} onChange={e => setHistDays(Number(e.target.value))} style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
                  <option value={7}>7 Hari</option>
                  <option value={14}>14 Hari</option>
                  <option value={30}>30 Hari</option>
                </select>
              </div>
              <div style={{ height: 300 }}>
                <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} />
              </div>
            </div>
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem' }}>Distribusi Hari Ini</h3>
              <div style={{ height: 220 }}>
                <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
              </div>
              <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[['Hadir', stats.hadir, '#22c55e'], ['Terlambat', stats.telat, '#f59e0b'], ['Alpa', stats.alpa, '#ef4444']].map(([lbl, val, color]) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                      {lbl}
                    </span>
                    <strong style={{ color }}>{val} ({stats.total ? Math.round(val * 100 / stats.total) : 0}%)</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .attendance-card:hover { box-shadow: 0 4px 24px rgba(0,0,0,0.15); }
        .edit-btn-hover:hover { border-color: var(--primary) !important; color: var(--primary) !important; }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}

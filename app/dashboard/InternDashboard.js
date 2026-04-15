'use client'
import React, { useState, useCallback } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { useAuth } from '@/context/AuthContext'
import {
  Clock, CheckCircle2, CalendarDays, TrendingUp, Wallet,
  Megaphone, AlertCircle, BookOpen, Star, MapPin, Zap,
  BarChart3, ArrowRight, RefreshCw, Loader2, Target,
  Plus, Trash2, Edit2, CheckCircle, Pin
} from 'lucide-react'
import { EVENT_TYPES, ANNOUNCEMENT_PRIORITIES } from '@/lib/constants'

/* ── Helpers ─────────────────────────────────────── */
const idr = v => 'Rp ' + new Intl.NumberFormat('id-ID').format(v || 0)
const fmtDate = d => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
const fmtTime = d => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'
const timeAgo = ts => {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (s < 60) return `${s}d lalu`
  if (s < 3600) return `${Math.floor(s / 60)}m lalu`
  if (s < 86400) return `${Math.floor(s / 3600)}j lalu`
  return fmtDate(ts)
}
const MOODS = [{ emoji: '😄', label: 'Semangat', val: 'GREAT' }, { emoji: '😊', label: 'Baik', val: 'GOOD' }, { emoji: '😐', label: 'Biasa', val: 'OKAY' }, { emoji: '😞', label: 'Kurang', val: 'BAD' }, { emoji: '😫', label: 'Lelah', val: 'TIRED' }]


/* ── Attendance Streak Bar ────────────────────────── */
function StreakBar({ data }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', justifyContent: 'center' }}>
      {(data || []).map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: '100%', height: 36, borderRadius: 6,
            background: !d.hadir ? 'var(--border)' : d.status === 'LATE' ? 'var(--warning-light)' : 'var(--secondary-light)',
            border: `2px solid ${!d.hadir ? 'var(--border)' : d.status === 'LATE' ? 'var(--warning)' : 'var(--secondary)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
            transition: 'all 0.2s'
          }} title={d.date}>
            {d.hadir ? (d.status === 'LATE' ? '⏰' : '✓') : '–'}
          </div>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>{d.day}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Status Picker: Hadir / Sakit / Izin ────────── */
function StatusPicker({ userId, onStatusSaved }) {
  const [mode,    setMode]    = useState(null) // 'SAKIT' | 'IZIN' | null
  const [reason,  setReason]  = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const handleReport = async (statusType) => {
    if (statusType === 'HADIR') {
      window.location.href = '/attendance'
      return
    }
    setSaving(true); setError('')
    try {
      const res  = await fetch('/api/attendance/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, statusType, reason })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal melapor')
      setMode(null); setReason('')
      if (onStatusSaved) onStatusSaved()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  if (mode) {
    return (
      <div style={{ background: mode === 'SAKIT' ? 'var(--danger-light)' : 'var(--primary-light)', borderRadius: 10, padding: '0.75rem' }}>
        <p style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: mode === 'SAKIT' ? 'var(--danger)' : 'var(--primary)' }}>
          {mode === 'SAKIT' ? '🤒 Laporan Sakit' : '📋 Laporan Izin'}
        </p>
        <input
          type="text" className="input" placeholder={`Keterangan ${mode === 'SAKIT' ? 'sakit' : 'izin'}...`}
          value={reason} onChange={e => setReason(e.target.value)}
          style={{ marginBottom: 8, fontSize: '0.82rem' }}
        />
        {error && <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginBottom: 6 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => { setMode(null); setError('') }} className="btn btn-sm" style={{ flex: 1, fontSize: '0.8rem' }}>Batal</button>
          <button onClick={() => handleReport(mode)} disabled={saving} className="btn btn-primary btn-sm" style={{ flex: 2, fontSize: '0.8rem' }}>
            {saving ? 'Menyimpan...' : `Kirim Laporan ${mode}`}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 8 }}>Pilih status kehadiran Anda hari ini:</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <button onClick={() => handleReport('HADIR')} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          padding: '0.6rem 0.25rem', borderRadius: 10, border: '2px solid #22c55e',
          background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer'
        }}>
          📸 <span>Hadir</span>
        </button>
        <button onClick={() => setMode('SAKIT')} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          padding: '0.6rem 0.25rem', borderRadius: 10, border: '2px solid #ef4444',
          background: '#fee2e2', color: '#b91c1c', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer'
        }}>
          🤒 <span>Sakit</span>
        </button>
        <button onClick={() => setMode('IZIN')} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          padding: '0.6rem 0.25rem', borderRadius: 10, border: '2px solid #6366f1',
          background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer'
        }}>
          📋 <span>Izin</span>
        </button>
      </div>
    </div>
  )
}

/* ── Main InternDashboard Component ─────────────── */
export default function InternDashboard() {
  const { user } = useAuth()
  const [moodSaving, setMoodSaving] = useState(false)
  const [selectedMood, setSelectedMood] = useState(null)

  // SWR automatically handles caching, loading state, and deduplication.
  // It pauses fetching when user.id is null (e.g. auth still loading).
  const { data: dash, error: swrError, isLoading: loading, mutate: fetchDash } = useSWR(
    user?.id ? `/api/intern-dashboard?userId=${user.id}` : null,
    fetcher,
    {
      refreshInterval: 60000, 
      revalidateOnFocus: true,
      onSuccess: (data) => {
        // Sync local selected mood with DB on initial load
        if (data && data.todayMood && !selectedMood) setSelectedMood(data.todayMood)
      }
    }
  )

  const lastRefreshTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  const handleMood = async (val) => {
    if (moodSaving) return
    setMoodSaving(true)
    setSelectedMood(val)
    await fetch('/api/intern-dashboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, mood: val })
    })
    setMoodSaving(false)
  }

  const D = dash || {}
  const intern = D.intern || {}
  const stats = D.attendanceStats || {}
  const countdown = D.countdown || {}
  const today = D.todayAttendance || {}

  /* ── SWR Error State — show friendly card instead of crashing ── */
  if (swrError && !loading) {
    const isNotFound = swrError.status === 404
    const isTimeout  = swrError.status === 503
    return (
      <div style={{ padding: '3rem 1.5rem', maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          background: 'var(--bg-card)', border: '1.5px solid var(--border)',
          borderRadius: 20, padding: '2.5rem 2rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.06)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            {isNotFound ? '🔍' : isTimeout ? '⏳' : '⚠️'}
          </div>
          <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            {isNotFound ? 'Profil Tidak Ditemukan' : isTimeout ? 'Server Sedang Sibuk' : 'Gagal Memuat Dashboard'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '1.5rem' }}>
            {isNotFound
              ? 'Data profil magang Anda belum terdaftar di sistem. Silakan hubungi Admin HR.'
              : isTimeout
              ? 'Koneksi ke database sedang lambat. Halaman akan dimuat ulang otomatis.'
              : 'Terjadi kesalahan saat memuat data. Coba muat ulang halaman.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={() => fetchDash()}
            >
              🔄 Coba Lagi
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => window.location.reload()}
            >
              ↺ Muat Ulang Halaman
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Today Status Color ─────────────────────────── */
  const todayStatus = today.checkedIn
    ? today.checkedOut ? { label: 'Sudah Pulang', color: 'var(--text-muted)', bg: 'var(--border)', icon: '🏠' }
    : { label: 'Sedang Hadir', color: 'var(--secondary)', bg: 'var(--secondary-light)', icon: '🟢' }
    : { label: 'Belum Absen', color: 'var(--warning)', bg: 'var(--warning-light)', icon: '⏳' }


  return (
    <div style={{ animation: 'slideUp 0.3s ease' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="title">Portal Saya 👋</h1>
          <p className="subtitle">Selamat datang, <strong>{loading ? '...' : intern.name}</strong> — {intern.bidang || 'Peserta Magang'}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Status: {loading ? 'Memperbarui...' : `Live (${lastRefreshTime})`}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchDash()} disabled={loading}>
            <RefreshCw size={14} strokeWidth={2} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* ── Daily Mood Check ── */}
      <div className="card" style={{ marginBottom: 'var(--sp-4)', background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%)', border: '1px solid var(--primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>🌤 Bagaimana perasaan Anda hari ini?</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Mood check dilaporkan secara anonim ke HR</p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {MOODS.map(m => (
              <button key={m.val} onClick={() => handleMood(m.val)} title={m.label}
                style={{
                  background: selectedMood === m.val ? 'var(--primary)' : 'white',
                  border: `2px solid ${selectedMood === m.val ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '6px 10px', cursor: 'pointer', fontSize: 20,
                  transition: 'all 0.18s', transform: selectedMood === m.val ? 'scale(1.15)' : 'scale(1)',
                  boxShadow: selectedMood === m.val ? '0 4px 12px rgba(99,102,241,0.3)' : 'none'
                }}>
                {m.emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 1: Stat Cards ── */}
      <div className="stat-grid" style={{ marginBottom: 'var(--sp-4)' }}>
        {/* Today Status */}
        <div className="stat-card" style={{ cursor: 'default' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-3)' }}>
            <div className="stat-icon-wrap" style={{ background: todayStatus.bg, color: todayStatus.color }}>
              <Clock size={20} strokeWidth={2} />
            </div>
            <span style={{ fontSize: '1.4rem' }}>{todayStatus.icon}</span>
          </div>
          {loading ? <div style={{ height: 28, width: '60%', background: 'var(--border)', borderRadius: 4, animation: 'pulse 1.4s ease-in-out infinite' }} /> : (
            <div className="stat-value" style={{ fontSize: '1rem', color: todayStatus.color }}>{todayStatus.label}</div>
          )}
          <div className="stat-label">Status Hari Ini{today.checkInTime ? ` · ${fmtTime(today.checkInTime)}` : ''}</div>
        </div>

        {/* Discipline Score */}
        <div className="stat-card" style={{ cursor: 'default' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-3)' }}>
            <div className="stat-icon-wrap" style={{ background: (stats.onTimeRate || 0) >= 90 ? 'var(--success-light)' : (stats.onTimeRate || 0) >= 75 ? 'var(--primary-light)' : 'var(--danger-light)', color: (stats.onTimeRate || 0) >= 90 ? 'var(--success)' : (stats.onTimeRate || 0) >= 75 ? 'var(--primary)' : 'var(--danger)' }}>
              <Star size={20} strokeWidth={2} />
            </div>
            <span className={`badge`} style={{ background: (stats.onTimeRate || 0) >= 90 ? 'var(--success-light)' : (stats.onTimeRate || 0) >= 75 ? 'var(--primary-light)' : 'var(--danger-light)', color: (stats.onTimeRate || 0) >= 90 ? 'var(--success)' : (stats.onTimeRate || 0) >= 75 ? 'var(--primary)' : 'var(--danger)' }}>
              {(stats.onTimeRate || 0) >= 90 ? 'EXCELLENT' : (stats.onTimeRate || 0) >= 75 ? 'GOOD' : 'NEEDS IMPROVEMENT'}
            </span>
          </div>
          {loading ? <div style={{ height: 28, width: '60%', background: 'var(--border)', borderRadius: 4, animation: 'pulse 1.4s ease-in-out infinite' }} /> : (
            <div className="stat-value">{stats.onTimeRate || 0}<span style={{fontSize:'1rem', color:'var(--text-muted)', marginLeft:4}}>Skor</span></div>
          )}
          <div className="stat-label">Total Kehadiran: {stats.presentDays || 0} hari · {stats.lateDays || 0} telat</div>
        </div>

        {/* Allowance */}
        <div className="stat-card" style={{ cursor: 'default' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-3)' }}>
            <div className="stat-icon-wrap" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}><Wallet size={20} strokeWidth={2} /></div>
            <span className={`badge ${D.allowanceInfo?.status === 'PAID' ? 'badge-success' : 'badge-warning'}`}>{D.allowanceInfo?.status || 'PENDING'}</span>
          </div>
          {loading ? <div style={{ height: 28, width: '70%', background: 'var(--border)', borderRadius: 4, animation: 'pulse 1.4s ease-in-out infinite' }} /> : (
            <div className="stat-value" style={{ fontSize: '1.1rem' }}>{idr(D.allowanceInfo?.totalAllowance)}</div>
          )}
          <div className="stat-label">Allowance {D.allowanceInfo?.period || '-'}</div>
        </div>

        {/* Countdown */}
        <div className="stat-card" style={{ cursor: 'default' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-3)' }}>
            <div className="stat-icon-wrap" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}><Target size={20} strokeWidth={2} /></div>
            <span className="badge badge-primary">{countdown.progressPct || 0}%</span>
          </div>
          {loading ? <div style={{ height: 28, width: '50%', background: 'var(--border)', borderRadius: 4, animation: 'pulse 1.4s ease-in-out infinite' }} /> : (
            <div className="stat-value">{countdown.daysRemaining ?? '–'}</div>
          )}
          <div className="stat-label">Hari Tersisa Magang</div>
        </div>
      </div>

      {/* ── Row 2: Absen Hari Ini + Streak Mingguan ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr)', gap: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
        {/* Today Card — REVAMPED with Hadir/Sakit/Izin */}
        <div className="card">
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1rem' }}>
            <Clock size={16} strokeWidth={2} style={{ color: 'var(--secondary)' }} /> Absensi Hari Ini
          </h3>
          {loading ? <div style={{ height: 80, background: 'var(--border)', borderRadius: 8, animation: 'pulse 1.4s ease-in-out infinite' }} /> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: today.checkedIn ? 'var(--secondary-light)' : 'var(--bg-main)', border: `1px solid ${today.checkedIn ? 'var(--secondary)' : 'var(--border)'}`, textAlign: 'center' }}>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>CHECK IN</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: 800, color: today.checkedIn ? 'var(--secondary)' : 'var(--text-muted)' }}>{today.checkedIn ? fmtTime(today.checkInTime) : '–:––'}</p>
                  {today.status && <span className={`badge ${today.status === 'LATE' ? 'badge-warning' : today.status === 'SAKIT' ? 'badge-danger' : today.status === 'IZIN' ? 'badge-primary' : 'badge-success'}`} style={{ fontSize: '0.6rem', marginTop: 4 }}>{today.status}</span>}
                </div>
                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: today.checkedOut ? 'var(--danger-light)' : 'var(--bg-main)', border: `1px solid ${today.checkedOut ? 'var(--danger)' : 'var(--border)'}`, textAlign: 'center' }}>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>CHECK OUT</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: 800, color: today.checkedOut ? 'var(--danger)' : 'var(--text-muted)' }}>{today.checkedOut ? fmtTime(today.checkOutTime) : '–:––'}</p>
                </div>
              </div>
              {today.checkInLoc && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: '0.75rem' }}>
                  <MapPin size={11} /> {today.checkInLoc}
                </div>
              )}

              {/* ── Status Picker: Hadir / Sakit / Izin ── */}
              {!today.checkedIn && !['SAKIT','IZIN'].includes(today.status) ? (
                <StatusPicker userId={user?.id} onStatusSaved={fetchDash} />
              ) : today.checkedIn && !today.checkedOut ? (
                <a href="/attendance" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }}>
                  🟢 Lakukan Check Out
                </a>
              ) : ['SAKIT','IZIN'].includes(today.status) ? (
                <div style={{ textAlign: 'center', padding: '0.5rem', background: 'var(--primary-light)', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)' }}>
                  ✓ Status {today.status} sudah tercatat hari ini
                </div>
              ) : (
                <a href="/attendance" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }}>
                  ✓ Lihat Detail Absensi
                </a>
              )}
            </>
          )}
        </div>

        {/* Weekly Streak */}
        <div className="card">
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart3 size={16} strokeWidth={2} style={{ color: 'var(--primary)' }} /> Streak 7 Hari
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{stats.onTimeRate || 0}% tepat waktu</span>
          </h3>
          {loading ? <div style={{ height: 60, background: 'var(--border)', borderRadius: 8, animation: 'pulse 1.4s ease-in-out infinite' }} /> : (
            <>
              <StreakBar data={D.weeklyStreak} />
              <div style={{ display: 'flex', gap: 12, marginTop: '0.75rem', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--secondary)' }} /> Tepat Waktu
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--warning)' }} /> Terlambat
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--border)' }} /> Tidak Hadir
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Row 3: Progress Magang + Allowance Detail ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
        {/* Countdown bar */}
        <div className="card">
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1rem' }}>
            <Target size={16} strokeWidth={2} style={{ color: 'var(--primary)' }} /> Progress Masa Magang
          </h3>
          {loading ? <div style={{ height: 60, background: 'var(--border)', borderRadius: 8, animation: 'pulse 1.4s ease-in-out infinite' }} /> : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Mulai: {fmtDate(intern.periodStart)}</span>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{countdown.progressPct || 0}% selesai</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Selesai: {fmtDate(intern.periodEnd)}</span>
              </div>
              <div style={{ width: '100%', height: 12, background: 'var(--bg-main)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: '1rem' }}>
                <div style={{ width: `${countdown.progressPct || 0}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', borderRadius: 'var(--radius-full)', transition: 'width 0.8s var(--ease-spring)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: 'Hari Berjalan', value: countdown.elapsedDays ?? '–', color: 'var(--primary)' },
                  { label: 'Hari Tersisa', value: countdown.daysRemaining ?? '–', color: countdown.daysRemaining <= 14 ? 'var(--danger)' : 'var(--secondary)' },
                  { label: 'Total Durasi', value: countdown.totalDuration ? `${countdown.totalDuration}h` : '–', color: 'var(--text-secondary)' },
                ].map((item, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '0.625rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', borderTop: `3px solid ${item.color}` }}>
                    <p style={{ fontSize: '1.35rem', fontWeight: 800, color: item.color }}>{item.value}</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Allowance Detail */}
        <div className="card">
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1rem' }}>
            <Wallet size={16} strokeWidth={2} style={{ color: 'var(--warning)' }} /> Status Allowance
          </h3>
          {loading ? <div style={{ height: 80, background: 'var(--border)', borderRadius: 8, animation: 'pulse 1.4s ease-in-out infinite' }} /> : (
            <>
              {[
                { label: 'Periode', value: D.allowanceInfo?.period || '-' },
                { label: 'Jumlah Hadir', value: `${D.allowanceInfo?.presenceCount || 0} hari` },
                { label: 'Tarif Harian', value: idr(D.allowanceInfo?.allowanceRate) },
                { label: 'Total', value: idr(D.allowanceInfo?.totalAllowance), bold: true },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: item.bold ? 800 : 600, color: item.bold ? 'var(--primary)' : 'var(--text-primary)' }}>{item.value}</span>
                </div>
              ))}
              <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                <span className={`badge ${D.allowanceInfo?.status === 'PAID' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.75rem', padding: '4px 12px' }}>
                  {D.allowanceInfo?.status === 'PAID' ? `✓ Dibayar ${fmtDate(D.allowanceInfo?.paidAt)}` : '⏳ Menunggu Pembayaran'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Row 4: Skill Tracker (Full Width) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={16} strokeWidth={2} style={{ color: '#8b5cf6' }} /> Skill Tracker
            </h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Klik nama skill untuk mengubah, atau kembangkan kompetensi baru Anda secara mandiri.</p>
          </div>
          <SkillTracker userId={user?.id} />
        </div>
      </div>

      {/* ── Row 5: Pengumuman + Jadwal Event ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
        {/* Announcements feed */}
        <div className="card">
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1rem' }}>
            <Megaphone size={16} strokeWidth={2} style={{ color: 'var(--primary)' }} /> Pengumuman HR
          </h3>
          {loading ? [...Array(2)].map((_, i) => <div key={i} style={{ height: 56, background: 'var(--border)', borderRadius: 8, marginBottom: 6, animation: 'pulse 1.4s ease-in-out infinite' }} />) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(D.announcements || []).length === 0
                ? <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>Belum ada pengumuman.</p>
                : (D.announcements || []).map(ann => {
                  const s = ANNOUNCEMENT_PRIORITIES[ann.priority] || ANNOUNCEMENT_PRIORITIES.INFO
                  return (
                    <div key={ann.id} style={{ 
                      padding: '0.875rem', borderRadius: 'var(--radius-lg)', 
                      background: ann.pinned ? 'var(--primary-light)' : 'var(--bg-main)', 
                      border: `1.5px solid ${ann.pinned ? 'var(--primary)' : 'var(--border)'}`,
                      position: 'relative'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        {ann.pinned && <Pin size={12} fill="var(--primary)" color="var(--primary)" />}
                        <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.62rem', fontWeight: 800, background: s.bg, color: s.color }}>{s.label}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>{ann.title}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{ann.content}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{timeAgo(ann.createdAt)} · {ann.createdBy}</span>
                        {ann.pinned && <span style={{ fontSize: '0.62rem', color: 'var(--primary)', fontWeight: 700 }}>DIPIN</span>}
                      </div>
                    </div>
                  )
                })
              }
            </div>
          )}
        </div>

        {/* Events Calendar */}
        <div className="card">
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1rem' }}>
            <CalendarDays size={16} strokeWidth={2} style={{ color: '#8b5cf6' }} /> Jadwal Mendatang
          </h3>
          {loading ? [...Array(3)].map((_, i) => <div key={i} style={{ height: 48, background: 'var(--border)', borderRadius: 8, marginBottom: 6, animation: 'pulse 1.4s ease-in-out infinite' }} />) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(D.events || []).length === 0
                ? <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>Belum ada jadwal mendatang.</p>
                : (D.events || []).map(ev => {
                  const typeInfo = EVENT_TYPES[ev.type] || EVENT_TYPES.GENERAL
                  const targetDate = new Date(ev.date); targetDate.setHours(0,0,0,0)
                  const todayDate = new Date(); todayDate.setHours(0,0,0,0)
                  const diff = Math.ceil((targetDate - todayDate) / 86400000)
                  
                  return (
                    <div key={ev.id} style={{ 
                      display: 'flex', gap: 12, padding: '0.75rem', borderRadius: 'var(--radius-md)', 
                      background: ev.type === 'HOLIDAY' ? '#fff1f2' : 'var(--bg-main)', 
                      borderLeft: `4px solid ${typeInfo.color}`,
                      border: ev.type === 'HOLIDAY' ? '1.5px solid #fecdd3' : '1px solid var(--border)'
                    }}>
                      <div style={{ 
                        width: 42, height: 42, borderRadius: 8, background: typeInfo.color + '15', 
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                      }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: typeInfo.color }}>{targetDate.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase()}</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: typeInfo.color, lineHeight: 1 }}>{targetDate.getDate()}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>{ev.title}</p>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{typeInfo.label} {ev.description ? `· ${ev.description}` : ''}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: diff === 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                          {diff === 0 ? 'HARI INI' : diff === 1 ? 'BESOK' : `${diff} HARI`}
                        </span>
                      </div>
                    </div>
                  )
                })
              }
            </div>
          )}
        </div>
      </div>

      {/* ── Row 6: Quick Actions + Onboarding ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
        {/* Quick Actions */}
        <div className="card">
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1rem' }}>
            <Zap size={16} strokeWidth={2} style={{ color: 'var(--warning)' }} /> Aksi Cepat
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            {[
              { icon: '📸', label: 'Absensi', href: '/attendance', color: 'var(--secondary)' },
              { icon: '📝', label: 'Laporan Harian', href: '/reports', color: 'var(--primary)' },
              { icon: '📊', label: 'Evaluasi Saya', href: '/reports', color: '#f59e0b' },
              { icon: '📂', label: 'Onboarding', href: '/onboarding', color: 'var(--warning)' },
            ].map(a => (
              <a key={a.label} href={a.href} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem',
                padding: '0.75rem 0.25rem', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', textDecoration: 'none',
                transition: 'all 0.18s', color: 'var(--text-primary)', background: 'var(--bg-main)'
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = a.color + '15' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-main)' }}>
                <span style={{ fontSize: 22 }}>{a.icon}</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, textAlign: 'center', color: 'var(--text-secondary)' }}>{a.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Onboarding Progress */}
        <div className="card">
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={16} strokeWidth={2} style={{ color: 'var(--primary)' }} /> Onboarding Saya
            </div>
            <a href="/onboarding" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', fontSize: '0.7rem' }}>Lihat</a>
          </h3>
          {loading ? <div style={{ height: 60, background: 'var(--border)', borderRadius: 8, animation: 'pulse 1.4s ease-in-out infinite' }} /> : (
            D.onboarding?.total === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>Belum ada dokumen onboarding.</p>
              : <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{D.onboarding?.done}/{D.onboarding?.total} Dokumen Disetujui</span>
                  <span style={{ fontWeight: 700 }}>{D.onboarding?.total ? Math.round((D.onboarding.done / D.onboarding.total) * 100) : 0}%</span>
                </div>
                <div style={{ height: 10, background: 'var(--border)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: '0.75rem' }}>
                  <div style={{ width: `${D.onboarding?.total ? (D.onboarding.done / D.onboarding.total) * 100 : 0}%`, height: '100%', background: 'var(--secondary)', borderRadius: 'var(--radius-full)', transition: 'width 0.5s' }} />
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  {D.onboarding?.done === D.onboarding?.total ? '✅ Semua dokumen selesai!' : `${D.onboarding?.total - D.onboarding?.done} dokumen perlu dilengkapi`}
                </p>
              </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp { from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1} }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.35} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @media(max-width:900px){
          .stat-grid{grid-template-columns:repeat(2,1fr)!important}
        }
      `}</style>
    </div>
  )
}

/* ── Skill Tracker Sub-component (Enhanced & Persistent) ── */
function SkillTracker({ userId }) {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newSkill, setNewSkill] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  const fetchSkills = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/intern-dashboard/skills?userId=${userId}`)
      const json = await res.json()
      setSkills(json.skills || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [userId])

  useEffect(() => { fetchSkills() }, [fetchSkills])

  const saveSkills = async (updated) => {
    setSaving(true)
    try {
      await fetch('/api/intern-dashboard/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, skills: updated })
      })
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const toggle = (id) => {
    const updated = skills.map(s => s.id === id ? { ...s, done: !s.done } : s)
    setSkills(updated)
    saveSkills(updated)
  }

  const addSkill = () => {
    if (!newSkill.trim()) return
    const s = { id: 's' + Date.now(), name: newSkill, done: false, cat: 'Personal' }
    const updated = [...skills, s]
    setSkills(updated)
    saveSkills(updated)
    setNewSkill('')
  }

  const deleteSkill = (id) => {
    const updated = skills.filter(s => s.id !== id)
    setSkills(updated)
    saveSkills(updated)
  }

  const startEdit = (s) => {
    setEditingId(s.id)
    setEditName(s.name)
  }

  const submitEdit = () => {
    if (!editName.trim()) return
    const updated = skills.map(s => s.id === editingId ? { ...s, name: editName } : s)
    setSkills(updated)
    saveSkills(updated)
    setEditingId(null)
  }

  if (loading) return <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={16} className="spin" /></div>

  const doneCount = skills.filter(s => s.done).length
  const pct = skills.length > 0 ? Math.round((doneCount / skills.length) * 100) : 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 6 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{doneCount}/{skills.length} skill dikuasai</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {saving && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Menyimpan...</span>}
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{pct}%</span>
        </div>
      </div>
      <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: '1.25rem' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #8b5cf6, var(--primary))', borderRadius: 4, transition: 'width 0.6s' }} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
        <input 
          type="text" className="input" placeholder="Tambah skill baru..." 
          style={{ height: 38, fontSize: '0.85rem' }} 
          value={newSkill} onChange={e => setNewSkill(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addSkill()}
        />
        <button className="btn btn-primary" style={{ padding: '0 12px' }} onClick={addSkill}>
          <Plus size={20} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
        {skills.map(s => (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '0.625rem 0.875rem',
            borderRadius: 'var(--radius-md)', background: s.done ? 'var(--secondary-light)' : 'var(--bg-main)',
            border: `1.5px solid ${s.done ? 'var(--secondary)' : 'var(--border)'}`,
            transition: 'all 0.18s ease-in-out'
          }}>
            <button onClick={() => toggle(s.id)} style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
              <div style={{ 
                width: 20, height: 20, borderRadius: 6, 
                border: `2px solid ${s.done ? 'var(--secondary)' : 'var(--border)'}`, 
                background: s.done ? 'var(--secondary)' : 'transparent', 
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {s.done && <CheckCircle size={14} strokeWidth={3} color="#fff" />}
              </div>
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              {editingId === s.id ? (
                <input 
                  autoFocus className="input" style={{ height: 28, fontSize: '0.8rem', padding: '0 6px' }}
                  value={editName} onChange={e => setEditName(e.target.value)}
                  onBlur={submitEdit} onKeyDown={e => e.key === 'Enter' && submitEdit()}
                />
              ) : (
                <p 
                    onDoubleClick={() => startEdit(s)}
                  style={{ 
                    fontSize: '0.85rem', fontWeight: 600, 
                    textDecoration: s.done ? 'line-through' : 'none', 
                    color: s.done ? 'var(--text-muted)' : 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}
                >
                  {s.name}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 2 }}>
              <button onClick={() => startEdit(s)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Edit">
                <Edit2 size={12} />
              </button>
              <button onClick={() => deleteSkill(s.id)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} onClickCapture={(e) => { e.stopPropagation(); deleteSkill(s.id) }} title="Hapus">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

'use client'
import React, { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { useAuth } from '@/context/AuthContext'
import {
  Clock, CheckCircle2, CalendarDays, TrendingUp, Wallet,
  Megaphone, AlertCircle, BookOpen, Star, MapPin, Zap,
  BarChart3, ArrowRight, RefreshCw, Loader2, Target,
  Plus, Trash2, Edit2, CheckCircle, Pin, Trophy, Award, Brain, Users, Heart
} from 'lucide-react'
import Swal from 'sweetalert2'
import { EVENT_TYPES, ANNOUNCEMENT_PRIORITIES } from '@/lib/constants'
import { messaging, getToken } from '@/lib/firebase'

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
// Format payroll period: "2026-03-13_2026-04-16" → "13 Mar – 16 Apr 2026"
const fmtPeriod = p => {
  if (!p) return '-'
  const parts = p.split('_')
  if (parts.length === 2) {
    const a = new Date(parts[0]), b = new Date(parts[1])
    if (!isNaN(a) && !isNaN(b)) {
      const optShort = { day: 'numeric', month: 'short' }
      const optFull  = { day: 'numeric', month: 'short', year: 'numeric' }
      return `${a.toLocaleDateString('id-ID', optShort)} – ${b.toLocaleDateString('id-ID', optFull)}`
    }
  }
  return p
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

/* ── Badges List Section ─────────────────────────── */
function BadgesSection({ badges, loading }) {
  const IconMap = { Award, Brain, Users, Zap, Target, Heart }
  const hasBadges = (badges || []).length > 0

  return (
    <div className="card" style={{ marginBottom: 'var(--sp-4)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h3 style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1.25rem' }}>
        <Trophy size={16} strokeWidth={2} style={{ color: '#f59e0b' }} /> Pencapaian & Badge Anda
      </h3>
      
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none', minHeight: hasBadges ? 'auto' : 80, alignItems: 'center' }}>
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} style={{ minWidth: 110, height: 100, background: 'var(--bg-main)', borderRadius: 16, animation: 'pulse 1.5s infinite' }} />
          ))
        ) : hasBadges ? (
          badges.map(badge => {
            const Icon = IconMap[badge.icon] || Award
            return (
              <div key={badge.id} style={{ 
                minWidth: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', 
                padding: '16px 12px', borderRadius: 16, background: 'var(--bg-main)',
                border: `1px solid var(--border)`, position: 'relative', overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                animation: 'fadeIn 0.5s ease forwards'
              }}>
                <div style={{ 
                  width: 44, height: 44, borderRadius: '50%', background: `${badge.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: badge.color,
                  marginBottom: 10, border: `1.5px solid ${badge.color}30`
                }}>
                  <Icon size={22} strokeWidth={2.5} />
                </div>
                <p style={{ fontSize: '0.72rem', fontWeight: 800, margin: 0, textAlign: 'center', color: 'var(--text-primary)' }}>{badge.name}</p>
                <p style={{ fontSize: '0.52rem', color: 'var(--text-muted)', marginTop: 4, textAlign: 'center', lineHeight: 1.2 }}>{badge.desc}</p>
              </div>
            )
          })
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--bg-main)', borderRadius: 12, border: '1px dashed var(--border)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Belum ada badge. Kumpulkan <b>Kudostars</b> dari rekan kerja untuk membuka badge pertama Anda! 🌟</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main InternDashboard Component ─────────────── */
export default function InternDashboard() {
  const { user } = useAuth()
  const [moodSaving, setMoodSaving] = useState(false)
  const [selectedMood, setSelectedMood] = useState(null)
  
  // Notification State
  const [pushEnabled, setPushEnabled] = useState(false)
  const [showPushPrompt, setShowPushPrompt] = useState(false)

  // Check Notification Permission & auto-sync FCM token
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (!user?.id) return

    const syncFcmToken = async () => {
      try {
        if (!messaging) {
          console.warn('[FCM] Firebase messaging not initialized')
          return
        }

        // Register the UNIFIED service worker (sw.js handles both FCM + PWA caching)
        const swReg = await navigator.serviceWorker.register('/sw.js')
        console.log('[FCM] Service worker registered:', swReg.scope)

        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: swReg
        })

        if (token) {
          console.log('[FCM] Token obtained, syncing to backend...')
          const res = await fetch('/api/intern/fcm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, fcmToken: token })
          })
          const data = await res.json()
          if (data.success) {
            console.log('[FCM] Token synced to backend successfully.')
          } else {
            console.error('[FCM] Backend returned error:', data.error)
          }
        } else {
          console.warn('[FCM] No token returned. Push permission may have been denied.')
        }
      } catch (err) {
        console.error('[FCM] Failed to sync token:', err)
      }
    }

    if (Notification.permission === 'granted') {
      setPushEnabled(true)
      syncFcmToken()
    } else if (Notification.permission === 'default') {
      const timer = setTimeout(() => setShowPushPrompt(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [user?.id])

  // 🎂 Birthday Greeting Pop-up
  useEffect(() => {
    if (!user?.id) return
    const bdKey = `bday_shown_${new Date().toISOString().split('T')[0]}_${user.id}`
    if (sessionStorage.getItem(bdKey)) return
    fetch(`/api/birthday-greeting?internId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        if (!data.isBirthday) return
        sessionStorage.setItem(bdKey, '1')
        import('sweetalert2').then(({ default: S }) => {
          S.fire({
            title: `🎂 Selamat Ulang Tahun, ${data.name}!`,
            html: `<div style="text-align:left;white-space:pre-wrap;font-size:0.92rem;line-height:1.7;color:inherit">${data.message}</div>`,
            background: 'linear-gradient(135deg, #1e1b4b 0%, #1a1035 100%)',
            color: '#fff',
            confirmButtonText: '🎉 Terima Kasih!',
            confirmButtonColor: '#f43f5e',
            showClass: { popup: 'animate__animated animate__bounceIn' },
            customClass: { popup: 'birthday-popup' },
            backdrop: `
              rgba(244,63,94,0.25)
              url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🎂%3C/text%3E%3C/svg%3E")
              left top
              no-repeat
            `
          })
        })
      })
      .catch(() => {})
  }, [user?.id])

  const handleEnablePush = async () => {
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setPushEnabled(true)
        setShowPushPrompt(false)
        
        // Get FCM Token using explicit service worker registration
        if (messaging) {
          const swReg = await navigator.serviceWorker.register('/sw.js')
          const token = await getToken(messaging, { 
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: swReg
          })
          
          if (token && user?.id) {
            // Save to DB
            await fetch('/api/intern/fcm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id, fcmToken: token })
            })
            Swal.fire({
              toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
              icon: 'success', title: 'Notifikasi diaktifkan!'
            })
          }
        }
      } else {
        setShowPushPrompt(false)
      }
    } catch (error) {
      console.error('Push setup failed:', error)
      setShowPushPrompt(false)
    }
  }

  // SWR automatically handles caching, loading state, and deduplication.
  // It pauses fetching when user.id is null (e.g. auth still loading).
  const { data: dash, error: swrError, isLoading: loading, mutate: fetchDash } = useSWR(
    user?.id ? `/api/intern-dashboard?userId=${user.id}` : null,
    fetcher,
    {
      refreshInterval: 300000, // 5 menit (menghemat egress)
      dedupingInterval: 60000, // jangan hit API ulang jika cache kurang dari 1 menit
      revalidateOnFocus: true,
      onSuccess: (data) => {
        // Sync local selected mood with DB on initial load
        if (data && data.todayMood && !selectedMood) setSelectedMood(data.todayMood)
      }
    }
  )

  const lastRefreshTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  // ── Auto Pop-up Logic (Welcome Summary & New Announcements) ──
  useEffect(() => {
    if (loading || !dash) return;

    const checkPopups = async () => {
      // 1. Welcome Summary Pop-up (Run once forever per device/browser)
      const welcomeKey = 'welcome_update_popup_v1';
      if (!localStorage.getItem(welcomeKey)) {
        await Swal.fire({
          title: '🚀 Rangkuman Update Sistem!',
          html: `
            <div style="text-align: left; font-size: 0.9rem; line-height: 1.6; color: var(--text-secondary);">
              <ul style="padding-left: 1.5rem; margin-bottom: 0;">
                <li style="margin-bottom: 8px;"><strong>⏱ Lupa Absen?</strong> Kini tersedia fitur <b>Pengajuan Perbaikan Absensi</b>.</li>
                <li style="margin-bottom: 8px;"><strong>📄 PDF Profesional:</strong> Laporan Harian & Evaluasi di-generate otomatis dengan format standar PLN Enjiniring.</li>
                <li style="margin-bottom: 8px;"><strong>⚡ Laporan Cepat:</strong> Tidak perlu ketik ulang nama Pembimbing & Bidang.</li>
                <li style="margin-bottom: 8px;"><strong>🎓 Portal Sertifikat:</strong> Unduh sertifikat kelulusan langsung di menu Evaluasi.</li>
                <li style="margin-bottom: 8px;"><strong>📂 Portofolio CV:</strong> Rangkuman pengalaman magang yang bisa dijadikan CV otomatis.</li>
                <li><strong>🟢 Status Kehadiran:</strong> Lapor Hadir/Izin/Sakit langsung di halaman depan Dashboard.</li>
              </ul>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Luar Biasa, Saya Mengerti!',
          confirmButtonColor: 'var(--primary)',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          width: '500px'
        });
        localStorage.setItem(welcomeKey, 'true');
        return; // Pause here so announcements don't stack immediately
      }

      // 2. Regular Announcements Pop-up
      if (dash.announcements && dash.announcements.length > 0) {
        let viewedStr = localStorage.getItem('viewed_announcements') || '[]';
        let viewedArr = [];
        try { viewedArr = JSON.parse(viewedStr) } catch(e) {}

        const unread = dash.announcements.filter(a => !viewedArr.includes(a.id));
        
        if (unread.length > 0) {
          // Show oldest unread first
          const ann = unread[unread.length - 1]; 
          const prio = ANNOUNCEMENT_PRIORITIES[ann.priority] || ANNOUNCEMENT_PRIORITIES.INFO;
          
          await Swal.fire({
            title: `<span style="font-size: 1rem; padding: 4px 12px; border-radius: 999px; background: ${prio.bg}; color: ${prio.color}">${prio.label}</span>`,
            html: `
              <div style="text-align: left; margin-top: 1rem;">
                <h3 style="font-weight: 800; font-size: 1.2rem; color: var(--text-primary); margin-bottom: 12px;">${ann.title}</h3>
                <p style="font-size: 0.95rem; color: var(--text-secondary); white-space: pre-wrap; line-height: 1.6;">${ann.content}</p>
              </div>
            `,
            icon: ann.priority === 'URGENT' ? 'warning' : 'info',
            confirmButtonText: 'Saya Mengerti',
            confirmButtonColor: 'var(--primary)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)'
          });

          viewedArr.push(ann.id);
          localStorage.setItem('viewed_announcements', JSON.stringify(viewedArr));
          
          // Trigger re-render to check for next unread if there's multiple
          fetchDash(); 
          return; // Stop here, don't show survey pop-up simultaneously
        }
      }
      
      // 3. Pending Surveys Pop-up
      if (dash.pendingSurveys && dash.pendingSurveys.length > 0) {
        let ignoredStr = sessionStorage.getItem('ignored_surveys') || '[]';
        let ignoredArr = [];
        try { ignoredArr = JSON.parse(ignoredStr) } catch(e) {}

        const pending = dash.pendingSurveys.filter(s => !ignoredArr.includes(s.id));
        
        if (pending.length > 0) {
          const survey = pending[0];
          const isMandatory = survey.isMandatory;
          const result = await Swal.fire({
            title: `<span style="font-size: 1rem; padding: 4px 12px; border-radius: 999px; background: ${isMandatory ? 'var(--danger-light)' : 'var(--primary-light)'}; color: ${isMandatory ? 'var(--danger)' : 'var(--primary)'}">${isMandatory ? '⚠️ Survei Wajib' : '📝 Survei Baru'}</span>`,
            html: `
              <div style="text-align: left; margin-top: 1rem;">
                <h3 style="font-weight: 800; font-size: 1.2rem; color: var(--text-primary); margin-bottom: 8px;">${survey.title}</h3>
                <p style="font-size: 0.95rem; color: var(--text-secondary); white-space: pre-wrap; line-height: 1.5;">${survey.description || 'Admin HR meminta waktu Anda sebentar untuk mengisi survei ini.'}</p>
                ${isMandatory ? `
                  <div style="margin-top: 1rem; padding: 10px; border-radius: 8px; background: var(--danger-light); border: 1px solid var(--danger)30; font-size: 0.82rem; color: var(--danger); font-weight: 700;">
                    Survei ini wajib diisi sebelum ${new Date(survey.deadline).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}. Jika terlewat, Skor Keaktifan Anda akan berkurang secara otomatis.
                  </div>
                ` : ''}
              </div>
            `,
            icon: isMandatory ? 'warning' : 'info',
            showCancelButton: true,
            confirmButtonText: isMandatory ? 'Isi Sekarang (Wajib)' : 'Isi Survei Sekarang',
            cancelButtonText: 'Nanti Saja',
            confirmButtonColor: isMandatory ? 'var(--danger)' : 'var(--primary)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)'
          });

          if (result.isConfirmed) {
            window.location.href = '/surveys';
          } else {
            // If they click "Nanti Saja", ignore it for this session so it doesn't annoy them on every click
            ignoredArr.push(survey.id);
            sessionStorage.setItem('ignored_surveys', JSON.stringify(ignoredArr));
          }
        }
      }

      // 4. Allowance Transferred Notification
      if (dash.allowanceInfo?.status === 'TRANSFERRED') {
        const allowanceKey = `allowance_popup_${dash.allowanceInfo.period}`;
        if (!sessionStorage.getItem(allowanceKey)) {
          await Swal.fire({
            title: '💸 Cek Rekening Anda!',
            text: 'Admin HR telah mengajukan/mentransfer uang saku Anda. Mohon cek mutasi rekening dan konfirmasi penerimaan di menu Allowance.',
            icon: 'info',
            confirmButtonText: 'Cek Allowance Sekarang',
            showCancelButton: true,
            cancelButtonText: 'Nanti Saja'
          }).then((result) => {
            if (result.isConfirmed) {
              window.location.href = '/payroll';
            } else {
              sessionStorage.setItem(allowanceKey, 'true');
            }
          });
        }
      }
    };

    // Add slight delay to ensure UI renders first
    const timer = setTimeout(() => { checkPopups() }, 800);
    return () => clearTimeout(timer);
  }, [loading, dash, fetchDash]);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.1rem, 4vw, 1.4rem)', fontWeight: 800, margin: 0 }}>Portal Saya 👋</h1>
          <p style={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)', color: 'var(--text-muted)', marginTop: 2 }}>
            Selamat datang, <strong style={{ color: 'var(--text-primary)' }}>{loading ? '...' : intern.name}</strong>
            {intern.bidang ? <> — <span style={{ color: 'var(--primary)' }}>{intern.bidang}</span></> : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {loading ? '⏳ Memperbarui...' : `🕐 ${lastRefreshTime}`}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchDash()} disabled={loading} title="Perbarui Data">
            <RefreshCw size={13} strokeWidth={2} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* ── Feature Update Announcement ── */}
      {!localStorage.getItem('hide_gamification_announce') && (
        <div className="card" style={{ 
          marginBottom: '1rem', 
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', 
          border: 'none', color: 'white', position: 'relative', overflow: 'hidden' 
        }}>
          <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}>
            <Trophy size={100} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <Zap size={18} fill="white" /> Update Fitur: Gamifikasi Intern!
            </h3>
            <p style={{ fontSize: '0.8rem', marginTop: 6, opacity: 0.9, lineHeight: 1.4 }}>
              Kumpulkan <b>Kudostars</b> dari rekan kerja dan tingkatkan <b>Skor Komposit</b> Anda untuk memuncaki Leaderboard. 
              Dapatkan pengakuan atas kontribusi terbaikmu!
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button onClick={() => { localStorage.setItem('hide_gamification_announce', 't'); window.dispatchEvent(new Event('storage')) }} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', fontWeight: 700 }}>Tutup</button>
              <a href="#leaderboard-section" className="btn btn-sm" style={{ background: 'white', color: '#6366f1', border: 'none', fontWeight: 800 }}>Lihat Leaderboard</a>
            </div>
          </div>
        </div>
      )}
      
      {/* ── Mandatory Survey Sticky Banner ── */}
      {D.pendingSurveys?.some(s => s.isMandatory) && (
        <div style={{
          background: 'var(--danger-light)', border: '1px solid var(--danger)40',
          padding: '10px 16px', borderRadius: 12, marginBottom: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          animation: 'pulse 2s infinite'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={18} color="var(--danger)" />
            <p style={{ fontSize: '0.82rem', color: 'var(--danger)', fontWeight: 700 }}>
              Perhatian: Anda memiliki survei wajib yang belum diselesaikan. Segera isi agar Skor Keaktifan tetap 100%.
            </p>
          </div>
          <a href="/surveys" className="btn btn-sm" style={{ background: 'var(--danger)', color: 'white', border: 'none', fontWeight: 800, padding:'4px 12px' }}>Isi Sekarang</a>
        </div>
      )}

      {/* ── Push Notification Prompt ── */}
      {showPushPrompt && (
        <div className="card" style={{ marginBottom: 'var(--sp-4)', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid var(--primary)', color: 'white', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: 250 }}>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <Megaphone size={18} /> Aktifkan Notifikasi Absensi
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4, lineHeight: 1.5 }}>
              Sistem akan mengirimkan pengingat jam 07:30 (Absen Masuk) dan 16:00 (Absen Keluar) agar Anda tidak pernah lupa absen.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowPushPrompt(false)} className="btn btn-secondary btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }}>Nanti</button>
            <button onClick={handleEnablePush} className="btn btn-primary btn-sm" style={{ background: '#38bdf8', color: '#0f172a', fontWeight: 800 }}>Aktifkan Sekarang</button>
          </div>
        </div>
      )}

      {/* ── Daily Mood Check ── */}
      <div className="card" style={{ marginBottom: 'var(--sp-4)', background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%)', border: '1px solid var(--primary)' }}>
        <p style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 4 }}>🌤 Bagaimana perasaan Anda hari ini?</p>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Mood check dilaporkan secara anonim ke HR</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          {MOODS.map(m => (
            <button key={m.val} onClick={() => handleMood(m.val)} title={m.label}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                background: selectedMood === m.val ? 'var(--primary)' : 'rgba(255,255,255,0.7)',
                border: `2px solid ${selectedMood === m.val ? 'var(--primary)' : 'transparent'}`,
                borderRadius: 12, padding: '8px 4px', cursor: 'pointer', fontSize: 20,
                transition: 'all 0.18s', transform: selectedMood === m.val ? 'scale(1.12)' : 'scale(1)',
                boxShadow: selectedMood === m.val ? '0 4px 12px rgba(99,102,241,0.3)' : 'none'
              }}>
              {m.emoji}
              <span style={{ fontSize: '0.55rem', fontWeight: 700, color: selectedMood === m.val ? 'white' : 'var(--text-muted)' }}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Badges & Achievements ── */}
      <BadgesSection badges={D.badges} loading={loading} />

      {/* ── Row 1: Stat Cards ── */}
      <div className="stat-grid intern-stat-grid" style={{ marginBottom: 'var(--sp-4)' }}>
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

        {/* Skor Keaktifan (Activity Score) */}
        <div className="stat-card" style={{ cursor: 'default' }} title={stats.missedSurveys > 0 ? `Skor berkurang karena ${stats.missedSurveys} survei wajib tidak diisi tepat waktu.` : ''}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-3)' }}>
            <div className="stat-icon-wrap" style={{ background: (stats.onTimeRate || 0) >= 90 ? 'var(--success-light)' : (stats.onTimeRate || 0) >= 75 ? 'var(--primary-light)' : 'var(--danger-light)', color: (stats.onTimeRate || 0) >= 90 ? 'var(--success)' : (stats.onTimeRate || 0) >= 75 ? 'var(--primary)' : 'var(--danger)' }}>
              <Star size={20} strokeWidth={2} />
            </div>
            <span className={`badge`} style={{ background: (stats.onTimeRate || 0) >= 90 ? 'var(--success-light)' : (stats.onTimeRate || 0) >= 75 ? 'var(--primary-light)' : 'var(--danger-light)', color: (stats.onTimeRate || 0) >= 90 ? 'var(--success)' : (stats.onTimeRate || 0) >= 75 ? 'var(--primary)' : 'var(--danger)' }}>
              {(stats.onTimeRate || 0) >= 90 ? 'EXCELLENT' : (stats.onTimeRate || 0) >= 75 ? 'GOOD' : 'NEEDS IMPROVEMENT'}
            </span>
          </div>
          {loading ? <div style={{ height: 28, width: '60%', background: 'var(--border)', borderRadius: 4, animation: 'pulse 1.4s ease-in-out infinite' }} /> : (
            <div className="stat-value">{stats.onTimeRate || 0}<span style={{fontSize:'0.82rem', color:'var(--text-muted)', marginLeft:6, fontWeight:600, letterSpacing:'-0.01em'}}>Skor Keaktifan</span></div>
          )}
          <div className="stat-label">Kehadiran: {stats.onTimeRate || 0}% · {stats.missedSurveys || 0} Survei Terlewat</div>
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
          <div className="stat-label">Allowance {fmtPeriod(D.allowanceInfo?.period)}</div>
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
      <div className="intern-row-2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr)', gap: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
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
      <div className="intern-row-3" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
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
                { label: 'Periode', value: fmtPeriod(D.allowanceInfo?.period) },
                { label: 'Jml Hadir', value: `${D.allowanceInfo?.presenceCount || 0} hari` },
                { label: 'Tarif/Hari', value: idr(D.allowanceInfo?.allowanceRate) },
                { label: 'Total', value: idr(D.allowanceInfo?.totalAllowance), bold: true },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none', gap: 8 }}>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', flexShrink: 0 }}>{item.label}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: item.bold ? 800 : 600, color: item.bold ? 'var(--primary)' : 'var(--text-primary)', textAlign: 'right', wordBreak: 'break-word' }}>{item.value}</span>
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
      <div className="intern-row-5" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
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
      <div className="intern-row-6" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
        {/* Quick Actions */}
        <div className="card">
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1rem' }}>
            <Zap size={16} strokeWidth={2} style={{ color: 'var(--warning)' }} /> Aksi Cepat
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            {[
              { icon: '📸', label: 'Absensi', href: '/attendance', color: 'var(--secondary)' },
              { icon: '📝', label: 'Laporan', href: '/reports', color: 'var(--primary)' },
              { icon: '📊', label: 'Evaluasi', href: '/evaluations', color: '#f59e0b' },
              { icon: '📂', label: 'Onboarding', href: '/onboarding', color: 'var(--warning)' },
            ].map(a => (
              <a key={a.label} href={a.href} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem',
                padding: '0.75rem 0.25rem', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', textDecoration: 'none',
                transition: 'all 0.18s', color: 'var(--text-primary)', background: 'var(--bg-main)'
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = a.color + '15'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-main)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                <span style={{ fontSize: 24, position: 'relative' }}>
                  {a.icon}
                  {a.label === 'Survei' && D.pendingSurveys?.some(s => s.isMandatory) && (
                    <span style={{ position:'absolute', top:-2, right:-2, width:8, height:8, background:'var(--danger)', borderRadius:'50%', border:'2px solid var(--bg-card)' }} />
                  )}
                </span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, textAlign: 'center', color: 'var(--text-secondary)', lineHeight: 1.2 }}>{a.label}</span>
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

      {/* ── Row 7: 🏆 Leaderboard — Top Performers ── */}
      <div id="leaderboard-section">
        <LeaderboardWidget userId={user?.id} />
      </div>

      {/* ── Row 8: ⭐ Kudostars — Peer Recognition ── */}
      <KudostarsWidget userId={user?.id} />

      <style jsx>{`
        @keyframes slideUp { from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1} }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.35} }
        @keyframes spin { to{transform:rotate(360deg)} }

        /* ─── Mobile Responsive Breakpoints ─── */
        @media(max-width: 640px) {
          /* Stat cards: 2 cols on mobile */
          .intern-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }

          /* Attendance + Streak: stack vertically */
          .intern-row-2 { grid-template-columns: 1fr !important; }

          /* Progress + Allowance: stack vertically */
          .intern-row-3 { grid-template-columns: 1fr !important; }

          /* Pengumuman + Jadwal: stack vertically */
          .intern-row-5 { grid-template-columns: 1fr !important; }

          /* Quick Actions + Onboarding: stack vertically */
          .intern-row-6 { grid-template-columns: 1fr !important; }
        }

        @media(max-width: 900px) {
          /* Tablet: stat grid 2 cols */
          .intern-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
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

/* ── Kudostars Widget — Peer-to-Peer Recognition ── */
const KUDO_CATEGORIES = [
  { val: 'TEAMWORK', emoji: '🤝', label: 'Teamwork' },
  { val: 'HELPFUL', emoji: '💡', label: 'Helpful' },
  { val: 'CREATIVE', emoji: '🎨', label: 'Creative' },
  { val: 'LEADERSHIP', emoji: '👑', label: 'Leadership' },
  { val: 'INITIATIVE', emoji: '🚀', label: 'Initiative' }
]

function KudostarsWidget({ userId }) {
  const [kudoData, setKudoData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedIntern, setSelectedIntern] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('TEAMWORK')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) return
    fetch(`/api/recognition?userId=${userId}`)
      .then(r => r.json())
      .then(d => { setKudoData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [userId])

  const handleSend = async () => {
    if (!selectedIntern || !message.trim()) {
      setError('Pilih intern dan tulis pesan')
      return
    }
    setSending(true); setError('')
    try {
      const res = await fetch('/api/recognition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: userId,
          toInternId: selectedIntern,
          message: message.trim(),
          category: selectedCategory
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowForm(false); setMessage(''); setSelectedIntern('')
      const refreshed = await fetch(`/api/recognition?userId=${userId}`).then(r => r.json())
      setKudoData(refreshed)
      import('sweetalert2').then(({ default: S }) => {
        S.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, icon: 'success', title: `⭐ Bintang terkirim! (${data.remaining} tersisa)` })
      })
    } catch (e) {
      setError(e.message)
    } finally { setSending(false) }
  }

  const budget = kudoData?.userBudget
  const remaining = budget?.remaining ?? 5
  const received = budget?.received ?? 0

  return (
    <div className="card" style={{ marginBottom: 'var(--sp-4)', background: 'linear-gradient(135deg, #fef3c7 0%, #fef9c3 30%, #ecfccb 100%)', border: '1.5px solid #f59e0b40' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
          ⭐ Kudostars
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#92400e', background: '#fbbf2430', padding: '3px 10px', borderRadius: 99 }}>
            ⭐ {received} diterima
          </span>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: remaining > 0 ? '#166534' : '#991b1b', background: remaining > 0 ? '#bbf7d020' : '#fecaca30', padding: '3px 10px', borderRadius: 99 }}>
            {remaining}/5 tersisa
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ height: 48, background: 'var(--border)', borderRadius: 8, animation: 'pulse 1.4s ease-in-out infinite' }} />
      ) : (
        <>
          {budget?.recentReceived?.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <p style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 700, marginBottom: 6 }}>Bintang yang kamu terima:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {budget.recentReceived.slice(0, 3).map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.6)', fontSize: '0.78rem' }}>
                    <span>{KUDO_CATEGORIES.find(c => c.val === r.category)?.emoji || '⭐'}</span>
                    <span style={{ fontWeight: 700, color: '#78350f' }}>{r.fromName}</span>
                    <span style={{ color: '#92400e', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{r.message}"</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showForm ? (
            <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: '0.875rem', border: '1px solid #fbbf2440' }}>
              <select
                value={selectedIntern} onChange={e => setSelectedIntern(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.82rem', marginBottom: 8, background: 'white' }}
              >
                <option value="">Pilih rekan magang...</option>
                {(kudoData?.activeInterns || []).map(i => (
                  <option key={i.id} value={i.id}>{i.name} — {i.bidang}</option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                {KUDO_CATEGORIES.map(c => (
                  <button key={c.val} onClick={() => setSelectedCategory(c.val)}
                    style={{
                      flex: 1, minWidth: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      padding: '6px 4px', borderRadius: 8, border: `2px solid ${selectedCategory === c.val ? '#f59e0b' : 'transparent'}`,
                      background: selectedCategory === c.val ? '#fef3c7' : 'white', cursor: 'pointer', fontSize: '0.62rem', fontWeight: 700,
                      transition: 'all 0.15s'
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{c.emoji}</span>
                    {c.label}
                  </button>
                ))}
              </div>

              <input
                type="text" value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Tulis pesan apresiasi..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.82rem', marginBottom: 8, background: 'white', boxSizing: 'border-box' }}
                maxLength={200}
              />

              {error && <p style={{ color: '#dc2626', fontSize: '0.75rem', marginBottom: 6 }}>{error}</p>}

              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { setShowForm(false); setError('') }} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                  Batal
                </button>
                <button onClick={handleSend} disabled={sending}
                  style={{ flex: 2, padding: '8px', borderRadius: 8, border: 'none', background: '#f59e0b', color: 'white', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 800, opacity: sending ? 0.6 : 1 }}
                >
                  {sending ? 'Mengirim...' : '⭐ Kirim Bintang'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowForm(true)} disabled={remaining <= 0}
              style={{
                width: '100%', padding: '10px', borderRadius: 10, border: '2px dashed #f59e0b60',
                background: remaining > 0 ? 'rgba(255,255,255,0.5)' : 'rgba(200,200,200,0.2)',
                cursor: remaining > 0 ? 'pointer' : 'not-allowed', fontSize: '0.85rem', fontWeight: 700,
                color: remaining > 0 ? '#92400e' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.18s'
              }}
            >
              {remaining > 0 ? '⭐ Beri Bintang ke Rekan Magang' : '🔒 Kuota bintang bulan ini habis'}
            </button>
          )}
        </>
      )}
    </div>
  )
}

/* ── Leaderboard Widget — Top Performers Sub-component ── */
function LeaderboardWidget({ userId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    fetch(`/api/intern-dashboard/leaderboard?userId=${userId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [userId])

  if (loading) return <div className="card" style={{ marginBottom: 'var(--sp-4)', height: 200, background: 'var(--bg-card)', animation: 'pulse 1.4s infinite' }} />
  if (!data?.top5) return null

  return (
    <div className="card" style={{ marginBottom: 'var(--sp-4)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <Trophy size={20} color="#f59e0b" fill="#f59e0b20" /> Leaderboard Bulan Ini
        </h3>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Berdasarkan Total Poin</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.top5.map((item, i) => (
          <div key={item.internId} style={{ 
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', 
            background: item.userId === userId ? 'var(--primary-light)' : 'var(--bg-main)',
            borderRadius: 12, border: `1px solid ${item.userId === userId ? 'var(--primary)' : 'var(--border)'}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ 
              width: 28, height: 28, borderRadius: '50%', 
              background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : i === 2 ? '#fff7ed' : 'var(--bg-card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.85rem', fontWeight: 900, color: i === 0 ? '#d97706' : i === 1 ? '#475569' : i === 2 ? '#c2410c' : 'var(--text-muted)'
            }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{item.name} {item.userId === userId && '(Anda)'}</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0 }}>{item.bidang}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>{item.composite}</p>
              <p style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-muted)', margin: 0, letterSpacing: 0.5 }}>POIN</p>
            </div>
          </div>
        ))}
      </div>

      {data.userRank && data.userRank.rank > 5 && (
        <div style={{ 
          marginTop: 12, padding: '10px 14px', borderRadius: 12, 
          background: 'var(--primary)', color: 'white',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <div style={{ width: 28, textAlign: 'center', fontWeight: 900, fontSize: '0.9rem' }}>#{data.userRank.rank}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 800, margin: 0 }}>Peringkat Anda</p>
            <p style={{ fontSize: '0.65rem', opacity: 0.8, margin: 0 }}>Terus tingkatkan keaktifanmu!</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 900, margin: 0 }}>{data.userRank.composite}</p>
          </div>
        </div>
      )}

      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 12, textAlign: 'center', fontStyle: 'italic' }}>
        Poin dihitung dari Kehadiran (35%), Laporan (30%), Kudostars (25%), & Survei (10%).
      </p>
    </div>
  )
}


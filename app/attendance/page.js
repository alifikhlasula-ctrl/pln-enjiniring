'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import Script from 'next/script'
import { Clock, MapPin, CheckCircle2, Camera, X, RefreshCw, AlertCircle, Wifi, UserCheck, UserX, Lock, CalendarOff } from 'lucide-react'

/* ─── Safe JSON fetch helper ─────────────────────────── */
async function safeFetch(url, opts = {}) {
  const res = await fetch(url, opts)
  const text = await res.text()
  try {
    const json = JSON.parse(text)
    return { ok: res.ok, status: res.status, data: json }
  } catch {
    return { ok: false, status: res.status, data: { error: `Server error (${res.status}): ${text.substring(0, 120)}` } }
  }
}

/* ─── Live Clock ─────────────────────────────────────── */
function LiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px', color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
        {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
        {time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  )
}

/* ─── Face Capture Modal ─────────────────────────────── */
function FaceCaptureModal({ actionName, onClose, onCapture }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [detecting, setDetecting] = useState(false)

  // Load models once
  useEffect(() => {
    let active = true
    const loadModels = async () => {
      try {
        if (typeof window === 'undefined' || !window.faceapi) return
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models'
        await Promise.all([
          window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        ])
        if (active) setModelsLoaded(true)
      } catch (e) { console.error('Failed to load models:', e) }
    }
    const checkApi = setInterval(() => {
      if (window.faceapi) {
        loadModels()
        clearInterval(checkApi)
      }
    }, 500)
    return () => { active = false; clearInterval(checkApi) }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const str = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        })
        if (cancelled) { str.getTracks().forEach(t => t.stop()); return }
        streamRef.current = str
        if (videoRef.current) {
          videoRef.current.srcObject = str

          // onloadedmetadata: standar
          videoRef.current.onloadedmetadata = () => {
            if (!cancelled) {
              videoRef.current.play().catch(() => {})
              setReady(true)
            }
          }

          // oncanplay: fallback untuk browser yang tidak trigger loadedmetadata
          videoRef.current.oncanplay = () => {
            if (!cancelled && !ready) {
              videoRef.current.play().catch(() => {})
              setReady(true)
            }
          }

          // Fallback terakhir: paksa play setelah 1 detik
          setTimeout(() => {
            if (!cancelled && videoRef.current && !ready) {
              videoRef.current.play().catch(() => {})
              setReady(true)
            }
          }, 1500)
        }
      } catch (e) {
        if (!cancelled) setError('Akses kamera ditolak atau tidak ditemukan.\nPastikan browser diizinkan mengakses kamera.')
      }
    })()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  // Detection Loop
  useEffect(() => {
    if (!ready || !modelsLoaded || !videoRef.current) return
    let animId
    const detect = async () => {
      if (!videoRef.current) return
      setDetecting(true)
      try {
        const detections = await window.faceapi.detectAllFaces(
          videoRef.current, 
          new window.faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 })
        )
        setFaceDetected(detections.length === 1)
      } catch (_) {}
      animId = requestAnimationFrame(detect)
    }
    detect()
    return () => cancelAnimationFrame(animId)
  }, [ready, modelsLoaded])

  const stopAndClose = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    onClose()
  }

  const takeSnapshot = async () => {
    if (!videoRef.current || !ready || !faceDetected) return
    setCapturing(true)
    await new Promise(r => setTimeout(r, 200)) // brief delay so face is centered
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth || 640
    canvas.height = videoRef.current.videoHeight || 480
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
    const base64 = canvas.toDataURL('image/jpeg', 0.5) // Lower quality to stay well below 1MB
    streamRef.current?.getTracks().forEach(t => t.stop())
    onCapture(base64)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div className="card" style={{ width: '95%', maxWidth: 520, borderRadius: 'var(--radius-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={18} /> Autentikasi Wajah — {actionName}
          </h3>
          <button onClick={stopAndClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {error ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--danger)' }}>
            <AlertCircle size={40} style={{ margin: '0 auto 1rem', display: 'block' }} />
            <p style={{ whiteSpace: 'pre-line', fontSize: '0.9rem' }}>{error}</p>
            <button className="btn btn-secondary" onClick={stopAndClose} style={{ marginTop: '1rem' }}>Tutup</button>
          </div>
        ) : (
          <>
            <div style={{
              borderRadius: 'var(--radius-lg)', overflow: 'hidden',
              background: '#111', aspectRatio: '4/3', height: 0, paddingBottom: '75%', position: 'relative',
              boxShadow: faceDetected ? '0 0 0 4px var(--secondary)' : '0 0 0 4px var(--danger)',
              transition: 'box-shadow 0.3s ease'
            }}>
              <video
                ref={videoRef} autoPlay playsInline muted
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                  display: 'block'
                }}
              />
              {/* Face guide overlay */}
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none'
              }}>
                <div style={{
                  width: '55%', aspectRatio: '3/4', border: faceDetected ? '3px solid var(--secondary)' : '3px solid rgba(255,255,255,0.3)',
                  borderRadius: '50%', boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)', transition: 'border-color 0.3s'
                }} />
              </div>
              {!ready && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#111' }}>
                  <RefreshCw size={32} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
                </div>
              )}
              {ready && !modelsLoaded && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.5)', color: '#fff' }}>
                  <RefreshCw size={32} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.82rem', marginTop: 12, fontWeight: 700 }}>Memuat AI Verifikasi...</span>
                </div>
              )}
            </div>
            
            <div style={{ padding: '0.75rem 0', textAlign: 'center' }}>
              {faceDetected ? (
                <div style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 800, fontSize: '0.9rem', animation: 'slideInUp 0.2s' }}>
                  <UserCheck size={18} /> Wajah Terdeteksi
                </div>
              ) : (
                <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700, fontSize: '0.85rem' }}>
                  <UserX size={18} /> Wajah Tidak Ditemukan / Pastikan Terang
                </div>
              )}
            </div>

            <button
              className="btn btn-primary"
              style={{ 
                width: '100%', padding: '1rem', fontSize: '1rem',
                opacity: (!ready || !modelsLoaded || !faceDetected || capturing) ? 0.5 : 1,
                cursor: (!ready || !modelsLoaded || !faceDetected || capturing) ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s'
              }}
              onClick={takeSnapshot}
              disabled={!ready || !modelsLoaded || !faceDetected || capturing}
            >
              {capturing
                ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} />Memproses...</>
                : <><Camera size={16} style={{ marginRight: 8 }} />Ambil Foto & {actionName}</>
              }
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideInUp{from{transform:translateY(8px); opacity:0} to{transform:translateY(0); opacity:1}}`}</style>
    </div>
  )
}

/* ─── Attendance Page ────────────────────────────────── */
export default function AttendancePage() {
  const { user } = useAuth()
  const [attendances, setAttendances] = useState([])
  const [internProfile, setInternProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [todayLog, setTodayLog] = useState(null)
  const [showFace, setShowFace] = useState(false)
  const [pendingType, setPendingType] = useState(null) // 'IN' | 'OUT'
  const [toast, setToast] = useState(null)
  
  // Correction states
  const [correctionModal, setCorrectionModal] = useState({ open: false, log: null, type: null, time: '08:00', reason: '' })

  // Backdate states
  const [showManual, setShowManual] = useState(false)
  const [manualForm, setManualForm] = useState({ date: '', in: '07:30', out: '16:00' })

  const isTodayOff = isOffDay(new Date().toISOString().split('T')[0])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchLogs = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setLoading(true)
    const { data } = await safeFetch(`/api/attendance?userId=${user.id}&_t=${Date.now()}`)
    const list = Array.isArray(data) ? data : []
    setAttendances(list)
    const today = new Date().toISOString().split('T')[0]
    setTodayLog(list.find(a => a.date === today) || null)

    const pRes = await safeFetch(`/api/intern/profile?userId=${user.id}`)
    if (pRes.ok) setInternProfile(pRes.data?.intern || null)

    if (!silent) setLoading(false)
  }, [user])

  // Initial fetch + auto-refresh every 30s (picks up admin-approved corrections)
  useEffect(() => {
    fetchLogs()
    const iv = setInterval(() => fetchLogs(true), 30000)
    return () => clearInterval(iv)
  }, [fetchLogs])

  const openCamera = (type) => { setPendingType(type); setShowFace(true) }
  const closeCamera = () => { setShowFace(false); setPendingType(null) }

  const handleCapture = async (base64) => {
    setShowFace(false)
    setProcessing(true)

    // Get GPS
    let location = 'Tidak terdeteksi'
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000 })
      )
      location = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`
    } catch { /* user may have blocked GPS */ }

    const { ok, data } = await safeFetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, type: pendingType, location, faceBase64: base64 })
    })

    if (ok) {
      showToast(`Check ${pendingType === 'IN' ? 'In' : 'Out'} berhasil! ✅`)
      await fetchLogs()
    } else {
      showToast(data?.error || 'Terjadi kesalahan', 'error')
    }

    setProcessing(false)
    setPendingType(null)
  }

  const submitManualBackdate = async (e) => {
    e.preventDefault()
    if (!manualForm.date || !manualForm.in || !manualForm.out) {
      return showToast('Harap lengkapi semua isian', 'error')
    }
    const todayStr = new Date().toISOString().split('T')[0]
    if (manualForm.date >= todayStr) {
      return showToast('Gunakan deteksi wajah untuk absensi hari ini/mendatang.', 'error')
    }

    // Weekend Validation for Manual Claim
    if (isOffDay(manualForm.date)) {
      return showToast('Klaim tidak diperbolehkan pada hari Libur, Sabtu, atau Minggu.', 'error')
    }

    setProcessing(true)
    const { ok, data } = await safeFetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: user.id, 
        type: 'MANUAL_BACKDATE',
        date: manualForm.date,
        checkInTime: manualForm.in,
        checkOutTime: manualForm.out
      })
    })

    if (ok) {
      showToast(`Absensi susulan ${manualForm.date} berhasil diklaim ✅`)
      setShowManual(false)
      setManualForm({ date: '', in: '07:30', out: '16:00' })
      await fetchLogs()
    } else {
      showToast(data?.error || 'Gagal mengirim klaim absensi', 'error')
    }
    setProcessing(false)
  }

  const submitCorrection = async (e) => {
    e.preventDefault()
    setProcessing(true)
    const { ok, data } = await safeFetch('/api/attendance/correction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        internId: internProfile?.id || user.id,
        internName: internProfile?.name || user.name || 'Intern',
        date: correctionModal.log.date,
        type: correctionModal.type,
        time: correctionModal.time,
        reason: correctionModal.reason
      })
    })

    if (ok) {
      showToast(`Pengajuan perbaikan jam ${correctionModal.type === 'IN' ? 'Masuk' : 'Pulang'} berhasil dikirim. ✅`)
      setCorrectionModal({ open: false, log: null, type: null, time: '', reason: '' })
      await fetchLogs()
    } else {
      showToast(data?.error || 'Gagal mengirim pengajuan perbaikan', 'error')
    }
    setProcessing(false)
  }

  const stats = {
    total: attendances.length,
    present: attendances.filter(a => a.status === 'PRESENT').length,
    late: attendances.filter(a => a.status === 'LATE').length,
  }

  const fmtTime = (dt) => {
    if (!dt) return '-'
    try {
      return new Date(dt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return '-'
    }
  }

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Camera size={22} /> Absensi Biometrik Wajah
        </h1>
        <p className="subtitle">Verifikasi kehadiran real-time dengan Face Recognition & GPS.</p>
      </div>

      {/* Banner Selesai Magang */}
      {user?.internStatus === 'COMPLETED' && (
        <div style={{ background:'#fef3c7', border:'1px solid #fbbf24', padding:'1rem 1.5rem', borderRadius:12, marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:12 }}>
          <Lock size={20} style={{ color:'#b45309', flexShrink:0 }} />
          <div>
            <p style={{ fontWeight:800, color:'#b45309' }}>Periode Magang Telah Selesai</p>
            <p style={{ fontSize:'0.82rem', color:'#92400e' }}>Fitur absensi dinonaktifkan. Silakan lihat hasil evaluasi Anda di menu Evaluasi.</p>
          </div>
        </div>
      )}

      {/* Banner Libur / Akhir Pekan */}
      {isTodayOff && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '1rem 1.5rem', borderRadius: 12, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
          <CalendarOff size={20} style={{ color: '#dc2626', flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 800, color: '#991b1b' }}>Absensi Terkunci — Hari Libur / Akhir Pekan</p>
            <p style={{ fontSize: '0.82rem', color: '#b91c1c' }}>Pengisian absensi (Check In/Out) dan klaim susulan tidak diperbolehkan pada hari Libur Nasional, Sabtu, dan Minggu.</p>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 80, right: 24, zIndex: 999, padding: '0.875rem 1.25rem',
          background: toast.type === 'error' ? 'var(--danger)' : 'var(--secondary)',
          color: '#fff', borderRadius: 'var(--radius-lg)', fontWeight: 700, fontSize: '0.9rem',
          boxShadow: 'var(--shadow-lg)', animation: 'slideInRight 0.3s ease'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Hadir', val: stats.total, c: 'var(--primary)' },
          { label: 'Tepat Waktu', val: stats.present, c: 'var(--secondary)' },
          { label: 'Terlambat', val: stats.late, c: 'var(--warning)' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, minWidth: 120, background: 'var(--bg-main)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '1rem', textAlign: 'center'
          }}>
            <div style={{ fontWeight: 800, fontSize: '1.8rem', color: s.c, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6, fontWeight: 700 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Check in/out panel */}
        <div className="card" style={{ flex: '0 0 340px', minWidth: 280 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '1rem 0' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--primary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {processing
                ? <RefreshCw size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
                : <Clock size={32} color="var(--primary)" />
              }
            </div>

            <LiveClock />

            {/* Status badges */}
            {todayLog && (
              <div style={{
                display: 'flex', gap: '0.5rem', width: '100%', flexWrap: 'wrap', justifyContent: 'center'
              }}>
                <span style={{
                  padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700,
                  background: todayLog.status === 'LATE' ? 'var(--warning-light)' : 'var(--secondary-light)',
                  color: todayLog.status === 'LATE' ? 'var(--warning)' : 'var(--secondary)'
                }}>
                  {todayLog.status}
                </span>
                {todayLog.checkIn && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                  IN: {fmtTime(todayLog.checkIn)}
                </span>}
                {todayLog.checkOut && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                  OUT: {fmtTime(todayLog.checkOut)}
                </span>}
              </div>
            )}

            {/* Check In / Check Out Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              {!todayLog?.checkIn ? (
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.875rem', gap: 8, opacity: isTodayWeekend ? 0.5 : 1 }}
                  onClick={() => openCamera('IN')}
                  disabled={processing || isTodayWeekend}
                >
                  <Camera size={16} /> {isTodayOff ? 'Locked' : 'Check In'}
                </button>
              ) : (
                <div style={{
                  flex: 1, textAlign: 'center', padding: '0.875rem',
                  background: 'var(--secondary-light)', borderRadius: 'var(--radius-md)',
                  color: 'var(--secondary)', fontWeight: 700, fontSize: '0.9rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}>
                  <CheckCircle2 size={16} /> Checked In
                </div>
              )}

              {!todayLog?.checkOut ? (
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.875rem', gap: 8, opacity: isTodayOff ? 0.5 : 1 }}
                  onClick={() => openCamera('OUT')}
                  disabled={processing || !todayLog?.checkIn || isTodayOff}
                >
                  <Camera size={16} /> {isTodayOff ? 'Locked' : 'Check Out'}
                </button>
              ) : (
                <div style={{
                  flex: 1, textAlign: 'center', padding: '0.875rem',
                  background: 'var(--secondary-light)', borderRadius: 'var(--radius-md)',
                  color: 'var(--secondary)', fontWeight: 700, fontSize: '0.9rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}>
                  <CheckCircle2 size={16} /> Checked Out
                </div>
              )}
            </div>

            {/* Today details */}
            {todayLog && (
              <div style={{ width: '100%', fontSize: '0.82rem' }}>
                {todayLog.checkInLoc && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: 'var(--text-muted)', marginTop: 4 }}>
                    <MapPin size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ wordBreak: 'break-all' }}>{todayLog.checkInLoc}</span>
                  </div>
                )}
              </div>
            )}

            {/* Face thumbnails */}
            {(todayLog?.faceInBase64 || todayLog?.faceOutBase64) && (
              <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'center' }}>
                {todayLog?.faceInBase64 && (
                  <div style={{ textAlign: 'center' }}>
                    <img src={todayLog.faceInBase64} style={{ width: 56, height: 56, borderRadius: 28, objectFit: 'cover', border: '2px solid var(--secondary)' }} alt="check-in face" />
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>IN</div>
                  </div>
                )}
                {todayLog?.faceOutBase64 && (
                  <div style={{ textAlign: 'center' }}>
                    <img src={todayLog.faceOutBase64} style={{ width: 56, height: 56, borderRadius: 28, objectFit: 'cover', border: '2px solid var(--primary)' }} alt="check-out face" />
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>OUT</div>
                  </div>
                )}
              </div>
            )}

            {/* Manual Backdate Section (Hidden for Interns - Option 2) */}
            {user?.role !== 'INTERN' && (
              <div style={{ width: '100%', borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                {!showManual ? (
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', fontSize: '0.8rem', padding: '0.6rem' }}
                    onClick={() => setShowManual(true)}
                  >
                    <Clock size={14} style={{marginRight: 6}}/> Klaim Absensi Terlewat
                  </button>
                ) : (
                  <form onSubmit={submitManualBackdate} style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', animation: 'slideInRight 0.3s' }}>
                    <p style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>Klaim Susulan (Max H-1)</p>
                    
                    <label className="label" style={{fontSize: '0.72rem'}}>Tanggal</label>
                    <input type="date" required className="input" style={{marginBottom: 10, fontSize: '0.8rem', padding: '6px 10px'}} 
                           value={manualForm.date} onChange={e => setManualForm({...manualForm, date: e.target.value})} 
                           min={internProfile?.periodStart || ''}
                           max={new Date(Date.now() - 86400000).toISOString().split('T')[0]} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                      <div>
                        <label className="label" style={{fontSize: '0.72rem'}}>Jam Masuk</label>
                        <input type="time" required className="input" style={{fontSize: '0.8rem', padding: '6px 10px'}} 
                               value={manualForm.in} onChange={e => setManualForm({...manualForm, in: e.target.value})} />
                      </div>
                      <div>
                        <label className="label" style={{fontSize: '0.72rem'}}>Jam Keluar</label>
                        <input type="time" required className="input" style={{fontSize: '0.8rem', padding: '6px 10px'}} 
                               value={manualForm.out} onChange={e => setManualForm({...manualForm, out: e.target.value})} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '6px', fontSize: '0.75rem' }} onClick={() => setShowManual(false)}>Batal</button>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '6px', fontSize: '0.75rem' }} disabled={processing}>Simpan Klaim</button>
                    </div>
                  </form>
                )}
              </div>
            )}

          </div>
        </div>

        {/* History Table */}
        <div className="card" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontWeight: 800 }}>Riwayat Kehadiran</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => fetchLogs()} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer' }}>
                <RefreshCw size={11} /> Refresh
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--secondary)', fontWeight: 700 }}>
                <Wifi size={12} /> Live Database
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Lokasi</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendances.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 700 }}>{new Date(log.date + 'T00:00:00').toLocaleDateString('id-ID')}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {log.faceInBase64 && (
                            <img src={log.faceInBase64} style={{ width: 28, height: 28, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} alt="in-face" />
                          )}
                          <span style={{ fontWeight: 600 }}>{fmtTime(log.checkIn)}</span>
                          {!log.checkIn && log.checkOut && (
                            log.pendingCorrIN
                              ? <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', whiteSpace: 'nowrap' }}>⏳ Menunggu</span>
                              : <button onClick={() => setCorrectionModal({ open: true, log, type: 'IN', time: '07:30', reason: '' })} 
                                        className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.65rem' }}>
                                  Ajukan Perbaikan
                                </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {log.faceOutBase64 && (
                            <img src={log.faceOutBase64} style={{ width: 28, height: 28, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} alt="out-face" />
                          )}
                          <span style={{ fontWeight: 600 }}>{fmtTime(log.checkOut)}</span>
                          {log.checkIn && !log.checkOut && (
                            log.pendingCorrOUT
                              ? <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', whiteSpace: 'nowrap' }}>⏳ Menunggu</span>
                              : <button onClick={() => setCorrectionModal({ open: true, log, type: 'OUT', time: '16:00', reason: '' })} 
                                        className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.65rem' }}>
                                  Ajukan Perbaikan
                                </button>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: 160 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={10} style={{ flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.checkInLoc || '-'}</span>
                        </div>
                      </td>
                      <td>
                        {log.status === 'LATE'
                          ? <span className="badge badge-warning">TERLAMBAT</span>
                          : <span className="badge badge-success">HADIR</span>}
                      </td>
                    </tr>
                  ))}
                  {attendances.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        Belum ada log absensi yang tersimpan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showFace && (
        <FaceCaptureModal
          actionName={pendingType === 'IN' ? 'Check In' : 'Check Out'}
          onClose={closeCamera}
          onCapture={handleCapture}
        />
      )}

      {correctionModal.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 400, padding: '2rem', animation: 'slideInUp 0.3s ease' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Ajukan Perbaikan Absensi</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Tanggal: {new Date(correctionModal.log.date + 'T00:00:00').toLocaleDateString('id-ID')}
            </p>
            <form onSubmit={submitCorrection}>
              <div className="form-group">
                <label className="label">Jam {correctionModal.type === 'IN' ? 'Masuk' : 'Pulang'} Seharusnya</label>
                <input type="time" required className="input" value={correctionModal.time} onChange={(e) => setCorrectionModal({...correctionModal, time: e.target.value})} />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="label">Alasan Lupa {correctionModal.type === 'IN' ? 'Check-In' : 'Check-Out'}</label>
                <input type="text" required className="input" placeholder="Contoh: Baterai HP habis" value={correctionModal.reason} onChange={(e) => setCorrectionModal({...correctionModal, reason: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setCorrectionModal({ open: false, log: null, type: null, time: '', reason: '' })}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={processing}>
                  {processing ? <RefreshCw size={16} className="spin" /> : 'Kirim Pengajuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes slideInRight { from { transform: translateX(24px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
      `}</style>
      <Script 
        src="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js" 
        strategy="afterInteractive"
      />
    </div>
  )
}

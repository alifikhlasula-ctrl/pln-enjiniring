'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * app/error.js — Next.js error boundary (handles runtime/render errors).
 * Shown when a page throws an unexpected error.
 * Automatically retries after 8 seconds with a visual countdown.
 */
export default function Error({ error, reset }) {
  const [countdown, setCountdown] = useState(8)
  const [retrying,  setRetrying]  = useState(false)
  const resetRef = useRef(reset)
  useEffect(() => { resetRef.current = reset }, [reset])

  useEffect(() => {
    // Detect Next.js "Failed to find Server Action" - which means a deployment mismatch
    // In this case, we force a silent window reload to sync with the new build.
    if (error?.message?.includes('Failed to find Server Action')) {
      console.warn('[NEXTJS_STALE_ACTION] Deployment mismatch detected. Syncing client with server...');
      window.location.reload(true);
      return;
    }

    if (countdown <= 0) {
      setRetrying(true)
      resetRef.current?.()
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, error])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: '1.5rem',
    }}>
      <div style={{
        maxWidth: 460, width: '100%',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: '2.5rem 2rem',
        textAlign: 'center',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(239,68,68,0.15)',
          border: '2px solid rgba(239,68,68,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontSize: '2rem',
        }}>
          ⚠️
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '1.3rem', fontWeight: 800,
          color: '#fff', marginBottom: '0.5rem',
        }}>
          Terjadi Kesalahan
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.6, marginBottom: '0.5rem',
        }}>
          Halaman mengalami error sementara. Ini bisa terjadi karena server baru saja aktif kembali.
        </p>

        {/* Error detail (dev only) */}
        {error?.message && (
          <p style={{
            fontSize: '0.72rem', color: 'rgba(239,68,68,0.7)',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.15)',
            borderRadius: 8, padding: '0.5rem 0.75rem',
            margin: '0.875rem 0', wordBreak: 'break-word',
            fontFamily: 'monospace',
          }}>
            {error.message}
          </p>
        )}

        {/* Countdown ring */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          margin: '1.5rem 0',
        }}>
          {retrying ? (
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              border: '2px solid rgba(99,102,241,0.3)',
              borderTop: '2px solid #6366f1',
              animation: 'spin 0.7s linear infinite',
            }} />
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(99,102,241,0.15)',
              border: '2px solid rgba(99,102,241,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '1.1rem', color: '#818cf8',
              transition: 'all 0.3s',
            }}>
              {countdown}
            </div>
          )}
          <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>
            {retrying ? 'Memuat ulang...' : `Mencoba ulang dalam ${countdown} detik`}
          </span>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={() => { setRetrying(true); reset() }}
            disabled={retrying}
            style={{
              padding: '0.625rem 1.5rem',
              borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontWeight: 700, fontSize: '0.875rem',
              cursor: retrying ? 'not-allowed' : 'pointer',
              opacity: retrying ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
          >
            🔄 Coba Sekarang
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '0.875rem',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            🏠 Dashboard
          </button>
        </div>

        {/* PLN Branding */}
        <p style={{
          marginTop: '2rem',
          fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)',
          fontWeight: 600, letterSpacing: '0.05em',
        }}>
          PLN ENJINIRING — HRIS Magang
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

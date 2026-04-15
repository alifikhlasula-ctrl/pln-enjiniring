'use client'

import { useEffect, useState } from 'react'

/**
 * app/global-error.js — Root-level error boundary.
 * Wraps the entire RootLayout. Used when even the layout itself crashes.
 * Must include its own <html> and <body> tags.
 */
export default function GlobalError({ error, reset }) {
  const [countdown, setCountdown] = useState(10)
  const [retrying,  setRetrying]  = useState(false)

  useEffect(() => {
    if (countdown <= 0) {
      setRetrying(true)
      // Hard reload as last resort when root layout crashes
      window.location.reload()
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleRetry = () => {
    setRetrying(true)
    try {
      reset()
    } catch {
      window.location.reload()
    }
  }

  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Memulai Ulang — PLN Enjiniring</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            min-height: 100vh;
            display: flex; align-items: center; justify-content: center;
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
            font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
            padding: 1.5rem;
          }
          .card {
            max-width: 480px; width: 100%;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 24px; padding: 3rem 2.5rem;
            text-align: center;
            backdrop-filter: blur(20px);
            box-shadow: 0 32px 80px rgba(0,0,0,0.6);
          }
          .logo { font-size: 2rem; margin-bottom: 1.5rem; }
          .badge {
            display: inline-flex; align-items: center; gap: 6px;
            background: rgba(239,68,68,0.12);
            border: 1px solid rgba(239,68,68,0.25);
            color: #fca5a5; border-radius: 999px;
            padding: 4px 14px; font-size: 0.72rem; font-weight: 700;
            margin-bottom: 1.25rem; letter-spacing: 0.05em;
          }
          h1 { font-size: 1.4rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem; }
          p  { font-size: 0.875rem; color: rgba(255,255,255,0.5); line-height: 1.65; }
          .countdown {
            display: flex; align-items: center; justify-content: center; gap: 12px;
            margin: 1.75rem 0;
          }
          .ring {
            width: 52px; height: 52px; border-radius: 50%;
            background: rgba(99,102,241,0.12);
            border: 2px solid rgba(99,102,241,0.4);
            display: flex; align-items: center; justify-content: center;
            font-size: 1.3rem; font-weight: 900; color: #818cf8;
          }
          .spinner {
            width: 24px; height: 24px; border-radius: 50%;
            border: 3px solid rgba(99,102,241,0.2);
            border-top-color: #6366f1;
            animation: spin 0.7s linear infinite;
          }
          .countdown-text { font-size: 0.85rem; color: rgba(255,255,255,0.4); }
          .btn-primary {
            padding: 0.7rem 1.75rem; border-radius: 10px; border: none;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: #fff; font-weight: 700; font-size: 0.875rem;
            cursor: pointer; transition: opacity 0.15s;
          }
          .btn-primary:disabled { opacity: 0.5; cursor: default; }
          .footer { margin-top: 2.5rem; font-size: 0.65rem; color: rgba(255,255,255,0.18); letter-spacing: 0.06em; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className="logo">🔁</div>
          <div className="badge">⚡ SERVER MEMULAI ULANG</div>
          <h1>Aplikasi Sedang Bersiap</h1>
          <p style={{ marginTop: '0.5rem' }}>
            Server baru saja aktif kembali setelah periode idle. Ini normal dan hanya terjadi sekali — halaman akan dimuat ulang otomatis.
          </p>

          <div className="countdown">
            {retrying
              ? <div className="spinner" />
              : <div className="ring">{countdown}</div>
            }
            <span className="countdown-text">
              {retrying ? 'Memuat ulang...' : `Memuat ulang dalam ${countdown} detik`}
            </span>
          </div>

          <button
            className="btn-primary"
            onClick={handleRetry}
            disabled={retrying}
          >
            🔄 Muat Ulang Sekarang
          </button>

          <p className="footer">PLN ENJINIRING — HRIS MAGANG</p>
        </div>
      </body>
    </html>
  )
}

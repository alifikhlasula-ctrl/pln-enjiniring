'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login, finalizeLogin } = useAuth()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Use AuthContext.login() — saves to localStorage & handles redirect correctly
      const result = await login(email, password)
      if (!result.success) {
        setError(result.error || 'Email atau password salah.')
      } else if (result.mustChangePassword) {
        // Redirect to reset-password with temp user data
        finalizeLogin(result.tempUser)
      }
      // On success, AuthContext.login() already calls router.push('/dashboard')
    } catch {
      setError('Terjadi kesalahan sistem. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '1rem'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: 420,
        padding: '2.5rem',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        background: 'white',
        animation: 'loginScaleUp 0.4s cubic-bezier(0.16,1,0.3,1)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 52, height: 52,
            background: 'var(--primary)',
            borderRadius: 14,
            margin: '0 auto 1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
            Intern Hub PLNE
          </p>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            Portal HRIS Magang
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Masuk ke akun HRIS Anda untuk melanjutkan
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, padding: '0.75rem 1rem',
            color: '#dc2626', fontSize: '0.85rem', fontWeight: 600,
            marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: 8
          }}>
            <svg style={{ flexShrink: 0, marginTop: 1 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} noValidate>
          <div style={{ marginBottom: '1.125rem' }}>
            <label className="label">Alamat Email</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <svg style={{ position: 'absolute', left: 12, color: 'var(--text-muted)', flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <input
                id="login-email"
                type="email"
                className="input"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="email@intern.plne.co.id"
                style={{ paddingLeft: 40 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="label">Kata Sandi</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <svg style={{ position: 'absolute', left: 12, color: 'var(--text-muted)', flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                className="input"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="••••••••••"
                style={{ paddingLeft: 40, paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                style={{
                  position: 'absolute', right: 12,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 4, display: 'flex'
                }}
                aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%', height: '3rem', fontSize: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem',
              opacity: loading ? 0.75 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {loading
              ? <><Loader2 size={18} style={{ animation: 'loginSpin 1s linear infinite' }}/> Memverifikasi...</>
              : <><LogIn size={18}/> Masuk Sekarang</>
            }
          </button>
        </form>

        {/* Footer Links */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            💬 Lupa akun atau kata sandi?{' '}
            <a href="/reset-password" style={{ color: 'var(--primary)', fontWeight: 700 }}>Reset Akun Mandiri</a>
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            🎓 Maba / Belum terdaftar?
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            🚀 <a href="/onboarding" style={{ color: 'var(--primary)', fontWeight: 700 }}>Formulir Pendaftaran (Onboarding)</a>
            {' '}·{' '}
            <a href="/guide" style={{ color: 'var(--primary)', fontWeight: 700 }}>📖 Baca Buku Panduan Sistem</a>
          </p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
            © 2026 PLN Enjiniring · HRIS Magang
          </p>
        </div>
      </div>

      {/* Inline styles — plain <style> tag (Safari compatible, no JSX props) */}
      <style>{`
        @keyframes loginScaleUp {
          from { transform: scale(0.93); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
        @keyframes loginSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

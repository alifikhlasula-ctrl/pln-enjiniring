'use client'
import React, { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Shield, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import Swal from 'sweetalert2'

export default function ResetPasswordPage() {
  const { user, logout } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [show,     setShow]     = useState(false)
  const [loading,  setLoading]  = useState(false)

  const isMatched = password && password === confirm && password.length >= 6

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isMatched) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, newPassword: password })
      })
      const data = await res.json()
      if (res.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Kata sandi Anda telah diperbarui. Silakan login kembali dengan sandi baru Anda.',
          confirmButtonColor: 'var(--primary)'
        })
        logout() // Force logout to re-login with new password
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: err.message, confirmButtonColor: 'var(--primary)' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lp-wrap" style={{ background: 'var(--bg-main)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="lp-orb lp-orb-1"></div>
      <div className="lp-orb lp-orb-2"></div>

      <div className="animate-slide-up" style={{ width: '100%', maxWidth: '420px', padding: '1rem', zIndex: 1 }}>
        <div className="card" style={{ padding: '2.5rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              padding: '6px 16px', background: 'var(--warning-light)',
              borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700,
              color: 'var(--warning)', marginBottom: '1.25rem'
            }}>
              <Shield size={14} /> Aktivitas Keamanan
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Ganti Kata Sandi</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Untuk keamanan akun Anda, silakan ganti kata sandi default <b>password123</b> dengan yang baru.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="label">Email Anda</label>
              <input className="input" value={user?.email || ''} readOnly style={{ background: 'var(--bg-main)', opacity: 0.8 }} />
            </div>

            <div className="form-group">
              <label className="label">Kata Sandi Baru</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={show ? 'text' : 'password'}
                  className="input"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  placeholder="Min. 6 karakter"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Konfirmasi Kata Sandi</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={show ? 'text' : 'password'}
                  className="input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Ulangi kata sandi baru"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
              </div>
              {confirm && password !== confirm && (
                <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={12} /> Kata sandi tidak cocok.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isMatched || loading}
              style={{ width: '100%', marginTop: '0.5rem', height: '46px' }}
            >
              {loading ? <Loader2 className="spin-icon" size={18} /> : <span>Perbarui &amp; Keluar</span>}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Setelah berhasil, Anda akan diminta login kembali menggunakan sandi yang baru.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .lp-orb { position: absolute; border-radius: 50%; filter: blur(100px); opacity: 0.1; }
        .lp-orb-1 { width: 400px; height: 400px; background: var(--primary); top: -100px; right: -50px; }
        .lp-orb-2 { width: 300px; height: 300px; background: var(--warning); bottom: -50px; left: -50px; }
        .spin-icon { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

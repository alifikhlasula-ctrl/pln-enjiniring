'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, Loader2, AlertCircle } from 'lucide-react'
import Swal from 'sweetalert2'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil Login',
          text: `Selamat datang, ${data.user.name}`,
          timer: 1500,
          showConfirmButton: false
        })
        router.push('/')
      } else {
        Swal.fire('Gagal', data.error || 'Email atau password salah', 'error')
      }
    } catch (error) {
      Swal.fire('Error', 'Terjadi kesalahan sistem', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="card login-card animate-scale-up">
        <div className="login-header">
          <div className="logo-icon"></div>
          <h1>INTERN<span style={{ color: 'var(--primary)' }}>HUB</span></h1>
          <p>Silakan masuk ke akun HRIS Anda</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="label">Alamat Email</label>
            <input 
              type="email" 
              className="input" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="admin@hris.com" 
            />
          </div>
          <div className="form-group">
            <label className="label">Kata Sandi</label>
            <input 
              type="password" 
              className="input" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
            />
          </div>
          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <><LogIn size={18} /> Masuk Sekarang</>}
          </button>
        </form>

        <div className="login-footer">
          <p>Lupa kata sandi? Hubungi tim IT Admin</p>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }
        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 2.5rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          background: white;
        }
        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .logo-icon {
          width: 48px;
          height: 48px;
          background: var(--primary);
          margin: 0 auto 1rem;
          border-radius: 12px;
        }
        .login-header h1 {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
        }
        .login-header p {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
        .login-btn {
          width: 100%;
          margin-top: 1rem;
          height: 3rem;
          font-size: 1rem;
          display: flex;
          gap: 0.75rem;
        }
        .login-footer {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .animate-scale-up {
          animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes scaleUp {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}

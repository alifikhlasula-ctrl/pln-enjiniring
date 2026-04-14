'use client'

import React, { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/app/layout'
import { Shield, Lock, Mail, Loader2, Sparkles, ArrowRight, Moon, Sun, Eye, EyeOff, BookOpen } from 'lucide-react'
import Swal from 'sweetalert2'

export default function LoginPage() {
  const { login, finalizeLogin, loading: authLoading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState(null)

  // ── States for Force Update Flow ──
  const [forcingUpdate, setForcingUpdate] = useState(false)
  const [tempUser, setTempUser] = useState(null)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updateLoading, setUpdateLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const result = await login(email, password)
    
    if (!result.success) {
      setError(result.error)
    } else if (result.mustChangePassword) {
      // Transition to Force Update Form
      setTempUser(result.tempUser)
      setNewEmail(result.tempUser.email)
      setForcingUpdate(true)
    }
    // if success and !mustChangePassword, AuthContext handles the redirect
  }

  const handleForceUpdateSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi sandi baru tidak sama.')
      return
    }
    if (newPassword.length < 6) {
      setError('Sandi baru minimal 6 karakter.')
      return
    }

    setUpdateLoading(true)
    try {
      const res = await fetch('/api/auth/force-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: tempUser.id, newEmail, newPassword })
      })
      const data = await res.json()
      
      if (res.ok) {
        const updatedUser = { ...tempUser, email: newEmail, mustChangePassword: false }
        await Swal.fire({
          title: 'Profil Diperbarui!',
          text: 'Selamat datang di portal PLN ENJINIRING.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        })
        finalizeLogin(updatedUser)
      } else {
        setError(data.error || 'Gagal memperbarui profil.')
      }
    } catch(err) {
      setError('Gagal menghubungi server.')
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleResetSelf = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Reset Akun Mandiri',
      html: `
        <div style="text-align: left; margin-bottom: 12px; font-size: 0.85rem; color: var(--text-muted)">
          Verifikasi identitas Anda untuk mengatur ulang akses.
        </div>
        <input id="swal-name" class="swal2-input" placeholder="Nama Lengkap Sesuai HR" style="width: 85%; font-size: 0.9rem;">
        <input id="swal-nim" class="swal2-input" placeholder="NIM / NIS" style="width: 85%; font-size: 0.9rem;">
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <input id="swal-email" class="swal2-input" placeholder="Email Baru" type="email" style="width: 85%; font-size: 0.9rem;">
        <input id="swal-pass" class="swal2-input" placeholder="Password Baru" type="password" style="width: 85%; font-size: 0.9rem;">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Reset Sekarang',
      cancelButtonText: 'Batal',
      confirmButtonColor: 'var(--primary)',
      preConfirm: () => {
        const name = document.getElementById('swal-name').value
        const nim_nis = document.getElementById('swal-nim').value
        const newEmail = document.getElementById('swal-email').value
        const newPassword = document.getElementById('swal-pass').value
        if (!name || !nim_nis || !newEmail || !newPassword) {
          Swal.showValidationMessage('Harap lengkapi semua bidang di atas')
          return false
        }
        return { name, nim_nis, newEmail, newPassword }
      }
    })

    if (formValues) {
      Swal.showLoading()
      try {
        const res = await fetch('/api/auth/reset-self', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formValues)
        })
        const data = await res.json()
        if (data.success) {
          Swal.fire({
            title: 'Berhasil!',
            text: data.message,
            icon: 'success',
            confirmButtonColor: 'var(--secondary)'
          })
        } else {
          Swal.fire('Gagal', data.error || 'Terjadi kesalahan sistem', 'error')
        }
      } catch (err) {
        Swal.fire('Error', 'Gagal menghubungi server', 'error')
      }
    }
  }

  return (
    <div className="login-grid-wrapper">

      {/* Hero Section (Left Image) */}
      <section className="login-hero-section">
      </section>

      {/* Authentication Section (Right Panel) */}
      <section className="login-auth-section">
        
        {/* Navigation / Header */}
        <header className="auth-header-bar">
          <button
            className="auth-theme-trigger"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={18} strokeWidth={2} /> : <Sun size={18} strokeWidth={2} />}
          </button>
        </header>

        {/* Main Content Form */}
        <main className="auth-form-container">
          <div className="auth-form-card">
            
            <div className="auth-title-area">
              <div className="login-branding-badge">
                <img src="/pln-logo.png" alt="PLN Logo" className="branding-logo" />
                <span className="branding-text">Intern Hub PLNE</span>
              </div>
              <div className="auth-portal-badge">
                <Shield size={12} strokeWidth={2} />
                Portal HRIS Magang
              </div>
              <h1>Selamat Datang</h1>
              <p>Masuk ke akun HRIS Anda untuk melanjutkan</p>
            </div>

            {/* Finalization Trigger Hook Trigger */}
            {tempUser && (
              <button 
                id="finalize-trigger" 
                style={{display: 'none'}} 
                onClick={() => finalizeLogin({ ...tempUser, email: newEmail, mustChangePassword: false })}
              />
            )}

            {!forcingUpdate ? (
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group custom-margin">
                  <label className="label" htmlFor="email-input">Alamat Email</label>
                  <div className="input-with-icon">
                    <Mail size={16} strokeWidth={2} className="input-icon" />
                    <input
                      id="email-input"
                      type="email"
                      placeholder="nama@perusahaan.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="input auth-clean-input"
                    />
                  </div>
                </div>

                <div className="form-group custom-margin">
                  <label className="label" htmlFor="password-input">Kata Sandi</label>
                  <div className="input-with-icon">
                    <Lock size={16} strokeWidth={2} className="input-icon" />
                    <input
                      id="password-input"
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="input auth-clean-input padded-right"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="password-toggle-btn"
                    >
                      {showPass ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="auth-error-banner" role="alert">
                    ⚠️ {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary w-full auth-submit-btn"
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <><Loader2 size={18} className="spinner" /> Memverifikasi...</>
                  ) : (
                    <><span>Masuk Sekarang</span> <ArrowRight size={18} /></>
                  )}
                </button>
              </form>
            ) : (
              /* --- FORCED UPDATE FORM --- */
              <form onSubmit={handleForceUpdateSubmit} noValidate style={{animation: 'fadeIn 0.4s ease-in-out'}}>
                <div style={{marginBottom: '1rem', padding: '0.8rem', background: 'var(--warning-light)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.4)'}}>
                  <p style={{fontSize: '0.82rem', color: '#b45309'}}>
                    <strong>Aksi Diperlukan:</strong> Ini adalah login pertama Anda. Demi keamanan, silakan perbarui Email dan Kata Sandi bawaan Anda.
                  </p>
                </div>

                <div className="form-group custom-margin">
                  <label className="label" htmlFor="new-email-input">Email Baru</label>
                  <div className="input-with-icon">
                    <Mail size={16} strokeWidth={2} className="input-icon" />
                    <input
                      id="new-email-input"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                      className="input auth-clean-input"
                    />
                  </div>
                </div>

                <div className="form-group custom-margin" style={{marginBottom: '0.8rem'}}>
                  <label className="label" htmlFor="new-password-input">Sandi Baru</label>
                  <div className="input-with-icon">
                    <Lock size={16} strokeWidth={2} className="input-icon" />
                    <input
                      id="new-password-input"
                      type={showPass ? 'text' : 'password'}
                      placeholder="Minimal 6 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="input auth-clean-input padded-right"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="password-toggle-btn">
                      {showPass ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                    </button>
                  </div>
                </div>

                <div className="form-group custom-margin">
                  <label className="label" htmlFor="confirm-password-input">Konfirmasi Sandi Baru</label>
                  <div className="input-with-icon">
                    <Lock size={16} strokeWidth={2} className="input-icon" />
                    <input
                      id="confirm-password-input"
                      type={showPass ? 'text' : 'password'}
                      placeholder="Ulangi sandi baru"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="input auth-clean-input padded-right"
                    />
                  </div>
                </div>

                {error && <div className="auth-error-banner" role="alert">⚠️ {error}</div>}

                <button
                  type="submit"
                  className="btn btn-primary w-full auth-submit-btn"
                  disabled={updateLoading}
                >
                  {updateLoading ? (
                    <><Loader2 size={18} className="spinner" /> Memperbarui...</>
                  ) : (
                    <><span>Simpan & Lanjutkan Login</span> <ArrowRight size={18} /></>
                  )}
                </button>
              </form>
            )}

            {/* Assistance Section */}
            <div className="auth-assistance-area">
              <div className="auth-reset-block">
                <span>💬 Lupa akun atau kata sandi?</span>
                <button type="button" onClick={handleResetSelf} className="auth-reset-btn">
                  Reset Akun Mandiri
                </button>
              </div>

              <div className="auth-onboarding-block">
                <p>Maba / Belum terdaftar?</p>
                <a href="/onboarding" className="auth-onboarding-btn">
                  <Sparkles size={16} /> Formulir Pendaftaran (Onboarding)
                </a>
                <a href="/help" className="auth-onboarding-btn" style={{marginTop: '0.75rem', background: 'var(--primary-light)', border: '1px solid var(--primary)', color: 'var(--primary)', borderColor: 'var(--primary)'}}>
                  <BookOpen size={16} /> Baca Buku Panduan Sistem
                </a>
              </div>
            </div>

          </div>
        </main>

        <footer className="auth-footer-bar">
          <p>© 2026 PLN Enjiniring · HRIS Magang</p>
        </footer>

      </section>

      <style jsx>{`
        /* --- BRAND NEW SCOPED CLASSES --- */
        .login-grid-wrapper {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          min-height: 100vh;
          width: 100%;
          background-color: var(--bg-main);
        }

        /* --- Left Side: Hero Image --- */
        .login-hero-section {
          position: relative;
          background-image: url('/home-bg.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }

        .login-branding-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 8px 16px;
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .branding-logo {
          height: 38px;
        }

        .branding-text {
          font-weight: 800;
          font-size: 1.15rem;
          color: var(--text-primary);
        }

        /* --- Right Side: Solid Authentication Panel --- */
        .login-auth-section {
          background-color: var(--bg-card);
          display: flex;
          flex-direction: column;
          border-left: 1px solid var(--border);
          position: relative;
        }

        .auth-header-bar {
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding: 0 40px;
        }

        .auth-theme-trigger {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background-color: var(--bg-main);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }
        .auth-theme-trigger:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .auth-form-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }

        .auth-form-card {
          width: 100%;
          max-width: 400px;
          animation: slideUpFade 0.4s ease-out forwards;
        }

        /* --- Typography & Form Internals --- */
        .auth-title-area {
          margin-bottom: 32px;
        }

        .auth-portal-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background-color: var(--primary-light);
          color: var(--primary);
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .auth-title-area h1 {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 8px;
          color: var(--text-primary);
        }

        .auth-title-area p {
          color: var(--text-secondary);
          font-size: 0.95rem;
        }

        .custom-margin {
          margin-bottom: 1.25rem;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          color: var(--text-muted);
        }

        .auth-clean-input {
          width: 100%;
          padding-left: 48px !important;
          height: 52px;
        }
        
        .padded-right {
          padding-right: 48px !important;
        }

        .password-toggle-btn {
          position: absolute;
          right: 16px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
        }

        .auth-error-banner {
          background-color: var(--danger-light);
          color: var(--danger);
          padding: 14px 16px;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 24px;
        }

        .auth-submit-btn {
          height: 54px;
          font-size: 1rem;
          font-weight: 700;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        /* --- Assistance Blocks --- */
        .auth-assistance-area {
          margin-top: 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .auth-reset-block {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .auth-reset-btn {
          background: transparent;
          border: none;
          color: var(--primary);
          font-weight: 800;
          font-size: 0.875rem;
          text-decoration: underline;
          cursor: pointer;
        }

        .auth-onboarding-block {
          background-color: var(--bg-main);
          border: 1px dashed var(--border);
          padding: 20px;
          border-radius: 16px;
          text-align: center;
        }

        .auth-onboarding-block p {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }

        .auth-onboarding-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background-color: var(--bg-card);
          color: var(--primary);
          font-weight: 800;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          text-decoration: none;
          transition: all 0.2s;
        }
        
        .auth-onboarding-btn:hover {
          border-color: var(--primary);
          background-color: var(--primary-light);
        }

        /* --- Footer --- */
        .auth-footer-bar {
          padding: 24px;
          text-align: center;
          font-size: 0.75rem;
          color: var(--text-muted);
          border-top: 1px solid var(--border);
          letter-spacing: 0.5px;
        }

        .spinner {
          animation: loadSpin 1s infinite linear;
        }

        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes loadSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* --- Responsiveness --- */
        @media (max-width: 1024px) {
          .login-grid-wrapper {
            grid-template-columns: 1fr;
          }
          .login-hero-section {
            min-height: 250px;
          }
          .login-auth-section {
            border-left: none;
          }
          .login-branding-badge {
            top: 16px;
            left: 16px;
            transform: scale(0.9);
            transform-origin: top left;
          }
        }
      `}</style>
    </div>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { User, Phone, MapPin, GraduationCap, Map, Clock, Briefcase, CreditCard, Save, RefreshCw, AlertCircle, Building, Hash, Camera, Lock } from 'lucide-react'
import Swal from 'sweetalert2'

export default function InternProfilePage() {
  const { user, login, updateUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(user?.image || '')
  const [profileSaved, setProfileSaved] = useState(false)
  const [formData, setFormData] = useState({
    name: '', nim_nis: '', phone: '', nik: '', birthDate: '', address: '', gender: 'Laki-laki',
    university: '', jenjang: 'S1', major: '', 
    bidang: '', wilayah: '', periodStart: '', periodEnd: '',
    supervisorName: '', supervisorTitle: '',
    bankName: '', bankAccount: '', bankAccountName: ''
  })
  const [internId, setInternId] = useState(null)
  
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  // Listen for PWA installability
  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)
    
    // Check if already installed
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    setIsStandalone(isPWA)

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstallable(false)
    }
    setDeferredPrompt(null)
  }

  useEffect(() => {
    if (user?.id) {
      fetchProfile()
      const img = user.image
      if (img && !avatarPreview) setAvatarPreview(img)
    }
  }, [user?.id])

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/intern/profile?userId=${user.id}`, { cache: 'no-store' })
      const data = await res.json()
      if (data.success) {
        if (data.user?.image) {
          setAvatarPreview(data.user.image)
        }
        
        if (data.intern) {
          setInternId(data.intern.id)
          setFormData({
          name: data.intern.name || data.user?.name || '',
          nim_nis: data.intern.nim_nis || '',
          phone: data.intern.phone || '',
          nik: data.intern.nik || '',
          birthDate: data.intern.birthDate || '',
          address: data.intern.address || '',
          gender: data.intern.gender || 'Laki-laki',
          university: data.intern.university || '',
          jenjang: data.intern.jenjang || 'S1',
          major: data.intern.major || '',
          bidang: data.intern.bidang || '',
          wilayah: data.intern.wilayah || '',
          periodStart: data.intern.periodStart || '',
          periodEnd: data.intern.periodEnd || '',
          supervisorName: data.intern.supervisorName || '',
          supervisorTitle: data.intern.supervisorTitle || '',
          bankName: data.intern.bankName || '',
          bankAccount: data.intern.bankAccount || '',
          bankAccountName: data.intern.bankAccountName || ''
        })
        }
      }
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'Gagal memuat data profil', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      return Swal.fire('Ukuran Terlalu Besar', 'Maksimal ukuran foto adalah 2MB.', 'warning')
    }

    setUploadingAvatar(true)
    const form = new FormData()
    form.append('userId', user.id)
    form.append('avatar', file)

    try {
      const res = await fetch('/api/intern/avatar', { method: 'POST', body: form })
      const data = await res.json()
      if (data.success) {
        setAvatarPreview(data.url)
        updateUser({ image: data.url }) // Update the AuthContext and localStorage
        Swal.fire({ icon: 'success', title: 'Upload Berhasil', timer: 1500, showConfirmButton: false })
      } else {
        Swal.fire('Gagal', data.error || 'Terjadi kesalahan upload', 'error')
      }
    } catch {
      Swal.fire('Error', 'Gagal menghubungi server', 'error')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()

    // Accept both a real data URI upload OR an existing proxy URL from the server
    const hasAvatar = avatarPreview && (
      avatarPreview.startsWith('data:') ||
      avatarPreview.startsWith('/api/') ||
      avatarPreview.startsWith('http')
    )
    
    // Foto profil sekarang opsional, tidak wajib untuk menyimpan biodata

    setSaving(true)
    try {
      const res = await fetch('/api/intern/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ...formData })
      })
      const data = await res.json()
      if (data.success) {
        setProfileSaved(true)
        await Swal.fire({ icon: 'success', title: 'Berhasil Disimpan!', text: 'Profil berhasil diperbarui. Mengalihkan ke dashboard...', timer: 1800, showConfirmButton: false })
        if (!internId && data.intern) setInternId(data.intern.id)
        
        // Hard reload with a cache-bust to force layout to re-check completeness from fresh DB data
        window.location.replace('/dashboard?_cb=' + Date.now())
      } else {
        Swal.fire('Gagal', data.error || 'Terjadi kesalahan sistem', 'error')
      }
    } catch (err) {
      Swal.fire('Error', 'Gagal menyimpan profil', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="container" style={{display:'flex',justifyContent:'center',padding:'4rem'}}><RefreshCw className="spin" size={24} style={{animation:'spin 1s linear infinite',color:'var(--primary)'}}/></div>

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><User size={22} strokeWidth={2} /> Profil Saya</h1>
        <p className="subtitle">Lengkapi biodata administratif Anda yang dibutuhkan oleh divisi HR.</p>
      </div>

      {!internId && (
        <div style={{ padding: '1rem', background: 'var(--warning-light)', color: 'var(--warning)', borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.5rem', border: '1px solid currentColor' }}>
          <AlertCircle size={18} strokeWidth={2} style={{ marginTop: 2, flexShrink: 0 }}/>
          <div>
            <p style={{ fontWeight: 800, fontSize: '0.85rem' }}>Peringatan Data Belum Lengkap!</p>
            <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Akun ini belum memiliki rekaman data peserta magang resmi (biasanya terjadi jika akun dibuat manual oleh IT). Harap melengkapi seluruh formulir di bawah ini dan tekan Simpan.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        
        {/* SEKMEN PRIBADI */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8, paddingBottom: '0.5rem', borderBottom: '2px solid var(--border)' }}>
            <User size={18} /> 1. Data Personal
          </h2>

          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem', background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ position: 'relative', width: 80, height: 80, borderRadius: '50%', backgroundColor: 'var(--primary-light)', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', border: '2px solid var(--primary)', flexShrink: 0 }}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={32} color="var(--primary)" />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>Foto Profil</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>Format .PNG/.JPG max 2MB. Foto ini akan muncul di ID Card dan profil intern.</p>
              <label className="btn btn-secondary" style={{ display: 'inline-flex', padding: '0.4rem 0.8rem', fontSize: '0.75rem', cursor: 'pointer', alignItems: 'center', gap: 6 }}>
                {uploadingAvatar ? <RefreshCw className="spin" size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={14} />}
                {uploadingAvatar ? 'Mengunggah...' : 'Pilih Foto Baru'}
                <input type="file" accept="image/png, image/jpeg" style={{ display: 'none' }} onChange={handleAvatarChange} disabled={uploadingAvatar} />
              </label>
            </div>
          </div>

          
          <div className="form-group">
            <label className="label">Nama Lengkap</label>
            <div style={{position:'relative'}}>
              <User size={14} style={{position:'absolute', left:12, top:13, color:'var(--text-muted)'}} />
              <input name="name" type="text" className="input" style={{paddingLeft:36}} value={formData.name} onChange={handleChange} required />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="label">NIK / KTP</label>
              <div style={{position:'relative'}}>
                <Hash size={14} style={{position:'absolute', left:12, top:13, color:'var(--text-muted)'}} />
                <input name="nik" type="text" className="input" style={{paddingLeft:36}} value={formData.nik} onChange={handleChange} placeholder="16 Digit NIK" required />
              </div>
            </div>
            <div className="form-group">
              <label className="label">NIM / NIS</label>
              <div style={{position:'relative'}}>
                <Hash size={14} style={{position:'absolute', left:12, top:13, color:'var(--text-muted)'}} />
                <input name="nim_nis" type="text" className="input" style={{paddingLeft:36}} value={formData.nim_nis} onChange={handleChange} placeholder="No Mahasiswa/Siswa" required />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="label">Tanggal Lahir</label>
              <input name="birthDate" type="date" className="input" value={formData.birthDate} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="label">Jenis Kelamin</label>
              <select name="gender" className="select" value={formData.gender} onChange={handleChange}>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="label">No. Telepon / WhatsApp</label>
            <div style={{position:'relative'}}>
              <Phone size={14} style={{position:'absolute', left:12, top:13, color:'var(--text-muted)'}} />
              <input name="phone" type="tel" className="input" style={{paddingLeft:36}} value={formData.phone} onChange={handleChange} placeholder="Contoh: 08123456789" required />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">Alamat Domisili Lengkap</label>
            <textarea name="address" className="textarea" rows="3" value={formData.address} onChange={handleChange} placeholder="Nama Jalan, RT/RW, Kel, Kec, Kota..." required />
          </div>
        </div>

        {/* SEKMEN AKADEMIK & MENTOR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8, paddingBottom: '0.5rem', borderBottom: '2px solid var(--border)' }}>
              <GraduationCap size={18} /> 2. Afiliasi Akademik
            </h2>
            
            <div className="form-group">
              <label className="label">Nama Instansi / Universitas</label>
              <div style={{position:'relative'}}>
                <Building size={14} style={{position:'absolute', left:12, top:13, color:'var(--text-muted)'}} />
                <input name="university" type="text" className="input" style={{paddingLeft:36}} value={formData.university} onChange={handleChange} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: 0 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Jenjang</label>
                <select name="jenjang" className="select" value={formData.jenjang} onChange={handleChange}>
                  <option value="SMK">SMK</option>
                  <option value="D3">D3</option>
                  <option value="D4">D4</option>
                  <option value="S1">S1</option>
                  <option value="S2">S2</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Jurusan / Program Studi</label>
                <input name="major" type="text" className="input" value={formData.major} onChange={handleChange} required />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--warning)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8, paddingBottom: '0.5rem', borderBottom: '2px solid var(--border)' }}>
              <Briefcase size={18} /> 3. Penempatan & Pembimbing
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="label">Bidang Magang</label>
                <input name="bidang" type="text" className="input" value={formData.bidang} onChange={handleChange} placeholder="Contoh: IT Development" required />
              </div>
              <div className="form-group">
                <label className="label">Wilayah Kantor</label>
                <input name="wilayah" type="text" className="input" value={formData.wilayah} onChange={handleChange} placeholder="Contoh: Bandung" required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background:'var(--bg-main)', padding:'0.75rem', borderRadius:'var(--radius-md)', marginBottom:'1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>Mulai <Lock size={12} style={{ color:'var(--danger)' }}/></label>
                <input name="periodStart" type="date" className="input" value={formData.periodStart} readOnly style={{ background: 'var(--bg-card)', cursor: 'not-allowed', opacity: 0.8 }} title="Dikunci oleh Admin" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>Selesai <Lock size={12} style={{ color:'var(--danger)' }}/></label>
                <input name="periodEnd" type="date" className="input" value={formData.periodEnd} readOnly style={{ background: 'var(--bg-card)', cursor: 'not-allowed', opacity: 0.8 }} title="Dikunci oleh Admin" />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Nama Supervisor / Mentor</label>
              <input name="supervisorName" type="text" className="input" value={formData.supervisorName} onChange={handleChange} placeholder="Nama lengkap beserta gelar pembimbing" required />
              <p style={{fontSize:'0.65rem', color:'var(--text-muted)', marginTop:4}}>Data pembimbing dibutuhkan sebagai validasi Cetak Laporan PDF.</p>
            </div>
          </div>

        </div>

        {/* SEKMEN REKENING + BUTTONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8, paddingBottom: '0.5rem', borderBottom: '2px solid var(--border)' }}>
              <CreditCard size={18} /> 4. Data Rekening (Payroll)
            </h2>
            
            <div className="form-group">
              <label className="label">Nama Bank Lengkap</label>
              <input name="bankName" type="text" className="input" value={formData.bankName} onChange={handleChange} placeholder="Contoh: Bank BCA (Bank Central Asia)" />
            </div>

            <div className="form-group">
              <label className="label">Nomor Rekening</label>
              <div style={{position:'relative'}}>
                <Hash size={14} style={{position:'absolute', left:12, top:13, color:'var(--text-muted)'}} />
                <input name="bankAccount" type="text" className="input" style={{paddingLeft:36}} value={formData.bankAccount} onChange={handleChange} placeholder="Masukan angka saja" />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Atas Nama Rekening</label>
              <input name="bankAccountName" type="text" className="input" value={formData.bankAccountName} onChange={handleChange} placeholder="Nama tercetak pada buku tabungan" />
              <p style={{fontSize:'0.65rem', color:'var(--danger)', marginTop:4}}>* Kesalahan penulisan rekening dapat menunda pengiriman uang saku.</p>
            </div>
          </div>

          <div style={{ position: 'sticky', top: 80 }}>
            <div className="card" style={{ padding: '1.5rem', background: 'var(--primary-light)', border: '1px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--primary-dark)' }}>Pastikan seluruh data yang Anda masukkan adalah benar dan sadar. Anda bertanggung jawab penuh atas kebenaran administratif ini.</p>
              <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '1rem' }}>
                {saving ? <RefreshCw className="spin" size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} strokeWidth={2} />} 
                {saving ? 'Menyimpan...' : 'Simpan Profil Sekarang'}
              </button>
            </div>
            
            {/* PWA Install Button */}
            {!isStandalone && (isInstallable || isIOS) && (
              <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', border: '1px solid rgba(0,162,233,0.3)', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', color: 'white' }}>
                <div>
                  <p style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, color: '#00A2E9' }}>
                    📱 Instal Aplikasi
                  </p>
                  <p style={{ fontSize: '0.75rem', marginTop: 4, color: 'rgba(255,255,255,0.7)' }}>Pasang InternHub di homescreen HP Anda untuk akses lebih cepat dan notifikasi absensi.</p>
                </div>
                
                {isIOS ? (
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: 8, fontSize: '0.8rem', lineHeight: 1.5 }}>
                    Untuk pengguna <b>iPhone/iPad Safari</b>:<br/>
                    1. Tekan ikon <b>Share</b> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{margin:'0 2px', verticalAlign:'middle'}}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> di menu bawah layar.<br/>
                    2. Geser ke bawah dan pilih <b>"Add to Home Screen"</b> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{margin:'0 2px', verticalAlign:'middle'}}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                  </div>
                ) : (
                  <button type="button" onClick={handleInstallPWA} className="btn btn-primary" style={{ padding: '0.75rem', background: '#00A2E9', border: 'none', color: '#fff', fontWeight: 800 }}>
                    Install App Sekarang
                  </button>
                )}
              </div>
            )}
          </div>
          
        </div>
      </form>
    </div>
  )
}

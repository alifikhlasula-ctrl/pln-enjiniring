'use client'
import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart3, RefreshCw, AlertTriangle, Calendar,
  Settings2, ChevronLeft, LayoutDashboard, FileText,
  TrendingDown, Info
} from 'lucide-react'
import Link from 'next/link'
import KPICards from './KPICards'
import Charts from './Charts'
import CapacityManager from './CapacityManager'
import ExportButton from './ExportButton'
import Swal from 'sweetalert2'

export default function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/analytics')
      if (!res.ok) throw new Error('Gagal mengambil data analytics')
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleResetData = async () => {
    const { isConfirmed } = await Swal.fire({
      title: 'Hapus Seluruh Data Intern?',
      html: '<p style="font-size:0.9rem">Tindakan ini akan <b>menghapus seluruh</b> 400+ data peserta magang, absensi, dan laporan uji coba dari sistem. Anda yakin?</p>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: 'var(--text-muted)',
      confirmButtonText: 'Ya, Reset Bersih!',
      cancelButtonText: 'Batal',
      background: 'var(--bg-card)',
      color: 'var(--text-primary)'
    })

    if (isConfirmed) {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/reset', { method: 'POST' })
        if (!res.ok) throw new Error('Gagal mereset data')
        await Swal.fire({
          title: 'Berhasil',
          text: 'Data uji coba telah dibersihkan.',
          icon: 'success',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)'
        })
        fetchData()
      } catch (e) {
        Swal.fire({ title: 'Gagal', text: e.message, icon: 'error', background: 'var(--bg-card)', color: 'var(--text-primary)' })
        setLoading(false)
      }
    }
  }

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: '1.5rem' }}>
        <div className="loader-portal"></div>
        <p style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.05em', color: 'var(--primary)' }}>CRAFTING YOUR INSIGHTS...</p>
        <style jsx>{`
          .loader-portal {
            width: 60px;
            height: 60px;
            border: 4px solid var(--primary-light);
            border-top: 4px solid var(--primary);
            border-radius: 50%;
            animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', margin: '2rem' }}>
        <AlertTriangle size={64} style={{ color: 'var(--danger)', margin: '0 auto 1.5rem' }} />
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>Sistem Sedang Sibuk</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 2rem' }}>{error}</p>
        <button className="btn btn-primary" onClick={fetchData}>Mulai Ulang Analitik</button>
      </div>
    )
  }

  return (
    <div id="analytics-content" className="container animate-fade-in" style={{ paddingBottom: '6rem', maxWidth: '1440px' }}>
      {/* ── Dashboard Header ── */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2.5rem', 
        paddingTop: '1rem',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link href="/dashboard" className="btn btn-secondary shadow-sm" style={{ padding: '0.6rem', background: 'var(--bg-card)' }}>
              <ChevronLeft size={20} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ padding: '8px', background: 'var(--primary)', borderRadius: '12px', color: '#fff' }}>
                <BarChart3 size={24} />
              </div>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>Analytics Center</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
               <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', margin: 0 }}>Infrastruktur Monitoring & Peramalan Cerdas PLN ENJINIRING</p>
               <span style={{ height: '4px', width: '4px', borderRadius: '50%', background: 'var(--border)' }}></span>
               <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--secondary)', animation: 'pulse 2s infinite' }}></div>
                  Sistem Aktif
               </span>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-danger" onClick={handleResetData} disabled={loading} style={{ fontWeight: 700, background: '#ef4444', color: 'white', border: 'none' }}>
            <AlertTriangle size={16} />
            Reset Data Uji Coba
          </button>
          <button className="btn btn-secondary" onClick={fetchData} disabled={loading} style={{ fontWeight: 700 }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Muat Ulang
          </button>
          <ExportButton data={data} />
        </div>
      </div>

      {/* ── Global Alert Context ── */}
      {data.forecasting.gap.some(g => g > 0) && (
        <div className="forecast-banner shadow-premium">
          <div className="banner-icon-wrap">
            <AlertTriangle size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 800 }}>Indikasi Defisit Kapasitas Terdeteksi</h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
              Sistem memproyeksikan adanya kesenjangan personil pada bidang strategis dalam 6 bulan ke depan. 
              Segera sinkronisasi dengan tim <strong>Onboarding</strong> untuk mitigasi risiko operasional.
            </p>
          </div>
          <Link href="/admin/onboarding" className="btn-banner">
            Manajemen Onboarding →
          </Link>
        </div>
      )}

      {/* ── Dashboard Content ── */}
      <div className="dashboard-grid">
         <div className="grid-left">
            <KPICards summary={data.summary} />
            <Charts data={data} />
         </div>
      </div>

      {/* ── Capacity Management ── */}
      <div style={{ marginTop: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
           <Settings2 size={24} style={{ color: 'var(--primary)' }} />
           <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>Konfigurasi & Target</h2>
        </div>
        <CapacityManager initialTargets={data.distribution.targets} onUpdate={fetchData} />
      </div>

      <style jsx>{`
        .container {
           animation: fadeIn 0.8s var(--ease-standard);
        }
        .dashboard-grid {
           margin-top: 1rem;
        }
        .forecast-banner {
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
          color: #fff;
          border-radius: var(--radius-xl);
          padding: 1.5rem 2rem;
          margin-bottom: 2.5rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 15px 30px -10px rgba(239, 68, 68, 0.4);
        }
        .banner-icon-wrap {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .btn-banner {
          background: #fff;
          color: #ef4444;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 800;
          font-size: 0.875rem;
          text-decoration: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          white-space: nowrap;
        }
        .btn-banner:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <style jsx global>{`
        .shadow-premium {
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
        }
        [data-theme='dark'] .shadow-premium {
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 10px 20px -5px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  )
}

'use client'

import React from 'react'
import { useAuth } from '@/context/AuthContext'
import { Users, Star, AlertCircle } from 'lucide-react'
import AdminDashboard from './AdminDashboard'
import InternDashboard from './InternDashboard'

/* ─── Supervisor Dashboard ────────────────────────── */
const SupervisorDashboard = () => (
  <div className="animate-slide-up">
    <div className="page-header">
      <h1 className="title">Dashboard Supervisor</h1>
      <p className="subtitle">Kelola dan evaluasi intern yang Anda dampingi.</p>
    </div>

    <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
      {[
        { icon: <Users size={20} strokeWidth={2}/>,       value: '6',   label: 'Intern Anda',    bg: 'var(--primary-light)',   color: 'var(--primary)' },
        { icon: <Star size={20} strokeWidth={2}/>,        value: '4.8', label: 'Avg Rating',     bg: 'var(--secondary-light)', color: 'var(--secondary)' },
        { icon: <AlertCircle size={20} strokeWidth={2}/>, value: '3',   label: 'Perlu Evaluasi', bg: 'var(--warning-light)',   color: 'var(--warning)' },
      ].map((s, i) => (
        <div key={i} className="stat-card">
          <div className="stat-icon-wrap" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
          <div className="stat-value">{s.value}</div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)', marginTop: 'var(--sp-5)' }}>
      <div className="card">
        <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 'var(--sp-4)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <AlertCircle size={16} strokeWidth={2} color="var(--warning)" /> Evaluasi Pending
        </h3>
        <ul style={{ listStyle: 'none' }}>
          {['Alice Johnson – Minggu 4', 'Bob Smith – Minggu 4', 'Carol White – Minggu 3'].map((item, i) => (
            <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-3) 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.split('–')[0]}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.split('–')[1]}</p>
              </div>
              <a href="/evaluations" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>Evaluasi</a>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 'var(--sp-4)' }}>Ringkasan Tim</h3>
        {[
          { label: 'Rata-rata Rating',     value: '4.8 / 5.0' },
          { label: 'Keterlambatan Laporan',value: '0%' },
          { label: 'Kehadiran Tim',        value: '97.2%' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-3)', marginBottom: 'var(--sp-2)', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>{item.label}</span>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
)

/* ─── Page ────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <>
      {user.role === 'ADMIN_HR'   && <AdminDashboard />}
      {user.role === 'SUPERVISOR' && <SupervisorDashboard />}
      {user.role === 'INTERN'     && <InternDashboard />}
    </>
  )
}

import React from 'react'
import { Users, CreditCard, PieChart, TrendingUp } from 'lucide-react'

export default function KPICards({ summary }) {
  const cards = [
    { 
      label: 'Total Interns', 
      value: summary.totalInterns, 
      sub: 'Semua Status', 
      icon: Users, 
      color: 'var(--primary)', 
      bg: 'var(--primary-light)',
      gradient: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(99,102,241,0.02) 100%)'
    },
    { 
      label: 'Intern Aktif', 
      value: summary.activeInterns, 
      sub: 'Saat Ini', 
      icon: PieChart, 
      color: 'var(--secondary)', 
      bg: 'var(--secondary-light)',
      gradient: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.02) 100%)'
    },
    { 
      label: 'Estimasi Allowance', 
      value: `Rp ${(summary.estimatedBudget / 1000000).toFixed(1)} JT`, 
      sub: 'Bulan Ini', 
      icon: CreditCard, 
      color: '#f59e0b', 
      bg: '#fef3c7',
      gradient: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.02) 100%)'
    },
    { 
      label: 'Laju Penyelesaian', 
      value: `${summary.completionRate}%`, 
      sub: 'Lulus vs Masuk', 
      icon: TrendingUp, 
      color: '#8b5cf6', 
      bg: '#ede9fe',
      gradient: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(139,92,246,0.02) 100%)'
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
      {cards.map((c, i) => (
        <div key={i} className="stat-card shadow-premium" style={{ 
          padding: '1.5rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1.25rem', 
          background: c.gradient,
          border: '1px solid var(--border)', 
          borderRadius: 'var(--radius-xl)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative Background Icon */}
          <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.05, transform: 'rotate(-15deg)' }}>
            <c.icon size={80} />
          </div>

          <div style={{ width: 54, height: 54, borderRadius: 'var(--radius-lg)', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, flexShrink: 0, boxShadow: '0 8px 16px -4px rgba(0,0,0,0.1)' }}>
            <c.icon size={28} />
          </div>
          <div style={{ zIndex: 1 }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{c.label}</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{c.value}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 500 }}>{c.sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

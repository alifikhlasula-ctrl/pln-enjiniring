'use client'
import React, { useState, useEffect } from 'react'
import { Search, Filter, Star, Award, GraduationCap, Building2, Phone, Mail, TrendingUp, Users, ChevronDown, Download } from 'lucide-react'

const GRADE_COLOR = { 'A': '#22c55e', 'B': '#3b82f6', 'C': '#f59e0b', 'D': '#ef4444' }

function ScoreBadge({ score, grade }) {
  const color = GRADE_COLOR[grade] || '#6366f1'
  if (!score) return <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Belum Dievaluasi</span>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 42, height: 42, borderRadius: '50%', background: `${color}18`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', color }}>
        {grade || '-'}
      </div>
      <span style={{ fontWeight: 700, fontSize: '1rem', color }}>{score?.toFixed(1)}</span>
    </div>
  )
}

function AlumniCard({ alumni }) {
  const [expanded, setExpanded] = useState(false)
  const starColor = '#f59e0b'

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
      padding: '1.25rem', transition: 'all 0.25s', cursor: 'default',
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 style={{ fontWeight: 800, fontSize: '1rem', margin: 0, color: 'var(--text-primary)' }}>{alumni.name}</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>{alumni.major} · {alumni.jenjang}</p>
        </div>
        <ScoreBadge score={alumni.finalScore} grade={alumni.grade} />
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
          <Building2 size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />{alumni.bidang}
        </span>
        <span style={{ background: 'var(--bg-main)', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>
          <GraduationCap size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />{alumni.university}
        </span>
        {alumni.totalStars > 0 && (
          <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
            ⭐ {alumni.totalStars} Kudostars
          </span>
        )}
      </div>

      {/* Badges */}
      {alumni.badges?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {alumni.badges.map((b, i) => (
            <span key={i} style={{ background: `${b.color || '#6366f1'}15`, color: b.color || '#6366f1', border: `1px solid ${b.color || '#6366f1'}30`, fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 12 }}>
              🏅 {b.name}
            </span>
          ))}
        </div>
      )}

      {/* Magang period */}
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>
        📅 {alumni.periodStart} → {alumni.periodEnd || 'N/A'}
      </p>

      {/* Expand contact */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
      >
        <ChevronDown size={14} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
        {expanded ? 'Sembunyikan' : 'Lihat Kontak'}
      </button>

      {expanded && (
        <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg-main)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {alumni.phone && (
            <a href={`tel:${alumni.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600 }}>
              <Phone size={14} color="var(--primary)" /> {alumni.phone}
            </a>
          )}
          {alumni.email && (
            <a href={`mailto:${alumni.email}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600 }}>
              <Mail size={14} color="var(--primary)" /> {alumni.email}
            </a>
          )}
          {!alumni.phone && !alumni.email && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0 }}>Kontak tidak tersedia</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function TalentScoutPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterBidang, setFilterBidang] = useState('')
  const [filterUni, setFilterUni] = useState('')
  const [filterScore, setFilterScore] = useState(0)

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterBidang) params.set('bidang', filterBidang)
      if (filterUni) params.set('university', filterUni)
      if (filterScore > 0) params.set('minScore', filterScore)
      const res = await fetch(`/api/admin/talent-scout?${params}`)
      const d = await res.json()
      setData(d)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])
  useEffect(() => {
    const t = setTimeout(() => fetchData(), 400)
    return () => clearTimeout(t)
  }, [search, filterBidang, filterUni, filterScore])

  const handleExport = () => {
    window.open(`/api/admin/export/executive-report?month=${new Date().toISOString().slice(0, 7)}`, '_blank')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontWeight: 900, fontSize: '1.8rem', margin: 0, background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              🎯 Alumni Talent Scout
            </h1>
            <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: '0.9rem' }}>
              Database talenta alumni magang terverifikasi — temukan kandidat terbaik untuk kebutuhan rekrutmen Anda.
            </p>
          </div>
          {data && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ background: 'var(--primary-light)', borderRadius: 12, padding: '8px 16px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem', color: 'var(--primary)' }}>{data.total}</p>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>Alumni Tersedia</p>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text" placeholder="Cari nama, kampus, jurusan..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          <select value={filterBidang} onChange={e => setFilterBidang(e.target.value)} style={{ padding: '0.6rem 0.75rem', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}>
            <option value="">Semua Bidang</option>
            {data?.filters?.bidangs?.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={filterUni} onChange={e => setFilterUni(e.target.value)} style={{ padding: '0.6rem 0.75rem', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}>
            <option value="">Semua Universitas</option>
            {data?.filters?.universities?.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={filterScore} onChange={e => setFilterScore(Number(e.target.value))} style={{ padding: '0.6rem 0.75rem', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}>
            <option value={0}>Semua Skor</option>
            <option value={9}>≥ 9.0 (A)</option>
            <option value={8}>≥ 8.0 (B+)</option>
            <option value={7}>≥ 7.0 (C+)</option>
          </select>
        </div>

        {/* Results */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ height: 200, background: 'var(--bg-card)', borderRadius: 16, animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : data?.alumni?.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <Users size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontWeight: 700, fontSize: '1rem' }}>Tidak ada alumni yang cocok dengan filter ini.</p>
            <p style={{ fontSize: '0.85rem' }}>Coba ubah filter pencarian Anda.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 16 }}>
            {data?.alumni?.map(a => <AlumniCard key={a.id} alumni={a} />)}
          </div>
        )}
      </div>
    </div>
  )
}

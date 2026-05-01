'use client'
import React, { useState, useEffect } from 'react'
import { BarChart3, Users, Heart, Award, Briefcase, TrendingUp, Clock, FileText, DollarSign, RefreshCw, ChevronDown, Star, Calendar } from 'lucide-react'

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'wellbeing', label: 'Well-being & Laporan', icon: Heart },
  { id: 'talent', label: 'Talent & Evaluasi', icon: Award },
  { id: 'financial', label: 'Financial', icon: DollarSign },
]
const MOOD_EMOJI = { very_happy:'😄', happy:'🙂', neutral:'😐', sad:'😔', very_sad:'😢' }
const MOOD_LABEL = { very_happy:'Sangat Senang', happy:'Senang', neutral:'Biasa', sad:'Kurang Baik', very_sad:'Buruk' }
const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

function Card({ children, style, title, subtitle }) {
  return (
    <div className="card" style={{ padding:'1.25rem', ...style }}>
      {title && <h3 style={{ fontWeight:800, fontSize:'0.95rem', marginBottom: subtitle ? 2 : 12 }}>{title}</h3>}
      {subtitle && <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginBottom:12 }}>{subtitle}</p>}
      {children}
    </div>
  )
}

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div className="card" style={{ padding:'1rem', borderTop:`3px solid ${color}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <p style={{ fontSize:'0.62rem', fontWeight:800, color, letterSpacing:'0.05em', textTransform:'uppercase' }}>{label}</p>
          <p style={{ fontSize:'1.6rem', fontWeight:900, color, lineHeight:1.1, marginTop:2 }}>{value}</p>
          {sub && <p style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:4 }}>{sub}</p>}
        </div>
        <span style={{ fontSize:'1.2rem' }}>{icon}</span>
      </div>
    </div>
  )
}

function MiniBar({ items, colorFn, formatValue }) {
  const max = Math.max(...items.map(i => i.value), 1)
  const fmt = formatValue || (v => v)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {items.slice(0,12).map((item, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span title={item.label} style={{ fontSize:'0.72rem', fontWeight:700, width:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0 }}>{item.label}</span>
          <div style={{ flex:1, height:18, background:'var(--bg-main)', borderRadius:4, overflow:'hidden' }}>
            <div style={{ width:`${(item.value/max)*100}%`, height:'100%', background: colorFn ? colorFn(i) : 'var(--primary)', borderRadius:4, transition:'width 0.5s', minWidth: item.value > 0 ? 4 : 0 }} />
          </div>
          <span style={{ fontSize:'0.72rem', fontWeight:800, minWidth:50, textAlign:'right' }}>{fmt(item.value)}</span>
        </div>
      ))}
    </div>
  )
}

function CountdownList({ items, label, color }) {
  if (!items?.length) return <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', textAlign:'center', padding:'1rem' }}>Tidak ada data</p>
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 10px', borderRadius:8, background:'var(--bg-main)', border:'1px solid var(--border)' }}>
          <div>
            <p style={{ fontWeight:700, fontSize:'0.82rem' }}>{it.name}</p>
            <p style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>{it.bidang}</p>
          </div>
          <span style={{ fontWeight:900, fontSize:'0.85rem', color, padding:'2px 10px', borderRadius:99, background:`${color}18` }}>
            {it.daysUntil !== undefined ? `${it.daysUntil} hari` : `${it.daysLeft} hari`}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function InternInsightPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [filter, setFilter] = useState({ month: '', year: '' })

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter.month) params.append('month', filter.month)
    if (filter.year) params.append('year', filter.year)
    params.append('_t', Date.now().toString())

    fetch(`/api/admin/intern-insight?${params.toString()}`)
      .then(r => r.json()).then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filter])

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'60vh' }}>
      <RefreshCw size={28} style={{ animation:'spin 1s linear infinite', color:'var(--primary)' }} />
    </div>
  )
  if (!data) return <div style={{ textAlign:'center', padding:'4rem', color:'var(--text-muted)' }}>Gagal memuat data.</div>

  const { overview: ov, wellbeing: wb, talent: tl, attendance: at, onboarding: ob, financial: fn } = data

  const fmtRp = v => `Rp ${(v||0).toLocaleString('id-ID')}`

  return (
    <>
      <div style={{ padding:'1.5rem', maxWidth:1400, margin:'0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom:'1.5rem', display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <h1 style={{ fontSize:'1.5rem', fontWeight:900, display:'flex', alignItems:'center', gap:8 }}>
              <TrendingUp size={22} style={{ color:'var(--primary)' }} /> Intern Insight
            </h1>
            <p style={{ color:'var(--text-secondary)', fontSize:'0.82rem', marginTop:4 }}>Dashboard analitik komprehensif untuk pemantauan peserta magang</p>
          </div>
          
          <div style={{ display:'flex', gap:8, alignItems:'center', background:'var(--bg-card)', padding:'8px 12px', borderRadius:12, border:'1px solid var(--border)' }}>
            <Calendar size={14} style={{ color:'var(--text-muted)' }} />
            <select 
              value={filter.month} 
              onChange={e => setFilter({ ...filter, month: e.target.value })}
              style={{ padding:'4px 8px', borderRadius:6, border:'1px solid var(--border)', background:'transparent', fontSize:'0.75rem', fontWeight:700, cursor:'pointer' }}
            >
              <option value="">Semua Bulan</option>
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
                <option key={m} value={m}>{['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][i]}</option>
              ))}
            </select>
            <select 
              value={filter.year} 
              onChange={e => setFilter({ ...filter, year: e.target.value })}
              style={{ padding:'4px 8px', borderRadius:6, border:'1px solid var(--border)', background:'transparent', fontSize:'0.75rem', fontWeight:700, cursor:'pointer' }}
            >
              <option value="">Tahun</option>
              {['2024','2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {(filter.month || filter.year) && (
              <button 
                onClick={() => setFilter({ month: '', year: '' })}
                style={{ background:'var(--danger-light)', color:'var(--danger)', border:'none', padding:'4px 8px', borderRadius:6, fontSize:'0.65rem', fontWeight:800, cursor:'pointer' }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:'1.5rem', background:'var(--bg-card)', padding:4, borderRadius:12, border:'1px solid var(--border)', flexWrap:'wrap' }}>
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display:'flex', alignItems:'center', gap:6, padding:'0.6rem 1rem', borderRadius:8,
                border:'none', cursor:'pointer', fontWeight:active?800:600, fontSize:'0.82rem',
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? '#fff' : 'var(--text-muted)', transition:'all 0.15s'
              }}>
                <Icon size={15} /> {t.label}
              </button>
            )
          })}
        </div>

        {/* ═══ TAB: OVERVIEW ═══ */}
        {tab === 'overview' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'0.75rem' }}>
              <StatCard label="Total Intern" value={ov.total} icon="👥" color="var(--primary)" />
              <StatCard label="Aktif" value={ov.statusCounts.ACTIVE} icon="✅" color="#22c55e" />
              <StatCard label="Pending" value={ov.statusCounts.PENDING} icon="⏳" color="#f59e0b" sub={ov.pendingInterns[0] ? `Terdekat: ${ov.pendingInterns[0].daysUntil} hari` : ''} />
              <StatCard label="Selesai" value={ov.statusCounts.COMPLETED} icon="🎓" color="#6366f1" />
              <StatCard label="Laki-laki" value={ov.genderCount['Laki-laki']||0} icon="👨" color="#3b82f6" />
              <StatCard label="Perempuan" value={ov.genderCount['Perempuan']||0} icon="👩" color="#ec4899" />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              <Card title="⏳ Pending — Countdown Masuk" subtitle="Intern yang akan segera mulai magang">
                <CountdownList items={ov.pendingInterns} label="Masuk" color="#f59e0b" />
              </Card>
              <Card title="🎓 Segera Selesai (≤30 hari)" subtitle="Intern yang kontraknya hampir berakhir">
                <CountdownList items={ov.completingSoon} label="Sisa" color="#6366f1" />
              </Card>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              <Card title="📊 Distribusi Bidang">
                <MiniBar items={Object.entries(ov.bidangDist).map(([l,v])=>({label:l,value:v})).sort((a,b)=>b.value-a.value)} colorFn={i => `hsl(${210+i*25},70%,55%)`} />
              </Card>
              <Card title="🏦 Distribusi Bank">
                <MiniBar items={Object.entries(ov.bankDist||{}).map(([l,v])=>({label:l,value:v})).sort((a,b)=>b.value-a.value)} colorFn={i => `hsl(${160+i*30},60%,45%)`} />
              </Card>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem' }}>
              <Card title="🎓 Distribusi Jenjang">
                <MiniBar items={Object.entries(ov.jenjangDist||{}).map(([l,v])=>({label:l,value:v})).sort((a,b)=>b.value-a.value)} colorFn={() => '#8b5cf6'} />
              </Card>
              <Card title="🎂 Ulang Tahun per Bulan">
                <MiniBar items={ov.birthdayByMonth.map((v,i)=>({label:MONTHS[i],value:v}))} colorFn={() => '#ec4899'} />
              </Card>
              <Card title="👨‍🏫 Pembimbing Lapangan">
                <MiniBar items={Object.entries(ov.supervisorDist||{}).map(([l,v])=>({label:l,value:v})).sort((a,b)=>b.value-a.value)} colorFn={i => `hsl(${30+i*20},75%,50%)`} />
              </Card>
            </div>

            <Card title="📈 Forecast Masuk & Keluar per Bulan" subtitle="Proyeksi bulanan intern yang masuk dan selesai">
              {ov.forecast?.length > 0 ? (
                <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(ov.forecast.length,12)},1fr)`, gap:6, marginTop:8 }}>
                  {ov.forecast.slice(-12).map(f => (
                    <div key={f.month} style={{ textAlign:'center', padding:8, borderRadius:8, background:'var(--bg-main)', border:'1px solid var(--border)' }}>
                      <p style={{ fontSize:'0.65rem', fontWeight:800, color:'var(--text-muted)' }}>{f.month}</p>
                      <p style={{ fontSize:'0.85rem', fontWeight:900, color:'#22c55e' }}>+{f.enter}</p>
                      <p style={{ fontSize:'0.85rem', fontWeight:900, color:'#ef4444' }}>-{f.exit}</p>
                    </div>
                  ))}
                </div>
              ) : <p style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>Belum ada data forecast</p>}
            </Card>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              <Card title="🏫 Distribusi Universitas/Sekolah">
                <MiniBar items={Object.entries(ov.universityDist||{}).map(([l,v])=>({label:l,value:v})).sort((a,b)=>b.value-a.value).slice(0,12)} colorFn={i => `hsl(${200+i*18},65%,50%)`} />
              </Card>
              <Card title="📋 Onboarding Status">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {Object.entries(ob.stats||{}).map(([k,v]) => (
                    <div key={k} style={{ padding:10, borderRadius:8, background:'var(--bg-main)', textAlign:'center' }}>
                      <p style={{ fontSize:'0.65rem', fontWeight:800, color:'var(--text-muted)' }}>{k}</p>
                      <p style={{ fontSize:'1.3rem', fontWeight:900, color:'var(--primary)' }}>{v}</p>
                    </div>
                  ))}
                </div>
                {ob.avgVelocityDays !== null && <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:8, textAlign:'center' }}>⚡ Rata-rata proses: <b style={{ color:'var(--primary)' }}>{ob.avgVelocityDays} hari</b></p>}
              </Card>
            </div>
          </div>
        )}

        {/* ═══ TAB: WELL-BEING & LAPORAN ═══ */}
        {tab === 'wellbeing' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'0.75rem' }}>
              <StatCard label="Happiness Index" value={wb.happinessIndex !== null ? `${wb.happinessIndex}%` : '-'} icon="💛" color="#f59e0b" sub="Skala 0-100" />
              <StatCard label="Total Laporan" value={wb.totalReports} icon="📝" color="var(--primary)" />
              <StatCard label="Belum Submit" value={wb.neverSubmitted?.length||0} icon="⚠️" color="#ef4444" sub="Intern aktif" />
              {Object.entries(wb.moodDist||{}).map(([k,v]) => (
                <StatCard key={k} label={MOOD_LABEL[k]||k} value={v} icon={MOOD_EMOJI[k]||'😐'} color="var(--text-secondary)" />
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              <Card title="📊 Distribusi Mood Laporan" subtitle="Jumlah laporan harian berdasarkan mood">
                {wb.moodVsProductivity?.length > 0 ? (
                  <MiniBar items={wb.moodVsProductivity.map(m => ({ label:`${MOOD_EMOJI[m.mood]} ${MOOD_LABEL[m.mood]||m.mood}`, value:m.count }))} colorFn={i => ['#22c55e','#84cc16','#f59e0b','#f97316','#ef4444'][i] || '#6b7280'} />
                ) : <p style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>Belum ada data mood</p>}
              </Card>
              <Card title="🏆 Top 10 Pelapor Teraktif" subtitle="Intern dengan jumlah laporan terbanyak">
                <MiniBar items={(wb.topSubmitters||[]).map(s => ({ label:s.name, value:s.count }))} colorFn={() => '#22c55e'} />
              </Card>
            </div>

            <Card title="⚠️ Intern yang Belum Pernah Submit Laporan">
              {wb.neverSubmitted?.length > 0 ? (
                <div>
                  <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:10 }}>
                    <span style={{ fontWeight:900, color:'#f59e0b', fontSize:'1rem' }}>{wb.neverSubmitted.length}</span> intern aktif belum pernah submit laporan
                  </p>
                  <details>
                    <summary style={{ cursor:'pointer', fontSize:'0.78rem', color:'var(--text-muted)', userSelect:'none', fontWeight:700 }}>
                      Lihat daftar intern →
                    </summary>
                    <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:6 }}>
                      {wb.neverSubmitted.map((n,i) => (
                        <div key={i} style={{ padding:'4px 10px', borderRadius:20, background:'var(--bg-main)', border:'1px solid var(--border)', fontSize:'0.75rem', fontWeight:600 }}>
                          {n.name}
                          <span style={{ marginLeft:6, fontSize:'0.65rem', color:'var(--text-muted)' }}>{n.bidang?.split(' ').slice(0,2).join(' ')}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ) : <p style={{ color:'#22c55e', fontWeight:700, fontSize:'0.82rem', textAlign:'center' }}>✅ Semua intern aktif sudah pernah submit!</p>}
            </Card>

            <Card title="📈 Tren Kehadiran (30 Hari Terakhir)" subtitle="Jumlah kehadiran harian (PRESENT + LATE) dari data absensi realtime">
              {at.trend?.length > 0 ? (() => {
                const maxVal = Math.max(...at.trend.map(x => x.hadir ?? x.present), 1)
                return (
                  <div>
                    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:140, padding:'8px 0 4px' }}>
                      {at.trend.map((d,i) => {
                        const val = d.hadir ?? d.present
                        const pct = maxVal > 0 ? (val / maxVal) * 100 : 0
                        const now = new Date()
                        const wibNow = new Date(now.getTime() + (7 * 3600000))
                        const isToday = d.date === wibNow.toISOString().split('T')[0]
                        return (
                          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2, minWidth:0 }}>
                            <div
                              style={{
                                width:'100%',
                                height: pct > 0 ? `${pct}%` : 2,
                                background: isToday ? '#f59e0b' : val > 0 ? '#22c55e' : 'var(--border)',
                                borderRadius:'3px 3px 0 0',
                                transition:'height 0.3s',
                                opacity: val === 0 ? 0.3 : 1,
                                cursor:'default'
                              }}
                              title={`${d.date}\nHadir: ${val}\nPRESENT: ${d.present}  LATE: ${d.late}\nSAKIT: ${d.sakit}  IZIN: ${d.izin}`}
                            />
                            {i % 5 === 0 && (
                              <span style={{ fontSize:'0.48rem', color:'var(--text-muted)', transform:'rotate(-45deg)', transformOrigin:'top center', display:'block', marginTop:2, whiteSpace:'nowrap' }}>
                                {d.date.slice(5)}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:8 }}>
                      {[['#22c55e','Hadir'],['#f59e0b','Hari Ini'],['var(--border)','Tidak Ada Data']].map(([c,l]) => (
                        <div key={l} style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.65rem', color:'var(--text-muted)' }}>
                          <div style={{ width:10, height:10, borderRadius:2, background:c }} />{l}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })() : <p style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>Belum ada data absensi</p>}
            </Card>
          </div>
        )}

        {/* ═══ TAB: TALENT & EVALUASI ═══ */}
        {tab === 'talent' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'0.75rem' }}>
              <StatCard label="Total Evaluasi" value={tl.totalEvals} icon="📋" color="var(--primary)" />
              <StatCard label="Intern Selesai" value={tl.completedCount} icon="🎓" color="#6366f1" />
              {Object.entries(tl.scoreRanges||{}).map(([k,v]) => (
                <StatCard key={k} label={`Grade ${k}`} value={v} icon="⭐" color={k.startsWith('A')?'#22c55e':k.startsWith('B')?'#3b82f6':k.startsWith('C')?'#f59e0b':'#ef4444'} />
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              <Card title="🏆 Top 10 Performers">
                {tl.topPerformers?.length > 0 ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {tl.topPerformers.map((p,i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 10px', borderRadius:8, background:'var(--bg-main)', border:'1px solid var(--border)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontWeight:900, fontSize:'0.85rem', color: i<3 ? '#f59e0b' : 'var(--text-muted)', width:20 }}>#{i+1}</span>
                          <div>
                            <p style={{ fontWeight:700, fontSize:'0.82rem' }}>{p.name}</p>
                            <p style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>{p.bidang}</p>
                          </div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <span style={{ fontWeight:900, fontSize:'0.9rem', color:'var(--primary)' }}>{p.score}</span>
                          <span style={{ fontSize:'0.68rem', fontWeight:800, marginLeft:4, color: p.grade==='A'?'#22c55e':'#f59e0b' }}>{p.grade}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>Belum ada evaluasi</p>}
              </Card>
              <Card title="🏫 Efektivitas Universitas" subtitle="Rata-rata skor evaluasi per universitas">
                <MiniBar items={(tl.universityEffectiveness||[]).map(u => ({ label:`${u.university} (${u.evalCount})`, value:u.avgScore }))} colorFn={i => `hsl(${120+i*20},60%,45%)`} />
              </Card>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              <Card title="🔧 Skill Tracker" subtitle="Keterampilan yang paling sering dilaporkan intern">
                <MiniBar items={(tl.topSkills||[]).map(s => ({ label:s.skill, value:s.count }))} colorFn={i => `hsl(${260+i*15},65%,55%)`} />
              </Card>
              <Card title="📊 Skor Evaluasi per Bidang">
                <MiniBar items={(tl.evalByBidang||[]).map(e => ({ label:`${e.bidang} (${e.count})`, value:e.avgScore }))} colorFn={i => `hsl(${180+i*25},60%,50%)`} />
              </Card>
            </div>
          </div>
        )}

        {/* ═══ TAB: FINANCIAL ═══ */}
        {tab === 'financial' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'0.75rem' }}>
              <StatCard label="Total Anggaran" value={fmtRp(fn.totalBudgetAllTime)} icon="💰" color="var(--primary)" sub="Seluruh periode" />
              <StatCard label="Sudah Dibayar" value={fmtRp(fn.totalBudgetPaid)} icon="✅" color="#22c55e" sub="PAID + TRANSFERRED" />
              <StatCard label="Anggaran Tahun Ini" value={fmtRp(fn.totalBudgetThisYear)} icon="📅" color="#3b82f6" />
              <StatCard label="Anggaran Bulan Ini" value={fmtRp(fn.totalBudgetThisMonth)} icon="🗓️" color="#f59e0b" />
              <StatCard label="Total Record Payroll" value={fn.totalPayrolls} icon="📋" color="#6366f1" />
              {fn.avgPaymentSpeed !== null && <StatCard label="Kecepatan Bayar" value={`${fn.avgPaymentSpeed} hari`} icon="⚡" color="#22c55e" sub="Rata-rata proses" />}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              <Card title="💰 Tren Payroll per Periode" subtitle="Total allowance per periode pengajuan">
                <MiniBar items={(fn.payrollTrend||[]).map(p => ({ label:p.period, value:p.total }))} colorFn={() => '#22c55e'} formatValue={fmtRp} />
              </Card>
              <Card title="🏢 Total Allowance per Bidang">
                <MiniBar items={(fn.payrollByBidang||[]).map(p => ({ label:`${p.bidang} (${p.count} orang)`, value:p.total }))} colorFn={i => `hsl(${200+i*20},65%,50%)`} formatValue={fmtRp} />
              </Card>
            </div>

            <Card title="📊 Status Payroll">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:8 }}>
                {Object.entries(fn.payrollStatusDist||{}).map(([k,v]) => (
                  <div key={k} style={{ padding:12, borderRadius:8, background:'var(--bg-main)', textAlign:'center', border:'1px solid var(--border)' }}>
                    <p style={{ fontSize:'0.65rem', fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase' }}>{k}</p>
                    <p style={{ fontSize:'1.5rem', fontWeight:900, color: k==='PAID'?'#22c55e':k==='TRANSFERRED'?'#8b5cf6':k==='PENDING'?'#f59e0b':'var(--primary)' }}>{v}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )
}

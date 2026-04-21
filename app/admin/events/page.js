'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { 
  Calendar, Plus, Search, Filter, Edit2, Trash2, 
  ArrowLeft, RefreshCw, AlertCircle, CheckCircle2,
  X, Save, Info, Users, Globe, MapPin, List, LayoutGrid
} from 'lucide-react'
import { EVENT_TYPES, INDONESIA_HOLIDAYS_2026 } from '@/lib/constants'
import Swal from 'sweetalert2'

const BIDANGS = [
  'ALL',
  'IT Development', 
  'Finance & Accounting',
  'HR Services',
  'Legal & Compliance',
  'Marketing & Communication',
  'Operations',
  'General Affairs'
]

export default function AdminEvents() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('LIST') // 'LIST' or 'CALENDAR'
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', date: '', type: 'GENERAL', description: '', targetGroup: 'ALL' })
  const [saving, setSaving] = useState(false)

  const fetchEvt = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/events')
      const json = await r.json()
      setList(json)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchEvt() }, [fetchEvt])

  const openModal = (evt = null) => {
    if (evt) {
      setEditing(evt.id)
      setForm({ title: evt.title, date: evt.date, type: evt.type, description: evt.description, targetGroup: evt.targetGroup || 'ALL' })
    } else {
      setEditing(null)
      setForm({ title: '', date: new Date().toISOString().split('T')[0], type: 'GENERAL', description: '', targetGroup: 'ALL' })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) {
      return Swal.fire('Data Belum Lengkap', 'Judul dan tanggal kegiatan wajib diisi.', 'warning')
    }
    setSaving(true)
    try {
      const url = editing ? `/api/admin/events/${editing}` : '/api/admin/events'
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        Swal.fire('Berhasil', 'Kegiatan telah disimpan.', 'success')
        setShowModal(false)
        fetchEvt()
      } else {
        const err = await res.json()
        Swal.fire('Gagal Simpan', err.error || 'Terjadi kesalahan sistem.', 'error')
      }
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: 'Hapus Kegiatan?',
      text: 'Data yang dihapus tidak dapat dikembalikan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444'
    })
    if (res.isConfirmed) {
      try {
        await fetch(`/api/admin/events/${id}`, { method: 'DELETE' })
        fetchEvt()
        Swal.fire('Terhapus', 'Kegiatan berhasil dihapus.', 'success')
      } catch (e) { console.error(e) }
    }
  }

  const filteredList = list.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase()) || 
    e.description.toLowerCase().includes(search.toLowerCase())
  )

  const combinedEvents = [
    ...filteredList,
    ...INDONESIA_HOLIDAYS_2026.map(h => ({
      id: 'holiday-' + h,
      title: 'Hari Libur Nasional',
      date: h,
      type: 'HOLIDAY',
      description: 'Libur resmi nasional Indonesia.',
      isHoliday: true
    }))
  ].sort((a, b) => new Date(a.date) - new Date(b.date))

  return (
    <div style={{ padding: 'var(--sp-6)', animation: 'slideUp 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 className="title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Calendar size={28} color="var(--primary)" /> Kalender Kegiatan & Jadwal
          </h1>
          <p className="subtitle">Kelola jadwal kegiatan, pelatihan, dan hari libur untuk intern.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
           <button className="btn btn-primary" onClick={() => openModal()} style={{ gap: 8 }}>
            <Plus size={18} /> Tambah Kegiatan
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1 }}>
          <div style={{ position: 'relative', maxWidth: 400, flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" className="input" placeholder="Cari kegiatan..." 
              style={{ paddingLeft: '2.5rem' }} value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary" onClick={fetchEvt} disabled={loading}>
            <RefreshCw size={16} className={loading?'spin':''} />
          </button>
        </div>
        <div style={{ display: 'flex', background: 'var(--bg-main)', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
          <button 
            className={`btn btn-sm ${view === 'LIST' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ border: 'none', background: view === 'LIST' ? 'var(--primary)' : 'transparent', color: view === 'LIST' ? 'white' : 'var(--text-muted)' }}
            onClick={() => setView('LIST')}
          >
            <List size={16} />
          </button>
          <button 
             className={`btn btn-sm ${view === 'CALENDAR' ? 'btn-primary' : 'btn-secondary'}`} 
             style={{ border: 'none', background: view === 'CALENDAR' ? 'var(--primary)' : 'transparent', color: view === 'CALENDAR' ? 'white' : 'var(--text-muted)' }}
             onClick={() => setView('CALENDAR')}
             title="Fitur kalender visual sedang dikembangkan..."
             disabled
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {loading ? (
          [...Array(4)].map((_, i) => <div key={i} style={{ height: 120, background: 'var(--border)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.4s infinite' }} />)
        ) : combinedEvents.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', gridColumn: '1/-1' }}>
            <Calendar size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.3 }} />
            <p style={{ color: 'var(--text-muted)' }}>Belum ada kegiatan terdaftar.</p>
          </div>
        ) : (
          combinedEvents.map(evt => {
            const types = EVENT_TYPES[evt.type] || EVENT_TYPES.GENERAL
            const isToday = evt.date === new Date().toISOString().split('T')[0]
            const isPast = new Date(evt.date) < new Date().setHours(0,0,0,0)

            return (
              <div key={evt.id} className="card" style={{ 
                padding: '1.25rem', borderLeft: `6px solid ${types.color}`,
                background: isPast ? 'var(--bg-main)' : 'white',
                opacity: isPast ? 0.7 : 1,
                display: 'flex', flexDirection: 'column', gap: 8,
                position: 'relative', transition: 'all 0.2s', border: isToday ? '2px solid var(--primary)' : '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: types.color + '15', color: types.color, border: `1px solid ${types.color}40` }}>
                      {types.label}
                    </span>
                    {evt.targetGroup && evt.targetGroup !== 'ALL' && (
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--primary-light)', color: 'var(--primary)' }}>
                        <Users size={10} style={{ display: 'inline', marginRight: 4 }} /> {evt.targetGroup}
                      </span>
                    )}
                  </div>
                  {!evt.isHoliday && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button className="btn btn-secondary btn-sm" style={{ padding: 4 }} onClick={() => openModal(evt)}><Edit2 size={12} /></button>
                      <button className="btn btn-secondary btn-sm" style={{ padding: 4, color: 'var(--danger)' }} onClick={() => handleDelete(evt.id)}><Trash2 size={12} /></button>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 4 }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{evt.title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    <Calendar size={12} /> {new Date(evt.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    {isToday && <span style={{ color: 'var(--primary)', fontWeight: 800 }}> · Hari Ini!</span>}
                  </div>
                </div>

                {evt.description && <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: 4 }}>{evt.description}</p>}
                
                {evt.isHoliday && (
                  <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>
                    <Globe size={12} /> Hari Libur Nasional
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Modal CRUD */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: 500, animation: 'slideUp 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <h3 style={{ fontWeight: 800 }}>{editing ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">Judul Kegiatan</label>
                <input 
                  type="text" className="input" placeholder="Contoh: Rapat Koordinasi IT" 
                  value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Tanggal</label>
                  <input 
                    type="date" className="input"
                    value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Tipe Kegiatan</label>
                  <select className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    {Object.entries(EVENT_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Target Kelompok (Audience)</label>
                <select className="input" value={form.targetGroup} onChange={e => setForm(p => ({ ...p, targetGroup: e.target.value }))}>
                  {BIDANGS.map(b => (
                    <option key={b} value={b}>{b === 'ALL' ? '🚨 Semua Intern (Publik)' : `📁 Khusus Bidang: ${b}`}</option>
                  ))}
                </select>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Hanya intern di bidang terpilih yang dapat melihat kegiatan ini di dashboard mereka.
                </p>
              </div>
              <div>
                <label className="label">Deskripsi / Lokasi</label>
                <textarea 
                  className="input" rows={3} placeholder="Detail kegiatan atau lokasi (misal: Ruang Meeting A / Zoom)" 
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ gap: 8 }}>
                {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />} Simpan Kegiatan
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

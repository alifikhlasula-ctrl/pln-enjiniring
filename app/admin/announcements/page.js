'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { 
  Megaphone, Plus, Search, Filter, Edit2, Trash2, 
  Pin, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2,
  X, Save, Info, Bell
} from 'lucide-react'
import { ANNOUNCEMENT_PRIORITIES } from '@/lib/constants'
import Swal from 'sweetalert2'

export default function AdminAnnouncements() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', content: '', priority: 'INFO', pinned: false })
  const [saving, setSaving] = useState(false)

  const fetchAnn = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/announcements')
      const json = await r.json()
      setList(json)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAnn() }, [fetchAnn])

  const openModal = (ann = null) => {
    if (ann) {
      setEditing(ann.id)
      setForm({ title: ann.title, content: ann.content, priority: ann.priority, pinned: ann.pinned })
    } else {
      setEditing(null)
      setForm({ title: '', content: '', priority: 'INFO', pinned: false })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      return Swal.fire('Data Belum Lengkap', 'Judul dan isi pengumuman wajib diisi.', 'warning')
    }
    setSaving(true)
    try {
      const url = editing ? `/api/admin/announcements/${editing}` : '/api/admin/announcements'
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        Swal.fire('Berhasil', 'Pengumuman telah disimpan.', 'success')
        setShowModal(false)
        fetchAnn()
      } else {
        const err = await res.json()
        Swal.fire('Gagal Simpan', err.error || 'Terjadi kesalahan sistem.', 'error')
      }
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: 'Hapus Pengumuman?',
      text: 'Data yang dihapus tidak dapat dikembalikan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444'
    })
    if (res.isConfirmed) {
      try {
        await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
        fetchAnn()
        Swal.fire('Terhapus', 'Pengumuman berhasil dihapus.', 'success')
      } catch (e) { console.error(e) }
    }
  }

  const filteredList = list.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) || 
    a.content.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: 'var(--sp-6)', animation: 'slideUp 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 className="title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Megaphone size={28} color="var(--primary)" /> Manajemen Pengumuman
          </h1>
          <p className="subtitle">Buat dan kelola informasi terbaru untuk seluruh intern.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()} style={{ gap: 8 }}>
          <Plus size={18} /> Buat Pengumuman
        </button>
      </div>

      {/* Toolbar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" className="input" placeholder="Cari pengumuman..." 
            style={{ paddingLeft: '2.5rem' }} value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-secondary" onClick={fetchAnn} disabled={loading}>
          <RefreshCw size={16} className={loading?'spin':''} />
        </button>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} style={{ height: 100, background: 'var(--border)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.4s infinite' }} />)
        ) : filteredList.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <Bell size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.3 }} />
            <p style={{ color: 'var(--text-muted)' }}>Belum ada pengumuman yang sesuai kriteria.</p>
          </div>
        ) : (
          filteredList.map(ann => {
            const prio = ANNOUNCEMENT_PRIORITIES[ann.priority] || ANNOUNCEMENT_PRIORITIES.INFO
            return (
              <div key={ann.id} className="card" style={{ 
                padding: '1.25rem', borderLeft: `6px solid ${prio.color}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                position: 'relative', transition: 'transform 0.2s', cursor: 'default'
              }} onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {ann.pinned && <Pin size={14} fill="var(--warning)" color="var(--warning)" />}
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: prio.bg, color: prio.color }}>{prio.label}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(ann.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} · {ann.createdBy}</span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 750, marginBottom: 4 }}>{ann.title}</h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{ann.content}</p>
                </div>
                <div style={{ display: 'flex', gap: 4, marginLeft: '1rem' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => openModal(ann)} title="Edit"><Edit2 size={14} /></button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(ann.id)} style={{ color: 'var(--danger)' }} title="Hapus"><Trash2 size={14} /></button>
                </div>
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
              <h3 style={{ fontWeight: 800 }}>{editing ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">Judul Pengumuman</label>
                <input 
                  type="text" className="input" placeholder="Contoh: Jadwal Orientasi Batch April" 
                  value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Isi Pengumuman</label>
                <textarea 
                  className="input" rows={4} placeholder="Tuliskan detail pengumuman di sini..." 
                  value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Prioritas</label>
                  <select className="input" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                    <option value="INFO">Informasi Biasa</option>
                    <option value="WARNING">Peringatan</option>
                    <option value="URGENT">Sangat Mendesak (Urgent)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'center', marginTop: '1.5rem' }}>
                  <input 
                    type="checkbox" id="pinned" style={{ width: 18, height: 18, cursor: 'pointer' }}
                    checked={form.pinned} onChange={e => setForm(p => ({ ...p, pinned: e.target.checked }))}
                  />
                  <label htmlFor="pinned" style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Sematkan (Pin) di Atas</label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ gap: 8 }}>
                {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />} Simpan Pengumuman
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

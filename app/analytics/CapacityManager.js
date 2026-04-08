'use client'
import React, { useState } from 'react'
import { Save, Plus, Trash2 } from 'lucide-react'
import Swal from 'sweetalert2'

export default function CapacityManager({ initialTargets, onUpdate }) {
  const [targets, setTargets] = useState(initialTargets || {})
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState(0)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings/capacity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targets)
      })
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Target Tersimpan', timer: 1500, showConfirmButton: false })
        onUpdate()
      }
    } catch (e) {
      Swal.fire('Error', e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const addTarget = () => {
    if (!newKey) return
    setTargets({ ...targets, [newKey]: parseInt(newValue) })
    setNewKey(''); setNewValue(0)
  }

  const removeTarget = (key) => {
    const next = { ...targets }
    delete next[key]
    setTargets(next)
  }

  return (
    <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Target Capacity Manager 🔐</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Atur jumlah personil ideal per bidang untuk menghitung kesenjangan (gap) dalam forecast.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
        </button>
      </div>

      <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: '1.25rem' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nama Bidang / Departemen</th>
              <th style={{ width: 120 }}>Target (Orang)</th>
              <th style={{ width: 80 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(targets).map(([k, v]) => (
              <tr key={k}>
                <td style={{ fontSize: '0.875rem', fontWeight: 600 }}>{k}</td>
                <td>
                  <input type="number" className="input" style={{ padding: '4px 8px', width: 80 }} 
                         value={v} onChange={(e) => setTargets({ ...targets, [k]: parseInt(e.target.value) || 0 })} />
                </td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => removeTarget(k)} style={{ color: 'var(--danger)' }}>
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td>
                <input type="text" className="input" placeholder="Tambah bidang baru..." value={newKey} onChange={e => setNewKey(e.target.value)} />
              </td>
              <td>
                <input type="number" className="input" value={newValue} onChange={e => setNewValue(e.target.value)} />
              </td>
              <td>
                <button className="btn btn-secondary btn-sm" onClick={addTarget}><Plus size={13} /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

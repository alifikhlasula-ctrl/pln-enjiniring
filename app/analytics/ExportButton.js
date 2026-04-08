'use client'
import React, { useState } from 'react'
import { FileDown, Loader2, FileSpreadsheet } from 'lucide-react'
import Swal from 'sweetalert2'

export default function ExportButton({ data }) {
  const [loading, setLoading] = useState(false)

  /* ── Export PDF ─────────────────────────────────── */
  /* ── Export PDF (Server-Side for better filename reliability) ── */
  const handleExportPDF = async () => {
    setLoading(true)
    const timestamp = new Date().toISOString().split('T')[0]
    const url = `/api/admin/analytics/export?format=pdf&t=${Date.now()}&ext=.pdf`
    
    try {
      const a = document.createElement('a')
      a.href = url
      // Use fallback filename in case headers fail, but headers should take precedence
      a.download = `InternHub_Analytics_${timestamp}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      Swal.fire({ icon: 'success', title: 'PDF Berhasil!', text: 'Laporan analytics sedang diunduh.', timer: 1500, showConfirmButton: false })
    } catch (e) {
      console.error('PDF export error:', e)
      Swal.fire('Error', 'Gagal ekspor PDF.', 'error')
    } finally {
      setTimeout(() => setLoading(false), 500)
    }
  }

  /* ── Export Excel (Server-Side for better filename reliability) ── */
  const handleExportExcel = async () => {
    setLoading(true)
    const timestamp = new Date().toISOString().split('T')[0]
    const url = `/api/admin/analytics/export?format=xlsx&t=${Date.now()}&ext=.xlsx`
    
    try {
      // We use a hidden anchor to force download without opening a blank tab
      const a = document.createElement('a')
      a.href = url
      a.download = `InternHub_Analytics_${timestamp}.xlsx`
      document.body.appendChild(a)
      a.click()
      setTimeout(() => document.body.removeChild(a), 100)
      
      Swal.fire({ icon: 'success', title: 'Excel Berhasil!', text: 'Data analytics sedang diunduh.', timer: 1500, showConfirmButton: false })
    } catch (e) {
      console.error('Excel export error:', e)
      Swal.fire('Error', 'Gagal ekspor Excel.', 'error')
    } finally {
      setTimeout(() => setLoading(false), 1000)
    }
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button className="btn btn-secondary" onClick={handleExportPDF} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {loading ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FileDown size={16} />}
        PDF
      </button>
      <button className="btn btn-secondary" onClick={handleExportExcel} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {loading ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FileSpreadsheet size={16} />}
        Excel
      </button>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

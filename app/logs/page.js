'use client'

import React, { useState, useEffect } from 'react'
import { History, User, Clock, ShieldInfo, AlertCircle, RefreshCw } from 'lucide-react'

export default function LogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    setLoading(true)
    const res = await fetch('/api/logs')
    const data = await res.json()
    setLogs(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE_INTERN': return 'var(--success)'
      case 'UPDATE_INTERN': return 'var(--warning)'
      case 'SOFT_DELETE_INTERN': return 'var(--danger)'
      case 'SUBMIT_DAILY_REPORT': return 'var(--primary)'
      case 'REVIEW_DAILY_REPORT': return 'var(--secondary)'
      default: return 'var(--text-muted)'
    }
  }

  return (
    <div className="container">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="title">Audit Trail</h1>
          <p className="subtitle">Lacak setiap perubahan data pada sistem HRIS.</p>
        </div>
        <button className="btn btn-secondary gap-2" onClick={fetchLogs} disabled={loading}>
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Segarkan
        </button>
      </div>

      <div className="card">
        <div className="logs-timeline">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>Memuat riwayat...</div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <AlertCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>Belum ada riwayat aktivitas.</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="log-item">
                <div className="log-marker" style={{ backgroundColor: getActionColor(log.action) }}></div>
                <div className="log-content">
                  <div className="flex justify-between items-center mb-2">
                    <span className="log-action" style={{ color: getActionColor(log.action) }}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="log-time flex items-center gap-1">
                      <Clock size={12} /> {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="log-details">
                    <p className="flex items-center gap-2 mb-1">
                      <User size={14} /> <strong>{log.userId === 'u1' ? 'Admin HR' : log.userId === 'u2' ? 'John Supervisor' : log.userId === 'u3' ? 'Alice Intern' : log.userId}</strong>
                    </p>
                    <pre className="log-json">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .logs-timeline {
          padding: 1rem 0;
        }
        .log-item {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 2rem;
          position: relative;
        }
        .log-item:not(:last-child)::before {
          content: '';
          position: absolute;
          left: 6px;
          top: 24px;
          bottom: -24px;
          width: 2px;
          background: #e2e8f0;
        }
        .log-marker {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          margin-top: 6px;
          z-index: 1;
        }
        .log-content {
          flex: 1;
          background: #f8fafc;
          padding: 1.25rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        .log-action {
          font-weight: 800;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }
        .log-time {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .log-details {
          font-size: 0.875rem;
        }
        .log-json {
          background: #1e293b;
          color: #94a3b8;
          padding: 0.75rem;
          border-radius: 8px;
          font-size: 0.75rem;
          margin-top: 0.5rem;
          overflow-x: auto;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}

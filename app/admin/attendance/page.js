'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Activity, Clock, MapPin, CheckCircle, AlertTriangle, CalendarDays } from 'lucide-react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function KehadiranPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)
  const [selectedDay, setSelectedDay] = useState(null)
  const chartRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/attendance/stats?days=${days}`)
      .then(res => res.json())
      .then(d => {
        setData(d.history)
        setSelectedDay(d.history[d.history.length - 1]) // Default select today
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [days])

  const chartData = {
    labels: data ? data.map(d => `${d.label} (${d.date.split('-').slice(1).join('/')})`) : [],
    datasets: [
      {
        label: 'Total Hadir',
        data: data ? data.map(d => d.count) : [],
        backgroundColor: data ? data.map(d => d.date === selectedDay?.date ? 'rgba(59, 130, 246, 1)' : 'rgba(59, 130, 246, 0.4)') : [],
        borderRadius: 6,
        hoverBackgroundColor: 'rgba(59, 130, 246, 0.8)',
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (e, elements) => {
      if (elements && elements.length > 0 && data) {
        const index = elements[0].index
        setSelectedDay(data[index])
      }
    },
    scales: {
      y: { 
        beginAtZero: true, 
        ticks: { precision: 0 },
        grid: { color: 'rgba(156, 163, 175, 0.2)' }
      },
      x: {
        grid: { display: false }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          afterBody: (context) => {
            const index = context[0].dataIndex
            const dayData = data[index]
            return `Klik bar untuk melihat detail ${dayData.count} intern.`
          }
        }
      }
    }
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity className="text-primary" /> Statistik Kehadiran
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            Grafik interaktif tren absensi intern PLN Enjiniring
          </p>
        </div>
        <select 
          className="select-item" 
          value={days} 
          onChange={e => setDays(Number(e.target.value))}
          style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
        >
          <option value={7}>7 Hari Terakhir</option>
          <option value={14}>14 Hari Terakhir</option>
          <option value={30}>30 Hari Terakhir</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Memuat data statistik...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem' }}>Grafik Tinjauan (Klik bar untuk detail)</h3>
            <div style={{ height: 350 }}>
              <Bar ref={chartRef} data={chartData} options={chartOptions} />
            </div>
          </div>

          {selectedDay && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarDays size={18} /> {selectedDay.label}, {selectedDay.date}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                Total: <strong>{selectedDay.count}</strong> intern hadir
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 400, overflowY: 'auto', paddingRight: '0.5rem' }}>
                {selectedDay.interns.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                    <AlertTriangle size={24} style={{ color: 'var(--text-muted)', margin: '0 auto 0.5rem' }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Tidak ada absen tercatat hari ini.</p>
                  </div>
                ) : (
                  selectedDay.interns.map((i, idx) => (
                    <div key={idx} style={{ 
                      padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)',
                      borderLeft: `4px solid ${i.status === 'LATE' ? 'var(--warning)' : 'var(--success)'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{i.name}</span>
                        <span style={{ 
                          fontSize: '0.7rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                          background: i.status === 'LATE' ? 'var(--warning-light)' : 'var(--success-light)',
                          color: i.status === 'LATE' ? 'var(--warning)' : 'var(--success)'
                        }}>
                          {i.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        <Clock size={12} /> {new Date(i.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

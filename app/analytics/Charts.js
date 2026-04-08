'use client'
import React, { useRef, useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#3b82f6', 
  '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6',
  '#f97316', '#06b6d4', '#d946ef', '#a855f7'
]

export default function Charts({ data }) {
  const [colors, setColors] = useState({ muted: '#cbd5e1', secondary: '#ffffff', border: 'rgba(255,255,255,0.1)' })

  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || 
                    document.body.getAttribute('data-theme') === 'dark' ||
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      setColors({
        muted: isDark ? '#cbd5e1' : '#64748b',
        secondary: isDark ? '#ffffff' : '#0f172a',
        border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
      })
    }

    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  // Options for Linear/Bar Charts
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'bottom', 
        labels: { 
          color: colors.muted, 
          font: { size: 11, weight: '600' },
          usePointStyle: true,
          padding: 20
        } 
      },
      tooltip: { 
        backgroundColor: 'rgba(15, 23, 42, 0.95)', 
        padding: 12,
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 12 },
        cornerRadius: 8
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: colors.muted, font: { size: 10, weight: '600' } } },
      y: { grid: { color: colors.border }, ticks: { color: colors.muted, font: { size: 10, weight: '600' } } },
    },
  }

  // Options for Doughnut - NO SCALES
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'right', 
        labels: { 
          color: colors.muted, 
          font: { size: 11, weight: '600' },
          usePointStyle: true,
          padding: 15
        } 
      },
      tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', padding: 12, cornerRadius: 8 },
    },
  }

  // 1. Forecast Data
  const forecastData = {
    labels: data.forecasting.months,
    datasets: [
      {
        type: 'line',
        label: 'Estimasi Budget (Juta Rp)',
        data: data.forecasting.budget.map(v => v / 1000000),
        borderColor: '#f59e0b',
        borderWidth: 3,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#f59e0b',
        pointHoverRadius: 6,
        tension: 0.4,
        yAxisID: 'y1',
        fill: true,
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
      },
      {
        type: 'bar',
        label: 'Proyeksi Intern Aktif',
        data: data.forecasting.activeInterns,
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
        borderColor: '#6366f1',
        borderWidth: 1,
        borderRadius: 6,
        yAxisID: 'y',
      },
    ],
  }

  // 2. Bidang Distribution (Converted to Horizontal Bar)
  const bids = Object.keys(data.distribution.bidang).sort((a,b) => data.distribution.bidang[b] - data.distribution.bidang[a])
  const bidangData = {
    labels: bids,
    datasets: [{
      label: 'Jumlah Intern',
      data: bids.map(k => data.distribution.bidang[k]),
      backgroundColor: bids.map((_, i) => PALETTE[i % PALETTE.length]),
      borderRadius: 4,
      barThickness: 12
    }]
  }

  const horizontalBarOptions = {
    ...baseOptions,
    indexAxis: 'y',
    plugins: { ...baseOptions.plugins, legend: { display: false } },
    scales: {
      ...baseOptions.scales,
      x: { ...baseOptions.scales.x, ticks: { ...baseOptions.scales.x.ticks, precision: 0 } }
    }
  }

  // 3. Demographics (Jenjang)
  const jenjangs = Object.keys(data.demographics.jenjang)
  const jenjangData = {
    labels: jenjangs,
    datasets: [{
      data: jenjangs.map(k => data.demographics.jenjang[k]),
      backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'],
      borderWidth: 0,
      hoverOffset: 15
    }]
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
      {/* Forecast Chart */}
      <div className="card shadow-premium" style={{ gridColumn: 'span 8', padding: '1.5rem', height: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Proyeksi Kebutuhan & Anggaran</h3>
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 800, padding: '4px 10px', background: 'var(--primary-light)', borderRadius: 20 }}>Forecast 6M</span>
        </div>
        <div style={{ height: 320 }}>
          <Line 
            data={forecastData} 
            options={{
              ...baseOptions,
              scales: {
                ...baseOptions.scales,
                y: { ...baseOptions.scales.y, title: { display: true, text: 'Orang', color: colors.muted, font: { weight: 'bold' } } },
                y1: { position: 'right', grid: { display: false }, ticks: { color: colors.muted }, title: { display: true, text: 'Juta Rp', color: colors.muted, font: { weight: 'bold' } } },
              }
            }} 
          />
        </div>
      </div>

      {/* Bidang Distribution - Bar Chart with Scroll */}
      <div className="card shadow-premium" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 420, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.5rem' }}>Distribusi Seluruh Bidang</h3>
        <p style={{ fontSize: '0.7rem', color: colors.muted, marginBottom: '1rem' }}>Sebaran seluruh peserta aktif berdasarkan departemen.</p>
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          <div style={{ height: Math.max(280, bids.length * 30) }}>
            <Bar data={bidangData} options={horizontalBarOptions} />
          </div>
        </div>
      </div>
      
      {/* Capacity Gap */}
      <div className="card shadow-premium" style={{ gridColumn: 'span 7', padding: '1.5rem', height: 380 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>Kesenjangan Kapasitas</h3>
          <p style={{ fontSize: '0.8rem', color: colors.muted, marginBottom: '2rem' }}>Estimasi jumlah tambahan intern yang harus direkrut berdasarkan target.</p>
          <div style={{ height: 260 }}>
            <Bar 
              data={{
                labels: data.forecasting.months,
                datasets: [{
                  label: 'Kekurangan Personil',
                  data: data.forecasting.gap,
                  backgroundColor: 'rgba(239, 68, 68, 0.6)',
                  borderColor: '#ef4444',
                  borderWidth: 0,
                  borderRadius: 6
                }]
              }}
              options={baseOptions}
            />
          </div>
      </div>

      {/* Demografi Jenjang - Clean Doughnut */}
      <div className="card shadow-premium" style={{ gridColumn: 'span 5', padding: '1.5rem', height: 380 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Demografi Jenjang</h3>
        <div style={{ height: 280, marginTop: '1rem' }}>
          <Doughnut data={jenjangData} options={{ ...doughnutOptions, cutout: '75%' }} />
        </div>
      </div>

      <style jsx global>{`
        .shadow-premium {
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255,255,255,0.05);
        }
        [data-theme='dark'] .shadow-premium {
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
      `}</style>
    </div>
  )
}

'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Printer, MapPin, Briefcase, GraduationCap, Award, ChartPie, CheckCircle2, Star } from 'lucide-react'

function PortfolioContent() {
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/intern-dashboard?userId=${userId}`)
        const json = await res.json()
        
        const rRes = await fetch(`/api/reports?userId=${userId}`)
        const rJson = await rRes.json()
        
        setData({ ...json, reports: rJson.reports || [] })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [userId])

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Memuat Portfolio...</div>
  if (!data?.intern) return <div style={{ padding: '3rem', textAlign: 'center' }}>Data tidak ditemukan.</div>

  const intern = data.intern
  const stats = data.attendanceStats || {}
  const evals = data.evaluations || []
  
  const score = stats.onTimeRate || 0
  let disciplineLabel = 'NEEDS IMPROVEMENT'; let disciplineColor = '#ef4444' // danger
  if (score >= 90) { disciplineLabel = 'EXCELLENT'; disciplineColor = '#22c55e' } // success
  else if (score >= 75) { disciplineLabel = 'GOOD'; disciplineColor = '#6366f1' } // primary

  const handlePrint = () => {
    window.print()
  }

  const reports = data.reports || []
  const uniqueTasks = new Set()
  const jobDesks = []
  
  reports.forEach(r => {
    if (!r.activity) return
    const items = r.activity.split('\n')
    items.forEach(item => {
      let cleanItem = item.trim().replace(/^[-•*>]\s*/, '').trim()
      if (cleanItem.length > 10) { 
        let isDuplicate = false
        const lowerItem = cleanItem.toLowerCase()
        for (const existing of uniqueTasks) {
          if (existing.includes(lowerItem) || lowerItem.includes(existing)) {
            isDuplicate = true
            break
          }
        }
        if (!isDuplicate) {
          uniqueTasks.add(lowerItem)
          jobDesks.push(cleanItem)
        }
      }
    })
  })

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', padding: '2.5rem 1rem' }}>
      <div className="no-print" style={{ maxWidth: 850, margin: '0 auto 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/reports" style={{ color: '#475569', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
           ← Kembali
        </a>
        <button className="btn btn-primary" onClick={handlePrint} style={{ boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
          <Printer size={16} style={{ marginRight: 8 }} /> Cetak ke PDF / Resume
        </button>
      </div>

      <div id="portfolio-doc" style={{ 
        maxWidth: 850, margin: '0 auto', background: '#fff', 
        boxShadow: '0 20px 50px rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden',
        minHeight: '297mm' // A4 Height
      }}>
        {/* Header - Sidebar Style for Name */}
        <div style={{ padding: '4rem 3.5rem', borderBottom: '8px solid #0f172a', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '0.5rem', color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {intern.name.toUpperCase()}
              </h1>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
                 <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Briefcase size={20} /> {intern.bidang} Intern
                 </p>
                 <p style={{ fontSize: '1.1rem', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={18} /> Jakarta, Indonesia
                 </p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
               <img src="/pln-logo.png" alt="PLN" style={{ height: 60, marginBottom: '1rem' }} />
               <div style={{ background: '#0f172a', color: '#fff', padding: '4px 12px', fontSize: '0.7rem', fontWeight: 800, borderRadius: 4, letterSpacing: 1 }}>
                 PLN ENJINIRING RECORD
               </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '3.5rem', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '3.5rem' }}>
          
          {/* Main Column */}
          <div>
             {/* Profile Summary */}
             <section style={{ marginBottom: '3rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 2, marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Professional Profile</h3>
                <p style={{ fontSize: '1.05rem', color: '#334155', lineHeight: 1.8 }}>
                   Hasil evaluasi performa magang menunjukkan tingkat dedikasi yang tinggi sebagai <strong>{intern.bidang} Intern</strong>. 
                   Telah menyelesaikan program magang di <strong>PLN Enjiniring</strong> dengan capaian <strong>Indeks Kedisiplinan {score}%</strong>. 
                   Memiliki kemampuan adaptasi cepat dalam lingkungan korporat dan teknis.
                </p>
             </section>

             {/* Experience */}
             <section style={{ marginBottom: '3rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 2, marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Key Experience & Projects</h3>
                <div style={{ marginTop: '1.5rem' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                      <p style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a' }}>Internship Program</p>
                      <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 700 }}>{intern.periodStart} — {intern.periodEnd}</p>
                   </div>
                   <p style={{ color: '#3b82f6', fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>PT PLN Enjiniring · Jakarta</p>
                   
                   {jobDesks.length > 0 ? (
                     <ul style={{ paddingLeft: '1.25rem', color: '#334155', lineHeight: 1.8 }}>
                       {jobDesks.map((task, idx) => (
                         <li key={idx} style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>{task}</li>
                       ))}
                     </ul>
                   ) : (
                     <p style={{ fontStyle: 'italic', color: '#94a3b8' }}>No specific tasks recorded.</p>
                   )}
                </div>
             </section>

             {/* Evaluation */}
             {evals.length > 0 && (
                <section>
                   <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 2, marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Performance Endorsement</h3>
                   <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: 8, border: '1px solid #e2e8f0', marginTop: '1.5rem', position: 'relative' }}>
                      <Award size={40} color="#3b82f6" style={{ position: 'absolute', top: -20, right: 20, opacity: 0.2 }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                         <div style={{ background: '#3b82f6', color: '#fff', padding: '8px 16px', borderRadius: 4, fontWeight: 900, fontSize: '1.5rem' }}>
                            {evals[0].grade || 'A'}
                         </div>
                         <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#64748b' }}>FINAL PERFORMANCE GRADE</span>
                      </div>
                      <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: 1.8, fontStyle: 'italic' }}>
                        "{evals[0].overallNote || 'Peserta magang telah menunjukkan dedikasi dan performa yang sangat baik selama program berlangsung.'}"
                      </p>
                      <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', textAlign: 'right' }}>
                        <p style={{ fontWeight: 800, color: '#0f172a', margin: 0 }}>{evals[0].supervisorName || 'Verified Supervisor'}</p>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>PT PLN Enjiniring</p>
                      </div>
                   </div>
                </section>
             )}
          </div>

          {/* Sidebar Column */}
          <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '1rem' }}>
             
             {/* Education */}
             <section style={{ marginBottom: '3rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: '1rem' }}>Education</h3>
                <div style={{ marginBottom: '1.5rem' }}>
                   <p style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: '4px' }}>{intern.university}</p>
                   <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>{intern.jenjang}</p>
                   <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>ID: {intern.nim_nis || '-'}</p>
                </div>
             </section>

             {/* Discipline Meter */}
             <section style={{ marginBottom: '3rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: '1.5rem' }}>Reliability</h3>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f8fafc', padding: '1.5rem', borderRadius: 12 }}>
                   <div style={{ width: 100, height: 100, borderRadius: 50, border: `8px solid ${disciplineColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 900, color: disciplineColor }}>{score}%</span>
                   </div>
                   <p style={{ marginTop: '1rem', fontWeight: 800, color: disciplineColor, fontSize: '1rem' }}>{disciplineLabel}</p>
                   <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'center' }}>BASED ON ON-TIME ATTENDANCE</p>
                </div>
             </section>

             {/* Program Info */}
             <section style={{ marginBottom: '3rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: '1.5rem' }}>Program Info</h3>
                <div style={{ fontSize: '0.9rem' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: '#64748b' }}>Status</span>
                      <span style={{ fontWeight: 700 }}>{intern.status}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Total Days</span>
                      <span style={{ fontWeight: 700 }}>{stats.presentDays || 0}</span>
                   </div>
                </div>
             </section>

             {/* Endorsement Footer (Sticky/Bottom in Sidebar) */}
             <div style={{ marginTop: '5rem', fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                <p>This resume is an official performance record generated by <strong>PLN Enjiniring</strong>. Metadata and validation logs are stored in the secure HRIS database.</p>
                <p style={{ marginTop: '0.5rem', fontWeight: 700 }}>VERIFIED DOCUMENT</p>
             </div>

          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{ background: '#f8fafc', padding: '1.5rem 3.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Generated: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
           <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>#PLN-ENJINIRING-INTERNSHIP-RECORD</span>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          #portfolio-doc { box-shadow: none; border: none; margin: 0; width: 100%; max-width: 100%; min-height: auto; }
          @page { margin: 0; size: A4; }
          h1, h2, h3 { color: #000 !important; }
        }
      `}</style>
    </div>
  )
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center' }}>Memuat Portfolio...</div>}>
      <PortfolioContent />
    </Suspense>
  )
}

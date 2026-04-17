'use client'

import React, { useState, useEffect, createContext, useContext } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, FileText, Award, LogOut,
  Clock, History, Menu, X, User as UserIcon, Sun, Moon,
  ChevronRight, Bell, BarChart3, CalendarDays, MessageSquare, FileSpreadsheet, Banknote,
  Megaphone, BookOpen, Lock, BarChart2, Activity
} from 'lucide-react'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import '@/app/globals.css'

const ThemeContext = createContext()
export const useTheme = () => useContext(ThemeContext)

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')
  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

/* ── Notification Bell ─────────────────────────────────── */
function NotifBell() {
  const [open,   setOpen]   = useState(false)
  const [alerts, setAlerts] = useState([])
  const [count,  setCount]  = useState(0)
  const SEV_COLOR = { URGENT:'var(--danger)', HIGH:'var(--warning)', MEDIUM:'var(--primary)' }
  const TYPE_ICON = { CONTRACT:'📅', PAYROLL:'💰', EVALUATION:'⭐', ONBOARDING:'📋', CUSTOM:'🔔' }

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const r = await fetch('/api/notifications')
        const d = await r.json()
        setAlerts(d.alerts || [])
        setCount((d.alerts || []).filter(a => a.severity === 'URGENT' || a.severity === 'HIGH').length)
      } catch {}
    }
    fetch_()
    const t = setInterval(fetch_, 60000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(p => !p)} className="theme-toggle" title="Notifikasi" style={{ position: 'relative' }}>
        <Bell size={16} strokeWidth={2} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16,
            borderRadius: 8, background: 'var(--danger)', color: '#fff',
            fontSize: '0.6rem', fontWeight: 900, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '0 3px', border: '2px solid var(--bg-card)'
          }}>{count}</span>
        )}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, width: 340, maxHeight: 420,
          background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)', zIndex: 500, overflowY: 'auto', animation: 'ddDown 0.15s ease'
        }}>
          <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontWeight: 800, fontSize: '0.875rem' }}>🔔 Notifikasi</p>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={14} strokeWidth={2} /></button>
          </div>
          {alerts.length === 0
            ? <p style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Tidak ada notifikasi aktif ✅</p>
            : alerts.map((a, i) => (
              <a key={i} href={a.link || '/dashboard'} onClick={() => setOpen(false)} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem 1rem', textDecoration: 'none', color: 'inherit', transition: 'background 0.15s', borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{TYPE_ICON[a.type] || '🔔'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.8rem', color: SEV_COLOR[a.severity] || 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{a.detail}</p>
                </div>
                <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '2px 6px', borderRadius: 999, background: (SEV_COLOR[a.severity] || 'var(--primary)') + '20', color: SEV_COLOR[a.severity] || 'var(--primary)', flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>{a.severity}</span>
              </a>
            ))
          }
          <a href="/evaluations" onClick={() => setOpen(false)} style={{ display: 'block', textAlign: 'center', padding: '0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', borderTop: '1px solid var(--border)' }}>
            Lihat Semua &rarr;
          </a>
        </div>
      )}
      <style>{`@keyframes ddDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}

function LayoutContent({ children }) {
  const { user, switchRole, logout, loading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [profileComplete, setProfileComplete] = useState(true)
  const [isCheckingProfile, setIsCheckingProfile] = useState(true)
  const [periodEnd, setPeriodEnd] = useState(null)
  const [internStatus, setInternStatus] = useState(null)
  const router = useRouter()
  const pathname = usePathname()

  const isLandingPage = pathname === '/' || pathname.startsWith('/onboarding') || pathname.startsWith('/portfolio') || (!loading && !user && pathname === '/help')

  // Check profile completeness for INTERN
  useEffect(() => {
    if (user?.role === 'INTERN') {
      setIsCheckingProfile(true)
      fetch(`/api/intern/profile?userId=${user.id}&_t=${Date.now()}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
          const i = data.intern
          // Only lock if the absolute minimum identifiers are missing
          // (nim_nis and university are always set during onboarding/import)
          // Phone, NIK, bank data etc. are optional — interns can fill them later
          if (!i || !i.nim_nis || !i.university) {
            setProfileComplete(false)
          } else {
            setProfileComplete(true)
          }
          if (i?.periodEnd) {
             setPeriodEnd(i.periodEnd)
          }
          if (i?.status) {
             setInternStatus(i.status)
          }
        })
        .catch(console.error)
        .finally(() => setIsCheckingProfile(false))
    } else {
      setProfileComplete(true)
      setIsCheckingProfile(false)
    }
  }, [user])


  // Detect mobile breakpoint
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setSidebarOpen(false)
      else setSidebarOpen(true)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── FIX: Redirection must be inside useEffect to avoid render-phase updates ──
  useEffect(() => {
    if (!loading && !user && !isLandingPage && pathname !== '/help') {
      router.push('/')
      return
    }

    // Force password change if required
    if (!loading && user?.mustChangePassword && pathname !== '/reset-password') {
      router.push('/reset-password')
      return
    }

    // Force profile completion for Interns
    if (!loading && !isCheckingProfile && user?.role === 'INTERN' && !profileComplete && pathname !== '/profile' && pathname !== '/reset-password') {
      router.push('/profile')
    }
  }, [user, loading, isCheckingProfile, profileComplete, isLandingPage, pathname, router])

  const navConfig = {
    ADMIN_HR: {
      label: 'Management',
      items: [
        { name: 'Dashboard',     href: '/dashboard',       icon: LayoutDashboard },
        { name: 'Data Intern',   href: '/interns',         icon: Users },
        { name: 'Kehadiran',     href: '/admin/attendance',icon: BarChart2 },
        { name: 'Monitor Absensi',href: '/admin/monitor-attendance',icon: Activity },
        { name: 'Onboarding',   href: '/admin/onboarding',icon: FileText },
        { name: 'Evaluasi',     href: '/evaluations',     icon: Award },
        { name: 'Monitor Laporan', href: '/admin/reports', icon: FileText },
        { name: 'Payroll',      href: '/admin/payroll',    icon: FileSpreadsheet },
        { name: 'Pengumuman',    href: '/admin/announcements', icon: Megaphone },
        { name: 'Kalender Admin', href: '/admin/events',      icon: CalendarDays },
        { name: 'Analytics',    href: '/analytics',       icon: BarChart3 },
        { name: 'Survei',       href: '/surveys',         icon: MessageSquare },
        { name: 'Panduan',      href: '/help',            icon: BookOpen },
        { name: 'Audit Log',    href: '/logs',            icon: History },
      ]
    },
    // SUPERVISOR role hidden intentionally
    INTERN: {
      label: 'Portal Magang',
      items: [
        { name: 'Dashboard',    href: '/dashboard',   icon: LayoutDashboard },
        { name: 'Profil Saya',  href: '/profile',     icon: UserIcon },
        { name: 'Onboarding',   href: '/onboarding',  icon: FileText },
        { name: 'Absensi',      href: '/attendance',  icon: Clock },
        { name: 'Laporan',      href: '/reports',     icon: FileText },
        { name: 'Allowance',    href: '/payroll',     icon: Banknote },
        { name: 'Survei',       href: '/surveys',     icon: MessageSquare },
        { name: 'Panduan',      href: '/help',        icon: BookOpen },
      ]
    }
  }

  // Inject Evaluasi for INTERN conditionally (H-1 or COMPLETED)
  if (user?.role === 'INTERN' && (periodEnd || internStatus === 'COMPLETED')) {
    let showEvaluasi = internStatus === 'COMPLETED';
    if (!showEvaluasi && periodEnd) {
       const endDt = new Date(periodEnd);
       const today = new Date();
       const diffDays = Math.ceil((endDt - today) / (1000 * 60 * 60 * 24));
       showEvaluasi = diffDays <= 1;
    }
    
    if (showEvaluasi) {
      // Find where to insert (before Allowance if possible, or just push)
      const insertIdx = navConfig.INTERN.items.findIndex(i => i.href === '/payroll');
      navConfig.INTERN.items.splice(insertIdx !== -1 ? insertIdx : 5, 0, { name: 'Evaluasi', href: '/evaluations', icon: Award });
    }
  }

  // Filter if COMPLETED
  if (user?.role === 'INTERN' && internStatus === 'COMPLETED') {
    const allowed = ['/dashboard', '/evaluations', '/payroll', '/surveys'];
    navConfig.INTERN.items = navConfig.INTERN.items.filter(item => allowed.includes(item.href));
  }

  const currentConfig = user ? navConfig[user.role] : null

  if (isLandingPage) return <>{children}</>

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-spinner"></div>
      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        Memuat PLN Enjiniring...
      </span>
    </div>
  )

  // Redirecting handled in useEffect, but we must not render Protected UI if no user
  if (!user && !isLandingPage && !pathname.startsWith('/onboarding') && pathname !== '/help') {
    return null
  }

  const closeSidebar = () => { if (isMobile) setSidebarOpen(false) }

  return (
    <div className="layout">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`} aria-label="Navigation">
        <div className="sidebar-header">
          <div className="logo" style={{ gap: '0.75rem' }}>
            <img src="/pln-logo.png" alt="PLN ENJINIRING" className="nav-logo-img" style={{ height: 32 }} />
            <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.2px', color: 'var(--text-inverse)' }}>PLN ENJINIRING</span>
          </div>
          {isMobile && (
            <button
              className="mobile-toggle"
              onClick={() => setSidebarOpen(false)}
              aria-label="Tutup menu"
            >
              <X size={18} strokeWidth={2} />
            </button>
          )}
        </div>

        <nav className="nav-menu" aria-label="Menu utama">
          {currentConfig?.label && (
            <div className="nav-section-label">{currentConfig.label}</div>
          )}
          {currentConfig?.items.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            
            // If profile is incomplete, lock out everything except profile and guide
            const isItemLocked = !profileComplete && item.href !== '/profile' && item.href !== '/help'

            return (
              <a
                key={item.href}
                href={isItemLocked ? '#' : item.href}
                onClick={(e) => {
                  if (isItemLocked) {
                    e.preventDefault();
                    alert("Harap lengkapi seluruh isian Profil Saya terlebih dahulu untuk membuka kunci fitur ini.");
                    return;
                  }
                  closeSidebar();
                }}
                className={`nav-link ${isActive ? 'active' : ''} ${isItemLocked ? 'locked-nav-item' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                style={{ opacity: isItemLocked ? 0.5 : 1, cursor: isItemLocked ? 'not-allowed' : 'pointer' }}
              >
                <item.icon size={18} strokeWidth={2} className="nav-icon" />
                <span>{item.name}</span>
                {isItemLocked && <Lock size={14} style={{marginLeft:'auto', color:'var(--danger)'}} />}
                {isActive && !isItemLocked && (
                  <ChevronRight size={14} strokeWidth={2}
                    style={{ marginLeft: 'auto', opacity: 0.6 }} />
                )}
              </a>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {user?.image
                ? <img src={user.image} alt={`Avatar ${user.name}`} className="avatar-img" />
                : <UserIcon size={16} strokeWidth={2} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <p className="user-name">{user?.name || 'Pengguna'}</p>
              <p className="user-role">{user?.role?.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <button className="logout-btn" onClick={logout} aria-label="Keluar dari sistem">
            <LogOut size={16} strokeWidth={2} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content" id="main-content">
        {/* Top Header */}
        <header className="top-header" role="banner">
          <div className="flex items-center gap-2">
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(s => !s)}
              aria-label={sidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
              aria-expanded={sidebarOpen}
            >
              <Menu size={18} strokeWidth={2} />
            </button>
            {/* Breadcrumb hint */}
            <span style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              display: isMobile ? 'none' : 'block'
            }}>
              {currentConfig?.items.find(i => i.href === pathname)?.name || 'HRIS'}
            </span>
          </div>

          <div className="header-actions" role="toolbar" aria-label="Aksi header">
            {/* Notification Bell — Admin HR only */}
            {user?.role === 'ADMIN_HR' && <NotifBell/>}
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang'}
              title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
            >
              {theme === 'light'
                ? <Moon size={16} strokeWidth={2} />
                : <Sun size={16} strokeWidth={2} />}
            </button>

            {/* Role Switcher — Restricted to Admin for Dev Preview */}
            {user?.role === 'ADMIN_HR' && (
              <select
                value={user?.role || 'ADMIN_HR'}
                onChange={e => switchRole(e.target.value)}
                className="select-mini"
                aria-label="Ganti peran pengguna"
              >
                <option value="ADMIN_HR">Admin HR</option>
                {/* <option value="SUPERVISOR">Supervisor</option> */}
                <option value="INTERN">Intern</option>
              </select>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="content-inner animate-slide-up" role="main">
          {children}
        </div>
      </main>
    </div>
  )
}

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="HRIS Magang PLN Enjiniring — Platform pengelolaan magang yang modern dan efisien." />
        <title>HRIS Magang — PLN Enjiniring</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>
        <a href="#main-content" className="skip-link">Lewati ke konten utama</a>
        <AuthProvider>
          <ThemeProvider>
            <LayoutContent>{children}</LayoutContent>
          </ThemeProvider>
        </AuthProvider>

        <style>{`
          .skip-link {
            position: absolute;
            top: -100%;
            left: 0;
            background: var(--primary);
            color: #fff;
            padding: 0.5rem 1rem;
            z-index: 9999;
            border-radius: 0 0 8px 0;
            font-weight: 600;
            font-size: 0.875rem;
          }
          .skip-link:focus { top: 0; }
        `}</style>
      </body>
    </html>
  )
}

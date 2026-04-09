/**
 * lib/db.js — Supabase PostgreSQL-backed data layer (replaces filesystem JSON)
 *
 * Strategy: Store all core data as a single JSON document in the `JsonStore`
 * table (key = 'main'). This preserves the exact getDB()/saveDB() contract
 * used by all 37+ API routes, with zero changes needed in those routes.
 *
 * AttendanceLog remains as a normalized Prisma model for performance.
 */
import { prisma } from './prisma.js'

const STORE_KEY = 'main'

// ── Default data (used when JsonStore is empty / first run) ──
const initialData = {
  users: [
    { id: 'u1', email: 'admin@hris.com', password: 'password123', name: 'Admin HR', role: 'ADMIN_HR' },
    { id: 'u2', email: 'john@company.com', password: 'password123', name: 'John Supervisor', role: 'SUPERVISOR' },
    { id: 'u3', email: 'alice@univ.edu', password: 'password123', name: 'Alice Intern', role: 'INTERN' }
  ],
  interns: [
    {
      id: 'i1', userId: 'u3', name: 'Alice Intern', nim_nis: '12345678',
      gender: 'Perempuan', university: 'Tech Institute', jenjang: 'S1',
      major: 'Software Engineering', status: 'ACTIVE', bidang: 'IT Development',
      wilayah: 'Jakarta Selatan', tahun: '2026', periodStart: '2026-01-01',
      periodEnd: '2026-06-30', duration: '6 Bulan', phone: '08123456789', deletedAt: null
    }
  ],
  attendances: [], reports: [], tasks: [], evaluations: [],
  allowanceLogs: [], auditLogs: [], onboarding: [],
  announcements: [
    { id: 'ann1', title: 'Selamat Datang di Intern Hub PLNE!', content: 'Sistem HRIS Intern Hub PLN Enjiniring resmi digunakan.', priority: 'INFO', pinned: true, createdAt: new Date().toISOString(), createdBy: 'Admin HR' }
  ],
  hrTasks: [
    { id: 'task1', title: 'Review dokumen onboarding batch Maret', dueDate: '2026-03-31', priority: 'HIGH', completed: false, createdAt: new Date().toISOString() },
  ],
  events: [],
  payrolls: [],
  settings: {
    capacityTargets: { 'IT Development': 15, 'HR Admin': 5, 'Marketing': 10, 'Finance': 5, 'Legal': 3, 'Operational': 20 }
  }
}

// ── Cached Read Strategy (Warm Container Memory) ──
// Use global memory to bypass Vercel's 2MB Data Cache limit for unstable_cache
const globalForDB = globalThis;

const fetchJsonStore = async (mode = 'ACTIVE') => {
  const storeKey = mode === 'ARCHIVE' ? 'archive' : STORE_KEY;

  if (mode === 'FULL') {
    if (globalForDB._fullCachePromise) {
      return globalForDB._fullCachePromise;
    }
    globalForDB._fullCachePromise = (async () => {
      // We need both, check caches independently
      const mainData = await fetchJsonStore('ACTIVE')
      const archiveData = await fetchJsonStore('ARCHIVE')
      
      // Deep copy and merge
      const active = JSON.parse(JSON.stringify(mainData))
      const archive = JSON.parse(JSON.stringify(archiveData))
      
      return {
        users: [...active.users, ...(archive.users || [])],
        interns: [...active.interns, ...(archive.interns || [])],
        attendances: [...active.attendances, ...(archive.attendances || [])],
        reports: [...active.reports, ...(archive.reports || [])],
        evaluations: [...active.evaluations, ...(archive.evaluations || [])],
        payrolls: [...active.payrolls, ...(archive.payrolls || [])],
        surveys: [...active.surveys, ...(archive.surveys || [])],
        onboarding: active.onboarding || [],
        events: active.events || [],
        settings: active.settings || {},
        announcements: active.announcements || [],
        hrTasks: active.hrTasks || [],
        logs: [...(active.logs || []), ...(archive.logs || [])]
      }
    })();
    return globalForDB._fullCachePromise;
  }

  // Handle single store fetching with cache
  const cacheKey = storeKey === 'main' ? '_dbCachePromise' : '_archiveCachePromise';

  if (globalForDB[cacheKey]) {
    return globalForDB[cacheKey];
  }
  
  globalForDB[cacheKey] = prisma.jsonStore.findUnique({ where: { key: storeKey } })
    .then(async (record) => {
      if (!record) {
        if (storeKey === 'main') {
           await prisma.jsonStore.create({ data: { key: storeKey, data: initialData } })
           return initialData
        } else {
           const emptyArchive = { users:[], interns:[], attendances:[], reports:[], evaluations:[], payrolls:[], surveys:[], logs:[] }
           await prisma.jsonStore.create({ data: { key: storeKey, data: emptyArchive } })
           return emptyArchive
        }
      }
      return record.data
    })
    .catch(err => {
      globalForDB[cacheKey] = null;
      throw err;
    });

  return globalForDB[cacheKey];
}

export const getDB = async (mode = 'ACTIVE') => {
  try {
    const data = await fetchJsonStore(mode)
    return JSON.parse(JSON.stringify(data))
  } catch (err) {
    console.error(`[db.js] getDB(${mode}) error:`, err.message)
    return mode === 'ARCHIVE' ? {} : JSON.parse(JSON.stringify(initialData))
  }
}

export const saveDB = async (data) => {
  try {
    await prisma.jsonStore.upsert({
      where: { key: STORE_KEY },
      update: { data },
      create: { key: STORE_KEY, data }
    })
    // Invalidate local RAM cache for MAIN only. Archive is read-only.
    globalForDB._dbCachePromise = null;
    globalForDB._fullCachePromise = null;
  } catch (err) {
    console.error('[db.js] saveDB error:', err.message)
    throw err
  }
}

// ── Helper methods (same API as before) ──
export const db = {
  getUsers: async () => {
    const data = await getDB()
    return data.users
  },

  getInterns: async (includeDeleted = false) => {
    const data = await getDB()
    const interns = includeDeleted ? data.interns : (data.interns || []).filter(i => !i.deletedAt)
    return interns.map(i => ({
      ...i,
      status: db.getEffectiveStatus(i),
      user: (data.users || []).find(u => u.id === i.userId)
    }))
  },

  addLog: async (userId, action, details) => {
    try {
      const data = await getDB()
      if (!data.auditLogs) data.auditLogs = []
      data.auditLogs.push({
        id: 'log' + Date.now(),
        userId,
        action,
        details,
        timestamp: new Date().toISOString()
      })
      await saveDB(data)
    } catch (err) {
      // Logging is non-critical — never block the caller
      console.error('[db.js] addLog failed (non-fatal):', err.message)
    }
  },

  submitOnboarding: async (formData) => {
    const data = await getDB()
    const onboardingEntry = {
      id: 'ob' + Date.now(),
      ...formData,
      status: 'PENDING',
      timestamp: new Date().toISOString()
    }
    if (!data.onboarding) data.onboarding = []
    data.onboarding.push(onboardingEntry)
    await saveDB(data)
    return onboardingEntry
  },

  updateOnboarding: async (id, status, reason = '') => {
    const data = await getDB()
    const entry = (data.onboarding || []).find(o => o.id === id)
    if (entry) {
      entry.status = status
      entry.rejectReason = reason
      await saveDB(data)
    }
  },

  getEffectiveStatus: (intern) => {
    const today = new Date(); today.setHours(0,0,0,0)
    const s = String(intern.status || 'ACTIVE').toUpperCase()
    if (s === 'TERMINATED') return 'TERMINATED'
    if (s === 'ACTIVE' && intern.periodEnd) {
      const end = new Date(intern.periodEnd); end.setHours(0,0,0,0)
      if (end < today) return 'COMPLETED'
    }
    return s
  }
}

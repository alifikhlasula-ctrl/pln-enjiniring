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

// ── In-Memory Cache (value + TTL) ────────────────────────────────────────────
// Strategy: Cache the RESOLVED data value with a timestamp.
// - On cache miss or TTL expiry (30 seconds), fetch from DB.
// - saveDB() always invalidates immediately (no stale writes).
// - Concurrent cache-miss requests are deduplicated via an in-flight Promise.
// This turns 40 simultaneous reads into ≤1 DB query per 30-second window.

const CACHE_TTL_MS = 30_000  // 30 seconds

const _cache = {
  // Structure per key: { data: any, ts: number, inflight: Promise|null }
  main:    { data: null, ts: 0, inflight: null },
  archive: { data: null, ts: 0, inflight: null },
  full:    { data: null, ts: 0, inflight: null },
}

function isFresh(entry) {
  return entry.data !== null && (Date.now() - entry.ts) < CACHE_TTL_MS
}

async function fetchFromDB(storeKey) {
  const record = await prisma.jsonStore.findUnique({ where: { key: storeKey } })
  if (!record) {
    if (storeKey === 'main') {
      await prisma.jsonStore.create({ data: { key: storeKey, data: initialData } })
      return initialData
    }
    const emptyArchive = { users:[], interns:[], attendances:[], reports:[], evaluations:[], payrolls:[], surveys:[], logs:[] }
    await prisma.jsonStore.create({ data: { key: storeKey, data: emptyArchive } })
    return emptyArchive
  }
  return record.data
}

const fetchJsonStore = async (mode = 'ACTIVE') => {
  if (mode === 'FULL') {
    const entry = _cache.full
    if (isFresh(entry)) return entry.data

    // Deduplicate concurrent full-fetch requests
    if (entry.inflight) return entry.inflight

    entry.inflight = (async () => {
      try {
        const [mainData, archiveData] = await Promise.all([
          fetchJsonStore('ACTIVE'),
          fetchJsonStore('ARCHIVE')
        ])
        const merged = {
          users:        [...mainData.users,        ...(archiveData.users        || [])],
          interns:      [...mainData.interns,      ...(archiveData.interns      || [])],
          attendances:  [...mainData.attendances,  ...(archiveData.attendances  || [])],
          reports:      [...mainData.reports,      ...(archiveData.reports      || [])],
          evaluations:  [...mainData.evaluations,  ...(archiveData.evaluations  || [])],
          payrolls:     [...mainData.payrolls,     ...(archiveData.payrolls     || [])],
          surveys:      [...mainData.surveys,      ...(archiveData.surveys      || [])],
          onboarding:   mainData.onboarding  || [],
          events:       mainData.events      || [],
          settings:     mainData.settings    || {},
          announcements:mainData.announcements|| [],
          hrTasks:      mainData.hrTasks     || [],
          logs:         [...(mainData.logs   || []), ...(archiveData.logs       || [])],
        }
        entry.data = merged
        entry.ts   = Date.now()
        return merged
      } finally {
        entry.inflight = null
      }
    })()
    return entry.inflight
  }

  const storeKey = mode === 'ARCHIVE' ? 'archive' : STORE_KEY
  const entry    = mode === 'ARCHIVE' ? _cache.archive : _cache.main

  if (isFresh(entry)) return entry.data

  // Deduplicate concurrent miss requests
  if (entry.inflight) return entry.inflight

  entry.inflight = (async () => {
    try {
      const data   = await fetchFromDB(storeKey)
      entry.data   = data
      entry.ts     = Date.now()
      return data
    } catch (err) {
      // On DB error, return stale data if available (graceful degradation)
      if (entry.data) {
        console.warn(`[db.js] DB error, serving stale cache (${storeKey}):`, err.message)
        return entry.data
      }
      throw err
    } finally {
      entry.inflight = null
    }
  })()
  return entry.inflight
}

export const getDB = async (mode = 'ACTIVE', { clone = true } = {}) => {
  try {
    const data = await fetchJsonStore(mode)
    if (!clone) return data
    return JSON.parse(JSON.stringify(data))
  } catch (err) {
    console.error(`[db.js] getDB(${mode}) error:`, err.message)
    const fallback = mode === 'ARCHIVE' ? {} : initialData
    if (!clone) return fallback
    return JSON.parse(JSON.stringify(fallback))
  }
}

export const saveDB = async (data) => {
  try {
    await prisma.jsonStore.upsert({
      where:  { key: STORE_KEY },
      update: { data },
      create: { key: STORE_KEY, data }
    })
    // Invalidate all cache entries immediately so next read is always fresh
    _cache.main.data    = null; _cache.main.ts    = 0
    _cache.full.data    = null; _cache.full.ts    = 0
  } catch (err) {
    console.error('[db.js] saveDB error:', err.message)
    throw err
  }
}

// ── Helper methods (same API as before) ──
export const db = {
  getUsers: async () => {
    const data = await getDB('ACTIVE', { clone: false })
    return data.users
  },

  getInterns: async (includeDeleted = false) => {
    // ── Pre-fetch both sources in parallel ──
    const pRelational = prisma.intern.findMany({
        where: includeDeleted ? {} : { deletedAt: null }
    })
    const pData = getDB('ACTIVE', { clone: false })

    const [relationalInterns, data] = await Promise.all([pRelational, pData])
    const legacyInterns = includeDeleted ? (data.interns || []) : (data.interns || []).filter(i => !i.deletedAt)

    // ── Merge & Deduplicate ──
    const idMap = new Map();
    [...relationalInterns, ...legacyInterns].forEach(i => {
        if (!idMap.has(i.id)) idMap.set(i.id, i)
    })

    const merged = Array.from(idMap.values())

    return merged.map(i => ({
      ...i,
      status: db.getEffectiveStatus(i),
      user: (data.users || []).find(u => u.id === i.userId)
    }))
  },

  addLog: async (userId, action, details) => {
    try {
      // ─── OPTIMIZATION: Write to relational table instead of JSON blob ───
      // This prevents every log entry from invalidating the main RAM cache.
      await prisma.auditLog.create({
        data: {
          userId: userId || 'SYSTEM',
          action: action,
          details: details ? JSON.parse(JSON.stringify(details)) : null
        }
      })
      console.log(`[db.js] AuditLog recorded: ${action} for ${userId}`)
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

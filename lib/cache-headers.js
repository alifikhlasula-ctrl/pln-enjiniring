/**
 * lib/cache-headers.js
 * Centralized HTTP Cache-Control header utilities.
 *
 * Used by GET routes to tell the browser (and CDN/proxy if any) how long
 * to cache each response. This reduces repeat hits for the same data.
 *
 * Rules:
 * - Real-time data (live attendance, notifications)  → very short / no cache
 * - Semi-static data (announcements, events)         → medium cache + stale-while-revalidate
 * - Static-ish data (payroll history, evaluations)   → longer cache
 *
 * Usage:
 *   import { withCache } from '@/lib/cache-headers'
 *   return withCache(NextResponse.json(data), 'MEDIUM')
 */

/**
 * @param {import('next/server').NextResponse} response
 * @param {'REALTIME'|'SHORT'|'MEDIUM'|'LONG'|'NO_STORE'} preset
 * @returns {import('next/server').NextResponse}
 */
export function withCache(response, preset = 'SHORT') {
  const headers = {
    // Real-time: no CDN cache, but allow browser to reuse for 5s (hard refresh still works)
    REALTIME:  'no-cache, no-store, must-revalidate',

    // Short: Cache 15s, serve stale for up to 60s while revalidating in background
    SHORT:     'public, s-maxage=15, stale-while-revalidate=60',

    // Medium: Cache 30s, serve stale for 120s — good for announcements, events, interns list
    MEDIUM:    'public, s-maxage=30, stale-while-revalidate=120',

    // Long: Cache 5min, serve stale for 10min — good for payroll history, evaluations
    LONG:      'public, s-maxage=300, stale-while-revalidate=600',

    // No store: sensitive data that must never be cached (user profile, auth)
    NO_STORE:  'no-store, private',
  }

  response.headers.set('Cache-Control', headers[preset] ?? headers.SHORT)
  return response
}

/**
 * Convenience: wrap a plain JSON payload in a cached NextResponse.
 * @param {object} payload
 * @param {'REALTIME'|'SHORT'|'MEDIUM'|'LONG'|'NO_STORE'} preset
 */
export function cachedJson(payload, preset = 'SHORT') {
  const { NextResponse } = require('next/server')
  return withCache(NextResponse.json(payload), preset)
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/ping
 * Lightweight keep-alive endpoint.
 * Ping this every 5 minutes from UptimeRobot (or similar) to prevent Zeabur cold starts.
 * It also warms up the Prisma DB connection pool with a minimal query.
 */
export async function GET() {
  const start = Date.now()
  let dbStatus = 'skip'

  try {
    // Minimal DB warmup — keeps connection pool alive
    await prisma.$queryRaw`SELECT 1`
    dbStatus = 'warm'
  } catch {
    dbStatus = 'error'
  }

  return NextResponse.json(
    {
      ok:      true,
      db:      dbStatus,
      latency: Date.now() - start,
      ts:      new Date().toISOString(),
      service: 'PLN Enjiniring HRIS',
    },
    {
      headers: {
        // Never cache this — it must always hit the server
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}

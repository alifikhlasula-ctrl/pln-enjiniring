import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  try {
    // Trigger leaderboard snapshot for previous month
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'

    const res = await fetch(`${baseUrl}/api/admin/leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cron-secret': process.env.CRON_SECRET || 'internal' },
      body: JSON.stringify({ secret: process.env.CRON_SECRET || 'internal' })
    })
    const data = await res.json()
    return NextResponse.json({ success: true, leaderboardSnapshot: data })
  } catch (err) {
    console.error('[Cron leaderboard-snapshot]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

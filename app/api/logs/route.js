import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

export async function GET() {
  const data = await getDB()
  const logs = data.auditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  return NextResponse.json(logs)
}

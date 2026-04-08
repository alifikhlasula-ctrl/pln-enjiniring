import { NextResponse } from 'next/server'
import { getDB, saveDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const data = await getDB()
  return NextResponse.json(data.settings?.capacityTargets || {})
}

export async function POST(request) {
  try {
    const targets = await request.json()
    const data = await getDB()
    
    if (!data.settings) data.settings = { capacityTargets: {} }
    data.settings.capacityTargets = targets
    
    await saveDB(data)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

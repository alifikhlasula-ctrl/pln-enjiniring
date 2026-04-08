import { NextResponse } from 'next/server'
import { getDB, saveDB } from '@/lib/db'

const INITIAL_SKILLS = [
  { id: 's1', name: 'Komunikasi Profesional', done: false, cat: 'Soft Skill' },
  { id: 's2', name: 'Manajemen Waktu', done: false, cat: 'Soft Skill' },
  { id: 's3', name: 'Presentasi & Reporting', done: false, cat: 'Soft Skill' },
  { id: 's4', name: 'Microsoft Excel / Data', done: false, cat: 'Hard Skill' },
  { id: 's5', name: 'Pemrograman / Teknis', done: false, cat: 'Hard Skill' },
  { id: 's6', name: 'Kerja Tim (Teamwork)', done: false, cat: 'Soft Skill' },
  { id: 's7', name: 'Problem Solving', done: false, cat: 'Soft Skill' },
  { id: 's8', name: 'Desain / Kreativitas', done: false, cat: 'Hard Skill' },
]

// GET /api/intern-dashboard/skills?userId=u3
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 })

    const data = await getDB()
    if (!data.internSkills) data.internSkills = {}
    
    const userSkills = data.internSkills[userId] || INITIAL_SKILLS
    
    return NextResponse.json({ skills: userSkills })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/intern-dashboard/skills
export async function POST(request) {
  try {
    const { userId, skills } = await request.json()
    if (!userId || !skills) return NextResponse.json({ error: 'userId dan skills diperlukan' }, { status: 400 })

    const data = await getDB()
    if (!data.internSkills) data.internSkills = {}
    
    data.internSkills[userId] = skills
    
    await saveDB(data)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

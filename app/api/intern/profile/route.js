import { NextResponse } from 'next/server'
import { getDB, saveDB, db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'User ID diperlukan' }, { status: 400 })

    const data = await getDB()
    const intern = (data.interns || []).find(i => i.userId === userId && !i.deletedAt)
    // We also return the auth user data so we can auto-fill strictly if intern record does not exist
    const user = (data.users || []).find(u => u.id === userId)

    if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

    return NextResponse.json({ success: true, intern: intern || null, user })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { userId, ...profileData } = body
    if (!userId) return NextResponse.json({ error: 'User ID diperlukan' }, { status: 400 })

    const data = await getDB()
    const internIndex = (data.interns || []).findIndex(i => i.userId === userId && !i.deletedAt)
    
    // We restrict some fields that intern should NOT modify themselves, like status and duration
    // Actually, duration is calculated in onboarding. Should they edit periodStart/End? Yes, if not set.
    // If they change periodEnd, status might be derived but it's handled on read usually using `getEffectiveStatus`.

    let updatedIntern = {}

    if (internIndex > -1) {
      // Update existing
      updatedIntern = {
        ...data.interns[internIndex],
        ...profileData,
        // Protect vital administrative fields from being wiped by the intern frontend
        status: data.interns[internIndex].status,
        userId: data.interns[internIndex].userId,
        id: data.interns[internIndex].id,
        periodStart: data.interns[internIndex].periodStart || profileData.periodStart,
        periodEnd: data.interns[internIndex].periodEnd || profileData.periodEnd,
        duration: data.interns[internIndex].duration || profileData.duration,
        bidang: data.interns[internIndex].bidang || profileData.bidang,
        wilayah: data.interns[internIndex].wilayah || profileData.wilayah,
      }
      data.interns[internIndex] = updatedIntern
    } else {
      // Insert new intern record if they somehow bypassed onboarding
      const ts = Date.now()
      updatedIntern = {
        id: 'i' + ts,
        userId: userId,
        status: 'ACTIVE',
        deletedAt: null,
        ...profileData, // Base data provided by form
      }
      if (!data.interns) data.interns = []
      data.interns.push(updatedIntern)
    }

    // Attempt to calculate duration if start and end are provided
    if (updatedIntern.periodStart && updatedIntern.periodEnd) {
       const calcDur = (s, e) => {
         const a=new Date(s), b=new Date(e)
         if(isNaN(a)||isNaN(b)||b<a) return ''
         const d=Math.ceil(Math.abs(b-a)/86400000), m=Math.floor(d/30), r=d%30
         return `${m>0?m+' Bulan ':''}${r>0?r+' Hari':''}`
       }
       updatedIntern.duration = calcDur(updatedIntern.periodStart, updatedIntern.periodEnd)
    }

    await saveDB(data)
    await db.addLog(userId, 'PROFILE_UPDATE', { internId: updatedIntern.id })

    return NextResponse.json({ success: true, intern: updatedIntern })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

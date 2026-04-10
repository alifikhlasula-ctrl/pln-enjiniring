import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    const existingIntern = await prisma.intern.findUnique({
      where: { userId }
    })

    let updatedIntern = {};

    if (existingIntern) {
      // Calculate duration securely
      let duration = existingIntern.duration || profileData.duration;
      const start = existingIntern.periodStart || profileData.periodStart;
      const end = existingIntern.periodEnd || profileData.periodEnd;
      
      if (start && end) {
        const calcDur = (s, e) => {
          const a=new Date(s), b=new Date(e)
          if(isNaN(a)||isNaN(b)||b<a) return ''
          const d=Math.ceil(Math.abs(b-a)/86400000), m=Math.floor(d/30), r=d%30
          return `${m>0?m+' Bulan ':''}${r>0?r+' Hari':''}`
        }
        duration = calcDur(start, end)
      }

      updatedIntern = await prisma.intern.update({
        where: { userId },
        data: {
          ...profileData,
          periodStart: start,
          periodEnd: end,
          duration: duration,
          status: existingIntern.status, // Protect status
          bidang: existingIntern.bidang || profileData.bidang,
          wilayah: existingIntern.wilayah || profileData.wilayah,
        }
      })
    } else {
      // Insert new intern record if bypassed
      const ts = Date.now()
      
      let duration = null;
      if (profileData.periodStart && profileData.periodEnd) {
         const calcDur = (s, e) => {
           const a=new Date(s), b=new Date(e)
           if(isNaN(a)||isNaN(b)||b<a) return ''
           const d=Math.ceil(Math.abs(b-a)/86400000), m=Math.floor(d/30), r=d%30
           return `${m>0?m+' Bulan ':''}${r>0?r+' Hari':''}`
         }
         duration = calcDur(profileData.periodStart, profileData.periodEnd)
      }

      updatedIntern = await prisma.intern.create({
        data: {
          id: 'i' + ts,
          userId: userId,
          status: 'ACTIVE',
          deletedAt: null,
          duration,
          nim_nis: profileData.nim_nis || '-',
          university: profileData.university || '-',
          major: profileData.major || '-',
          bidang: profileData.bidang || '-',
          ...profileData
        }
      })
    }

    db.addLog(userId, 'PROFILE_UPDATE', { internId: updatedIntern.id }).catch(()=>{})

    return NextResponse.json({ success: true, intern: updatedIntern })
  } catch (err) {
    console.error("Profile update error:", err)
    return NextResponse.json({ error: 'Terjadi kesalahan saat menyimpan profil.' }, { status: 500 })
  }
}

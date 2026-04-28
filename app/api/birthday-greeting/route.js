import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const todayWIB = () => {
  const now = new Date(Date.now() + 7 * 3600000)
  return now.toISOString().split('T')[0]
}

const toMMDD = d => {
  if (!d) return null
  const parts = d.split('T')[0].split('-')
  return parts.length >= 3 ? `${parts[1]}-${parts[2]}` : null
}

/* ── GET: Return greeting for an intern on their birthday ── */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const internId = searchParams.get('internId')
    if (!internId) return NextResponse.json({ isBirthday: false })

    const intern = await prisma.intern.findUnique({
      where:  { id: internId },
      select: { id: true, name: true, birthDate: true }
    })
    if (!intern?.birthDate) return NextResponse.json({ isBirthday: false })

    const todayStr   = todayWIB()
    const todayMMDD  = toMMDD(todayStr)
    const internMMDD = toMMDD(intern.birthDate)
    const isBirthday = todayMMDD === internMMDD

    if (!isBirthday) return NextResponse.json({ isBirthday: false })

    // Try to fetch personalized greeting from Admin
    const thisYear  = todayStr.split('-')[0]
    const key       = `${internId}_${thisYear}`
    let message     = null

    try {
      const store = await prisma.jsonStore.findUnique({ where: { key: 'birthday_greetings' } })
      if (store?.data?.[key]) {
        message = store.data[key].message
      }
    } catch (_) {}

    // Fallback greeting if admin hasn't written one
    if (!message) {
      message = `Selamat Ulang Tahun, ${intern.name}! 🎉\n\nSemoga hari spesialmu dipenuhi kebahagiaan dan semangat baru dalam menjalani program magang. Terus berprestasi dan jadilah kebanggaan! 🌟\n\n— Admin HR PLN Enjiniring`
    }

    return NextResponse.json({ isBirthday: true, message, name: intern.name })
  } catch (err) {
    console.error('[GET /api/birthday-greeting]', err)
    return NextResponse.json({ isBirthday: false })
  }
}

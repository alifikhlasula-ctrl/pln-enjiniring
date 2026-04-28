import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/* ── Helpers ─────────────────────────────── */
// Returns "MM-DD" from a "YYYY-MM-DD" or Date
const toMMDD = d => {
  if (!d) return null
  const s = typeof d === 'string' ? d : d.toISOString()
  const parts = s.split('T')[0].split('-')
  if (parts.length < 3) return null
  return `${parts[1]}-${parts[2]}`
}

const todayWIB = () => {
  const now = new Date(Date.now() + 7 * 3600000)
  return now.toISOString().split('T')[0] // YYYY-MM-DD
}

/* ── GET: Birthday list (month + today/tomorrow flags) ── */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month') // optional, e.g. "04"

    const todayStr  = todayWIB()
    const todayMMDD = `${todayStr.split('-')[1]}-${todayStr.split('-')[2]}`
    const tomorrowDate = new Date(Date.now() + 7 * 3600000 + 86400000)
    const tomorrowMMDD = toMMDD(tomorrowDate.toISOString())

    const targetMonth = monthParam || todayStr.split('-')[1] // e.g. "04"

    // Fetch all active interns with a birthDate
    const interns = await prisma.intern.findMany({
      where: {
        deletedAt: null,
        birthDate: { not: null }
      },
      select: { id: true, name: true, birthDate: true, bidang: true, phone: true, status: true }
    })

    // Load all stored greetings from JsonStore
    let greetingsMap = {}
    try {
      const store = await prisma.jsonStore.findUnique({ where: { key: 'birthday_greetings' } })
      if (store?.data) greetingsMap = store.data
    } catch (_) {}

    const thisYear = todayStr.split('-')[0]

    const entries = interns
      .map(i => {
        const mmdd = toMMDD(i.birthDate)
        if (!mmdd) return null
        const [mm, dd] = mmdd.split('-')
        const isToday    = mmdd === todayMMDD
        const isTomorrow = mmdd === tomorrowMMDD
        const age        = thisYear - parseInt(i.birthDate.split('-')[0])
        // Days until birthday (within current year)
        const bdThisYear = `${thisYear}-${mm}-${dd}`
        const bdDate     = new Date(bdThisYear + 'T00:00:00+07:00')
        const nowDate    = new Date(todayStr + 'T00:00:00+07:00')
        let daysUntil    = Math.ceil((bdDate - nowDate) / 86400000)
        if (daysUntil < 0) daysUntil += 365 // next year

        const greetingKey = `${i.id}_${thisYear}`
        const greeting    = greetingsMap[greetingKey] || null

        return {
          internId:   i.id,
          name:       i.name,
          bidang:     i.bidang || '-',
          phone:      i.phone  || null,
          birthDate:  i.birthDate,
          mmdd,
          month:      mm,
          day:        dd,
          age,
          isToday,
          isTomorrow,
          daysUntil,
          status:     i.status,
          greeting:   greeting ? {
            message:   greeting.message,
            template:  greeting.template,
            savedAt:   greeting.savedAt,
          } : null,
          hasGreeting: !!greeting
        }
      })
      .filter(Boolean)
      .filter(e => e.month === targetMonth)
      .sort((a, b) => parseInt(a.day) - parseInt(b.day))

    // Also return a full history (all greetings ever saved)
    const history = Object.entries(greetingsMap).map(([key, val]) => {
      const [internId, year] = key.split('_')
      const intern = interns.find(i => i.id === internId)
      return {
        key,
        internId,
        internName: intern?.name || 'Intern Tidak Dikenal',
        year,
        message:  val.message,
        template: val.template,
        savedAt:  val.savedAt,
      }
    }).sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))

    return NextResponse.json({
      month:    targetMonth,
      today:    todayMMDD,
      tomorrow: tomorrowMMDD,
      entries,
      todayBirthdays:    entries.filter(e => e.isToday),
      tomorrowBirthdays: entries.filter(e => e.isTomorrow),
      history
    })
  } catch (err) {
    console.error('[GET /api/admin/birthday]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/* ── POST: Save/Update greeting for an intern ── */
export async function POST(request) {
  try {
    const { internId, message, template } = await request.json()
    if (!internId || !message?.trim()) {
      return NextResponse.json({ error: 'internId dan message wajib diisi' }, { status: 400 })
    }

    const todayStr  = todayWIB()
    const thisYear  = todayStr.split('-')[0]
    const greetingKey = `${internId}_${thisYear}`

    // Load existing store
    let storeData = {}
    try {
      const store = await prisma.jsonStore.findUnique({ where: { key: 'birthday_greetings' } })
      if (store?.data) storeData = store.data
    } catch (_) {}

    // Keep history: if a greeting existed, push to historyLog
    const existing = storeData[greetingKey]
    const historyLog = existing?.historyLog || []
    if (existing?.message) {
      historyLog.push({ message: existing.message, template: existing.template, savedAt: existing.savedAt })
    }

    storeData[greetingKey] = {
      message: message.trim(),
      template: template || 'CUSTOM',
      savedAt: new Date().toISOString(),
      historyLog
    }

    await prisma.jsonStore.upsert({
      where:  { key: 'birthday_greetings' },
      create: { key: 'birthday_greetings', data: storeData },
      update: { data: storeData }
    })

    return NextResponse.json({ success: true, key: greetingKey })
  } catch (err) {
    console.error('[POST /api/admin/birthday]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

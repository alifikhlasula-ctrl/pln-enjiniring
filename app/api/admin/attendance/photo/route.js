import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/attendance/photo
 * Returns a single face photo for a given attendance log entry.
 * Uses lazy-load approach: only fetches the large Base64 column when explicitly requested.
 *
 * Query params:
 *   - logId   : AttendanceLog.id  (preferred)
 *   - internId: Intern.id (combined with ?date=YYYY-MM-DD as fallback)
 *   - date    : YYYY-MM-DD
 *   - type    : 'in' | 'out'  (default: 'in')
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const logId    = searchParams.get('logId')
    const internId = searchParams.get('internId')
    const date     = searchParams.get('date')
    const type     = (searchParams.get('type') || 'in').toLowerCase()

    let log = null

    if (logId) {
      log = await prisma.attendanceLog.findUnique({
        where: { id: logId },
        select: {
          id: true,
          faceInUrl: true, faceInBase64: true,
          faceOutUrl: true, faceOutBase64: true,
        }
      })
    } else if (internId && date) {
      log = await prisma.attendanceLog.findUnique({
        where: { internId_date: { internId, date } },
        select: {
          id: true,
          faceInUrl: true, faceInBase64: true,
          faceOutUrl: true, faceOutBase64: true,
        }
      })
    }

    if (!log) {
      return NextResponse.json({ url: null, source: null })
    }

    let url = null
    let source = null

    if (type === 'out') {
      if (log.faceOutUrl) {
        url = log.faceOutUrl; source = 'storage'
      } else if (log.faceOutBase64) {
        url = `data:image/jpeg;base64,${log.faceOutBase64}`; source = 'base64'
      }
    } else {
      if (log.faceInUrl) {
        url = log.faceInUrl; source = 'storage'
      } else if (log.faceInBase64) {
        url = `data:image/jpeg;base64,${log.faceInBase64}`; source = 'base64'
      }
    }

    return NextResponse.json({ url, source, logId: log.id })
  } catch (err) {
    console.error('[GET /api/admin/attendance/photo]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

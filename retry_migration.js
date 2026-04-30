// Retry 1 failed record
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from './lib/generated/client/index.js'

const prisma = new PrismaClient()
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const BUCKET = 'hris-photos'

async function main() {
  const log = await prisma.attendanceLog.findUnique({
    where: { id: 'cmnyj0sj20000nosyv6dwlg76' },
    select: { id: true, internId: true, date: true, faceInBase64: true, faceInUrl: true }
  })
  if (!log) return console.log('Record not found');
  if (!log.faceInBase64) return console.log('Already migrated or no Base64');

  const path = `attendance/${log.internId}/${log.date}-in.jpg`
  const matches = log.faceInBase64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
  if (!matches) return console.error('Invalid Base64 format')

  const buffer = Buffer.from(matches[2], 'base64')
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: matches[1], upsert: true })
  if (error) return console.error('Upload still failed:', error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  await prisma.attendanceLog.update({ where: { id: log.id }, data: { faceInUrl: data.publicUrl, faceInBase64: null } })
  console.log('✅ Successfully migrated the last record. DB is now fully clean.')
}

main().finally(() => prisma.$disconnect())

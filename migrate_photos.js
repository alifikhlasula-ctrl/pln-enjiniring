/**
 * MIGRATION SCRIPT: Base64 Photos → Supabase Storage
 * 
 * SAFETY FEATURES:
 * 1. Creates a full JSON backup of ALL Base64 data before touching anything
 * 2. Only nulls out Base64 AFTER confirming successful URL storage
 * 3. Skips records where upload fails (keeps Base64 as-is)
 * 4. Generates a detailed report at the end
 */

import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from './lib/generated/client/index.js'
import fs from 'fs'

const prisma = new PrismaClient()
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase     = createClient(supabaseUrl, supabaseKey)
const BUCKET       = 'hris-photos'

function attendancePath(internId, date, type) {
  return `attendance/${internId}/${date}-${type}.jpg`
}

async function uploadBase64Photo(path, dataUrl) {
  const matches = dataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
  if (!matches || matches.length !== 3) throw new Error('Invalid base64 format')
  const mimeType = matches[1]
  const buffer   = Buffer.from(matches[2], 'base64')
  
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: mimeType,
    upsert: true
  })
  if (error) throw new Error(`Upload failed [${path}]: ${error.message}`)
  
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return urlData.publicUrl
}

async function main() {
  console.log('==========================================')
  console.log(' PHASE 0: SAFETY BACKUP')
  console.log('==========================================')
  
  // Fetch ALL logs that have Base64 data
  const logsWithBase64 = await prisma.attendanceLog.findMany({
    where: {
      OR: [
        { faceInBase64: { not: null } },
        { faceOutBase64: { not: null } }
      ]
    },
    select: {
      id: true,
      internId: true,
      date: true,
      faceInBase64: true,
      faceOutBase64: true,
      faceInUrl: true,
      faceOutUrl: true
    }
  })

  console.log(`Found ${logsWithBase64.length} records with Base64 data.`)
  
  // Create a timestamped backup file
  const backupPath = `base64_backup_${Date.now()}.json`
  fs.writeFileSync(backupPath, JSON.stringify(logsWithBase64, null, 2))
  console.log(`✅ BACKUP created: ${backupPath} (KEEP THIS FILE AS ROLLBACK DATA)`)
  
  console.log('\n==========================================')
  console.log(' PHASE 1: MIGRATE BASE64 → STORAGE')
  console.log('==========================================')
  
  const results = { success: 0, failed: 0, skipped: 0, failures: [] }

  for (const log of logsWithBase64) {
    const updates = {}

    // --- Process Clock-IN photo ---
    if (log.faceInBase64 && !log.faceInUrl) {
      const path = attendancePath(log.internId, log.date, 'in')
      try {
        const url = await uploadBase64Photo(path, log.faceInBase64)
        updates.faceInUrl    = url
        updates.faceInBase64 = null
        console.log(`  ✅ IN  [${log.date}] ${log.internId.slice(-8)}`)
      } catch (err) {
        console.error(`  ❌ IN  [${log.date}] ${log.internId.slice(-8)} → ${err.message}`)
        results.failures.push({ id: log.id, type: 'IN', date: log.date, error: err.message })
        results.failed++
        // Keep Base64 intact - do NOT add to updates
      }
    } else if (log.faceInBase64 && log.faceInUrl) {
      // Already has a URL - just clear the redundant Base64
      updates.faceInBase64 = null
      results.skipped++
    }

    // --- Process Clock-OUT photo ---
    if (log.faceOutBase64 && !log.faceOutUrl) {
      const path = attendancePath(log.internId, log.date, 'out')
      try {
        const url = await uploadBase64Photo(path, log.faceOutBase64)
        updates.faceOutUrl    = url
        updates.faceOutBase64 = null
        console.log(`  ✅ OUT [${log.date}] ${log.internId.slice(-8)}`)
      } catch (err) {
        console.error(`  ❌ OUT [${log.date}] ${log.internId.slice(-8)} → ${err.message}`)
        results.failures.push({ id: log.id, type: 'OUT', date: log.date, error: err.message })
        results.failed++
        // Keep Base64 intact - do NOT add to updates
      }
    } else if (log.faceOutBase64 && log.faceOutUrl) {
      updates.faceOutBase64 = null
      results.skipped++
    }

    // Only update DB if we have something to update
    if (Object.keys(updates).length > 0) {
      await prisma.attendanceLog.update({
        where: { id: log.id },
        data: updates
      })
      if (!results.failures.find(f => f.id === log.id)) results.success++
    }
  }

  console.log('\n==========================================')
  console.log(' PHASE 2: FINAL VERIFICATION')
  console.log('==========================================')

  // Verify DB is clean
  const remaining = await prisma.attendanceLog.count({
    where: {
      OR: [
        { faceInBase64: { not: null } },
        { faceOutBase64: { not: null } }
      ]
    }
  })

  const urlCount = await prisma.attendanceLog.count({
    where: { OR: [{ faceInUrl: { not: null } }, { faceOutUrl: { not: null } }] }
  })

  console.log('\n--- FINAL REPORT ---')
  console.log(`✅ Successfully migrated : ${results.success} photos`)
  console.log(`⚠️  Skipped (already URL) : ${results.skipped} photos`)
  console.log(`❌ Failed (Base64 kept)  : ${results.failed} photos`)
  console.log(`📸 Records with URLs now : ${urlCount}`)
  console.log(`🗄️  Base64 still in DB   : ${remaining} records`)
  
  if (results.failures.length > 0) {
    fs.writeFileSync('migration_failures.json', JSON.stringify(results.failures, null, 2))
    console.log(`\n⚠️  Failed records saved to: migration_failures.json`)
  }

  if (remaining === 0) {
    console.log('\n🎉 DATABASE IS CLEAN! All Base64 photos removed from database.')
    console.log('   Egress will drop significantly on next billing cycle.')
  } else {
    console.log(`\n⚠️  ${remaining} records still have Base64 (failed uploads). Check migration_failures.json`)
  }

  console.log(`\n🔒 ROLLBACK: If anything went wrong, restore from: ${backupPath}`)
}

main().finally(() => prisma.$disconnect())

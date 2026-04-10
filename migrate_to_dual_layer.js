const { PrismaClient } = require('./lib/generated/client')
const fs = require('fs')

async function main() {
  const envFile = fs.readFileSync('.env', 'utf8')
  const directUrlMatch = envFile.match(/DIRECT_URL="([^"]+)"/) || envFile.match(/DIRECT_URL='([^']+)'/)
  if (directUrlMatch) process.env.DIRECT_URL = directUrlMatch[1]

  const p = new PrismaClient()
  try {
    const record = await p.jsonStore.findUnique({ where: { key: 'main' } })
    if (!record) {
      console.log('No DB record found.')
      return
    }

    const data = record.data
    const interns = data.interns || []
    
    // Safety check - what if it's already split?
    if (interns.length < 100) {
      console.log('Database already small, maybe already split?')
      // We will still proceed, just logging it
    }

    // 1. Identify active interns
    const activeInterns = interns.filter(i => {
      if (i.email && i.email.endsWith('@intern.plne.co.id')) return true
      if (typeof i.name === 'string' && /fusah|renata|meisa|brillianti/i.test(i.name)) return true
      return false
    })

    const activeInternIds = new Set(activeInterns.map(i => i.id))
    const activeUserIds = new Set(activeInterns.map(i => i.userId))

    const archiveInterns = interns.filter(i => !activeInternIds.has(i.id))

    console.log(`Active Interns: ${activeInterns.length}`)
    console.log(`Archive Interns: ${archiveInterns.length}`)

    // 2. Partition Function
    const filterData = (isArchive) => {
      const targetInterns = isArchive ? archiveInterns : activeInterns
      const targetUserIds = new Set(targetInterns.map(i => i.userId))
      const targetInternIdSet = new Set(targetInterns.map(i => i.id))

      const isTargetUser = (uId) => targetUserIds.has(uId)
      const isTargetIntern = (iId) => targetInternIdSet.has(iId)

      const res = {
        interns: targetInterns,
        users: (data.users || []).filter(u => 
          isTargetUser(u.id) || 
          (!isArchive && ['ADMIN_HR', 'SUPERVISOR'].includes(u.role))
        ),
        attendances: (data.attendances || []).filter(a => isTargetIntern(a.internId)),
        reports: (data.reports || []).filter(r => isTargetUser(r.userId)),
        evaluations: (data.evaluations || []).filter(e => isTargetIntern(e.internId)),
        payrolls: (data.payrolls || []).filter(p => isTargetUser(p.userId)),
        surveys: (data.surveys || []).map(s => {
          const responses = s.responses.filter(r => isTargetUser(r.userId))
          return { ...s, responses }
        }).filter(s => !isArchive || s.responses.length > 0),
        onboarding: isArchive ? [] : (data.onboarding || []) // Keep all onboarding in main
      }

      // Keep globals in main only to save space
      if (!isArchive) {
        res.settings = data.settings || {}
        res.events = data.events || []
        res.announcements = data.announcements || []
        res.hrTasks = data.hrTasks || []
        res.logs = (data.logs || []).filter(l => isTargetUser(l.userId) || (l.action && l.action.includes('ADMIN')))
      } else {
        // Keep dummy/empty for archive just in case
        res.settings = {}
        res.events = []
        res.announcements = []
        res.hrTasks = []
        res.logs = (data.logs || []).filter(l => isTargetUser(l.userId))
      }

      return res
    }

    const dataMain = filterData(false)
    const dataArchive = filterData(true)

    // Save ARCHIVE layer first
    console.log(`Saving Archive Data... (Users: ${dataArchive.users.length})`)
    await p.jsonStore.upsert({
      where: { key: 'archive' },
      update: { data: dataArchive },
      create: { key: 'archive', data: dataArchive }
    })
    
    // Save MAIN layer
    console.log(`Saving Main Data... (Users: ${dataMain.users.length})`)
    await p.jsonStore.upsert({
      where: { key: 'main' },
      update: { data: dataMain },
      create: { key: 'main', data: dataMain }
    })

    console.log('Migration Completed Successfully!');
  } catch (err) {
    console.error('Migration Failed:', err)
  } finally {
    await p.$disconnect()
  }
}

main()

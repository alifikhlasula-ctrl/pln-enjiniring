const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const pKey = '2026-04'
  
  // Test: Prisma startsWith filter
  try {
    const logs1 = await prisma.attendanceLog.findMany({
      where: { date: { startsWith: pKey } }
    })
    console.log('startsWith filter - total:', logs1.length)
    logs1.slice(0,3).forEach(l => console.log(' -', l.internId, l.date, l.status))
  } catch(e) {
    console.log('startsWith FAILED:', e.message.substring(0, 200))
  }
  
  // Test: Manual filter after fetch all
  try {
    const allLogs = await prisma.attendanceLog.findMany()
    const aprilLogs = allLogs.filter(l => l.date && l.date.startsWith(pKey))
    console.log('Manual filter after fetch all - total April:', aprilLogs.length)
    aprilLogs.slice(0,5).forEach(l => console.log(' -', l.internId, l.date, l.status))
  } catch(e) {
    console.log('Fetch all FAILED:', e.message.substring(0, 200))
  }
  
  await prisma.$disconnect()
}

main().catch(e => { console.error(e.message); process.exit(1) })

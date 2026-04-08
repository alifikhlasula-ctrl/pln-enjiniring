const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const internId = 'i1775030268590'
  const logs = await prisma.attendanceLog.findMany({
    where: { internId },
    orderBy: { date: 'desc' }
  })
  console.log('Total SQL attendance logs for', internId, ':', logs.length)
  logs.forEach(l => console.log(' -', l.date, l.status))
  
  await prisma.$disconnect()
}

main().catch(e => { console.error(e.message); process.exit(1) })

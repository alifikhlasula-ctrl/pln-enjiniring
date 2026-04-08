const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Check what models are available
  console.log('Prisma models:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')))
  
  // Check attendance for April for this intern
  const internId = 'i1775030268590'
  
  // Try attendanceLog
  try {
    const logs = await prisma.attendanceLog.findMany({
      where: { internId, date: { startsWith: '2026-04' } }
    })
    console.log('April attendance logs (AttendanceLog):', logs.length)
    logs.forEach(l => console.log(' -', l.date, l.status))
  } catch(e) {
    console.log('AttendanceLog error:', e.message.substring(0, 100))
  }
  
  await prisma.$disconnect()
}

main().catch(e => { console.error(e.message); process.exit(1) })

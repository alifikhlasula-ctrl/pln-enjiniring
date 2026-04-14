const { PrismaClient } = require('./lib/generated/client')
const prisma = new PrismaClient()

async function check() {
  const logs = await prisma.attendanceLog.findMany({ take: 5, orderBy: { createdAt: 'desc'} })
  console.log(logs.map(l => ({
    id: l.id,
    faceInBase64Len: l.faceInBase64 ? l.faceInBase64.length : 0,
    faceInBase64Start: l.faceInBase64 ? l.faceInBase64.substring(0, 30) : null
  })))
}
check()

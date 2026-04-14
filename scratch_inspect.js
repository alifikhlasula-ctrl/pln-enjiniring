const { PrismaClient } = require('./lib/generated/client')
const prisma = new PrismaClient()

async function check() {
  const logs = await prisma.attendanceLog.findMany({ take: 5, orderBy: { createdAt: 'desc'} })
  console.log(logs.map(l => ({
    id: l.id,
    internId: l.internId,
    date: l.date,
    faceInUrl: l.faceInUrl,
    hasFaceInBase64: !!l.faceInBase64,
    faceOutUrl: l.faceOutUrl,
    hasFaceOutBase64: !!l.faceOutBase64
  })))
}
check()

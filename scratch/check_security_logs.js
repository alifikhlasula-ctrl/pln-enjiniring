const { PrismaClient } = require('../lib/generated/client')
const prisma = new PrismaClient()

async function main() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  const logs = await prisma.auditLog.findMany({
    where: {
      timestamp: { gte: yesterday }
    },
    orderBy: { timestamp: 'desc' },
    take: 100
  })
  
  console.log(JSON.stringify(logs, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())

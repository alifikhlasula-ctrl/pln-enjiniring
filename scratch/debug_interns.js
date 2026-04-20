const { PrismaClient } = require('./lib/generated/client')
const prisma = new PrismaClient()

async function main() {
  const interns = await prisma.intern.findMany({
    where: {
      OR: [
        { name: { contains: 'Muhammad', mode: 'insensitive' } },
        { name: { contains: 'Randy', mode: 'insensitive' } }
      ]
    },
    select: { name: true, status: true, periodEnd: true }
  })
  console.log(JSON.stringify(interns, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())

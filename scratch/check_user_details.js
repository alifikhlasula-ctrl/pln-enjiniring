const { PrismaClient } = require('../lib/generated/client')
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'fusha@legion.com' }
  })
  console.log(JSON.stringify(user, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())

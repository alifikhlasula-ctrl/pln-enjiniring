const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const mainJson = await prisma.jsonStore.findUnique({ where: { key: 'main' } })
  const archiveJson = await prisma.jsonStore.findUnique({ where: { key: 'archive' } })
  const sqlInterns = await prisma.intern.count()
  
  console.log('Main JSON Interns:', mainJson?.data?.interns?.length)
  console.log('Archive JSON Interns:', archiveJson?.data?.interns?.length)
  console.log('SQL Interns:', sqlInterns)
}

main().catch(console.error).finally(() => prisma.$disconnect())

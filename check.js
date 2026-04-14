const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const reports = await prisma.dailyReport.findMany({ select: { id: true, userId: true }, take: 10 });
  console.log(reports);
}

main().finally(() => prisma.$disconnect());

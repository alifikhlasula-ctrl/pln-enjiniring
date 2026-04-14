const { PrismaClient } = require('./lib/generated/client/index.js');
const prisma = new PrismaClient();

async function test() {
  const sufi = await prisma.intern.findFirst({ where: { name: { contains: 'Sufi' } } });
  if (sufi) {
     const sufiReports = await prisma.dailyReport.findMany({ where: { userId: sufi.userId } });
     const rep = sufiReports.find(r => r.date === '2026-04-09');
     console.log("Report for 2026-04-09:", rep);
  }
}
test().catch(console.error).finally(()=>prisma.$disconnect());

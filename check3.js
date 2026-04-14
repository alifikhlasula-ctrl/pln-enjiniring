const { PrismaClient } = require('./lib/generated/client/index.js');
const prisma = new PrismaClient();

async function test() {
  const reports = await prisma.dailyReport.findMany();
  console.log("Total in Prisma:", reports.length);
  const sufi = await prisma.intern.findFirst({ where: { name: { contains: 'Sufi' } } });
  console.log("Sufi:", sufi?.userId)

  if (sufi) {
     const sufiReports = reports.filter(r => r.userId === sufi.userId);
     console.log("Sufi Reports in Prisma:", sufiReports.length);
     console.log(sufiReports.map(r => r.id));
  }
}
test().catch(console.error).finally(()=>prisma.$disconnect());

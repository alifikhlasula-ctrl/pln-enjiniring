const { prisma } = require('./lib/prisma');

async function test() {
  const reports = await prisma.dailyReport.findMany({
    orderBy: { date: 'desc' }
  });
  console.log("Total in Prisma:", reports.length);
  const sufi = await prisma.intern.findFirst({ where: { name: { contains: 'Sufi' } } });
  console.log("Sufi:", sufi?.userId)

  if (sufi) {
     const sufiReports = reports.filter(r => r.userId === sufi.userId);
     console.log("Sufi Reports in Prisma:", sufiReports.length);
     console.log(sufiReports.map(r => r.id));
  }
}
test().catch(console.error).finally(()=>process.exit(0));

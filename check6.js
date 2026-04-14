const { PrismaClient } = require('./lib/generated/client/index.js');
const prisma = new PrismaClient();
const fs = require('fs');

async function test() {
  const sufi = await prisma.intern.findFirst({ where: { name: { contains: 'Sufi' } } });
  if (sufi) {
     const sufiReports = await prisma.dailyReport.findMany({ where: { userId: sufi.userId } });
     console.log("ALL Prisma Reports for Sufi:", sufiReports.map(r => ({ id: r.id, date: r.date, status: r.status })));
  }

  const legacyData = JSON.parse(fs.readFileSync('./database.json', 'utf8'));
  const sufiLegacy = legacyData.users.find(u => u.name.includes('Sufi'));
  if (sufiLegacy) {
    const sufiLegacyReports = legacyData.reports.filter(r => r.userId === sufiLegacy.id);
    console.log("ALL Legacy Reports for Sufi:", sufiLegacyReports.map(r => ({ id: r.id, date: r.date || r.reportDate, status: r.status })));
  }
}
test().catch(console.error).finally(()=>prisma.$disconnect());

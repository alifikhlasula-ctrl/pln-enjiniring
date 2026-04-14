const { PrismaClient } = require('./lib/generated/client/index.js');
const prisma = new PrismaClient();
const fs = require('fs');

async function checkStatuses() {
  const prismaStatuses = await prisma.intern.findMany({ select: { status: true } });
  const uniquePrisma = [...new Set(prismaStatuses.map(i => i.status))];
  console.log("Unique Prisma Intern Statuses:", uniquePrisma);

  const legacyData = JSON.parse(fs.readFileSync('./database.json', 'utf8'));
  const uniqueLegacy = [...new Set((legacyData.interns || []).map(i => i.status))];
  console.log("Unique Legacy Intern Statuses:", uniqueLegacy);
}
checkStatuses().catch(console.error).finally(()=>prisma.$disconnect());

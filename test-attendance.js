const { PrismaClient } = require('./lib/generated/client');
const prisma = new PrismaClient();
async function test() {
  const thirtyDaysAgoStr = '2026-03-31';
  const todayWib = '2026-04-30';
  const logs = await prisma.attendanceLog.findMany({
    where: { date: { gte: thirtyDaysAgoStr, lte: todayWib } },
    select: { date: true, status: true }
  });
  console.log('Count:', logs.length);
  if (logs.length > 0) console.log('Sample:', logs[0]);
  
  const allLogs = await prisma.attendanceLog.findMany({ select: { date: true, status: true } });
  console.log('All Logs count:', allLogs.length);
}
test().catch(console.error).finally(() => prisma.$disconnect());

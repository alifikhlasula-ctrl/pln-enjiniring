import { PrismaClient } from './lib/generated/client/index.js';

const prisma = new PrismaClient();

function getEffectiveStatusOnDate(intern, dateStr) {
  const target = new Date(dateStr + 'T00:00:00Z')
  if (intern.deletedAt) {
    const deletedDate = new Date(intern.deletedAt)
    if (deletedDate < target) return 'TERMINATED'
  }
  const s = String(intern.status || 'ACTIVE').toUpperCase()
  if (s === 'TERMINATED') return 'TERMINATED'
  if (s === 'ACTIVE' || s === 'PENDING') {
    if (intern.periodStart) {
      const start = new Date(intern.periodStart + 'T00:00:00Z')
      if (start > target) return 'PENDING'
    }
    if (intern.periodEnd && intern.periodEnd < dateStr) return 'COMPLETED'
  }
  if (s === 'PENDING') return 'PENDING'
  return s
}

async function test() {
  const today = '2026-04-17';
  
  const logs = await prisma.attendanceLog.findMany({ where: { date: today } });
  
  const prismaInterns = await prisma.intern.findMany({
    select: {
      id: true, name: true, bidang: true, university: true,
      userId: true, facePhotoUrl: true, email: true, status: true,
      periodStart: true, periodEnd: true, deletedAt: true
    }
  });

  const internMap = new Map();
  prismaInterns.forEach(i => internMap.set(i.id, {
    ...i, bidang: i.bidang || '-', university: i.university || '-'
  }));

  const rawInterns = Array.from(internMap.values());
  const allInterns = rawInterns.map(i => ({
    ...i,
    effectiveStatus: getEffectiveStatusOnDate(i, today)
  }));

  allInterns.forEach(i => internMap.set(i.id, i));

  const serializeLog = (log, intern) => ({
    id:          log.id,
    internId:    log.internId,
    internName:  intern ? intern.name : `Intern (${log.internId.slice(0, 8)})`
  });

  const todayLogEntries  = logs.map(l => serializeLog(l, internMap.get(l.internId)));
  
  const arikLog = todayLogEntries.find(l => l.internId.includes('1775800'));
  console.log('Arik Log output:', arikLog);
}

test().catch(console.error).finally(() => prisma.$disconnect());

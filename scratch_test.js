import { PrismaClient } from './lib/generated/client/index.js';
import { getDB } from './lib/db.js';

const prisma = new PrismaClient();

async function test() {
  const [activeDB, archiveDB] = await Promise.all([
    getDB('ACTIVE'),
    getDB('ARCHIVE')
  ]);
  const legacyInterns = [
    ...(activeDB.interns || []),
    ...(archiveDB.interns || [])
  ];

  const prismaInterns = await prisma.intern.findMany({
    select: { id: true, name: true, userId: true }
  });

  const internMap = new Map();
  legacyInterns.forEach(i => internMap.set(i.id, i));
  prismaInterns.forEach(i => internMap.set(i.id, i));

  const idToFind = 'i1776842'; // Just an example, let's see if we can find Priyo's ID.
  // Actually, we can just find any intern matching "Priyo"
  const priyoLegacy = legacyInterns.find(i => i.name && i.name.includes('Priyo')) || legacyInterns.find(i => i.id.includes('i1776842'));
  const priyoPrisma = prismaInterns.find(i => i.name && i.name.includes('Priyo'));
  
  console.log('Priyo Legacy:', priyoLegacy);
  console.log('Priyo Prisma:', priyoPrisma);
  
  // Find all logs for Priyo
  const logs = await prisma.attendanceLog.findMany({
    where: { internId: { contains: '177' } }
  });
  
  console.log('Logs found for i177:', logs.length);
  if (logs.length > 0) {
    console.log('Sample Log internId:', logs[0].internId);
    console.log('Does this internId exist in internMap?', internMap.has(logs[0].internId));
  }
}

test().catch(console.error).finally(() => prisma.$disconnect());

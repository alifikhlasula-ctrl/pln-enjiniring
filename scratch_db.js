const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.attendanceLog.findMany({
    where: { internId: { startsWith: 'i177' } }
  });
  console.log('Logs with i177:', logs.length);
  if (logs.length > 0) {
    console.log('Sample internId:', logs[0].internId);
    console.log('Sample name:', logs[0].name);
  }
  
  const interns = await prisma.intern.findMany({
    where: { id: { startsWith: 'i177' } }
  });
  console.log('Interns with i177:', interns.length);
  if (interns.length > 0) {
    console.log('Sample Intern ID:', interns[0].id);
  }
  
  const users = await prisma.user.findMany({
    where: { id: { startsWith: 'i177' } }
  });
  console.log('Users with i177:', users.length);
  
  // also check if any legacy interns match
  const db = require('./lib/db');
  const legacy = await db.getDB();
  const legacyMatch = legacy.interns.filter(i => i.id.startsWith('i177'));
  console.log('Legacy Interns with i177:', legacyMatch.length);
}

main().finally(() => prisma.$disconnect());

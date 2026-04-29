import { PrismaClient } from './lib/generated/client/index.js';

const prisma = new PrismaClient();
async function test() {
  const priyo = await prisma.intern.findMany({ where: { name: { contains: 'Priyo' } } });
  console.log('Priyo in Prisma Interns:', priyo);

  const id6842 = await prisma.intern.findMany({ where: { id: { contains: '1776842' } } });
  console.log('ID 6842 in Prisma Interns:', id6842);

  const id5800 = await prisma.intern.findMany({ where: { id: { contains: '1775800' } } });
  console.log('ID 5800 in Prisma Interns:', id5800);

  const logs5800 = await prisma.attendanceLog.findMany({ where: { internId: { contains: '1775800' } } });
  console.log('Logs for 5800:', logs5800.length);

  const userPriyo = await prisma.user.findMany({ where: { name: { contains: 'Priyo' } } });
  console.log('Priyo in User table:', userPriyo);

  const user5800 = await prisma.user.findMany({ where: { id: { contains: '1775800' } } });
  console.log('ID 5800 in User table:', user5800);

  // Check logs on 17 April 2026
  const logs17 = await prisma.attendanceLog.findMany({ where: { date: '2026-04-17' } });
  console.log('Logs on 17 April 2026:', logs17.map(l => l.internId));
}
test().catch(console.error).finally(() => prisma.$disconnect());

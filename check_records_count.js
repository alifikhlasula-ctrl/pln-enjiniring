import { PrismaClient } from './lib/generated/client/index.js';
const prisma = new PrismaClient();

async function test() {
  const logCount = await prisma.attendanceLog.count();
  const reportCount = await prisma.dailyReport.count();
  const payrollCount = await prisma.payrollRecord.count();
  const correctionCount = await prisma.attendanceCorrection.count();
  
  console.log('--- PRISMA DB STATS ---');
  console.log('Attendance Logs:', logCount);
  console.log('Daily Reports:', reportCount);
  console.log('Payroll Records:', payrollCount);
  console.log('Attendance Corrections:', correctionCount);
}

test().finally(() => prisma.$disconnect());

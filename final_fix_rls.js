require('dotenv').config();
const { PrismaClient } = require('./lib/generated/client');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function runFix() {
  const sqls = [
    'ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "Intern" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "PayrollRecord" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "Onboarding" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "Evaluation" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "EvaluationCriteria" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "Survey" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "SurveyResponse" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "Announcement" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "HrTask" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "DailyReport" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "AttendanceLog" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "AttendanceCorrection" ENABLE ROW LEVEL SECURITY;'
  ];

  console.log('--- Securing Database Tables (RLS) ---');
  for (const sql of sqls) {
    const tableName = sql.match(/"([^"]+)"/)[1];
    process.stdout.write(`Securing ${tableName}... `);
    try {
      await prisma.$executeRawUnsafe(sql);
      process.stdout.write('DONE ✅\n');
    } catch (e) {
      process.stdout.write('FAILED ❌\n');
      console.error(`   Error: ${e.message}`);
    }
  }

  // JsonStore is separate because it might timeout
  process.stdout.write('Securing JsonStore (Hot Table)... ');
  try {
     // Set a specific timeout for this if possible, or just try
     await prisma.$executeRawUnsafe('ALTER TABLE "JsonStore" ENABLE ROW LEVEL SECURITY;');
     process.stdout.write('DONE ✅\n');
  } catch (e) {
     process.stdout.write('TIMEOUT/FAILED ❌\n');
     console.error('   JsonStore might be locked by active sessions.');
  }

  await prisma.$disconnect();
}

runFix().catch(console.error);

require('dotenv').config();
const { PrismaClient } = require('./lib/generated/client');

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  const tables = [
    'JsonStore',
    'User',
    'Intern',
    'AuditLog',
    'Onboarding',
    'Evaluation',
    'EvaluationCriteria',
    'PayrollRecord',
    'Survey',
    'SurveyResponse',
    'Announcement',
    'Event',
    'HrTask',
    'DailyReport',
    'AttendanceLog',
    'AttendanceCorrection'
  ];

  console.log('--- Starting RLS enforcement ---');
  for (const table of tables) {
    process.stdout.write(`Enabling RLS on "${table}"... `);
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      process.stdout.write('SUCCESS\n');
    } catch (error) {
      process.stdout.write(`FAILED\n`);
      console.error(`   Error details: ${error.message}`);
    }
  }

  console.log('--- RLS enforcement completed ---');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Fatal error during RLS enforcement:', err);
  process.exit(1);
});

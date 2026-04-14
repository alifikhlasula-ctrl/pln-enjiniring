const { PrismaClient } = require('./lib/generated/client');
const prisma = new PrismaClient();

async function main() {
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

  for (const table of tables) {
    console.log(`Enabling RLS on ${table}...`);
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`✅ RLS enabled for ${table}`);
    } catch (e) {
      console.log(`❌ Error enabling RLS for ${table}:`, e.message);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

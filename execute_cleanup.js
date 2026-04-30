// ============================================================
// PHASE 0: BACKUP (rollback safety net)
// ============================================================
import fs from 'fs';
import path from 'path';
import { PrismaClient } from './lib/generated/client/index.js';

const prisma = new PrismaClient();

// ---- ROLLBACK-SAFE TARGET LIST ----
const KEEP_NAMES = [
  'Ni Luh Ade Sinta Dewi', 'Ahmad Nabilsyah Ritonga', 'AMELIA PUTRI NATASSYA',
  'Reviana Junita Putri', 'Vanessa Sauqila Olivian', 'Sufi Widyarini',
  'Zunur Evita Saputri', 'Kanaya Fellicita Perdana', 'Mahira Dinda Putri Anggrianto',
  'Rafael Diel Nakamaya Lande', 'M. Joelyandro Revansyah', 'Radja Faridza Widiansyaputra',
  'Dzakiyyah Harum Mahardani', 'Fahru Isnawijaya Kusuma', 'Rakan Daris Falah',
  'Mareta Dwi Lestari', 'Priatama Zaky Al Fathoni', 'Renata Meisa Brillianti',
  'Eka Nova Setiawan', 'Fusha', 'Shifa Khoirunnisa', 'Kyla Gibran Ahmad',
  'Ammar Nadhif Wicaksono', 'Ahmad Faiz Birqi', 'Muhammad Abdu Ar Rafi',
  'Yoga Alif Sasmita', 'Salsabila', 'Firda Nur Apriani', 'Roghib Albi Panggar Besi',
  'Nayla Aimee Taradiva', 'Arik Azel Syahputra', 'Dhila Mahira', 'Raihan Giga Bajurah',
  'Ayu May Diana', 'Priyo Athallah Mahardika', 'Mutia Aqila Fazilatunnisa',
  'Fayza Alivia Khairunnisa', 'Muhammad Fauzan Haqiqi', 'Wisnu Santoso',
  'Muhammad Calvin Pasya', 'Joy Mega Nika Purba', 'Hana Aisyah Shabrina',
  'R GHIFFARI M AFFAN SYAWAL', 'Muhammad Al Farezi Widian', 'Muhammad Ghiyats Aghniyal Fawaz',
  'Muhammad Ahsantal Haqqo', 'Ibnu Masyhur Al Fathani', 'Randy Arya Dwi Permana',
  'Muhammad Danu Nofiandi', 'Naila Balqis Quraniq', 'Riyan Wahyu Setiawan'
];

const normalize = (str) => (str || '').toLowerCase().trim();

async function phase0_backup() {
  console.log('\n========== PHASE 0: BACKUP ==========');

  // 1. Backup database.json
  const src = 'database.json';
  const bak = `database.backup.${Date.now()}.json`;
  fs.copyFileSync(src, bak);
  console.log(`✅ Backup JSON created: ${bak}`);

  // 2. Snapshot all Prisma intern IDs to a rollback log
  const allInterns = await prisma.intern.findMany({ select: { id: true, name: true, status: true, userId: true } });
  const rollbackLog = {
    timestamp: new Date().toISOString(),
    backupFile: bak,
    totalBefore: allInterns.length,
    interns: allInterns
  };
  fs.writeFileSync('rollback_log.json', JSON.stringify(rollbackLog, null, 2));
  console.log(`✅ Rollback log created: rollback_log.json (${allInterns.length} interns snapshotted)`);
  return { backupFile: bak, allInterns };
}

async function phase1_identify() {
  console.log('\n========== PHASE 1: IDENTIFY ==========');
  const allInterns = await prisma.intern.findMany({ select: { id: true, name: true, userId: true } });

  const keepIds = new Set();
  const keepUserIds = new Set();

  allInterns.forEach(intern => {
    const match = KEEP_NAMES.some(n => normalize(intern.name) === normalize(n));
    if (match) {
      keepIds.add(intern.id);
      if (intern.userId) keepUserIds.add(intern.userId);
    }
  });

  const deleteInterns = allInterns.filter(i => !keepIds.has(i.id));
  const deleteUserIds = allInterns.filter(i => !keepIds.has(i.id) && i.userId).map(i => i.userId);

  // Also protect Admin HR users
  const allUsers = await prisma.user.findMany({ where: { role: { not: 'INTERN' } }, select: { id: true } });
  const adminIds = new Set(allUsers.map(u => u.id));

  const finalDeleteUserIds = deleteUserIds.filter(uid => !adminIds.has(uid));

  console.log(`✅ Interns to KEEP: ${keepIds.size}`);
  console.log(`⚠️  Interns to DELETE: ${deleteInterns.length}`);
  console.log(`⚠️  User accounts to DELETE: ${finalDeleteUserIds.length}`);

  return { keepIds, deleteInterns, finalDeleteUserIds };
}

async function phase2_cleanPrisma(keepIds, deleteInterns, finalDeleteUserIds) {
  console.log('\n========== PHASE 2: CLEAN PRISMA ==========');

  if (deleteInterns.length === 0) {
    console.log('Nothing to delete in Prisma.');
    return;
  }

  const deleteInternIds = deleteInterns.map(i => i.id);

  // Delete intern records (not attendance/reports - those belong to valid IDs)
  const deletedInterns = await prisma.intern.deleteMany({ where: { id: { in: deleteInternIds } } });
  console.log(`✅ Deleted ${deletedInterns.count} intern records from Prisma`);

  // Delete user accounts for those interns (INTERN role only)
  if (finalDeleteUserIds.length > 0) {
    const deletedUsers = await prisma.user.deleteMany({ where: { id: { in: finalDeleteUserIds }, role: 'INTERN' } });
    console.log(`✅ Deleted ${deletedUsers.count} user accounts from Prisma`);
  }
}

async function phase3_cleanJSON(keepIds) {
  console.log('\n========== PHASE 3: CLEAN JSON ==========');
  const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));
  const beforeInterns = (db.interns || []).length;
  const beforeUsers = (db.users || []).length;

  // Get the names we're keeping (from Prisma, now clean)
  db.interns = (db.interns || []).filter(i => KEEP_NAMES.some(n => normalize(i.name) === normalize(n)));
  const keptJsonUserIds = new Set((db.interns || []).map(i => i.userId).filter(Boolean));

  // Keep admin/HR users + users linked to kept interns
  db.users = (db.users || []).filter(u => {
    if (!u.role || u.role !== 'INTERN') return true; // keep admins
    return keptJsonUserIds.has(u.id);
  });

  fs.writeFileSync('database.json', JSON.stringify(db, null, 2));
  console.log(`✅ JSON Interns: ${beforeInterns} → ${db.interns.length}`);
  console.log(`✅ JSON Users: ${beforeUsers} → ${db.users.length}`);
}

async function phase4_verify() {
  console.log('\n========== PHASE 4: VERIFY ==========');
  const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));

  const prismaInterns = await prisma.intern.count();
  const prismaLogs = await prisma.attendanceLog.count();
  const prismaReports = await prisma.dailyReport.count();
  const prismaPayroll = await prisma.payrollRecord.count();

  console.log('--- PostgreSQL (Prisma) ---');
  console.log(`Interns Remaining: ${prismaInterns}`);
  console.log(`Attendance Logs: ${prismaLogs} (MUST match pre-cleanup)`);
  console.log(`Daily Reports: ${prismaReports} (MUST match pre-cleanup)`);
  console.log(`Payroll Records: ${prismaPayroll} (MUST match pre-cleanup)`);
  console.log('\n--- JSON (database.json) ---');
  console.log(`Interns in JSON: ${(db.interns || []).length}`);
  console.log(`Users in JSON: ${(db.users || []).length}`);
  console.log('\n✅ Verification complete. Review the numbers above before pushing.');
}

async function main() {
  try {
    const { backupFile, allInterns } = await phase0_backup();
    const { keepIds, deleteInterns, finalDeleteUserIds } = await phase1_identify();
    await phase2_cleanPrisma(keepIds, deleteInterns, finalDeleteUserIds);
    await phase3_cleanJSON(keepIds);
    await phase4_verify();
    console.log('\n✅ ALL PHASES COMPLETE. Ready to push to GitHub.');
  } catch (err) {
    console.error('\n❌ ERROR DURING CLEANUP:', err.message);
    console.error('→ ROLLBACK: Restore database.json from database.backup.*.json');
    console.error('→ ROLLBACK: Check rollback_log.json for full Prisma snapshot');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

import { PrismaClient } from './lib/generated/client/index.js';
const prisma = new PrismaClient();

const userNames = [
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

async function simulate() {
  const interns = await prisma.intern.findMany({
    where: {
      OR: userNames.map(name => ({ name: { contains: name.trim(), mode: 'insensitive' } }))
    },
    select: { id: true, userId: true, name: true, status: true }
  });

  const report = [];
  let totalLogs = 0;
  let totalReports = 0;
  let totalPayroll = 0;

  for (const intern of interns) {
    const logs = await prisma.attendanceLog.count({ where: { internId: intern.id } });
    const reports = await prisma.dailyReport.count({ where: { userId: intern.userId } });
    const payrolls = await prisma.payrollRecord.count({ where: { internId: intern.id } });

    report.push({
      name: intern.name,
      status: intern.status,
      logs,
      reports,
      payrolls
    });

    totalLogs += logs;
    totalReports += reports;
    totalPayroll += payrolls;
  }

  console.log('--- SIMULATION REPORT: 51 INTERNS DATA READINESS ---');
  console.log('Total Interns Identified:', interns.length);
  console.log('Total Attendance Logs to Keep:', totalLogs);
  console.log('Total Daily Reports to Keep:', totalReports);
  console.log('Total Payroll Records to Keep:', totalPayroll);
  console.log('\nSample Detail (Top 10):');
  console.table(report.slice(0, 10));
  
  if (interns.length < 51) {
    const foundNames = interns.map(i => i.name.toLowerCase().trim());
    const missing = userNames.filter(n => !foundNames.some(fn => fn.includes(n.toLowerCase().trim())));
    console.log('\nWarning: Some names might have slightly different spellings in DB:', missing);
  }
}

simulate().finally(() => prisma.$disconnect());

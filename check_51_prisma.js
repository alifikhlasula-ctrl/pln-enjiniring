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

async function test() {
  const interns = await prisma.intern.findMany({
    select: { id: true, name: true, status: true, periodEnd: true }
  });
  
  const found = [];
  const notFound = [];
  
  userNames.forEach(name => {
    const match = interns.find(i => i.name && i.name.toLowerCase().trim() === name.toLowerCase().trim());
    if (match) {
      found.push({ name, status: match.status });
    } else {
      notFound.push(name);
    }
  });
  
  console.log('Total Found:', found.length);
  console.log('Total Not Found:', notFound.length);
  if (notFound.length > 0) {
    console.log('Not Found List:', notFound);
  }
  
  const statusCounts = {};
  found.forEach(f => {
    statusCounts[f.status] = (statusCounts[f.status] || 0) + 1;
  });
  console.log('Status Counts:', statusCounts);
}

test().finally(() => prisma.$disconnect());

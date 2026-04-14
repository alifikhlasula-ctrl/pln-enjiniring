const { PrismaClient } = require('./lib/generated/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function findInterns() {
  const names = [
    'Randy Arya Dwi Permana',
    'Muhammad Al Farezi Widian',
    'Muhammad Ghiyats Aghniyal Fawaz',
    'Muhammad Ahsantal Haqqo'
  ];

  console.log('--- Searching in Prisma ---');
  for (const name of names) {
    const results = await prisma.intern.findMany({
      where: { name: { contains: name, mode: 'insensitive' } }
    });
    results.forEach(r => console.log(`[PRISMA] Found: ${r.name} (id: ${r.id}, status: ${r.status})`));
  }

  console.log('\n--- Searching in Legacy JSON ---');
  const dbPath = path.join(process.cwd(), 'database.json');
  if (fs.existsSync(dbPath)) {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const interns = db.interns || [];
    for (const name of names) {
      const results = interns.filter(i => i.name.toLowerCase().includes(name.toLowerCase()));
      results.forEach(r => console.log(`[JSON] Found: ${r.name} (id: ${r.id}, status: ${r.status})`));
    }
  }

  await prisma.$disconnect();
}

findInterns().catch(console.error);

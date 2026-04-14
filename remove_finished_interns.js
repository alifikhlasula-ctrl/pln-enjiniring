const { PrismaClient } = require('./lib/generated/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function updateInterns() {
  const ids = [
    'i1774853424684',
    'i1774853424697',
    'i1774853424698',
    'i1774853424699'
  ];

  console.log('--- Updating Prisma ---');
  for (const id of ids) {
    try {
      const updated = await prisma.intern.update({
        where: { id },
        data: { status: 'COMPLETED' }
      });
      console.log(`[PRISMA] Updated: ${updated.name} (status: ${updated.status})`);
    } catch (e) {
      console.log(`[PRISMA] Error updating ${id}:`, e.message);
    }
  }

  console.log('\n--- Updating Legacy JSON ---');
  const dbPath = path.join(process.cwd(), 'database.json');
  if (fs.existsSync(dbPath)) {
    const content = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(content);
    let count = 0;
    if (db.interns) {
      db.interns = db.interns.map(i => {
        if (ids.includes(i.id)) {
          console.log(`[JSON] Updating: ${i.name}`);
          count++;
          return { ...i, status: 'COMPLETED' };
        }
        return i;
      });
    }
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log(`[JSON] Successfully updated ${count} records.`);
  }

  await prisma.$disconnect();
}

updateInterns().catch(console.error);

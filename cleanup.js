const fs = require('fs');
const { PrismaClient } = require('./lib/generated/client');

async function main() {
  const envFile = fs.readFileSync('.env', 'utf8');
  const m = envFile.match(/DIRECT_URL='([^']+)'/) || envFile.match(/DIRECT_URL="([^"]+)"/);
  if (m) process.env.DIRECT_URL = m[1];

  const p = new PrismaClient();
  const dbRecord = await p.jsonStore.findUnique({ where: { key: 'main' } });
  
  const data = dbRecord.data;

  // Revert the 36 duplicates I accidentally created. They all have university: "Kantor Pusat" 
  // and were created with a timestamp in their ID.
  const initialInternsCount = data.interns.length;
  
  // Actually, I can just filter out any interns that have university === 'Kantor Pusat' AND fromImport === 'EXCEL_BATCH' AND duration === '6 Bulan'
  // Let's make sure it's EXACTLY the ones from my mistake.
  data.interns = data.interns.filter(i => {
    if (i.university === 'Kantor Pusat' && i.fromImport === 'EXCEL_BATCH' && i.periodStart === '2026-01-01' && i.duration === '6 Bulan' && i.nim_nis.startsWith('PLNE-')) {
      // Also delete the matching user!
      data.users = data.users.filter(u => u.id !== i.userId);
      return false; // Remove this intern
    }
    return true;
  });

  const removedCount = initialInternsCount - data.interns.length;

  await p.jsonStore.update({
    where: { key: 'main' },
    data: { data }
  });

  console.log(`Cleaned up ${removedCount} duplicate interns accidentally created.`);
  await p.$disconnect();
}
main().catch(console.error);

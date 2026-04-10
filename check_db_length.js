const fs = require('fs');
const { PrismaClient } = require('./lib/generated/client');

async function main() {
  const envFile = fs.readFileSync('.env', 'utf8');
  const m = envFile.match(/DIRECT_URL='([^']+)'/) || envFile.match(/DIRECT_URL="([^"]+)"/);
  if (m) process.env.DIRECT_URL = m[1];

  const p = new PrismaClient();
  const dbRecord = await p.jsonStore.findUnique({ where: { key: 'main' } });
  
  const interns = dbRecord.data.interns || [];
  console.log("Total Interns:", interns.length);
  
  // Look for the ones we added (NIM starts with PLNE)
  const plneInterns = interns.filter(i => i.nim_nis && i.nim_nis.startsWith('PLNE'));
  console.log("PLNE Interns:", plneInterns.length);
  
  await p.$disconnect();
}
main();

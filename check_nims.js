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
  console.log("Sample Interns:", interns.slice(0, 10).map(i => ({name: i.name, nim: i.nim_nis})));
  
  await p.$disconnect();
}
main();

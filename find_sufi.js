const { PrismaClient } = require('./lib/generated/client');
const fs = require('fs');

async function main() {
  const envFile = fs.readFileSync('.env', 'utf8');
  const m = envFile.match(/DIRECT_URL='([^']+)'/) || envFile.match(/DIRECT_URL="([^"]+)"/);
  if (m) process.env.DIRECT_URL = m[1];
  
  const p = new PrismaClient();
  try {
    const mainRec = await p.jsonStore.findUnique({ where: { key: 'main' } });
    const arcRec = await p.jsonStore.findUnique({ where: { key: 'archive' } });
    
    // Find missing Sufi
    const sufiMain = mainRec.data.interns.filter(i => /sufi/i.test(i.name || ''));
    const sufiArc = arcRec.data.interns.filter(i => /sufi/i.test(i.name || ''));
    
    console.log('Sufi in Main:', sufiMain.map(i => i.name));
    console.log('Sufi in Archive:', sufiArc.map(i => i.name));
    
  } catch (e) {
    console.error(e);
  } finally {
    await p.$disconnect();
  }
}
main();

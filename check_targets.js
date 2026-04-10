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
    
    const targetNames = [
      'Shifa Khoirunnisa',
      'Sufi Widyarini',
      'Kyla Gibran Ahmad',
      'Ammar Nadhif Wicaksono',
      'Salsabila',
      'Muhammad Abdu Ar Rafi'
    ].map(n => n.toLowerCase());

    const foundInMain = mainRec.data.interns.filter(i => targetNames.includes((i.name || '').toLowerCase()));
    const foundInArc = arcRec.data.interns.filter(i => targetNames.includes((i.name || '').toLowerCase()));

    console.log('Found in MAIN:');
    foundInMain.forEach(i => console.log(' - ' + i.name));

    console.log('Found in ARCHIVE:');
    foundInArc.forEach(i => console.log(' - ' + i.name));
  } catch (e) {
    console.error(e);
  } finally {
    await p.$disconnect();
  }
}
main();

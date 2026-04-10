const { PrismaClient } = require('./lib/generated/client');
const fs = require('fs');

async function main() {
  const envFile = fs.readFileSync('.env', 'utf8');
  const m = envFile.match(/DIRECT_URL='([^']+)'/) || envFile.match(/DIRECT_URL="([^"]+)"/);
  if (m) process.env.DIRECT_URL = m[1];

  const p = new PrismaClient();
  try {
    const rec = await p.jsonStore.findUnique({ where: { key: 'main' } });
    if (!rec) return console.log('No main record');

    const users = (rec.data && rec.data.users) || [];
    const avatars = users
      .filter(u => u.image && u.image.startsWith('data:'))
      .map(u => ({
        name: u.name,
        email: u.email,
        sizeKB: Math.round(u.image.length / 1024)
      }));

    console.log('--- Avatar Report ---');
    console.log('Count:', avatars.length);
    if (avatars.length > 0) {
      console.table(avatars);
      const totalSize = avatars.reduce((acc, curr) => acc + curr.sizeKB, 0);
      console.log('Total Size:', (totalSize / 1024).toFixed(2), 'MB');
    } else {
      console.log('No Base64 avatars found in main datastore.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await p.$disconnect();
  }
}

main();

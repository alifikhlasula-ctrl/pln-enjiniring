const { PrismaClient } = require('./lib/generated/client');
const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf8');
const match = envFile.match(/DIRECT_URL="([^"]+)"/);
if (match) process.env.DIRECT_URL = match[1];

async function main() {
  const p = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
  try {
    const t0 = Date.now();
    const record = await p.jsonStore.findUnique({ where: { key: 'main' } });
    const elapsed = Date.now() - t0;
    const str = JSON.stringify(record.data);
    console.log(`Fetch took ${elapsed}ms`);
    console.log(`JSON size: ${(str.length / 1024 / 1024).toFixed(2)} MB`);
  } catch(e) {
    console.error(e);
  } finally {
    await p.$disconnect();
  }
}
main();

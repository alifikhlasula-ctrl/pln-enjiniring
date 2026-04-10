const { PrismaClient } = require('./lib/generated/client');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const match = envFile.match(/DIRECT_URL="([^"]+)"/);
if (match) process.env.DIRECT_URL = match[1];

async function main() {
  const p = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
  try {
    const record = await p.jsonStore.findUnique({ where: { key: 'main' } });
    if (!record) return console.log('No record found');
    const d = record.data;
    console.log('--- ADMIN HR ACCOUNTS ---');
    console.log(d.users.filter(u => u.role === 'ADMIN_HR').map(u => ({ id: u.id, email: u.email })));
    console.log('\n--- INTERN COUNT ---');
    console.log('Total interns:', d.interns.filter(i => !i.deletedAt).length);
    console.log('Interns by User (if linked? NO, Interns are global).');
  } catch(e) {
    console.error(e);
  } finally {
    await p.$disconnect();
  }
}
main();

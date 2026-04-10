const { PrismaClient } = require('./lib/generated/client');
require('dotenv').config();

async function main() {
  const p = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
  try {
    const res = await p.$executeRawUnsafe(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid != pg_backend_pid() AND state in ('idle', 'idle in transaction');`);
    console.log('Killed connections:', res);
  } catch (e) {
    console.error('Error killing connections:', e);
  } finally {
    await p.$disconnect();
  }
}

main();

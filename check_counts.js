const { PrismaClient } = require('./lib/generated/client');
async function main() {
  const p = new PrismaClient();
  const iCount = await p.intern.count();
  const lCount = await p.auditLog.count();
  console.log('Intern Table Count:', iCount);
  console.log('AuditLog Table Count:', lCount);
  await p.$disconnect();
}
main().catch(err => { console.error(err); process.exit(1); });

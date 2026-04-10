const { PrismaClient } = require('./lib/generated/client');

async function main() {
  const p = new PrismaClient();
  const d = await p.jsonStore.findUnique({ where: { key: 'main' } });
  
  console.log('Total interns:', d.data.interns.length);
  console.log('Total users:', d.data.users.length);

  const roghibFoundInUsers = d.data.users.find(u => u.name.includes('Roghib'));
  console.log('Found Roghib literally in users array?', !!roghibFoundInUsers);
  if (roghibFoundInUsers) console.log(roghibFoundInUsers);

  // Check their role
  console.log('Roles distribution:', d.data.users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {}));

  await p.$disconnect();
}
main().catch(console.error);

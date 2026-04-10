const { PrismaClient } = require('./lib/generated/client');

async function main() {
  const p = new PrismaClient();
  const dbRecord = await p.jsonStore.findUnique({ where: { key: 'main' } });
  
  const data = dbRecord.data;
  
  const roghib = data.interns.find(i => i.name.includes('Roghib'));
  console.log('Roghib userId:', roghib.userId);
  console.log('Roghib ID:', roghib.id);
  
  const user = data.users.find(u => u.id === roghib.userId);
  console.log('User Exists:', !!user);
  if(user) console.log('User details:', user);

  await p.$disconnect();
}
main().catch(console.error);

const { PrismaClient } = require('./lib/generated/client');
const fs = require('fs');

async function main() {
  const p = new PrismaClient();
  const dbRecord = await p.jsonStore.findUnique({ where: { key: 'main' } });
  let data = dbRecord.data;

  // Manually ensure R Ghiffari and Roghib are added to users if missing
  const rGhiffari = data.interns.find(i => i.name.includes('R Ghiffari'));
  const roghib = data.interns.find(i => i.name.includes('Roghib'));

  let added = 0;
  if (roghib && !data.users.find(u => u.id === roghib.userId)) {
    data.users.push({
      id: roghib.userId,
      email: 'roghibalbi.2040@intern.plne.co.id',
      password: 'password123',
      name: roghib.name,
      role: 'INTERN'
    });
    added++;
  }
  if (rGhiffari && !data.users.find(u => u.id === rGhiffari.userId)) {
    data.users.push({
      id: rGhiffari.userId,
      email: 'rghiffarim.0338@intern.plne.co.id',
      password: 'password123',
      name: rGhiffari.name,
      role: 'INTERN'
    });
    added++;
  }

  if (added > 0) {
    const freshDbRecord = await p.jsonStore.update({
      where: { key: 'main' },
      data: { data }
    });
    console.log("Updated rows. Fresh DB has users count:", freshDbRecord.data.users.length);
  } else {
    console.log("No missing users found. They are already there.");
  }

  await p.$disconnect();
}
main().catch(console.error);

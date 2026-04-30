const { PrismaClient } = require('./lib/generated/client');
const prisma = new PrismaClient();

async function main() {
  const res = await prisma.intern.updateMany({
    where: { gender: { equals: 'Laki-Laki' } },
    data: { gender: 'Laki-laki' }
  });
  console.log('Updated Laki-Laki:', res.count);

  const res2 = await prisma.intern.updateMany({
    where: { gender: { equals: 'perempuan', mode: 'insensitive' }, NOT: { gender: 'Perempuan' } },
    data: { gender: 'Perempuan' }
  });
  console.log('Updated perempuan:', res2.count);

  const res3 = await prisma.intern.updateMany({
    where: { gender: { equals: 'laki-laki', mode: 'insensitive' }, NOT: { gender: 'Laki-laki' } },
    data: { gender: 'Laki-laki' }
  });
  console.log('Updated laki-laki (other casing):', res3.count);
}

main().finally(() => prisma.$disconnect());

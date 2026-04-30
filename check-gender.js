const { PrismaClient } = require('./lib/generated/client');
const prisma = new PrismaClient();

async function main() {
  const interns = await prisma.intern.findMany({
    select: { gender: true },
    where: { deletedAt: null }
  });
  const dist = {};
  for (const i of interns) {
    dist[i.gender] = (dist[i.gender] || 0) + 1;
  }
  console.log(JSON.stringify(dist, null, 2));
}

main().finally(() => prisma.$disconnect());

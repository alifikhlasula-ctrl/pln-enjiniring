const { PrismaClient } = require('./lib/generated/client');
const prisma = new PrismaClient();
async function main() {
  const data = await prisma.jsonStore.findUnique({where:{key:'main'}});
  if (data) {
    const sizeMB = JSON.stringify(data).length / 1024 / 1024;
    console.log('Size of main JSON (MB):', sizeMB.toFixed(2));
  } else {
    console.log('No data found');
  }
}
main().catch(console.error).finally(()=>prisma.$disconnect());

const { PrismaClient } = require('./lib/generated/client');
async function main() {
  const p = new PrismaClient();
  const d = await p.jsonStore.findUnique({where:{key:'main'}});
  const onboarding = d.data.onboarding || [];
  console.log(onboarding.slice(0, 3).map(o=>({ id: o.id, status: o.status, name: o.applicant?.name })));
  await p.$disconnect();
}
main();

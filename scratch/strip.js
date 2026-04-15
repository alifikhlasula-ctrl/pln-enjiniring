import { prisma } from '../lib/prisma.js';

async function run() {
  console.log('Fetching main jsonStore...');
  const record = await prisma.jsonStore.findUnique({ where: { key: 'main' } });
  if (!record) {
    console.log('No main record found');
    return;
  }
  
  let data = record.data;
  let count = 0;
  
  if (data.attendances && Array.isArray(data.attendances)) {
    for (let i = 0; i < data.attendances.length; i++) {
      if (data.attendances[i].faceInBase64) {
        delete data.attendances[i].faceInBase64;
        count++;
      }
      if (data.attendances[i].faceOutBase64) {
        delete data.attendances[i].faceOutBase64;
        count++;
      }
      if (data.attendances[i].faceInUrl) delete data.attendances[i].faceInUrl;
      if (data.attendances[i].faceOutUrl) delete data.attendances[i].faceOutUrl;
    }
  }
  
  if (count > 0) {
    console.log(`Stripped ${count} base64 fields. Saving back to DB...`);
    await prisma.jsonStore.update({
      where: { key: 'main' },
      data: { data: data }
    });
    console.log('Saved successfully!');
  } else {
    console.log('No base64 fields found to strip.');
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

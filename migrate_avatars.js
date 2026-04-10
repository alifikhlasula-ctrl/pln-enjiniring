const { PrismaClient } = require('./lib/generated/client');
const fs = require('fs');

async function main() {
  const envFile = fs.readFileSync('.env', 'utf8');
  const m = envFile.match(/DIRECT_URL='([^']+)'/) || envFile.match(/DIRECT_URL="([^"]+)"/);
  if (m) process.env.DIRECT_URL = m[1];

  const p = new PrismaClient();
  try {
    const mainRec = await p.jsonStore.findUnique({ where: { key: 'main' } });
    const arcRec = await p.jsonStore.findUnique({ where: { key: 'archive' } });

    const avatarsData = {};

    let movedCount = 0;

    const processUsers = (usersArray, keyName) => {
      let cleaned = 0;
      if (!usersArray) return 0;
      usersArray.forEach(u => {
        if (u.image && u.image.startsWith('data:image')) {
          // Store in avatars store
          avatarsData[u.id] = u.image;
          // Replace with GET endpoint proxy URL
          u.image = `/api/intern/avatar?userId=${u.id}&v=${Date.now()}`;
          cleaned++;
          movedCount++;
        }
      });
      return cleaned;
    };

    const mainChanges = processUsers(mainRec?.data?.users, 'main');
    const arcChanges = processUsers(arcRec?.data?.users, 'archive');

    console.log(`Extracted ${movedCount} avatars into separate store.`);

    if (movedCount > 0) {
      // 1. Save avatars
      await p.jsonStore.upsert({
        where: { key: 'avatars' },
        update: { data: avatarsData },
        create: { key: 'avatars', data: avatarsData }
      });
      console.log('Avatars store saved!');

      // 2. Save cleaned main
      if (mainChanges > 0) {
        await p.jsonStore.update({
          where: { key: 'main' },
          data: { data: mainRec.data }
        });
        console.log(`Cleaned Main store (Size reduced!)`);
      }

      // 3. Save cleaned archive
      if (arcChanges > 0) {
        await p.jsonStore.update({
          where: { key: 'archive' },
          data: { data: arcRec.data }
        });
        console.log(`Cleaned Archive store (Size reduced!)`);
      }
    } else {
      console.log('No avatars required migrating.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await p.$disconnect();
  }
}

main();

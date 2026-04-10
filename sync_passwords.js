const { PrismaClient } = require('./lib/generated/client');
const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf8');
const directUrlMatch = envFile.match(/DIRECT_URL="([^"]+)"/);
if (directUrlMatch) process.env.DIRECT_URL = directUrlMatch[1];

const rawData = `
Mutia Aqila Fazilatunnisa	mutiaaqila.1791@intern.plne.co.id	PLNE-576354
Shifa Khoirunnisa	shifakhoir.1080@intern.plne.co.id	PLNE-848491
Nayla Aimee Taradiva	naylaaimee.0032@intern.plne.co.id	PLNE-439158
Wisnu Santoso	wisnusanto.4033@intern.plne.co.id	PLNE-650480
Muhammad Danu Nofiandi	muhammadda.0283@intern.plne.co.id	PLNE-863810
Ibnu Masyhur Al Fathani	ibnumasyhu.4502@intern.plne.co.id	PLNE-242563
Vanessa Sauqila Olivian	vanessasau.0119@intern.plne.co.id	PLNE-686465
Randy Arya Dwi Permana	randyaryad.1091@intern.plne.co.id	PLNE-981591
Muhammad Calvin Pasya	muhammadca.2130@intern.plne.co.id	PLNE-280867
Kanaya Fellicita Perdana	kanayafell.4039@intern.plne.co.id	PLNE-167024
Mahira Dinda Putri Anggrianto	mahiradind.4018@intern.plne.co.id	PLNE-262712
Rafael Diel Nakamaya Lande	rafaeldiel.5380@intern.plne.co.id	PLNE-153427
Muhammad Al Farezi Widian	muhammadal.1221@intern.plne.co.id	PLNE-753626
Muhammad Ghiyats Aghniyal Fawaz	muhammadgh.1225@intern.plne.co.id	PLNE-247554
Muhammad Ahsantal Haqqo	muhammadah.1066@intern.plne.co.id	PLNE-659847
Reviana Junita Putri	revianajun.5821@intern.plne.co.id	PLNE-783510
Sufi Widyarini	sufiwidyar.3025@intern.plne.co.id	PLNE-934873
Hana Aisyah Shabrina	hanaaisyah.7022@intern.plne.co.id	PLNE-940974
Radja Faridza Widiansyaputra	radjafarid.1002@intern.plne.co.id	PLNE-102163
M. Joelyandro Revansyah	mjoelyandr.1074@intern.plne.co.id	PLNE-431221
Kyla Gibran Ahmad	kylagibran.1010@intern.plne.co.id	PLNE-587482
Joy Mega Nika Purba	joymeganik.1137@intern.plne.co.id	PLNE-373298
Ammar Nadhif Wicaksono	ammarnadhi.1096@intern.plne.co.id	PLNE-536035
Mareta Dwi Lestari	maretadwil.1025@intern.plne.co.id	PLNE-980018
Eka Nova Setiawan	ekanovaset.0040@intern.plne.co.id	PLNE-540784
Raihan Giga Bajurah	raihangiga.0055@intern.plne.co.id	PLNE-565184
Salsabila	salsabila.0031@intern.plne.co.id	PLNE-245278
Ayu May Diana	ayumaydian.0038@intern.plne.co.id	PLNE-649666
Firda Nur Apriani	firdanurap.2014@intern.plne.co.id	PLNE-819644
Dhila Mahira	dhilamahir.0215@intern.plne.co.id	PLNE-168142
Ahmad Faiz Birqi	ahmadfaizb.0355@intern.plne.co.id	PLNE-754410
R Ghiffari M Affan Syawal	rghiffarim.0338@intern.plne.co.id	PLNE-310628
Roghib Albi Panggar Besi	roghibalbi.2040@intern.plne.co.id	PLNE-738293
Priatama Zaky Al Fathoni	priatamaza.2038@intern.plne.co.id	PLNE-993141
Muhammad Abdu Ar Rafi	muhammadab.2054@intern.plne.co.id	PLNE-832740
Muhammad Fauzan Haqiqi	muhammadfa.0043@intern.plne.co.id	PLNE-604193
`;

async function main() {
  const p = new PrismaClient();
  try {
    const record = await p.jsonStore.findUnique({ where: { key: 'main' } });
    if (!record) return console.log('No DB');
    
    let dbData = record.data;
    let updateCount = 0;

    const lines = rawData.trim().split('\n');
    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 3) {
        const name = parts[0].trim().toLowerCase();
        const email = parts[1].trim();
        const password = parts[2].trim();

        // Find by exact email or exactly matching name
        const uIdx = dbData.users.findIndex(u => u.email === email || (u.name && u.name.toLowerCase().trim() === name));
        
        if (uIdx !== -1) {
          dbData.users[uIdx].email = email; // Update email to the new @intern.plne.co.id email
          dbData.users[uIdx].password = password;
          dbData.users[uIdx].mustChangePassword = true;
          updateCount++;
          console.log(`Updated ${dbData.users[uIdx].name} -> Email: ${email}, PW: ${password}`);
        } else {
          console.log(`User not found for: ${name}`);
        }
      }
    }

    if (updateCount > 0) {
      await p.jsonStore.upsert({
        where: { key: 'main' },
        update: { data: dbData },
        create: { key: 'main', data: dbData }
      });
      console.log(`Successfully updated ${updateCount} users.`);
      
      // Also need to invalidate cache via fetch GET ?
      // Next.js cache doesn't invalidate instantly unless from Next server, but Vercel cache is per deployment
      // We can invalidate by deploying, or we can just send a request to a force-update endpoint if one exists.
    }

  } catch (e) {
    console.error(e);
  } finally {
    await p.$disconnect();
  }
}

main();

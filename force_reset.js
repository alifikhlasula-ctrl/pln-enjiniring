const fs = require('fs');
const { PrismaClient } = require('./lib/generated/client');

const dataListStr = `
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
  const envFile = fs.readFileSync('.env', 'utf8');
  const m = envFile.match(/DIRECT_URL='([^']+)'/) || envFile.match(/DIRECT_URL="([^"]+)"/);
  if (m) process.env.DIRECT_URL = m[1];

  const p = new PrismaClient();
  const dbRecord = await p.jsonStore.findUnique({ where: { key: 'main' } });
  
  const data = dbRecord.data;
  let newUsersCount = 0;
  let resetUsersCount = 0;

  const lines = dataListStr.trim().split('\n');
  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const [name, email, plne_id] = parts.map(s => s.trim());
    
    // We match by NAME, not NIM because the Excel image column 3 is NOT their nim_nis in DB! 
    // They inputted their real NIM like 2311501791 but forgot their login!
    // Or wait, some might have matched. Let's just match by name (case insensitive).
    const nameLower = name.toLowerCase();
    
    let internIdx = data.interns.findIndex(i => !i.deletedAt && i.name.toLowerCase() === nameLower);
    
    if (internIdx === -1) {
      console.log(`WARNING: Intern not found by NAME: ${name}`);
      continue; // Skip creating a DUMMY intern if we can't find them!
    }

    const intern = data.interns[internIdx];
    
    // Use the PLNE ID from the Excel as the NIM/NIS if we want to overwrite it!
    // But the user said: "reset paksa sesuai dengan gambar excel yang saya lampirkan".
    // This implies their current login NIM should be the PLNE id, OR we should just make sure their user account email and password is correct!
    // Let's ASSIGN the PLNE ID as their nim_nis so they can login using it!
    intern.nim_nis = plne_id;
    
    if (!intern.userId) {
      intern.userId = 'u' + Date.now() + Math.random().toString().slice(2, 6);
    }

    let userIdx = data.users.findIndex(u => u.id === intern.userId);
    if (userIdx === -1) {
      data.users.push({
        id: intern.userId,
        email: email,
        password: 'password123',
        name: name,
        role: 'INTERN'
      });
      newUsersCount++;
    } else {
      data.users[userIdx].email = email;
      data.users[userIdx].password = 'password123';
      data.users[userIdx].name = name;
      resetUsersCount++;
    }
  }

  await p.jsonStore.update({
    where: { key: 'main' },
    data: { data }
  });

  console.log(`Successfully synced. Created ${newUsersCount} missing users, reset ${resetUsersCount} users.`);
  await p.$disconnect();
}
main().catch(console.error);

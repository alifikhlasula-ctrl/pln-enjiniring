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
    
    if (!mainRec || !arcRec) throw new Error("Missing DB records");

    const mainData = mainRec.data;
    const arcData = arcRec.data;
    
    const targetNames = [
      'Shifa Khoirunnisa',
      'Kyla Gibran Ahmad',
      'Ammar Nadhif Wicaksono',
      'Salsabila',
      'Muhammad Abdu Ar Rafi'
    ].map(n => n.toLowerCase());

    const isTarget = (name) => targetNames.includes((name || '').trim().toLowerCase());

    // 1. Identify targets in Archive
    const movingInterns = (arcData.interns || []).filter(i => isTarget(i.name));
    if (movingInterns.length === 0) {
      console.log('No interns found to migrate');
      return;
    }

    const movingInternIds = new Set(movingInterns.map(i => i.id));
    const movingUserIds = new Set(movingInterns.map(i => i.userId));
    
    console.log(`Moving ${movingInterns.length} interns back to active...`);

    const isMovingUserId = (uId) => movingUserIds.has(uId);
    const isMovingInternId = (iId) => movingInternIds.has(iId);

    // 2. Extract their data from Archive
    const movingUsers = (arcData.users || []).filter(u => isMovingUserId(u.id));
    const movingAttendances = (arcData.attendances || []).filter(a => isMovingInternId(a.internId));
    const movingReports = (arcData.reports || []).filter(r => isMovingUserId(r.userId));
    const movingEvaluations = (arcData.evaluations || []).filter(e => isMovingInternId(e.internId));
    const movingPayrolls = (arcData.payrolls || []).filter(p => isMovingUserId(p.userId));
    const movingSurveys = (arcData.surveys || []).map(s => {
      return { ...s, responses: s.responses.filter(r => isMovingUserId(r.userId)) }
    }).filter(s => s.responses.length > 0);
    const movingLogs = (arcData.logs || []).filter(l => isMovingUserId(l.userId));

    // 3. Remove them from Archive
    arcData.interns = (arcData.interns || []).filter(i => !movingInternIds.has(i.id));
    arcData.users = (arcData.users || []).filter(u => !movingUserIds.has(u.id));
    arcData.attendances = (arcData.attendances || []).filter(a => !movingInternIds.has(a.internId));
    arcData.reports = (arcData.reports || []).filter(r => !movingUserIds.has(r.userId));
    arcData.evaluations = (arcData.evaluations || []).filter(e => !movingInternIds.has(e.internId));
    arcData.payrolls = (arcData.payrolls || []).filter(p => !movingUserIds.has(p.userId));
    // surveys (responses removal slightly complex, let's keep it simple for now or cleanly filter)
    arcData.surveys = (arcData.surveys || []).map(s => {
      return { ...s, responses: s.responses.filter(r => !movingUserIds.has(r.userId)) }
    });
    arcData.logs = (arcData.logs || []).filter(l => !movingUserIds.has(l.userId));

    // 4. Append them back to MAIN
    // Filter out duplicates if any (just safely merge based on IDs)
    const appendUniq = (arr, newItems, key = 'id') => {
      if (!arr) arr = [];
      const existing = new Set(arr.map(i => i[key]));
      return [...arr, ...newItems.filter(i => !existing.has(i[key]))];
    };

    mainData.interns = appendUniq(mainData.interns, movingInterns);
    mainData.users = appendUniq(mainData.users, movingUsers);
    mainData.attendances = appendUniq(mainData.attendances, movingAttendances);
    mainData.reports = appendUniq(mainData.reports, movingReports);
    mainData.evaluations = appendUniq(mainData.evaluations, movingEvaluations);
    mainData.payrolls = appendUniq(mainData.payrolls, movingPayrolls);
    mainData.logs = appendUniq(mainData.logs, movingLogs);

    // Surveys merge
    const mainSurveys = mainData.surveys || [];
    movingSurveys.forEach(movingS => {
      const ms = mainSurveys.find(s => s.id === movingS.id);
      if (ms) {
        ms.responses = appendUniq(ms.responses, movingS.responses, 'id');
      } else {
        mainSurveys.push(movingS);
      }
    });
    mainData.surveys = mainSurveys;

    console.log(`Saving Main... Interns count: ${mainData.interns.length}`);
    await p.jsonStore.upsert({
      where: { key: 'main' },
      update: { data: mainData },
      create: { key: 'main', data: mainData }
    });

    console.log(`Saving Archive...`);
    await p.jsonStore.upsert({
      where: { key: 'archive' },
      update: { data: arcData },
      create: { key: 'archive', data: arcData }
    });

    console.log('Successfully restored specified interns to ACTIVE!');
  } catch (e) {
    console.error(e);
  } finally {
    await p.$disconnect();
  }
}
main();

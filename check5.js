const fs = require('fs');

function check() {
  const data = JSON.parse(fs.readFileSync('./database.json', 'utf8'));
  const sufi = data.users.find(u => u.name.includes('Sufi'));
  if (sufi) {
    const sufiReports = data.reports.filter(r => r.userId === sufi.id);
    const rep = sufiReports.find(r => r.date === '2026-04-09' || r.reportDate === '2026-04-09');
    console.log("Legacy Report for 2026-04-09:", rep);
  }
}
check();

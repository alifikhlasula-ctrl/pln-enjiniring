const fs = require('fs')

const data = JSON.parse(fs.readFileSync('database.json', 'utf8'))

const interns = data.interns || []

// Kriteria Intern Aktif: Memiliki email resmi @intern.plne.co.id (saat ini berjumlah 36 orang)
const activeInterns = interns.filter(i => i.email && i.email.endsWith('@intern.plne.co.id'))
// Kriteria Archive: Sisanya (430 orang)
const archiveInterns = interns.filter(i => !(i.email && i.email.endsWith('@intern.plne.co.id')))

const activeUserIds = new Set(activeInterns.map(i => i.userId))
const archiveUserIds = new Set(archiveInterns.map(i => i.userId))

// Fungsi pembagian data
const filterData = (uidSet, keepGlobal, isArchive = false) => {
  const isTargetIntern = (internId) => isArchive 
    ? archiveInterns.some(i => i.id === internId) 
    : activeInterns.some(i => i.id === internId)

  const isTargetUser = (userId) => uidSet.has(userId)

  const res = {
    interns: isArchive ? archiveInterns : activeInterns,
    users: (data.users || []).filter(u => isTargetUser(u.id) || (keepGlobal && !uidSet.has(u.id))), // In active, we keep admins.
    attendances: (data.attendances || []).filter(a => isTargetIntern(a.internId)),
    reports: (data.reports || []).filter(r => isTargetUser(r.userId)),
    evaluations: (data.evaluations || []).filter(e => isTargetIntern(e.internId)),
    payrolls: (data.payrolls || []).filter(p => isTargetUser(p.userId)),
    surveys: (data.surveys || []).map(s => {
      const responses = s.responses.filter(r => isTargetUser(r.userId))
      return { ...s, responses }
    }).filter(s => keepGlobal || s.responses.length > 0)
  }

  if (keepGlobal) {
    res.settings = data.settings
    res.events = data.events
    res.announcements = data.announcements
    res.logs = (data.logs || []).filter(l => isTargetUser(l.userId) || l.action.includes('ADMIN'))
  }
  return res
}

// Menghapus data admin dari archive untuk efisiensi murni
const dataActive = filterData(activeUserIds, true, false)
const dataArchive = filterData(archiveUserIds, false, true)

dataArchive.users = dataArchive.users.filter(u => u.role === 'INTERN')

fs.writeFileSync('database_active_preview.json', JSON.stringify(dataActive, null, 2))
fs.writeFileSync('database_archive_preview.json', JSON.stringify(dataArchive, null, 2))

console.log(`Pemisahan Berhasil!`)
console.log(`Active Database: ${dataActive.interns.length} Interns | Ukuran File: ${(fs.statSync('database_active_preview.json').size / 1024).toFixed(2)} KB`)
console.log(`Archive Database: ${dataArchive.interns.length} Interns | Ukuran File: ${(fs.statSync('database_archive_preview.json').size / 1024).toFixed(2)} KB`)

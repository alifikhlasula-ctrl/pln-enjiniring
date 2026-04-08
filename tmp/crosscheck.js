const { PrismaClient } = require('@prisma/client')
const { getDB } = require('./lib/db')
const prisma = new PrismaClient()

function normalizeDate(d) {
  if (!d || typeof d !== 'string') return null
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(d)) {
    const [y, m, day] = d.split('-')
    return `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)) {
    const [day, m, y] = d.split('/')
    return `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return d
}

async function main() {
  const userId = 'u1775030268590'
  const internId = 'i1775030268590'
  const pKey = '2026-04'
  
  // 1. Get all SQL logs
  const allSqlLogs = await prisma.attendanceLog.findMany()
  const sqlForIntern = allSqlLogs.filter(l => l.internId === internId && ['PRESENT', 'LATE'].includes(l.status))
  const aprilSql = sqlForIntern.filter(l => {
    const norm = normalizeDate(l.date)
    return norm && norm.startsWith(pKey)
  })
  console.log('April SQL logs:', aprilSql.length)
  aprilSql.forEach(l => console.log(' -', normalizeDate(l.date), l.status))
  
  // 2. Get reports
  const data = getDB()
  const reports = (data.reports || []).filter(r => {
    const rDate = r.date || r.reportDate
    const norm = normalizeDate(rDate)
    return r.userId === userId && norm && norm.startsWith(pKey) && r.status !== 'DRAFT'
  })
  console.log('\nApril Reports:', reports.length)
  reports.forEach(r => console.log(' -', normalizeDate(r.date || r.reportDate), r.status))
  
  // 3. Cross check
  const verified = aprilSql.filter(l => {
    const lNorm = normalizeDate(l.date)
    return reports.some(r => normalizeDate(r.date || r.reportDate) === lNorm)
  })
  console.log('\nVerified (both absen + laporan):', verified.length)
  console.log('Expected allowance: Rp', verified.length * 25000)
  
  await prisma.$disconnect()
}

main().catch(e => { console.error(e.message); process.exit(1) })

const { PrismaClient } = require('./lib/generated/client')

async function main() {
  const p = new PrismaClient()
  try {
    const mainRec = await p.jsonStore.findUnique({ where: { key: 'main' } })
    const arcRec = await p.jsonStore.findUnique({ where: { key: 'archive' } })
    console.log('Main interns length =', mainRec?.data?.interns?.length)
    console.log('Archive interns length =', arcRec?.data?.interns?.length)

    // Check intersection
    if (mainRec && arcRec) {
      const mainIds = new Set(mainRec.data.interns.map(i => i.id))
      const duplicates = arcRec.data.interns.filter(i => mainIds.has(i.id))
      console.log('Duplicates in archive: ', duplicates.length)
    }
  } catch (err) {
    console.error(err)
  } finally {
    await p.$disconnect()
  }
}
main()

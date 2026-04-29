const { PrismaClient } = require('@prisma/client')
// PostgreSQL via DATABASE_URL env — no adapter needed
const prisma = new PrismaClient()


async function main() {
  // ... rest of the seed script ...
  try {

    await prisma.user.deleteMany({})
    // ...
  } catch (e) {
    console.error('Check failed:', e.message)
  }

  // Seed data...
  const admin = await prisma.user.create({
    data: {
      email: 'admin@hris.com',
      password: 'password123',
      name: 'Admin HR',
      role: 'ADMIN_HR'
    }
  })
  
  console.log('Seed successful')
}

// Full seed script again to be sure
async function fullSeed() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hris.com' },
    update: {},
    create: {
      email: 'admin@hris.com',
      password: 'password123',
      name: 'Admin HR',
      role: 'ADMIN_HR'
    }
  })

  const supervisor = await prisma.user.upsert({
    where: { email: 'john@company.com' },
    update: {},
    create: {
      email: 'john@company.com',
      password: 'password123',
      name: 'John Supervisor',
      role: 'SUPERVISOR'
    }
  })

  const internUser = await prisma.user.upsert({
    where: { email: 'alice@univ.edu' },
    update: {},
    create: {
      email: 'alice@univ.edu',
      password: 'password123',
      name: 'Alice Intern',
      role: 'INTERN'
    }
  })

  await prisma.intern.upsert({
    where: { userId: internUser.id },
    update: {},
    create: {
      userId: internUser.id,
      university: 'Tech Institute',
      major: 'Software Engineering',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-06-30'),
      status: 'ACTIVE',
      supervisorId: supervisor.id
    }
  })

  console.log('Full seed completed')
}

fullSeed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

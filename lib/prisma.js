import { PrismaClient } from './generated/client'

const globalForPrisma = globalThis

const getUrl = () => {
  return process.env.DATABASE_URL
}

export const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: { url: getUrl() }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

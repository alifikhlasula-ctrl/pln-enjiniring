import { PrismaClient } from './generated/client'

const globalForPrisma = globalThis

const getUrl = () => {
  const url = process.env.DATABASE_URL
  if (!url) return undefined
  return url.includes('?') ? `${url}&connection_limit=1` : `${url}?connection_limit=1`
}

export const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: { url: getUrl() }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

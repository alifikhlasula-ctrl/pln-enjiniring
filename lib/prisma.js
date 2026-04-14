import { PrismaClient } from './generated/client'

const globalForPrisma = globalThis

const getUrl = () => {
  let url = process.env.DATABASE_URL
  if (url) {
    // Vercel / Serverless optimizations for Supabase Pooler
    // Only restrict to 1 connection if we are running in Vercel's serverless environment
    if (process.env.VERCEL === '1') {
      if (!url.includes('connection_limit')) {
        url += url.includes('?') ? '&connection_limit=1' : '?connection_limit=1'
      }
      if (!url.includes('pool_timeout')) {
        url += '&pool_timeout=0'
      }
    }
    // Zeabur and local testing will use Prisma's default optimal pool size (much faster)
  }
  return url
}

export const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: { url: getUrl() }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

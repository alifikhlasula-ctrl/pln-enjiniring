import { PrismaClient } from './generated/client'

const globalForPrisma = globalThis

const getUrl = () => {
  let url = process.env.DATABASE_URL
  if (url) {
    // Vercel / Serverless optimizations for Supabase Pooler
    // Restricts each serverless instance to 1 connection to avoid exhausting the Supabase pool limit
    if (!url.includes('connection_limit')) {
      url += url.includes('?') ? '&connection_limit=1' : '?connection_limit=1'
    }
    if (!url.includes('pool_timeout')) {
      url += '&pool_timeout=0'
    }
  }
  return url
}

export const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: { url: getUrl() }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

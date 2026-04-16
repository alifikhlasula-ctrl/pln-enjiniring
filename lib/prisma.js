import { PrismaClient } from './generated/client'

const globalForPrisma = globalThis

const getUrl = () => {
  let url = process.env.DATABASE_URL
  if (!url) return url

  if (process.env.VERCEL === '1') {
    // Vercel = serverless → each function invocation is short-lived.
    // connection_limit=1 prevents pool exhaustion across many cold starts.
    if (!url.includes('connection_limit')) url += (url.includes('?') ? '&' : '?') + 'connection_limit=1'
    if (!url.includes('pool_timeout'))    url += '&pool_timeout=0'
  } else if (process.env.NODE_ENV === 'production') {
    // Zeabur = persistent server → one long-lived process, can pool connections properly.
    // connection_limit=10 → up to 10 simultaneous Prisma connections.
    // pool_timeout=30     → wait up to 30s for a free connection before erroring.
    // pgbouncer=true      → tell Prisma we're behind a connection pooler (PgBouncer).
    if (!url.includes('connection_limit')) url += (url.includes('?') ? '&' : '?') + 'connection_limit=10'
    if (!url.includes('pool_timeout'))    url += '&pool_timeout=30'
    if (!url.includes('pgbouncer'))       url += '&pgbouncer=true'
  }
  // Local dev: use Prisma's calculated default (num_cpus * 2 + 1)

  return url
}

const makePrismaClient = () => new PrismaClient({
  datasources: { db: { url: getUrl() } },
  log: process.env.NODE_ENV === 'development'
    ? [{ emit: 'stdout', level: 'warn' }, { emit: 'stdout', level: 'error' }]
    : [{ emit: 'stdout', level: 'error' }],
})

// Using a singleton for PrismaClient to prevent connection leaks.
// This is critical in serverless (Vercel) and long-lived (Zeabur) production environments.
export const prisma = globalForPrisma.prisma || makePrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
else {
  // In production environments like Zeabur that might experience soft restarts,
  // attaching to globalThis can prevent ghost connections.
  globalForPrisma.prisma = prisma
}

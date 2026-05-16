import { PrismaClient } from "@prisma/client"

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

function buildDatabaseUrl(): string {
  const base = process.env.DATABASE_URL ?? ""
  const separator = base.includes("?") ? "&" : "?"
  return `${base}${separator}connection_limit=20&pool_timeout=10`
}

// Singleton to prevent multiple connections during hot reload
const prisma =
  global.__prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: buildDatabaseUrl(),
      },
    },
  })

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma
}

export default prisma

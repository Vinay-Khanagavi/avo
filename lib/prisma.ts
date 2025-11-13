import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client with better error handling
function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

  // Handle disconnection on process termination
  if (typeof process !== 'undefined') {
    process.on('beforeExit', async () => {
      await client.$disconnect()
    })
    
    process.on('SIGINT', async () => {
      await client.$disconnect()
      process.exit(0)
    })
    
    process.on('SIGTERM', async () => {
      await client.$disconnect()
      process.exit(0)
    })
  }

  return client
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma


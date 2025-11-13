import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client with better error handling and connection settings
function createPrismaClient() {
  // Validate DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
      'Please ensure DATABASE_URL is configured in Railway environment variables.'
    )
  }

  // Configure connection pool via DATABASE_URL query parameters if needed
  // For Railway PostgreSQL, connection pooling is handled automatically
  // Only add pool settings if not already present in DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL
  
  // Check if connection pool parameters are already in the URL
  const hasPoolParams = databaseUrl.includes('connection_limit') || databaseUrl.includes('pool_timeout')
  
  // Add connection pool parameters if not already present (helps with Railway)
  const urlWithPool = hasPoolParams 
    ? databaseUrl
    : (databaseUrl.includes('?') 
        ? `${databaseUrl}&connection_limit=10&pool_timeout=20`
        : `${databaseUrl}?connection_limit=10&pool_timeout=20`)

  const client = new PrismaClient({
    datasources: {
      db: {
        url: urlWithPool,
      },
    },
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

// Helper function to check database connection
export async function checkDatabaseConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { connected: true }
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown database error'
    return { connected: false, error: errorMessage }
  }
}


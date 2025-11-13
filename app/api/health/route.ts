import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Health check endpoint to verify database connectivity and service status
 * Useful for debugging production issues
 */
export async function GET() {
  const health: {
    status: "healthy" | "unhealthy"
    timestamp: string
    database: "connected" | "disconnected" | "error"
    databaseError?: string
    environment: string
  } = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    database: "disconnected",
    environment: process.env.NODE_ENV || "unknown",
  }

  try {
    // Test database connection with timeout
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Database connection timeout")), 5000)
      )
    ])
    health.database = "connected"
  } catch (error: any) {
    health.status = "unhealthy"
    health.database = "error"
    
    // Handle PrismaClientInitializationError
    if (error?.name === 'PrismaClientInitializationError' || 
        error?.constructor?.name === 'PrismaClientInitializationError' ||
        error?.message?.includes("Can't reach database server")) {
      health.databaseError = `Database server unreachable: ${error.message || 'Connection failed'}`
    } else if (error.code === "P1001" || error.code === "P1000") {
      health.databaseError = "Database connection failed. Check DATABASE_URL."
    } else if (error.message === "Database connection timeout") {
      health.databaseError = "Database connection timeout. Server may be slow or unreachable."
    } else {
      health.databaseError = error.message || "Unknown database error"
    }
  }

  return NextResponse.json(health, {
    status: health.status === "healthy" ? 200 : 503,
  })
}


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
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    health.database = "connected"
  } catch (error: any) {
    health.status = "unhealthy"
    health.database = "error"
    health.databaseError = error.message || "Unknown database error"
    
    if (error.code === "P1001" || error.code === "P1000") {
      health.databaseError = "Database connection failed. Check DATABASE_URL."
    }
  }

  return NextResponse.json(health, {
    status: health.status === "healthy" ? 200 : 503,
  })
}


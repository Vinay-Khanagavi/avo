import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""

    const skip = (page - 1) * limit

    const where = {
      userId: session.user.id,
      ...(search && {
        text: {
          contains: search,
          mode: "insensitive" as const,
        },
      }),
    }

    const [transcriptions, total] = await Promise.all([
      prisma.transcription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.transcription.count({ where }),
    ])

    return NextResponse.json({
      transcriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error("Transcriptions GET error:", error)
    
    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code?: string; message?: string }
      if (prismaError.code === 'P1001' || prismaError.code === 'P1000') {
        console.error("Database connection error:", prismaError.message)
        return NextResponse.json(
          { error: "Database connection failed. Please try again later." },
          { status: 503 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


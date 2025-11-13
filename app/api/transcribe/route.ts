import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } from "@aws-sdk/client-transcribe"
import { fromIni } from "@aws-sdk/credential-providers"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

// Initialize AWS clients
function getTranscribeClient() {
  const region = process.env.AWS_REGION || "us-east-1"
  return new TranscribeClient({
    region,
    credentials: fromIni({
      profile: process.env.AWS_PROFILE || "default",
    }),
  })
}

function getS3Client() {
  const region = process.env.AWS_REGION || "us-east-1"
  return new S3Client({
    region,
    credentials: fromIni({
      profile: process.env.AWS_PROFILE || "default",
    }),
  })
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get audio data from request
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      )
    }

    // DEPRECATED: This endpoint is kept for backward compatibility
    // New streaming transcription uses /api/transcribe/stream
    // This endpoint can be removed in future versions
    
    // Mock response for development
    const mockTranscript = "This endpoint is deprecated. Please use the streaming transcription API at /api/transcribe/stream for real-time transcription."

    // Save transcription to database
    if (mockTranscript.trim()) {
      try {
      await prisma.transcription.create({
        data: {
          text: mockTranscript.trim(),
          userId: session.user.id,
        },
      })
      } catch (dbError: any) {
        // Log database error but don't fail the request
        console.error("Failed to save transcription to database:", dbError)
        // Continue and return the transcript even if DB save fails
      }
    }

    return NextResponse.json({
      transcript: mockTranscript.trim(),
      success: true,
    })
  } catch (error: any) {
    console.error("Transcribe API error:", error)
    
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


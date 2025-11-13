import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const WHISPER_SERVICE_URL = process.env.WHISPER_SERVICE_URL || "http://localhost:8000"
const WHISPER_API_KEY = process.env.WHISPER_API_KEY || ""

/**
 * Create a new transcription session
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const requestContentType = request.headers.get("content-type") || ""

    // Handle FormData (chunk upload)
    if (requestContentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const action = formData.get("action") as string
      const sessionId = formData.get("sessionId") as string

      if (action === "chunk" && sessionId) {
        const chunkFile = formData.get("file") as File

        if (!chunkFile) {
          return NextResponse.json({ error: "No file provided" }, { status: 400 })
        }

        // Forward to Whisper service
        const chunkFormData = new FormData()
        chunkFormData.append("file", chunkFile, "chunk.webm")

        const chunkHeaders: HeadersInit = {}
        if (WHISPER_API_KEY) {
          chunkHeaders["X-API-Key"] = WHISPER_API_KEY
        }

        try {
          const response = await fetch(
            `${WHISPER_SERVICE_URL}/api/v1/sessions/${sessionId}/chunks`,
            {
              method: "POST",
              headers: chunkHeaders,
              body: chunkFormData,
            }
          )

          if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: "Unknown error" }))
            return NextResponse.json(
              { error: error.detail || "Failed to process chunk" },
              { status: response.status }
            )
          }

          const data = await response.json()
          return NextResponse.json(data)
        } catch (error: any) {
          if (error.code === "ECONNREFUSED" || error.message?.includes("fetch failed")) {
            return NextResponse.json(
              { 
                error: "Whisper service is not running. Please start it with: cd whisper-service && python app.py" 
              },
              { status: 503 }
            )
          }
          throw error
        }
      }
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Handle JSON (create/finalize)
    const body = await request.json()
    const { action, sessionId, contentType: bodyContentType } = body

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    if (WHISPER_API_KEY) {
      headers["X-API-Key"] = WHISPER_API_KEY
    }

    // Create session
    if (action === "create") {
      try {
        const response = await fetch(`${WHISPER_SERVICE_URL}/api/v1/sessions`, {
          method: "POST",
          headers,
          body: JSON.stringify({ prompt: body.prompt, contentType: bodyContentType }),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ detail: "Unknown error" }))
          return NextResponse.json(
            { error: error.detail || "Failed to create session" },
            { status: response.status }
          )
        }

        const data = await response.json()
        return NextResponse.json(data)
      } catch (error: any) {
        if (error.code === "ECONNREFUSED" || error.message?.includes("fetch failed")) {
          return NextResponse.json(
            { 
              error: "Whisper service is not running. Please start it with: cd whisper-service && python app.py" 
            },
            { status: 503 }
          )
        }
        throw error
      }
    }

    // Finalize session
    if (action === "finalize" && sessionId) {
      try {
        const response = await fetch(
          `${WHISPER_SERVICE_URL}/api/v1/sessions/${sessionId}/finalize`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ contentType: bodyContentType }),
          }
        )

        if (!response.ok) {
          const error = await response.json().catch(() => ({ detail: "Unknown error" }))
          return NextResponse.json(
            { error: error.detail || "Failed to finalize session" },
            { status: response.status }
          )
        }

          const data = await response.json()

        // Save final transcript to database
        if (data.transcript?.trim()) {
          try {
          const { prisma } = await import("@/lib/prisma")
          await prisma.transcription.create({
            data: {
              text: data.transcript.trim(),
              userId: session.user.id,
            },
          })
          } catch (dbError: any) {
            // Log database error but don't fail the request
            console.error("Failed to save transcription to database:", dbError)
            // Continue and return the transcript even if DB save fails
          }
        }

        return NextResponse.json(data)
      } catch (error: any) {
        if (error.code === "ECONNREFUSED" || error.message?.includes("fetch failed")) {
          return NextResponse.json(
            { 
              error: "Whisper service is not running. Please start it with: cd whisper-service && python app.py" 
            },
            { status: 503 }
          )
        }
        throw error
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("Stream transcription API error:", error)
    
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
    
    // Handle network errors
    if (error.code === "ECONNREFUSED" || error.message?.includes("fetch failed")) {
      return NextResponse.json(
        { 
          error: "Whisper service is not available. Please try again later." 
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


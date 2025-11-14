import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { 
  createDeepgramSession, 
  transcribeDeepgramChunk, 
  finalizeDeepgramSession 
} from "@/lib/deepgram-service"
import { 
  createAssemblyAISession, 
  transcribeAssemblyAIChunk, 
  finalizeAssemblyAISession 
} from "@/lib/assemblyai-service"
import { aiFormatTranscript } from "@/lib/ai-formatter"
import { applyDictionaryReplacements } from "@/lib/dictionary-replace"
import { getUserAISettings } from "@/lib/user-settings"

const WHISPER_SERVICE_URL = process.env.WHISPER_SERVICE_URL || "http://localhost:8000"
const WHISPER_API_KEY = process.env.WHISPER_API_KEY || ""

// In-memory session storage for Deepgram and AssemblyAI
// In production, consider using Redis or a database
const sessionStorage = new Map<string, { transcript: string; service: string; prompt?: string }>()

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

    const contentType = request.headers.get("content-type") || ""

    // Handle FormData (chunk upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const action = formData.get("action") as string
      const sessionId = formData.get("sessionId") as string
      const service = (formData.get("service") as string) || "whisper"
      const customApiKey = formData.get("customApiKey") as string | null

      if (action === "chunk" && sessionId) {
        const chunkFile = formData.get("file") as File

        if (!chunkFile) {
          return NextResponse.json({ error: "No file provided" }, { status: 400 })
        }

        // Convert File to Buffer
        const arrayBuffer = await chunkFile.arrayBuffer()
        const audioBuffer = Buffer.from(arrayBuffer)

        // Route to appropriate service
        if (service === "deepgram") {
          try {
            const sessionData = sessionStorage.get(sessionId)
            const existingTranscript = sessionData?.transcript || ""
            const prompt = sessionData?.prompt

            const result = await transcribeDeepgramChunk(
              sessionId,
              audioBuffer,
              existingTranscript,
              customApiKey || undefined,
              prompt
            )

            // Apply AI formatting if available
            let formattedTranscript = result.transcript
            try {
              const userSettings = await getUserAISettings()
              if (userSettings.provider !== 'none') {
                formattedTranscript = await aiFormatTranscript(result.transcript, {
                  detectBulletPoints: userSettings.detectBulletPoints,
                  refineGrammar: userSettings.refineGrammar,
                  improvePunctuation: userSettings.improvePunctuation,
                  improveCapitalization: userSettings.improveCapitalization,
                  addFormatting: userSettings.addFormatting,
                }, {
                  provider: userSettings.provider,
                  apiKey: userSettings.provider === 'groq' ? userSettings.groqApiKey : 
                          userSettings.provider === 'openai' ? userSettings.openaiApiKey : undefined,
                })
              }
            } catch (error) {
              console.error("AI formatting failed, using raw transcript:", error)
              // Continue with raw transcript if formatting fails
            }

            // Update result with formatted transcript
            const finalResult = {
              ...result,
              transcript: formattedTranscript,
              incremental: formattedTranscript.slice(existingTranscript.length),
            }

            // Update session storage
            sessionStorage.set(sessionId, {
              transcript: formattedTranscript,
              service: "deepgram",
            })

            return NextResponse.json(finalResult)
          } catch (error: any) {
            console.error("Deepgram transcription error:", error)
            return NextResponse.json(
              { error: error.message || "Deepgram transcription failed" },
              { status: 500 }
            )
          }
        } else if (service === "assemblyai") {
          try {
            const sessionData = sessionStorage.get(sessionId)
            const existingTranscript = sessionData?.transcript || ""
            const prompt = sessionData?.prompt

            const result = await transcribeAssemblyAIChunk(
              sessionId,
              audioBuffer,
              existingTranscript,
              customApiKey || undefined,
              prompt
            )

            // Apply AI formatting if available
            let formattedTranscript = result.transcript
            try {
              const userSettings = await getUserAISettings()
              if (userSettings.provider !== 'none') {
                formattedTranscript = await aiFormatTranscript(result.transcript, {
                  detectBulletPoints: userSettings.detectBulletPoints,
                  refineGrammar: userSettings.refineGrammar,
                  improvePunctuation: userSettings.improvePunctuation,
                  improveCapitalization: userSettings.improveCapitalization,
                  addFormatting: userSettings.addFormatting,
                }, {
                  provider: userSettings.provider,
                  apiKey: userSettings.provider === 'groq' ? userSettings.groqApiKey : 
                          userSettings.provider === 'openai' ? userSettings.openaiApiKey : undefined,
                })
              }
            } catch (error) {
              console.error("AI formatting failed, using raw transcript:", error)
              // Continue with raw transcript if formatting fails
            }

            // Update result with formatted transcript
            const finalResult = {
              ...result,
              transcript: formattedTranscript,
              incremental: formattedTranscript.slice(existingTranscript.length),
            }

            // Update session storage
            sessionStorage.set(sessionId, {
              transcript: formattedTranscript,
              service: "assemblyai",
            })

            return NextResponse.json(finalResult)
          } catch (error: any) {
            console.error("AssemblyAI transcription error:", error)
            return NextResponse.json(
              { error: error.message || "AssemblyAI transcription failed" },
              { status: 500 }
            )
          }
        } else {
          // Default to Whisper service
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
            
            // Apply AI formatting if available (for Whisper service)
            if (data.transcript) {
              try {
                const userSettings = await getUserAISettings()
                if (userSettings.provider !== 'none') {
                  const formattedTranscript = await aiFormatTranscript(data.transcript, {
                    detectBulletPoints: userSettings.detectBulletPoints,
                    refineGrammar: userSettings.refineGrammar,
                    improvePunctuation: userSettings.improvePunctuation,
                    improveCapitalization: userSettings.improveCapitalization,
                    addFormatting: userSettings.addFormatting,
                  }, {
                    provider: userSettings.provider,
                    apiKey: userSettings.provider === 'grok' ? userSettings.grokApiKey : 
                            userSettings.provider === 'openai' ? userSettings.openaiApiKey : undefined,
                  })
                  
                  // Update transcript with formatted version
                  data.transcript = formattedTranscript
                  if (data.incremental) {
                    const existingTranscript = data.transcript.slice(0, -data.incremental.length) || ""
                    data.incremental = formattedTranscript.slice(existingTranscript.length)
                  }
                }
              } catch (error) {
                console.error("AI formatting failed for Whisper, using raw transcript:", error)
                // Continue with raw transcript if formatting fails
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
      }
    }

    // Handle JSON (create/finalize)
    const body = await request.json()
    const { action, sessionId, service = "whisper" } = body

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    if (WHISPER_API_KEY) {
      headers["X-API-Key"] = WHISPER_API_KEY
    }

    // Create session
    if (action === "create") {
      if (service === "deepgram") {
        try {
          const session = await createDeepgramSession(body.prompt)
          sessionStorage.set(session.sessionId, {
            transcript: "",
            service: "deepgram",
            prompt: body.prompt,
          })
          return NextResponse.json({ session_id: session.sessionId, status: "created" })
        } catch (error: any) {
          console.error("Deepgram session creation error:", error)
          return NextResponse.json(
            { error: error.message || "Failed to create Deepgram session" },
            { status: 500 }
          )
        }
      } else if (service === "assemblyai") {
        try {
          const session = await createAssemblyAISession(body.prompt)
          sessionStorage.set(session.sessionId, {
            transcript: "",
            service: "assemblyai",
            prompt: body.prompt,
          })
          return NextResponse.json({ session_id: session.sessionId, status: "created" })
        } catch (error: any) {
          console.error("AssemblyAI session creation error:", error)
          return NextResponse.json(
            { error: error.message || "Failed to create AssemblyAI session" },
            { status: 500 }
          )
        }
      } else {
        // Default to Whisper service
        try {
          const response = await fetch(`${WHISPER_SERVICE_URL}/api/v1/sessions`, {
            method: "POST",
            headers,
            body: JSON.stringify({ prompt: body.prompt }),
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
    }

    // Finalize session
    if (action === "finalize" && sessionId) {
      const sessionData = sessionStorage.get(sessionId)
      const service = sessionData?.service || body.service || "whisper"

      if (service === "deepgram") {
        try {
          const result = await finalizeDeepgramSession(sessionId)
          const finalTranscript = sessionData?.transcript || ""

          // Save final transcript to database
          if (finalTranscript.trim()) {
            try {
              const { prisma } = await import("@/lib/prisma")
              await prisma.transcription.create({
                data: {
                  text: finalTranscript.trim(),
                  userId: session.user.id,
                },
              })
            } catch (dbError: any) {
              console.error("Failed to save transcription to database:", dbError)
            }
          }

          // Clean up session
          sessionStorage.delete(sessionId)

          return NextResponse.json({
            session_id: sessionId,
            transcript: finalTranscript,
            is_final: true,
          })
        } catch (error: any) {
          console.error("Deepgram finalize error:", error)
          return NextResponse.json(
            { error: error.message || "Failed to finalize Deepgram session" },
            { status: 500 }
          )
        }
      } else if (service === "assemblyai") {
        try {
          const result = await finalizeAssemblyAISession(sessionId)
          const finalTranscript = sessionData?.transcript || ""

          // Save final transcript to database
          if (finalTranscript.trim()) {
            try {
              const { prisma } = await import("@/lib/prisma")
              await prisma.transcription.create({
                data: {
                  text: finalTranscript.trim(),
                  userId: session.user.id,
                },
              })
            } catch (dbError: any) {
              console.error("Failed to save transcription to database:", dbError)
            }
          }

          // Clean up session
          sessionStorage.delete(sessionId)

          return NextResponse.json({
            session_id: sessionId,
            transcript: finalTranscript,
            is_final: true,
          })
        } catch (error: any) {
          console.error("AssemblyAI finalize error:", error)
          return NextResponse.json(
            { error: error.message || "Failed to finalize AssemblyAI session" },
            { status: 500 }
          )
        }
      } else {
        // Default to Whisper service
        try {
          const response = await fetch(
            `${WHISPER_SERVICE_URL}/api/v1/sessions/${sessionId}/finalize`,
            {
              method: "POST",
              headers,
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


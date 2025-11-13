/**
 * AssemblyAI transcription service implementation
 */

export interface AssemblyAISession {
  sessionId: string
}

export interface AssemblyAIChunkResponse {
  session_id: string
  transcript: string
  incremental: string
  is_final: boolean
}

const DEFAULT_ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY || "5abc147fb8054340a315db5b2104c0c5"
const ASSEMBLYAI_API_URL = "https://api.assemblyai.com/v2"

function getAssemblyAIApiKey(customApiKey?: string): string {
  // Use custom API key if provided
  if (customApiKey) {
    return customApiKey
  }
  return DEFAULT_ASSEMBLYAI_API_KEY
}

/**
 * Create a new AssemblyAI transcription session
 */
export async function createAssemblyAISession(
  prompt?: string
): Promise<AssemblyAISession> {
  // Session ID is generated client-side for tracking
  const sessionId = `aa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  return {
    sessionId,
  }
}

/**
 * Transcribe audio chunk using AssemblyAI API
 */
export async function transcribeAssemblyAIChunk(
  sessionId: string,
  audioChunk: Buffer,
  existingTranscript: string = "",
  customApiKey?: string
): Promise<AssemblyAIChunkResponse> {
  const apiKey = getAssemblyAIApiKey(customApiKey)
  if (!apiKey) {
    throw new Error("AssemblyAI API key not configured")
  }

  try {
    // Step 1: Upload audio chunk to AssemblyAI
    const uploadResponse = await fetch(`${ASSEMBLYAI_API_URL}/upload`, {
      method: "POST",
      headers: {
        "authorization": apiKey,
      },
      body: audioChunk,
    })

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(error.error || `AssemblyAI upload error: ${uploadResponse.statusText}`)
    }

    const uploadData = await uploadResponse.json()
    const audioUrl = uploadData.upload_url

    // Step 2: Start transcription job
    const transcribeResponse = await fetch(`${ASSEMBLYAI_API_URL}/transcript`, {
      method: "POST",
      headers: {
        "authorization": ASSEMBLYAI_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        language_code: "en",
        punctuate: true,
        format_text: true,
      }),
    })

    if (!transcribeResponse.ok) {
      const error = await transcribeResponse.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(error.error || `AssemblyAI transcription error: ${transcribeResponse.statusText}`)
    }

    const transcribeData = await transcribeResponse.json()
    const transcriptId = transcribeData.id

    // Step 3: Poll for completion (with timeout)
    let transcript = ""
    let isFinal = false
    const maxAttempts = 20 // 10 seconds max (20 * 500ms)
    let attempts = 0

    while (attempts < maxAttempts && !isFinal) {
      await new Promise(resolve => setTimeout(resolve, 500)) // Wait 500ms

      const statusResponse = await fetch(`${ASSEMBLYAI_API_URL}/transcript/${transcriptId}`, {
        headers: {
          "authorization": ASSEMBLYAI_API_KEY,
        },
      })

      if (!statusResponse.ok) {
        break
      }

      const statusData = await statusResponse.json()
      
      if (statusData.status === "completed") {
        transcript = statusData.text || ""
        isFinal = true
      } else if (statusData.status === "error") {
        throw new Error(statusData.error || "AssemblyAI transcription failed")
      }

      attempts++
    }

    // For incremental updates
    const incremental = transcript
    
    // Merge with existing transcript
    const mergedTranscript = existingTranscript 
      ? `${existingTranscript} ${transcript}`.trim()
      : transcript

    return {
      session_id: sessionId,
      transcript: mergedTranscript,
      incremental,
      is_final: isFinal,
    }
  } catch (error: any) {
    throw new Error(`AssemblyAI transcription failed: ${error.message}`)
  }
}

/**
 * Finalize AssemblyAI session
 */
export async function finalizeAssemblyAISession(
  sessionId: string
): Promise<AssemblyAIChunkResponse> {
  return {
    session_id: sessionId,
    transcript: "",
    incremental: "",
    is_final: true,
  }
}


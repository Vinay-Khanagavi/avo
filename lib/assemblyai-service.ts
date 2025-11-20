/**
 * AssemblyAI transcription service implementation
 * Uses batch mode - accumulates audio and transcribes when recording stops
 */

export interface AssemblyAISession {
  sessionId: string
  prompt?: string
  audioChunks: Buffer[]  // Accumulate all audio chunks
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
  const sessionId = `aa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  return {
    sessionId,
    prompt,
    audioChunks: [],
  }
}

/**
 * Add audio chunk to session (accumulate for batch processing)
 */
export function addAudioChunkToSession(
  session: AssemblyAISession,
  audioChunk: Buffer
): void {
  session.audioChunks.push(audioChunk)
}

/**
 * Transcribe accumulated audio using AssemblyAI API
 */
export async function transcribeAssemblyAIAudio(
  session: AssemblyAISession,
  customApiKey?: string
): Promise<AssemblyAIChunkResponse> {
  const apiKey = getAssemblyAIApiKey(customApiKey)
  if (!apiKey) {
    throw new Error("AssemblyAI API key not configured")
  }

  // Combine all chunks
  const combinedAudio = Buffer.concat(session.audioChunks)

  if (combinedAudio.length === 0) {
    return {
      session_id: session.sessionId,
      transcript: "",
      incremental: "",
      is_final: true,
    }
  }

  try {
    // Step 1: Upload audio to AssemblyAI
    // Convert Buffer to Uint8Array for fetch API compatibility
    const uint8Array = new Uint8Array(combinedAudio)

    const uploadResponse = await fetch(`${ASSEMBLYAI_API_URL}/upload`, {
      method: "POST",
      headers: {
        "authorization": apiKey,
      },
      body: uint8Array,
    })

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(error.error || `AssemblyAI upload error: ${uploadResponse.statusText}`)
    }

    const uploadData = await uploadResponse.json()
    const audioUrl = uploadData.upload_url

    // Step 2: Start transcription job
    const requestBody: any = {
      audio_url: audioUrl,
      language_code: "en",
      punctuate: true,
      format_text: true,
    }

    // Add prompt if provided (AssemblyAI uses word_boost parameter)
    if (session.prompt) {
      // Extract words from prompt for word boost
      const words = session.prompt
        .replace(/Please use the following dictionary words when transcribing:/i, "")
        .replace(/\(should be transcribed as:[^)]+\)/g, "")
        .split(",")
        .map(w => w.trim())
        .filter(w => w.length > 0)
        .slice(0, 100) // Limit to 100 words

      if (words.length > 0) {
        // AssemblyAI uses word_boost parameter to prioritize certain words
        requestBody.word_boost = words
      }
    }

    const transcribeResponse = await fetch(`${ASSEMBLYAI_API_URL}/transcript`, {
      method: "POST",
      headers: {
        "authorization": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!transcribeResponse.ok) {
      const error = await transcribeResponse.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(error.error || `AssemblyAI transcription error: ${transcribeResponse.statusText}`)
    }

    const transcribeData = await transcribeResponse.json()
    const transcriptId = transcribeData.id

    // Step 3: Poll for completion
    let transcript = ""
    let isFinal = false
    const maxAttempts = 60 // 30 seconds max (60 * 500ms)
    let attempts = 0

    while (attempts < maxAttempts && !isFinal) {
      await new Promise(resolve => setTimeout(resolve, 500)) // Wait 500ms

      const statusResponse = await fetch(`${ASSEMBLYAI_API_URL}/transcript/${transcriptId}`, {
        headers: {
          "authorization": apiKey,
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

    return {
      session_id: session.sessionId,
      transcript: transcript.trim(),
      incremental: transcript.trim(),
      is_final: true,
    }
  } catch (error: any) {
    throw new Error(`AssemblyAI transcription failed: ${error.message}`)
  }
}

/**
 * Finalize AssemblyAI session
 */
export async function finalizeAssemblyAISession(
  session: AssemblyAISession,
  customApiKey?: string
): Promise<AssemblyAIChunkResponse> {
  // Transcribe all accumulated audio
  if (session.audioChunks.length > 0) {
    return await transcribeAssemblyAIAudio(session, customApiKey)
  }

  return {
    session_id: session.sessionId,
    transcript: "",
    incremental: "",
    is_final: true,
  }
}

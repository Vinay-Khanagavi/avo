/**
 * Deepgram transcription service implementation
 */

export interface DeepgramSession {
  sessionId: string
}

export interface DeepgramChunkResponse {
  session_id: string
  transcript: string
  incremental: string
  is_final: boolean
}

const DEFAULT_DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY || "a5b17f6800bc3b9c66064896e677784b8e2d09ad"
const DEEPGRAM_API_URL = "https://api.deepgram.com/v1"

function getDeepgramApiKey(customApiKey?: string): string {
  // Use custom API key if provided
  if (customApiKey) {
    return customApiKey
  }
  return DEFAULT_DEEPGRAM_API_KEY
}

/**
 * Create a new Deepgram transcription session
 */
export async function createDeepgramSession(
  prompt?: string
): Promise<DeepgramSession> {
  // Session ID is generated client-side for tracking
  const sessionId = `dg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  return {
    sessionId,
  }
}

/**
 * Transcribe audio chunk using Deepgram API
 */
export async function transcribeDeepgramChunk(
  sessionId: string,
  audioChunk: Buffer,
  existingTranscript: string = "",
  customApiKey?: string
): Promise<DeepgramChunkResponse> {
  const apiKey = getDeepgramApiKey(customApiKey)
  if (!apiKey) {
    throw new Error("Deepgram API key not configured")
  }

  try {
    // Deepgram prerecorded transcription endpoint
    // Using nova-2 model for better accuracy
    // Note: Deepgram expects audio/webm or other supported formats
    const response = await fetch(
      `${DEEPGRAM_API_URL}/listen?model=nova-2&punctuate=true&language=en&smart_format=true`,
      {
        method: "POST",
        headers: {
          "Authorization": `Token ${apiKey}`,
          "Content-Type": "audio/webm",
        },
        body: audioChunk,
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `Deepgram API error: ${response.statusText}`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }
      throw new Error(errorMessage)
    }

    const data = await response.json()
    
    // Extract transcript from Deepgram response
    let transcript = ""
    let incremental = ""
    
    if (data.results && data.results.channels && data.results.channels[0]) {
      const alternatives = data.results.channels[0].alternatives
      if (alternatives && alternatives[0]) {
        transcript = alternatives[0].transcript || ""
      }
    }

    // For incremental updates, use the transcript as new text
    incremental = transcript
    
    // Merge with existing transcript
    const mergedTranscript = existingTranscript 
      ? `${existingTranscript} ${transcript}`.trim()
      : transcript

    return {
      session_id: sessionId,
      transcript: mergedTranscript,
      incremental,
      is_final: true, // Deepgram prerecorded API returns final results
    }
  } catch (error: any) {
    throw new Error(`Deepgram transcription failed: ${error.message}`)
  }
}

/**
 * Finalize Deepgram session
 */
export async function finalizeDeepgramSession(
  sessionId: string
): Promise<DeepgramChunkResponse> {
  return {
    session_id: sessionId,
    transcript: "",
    incremental: "",
    is_final: true,
  }
}


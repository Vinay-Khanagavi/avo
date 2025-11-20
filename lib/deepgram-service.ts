/**
 * Deepgram transcription service implementation
 * Uses batch mode - accumulates audio and transcribes when recording stops
 */

export interface DeepgramSession {
  sessionId: string
  prompt?: string
  audioChunks: Buffer[]  // Accumulate all audio chunks
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
  const sessionId = `dg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

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
  session: DeepgramSession,
  audioChunk: Buffer
): void {
  session.audioChunks.push(audioChunk)
}

/**
 * Transcribe accumulated audio using Deepgram API
 */
export async function transcribeDeepgramAudio(
  session: DeepgramSession,
  customApiKey?: string
): Promise<DeepgramChunkResponse> {
  const apiKey = getDeepgramApiKey(customApiKey)
  if (!apiKey) {
    throw new Error("Deepgram API key not configured")
  }

  // Combine all chunks
  const combinedAudio = Buffer.concat(session.audioChunks)

  try {
    // Build query parameters including prompt if provided
    const params = new URLSearchParams({
      model: "nova-2",
      punctuate: "true",
      language: "en",
      smart_format: "true",
    })

    // Add prompt as keywords if provided
    if (session.prompt) {
      const words = session.prompt
        .replace(/Please use the following dictionary words when transcribing:/i, "")
        .replace(/\(should be transcribed as:[^)]+\)/g, "")
        .split(",")
        .map(w => w.trim())
        .filter(w => w.length > 0)
        .slice(0, 100)

      if (words.length > 0) {
        params.append("keywords", words.join(","))
      }
    }

    const response = await fetch(
      `${DEEPGRAM_API_URL}/listen?${params.toString()}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Token ${apiKey}`,
          "Content-Type": "audio/webm",
        },
        body: new Uint8Array(combinedAudio),
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

    let transcript = ""
    if (data.results && data.results.channels && data.results.channels[0]) {
      const alternatives = data.results.channels[0].alternatives
      if (alternatives && alternatives[0]) {
        transcript = alternatives[0].transcript || ""
      }
    }

    return {
      session_id: session.sessionId,
      transcript: transcript.trim(),
      incremental: transcript.trim(),
      is_final: true,
    }
  } catch (error: any) {
    throw new Error(`Deepgram transcription failed: ${error.message}`)
  }
}

/**
 * Finalize Deepgram session
 */
export async function finalizeDeepgramSession(
  session: DeepgramSession,
  customApiKey?: string
): Promise<DeepgramChunkResponse> {
  // Transcribe all accumulated audio
  if (session.audioChunks.length > 0) {
    return await transcribeDeepgramAudio(session, customApiKey)
  }

  return {
    session_id: session.sessionId,
    transcript: "",
    incremental: "",
    is_final: true,
  }
}

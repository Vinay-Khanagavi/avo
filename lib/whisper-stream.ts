/**
 * Client-side streaming utilities for Whisper transcription service
 */

export interface TranscriptionSession {
  sessionId: string
  prompt?: string
}

export interface ChunkResponse {
  session_id: string
  transcript: string
  incremental: string
  is_final: boolean
}

export interface SessionResponse {
  session_id: string
  transcript: string
  chunk_count: number
  created_at: string
}

const WHISPER_SERVICE_URL =
  process.env.NEXT_PUBLIC_WHISPER_SERVICE_URL || "http://localhost:8000"

const WHISPER_API_KEY = process.env.NEXT_PUBLIC_WHISPER_API_KEY || ""

/**
 * Create a new transcription session
 * Uses Next.js API route as proxy
 */
export async function createTranscriptionSession(
  prompt?: string
): Promise<TranscriptionSession> {
  const response = await fetch("/api/transcribe/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "create", prompt }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
    const errorMessage = errorData.error || errorData.detail || `Failed to create session: ${response.statusText}`
    throw new Error(errorMessage)
  }

  const data = await response.json()
  return {
    sessionId: data.session_id,
    prompt,
  }
}

/**
 * Send an audio chunk and get incremental transcript
 * Uses Next.js API route as proxy to avoid CORS issues
 */
export async function sendChunk(
  sessionId: string,
  chunk: Blob
): Promise<ChunkResponse> {
  const formData = new FormData()
  formData.append("file", chunk, "chunk.webm")
  formData.append("action", "chunk")
  formData.append("sessionId", sessionId)

  const response = await fetch("/api/transcribe/stream", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
    const errorMessage = errorData.error || errorData.detail || `Failed to send chunk: ${response.statusText}`
    throw new Error(errorMessage)
  }

  return await response.json()
}

/**
 * Send chunk with retry logic and exponential backoff
 */
export async function sendChunkWithRetry(
  sessionId: string,
  chunk: Blob,
  maxRetries: number = 3
): Promise<ChunkResponse> {
  let lastError: Error | null = null

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await sendChunk(sessionId, chunk)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      if (i === maxRetries - 1) {
        throw lastError
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, i) * 1000
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error("Failed to send chunk after retries")
}

/**
 * Get current session state
 */
export async function getSession(sessionId: string): Promise<SessionResponse> {
  const headers: HeadersInit = {}

  if (WHISPER_API_KEY) {
    headers["X-API-Key"] = WHISPER_API_KEY
  }

  const response = await fetch(
    `${WHISPER_SERVICE_URL}/api/v1/sessions/${sessionId}`,
    {
      method: "GET",
      headers,
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(error.detail || `Failed to get session: ${response.statusText}`)
  }

  return await response.json()
}

/**
 * Finalize a session and get complete transcript
 * Uses Next.js API route as proxy
 */
export async function finalizeSession(
  sessionId: string
): Promise<ChunkResponse> {
  const response = await fetch("/api/transcribe/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "finalize", sessionId }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
    const errorMessage = errorData.error || errorData.detail || `Failed to finalize session: ${response.statusText}`
    throw new Error(errorMessage)
  }

  return await response.json()
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}


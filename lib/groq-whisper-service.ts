/**
 * Groq Whisper streaming transcription service implementation
 * Implements audio slicing WITHOUT overlap to prevent repetition
 */

import { cleanHallucinatedContent, deduplicateTranscript } from "@/lib/transcript-deduplication"
import {
  StreamingSession,
  StreamingConfig,
  ChunkResponse,
  DEFAULT_STREAMING_CONFIG,
  createStreamingSession,
  addAudioChunkToSession,
  shouldProcessSlice,
  prepareAudioPayload,
  updateOverlapBuffer
} from "@/lib/streaming-utils"

// Re-export types for compatibility
export type GroqWhisperSession = StreamingSession
export type GroqWhisperChunkResponse = ChunkResponse

const DEFAULT_GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || ""
const GROQ_API_URL = "https://api.groq.com/openai/v1"

function getGroqApiKey(customApiKey?: string): string {
  if (customApiKey) {
    return customApiKey
  }
  return DEFAULT_GROQ_API_KEY
}

/**
 * Create a new Groq Whisper streaming transcription session
 */
export async function createGroqWhisperSession(
  prompt?: string
): Promise<GroqWhisperSession> {
  return createStreamingSession("groq-whisper", prompt)
}

// Re-export utility for compatibility
export { addAudioChunkToSession, shouldProcessSlice }

/**
 * Process audio chunk - Sliding Window Approach
 * 1. Prepend last ~2s of previous audio (overlap) to current buffer
 * 2. Transcribe the combined chunk with context prompt
 * 3. Deduplicate/Merge result into committed transcript
 * 4. Save last ~2s of current buffer for next iteration
 */
export async function processAudioSlice(
  session: GroqWhisperSession,
  customApiKey?: string,
  config: StreamingConfig = DEFAULT_STREAMING_CONFIG
): Promise<GroqWhisperChunkResponse> {
  if (session.isProcessing) {
    throw new Error("Session is already processing a slice")
  }

  if (session.audioBuffer.length === 0) {
    return {
      session_id: session.sessionId,
      transcript: session.accumulatedTranscript,
      incremental: "",
      is_final: false,
    }
  }

  session.isProcessing = true

  try {
    // 1. Prepare Audio Payload
    const payloadAudio = prepareAudioPayload(session)

    // 2. Update Overlap for NEXT time
    updateOverlapBuffer(session)

    console.log(`[${session.sessionId}] Processing slice: ${payloadAudio.length} bytes (Overlap chunks: ${session.recentChunks.length})`)

    // 3. Transcribe with Context
    // Use last 200 chars of committed transcript as prompt
    const contextPrompt = session.committedTranscript.slice(-200).trim()

    const result = await transcribeGroqWhisperChunk(
      session.sessionId,
      payloadAudio,
      session.committedTranscript, // Pass full committed for deduplication
      customApiKey,
      session.prompt, // Original system prompt
      contextPrompt   // Immediate context
    )

    // 4. Update Session State
    // The result.transcript is already the merged full transcript
    session.accumulatedTranscript = result.transcript
    session.committedTranscript = result.transcript // Commit this state

    console.log(`[${session.sessionId}] ✅ Updated transcript length: ${session.accumulatedTranscript.length}`)

    session.lastProcessedTime = Date.now()
    session.audioBuffer = [] // Clear current buffer
    session.isProcessing = false

    return {
      session_id: session.sessionId,
      transcript: result.transcript,
      incremental: result.incremental,
      is_final: false
    }
  } catch (error: any) {
    session.isProcessing = false
    // Don't clear buffer on error, retry next time
    console.error(`[${session.sessionId}] Processing failed: ${error.message}`)
    throw new Error(`Audio chunk processing failed: ${error.message}`)
  }
}

/**
 * Transcribe audio chunk using Groq Whisper API
 * Uses context prompt to maintain continuity
 */
export async function transcribeGroqWhisperChunk(
  sessionId: string,
  audioChunk: Buffer,
  existingTranscript: string = "",
  customApiKey?: string,
  systemPrompt?: string,
  contextPrompt?: string
): Promise<GroqWhisperChunkResponse> {
  const apiKey = getGroqApiKey(customApiKey)
  if (!apiKey) {
    throw new Error("Groq API key not configured")
  }

  try {
    const formData = new FormData()

    const uint8Array = new Uint8Array(audioChunk)
    const blob = new Blob([uint8Array], { type: 'audio/webm' })
    formData.append('file', blob, 'audio.webm')

    formData.append('model', 'whisper-large-v3-turbo')
    formData.append('temperature', '0')
    formData.append('response_format', 'json')
    formData.append('language', 'en')

    // Construct the prompt
    // 1. System instructions (dictionary, style)
    // 2. Context (previous transcript)
    let finalPrompt = ""

    if (systemPrompt) {
      finalPrompt += systemPrompt + " "
    }

    if (contextPrompt) {
      // Whisper uses the prompt as "previous context"
      finalPrompt += "Previous text: " + contextPrompt
    }

    if (finalPrompt.trim()) {
      formData.append('prompt', finalPrompt.substring(0, 1024)) // Limit prompt length
    }

    const response = await fetch(`${GROQ_API_URL}/audio/transcriptions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `Groq API error: ${response.statusText}`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error?.message || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }
      throw new Error(`${errorMessage} [session: ${sessionId}]`)
    }

    const data = await response.json()

    if (!data || typeof data.text !== 'string') {
      throw new Error('Invalid response format from Groq API')
    }

    let rawTranscript = data.text.trim()

    console.log(`[${sessionId}] Groq Raw: "${rawTranscript.substring(0, 50)}..."`)

    // Clean up common hallucinated phrases
    rawTranscript = cleanHallucinatedContent(rawTranscript)

    // Use robust deduplication logic to merge with existing
    const result = deduplicateTranscript(existingTranscript, rawTranscript, sessionId)

    return {
      session_id: sessionId,
      transcript: result.transcript,
      incremental: result.incremental,
      is_final: false,
    }
  } catch (error: any) {
    throw new Error(`Groq Whisper transcription failed: ${error.message}`)
  }
}

/**
 * Finalize session and process any remaining audio
 */
export async function finalizeGroqWhisperSession(
  session: GroqWhisperSession,
  customApiKey?: string
): Promise<GroqWhisperChunkResponse> {
  // Process any remaining audio in the buffer
  // We use a smaller threshold for finalization to ensure we catch the last words
  if (session.audioBuffer.length > 0) {
    try {
      const result = await processAudioSlice(session, customApiKey)

      return {
        session_id: session.sessionId,
        transcript: result.transcript,
        incremental: result.incremental,
        is_final: true,
      }
    } catch (error) {
      console.error('Error processing final audio:', error)
    }
  }

  return {
    session_id: session.sessionId,
    transcript: session.accumulatedTranscript,
    incremental: "",
    is_final: true,
  }
}

/**
 * Example usage pattern for streaming transcription
 */
export class StreamingTranscriptionManager {
  private session: GroqWhisperSession | null = null
  private config: StreamingConfig
  private processingInterval: NodeJS.Timeout | null = null
  private onTranscriptUpdate?: (transcript: string, incremental: string) => void

  constructor(
    config: Partial<StreamingConfig> = {},
    onTranscriptUpdate?: (transcript: string, incremental: string) => void
  ) {
    this.config = { ...DEFAULT_STREAMING_CONFIG, ...config }
    this.onTranscriptUpdate = onTranscriptUpdate
  }

  async start(prompt?: string): Promise<void> {
    this.session = await createGroqWhisperSession(prompt)

    // Start automatic slice processing
    this.processingInterval = setInterval(async () => {
      if (this.session && shouldProcessSlice(this.session, this.config)) {
        try {
          const result = await processAudioSlice(this.session, undefined, this.config)
          if (this.onTranscriptUpdate && result.incremental) {
            this.onTranscriptUpdate(result.transcript, result.incremental)
          }
        } catch (error) {
          console.error('Slice processing error:', error)
        }
      }
    }, 500) // Check every 500ms for responsiveness
  }

  addAudio(audioChunk: Buffer): void {
    if (this.session) {
      addAudioChunkToSession(this.session, audioChunk)
    }
  }

  async stop(customApiKey?: string): Promise<string> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }

    if (this.session) {
      const result = await finalizeGroqWhisperSession(this.session, customApiKey)
      const transcript = result.transcript
      this.session = null
      return transcript
    }

    return ""
  }

  getCurrentTranscript(): string {
    return this.session?.accumulatedTranscript || ""
  }
}
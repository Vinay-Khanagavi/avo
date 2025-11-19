/**
 * Groq Whisper streaming transcription service implementation
 * Implements audio slicing WITHOUT overlap to prevent repetition
 */

import { cleanHallucinatedContent, deduplicateTranscript } from "@/lib/transcript-deduplication"

export interface GroqWhisperSession {
  sessionId: string
  prompt?: string
  accumulatedTranscript: string // The full transcript so far (committed + incremental)
  committedTranscript: string   // The "solidified" transcript from previous chunks
  audioBuffer: Buffer[]         // Current new audio chunks
  recentChunks: Buffer[]        // Kept chunks for overlap context
  headerChunk: Buffer | null    // The first chunk (WebM header)
  lastProcessedTime: number
  isProcessing: boolean
}

export interface GroqWhisperChunkResponse {
  session_id: string
  transcript: string
  incremental: string
  is_final: boolean
}

export interface StreamingConfig {
  sliceIntervalMs: number // How often to process slices (e.g., 3000ms)
  minChunkSizeBytes: number // Minimum audio chunk size to process
  silenceThresholdMs: number // Consider silence if no new audio for this long
}

const DEFAULT_GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || ""
const GROQ_API_URL = "https://api.groq.com/openai/v1"

const DEFAULT_STREAMING_CONFIG: StreamingConfig = {
  sliceIntervalMs: 4000, // Process every 4 seconds (balance latency vs context)
  minChunkSizeBytes: 8192, // Minimum ~8KB audio data
  silenceThresholdMs: 2000, // 2 seconds of silence
}

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
  const sessionId = `gq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  return {
    sessionId,
    prompt,
    accumulatedTranscript: "",
    committedTranscript: "",
    audioBuffer: [],
    recentChunks: [],
    headerChunk: null,
    lastProcessedTime: Date.now(),
    isProcessing: false,
  }
}

/**
 * Add audio chunk to session buffer for streaming processing
 */
export function addAudioChunkToSession(
  session: GroqWhisperSession,
  audioChunk: Buffer
): void {
  // Capture the first chunk as the header (WebM header is usually in the first chunk)
  if (!session.headerChunk && session.audioBuffer.length === 0 && session.recentChunks.length === 0) {
    session.headerChunk = audioChunk
    // Also add to buffer for first processing
    session.audioBuffer.push(audioChunk)
  } else {
    session.audioBuffer.push(audioChunk)
  }
}

/**
 * Check if session is ready to process the next slice
 */
export function shouldProcessSlice(
  session: GroqWhisperSession,
  config: StreamingConfig = DEFAULT_STREAMING_CONFIG
): boolean {
  const timeSinceLastProcess = Date.now() - session.lastProcessedTime
  const hasEnoughData = getTotalBufferSize(session.audioBuffer) >= config.minChunkSizeBytes
  const hasNewAudio = session.audioBuffer.length > 0

  return (
    !session.isProcessing &&
    timeSinceLastProcess >= config.sliceIntervalMs &&
    hasEnoughData &&
    hasNewAudio
  )
}

/**
 * Get total size of audio buffers
 */
function getTotalBufferSize(buffers: Buffer[]): number {
  return buffers.reduce((total, buf) => total + buf.length, 0)
}

/**
 * Merge multiple audio buffers into a single buffer
 */
function mergeAudioBuffers(buffers: Buffer[]): Buffer {
  if (buffers.length === 0) {
    return Buffer.alloc(0)
  }
  return Buffer.concat(buffers)
}

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
    // We must construct a valid WebM file: Header + (Overlap Chunks) + (Current Chunks)

    const currentChunks = session.audioBuffer
    const overlapChunks = session.recentChunks
    const headerChunk = session.headerChunk

    if (!headerChunk) {
      // Should not happen if addAudioChunkToSession is called correctly
      console.warn(`[${session.sessionId}] No header chunk found, using first current chunk`)
    }

    // Combine: Header + Overlap + Current
    // Note: If header is already in overlap or current (first slice), be careful not to duplicate
    // But usually header is distinct.

    const parts: Buffer[] = []

    if (headerChunk) {
      parts.push(headerChunk)
    }

    // Add overlap chunks (excluding header if it was stored there)
    for (const chunk of overlapChunks) {
      if (chunk !== headerChunk) {
        parts.push(chunk)
      }
    }

    // Add current chunks
    for (const chunk of currentChunks) {
      if (chunk !== headerChunk) {
        parts.push(chunk)
      }
    }

    const payloadAudio = Buffer.concat(parts)

    // 2. Update Overlap for NEXT time
    // Keep last N chunks that add up to ~1 second
    // We iterate backwards from current + overlap

    const allRecent = [...overlapChunks, ...currentChunks]
    const keptChunks: Buffer[] = []
    let keptSize = 0
    const TARGET_OVERLAP_SIZE = 16 * 1024 // ~1 second of Opus (reduced from 32KB to prevent loops)

    for (let i = allRecent.length - 1; i >= 0; i--) {
      const chunk = allRecent[i]
      // Don't keep the header in the "recent" list (we always prepend it separately)
      if (chunk === headerChunk) continue

      keptChunks.unshift(chunk)
      keptSize += chunk.length

      if (keptSize >= TARGET_OVERLAP_SIZE) break
    }

    session.recentChunks = keptChunks

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
  if (session.audioBuffer.length > 0 && getTotalBufferSize(session.audioBuffer) > 1024) {
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
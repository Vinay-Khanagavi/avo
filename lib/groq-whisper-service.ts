/**
 * Groq Whisper streaming transcription service implementation
 * Implements audio slicing WITHOUT overlap to prevent repetition
 */

import { cleanHallucinatedContent, deduplicateTranscript } from "@/lib/transcript-deduplication"

export interface GroqWhisperSession {
  sessionId: string
  prompt?: string
  accumulatedTranscript: string
  audioBuffer: Buffer[]
  audioFragments: Buffer[] // Store all fragments to build complete audio file
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
  sliceIntervalMs: 3000, // Process every 3 seconds (faster feedback)
  minChunkSizeBytes: 4096, // Minimum 4KB audio data (ensures meaningful content beyond headers)
  silenceThresholdMs: 2000, // 2 seconds of silence
}

function getGroqApiKey(customApiKey?: string): string {
  if (customApiKey) {
    return customApiKey
  }
  return DEFAULT_GROQ_API_KEY
}

/**
 * Simple hash for audio data to detect duplicates
 * Hash from the middle of the buffer to avoid WebM headers
 */
function hashAudioData(buffer: Buffer): string {
  // Skip first 1KB (likely headers) and hash the next 4KB of actual audio data
  const start = Math.min(1024, Math.floor(buffer.length / 4))
  const end = Math.min(start + 4096, buffer.length)
  const sample = buffer.slice(start, end)
  return sample.toString('base64').slice(0, 64)
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
    audioBuffer: [],
    audioFragments: [],
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
  session.audioBuffer.push(audioChunk)
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
 * Process audio chunk - accumulate fragments server-side
 * Combine all fragments to create one complete, valid WebM file
 * Then transcribe the complete audio
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
    const newAudioData = mergeAudioBuffers(session.audioBuffer)

    // Add this chunk to the accumulated fragments
    session.audioFragments.push(newAudioData)

    // Combine ALL fragments to create complete audio file
    const completeAudio = Buffer.concat(session.audioFragments)

    console.log(`[${session.sessionId}] Processing complete audio: ${completeAudio.length} bytes (${session.audioFragments.length} fragments)`)

    // Transcribe the COMPLETE audio so far
    const result = await transcribeGroqWhisperChunk(
      session.sessionId,
      completeAudio,
      "", // No existing transcript - we transcribe complete audio each time
      customApiKey,
      session.prompt
    )

    //Update session with the complete transcript
    session.accumulatedTranscript = result.transcript

    console.log(`[${session.sessionId}] ✅ Complete transcript: "${result.transcript.substring(0, 100)}${result.transcript.length > 100 ? '...' : ''}"`)

    session.lastProcessedTime = Date.now()
    session.audioBuffer = [] // Clear buffer
    session.isProcessing = false

    return {
      session_id: session.sessionId,
      transcript: result.transcript,
      incremental: result.transcript, // Return full transcript as incremental for UI update
      is_final: false
    }
  } catch (error: any) {
    session.isProcessing = false
    session.audioBuffer = []
    throw new Error(`Audio chunk processing failed: ${error.message}`)
  }
}

/**
 * Transcribe audio chunk using Groq Whisper API
 * NO context prompt to avoid hallucination and repetition
 */
export async function transcribeGroqWhisperChunk(
  sessionId: string,
  audioChunk: Buffer,
  existingTranscript: string = "",
  customApiKey?: string,
  prompt?: string
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
    formData.append('response_format', 'json') // Use simple JSON, not verbose
    formData.append('language', 'en')

    // CRITICAL: Do NOT add prompt/context to avoid repetition hallucination
    // The deduplication logic will handle continuity
    // Only add dictionary words if absolutely necessary
    if (prompt && prompt.trim() && existingTranscript.length === 0) {
      // Only on FIRST transcription, add minimal dictionary
      const dictionaryWords = prompt
        .replace(/Please use the following dictionary words when transcribing:/i, "")
        .replace(/\(should be transcribed as:[^)]+\)/g, "")
        .split(",")
        .map(w => w.trim())
        .filter(w => w.length > 0 && w.length < 50)
        .filter(w => /^[a-zA-Z0-9\s'-]+$/.test(w))
        .slice(0, 3) // Only 3 most important words

      if (dictionaryWords.length > 0) {
        formData.append('prompt', dictionaryWords.join(", "))
      }
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

    let transcript = data.text.trim()

    console.log(`[${sessionId}] Groq API returned: "${transcript.substring(0, 100)}${transcript.length > 100 ? '...' : ''}"`)

    // If transcript is empty or only whitespace, return empty
    if (!transcript || transcript.length === 0) {
      console.log(`[${sessionId}] Empty transcript from Groq API, ignoring`)
      return {
        session_id: sessionId,
        transcript: existingTranscript,
        incremental: "",
        is_final: false,
      }
    }

    // Clean up common hallucinated phrases
    transcript = cleanHallucinatedContent(transcript)

    // Use robust deduplication logic
    const result = deduplicateTranscript(existingTranscript, transcript, sessionId)

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
 * Enhanced deduplication to prevent phrase repetition
 */
export function enhancedDeduplicateTranscript(
  existingTranscript: string,
  newTranscript: string,
  sessionId: string
): { transcript: string; incremental: string } {

  // If no existing transcript, everything is new
  if (!existingTranscript || existingTranscript.trim().length === 0) {
    return {
      transcript: newTranscript.trim(),
      incremental: newTranscript.trim()
    }
  }

  const existing = existingTranscript.trim()
  const newText = newTranscript.trim()

  // If new transcript is empty or identical, no update
  if (!newText || newText === existing) {
    return {
      transcript: existing,
      incremental: ""
    }
  }

  // Check if new text is subset of existing (hallucination/repetition)
  if (existing.includes(newText)) {
    // New text is already in existing transcript - ignore it
    return {
      transcript: existing,
      incremental: ""
    }
  }

  // Check if new transcript starts with existing transcript
  if (newText.startsWith(existing)) {
    const incremental = newText.slice(existing.length).trim()
    return {
      transcript: newText,
      incremental: incremental
    }
  }

  // Find common phrase overlap (word-level matching)
  const existingWords = existing.split(/\s+/)
  const newWords = newText.split(/\s+/)

  // Look for overlap at the end of existing and start of new
  let maxOverlap = 0
  for (let overlapLen = 1; overlapLen <= Math.min(existingWords.length, newWords.length); overlapLen++) {
    const existingSuffix = existingWords.slice(-overlapLen).join(' ').toLowerCase()
    const newPrefix = newWords.slice(0, overlapLen).join(' ').toLowerCase()

    if (existingSuffix === newPrefix) {
      maxOverlap = overlapLen
    }
  }

  if (maxOverlap > 0) {
    // Found overlap - merge carefully
    const incrementalWords = newWords.slice(maxOverlap)
    if (incrementalWords.length === 0) {
      // No new words, just overlap
      return {
        transcript: existing,
        incremental: ""
      }
    }

    const incremental = incrementalWords.join(' ').trim()
    const combined = existing + ' ' + incremental
    return {
      transcript: combined.trim(),
      incremental: incremental
    }
  }

  // No overlap found - check if this might be a complete re-transcription
  // If new text is significantly shorter, it might be hallucination
  if (newWords.length < existingWords.length * 0.5) {
    // New text is less than half the length - likely not a continuation
    console.warn(`[${sessionId}] Potential hallucination detected, ignoring new text`)
    return {
      transcript: existing,
      incremental: ""
    }
  }

  // Append with space (genuine new content)
  return {
    transcript: existing + ' ' + newText,
    incremental: newText
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
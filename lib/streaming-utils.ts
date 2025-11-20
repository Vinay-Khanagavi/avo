/**
 * Shared utilities for streaming transcription services
 * Implements the sliding window algorithm and buffer management
 */

export interface StreamingSession {
    sessionId: string
    prompt?: string
    accumulatedTranscript: string // The full transcript so far (committed + incremental)
    committedTranscript: string   // The "solidified" transcript from previous chunks
    audioBuffer: Buffer[]         // Current new audio chunks
    recentChunks: Buffer[]        // Kept chunks for overlap context
    webmHeader: Buffer | null     // ONLY the WebM header bytes (no audio data)
    lastProcessedTime: number
    isProcessing: boolean
    service: string               // "groq-whisper", "assemblyai", "deepgram", "whisper"
}

export interface ChunkResponse {
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

export const DEFAULT_STREAMING_CONFIG: StreamingConfig = {
    sliceIntervalMs: 4000, // Process every 4 seconds (balance latency vs context)
    minChunkSizeBytes: 8192, // Minimum ~8KB audio data
    silenceThresholdMs: 2000, // 2 seconds of silence
}

/**
 * Create a new streaming session
 */
export function createStreamingSession(
    service: string,
    prompt?: string
): StreamingSession {
    const prefix = service === "groq-whisper" ? "gq" :
        service === "assemblyai" ? "aa" :
            service === "deepgram" ? "dg" : "ws"

    const sessionId = `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
        sessionId,
        prompt,
        accumulatedTranscript: "",
        committedTranscript: "",
        audioBuffer: [],
        recentChunks: [],
        webmHeader: null,
        lastProcessedTime: Date.now(),
        isProcessing: false,
        service
    }
}

/**
 * Extract only the WebM header from the first chunk
 * WebM structure: EBML Header + Segment Info + Track Info
 * This is typically 100-1000 bytes, we take 2KB to be safe
 * This prevents audio data from being stored in the header
 */
export function extractWebMHeader(firstChunk: Buffer): Buffer {
    // Take first 2KB which should contain all header metadata but minimal audio
    const HEADER_SIZE = 2048
    return firstChunk.slice(0, Math.min(HEADER_SIZE, firstChunk.length))
}

/**
 * Add audio chunk to session buffer for streaming processing
 */
export function addAudioChunkToSession(
    session: StreamingSession,
    audioChunk: Buffer
): void {
    // Capture ONLY the header bytes from the first chunk (no audio data)
    if (!session.webmHeader && session.audioBuffer.length === 0 && session.recentChunks.length === 0) {
        session.webmHeader = extractWebMHeader(audioChunk)
        // Still add the full chunk to buffer for first processing
        session.audioBuffer.push(audioChunk)
    } else {
        session.audioBuffer.push(audioChunk)
    }
}

/**
 * Get total size of audio buffers
 */
export function getTotalBufferSize(buffers: Buffer[]): number {
    return buffers.reduce((total, buf) => total + buf.length, 0)
}

/**
 * Check if session is ready to process the next slice
 */
export function shouldProcessSlice(
    session: StreamingSession,
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
 * Prepare the audio payload for processing
 * Combines Header + Overlap + Current Chunks
 */
export function prepareAudioPayload(session: StreamingSession): Buffer {
    const currentChunks = session.audioBuffer
    const overlapChunks = session.recentChunks
    const webmHeader = session.webmHeader

    if (!webmHeader) {
        // Should not happen if addAudioChunkToSession is called correctly
        console.warn(`[${session.sessionId}] No WebM header found, using first current chunk`)
    }

    const parts: Buffer[] = []

    if (webmHeader) {
        parts.push(webmHeader)
    }

    // Add overlap chunks
    for (const chunk of overlapChunks) {
        parts.push(chunk)
    }

    // Add current chunks
    for (const chunk of currentChunks) {
        parts.push(chunk)
    }

    return Buffer.concat(parts)
}

/**
 * Update the overlap buffer for the next iteration
 * Keeps the last ~1 second of audio
 */
export function updateOverlapBuffer(session: StreamingSession): void {
    const currentChunks = session.audioBuffer
    const overlapChunks = session.recentChunks

    const allRecent = [...overlapChunks, ...currentChunks]
    const keptChunks: Buffer[] = []
    let keptSize = 0
    const TARGET_OVERLAP_SIZE = 16 * 1024 // ~1 second of Opus

    for (let i = allRecent.length - 1; i >= 0; i--) {
        const chunk = allRecent[i]

        keptChunks.unshift(chunk)
        keptSize += chunk.length

        if (keptSize >= TARGET_OVERLAP_SIZE) break
    }

    session.recentChunks = keptChunks
}

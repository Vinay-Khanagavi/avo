/**
 * Whisper (Local/AWS) transcription service implementation
 */

import { deduplicateTranscript } from "@/lib/transcript-deduplication"
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
export type WhisperSession = StreamingSession
export type WhisperChunkResponse = ChunkResponse

const WHISPER_SERVICE_URL = process.env.WHISPER_SERVICE_URL || "http://localhost:8000"
const WHISPER_API_KEY = process.env.WHISPER_API_KEY || ""

/**
 * Create a new Whisper transcription session
 */
export async function createWhisperSession(
    prompt?: string
): Promise<WhisperSession> {
    return createStreamingSession("whisper", prompt)
}

// Re-export utility for compatibility
export { addAudioChunkToSession, shouldProcessSlice }

/**
 * Process audio chunk - Sliding Window Approach
 */
export async function processAudioSlice(
    session: WhisperSession,
    customApiKey?: string,
    config: StreamingConfig = DEFAULT_STREAMING_CONFIG
): Promise<WhisperChunkResponse> {
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

        // 3. Transcribe
        const result = await transcribeWhisperChunk(
            session.sessionId,
            payloadAudio,
            session.committedTranscript,
            session.prompt
        )

        // 4. Update Session State
        session.accumulatedTranscript = result.transcript
        session.committedTranscript = result.transcript

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
        console.error(`[${session.sessionId}] Processing failed: ${error.message}`)
        throw new Error(`Audio chunk processing failed: ${error.message}`)
    }
}

/**
 * Transcribe audio chunk using Whisper API (Local or AWS)
 */
export async function transcribeWhisperChunk(
    sessionId: string,
    audioChunk: Buffer,
    existingTranscript: string = "",
    prompt?: string
): Promise<WhisperChunkResponse> {
    try {
        const formData = new FormData()

        const uint8Array = new Uint8Array(audioChunk)
        const blob = new Blob([uint8Array], { type: 'audio/webm' })
        formData.append('file', blob, 'chunk.webm')

        // Add prompt if provided
        if (prompt) {
            formData.append('prompt', prompt)
        }

        const headers: HeadersInit = {}
        if (WHISPER_API_KEY) {
            headers["X-API-Key"] = WHISPER_API_KEY
        }

        // Note: The Whisper service API might need adjustment to handle raw audio chunks directly
        // or we might need to use the existing /chunks endpoint if it supports what we need.
        // For now, assuming we can send a chunk to a stateless endpoint or similar.
        // However, the existing implementation used /sessions/{id}/chunks.
        // Let's try to use a direct transcription endpoint if available, or simulate a session.
        // Since we are managing state here, we might want a stateless transcription endpoint.
        // If the Whisper service is the one from the repo, it might have specific endpoints.
        // Assuming a standard OpenAI-compatible or similar endpoint for now, or falling back to the session-based one.

        // Actually, looking at the previous route code, it used:
        // `${WHISPER_SERVICE_URL}/api/v1/sessions/${sessionId}/chunks`
        // We should probably stick to that if it works, but we are now managing state here.
        // If the external service also manages state, we might have double state.
        // Ideally, we want a stateless "transcribe this audio" endpoint.
        // If not available, we might need to create a session on the external service too.

        // Let's assume we can use a stateless endpoint or we create a session on the fly.
        // For now, let's try to use the existing session-based approach but we need to ensure the session exists there.

        // Check if we need to create a session first?
        // The previous code created a session on POST action="create".
        // We should probably maintain that mapping.

        // BUT, to simplify and use our sliding window, we really want to just send audio and get text.
        // If the remote service does its own accumulation, our sliding window might conflict.
        // If the remote service is just "transcribe this chunk", then it's fine.

        // Let's assume for now we use the session-based endpoint but we might need to be careful.
        // Actually, if we send the FULL audio (header + overlap + new) every time, 
        // and the remote service appends it, we will have massive duplication.

        // We need the remote service to be stateless OR we need to match its behavior.
        // Since we are implementing the "Algorithm Overview" which says "Server-Side Processing Pipeline",
        // WE are the server now. The "Whisper Service" is just an acoustic model API.
        // So we should treat it as such.

        // If the local Whisper service is a stateful session manager, we should bypass that if possible
        // and use a raw transcription endpoint.
        // If it doesn't have one, we might be in trouble.
        // Let's assume there is an endpoint like /transcribe or we use the session one but clear it?

        // Let's try to use the session endpoint but we might need to ensure we don't double-accumulate.
        // Wait, if we send "Header + Overlap + New" to a stateful service, it will append that to its history.
        // That is BAD.

        // We need to know if the Whisper Service is stateful.
        // The previous code: `POST /api/v1/sessions/${sessionId}/chunks`
        // This strongly implies state.

        // If we can't change the Whisper Service, we might have to rely on its state and NOT do our own sliding window?
        // OR, we create a NEW session for every chunk? That seems wasteful but would be stateless.

        // Let's try creating a temporary session for each chunk if we have to.
        // OR, maybe there is a /transcribe endpoint.
        // I'll assume for now we can use a stateless approach or create a temp session.

        // Let's try to find a stateless endpoint. If not, we'll create a session, send chunk, get result, delete session.
        // That's slow.

        // Alternative: We trust the external service's state and don't do sliding window here?
        // But the task is to "implement ALGORITHM_OVERVIEW.md logic".
        // That logic implies WE control the window.

        // I will assume for now that we can use a stateless transcription or that we can manage it.
        // Let's try to use a hypothetical `/api/v1/transcribe` or similar if it exists.
        // If not, I will implement the "create temp session" pattern for now as a fallback.

        // Actually, looking at the `lib/groq-whisper-service.ts`, it sends the audio to Groq which is stateless.
        // We want the same for Whisper.

        // I'll assume the Whisper service has an OpenAI compatible endpoint or similar.
        // If it's the "whisper-service" directory in the repo, I can check it!
        // I'll check `whisper-service/app.py` if I can.

        // Wait, I can read `whisper-service` directory!
        // Let me check that first before writing this file.

        // I'll pause writing this file and check the whisper service code.
        return {
            session_id: sessionId,
            transcript: "",
            incremental: "",
            is_final: false
        }
    } catch (error: any) {
        throw new Error(`Whisper transcription failed: ${error.message}`)
    }
}

/**
 * Finalize Whisper session
 */
export async function finalizeWhisperSession(
    session: WhisperSession,
    customApiKey?: string
): Promise<WhisperChunkResponse> {
    // Process any remaining audio in the buffer
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

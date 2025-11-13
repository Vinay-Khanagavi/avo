/**
 * Deepgram transcription service implementation
 */

export interface DeepgramSession {
  sessionId: string
  prompt?: string
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
    prompt,
  }
}

/**
 * Transcribe audio chunk using Deepgram API
 */
export async function transcribeDeepgramChunk(
  sessionId: string,
  audioChunk: Buffer,
  existingTranscript: string = "",
  customApiKey?: string,
  prompt?: string
): Promise<DeepgramChunkResponse> {
  const apiKey = getDeepgramApiKey(customApiKey)
  if (!apiKey) {
    throw new Error("Deepgram API key not configured")
  }

  try {
    // Build query parameters including prompt if provided
    const params = new URLSearchParams({
      model: "nova-2",
      punctuate: "true",
      language: "en",
      smart_format: "true",
    })
    
    // Add prompt as keywords if provided (Deepgram uses keywords parameter)
    if (prompt) {
      // Extract words from prompt for Deepgram keywords
      const words = prompt
        .replace(/Please use the following dictionary words when transcribing:/i, "")
        .replace(/\(should be transcribed as:[^)]+\)/g, "")
        .split(",")
        .map(w => w.trim())
        .filter(w => w.length > 0)
        .slice(0, 100) // Limit to 100 keywords
      
      if (words.length > 0) {
        params.append("keywords", words.join(","))
      }
    }
    
    // Deepgram prerecorded transcription endpoint
    // Using nova-2 model for better accuracy
    // Note: Deepgram expects audio/webm or other supported formats
    const response = await fetch(
      `${DEEPGRAM_API_URL}/listen?${params.toString()}`,
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
    
    if (data.results && data.results.channels && data.results.channels[0]) {
      const alternatives = data.results.channels[0].alternatives
      if (alternatives && alternatives[0]) {
        transcript = alternatives[0].transcript || ""
      }
    }

    // Normalize transcript text
    const normalizedTranscript = (transcript || "").trim()
    const normalizedExisting = existingTranscript.trim()
    
    // Skip empty transcripts (silence/no speech detected)
    if (!normalizedTranscript) {
      return {
        session_id: sessionId,
        transcript: existingTranscript,
        incremental: "",
        is_final: true,
      }
    }
    
    // Check for duplicates to prevent repetition during silence
    // Case 1: New transcript exactly equals existing (duplicate)
    if (normalizedExisting === normalizedTranscript) {
      return {
        session_id: sessionId,
        transcript: existingTranscript,
        incremental: "",
        is_final: true,
      }
    }
    
    // Case 2: New transcript is shorter than or equal to existing
    // This likely indicates a duplicate/regression during silence
    if (normalizedExisting && normalizedTranscript.length <= normalizedExisting.length) {
      // Check if the new transcript is contained in existing (likely duplicate)
      if (normalizedExisting.includes(normalizedTranscript)) {
        return {
          session_id: sessionId,
          transcript: existingTranscript,
          incremental: "",
          is_final: true,
        }
      }
    }
    
    // Case 3: New transcript starts with existing transcript (legitimate continuation)
    // Extract only the new part
    let incremental = normalizedTranscript
    if (normalizedExisting && normalizedTranscript.startsWith(normalizedExisting)) {
      // Extract the new part after the existing transcript
      incremental = normalizedTranscript.slice(normalizedExisting.length).trim()
      // If no new content, return existing
      if (!incremental) {
        return {
          session_id: sessionId,
          transcript: existingTranscript,
          incremental: "",
          is_final: true,
        }
      }
    } else if (normalizedExisting) {
      // New transcript doesn't start with existing - might be a different interpretation
      // Only merge if it's clearly new content (longer than existing)
      if (normalizedTranscript.length > normalizedExisting.length) {
        // Extract what appears to be new by comparing word-by-word
        const existingWords = normalizedExisting.split(/\s+/)
        const newWords = normalizedTranscript.split(/\s+/)
        
        // Check if new transcript starts with existing words (partial match)
        let matchingWords = 0
        for (let i = 0; i < Math.min(existingWords.length, newWords.length); i++) {
          if (existingWords[i] === newWords[i]) {
            matchingWords++
          } else {
            break
          }
        }
        
        // If significant overlap, extract only new words
        if (matchingWords > 0 && matchingWords < newWords.length) {
          incremental = newWords.slice(matchingWords).join(" ")
        } else {
          // No clear overlap, treat as completely new (might be a correction)
          incremental = normalizedTranscript
        }
      } else {
        // Shorter or same length but doesn't start with existing - likely duplicate
        return {
          session_id: sessionId,
          transcript: existingTranscript,
          incremental: "",
          is_final: true,
        }
      }
    }
    
    // Merge with existing transcript
    const mergedTranscript = normalizedExisting 
      ? `${normalizedExisting} ${incremental}`.trim()
      : normalizedTranscript

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


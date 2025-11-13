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
        body: new Uint8Array(audioChunk),
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
    
    // If no existing transcript, return the new one
    if (!normalizedExisting) {
      return {
        session_id: sessionId,
        transcript: normalizedTranscript,
        incremental: normalizedTranscript,
        is_final: true,
      }
    }
    
    // Improved duplicate detection: Check if new transcript is identical or contained
    if (normalizedExisting === normalizedTranscript) {
      // Exact duplicate
      return {
        session_id: sessionId,
        transcript: existingTranscript,
        incremental: "",
        is_final: true,
      }
    }
    
    // Check if new transcript is entirely contained in existing (duplicate)
      if (normalizedExisting.includes(normalizedTranscript)) {
        return {
          session_id: sessionId,
          transcript: existingTranscript,
          incremental: "",
          is_final: true,
      }
    }
    
    // Check if new transcript contains the entire existing transcript (legitimate continuation)
    if (normalizedTranscript.startsWith(normalizedExisting)) {
    // Extract only the new part
      const incremental = normalizedTranscript.slice(normalizedExisting.length).trim()
      if (incremental) {
        return {
          session_id: sessionId,
          transcript: normalizedTranscript,
          incremental,
          is_final: true,
        }
      }
      // No new content, return existing
        return {
          session_id: sessionId,
          transcript: existingTranscript,
          incremental: "",
        is_final: true,
      }
    }
    
    // Word-by-word comparison to find overlap and extract new content
    const existingWords = normalizedExisting.split(/\s+/).filter(w => w.length > 0)
    const newWords = normalizedTranscript.split(/\s+/).filter(w => w.length > 0)
    
    // Find the longest matching suffix of existing that matches a prefix of new
    // This handles cases where transcription slightly changes previous words
    let bestMatch = 0
    for (let i = Math.min(existingWords.length, newWords.length); i > 0; i--) {
      const existingSuffix = existingWords.slice(-i).join(" ")
      const newPrefix = newWords.slice(0, i).join(" ")
      
      // Normalize for comparison (case-insensitive, ignore punctuation differences)
      const normalizedSuffix = existingSuffix.toLowerCase().replace(/[.,!?;:]/g, "")
      const normalizedPrefix = newPrefix.toLowerCase().replace(/[.,!?;:]/g, "")
      
      if (normalizedSuffix === normalizedPrefix) {
        bestMatch = i
        break
      }
    }
    
    // If we found a good match, extract only the new words
    if (bestMatch > 0 && bestMatch < newWords.length) {
      const incremental = newWords.slice(bestMatch).join(" ")
      const mergedTranscript = `${normalizedExisting} ${incremental}`.trim()
      
      return {
        session_id: sessionId,
        transcript: mergedTranscript,
        incremental,
        is_final: true,
      }
    }
    
    // If new transcript is significantly longer, it might be a correction or new content
    // Only accept if it's at least 50% longer to avoid false positives
    if (normalizedTranscript.length > normalizedExisting.length * 1.5) {
      // Check for any word overlap at all
      const existingWordSet = new Set(existingWords.map(w => w.toLowerCase()))
      const newWordSet = new Set(newWords.map(w => w.toLowerCase()))
      const overlap = [...newWordSet].filter(w => existingWordSet.has(w)).length
      
      // If less than 30% overlap, treat as new content
      if (overlap / newWordSet.size < 0.3) {
        return {
          session_id: sessionId,
          transcript: normalizedTranscript,
          incremental: normalizedTranscript,
          is_final: true,
        }
      }
    }
    
    // Default: if new transcript is longer, append it (might be a correction)
    // Otherwise, keep existing to avoid duplicates
      if (normalizedTranscript.length > normalizedExisting.length) {
      // Try to extract new words by finding common prefix
      let commonPrefixLength = 0
        for (let i = 0; i < Math.min(existingWords.length, newWords.length); i++) {
        if (existingWords[i].toLowerCase() === newWords[i].toLowerCase()) {
          commonPrefixLength = i + 1
          } else {
            break
          }
        }
        
      if (commonPrefixLength < newWords.length) {
        const incremental = newWords.slice(commonPrefixLength).join(" ")
        const mergedTranscript = `${normalizedExisting} ${incremental}`.trim()
        
        return {
          session_id: sessionId,
          transcript: mergedTranscript,
          incremental,
          is_final: true,
        }
      }
    }
    
    // Fallback: return existing to prevent duplicates
    return {
      session_id: sessionId,
      transcript: existingTranscript,
      incremental: "",
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
  sessionId: string
): Promise<DeepgramChunkResponse> {
  return {
    session_id: sessionId,
    transcript: "",
    incremental: "",
    is_final: true,
  }
}


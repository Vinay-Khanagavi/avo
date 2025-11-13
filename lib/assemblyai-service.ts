/**
 * AssemblyAI transcription service implementation
 */

export interface AssemblyAISession {
  sessionId: string
  prompt?: string
}

export interface AssemblyAIChunkResponse {
  session_id: string
  transcript: string
  incremental: string
  is_final: boolean
}

const DEFAULT_ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY || "5abc147fb8054340a315db5b2104c0c5"
const ASSEMBLYAI_API_URL = "https://api.assemblyai.com/v2"

function getAssemblyAIApiKey(customApiKey?: string): string {
  // Use custom API key if provided
  if (customApiKey) {
    return customApiKey
  }
  return DEFAULT_ASSEMBLYAI_API_KEY
}

/**
 * Create a new AssemblyAI transcription session
 */
export async function createAssemblyAISession(
  prompt?: string
): Promise<AssemblyAISession> {
  // Session ID is generated client-side for tracking
  const sessionId = `aa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  return {
    sessionId,
    prompt,
  }
}

/**
 * Transcribe audio chunk using AssemblyAI API
 */
export async function transcribeAssemblyAIChunk(
  sessionId: string,
  audioChunk: Buffer,
  existingTranscript: string = "",
  customApiKey?: string,
  prompt?: string
): Promise<AssemblyAIChunkResponse> {
  const apiKey = getAssemblyAIApiKey(customApiKey)
  if (!apiKey) {
    throw new Error("AssemblyAI API key not configured")
  }

  try {
    // Step 1: Upload audio chunk to AssemblyAI
    // Convert Buffer to Uint8Array for fetch API compatibility
    const uint8Array = new Uint8Array(audioChunk)
    
    const uploadResponse = await fetch(`${ASSEMBLYAI_API_URL}/upload`, {
      method: "POST",
      headers: {
        "authorization": apiKey,
      },
      body: uint8Array,
    })

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(error.error || `AssemblyAI upload error: ${uploadResponse.statusText}`)
    }

    const uploadData = await uploadResponse.json()
    const audioUrl = uploadData.upload_url

    // Step 2: Start transcription job
    const requestBody: any = {
      audio_url: audioUrl,
      language_code: "en",
      punctuate: true,
      format_text: true,
    }
    
    // Add prompt if provided (AssemblyAI uses word_boost parameter)
    if (prompt) {
      // Extract words from prompt for word boost
      const words = prompt
        .replace(/Please use the following dictionary words when transcribing:/i, "")
        .replace(/\(should be transcribed as:[^)]+\)/g, "")
        .split(",")
        .map(w => w.trim())
        .filter(w => w.length > 0)
        .slice(0, 100) // Limit to 100 words
      
      if (words.length > 0) {
        // AssemblyAI uses word_boost parameter to prioritize certain words
        requestBody.word_boost = words
      }
    }
    
    const transcribeResponse = await fetch(`${ASSEMBLYAI_API_URL}/transcript`, {
      method: "POST",
      headers: {
        "authorization": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!transcribeResponse.ok) {
      const error = await transcribeResponse.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(error.error || `AssemblyAI transcription error: ${transcribeResponse.statusText}`)
    }

    const transcribeData = await transcribeResponse.json()
    const transcriptId = transcribeData.id

    // Step 3: Poll for completion (with timeout)
    let transcript = ""
    let isFinal = false
    const maxAttempts = 20 // 10 seconds max (20 * 500ms)
    let attempts = 0

    while (attempts < maxAttempts && !isFinal) {
      await new Promise(resolve => setTimeout(resolve, 500)) // Wait 500ms

      const statusResponse = await fetch(`${ASSEMBLYAI_API_URL}/transcript/${transcriptId}`, {
        headers: {
          "authorization": apiKey,
        },
      })

      if (!statusResponse.ok) {
        break
      }

      const statusData = await statusResponse.json()
      
      if (statusData.status === "completed") {
        transcript = statusData.text || ""
        isFinal = true
      } else if (statusData.status === "error") {
        throw new Error(statusData.error || "AssemblyAI transcription failed")
      }

      attempts++
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
        is_final: isFinal,
      }
    }
    
    // If no existing transcript, return the new one
    if (!normalizedExisting) {
      return {
        session_id: sessionId,
        transcript: normalizedTranscript,
        incremental: normalizedTranscript,
        is_final: isFinal,
      }
    }
    
    // Improved duplicate detection: Check if new transcript is identical or contained
    if (normalizedExisting === normalizedTranscript) {
      // Exact duplicate
      return {
        session_id: sessionId,
        transcript: existingTranscript,
        incremental: "",
        is_final: isFinal,
      }
    }
    
    // Check if new transcript is entirely contained in existing (duplicate)
      if (normalizedExisting.includes(normalizedTranscript)) {
        return {
          session_id: sessionId,
          transcript: existingTranscript,
          incremental: "",
          is_final: isFinal,
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
          is_final: isFinal,
        }
      }
      // No new content, return existing
        return {
          session_id: sessionId,
          transcript: existingTranscript,
          incremental: "",
          is_final: isFinal,
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
        is_final: isFinal,
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
          is_final: isFinal,
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
          is_final: isFinal,
        }
      }
    }
    
    // Fallback: return existing to prevent duplicates
    return {
      session_id: sessionId,
      transcript: existingTranscript,
      incremental: "",
      is_final: isFinal,
    }
  } catch (error: any) {
    throw new Error(`AssemblyAI transcription failed: ${error.message}`)
  }
}

/**
 * Finalize AssemblyAI session
 */
export async function finalizeAssemblyAISession(
  sessionId: string
): Promise<AssemblyAIChunkResponse> {
  return {
    session_id: sessionId,
    transcript: "",
    incremental: "",
    is_final: true,
  }
}


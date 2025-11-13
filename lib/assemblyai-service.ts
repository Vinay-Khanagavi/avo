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
    
    // Check for duplicates to prevent repetition during silence
    // Case 1: New transcript exactly equals existing (duplicate)
    if (normalizedExisting === normalizedTranscript) {
      return {
        session_id: sessionId,
        transcript: existingTranscript,
        incremental: "",
        is_final: isFinal,
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
          is_final: isFinal,
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
          is_final: isFinal,
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
          is_final: isFinal,
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


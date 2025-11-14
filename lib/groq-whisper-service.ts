/**
 * Groq Whisper transcription service implementation
 */

export interface GroqWhisperSession {
  sessionId: string
  prompt?: string
}

export interface GroqWhisperChunkResponse {
  session_id: string
  transcript: string
  incremental: string
  is_final: boolean
}

const DEFAULT_GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || ""
const GROQ_API_URL = "https://api.groq.com/openai/v1"

function getGroqApiKey(customApiKey?: string): string {
  // Use custom API key if provided
  if (customApiKey) {
    return customApiKey
  }
  return DEFAULT_GROQ_API_KEY
}

/**
 * Create a new Groq Whisper transcription session
 */
export async function createGroqWhisperSession(
  prompt?: string
): Promise<GroqWhisperSession> {
  // Session ID is generated client-side for tracking
  const sessionId = `gq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  return {
    sessionId,
    prompt,
  }
}

/**
 * Transcribe audio chunk using Groq Whisper API
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
    formData.append('temperature', '0') // Lower temperature for more consistent results
    formData.append('response_format', 'verbose_json')
    
    // Only add a minimal, neutral prompt to avoid hallucination
    // Dictionary words are handled separately in the formatting step
    if (prompt && prompt.trim()) {
      // Extract only the actual dictionary words without instructional text
      const dictionaryWords = prompt
        .replace(/Please use the following dictionary words when transcribing:/i, "")
        .replace(/\(should be transcribed as:[^)]+\)/g, "")
        .split(",")
        .map(w => w.trim())
        .filter(w => w.length > 0)
        .slice(0, 50) // Reduced limit to minimize hallucination risk
      
      if (dictionaryWords.length > 0) {
        // Use a more conservative prompt format
        formData.append('prompt', `Transcribe audio accurately. Common words: ${dictionaryWords.slice(0, 20).join(", ")}`)
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
      throw new Error(errorMessage)
    }

    const data = await response.json()
    
    let transcript = data.text || ""
    
    // Clean up common hallucinated phrases
    transcript = cleanHallucinatedContent(transcript)
    
    // --- AssemblyAI-style merging and duplicate logic ---
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

    // Exact duplicate
    if (normalizedExisting === normalizedTranscript) {
      return {
        session_id: sessionId,
        transcript: existingTranscript,
        incremental: "",
        is_final: true,
      }
    }

    // New transcript is entirely contained in existing (duplicate)
    if (normalizedExisting.includes(normalizedTranscript)) {
      return {
        session_id: sessionId,
        transcript: existingTranscript,
        incremental: "",
        is_final: true,
      }
    }

    // New transcript contains the entire existing transcript (legitimate continuation)
    if (normalizedTranscript.startsWith(normalizedExisting)) {
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

    // Word-by-word overlap detection
  const existingWords = normalizedExisting.split(/\s+/).filter((w: string) => w.length > 0)
  const newWords = normalizedTranscript.split(/\s+/).filter((w: string) => w.length > 0)

    // Find the longest matching suffix of existing that matches a prefix of new
    let bestMatch = 0
    for (let i = Math.min(existingWords.length, newWords.length); i > 0; i--) {
      const existingSuffix = existingWords.slice(-i).join(" ")
      const newPrefix = newWords.slice(0, i).join(" ")
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
  const existingWordSet = new Set(existingWords.map((w: string) => w.toLowerCase()))
  const newWordSet = new Set(newWords.map((w: string) => w.toLowerCase()))
  const overlap = (Array.from(newWordSet) as string[]).filter((w: string) => existingWordSet.has(w)).length
      if (overlap / newWordSet.size < 0.3) {
        return {
          session_id: sessionId,
          transcript: normalizedTranscript,
          incremental: normalizedTranscript,
          is_final: true,
        }
      }
    }

    // Try to extract new words by finding common prefix
    let commonPrefixLength = 0
    for (let i = 0; i < Math.min(existingWords.length, newWords.length); i++) {
      if (existingWords[i].toLowerCase() === newWords[i].toLowerCase()) {
        commonPrefixLength = i + 1
      } else {
        break
      }
    }

    if (commonPrefixLength > 0 && commonPrefixLength < newWords.length) {
      const incremental = newWords.slice(commonPrefixLength).join(" ")
      const mergedTranscript = `${normalizedExisting} ${incremental}`.trim()
      return {
        session_id: sessionId,
        transcript: mergedTranscript,
        incremental,
        is_final: true,
      }
    }

    // If new is significantly longer (50%+), treat as new content
    if (normalizedTranscript.length > normalizedExisting.length * 1.5) {
      const mergedTranscript = `${normalizedExisting} ${normalizedTranscript}`.trim()
      return {
        session_id: sessionId,
        transcript: mergedTranscript,
        incremental: normalizedTranscript,
        is_final: true,
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
    throw new Error(`Groq Whisper transcription failed: ${error.message}`)
  }
}

/**
 * Clean common hallucinated phrases that Whisper might add
 */
function cleanHallucinatedContent(transcript: string): string {
  if (!transcript) return transcript
  
  // List of common hallucinated phrases to remove
  const hallucinatedPhrases = [
    "hi this is the groq whisper i'm using",
    "hi this is the grok whisper i'm using",
    "hi this is the drop whisper i'm using",
    "this is the groq whisper",
    "this is the grok whisper",
    "this is the drop whisper",
    "let's see how good it works",
    "actually this is",
    "as you can see",
    "for testing purposes",
    "for testing i feel good",
    "i will stop it",
  ]
  
  let cleaned = transcript.toLowerCase()
  
  // Remove hallucinated phrases
  hallucinatedPhrases.forEach(phrase => {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    cleaned = cleaned.replace(regex, '')
  })
  
  // Clean up extra spaces and punctuation
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  
  // Capitalize the first letter if it's a complete sentence
  if (cleaned.length > 0 && transcript[0] === transcript[0].toUpperCase()) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }
  
  return cleaned
}

/**
 * Detect duplicates with multiple strategies
 */
function detectAndHandleDuplicates(existing: string, newText: string): { isDuplicate: boolean } {
  // Exact match
  if (existing === newText) {
    return { isDuplicate: true }
  }
  
  // Existing contains new (partial duplicate)
  if (existing.includes(newText) && newText.length > 10) {
    return { isDuplicate: true }
  }
  
  // New contains existing (possible continuation, but check if it's just repetition)
  if (newText.includes(existing)) {
    const additional = newText.replace(existing, '').trim()
    // If the additional part is very short or looks like repetition, treat as duplicate
    if (additional.length < 5 || isRepetitiveContent(additional)) {
      return { isDuplicate: true }
    }
  }
  
  // Check for sentence-level repetition
  const existingSentences = existing.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const newSentences = newText.split(/[.!?]+/).filter(s => s.trim().length > 0)
  
  // If more than 50% of new sentences already exist in the transcript
  if (newSentences.length > 0) {
    const repeatedSentences = newSentences.filter(newSentence => 
      existingSentences.some(existingSentence => 
        newSentence.trim().toLowerCase() === existingSentence.trim().toLowerCase()
      )
    )
    
    if (repeatedSentences.length / newSentences.length > 0.5) {
      return { isDuplicate: true }
    }
  }
  
  return { isDuplicate: false }
}

/**
 * Check if content is repetitive
 */
function isRepetitiveContent(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  if (words.length < 3) return true
  
  // Check for repeated words or phrases
  const wordCounts = new Map<string, number>()
  words.forEach(word => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
  })
  
  // If more than 30% of words are repeated, it's likely repetitive
  const repeatedWords = Array.from(wordCounts.values()).filter(count => count > 1).length
  return repeatedWords / words.length > 0.3
}

/**
 * Check if content is likely new and meaningful
 */
function isLikelyNewContent(newText: string, existingText: string): boolean {
  if (!newText || newText.length < 3) return false
  
  // Check if it's just filler words
  const fillerWords = ['um', 'uh', 'like', 'you know', 'actually', 'basically']
  const fillerPattern = new RegExp(`\\b(${fillerWords.join('|')})\\b`, 'gi')
  const cleaned = newText.replace(fillerPattern, '').trim()
  
  if (cleaned.length < 3) return false
  
  // Check if it's substantially different from existing
  const existingWords = new Set(existingText.toLowerCase().split(/\s+/))
  const newWords = newText.toLowerCase().split(/\s+/)
  const uniqueNewWords = newWords.filter(word => !existingWords.has(word))
  
  // At least 30% of words should be new
  return uniqueNewWords.length / newWords.length > 0.3
}

/**
 * Intelligently merge transcripts with overlap detection
 */
function mergeTranscriptsIntelligently(existing: string, newText: string): {
  hasMeaningfulOverlap: boolean
  mergedTranscript: string
  incremental: string
} {
  const existingWords = existing.split(/\s+/).filter(w => w.length > 0)
  const newWords = newText.split(/\s+/).filter(w => w.length > 0)
  
  // Find the longest matching suffix of existing that matches a prefix of new
  let bestMatch = 0
  for (let i = Math.min(existingWords.length, newWords.length); i > 0; i--) {
    const existingSuffix = existingWords.slice(-i).join(" ")
    const newPrefix = newWords.slice(0, i).join(" ")
    
    // Normalize for comparison
    const normalizedSuffix = existingSuffix.toLowerCase().replace(/[.,!?;:]/g, "")
    const normalizedPrefix = newPrefix.toLowerCase().replace(/[.,!?;:]/g, "")
    
    if (normalizedSuffix === normalizedPrefix) {
      bestMatch = i
      break
    }
  }
  
  // Require a meaningful overlap (at least 2 words or 30% of shorter text)
  const minOverlap = Math.max(2, Math.floor(Math.min(existingWords.length, newWords.length) * 0.3))
  
  if (bestMatch >= minOverlap && bestMatch < newWords.length) {
    const incremental = newWords.slice(bestMatch).join(" ")
    const mergedTranscript = `${existing} ${incremental}`.trim()
    
    // Double-check that the incremental content is meaningful
    if (isLikelyNewContent(incremental, existing)) {
      return {
        hasMeaningfulOverlap: true,
        mergedTranscript,
        incremental,
      }
    }
  }
  
  // Try common prefix matching as a fallback
  let commonPrefixLength = 0
  for (let i = 0; i < Math.min(existingWords.length, newWords.length); i++) {
    if (existingWords[i].toLowerCase() === newWords[i].toLowerCase()) {
      commonPrefixLength = i + 1
    } else {
      break
    }
  }
  
  if (commonPrefixLength >= minOverlap && commonPrefixLength < newWords.length) {
    const incremental = newWords.slice(commonPrefixLength).join(" ")
    const mergedTranscript = `${existing} ${incremental}`.trim()
    
    if (isLikelyNewContent(incremental, existing)) {
      return {
        hasMeaningfulOverlap: true,
        mergedTranscript,
        incremental,
      }
    }
  }
  
  return {
    hasMeaningfulOverlap: false,
    mergedTranscript: existing,
    incremental: "",
  }
}


export async function finalizeGroqWhisperSession(
  sessionId: string
): Promise<GroqWhisperChunkResponse> {
  return {
    session_id: sessionId,
    transcript: "",
    incremental: "",
    is_final: true,
  }
}
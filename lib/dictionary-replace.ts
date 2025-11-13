/**
 * Dictionary text replacement utility
 * Performs simple text replacement without AI - just direct word/phrase substitution
 */

export interface DictionaryWord {
  word: string
  substitution?: string | null
}

/**
 * Apply dictionary replacements to transcribed text
 * This is a simple text replacement - no AI involved
 * 
 * @param text - The transcribed text to process
 * @param dictionary - Array of dictionary words with optional substitutions
 * @returns Text with dictionary replacements applied
 */
export function applyDictionaryReplacements(
  text: string,
  dictionary: DictionaryWord[]
): string {
  if (!text || !dictionary || dictionary.length === 0) {
    return text
  }

  let result = text

  // Sort by word length (longest first) to handle multi-word phrases correctly
  const sortedDict = [...dictionary].sort((a, b) => {
    const aLen = a.word.length
    const bLen = b.word.length
    return bLen - aLen // Descending order
  })

  // Apply each dictionary replacement
  for (const entry of sortedDict) {
    const { word, substitution } = entry
    
    if (!word || word.trim().length === 0) {
      continue
    }

    // If there's a substitution, replace the word with the substitution
    if (substitution && substitution.trim().length > 0) {
      // Use word boundaries for single words, but allow phrases
      const isPhrase = word.includes(' ') || word.includes('-')
      
      if (isPhrase) {
        // For phrases, do a simple case-insensitive replacement
        const regex = new RegExp(escapeRegex(word), 'gi')
        result = result.replace(regex, substitution)
      } else {
        // For single words, use word boundaries to avoid partial matches
        // Match word with optional punctuation before/after
        const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi')
        result = result.replace(regex, substitution)
      }
    } else {
      // No substitution - just ensure the word is spelled correctly
      // This is a no-op for now, but could be used for spell-checking in the future
      // The transcription service should handle this via keywords/prompts
    }
  }

  return result
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Fetch dictionary words for the current user
 */
export async function fetchDictionaryWords(): Promise<DictionaryWord[]> {
  try {
    const response = await fetch("/api/dictionary")
    if (!response.ok) {
      return []
    }
    const data = await response.json()
    return data.words || []
  } catch (error) {
    console.warn("Failed to fetch dictionary words:", error)
    return []
  }
}


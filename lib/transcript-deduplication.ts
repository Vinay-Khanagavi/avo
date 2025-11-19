/**
 * Transcript deduplication and cleaning utilities
 * Prevents repetition and hallucination in streaming transcription
 */

/**
 * Common hallucinated phrases that Whisper generates
 */
const HALLUCINATED_PHRASES = [
    "Thank you for watching",
    "Thanks for watching",
    "Please subscribe",
    "Don't forget to like",
    "See you next time",
    "Bye bye",
    "Thank you",
    "Thanks",
    "Subtitles by",
    "Transcribed by",
    "♪",
    "[Music]",
    "[Applause]",
    "[Laughter]",
    "(Music)",
    "(Applause)",
    "(Laughter)",
    "www.",
    ".com",
    "Subscribe",
    "you",
]

/**
 * Clean hallucinated content from transcript
 */
export function cleanHallucinatedContent(transcript: string): string {
    let cleaned = transcript.trim()

    // Remove common hallucinated phrases (case insensitive)
    for (const phrase of HALLUCINATED_PHRASES) {
        const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
        cleaned = cleaned.replace(regex, '')
    }

    // Remove multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ')

    // Only remove leading punctuation artifacts, preserve trailing periods for sentences  
    cleaned = cleaned.replace(/^[.,!?;:\s]+/g, '')

    return cleaned.trim()
}

/**
 * Deduplicate transcript by merging existing and new transcripts intelligently
 * Prevents repetition when streaming audio is processed incrementally
 */
export function deduplicateTranscript(
    existingTranscript: string,
    newTranscript: string,
    sessionId: string
): { transcript: string; incremental: string } {

    // If no existing transcript, everything is new
    if (!existingTranscript || existingTranscript.trim().length === 0) {
        const cleaned = newTranscript.trim()
        return {
            transcript: cleaned,
            incremental: cleaned
        }
    }

    const existing = existingTranscript.trim()
    const newText = newTranscript.trim()

    // If new transcript is empty, no update
    if (!newText || newText.length === 0) {
        return {
            transcript: existing,
            incremental: ""
        }
    }

    // If transcripts are identical, no update
    if (newText === existing) {
        return {
            transcript: existing,
            incremental: ""
        }
    }

    // CRITICAL: Check if new text is a subset of existing (hallucination/repetition)
    if (existing.includes(newText)) {
        // New text is already contained in existing transcript - ignore it
        console.warn(`[${sessionId}] ⚠️ REPETITION DETECTED: New text "${newText.substring(0, 50)}..." is already in existing transcript. IGNORING.`)
        return {
            transcript: existing,
            incremental: ""
        }
    }

    // Check if new text is a phrase-level repetition (repeated at word boundaries)
    const existingWords = existing.split(/\s+/).filter(w => w.length > 0)
    const newWords = newText.split(/\s+/).filter(w => w.length > 0)

    // If new text repeats a significant portion from the end of existing text
    if (newWords.length >= 3) {
        for (let phraseLen = Math.min(newWords.length, 10); phraseLen >= 3; phraseLen--) {
            const newPhrase = newWords.slice(0, phraseLen).join(' ').toLowerCase()
            const existingEnd = existingWords.slice(-phraseLen).join(' ').toLowerCase()

            if (newPhrase === existingEnd) {
                // Check if the rest of new text is also repetitive
                const remainingWords = newWords.slice(phraseLen)
                if (remainingWords.length === 0 || remainingWords.length < phraseLen / 2) {
                    console.warn(`[${sessionId}] ⚠️ PHRASE REPETITION DETECTED: "${newPhrase}" repeats from end of existing. IGNORING.`)
                    return {
                        transcript: existing,
                        incremental: ""
                    }
                }
            }
        }
    }

    // Check if new transcript starts with existing transcript (ideal case)
    if (newText.startsWith(existing)) {
        const incremental = newText.slice(existing.length).trim()

        // If no actual new content, return empty incremental
        if (!incremental || incremental.length === 0) {
            return {
                transcript: existing,
                incremental: ""
            }
        }

        return {
            transcript: newText,
            incremental: incremental
        }
    }

    // Check if existing ends with the start of new (word-level overlap)
    const result = findOverlapAndMerge(existing, newText, sessionId)

    return result
}

/**
 * Find overlap between existing and new transcripts at word level
 * Handles cases where Whisper re-transcribes last few words differently
 */
function findOverlapAndMerge(
    existing: string,
    newText: string,
    sessionId: string
): { transcript: string; incremental: string } {

    const existingWords = existing.split(/\s+/).filter(w => w.length > 0)
    const newWords = newText.split(/\s+/).filter(w => w.length > 0)

    // If new text has fewer words than existing, likely hallucination
    if (newWords.length < existingWords.length * 0.3 && existingWords.length > 5) {
        console.warn(`[${sessionId}] ⚠️ HALLUCINATION DETECTED: New text has only ${newWords.length} words vs ${existingWords.length} existing. Likely hallucination. IGNORING.`)
        return {
            transcript: existing,
            incremental: ""
        }
    }

    // Detect if new text is just the same words rearranged or repeated
    const newTextNormalized = newText.toLowerCase().replace(/[^a-z0-9\s]/g, '')
    const existingNormalized = existing.toLowerCase().replace(/[^a-z0-9\s]/g, '')

    // Check if new text is suspiciously similar (same words, different order)
    const newWordSet = new Set(newTextNormalized.split(/\s+/))
    const existingWordSet = new Set(existingNormalized.split(/\s+/))
    const commonWords = [...newWordSet].filter(w => existingWordSet.has(w))
    const wordSimilarity = commonWords.length / Math.max(newWordSet.size, 1)

    // If 90%+ of words are the same, likely repetition
    if (wordSimilarity > 0.9 && newWords.length < existingWords.length) {
        console.warn(`[${sessionId}] ⚠️ WORD SIMILARITY DETECTED: ${(wordSimilarity * 100).toFixed(0)}% word overlap. Likely repetition. IGNORING.`)
        return {
            transcript: existing,
            incremental: ""
        }
    }

    // Find longest overlap at end of existing and start of new
    let maxOverlapLength = 0
    let maxOverlapIndex = 0

    // Try different overlap lengths (from 1 word to min of both lengths)
    const maxCheckLength = Math.min(existingWords.length, newWords.length, 15) // Check up to 15 words

    for (let overlapLen = 1; overlapLen <= maxCheckLength; overlapLen++) {
        const existingSuffix = existingWords.slice(-overlapLen)
        const newPrefix = newWords.slice(0, overlapLen)

        // Compare words (case insensitive, normalized)
        let matches = true
        for (let i = 0; i < overlapLen; i++) {
            const existingWord = normalizeWord(existingSuffix[i])
            const newWord = normalizeWord(newPrefix[i])

            if (existingWord !== newWord) {
                matches = false
                break
            }
        }

        if (matches) {
            maxOverlapLength = overlapLen
            maxOverlapIndex = overlapLen
        }
    }

    // If we found overlap, merge intelligently
    if (maxOverlapLength > 0) {
        const incrementalWords = newWords.slice(maxOverlapIndex)

        // If no new words after overlap, nothing to add
        if (incrementalWords.length === 0) {
            console.log(`[${sessionId}] ℹ️ Overlap detected (${maxOverlapLength} words) but no new content. Keeping existing.`)
            return {
                transcript: existing,
                incremental: ""
            }
        }

        const incremental = incrementalWords.join(' ').trim()
        const combined = existing + ' ' + incremental

        console.log(`[${sessionId}] ✅ Merged with overlap of ${maxOverlapLength} words. Added: "${incremental.substring(0, 50)}${incremental.length > 50 ? '...' : ''}"`)

        return {
            transcript: combined.trim(),
            incremental: incremental
        }
    }

    // No overlap found - check if this is genuinely new content or hallucination

    // Calculate similarity ratio
    const similarity = calculateSimilarity(existing, newText)

    if (similarity > 0.7) {
        // Very similar - likely a re-transcription, keep existing
        console.warn(`[${sessionId}] ⚠️ HIGH SIMILARITY DETECTED: ${(similarity * 100).toFixed(0)}% similar to existing. Likely re-transcription. IGNORING.`)
        return {
            transcript: existing,
            incremental: ""
        }
    }

    // Appears to be genuinely new content - append it
    // But check if it's suspiciously short
    if (newWords.length < 3 && existingWords.length > 10) {
        console.warn(`[${sessionId}] ⚠️ VERY SHORT TEXT DETECTED: Only ${newWords.length} words. Likely hallucination. IGNORING.`)
        return {
            transcript: existing,
            incremental: ""
        }
    }

    console.log(`[${sessionId}] ✅ No overlap found. Appending new content: "${newText.substring(0, 50)}${newText.length > 50 ? '...' : ''}"`)

    // Append new content with proper spacing
    const combined = existing + ' ' + newText
    return {
        transcript: combined.trim(),
        incremental: newText
    }
}

/**
 * Normalize word for comparison (lowercase, remove punctuation)
 */
function normalizeWord(word: string): string {
    return word
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
}

/**
 * Calculate similarity between two texts (Jaccard similarity on word sets)
 */
function calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 0))
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 0))

    if (words1.size === 0 || words2.size === 0) {
        return 0
    }

    // Calculate intersection
    const intersection = new Set([...words1].filter(x => words2.has(x)))

    // Calculate union
    const union = new Set([...words1, ...words2])

    // Jaccard similarity
    return intersection.size / union.size
}

/**
 * Check if text appears to be a repetition pattern
 */
export function isRepetitionPattern(text: string): boolean {
    const words = text.split(/\s+/).filter(w => w.length > 0)

    if (words.length < 4) {
        return false
    }

    // Check if same phrase repeats multiple times
    for (let phraseLen = 2; phraseLen <= Math.floor(words.length / 2); phraseLen++) {
        const firstPhrase = words.slice(0, phraseLen).join(' ')
        let repetitions = 1

        for (let i = phraseLen; i < words.length; i += phraseLen) {
            const nextPhrase = words.slice(i, i + phraseLen).join(' ')
            if (nextPhrase === firstPhrase) {
                repetitions++
            } else {
                break
            }
        }

        // If phrase repeats 3+ times, it's a repetition pattern
        if (repetitions >= 3) {
            return true
        }
    }

    return false
}

/**
 * Remove repetition patterns from text
 */
export function removeRepetitionPatterns(text: string): string {
    const words = text.split(/\s+/).filter(w => w.length > 0)

    if (words.length < 4) {
        return text
    }

    // Find and remove repetition patterns
    for (let phraseLen = 2; phraseLen <= Math.floor(words.length / 2); phraseLen++) {
        const firstPhrase = words.slice(0, phraseLen)
        let repetitions = 1
        let lastMatchIndex = phraseLen

        for (let i = phraseLen; i < words.length; i += phraseLen) {
            const nextPhrase = words.slice(i, i + phraseLen)
            const matches = nextPhrase.every((word, idx) =>
                idx < firstPhrase.length && word === firstPhrase[idx]
            )

            if (matches && nextPhrase.length === phraseLen) {
                repetitions++
                lastMatchIndex = i + phraseLen
            } else {
                break
            }
        }

        // If we found 3+ repetitions, keep only the first occurrence
        if (repetitions >= 3) {
            const cleaned = words.slice(0, phraseLen)
            const remaining = words.slice(lastMatchIndex)
            return [...cleaned, ...remaining].join(' ')
        }
    }

    return text
}
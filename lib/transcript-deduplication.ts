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
        // console.warn(`[${sessionId}] ⚠️ REPETITION DETECTED: New text is subset. IGNORING.`)
        return {
            transcript: existing,
            incremental: ""
        }
    }

    // STRATEGY 0: Global Loop Detection
    // Check if the new text repeats content from the *beginning* of the session (or significantly earlier).
    // This catches the "Header Re-transcription" bug where the first sentence is repeated.

    const newWords = newText.split(/\s+/).filter(w => w.length > 0)

    // Only check if new text is substantial enough to be a loop (e.g. > 4 words)
    if (newWords.length > 4) {
        // Check if the start of newText matches the start of existing (but we are appending, so it shouldn't match start)
        // We check the first 10 words of existing
        const existingStartWords = existing.split(/\s+/).slice(0, 20)
        const newStartWords = newWords.slice(0, 10)

        if (existingStartWords.length > 10 && arePhrasesEqual(existingStartWords.slice(0, 5), newStartWords.slice(0, 5))) {
            console.warn(`[${sessionId}] ⚠️ GLOBAL LOOP DETECTED: New text repeats start of session. IGNORING.`)
            return {
                transcript: existing,
                incremental: ""
            }
        }

        // Also check if newText is just a large chunk of *any* previous part of existing
        // (Simpler subset check above handles exact matches, but this handles fuzzy/partial matches)
        if (existing.length > newText.length * 2) {
            // If existing is much longer, and newText is found inside it (fuzzy)
            // We rely on the subset check above for exact matches.
            // For fuzzy, we can check if the first half of newText is in existing
            const firstHalf = newWords.slice(0, Math.floor(newWords.length / 2)).join(' ')
            if (firstHalf.length > 20 && existing.includes(firstHalf)) {
                console.warn(`[${sessionId}] ⚠️ LARGE REPETITION DETECTED: Start of new text is already in history. IGNORING.`)
                return {
                    transcript: existing,
                    incremental: ""
                }
            }
        }
    }

    // SLIDING WINDOW MERGE STRATEGY
    // We expect the newText to start with the last few words of existing (overlap)
    // We need to find the "cut point" where new content begins

    // Ensure we have word arrays (if not already created in loop detection)
    // We need to re-assign or create new variables if we want to be safe, 
    // but since we are in the same scope, we can just use different names or reuse if let.
    // To avoid confusion and lint errors, let's just use the variables we need.

    // If they were declared with 'const' above, we can't redeclare. 
    // But the previous tool call added 'const newWords' at line ~107.
    // So 'newWords' is available. 'existingWords' was NOT added there.

    const existingWords = existing.split(/\s+/).filter(w => w.length > 0)
    // newWords is already declared above, so we don't redeclare it.
    // But we need to make sure it's the same content.
    // const newWords = newText.split(/\s+/).filter(w => w.length > 0)

    // STRATEGY 1: Anchor Search
    // Look for the last N words of 'existing' inside 'newTranscript'
    // If found, we assume everything before that point in 'newTranscript' is overlap/history

    // Try anchors of length 5, 4, 3, 2
    const MAX_ANCHOR_LEN = 5
    const MIN_ANCHOR_LEN = 2

    // Only search in the first M words of new transcript to avoid false positives later in text
    // (e.g. if the user says the same phrase again later)
    const SEARCH_WINDOW = 30

    for (let anchorLen = MAX_ANCHOR_LEN; anchorLen >= MIN_ANCHOR_LEN; anchorLen--) {
        if (existingWords.length < anchorLen) continue

        const anchor = existingWords.slice(-anchorLen)

        // Search for this anchor in newWords (within window)
        for (let i = 0; i < Math.min(newWords.length, SEARCH_WINDOW) - anchorLen + 1; i++) {
            const candidate = newWords.slice(i, i + anchorLen)

            if (arePhrasesEqual(anchor, candidate)) {
                // Found the anchor!
                // The cut point is after this anchor
                const splitIndex = i + anchorLen

                const incrementalWords = newWords.slice(splitIndex)

                if (incrementalWords.length === 0) {
                    // New text ends exactly at the anchor
                    return {
                        transcript: existing,
                        incremental: ""
                    }
                }

                const incremental = incrementalWords.join(' ')
                // console.log(`[${sessionId}] ✅ Merged via Anchor Search (len ${anchorLen}). Added: "${incremental.substring(0, 30)}..."`)

                return {
                    transcript: existing + " " + incremental,
                    incremental: incremental
                }
            }
        }
    }

    // STRATEGY 2: Reverse Overlap (Correction Detection)
    // Check if the START of 'newTranscript' matches a sequence inside the END of 'existingTranscript'.
    // This handles cases where Whisper corrects a previous mistake.
    // E.g. Existing: "...wanders through an eye"
    //      New:      "A long researcher wanders through an abandoned..."
    //      Match:    "A long researcher wanders through" is found in Existing.

    // Look at the first K words of New
    const START_ANCHOR_LEN = 3
    if (newWords.length >= START_ANCHOR_LEN) {
        const startAnchor = newWords.slice(0, START_ANCHOR_LEN)

        // Search for this anchor in the last 30 words of Existing
        const searchWindowSize = 30
        const searchStartIndex = Math.max(0, existingWords.length - searchWindowSize)
        const searchWords = existingWords.slice(searchStartIndex)

        for (let i = 0; i <= searchWords.length - START_ANCHOR_LEN; i++) {
            const candidate = searchWords.slice(i, i + START_ANCHOR_LEN)

            if (arePhrasesEqual(startAnchor, candidate)) {
                // Found the start of New inside Existing!
                // This suggests New is a replacement/correction starting from this point.

                // The match index in the FULL existingWords array
                const matchIndex = searchStartIndex + i

                // We keep everything BEFORE the match
                const keptWords = existingWords.slice(0, matchIndex)

                // And append ALL of New
                // (Since New starts with the anchor, we just append New)

                const keptText = keptWords.join(' ')
                const combined = keptText + (keptText.length > 0 ? ' ' : '') + newText

                // console.log(`[${sessionId}] ✅ Merged via Reverse Overlap (Correction). Replaced tail with new text.`)

                return {
                    transcript: combined.trim(),
                    incremental: newText // We can't easily determine the "incremental" part relative to the old bad tail, so just return newText
                }
            }
        }
    }

    // STRATEGY 3: Fallback to simple overlap check (if anchor not found)
    // This handles cases where the overlap is very short (1 word)
    // or if the anchor was slightly different but the very end matches

    const maxOverlapCheck = Math.min(existingWords.length, newWords.length, 5)
    let bestOverlapLen = 0

    for (let len = maxOverlapCheck; len >= 1; len--) {
        const existingSuffix = existingWords.slice(-len)
        const newPrefix = newWords.slice(0, len)

        if (arePhrasesEqual(existingSuffix, newPrefix)) {
            bestOverlapLen = len
            break
        }
    }

    if (bestOverlapLen > 0) {
        const incrementalWords = newWords.slice(bestOverlapLen)
        const incremental = incrementalWords.join(' ')

        return {
            transcript: existing + " " + incremental,
            incremental: incremental
        }
    }

    // 2. Fallback: If no overlap found, check if it's a continuation
    // If we used a prompt, Whisper usually continues perfectly.
    // But sometimes it repeats the prompt.

    // Check if newText STARTS with the prompt we gave (last few words of existing)
    // This is handled by the overlap check above usually.

    // If no overlap, it might be a disjoint continuation (silence gap)
    // Just append
    // console.log(`[${sessionId}] ℹ️ No overlap found. Appending: "${newText.substring(0, 30)}..."`)

    return {
        transcript: existing + " " + newText,
        incremental: newText
    }
}

/**
 * Fuzzy phrase comparison
 * Allows for minor punctuation/case differences
 */
function arePhrasesEqual(words1: string[], words2: string[]): boolean {
    if (words1.length !== words2.length) return false

    for (let i = 0; i < words1.length; i++) {
        const w1 = normalizeWord(words1[i])
        const w2 = normalizeWord(words2[i])
        if (w1 !== w2) return false
    }
    return true
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
    // Legacy function kept for reference if needed, but main logic moved to deduplicateTranscript
    return deduplicateTranscript(existing, newText, sessionId)
}

/**
 * Normalize word for comparison (lowercase, remove punctuation)
 */
function normalizeWord(word: string): string {
    return word
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') // aggressive normalization
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
"""
Smart text merging logic for incremental transcription.
Handles Whisper inconsistencies with capitalization, punctuation, and word boundaries.
"""

import difflib
import re
from typing import Tuple


def normalize_text(text: str) -> str:
    """Normalize text for comparison (lowercase, remove extra spaces)."""
    # Convert to lowercase and remove extra whitespace
    text = text.lower().strip()
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    return text


def find_overlap(old_text: str, new_text: str, min_overlap_length: int = 10) -> Tuple[int, int]:
    """
    Find the overlap between old_text and new_text using SequenceMatcher.
    Returns (start_index_in_old, end_index_in_old) of the overlap.
    """
    # Normalize texts for comparison
    old_normalized = normalize_text(old_text)
    new_normalized = normalize_text(new_text)
    
    # Use SequenceMatcher to find longest common subsequence
    matcher = difflib.SequenceMatcher(None, old_normalized, new_normalized)
    match = matcher.find_longest_match(0, len(old_normalized), 0, len(new_normalized))
    
    if match.size < min_overlap_length:
        return (0, 0)
    
    # Return the overlap indices in the original (non-normalized) text
    # We need to map back to original text positions
    overlap_text = old_normalized[match.a:match.a + match.size]
    
    # Find this overlap in the original old_text (case-insensitive)
    pattern = re.escape(overlap_text)
    match_obj = re.search(pattern, old_text, re.IGNORECASE)
    
    if match_obj:
        return (match_obj.start(), match_obj.end())
    
    return (0, 0)


def merge_transcripts(existing_text: str, new_text: str) -> str:
    """
    Merge new transcript with existing transcript intelligently.
    Handles partial words, capitalization, and punctuation inconsistencies.
    """
    if not existing_text:
        return new_text.strip()
    
    if not new_text:
        return existing_text.strip()
    
    # Find overlap between existing and new text
    overlap_start, overlap_end = find_overlap(existing_text, new_text)
    
    if overlap_start == 0 and overlap_end == 0:
        # No overlap found, append new text
        return f"{existing_text} {new_text}".strip()
    
    # Extract the non-overlapping portion of new_text
    # The overlap in new_text should be at the beginning
    new_normalized = normalize_text(new_text)
    existing_normalized = normalize_text(existing_text)
    
    # Find where the overlap starts in new_text
    overlap_in_existing = existing_normalized[overlap_start:overlap_end]
    overlap_start_in_new = new_normalized.find(overlap_in_existing)
    
    if overlap_start_in_new == -1:
        # Couldn't find overlap in new text, just append
        return f"{existing_text} {new_text}".strip()
    
    # Extract the new portion (everything after the overlap)
    new_portion = new_text[overlap_start_in_new + len(overlap_in_existing):].strip()
    
    if not new_portion:
        # New text is entirely contained in existing text
        return existing_text.strip()
    
    # Merge: existing_text + new_portion
    # Ensure proper spacing
    if existing_text[-1] not in ' \n\t':
        return f"{existing_text} {new_portion}".strip()
    
    return f"{existing_text}{new_portion}".strip()


def merge_at_word_boundary(existing_text: str, new_text: str) -> str:
    """
    Improved merging strategy that prevents duplicates and handles word boundaries.
    More aggressive duplicate detection to prevent sentence repetition.
    """
    existing_normalized = existing_text.strip()
    new_normalized = new_text.strip()
    
    if not existing_normalized:
        return new_normalized
    
    if not new_normalized:
        return existing_normalized
    
    # Check for exact duplicates
    if existing_normalized == new_normalized:
        return existing_normalized
    
    # Check if new text is entirely contained in existing (duplicate)
    if new_normalized in existing_normalized:
        return existing_normalized
    
    # Check if new text contains entire existing text (legitimate continuation)
    if new_normalized.startswith(existing_normalized):
        # Extract only the new part
        incremental = new_normalized[len(existing_normalized):].strip()
        if incremental:
            return f"{existing_normalized} {incremental}".strip()
        return existing_normalized
    
    # Word-by-word comparison to find overlap
    existing_words = [w for w in existing_normalized.split() if w]
    new_words = [w for w in new_normalized.split() if w]
    
    if not existing_words or not new_words:
        return merge_transcripts(existing_normalized, new_normalized)
    
    # Find the longest matching suffix of existing that matches a prefix of new
    # This handles cases where transcription slightly changes previous words
    best_match = 0
    for i in range(min(len(existing_words), len(new_words)), 0, -1):
        existing_suffix = ' '.join(existing_words[-i:])
        new_prefix = ' '.join(new_words[:i])
        
        # Normalize for comparison (case-insensitive, ignore punctuation)
        existing_suffix_norm = existing_suffix.lower().replace('.', '').replace(',', '').replace('!', '').replace('?', '').replace(';', '').replace(':', '')
        new_prefix_norm = new_prefix.lower().replace('.', '').replace(',', '').replace('!', '').replace('?', '').replace(';', '').replace(':', '')
        
        if existing_suffix_norm == new_prefix_norm:
            best_match = i
            break
    
    # If we found a good match, extract only the new words
    if best_match > 0 and best_match < len(new_words):
        incremental = ' '.join(new_words[best_match:])
        return f"{existing_normalized} {incremental}".strip()
    
    # If new transcript is significantly longer, check for word overlap
    # Only accept if it's at least 50% longer to avoid false positives
    if len(new_normalized) > len(existing_normalized) * 1.5:
        existing_word_set = set(w.lower() for w in existing_words)
        new_word_set = set(w.lower() for w in new_words)
        overlap = len([w for w in new_word_set if w in existing_word_set])
    
        # If less than 30% overlap, treat as new content
        if len(new_word_set) > 0 and overlap / len(new_word_set) < 0.3:
            return new_normalized
    
    # Try to find common prefix
    common_prefix_length = 0
    for i in range(min(len(existing_words), len(new_words))):
        if existing_words[i].lower() == new_words[i].lower():
            common_prefix_length = i + 1
        else:
            break
    
    if common_prefix_length < len(new_words):
        incremental = ' '.join(new_words[common_prefix_length:])
        return f"{existing_normalized} {incremental}".strip()
    
    # Fallback: return existing to prevent duplicates
    return existing_normalized


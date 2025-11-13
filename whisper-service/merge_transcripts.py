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
    Alternative merging strategy that ensures we merge at word boundaries.
    More conservative approach.
    """
    if not existing_text:
        return new_text.strip()
    
    if not new_text:
        return existing_text.strip()
    
    # Find overlap
    overlap_start, overlap_end = find_overlap(existing_text, new_text)
    
    if overlap_start == 0 and overlap_end == 0:
        # No overlap, append with space
        return f"{existing_text} {new_text}".strip()
    
    # Find word boundaries around the overlap
    # Get the last few words of existing_text
    existing_words = existing_text.split()
    new_words = new_text.split()
    
    if not existing_words or not new_words:
        return merge_transcripts(existing_text, new_text)
    
    # Try to find overlap at word level
    # Check if last few words of existing match first few words of new
    for i in range(min(len(existing_words), len(new_words)), 0, -1):
        existing_suffix = ' '.join(existing_words[-i:]).lower()
        new_prefix = ' '.join(new_words[:i]).lower()
        
        if existing_suffix == new_prefix:
            # Found word-level overlap
            new_portion = ' '.join(new_words[i:])
            if new_portion:
                return f"{existing_text} {new_portion}".strip()
            return existing_text.strip()
    
    # Fall back to character-level merging
    return merge_transcripts(existing_text, new_text)


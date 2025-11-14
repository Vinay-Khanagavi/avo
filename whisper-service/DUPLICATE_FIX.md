# Duplicate Text and Accuracy Fixes

## Issues Identified

Based on user feedback, the transcription system was experiencing:
1. **Repetitive phrases** - Same sentences appearing multiple times (e.g., "This is test 69 and I'm currently checking")
2. **Transcription errors** - Minor variations in transcription (e.g., "guest 69" vs "test 69", "VSPR flow" vs "WhisperFlow")
3. **Duplicate content** - Sentences being repeated even when timestamp extraction should prevent it

## Root Causes

1. **Timestamp extraction too lenient**: The tolerance of -0.1s was allowing buffer segments to slip through
2. **Weak duplicate detection**: The merging logic wasn't catching duplicates when Whisper produced slight variations
3. **Missing accuracy parameters**: Whisper wasn't using optimal parameters for consistent transcription

## Fixes Implemented

### 1. Stricter Timestamp Extraction ✅

**File**: `app.py` lines 817-861

**Changes**:
- Increased threshold from `buffer_duration - 0.1` to `buffer_duration + 0.2` for stricter filtering
- Added segment end time checking: `segment_end > buffer_duration + 0.5`
- Implemented fallback with lenient filtering if strict filtering finds no segments
- Added detailed logging to track extraction success

**Impact**: Better filtering of buffer segments, reducing duplicates at chunk boundaries

### 2. Enhanced Duplicate Detection ✅

**File**: `merge_transcripts.py` lines 118-180

**Changes**:
- Added similarity-based duplicate detection using `SequenceMatcher`
- Rejects new text if >85% similar to existing (with length check)
- Enhanced fuzzy matching for suffix/prefix overlap detection (>90% similarity)
- Added minimum incremental length check (must be >2 words or >10 chars)
- Added logging for rejected duplicates

**Impact**: Catches duplicates even when Whisper produces slight variations (e.g., "guest 69" vs "test 69")

### 3. Whisper Accuracy Parameters ✅

**File**: `app.py` lines 803-815

**Changes**:
- Added `temperature=0.0` for deterministic, consistent output
- Added `best_of=5` to consider multiple transcription candidates
- Added `beam_size=5` for beam search accuracy
- Added `compression_ratio_threshold=2.4` to filter repetitive text
- Added `logprob_threshold=-1.0` to remove low-confidence words
- Added `no_speech_threshold=0.6` for better silence detection

**Impact**: More accurate and consistent transcriptions, fewer errors

## Testing Recommendations

1. **Test with repetitive speech**: Say the same phrase multiple times - should not duplicate
2. **Test with similar phrases**: Variations like "test 69" vs "test 169" should be handled correctly
3. **Monitor logs**: Check for "Rejecting high-similarity duplicate" messages
4. **Check timestamp extraction**: Verify "Timestamp extraction: X/Y segments kept" logs

## Expected Improvements

- **Reduced duplicates**: Stricter timestamp extraction + similarity detection should eliminate most duplicates
- **Better accuracy**: Whisper parameters improve transcription quality
- **Consistent output**: Temperature=0.0 ensures reproducible results
- **Better error handling**: Fallback mechanisms prevent failures

## Configuration

No new environment variables needed. All fixes are automatic improvements.

## Monitoring

Watch for these log messages:
- `"Timestamp extraction: X/Y segments kept"` - Shows extraction success
- `"Rejecting high-similarity duplicate"` - Shows duplicate detection working
- `"Rejecting short incremental"` - Shows short duplicate prevention

## Future Enhancements

If duplicates still occur:
1. Increase similarity threshold from 0.85 to 0.90
2. Increase timestamp buffer threshold from +0.2s to +0.3s
3. Add word-level duplicate detection
4. Implement confidence-based filtering



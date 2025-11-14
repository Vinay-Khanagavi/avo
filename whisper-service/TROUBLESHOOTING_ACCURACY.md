# Troubleshooting Whisper Transcription Accuracy

If you're experiencing poor transcription accuracy, follow these steps:

## Quick Fixes

### 1. Enable Debug Mode

First, enable debug logging to see what's happening:

```bash
export DEBUG_TRANSCRIPTION=true
# Restart your whisper service
```

Then check the logs to see:
- What audio files are being processed
- What transcription options are being used
- Raw transcription results
- Segment information

### 2. Disable Audio Normalization (If Causing Issues)

The `loudnorm` filter might be causing problems. Try disabling it:

```bash
export ENABLE_AUDIO_NORMALIZATION=false
# Restart your whisper service
```

### 3. Upgrade Model (Most Important!)

The `base` model has limited accuracy. If you have 2GB+ RAM, upgrade to `small`:

```bash
export WHISPER_MODEL=small
# Restart your whisper service
```

**This is the #1 improvement for accuracy!**

### 4. Adjust Quality Thresholds

If words are being filtered out incorrectly, make thresholds more lenient:

```bash
# More lenient (allows more words)
export WHISPER_COMPRESSION_RATIO_THRESHOLD=3.0
export WHISPER_LOGPROB_THRESHOLD=-1.5
export WHISPER_NO_SPEECH_THRESHOLD=0.5

# Restart your whisper service
```

### 5. Test with Sample Audio

Use the test script to diagnose issues:

```bash
cd whisper-service
python test_transcription.py /path/to/your/audio.webm --model base --debug
```

Compare results with different models:
```bash
python test_transcription.py /path/to/your/audio.webm --model small --debug
```

## Common Issues and Solutions

### Issue: "Garbled" or "Nonsensical" Transcription

**Symptoms**: Text doesn't match what you said at all

**Solutions**:
1. **Upgrade model** - `base` → `small` (biggest impact)
2. **Check audio quality** - Ensure good microphone, quiet environment
3. **Disable normalization** - `ENABLE_AUDIO_NORMALIZATION=false`
4. **Check audio format** - Ensure 16kHz sample rate (should be automatic)

### Issue: Missing Words

**Symptoms**: Some words are skipped

**Solutions**:
1. **Lower logprob threshold** - `WHISPER_LOGPROB_THRESHOLD=-1.5` (more lenient)
2. **Lower no_speech threshold** - `WHISPER_NO_SPEECH_THRESHOLD=0.5` (more sensitive)
3. **Disable noise filter** - `ENABLE_NOISE_FILTER=false`

### Issue: Duplicate Words at Boundaries

**Symptoms**: Words repeat at chunk boundaries

**Solutions**:
1. **Check timestamp extraction** - Enable `DEBUG_TRANSCRIPTION=true` and check logs
2. **Verify buffer overlap** - Ensure `BUFFER_OVERLAP_SECONDS=2.0`
3. **Check merging logic** - Review `merge_transcripts.py`

### Issue: Wrong Punctuation/Capitalization

**Symptoms**: Poor formatting

**Solutions**:
1. **Provide context prompt** - When creating session, provide domain context
2. **Use better model** - `small` model has better punctuation
3. **Post-process** - Consider adding grammar correction step

## Recommended Configuration for Best Accuracy

```bash
# Model (most important!)
export WHISPER_MODEL=small  # If you have 2GB+ RAM

# Transcription settings
export WHISPER_TEMPERATURE=0.0
export WHISPER_BEST_OF=5
export WHISPER_BEAM_SIZE=5

# More lenient thresholds (if words are being filtered)
export WHISPER_COMPRESSION_RATIO_THRESHOLD=2.4
export WHISPER_LOGPROB_THRESHOLD=-1.0
export WHISPER_NO_SPEECH_THRESHOLD=0.6

# Audio processing (disable if causing issues)
export ENABLE_AUDIO_NORMALIZATION=true
export ENABLE_NOISE_FILTER=true

# Debugging
export DEBUG_TRANSCRIPTION=false  # Set to true for troubleshooting
```

## Testing Your Changes

1. **Record a test audio** - Say something clear and known
2. **Transcribe with current settings** - Note the errors
3. **Make one change** - e.g., upgrade model or disable normalization
4. **Transcribe again** - Compare results
5. **Iterate** - Keep adjusting until accuracy improves

## Model Comparison

| Model | Accuracy | Speed | RAM | When to Use |
|-------|----------|-------|-----|-------------|
| `base` | 🟠 60-70% | Fast | 1GB | t2.micro only |
| `small` | 🟢 80-90% | Medium | 2GB | **Recommended** |
| `medium` | 🟢🟢 90-95% | Slow | 5GB | Production |
| `large` | 🟢🟢🟢 95%+ | Very Slow | 10GB | GPU instances |

**Recommendation**: Always use `small` if you have 2GB+ RAM. The accuracy improvement is significant.

## Still Having Issues?

1. **Check logs** - Enable `DEBUG_TRANSCRIPTION=true` and review logs
2. **Test audio quality** - Record with different microphone/environment
3. **Try different models** - Compare `base` vs `small` results
4. **Check EC2 instance** - Ensure sufficient CPU/RAM
5. **Review audio format** - Verify WebM → WAV conversion is working

## Getting Help

If issues persist:
1. Enable debug mode and capture logs
2. Test with known audio sample
3. Try different model sizes
4. Check EC2 instance resources
5. Review audio recording settings in browser




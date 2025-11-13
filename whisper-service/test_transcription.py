#!/usr/bin/env python3
"""
Test script to diagnose Whisper transcription issues.
Run this to test transcription with different settings.
"""

import os
import sys
import whisper
import tempfile
import argparse
from pathlib import Path

def test_transcription(audio_file: str, model_name: str = "base", enable_debug: bool = False):
    """Test transcription with various settings."""
    
    print(f"\n{'='*60}")
    print(f"Testing Whisper Transcription")
    print(f"{'='*60}")
    print(f"Audio file: {audio_file}")
    print(f"Model: {model_name}")
    print(f"{'='*60}\n")
    
    # Load model
    print(f"Loading Whisper model '{model_name}'...")
    try:
        model = whisper.load_model(model_name)
        print(f"✅ Model loaded successfully\n")
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        return
    
    # Test 1: Basic transcription (no filters)
    print("Test 1: Basic transcription (default settings)")
    print("-" * 60)
    try:
        result1 = model.transcribe(
            audio_file,
            language="en",
            fp16=False,
        )
        print(f"Result: {result1['text'][:200]}...")
        print(f"Segments: {len(result1.get('segments', []))}")
        if enable_debug and result1.get('segments'):
            print(f"First segment: {result1['segments'][0]}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n")
    
    # Test 2: With temperature=0 (deterministic)
    print("Test 2: With temperature=0 (deterministic)")
    print("-" * 60)
    try:
        result2 = model.transcribe(
            audio_file,
            language="en",
            fp16=False,
            temperature=0.0,
        )
        print(f"Result: {result2['text'][:200]}...")
        print(f"Segments: {len(result2.get('segments', []))}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n")
    
    # Test 3: With beam search
    print("Test 3: With beam search (best_of=5, beam_size=5)")
    print("-" * 60)
    try:
        result3 = model.transcribe(
            audio_file,
            language="en",
            fp16=False,
            temperature=0.0,
            best_of=5,
            beam_size=5,
        )
        print(f"Result: {result3['text'][:200]}...")
        print(f"Segments: {len(result3.get('segments', []))}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n")
    
    # Test 4: With all quality filters (current production settings)
    print("Test 4: With all quality filters (production settings)")
    print("-" * 60)
    try:
        result4 = model.transcribe(
            audio_file,
            language="en",
            fp16=False,
            temperature=0.0,
            best_of=5,
            beam_size=5,
            compression_ratio_threshold=2.4,
            logprob_threshold=-1.0,
            no_speech_threshold=0.6,
            condition_on_previous_text=True,
            word_timestamps=True,
        )
        print(f"Result: {result4['text'][:200]}...")
        print(f"Segments: {len(result4.get('segments', []))}")
        if enable_debug and result4.get('segments'):
            for i, seg in enumerate(result4['segments'][:3]):
                print(f"  Segment {i}: start={seg.get('start', 0):.2f}s, text='{seg.get('text', '')[:50]}...'")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n")
    
    # Test 5: More lenient settings (less filtering)
    print("Test 5: More lenient settings (less filtering)")
    print("-" * 60)
    try:
        result5 = model.transcribe(
            audio_file,
            language="en",
            fp16=False,
            temperature=0.0,
            best_of=5,
            beam_size=5,
            compression_ratio_threshold=3.0,  # More lenient
            logprob_threshold=-1.5,  # More lenient
            no_speech_threshold=0.5,  # More sensitive
            condition_on_previous_text=True,
            word_timestamps=True,
        )
        print(f"Result: {result5['text'][:200]}...")
        print(f"Segments: {len(result5.get('segments', []))}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n")
    print(f"{'='*60}")
    print("Testing complete!")
    print(f"{'='*60}\n")
    
    # Recommendations
    print("Recommendations:")
    print("- If Test 1 (basic) is better: Filters might be too strict")
    print("- If Test 4 (production) is better: Current settings are good")
    print("- If Test 5 (lenient) is better: Consider adjusting thresholds")
    print("- If all are bad: Consider upgrading to 'small' model")
    print("- Check audio quality: Ensure clean recording, good microphone")
    print()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test Whisper transcription with different settings")
    parser.add_argument("audio_file", help="Path to audio file (WAV, MP3, WebM, etc.)")
    parser.add_argument("--model", default="base", choices=["tiny", "base", "small", "medium", "large"],
                       help="Whisper model to use (default: base)")
    parser.add_argument("--debug", action="store_true", help="Enable debug output")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.audio_file):
        print(f"❌ Error: Audio file not found: {args.audio_file}")
        sys.exit(1)
    
    test_transcription(args.audio_file, args.model, args.debug)


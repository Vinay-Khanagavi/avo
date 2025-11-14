# Audio Files

This folder contains audio files for recording sound effects.

## Files to Add

Please add the following audio files here:

- `recording-start.mp3` (or `.wav`, `.ogg`) - Sound effect played when recording starts
- `recording-end.mp3` (or `.wav`, `.ogg`) - Sound effect played when recording ends

## Usage

✅ **Code is already integrated!** The sound effects are automatically played when:
- Recording starts: `playRecordingStartSound()` is called
- Recording ends: `playRecordingEndSound()` is called

The sounds are integrated in:
- `/components/dictation/microphone-button.tsx`
- Utility functions in `/lib/audio-sounds.ts`

## Supported Formats

- MP3 (`.mp3`) - Recommended
- WAV (`.wav`)
- OGG (`.ogg`)

## File Naming Convention

- `recording-start.{ext}` - For recording start sound
- `recording-end.{ext}` - For recording end sound

**Note:** The code expects `.mp3` files by default. If you use `.wav` or `.ogg`, update the file paths in `/lib/audio-sounds.ts`.


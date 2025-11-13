#!/bin/bash

# Restart Whisper Service with improved settings

cd "$(dirname "$0")"

echo "🛑 Stopping any existing Whisper service..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || echo "No existing service found"
sleep 2

echo ""
echo "🧹 Clearing sessions..."
redis-cli FLUSHALL 2>/dev/null || echo "Redis not running - sessions are in-memory only"

echo ""
echo "⚙️  Setting environment variables..."
export WHISPER_MODEL=small
export DEBUG_TRANSCRIPTION=true
export ENABLE_AUDIO_NORMALIZATION=false

echo "   WHISPER_MODEL=$WHISPER_MODEL"
echo "   DEBUG_TRANSCRIPTION=$DEBUG_TRANSCRIPTION"
echo "   ENABLE_AUDIO_NORMALIZATION=$ENABLE_AUDIO_NORMALIZATION"

echo ""
echo "🚀 Starting Whisper service..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Start the service
python app.py


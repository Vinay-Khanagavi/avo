#!/bin/bash

# Start Whisper Service Script
# This script sets up and starts the Whisper transcription service

cd "$(dirname "$0")"

echo "=== Starting Whisper Transcription Service ==="
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment with Python 3.13..."
    python3.13 -m venv venv 2>/dev/null || python3.12 -m venv venv 2>/dev/null || python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "Installing dependencies (this may take a few minutes)..."
    pip install --upgrade pip
    pip install fastapi "uvicorn[standard]" python-multipart slowapi python-dotenv pydantic pydantic-settings redis ffmpeg-python
    pip install openai-whisper
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Check for ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  Warning: ffmpeg not found. Audio conversion may fail."
    echo "   Install with: brew install ffmpeg"
fi

echo ""
echo "Starting Whisper service on http://localhost:8000"
echo "Press Ctrl+C to stop"
echo ""

# Start the service
python app.py

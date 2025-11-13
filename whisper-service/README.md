# Whisper Transcription Service

FastAPI microservice for streaming audio transcription using OpenAI Whisper with audio chunking and incremental merging.

## Features

- **Streaming Transcription**: Process 5-second audio chunks as they arrive
- **Buffer Overlap**: Maintains 2-second buffer for context-aware transcription
- **Smart Merging**: Intelligently merges partial transcripts using text similarity
- **Session Management**: Redis-backed session state (falls back to in-memory)
- **Rate Limiting**: Per-session and per-IP rate limits
- **Authentication**: API key protection

## Quick Start

### Local Development

1. **Install dependencies**:
```bash
pip install -r requirements.txt
```

2. **Install ffmpeg** (if not already installed):
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

3. **Set environment variables** (optional):
```bash
cp .env.example .env
# Edit .env with your settings
```

4. **Run the service**:
```bash
# Without Redis (uses in-memory storage)
python app.py

# Or with uvicorn directly
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Docker Development

```bash
# Build and run with docker-compose
docker-compose up --build

# Service will be available at http://localhost:8000
```

## API Endpoints

### Health Check
```
GET /health
```

### Create Session
```
POST /api/v1/sessions
Content-Type: application/json
X-API-Key: your-api-key

{
  "prompt": "This is technical documentation"  // optional
}
```

### Send Audio Chunk
```
POST /api/v1/sessions/{session_id}/chunks
Content-Type: multipart/form-data
X-API-Key: your-api-key

file: <audio-file.webm>
```

### Get Session State
```
GET /api/v1/sessions/{session_id}
X-API-Key: your-api-key
```

### Finalize Session
```
POST /api/v1/sessions/{session_id}/finalize
X-API-Key: your-api-key
```

## Environment Variables

- `WHISPER_MODEL`: Model size (tiny, base, small, medium, large) - default: `base`
  - **Recommended**: Use `small` for better accuracy if you have 2GB+ RAM
  - **For EC2 t2.micro**: Use `base` only (1GB RAM limit)
- `WHISPER_DEVICE`: Device (cpu, cuda) - default: `cpu`
- `MAX_SESSIONS`: Maximum concurrent sessions - default: `5`
- `SESSION_TTL`: Session timeout in seconds - default: `600`
- `BUFFER_OVERLAP_SECONDS`: Buffer overlap duration - default: `2.0`
- `REDIS_URL`: Redis connection URL - default: `redis://localhost:6379`
- `WHISPER_API_KEY`: API key for authentication (optional)
- `PORT`: Server port - default: `8000`

### Transcription Quality Settings (New)

- `WHISPER_TEMPERATURE`: Temperature for sampling (0.0-1.0) - default: `0.0`
  - Lower = more deterministic, fewer creative errors
  - Higher = more creative but potentially less accurate
- `WHISPER_BEST_OF`: Number of candidates to consider - default: `5`
- `WHISPER_BEAM_SIZE`: Beam search size - default: `5`
- `WHISPER_COMPRESSION_RATIO_THRESHOLD`: Filter repetitive text - default: `2.4`
- `WHISPER_LOGPROB_THRESHOLD`: Filter low-confidence words - default: `-1.0`
- `WHISPER_NO_SPEECH_THRESHOLD`: Silence detection threshold - default: `0.6`

## Model Selection Guide

| Model    | Accuracy  | Speed       | RAM Usage | Notes               |
| -------- | --------- | ----------- | --------- | ------------------- |
| `tiny`   | 🔴 Low    | ⚡ Fast      | ~500MB    | Prototype only      |
| `base`   | 🟠 Okay   | ⚡ Fast      | ~1GB      | Default, lightweight|
| `small`  | 🟢 Good   | ⚖️ Balanced | ~2GB      | **Recommended**     |
| `medium` | 🟢 Better | 🐢 Slower   | ~5GB      | Good for production |
| `large`  | 🟢🟢 Best | 🐢🐢 Heavy  | ~10GB     | Needs GPU (CUDA)    |

**Recommendations:**
- **For best accuracy**: Use `small` or `medium` model
- **For EC2 t2.micro (1GB RAM)**: Use `base` model only
- **For EC2 c5.large+ (4GB+ RAM)**: Use `small` model for better accuracy
- **For GPU instances**: Use `large` model for best results

## Deployment

### EC2 Free Tier Deployment

See `deploy-ec2.sh` for automated deployment script, or `DEPLOYMENT_GUIDE.md` for comprehensive guide.

### Manual EC2 Setup

1. Launch EC2 t2.micro instance (Ubuntu 22.04)
2. SSH into instance
3. Install Docker:
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

4. Clone repository and deploy:
```bash
git clone <your-repo>
cd whisper-service
docker-compose up -d
```

5. Configure security group to allow port 8000

## Accuracy Improvements

The service includes several optimizations for better transcription accuracy:

1. **Audio Normalization**: Automatic volume normalization and noise filtering using ffmpeg `loudnorm` and `highpass` filters
2. **Timestamp-Based Overlap Extraction**: Uses Whisper's segment timestamps to precisely extract only new content from overlapping chunks
3. **Optimized Transcription Parameters**: 
   - `temperature=0` for deterministic output
   - Beam search with multiple candidates
   - Confidence threshold filtering
   - Repetition detection
4. **Enhanced Context Prompts**: Automatically builds context-aware prompts to guide Whisper's transcription
5. **Buffer Overlap**: Maintains 2-second audio buffer for seamless chunk merging

**Tips for Best Accuracy:**
- Use `small` or `medium` model if RAM allows
- Provide context in session prompt (e.g., "technical documentation", "casual conversation")
- Ensure clean audio input (good microphone, quiet environment)
- Use 16kHz+ sample rate (automatically handled)

## Performance

- **Base model on CPU**: ~1-2x real-time (5s audio = 5-10s processing)
- **Small model on CPU**: ~2-3x real-time (5s audio = 10-15s processing)
- **Expected latency**: 10-15s between speaking and seeing text
- **Concurrent sessions**: Limited by MAX_SESSIONS (default: 5)

## Troubleshooting

### Poor Transcription Accuracy

**Most Common Fix**: Upgrade to `small` model if you have 2GB+ RAM:
```bash
export WHISPER_MODEL=small
```

**Quick Debugging**:
1. Enable debug mode: `export DEBUG_TRANSCRIPTION=true`
2. Disable normalization if causing issues: `export ENABLE_AUDIO_NORMALIZATION=false`
3. Test with sample audio: `python test_transcription.py audio.webm --model small`

See [TROUBLESHOOTING_ACCURACY.md](./TROUBLESHOOTING_ACCURACY.md) for detailed troubleshooting guide.

### Model download fails
- Check internet connection
- Whisper downloads models on first use (~1GB for base model)
- Models are cached in `~/.cache/whisper/`

### Audio conversion fails
- Ensure ffmpeg is installed
- Check audio file format (supports WebM, MP3, WAV, etc.)
- Verify audio file is not corrupted
- Try disabling audio filters: `export ENABLE_AUDIO_NORMALIZATION=false`

### Redis connection fails
- Service falls back to in-memory storage automatically
- Check Redis URL in environment variables
- For production, ensure Redis is accessible

## License

MIT


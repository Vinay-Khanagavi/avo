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
- `WHISPER_DEVICE`: Device (cpu, cuda) - default: `cpu`
- `MAX_SESSIONS`: Maximum concurrent sessions - default: `5`
- `SESSION_TTL`: Session timeout in seconds - default: `600`
- `BUFFER_OVERLAP_SECONDS`: Buffer overlap duration - default: `2.0`
- `REDIS_URL`: Redis connection URL - default: `redis://localhost:6379`
- `WHISPER_API_KEY`: API key for authentication (optional)
- `PORT`: Server port - default: `8000`

## Model Selection

- **tiny**: Fastest, lowest accuracy (~39M parameters)
- **base**: Balanced (default) (~74M parameters, ~1GB RAM)
- **small**: Better accuracy (~244M parameters, ~2GB RAM)
- **medium**: High accuracy (~769M parameters, ~5GB RAM)
- **large**: Best accuracy (~1550M parameters, ~10GB RAM)

For EC2 t2.micro (1GB RAM), use `base` model only.

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

## Performance

- **Base model on CPU**: ~1-2x real-time (5s audio = 5-10s processing)
- **Expected latency**: 10-15s between speaking and seeing text
- **Concurrent sessions**: Limited by MAX_SESSIONS (default: 5)

## Troubleshooting

### Model download fails
- Check internet connection
- Whisper downloads models on first use (~1GB for base model)
- Models are cached in `~/.cache/whisper/`

### Audio conversion fails
- Ensure ffmpeg is installed
- Check audio file format (supports WebM, MP3, WAV, etc.)
- Verify audio file is not corrupted

### Redis connection fails
- Service falls back to in-memory storage automatically
- Check Redis URL in environment variables
- For production, ensure Redis is accessible

## License

MIT


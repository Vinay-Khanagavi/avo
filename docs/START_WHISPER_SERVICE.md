# Starting the Whisper Service

## 🚀 Quick Start

### Option 1: Local Development

```bash
cd ai-voice-keyboard/whisper-service
pip install -r requirements.txt
python app.py
```

The service will start on `http://localhost:8000`

### Option 2: Docker Development

```bash
cd ai-voice-keyboard/whisper-service
docker-compose up --build
```

### Option 3: Production Deployment

See `DEPLOYMENT_GUIDE.md` for complete deployment instructions.

## 🔧 Prerequisites

- Python 3.8+
- ffmpeg (for audio conversion)
- Optional: CUDA GPU for faster processing

## 📋 Environment Variables

Create `.env` file in whisper-service directory:

```env
# Model Configuration
WHISPER_MODEL=base  # Options: tiny, base, small, medium, large
WHISPER_DEVICE=cpu   # Options: cpu, cuda

# Service Configuration
MAX_SESSIONS=5
SESSION_TTL=1800
BUFFER_OVERLAP_SECONDS=2.0

# Security (Optional)
WHISPER_API_KEY=your-api-key-here
REQUIRE_API_KEY=true

# Redis (Optional)
REDIS_URL=redis://localhost:6379
```

## 🏥 Health Check

Verify the service is running:

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "model": "base",
  "device": "cpu",
  "model_loaded": true,
  "redis_connected": true,
  "active_sessions": 0,
  "ready": true
}
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Kill it
kill -9 <PID>
```

### Model Download Issues

Whisper models are downloaded on first use:
- `tiny`: ~39MB
- `base`: ~142MB
- `small`: ~466MB
- `medium`: ~1.5GB
- `large`: ~2.9GB

Ensure you have enough disk space and internet connection.

### ffmpeg Not Found

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### GPU Not Detected

If you have a GPU but it's not being used:

1. Install PyTorch with CUDA support:
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

2. Set `WHISPER_DEVICE=cuda` in environment variables

## 📊 Performance

### CPU Performance
- **Base model**: ~1-2x real-time
- **Expected latency**: 5-10 seconds per chunk

### GPU Performance
- **Base model**: ~3-5x real-time
- **Expected latency**: 1-3 seconds per chunk

## 🔗 Integration

The main application connects to the Whisper service via:

- **URL**: `http://localhost:8000` (configurable via `WHISPER_SERVICE_URL`)
- **API Key**: Optional authentication via `WHISPER_API_KEY`

## 📝 Logs

Monitor service logs:

```bash
# With docker-compose
docker-compose logs -f

# Direct python
python app.py  # Logs will appear in terminal
```

## ✅ Verification

Test the service is working:

1. Service starts without errors
2. Health check returns `{"status": "healthy"}`
3. Model loads successfully
4. Can process audio chunks

You're now ready to transcribe audio! 🎉
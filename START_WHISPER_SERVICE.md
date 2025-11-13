# How to Start Whisper Service

The Whisper transcription service needs to be running before you can use the dictation feature.

## Quick Start

1. **Install Python dependencies** (first time only):
   ```bash
   cd whisper-service
   pip install -r requirements.txt
   ```

2. **Start the Whisper service**:
   ```bash
   cd whisper-service
   python app.py
   ```

   The service will start on `http://localhost:8000`

3. **In another terminal, start Next.js**:
   ```bash
   cd ai-voice-keyboard
   yarn dev
   ```

4. **Test the dictation page**:
   - Open `http://localhost:3000/dictation`
   - Click the microphone button
   - Start speaking!

## Troubleshooting

### Error: "Whisper service is not running"
- Make sure the Whisper service is running on port 8000
- Check with: `lsof -i :8000`
- Restart the service if needed

### Error: "Module not found" or "No module named 'whisper'"
- Install dependencies: `pip install -r requirements.txt`
- Make sure you're using Python 3.9+

### Error: "ffmpeg not found"
- Install ffmpeg:
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt-get install ffmpeg`
  - Windows: Download from https://ffmpeg.org/download.html

### Port 8000 already in use
- Change the port in `whisper-service/app.py` or set `PORT` environment variable
- Update `WHISPER_SERVICE_URL` in `.env.local` to match

## Using Docker (Alternative)

```bash
cd whisper-service
docker-compose up
```

This will start both the Whisper service and Redis.


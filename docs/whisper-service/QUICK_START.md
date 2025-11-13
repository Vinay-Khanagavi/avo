# Quick Start Guide - Whisper Service

The Whisper transcription service needs to be running before you can use the dictation feature.

## Installation Steps

1. **Navigate to whisper-service directory:**
   ```bash
   cd whisper-service
   ```

2. **Create and activate virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install fastapi "uvicorn[standard]" python-multipart slowapi python-dotenv pydantic pydantic-settings redis ffmpeg-python
   pip install git+https://github.com/openai/whisper.git
   ```

   **Note:** Whisper installation may take a few minutes as it compiles dependencies.

4. **Start the service:**
   ```bash
   python app.py
   ```

   The service will start on `http://localhost:8000`

5. **Verify it's running:**
   ```bash
   curl http://localhost:8000/health
   ```

   You should see a JSON response with service status.

## Alternative: Use the start script

```bash
./start.sh
```

This script will automatically:
- Create virtual environment if needed
- Install dependencies
- Start the service

## Troubleshooting

### If Whisper installation fails:
Try installing from PyPI with a specific version:
```bash
pip install openai-whisper
```

### If ffmpeg is missing:
```bash
brew install ffmpeg  # macOS
# or
sudo apt-get install ffmpeg  # Linux
```

### If port 8000 is already in use:
Change the port in `app.py` or set environment variable:
```bash
PORT=8001 python app.py
```

Then update `WHISPER_SERVICE_URL` in your Next.js `.env.local` file.

## Running with Next.js

After starting the Whisper service:

1. **In another terminal, start Next.js**:
   ```bash
   cd ai-voice-keyboard
   yarn dev
   ```

2. **Test the dictation page**:
   - Open `http://localhost:3000/dictation`
   - Click the microphone button
   - Start speaking!

## Using Docker (Alternative)

```bash
cd whisper-service
docker-compose up
```

This will start both the Whisper service and Redis.

## Running in Background

To run the service in the background:

```bash
nohup python app.py > whisper.log 2>&1 &
```

Check logs:
```bash
tail -f whisper.log
```

Stop the service:
```bash
lsof -ti:8000 | xargs kill
```

## Common Errors

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


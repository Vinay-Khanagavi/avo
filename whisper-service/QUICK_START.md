# Quick Start Guide - Whisper Service

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


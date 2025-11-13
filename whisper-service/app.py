"""
FastAPI Whisper Service for Streaming Transcription
Handles audio chunks with buffer overlap and incremental transcript merging.
"""

import os
import uuid
import asyncio
import tempfile
from datetime import datetime, timedelta
from typing import Optional, Dict
from queue import Queue
from threading import Lock

import whisper
import ffmpeg
from fastapi import FastAPI, HTTPException, UploadFile, File, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel
from dotenv import load_dotenv
import redis

from merge_transcripts import merge_at_word_boundary

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Whisper Transcription Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Redis connection
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()
except Exception as e:
    print(f"Warning: Redis connection failed: {e}. Using in-memory storage.")
    redis_client = None

# In-memory fallback storage
sessions: Dict[str, Dict] = {}
sessions_lock = Lock()

# Whisper model (singleton)
whisper_model = None
model_lock = Lock()

# Configuration
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
MAX_SESSIONS = int(os.getenv("MAX_SESSIONS", "5"))
SESSION_TTL = int(os.getenv("SESSION_TTL", "600"))  # 10 minutes
BUFFER_OVERLAP_SECONDS = float(os.getenv("BUFFER_OVERLAP_SECONDS", "2.0"))
WHISPER_API_KEY = os.getenv("WHISPER_API_KEY", "")

# Processing queue
processing_queue = Queue(maxsize=10)


def get_whisper_model():
    """Load Whisper model (singleton pattern)."""
    global whisper_model
    if whisper_model is None:
        with model_lock:
            if whisper_model is None:
                print(f"Loading Whisper model: {WHISPER_MODEL}")
                whisper_model = whisper.load_model(WHISPER_MODEL, device=WHISPER_DEVICE)
                print("Whisper model loaded successfully")
    return whisper_model


def get_session_storage():
    """Get session storage (Redis or in-memory)."""
    return redis_client if redis_client else sessions


def get_session(session_id: str) -> Optional[Dict]:
    """Get session data."""
    if redis_client:
        import json
        data = redis_client.get(f"session:{session_id}")
        return json.loads(data) if data else None
    else:
        with sessions_lock:
            return sessions.get(session_id)


def save_session(session_id: str, data: Dict):
    """Save session data."""
    if redis_client:
        import json
        redis_client.setex(
            f"session:{session_id}",
            SESSION_TTL,
            json.dumps(data)
        )
    else:
        with sessions_lock:
            sessions[session_id] = data


def delete_session(session_id: str):
    """Delete session data."""
    if redis_client:
        redis_client.delete(f"session:{session_id}")
    else:
        with sessions_lock:
            sessions.pop(session_id, None)


def verify_api_key(api_key: Optional[str] = Header(None, alias="X-API-Key")) -> bool:
    """Verify API key."""
    if not WHISPER_API_KEY:
        return True  # No API key required
    return api_key == WHISPER_API_KEY


# Pydantic models
class SessionCreate(BaseModel):
    prompt: Optional[str] = None


class ChunkResponse(BaseModel):
    session_id: str
    transcript: str
    is_final: bool


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model": WHISPER_MODEL,
        "device": WHISPER_DEVICE,
        "redis_connected": redis_client is not None,
        "active_sessions": len(sessions) if not redis_client else redis_client.dbsize()
    }


@app.post("/api/v1/sessions")
@limiter.limit("10/minute")
async def create_session(
    request: SessionCreate,
    request_obj=Depends(verify_api_key)
):
    """Create a new transcription session."""
    # Check session limit
    if redis_client:
        active_count = redis_client.dbsize()
    else:
        with sessions_lock:
            active_count = len(sessions)
    
    if active_count >= MAX_SESSIONS:
        raise HTTPException(status_code=503, detail="Maximum sessions reached")
    
    session_id = str(uuid.uuid4())
    session_data = {
        "session_id": session_id,
        "created_at": datetime.utcnow().isoformat(),
        "transcript": "",
        "prompt": request.prompt,
        "chunk_count": 0,
        "last_chunk_time": None,
        "buffer_audio": None,  # Will store last 2 seconds of audio
    }
    
    save_session(session_id, session_data)
    
    return {"session_id": session_id, "status": "created"}


@app.get("/api/v1/sessions/{session_id}")
async def get_session(session_id: str, request_obj=Depends(verify_api_key)):
    """Get current session state."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_id": session_id,
        "transcript": session.get("transcript", ""),
        "chunk_count": session.get("chunk_count", 0),
        "created_at": session.get("created_at"),
    }


@app.post("/api/v1/sessions/{session_id}/chunks")
@limiter.limit("20/minute")
async def process_chunk(
    session_id: str,
    file: UploadFile = File(...),
    request_obj=Depends(verify_api_key)
):
    """Process an audio chunk and return incremental transcript."""
    # Verify session exists
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check queue capacity
    if processing_queue.full():
        raise HTTPException(status_code=429, detail="Processing queue full")
    
    try:
        # Read audio file
        audio_data = await file.read()
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp_file:
            tmp_file.write(audio_data)
            tmp_webm_path = tmp_file.name
        
        # Convert WebM to WAV using ffmpeg
        tmp_wav_path = tmp_webm_path.replace(".webm", ".wav")
        try:
            (
                ffmpeg
                .input(tmp_webm_path)
                .output(tmp_wav_path, acodec='pcm_s16le', ac=1, ar='16000')
                .overwrite_output()
                .run(quiet=True)
            )
        except ffmpeg.Error as e:
            os.unlink(tmp_webm_path)
            raise HTTPException(status_code=400, detail=f"Audio conversion failed: {str(e)}")
        
        # Load Whisper model
        model = get_whisper_model()
        
        # Get previous buffer (last 2 seconds)
        buffer_audio_path = session.get("buffer_audio_path")
        
        # Prepare audio for transcription with buffer overlap
        if buffer_audio_path and os.path.exists(buffer_audio_path):
            # Combine buffer + new chunk
            combined_wav_path = tmp_wav_path.replace(".wav", "_combined.wav")
            try:
                # Concatenate audio files using ffmpeg
                input_video = ffmpeg.input(buffer_audio_path)
                input_audio = ffmpeg.input(tmp_wav_path)
                (
                    ffmpeg
                    .concat(input_video, input_audio, v=0, a=1)
                    .output(combined_wav_path, acodec='pcm_s16le', ac=1, ar='16000')
                    .overwrite_output()
                    .run(quiet=True)
                )
                audio_path = combined_wav_path
            except Exception as e:
                # Fallback to new chunk only if concatenation fails
                print(f"Warning: Buffer concatenation failed: {e}. Using new chunk only.")
                audio_path = tmp_wav_path
        else:
            audio_path = tmp_wav_path
        
        # Transcribe
        result = model.transcribe(
            audio_path,
            language="en",
            initial_prompt=session.get("prompt"),
            fp16=False,  # Use fp32 for CPU
        )
        
        new_transcript = result["text"].strip()
        
        # Extract only new portion if we used buffer overlap
        if buffer_audio_path and os.path.exists(buffer_audio_path) and audio_path != tmp_wav_path:
            # We transcribed buffer + new chunk, but only want the new portion
            # Estimate: if buffer was 2s and new chunk is 5s, extract last ~5s worth of text
            # For now, we'll use the full transcript and let merging handle it
            # In production, you'd want to extract timestamps from Whisper
            pass
        
        # Merge with existing transcript
        existing_transcript = session.get("transcript", "")
        merged_transcript = merge_at_word_boundary(existing_transcript, new_transcript)
        
        # Store last 2 seconds of audio as buffer for next chunk
        buffer_wav_path = tmp_wav_path.replace(".wav", "_buffer.wav")
        try:
            # Extract last 2 seconds using ffmpeg
            probe = ffmpeg.probe(tmp_wav_path)
            duration = float(probe['streams'][0]['duration'])
            start_time = max(0, duration - BUFFER_OVERLAP_SECONDS)
            
            (
                ffmpeg
                .input(tmp_wav_path, ss=start_time)
                .output(buffer_wav_path, acodec='pcm_s16le', ac=1, ar='16000', t=BUFFER_OVERLAP_SECONDS)
                .overwrite_output()
                .run(quiet=True)
            )
            session["buffer_audio_path"] = buffer_wav_path
        except Exception as e:
            print(f"Warning: Buffer extraction failed: {e}")
            session["buffer_audio_path"] = None
        
        # Update session
        session["transcript"] = merged_transcript
        session["chunk_count"] = session.get("chunk_count", 0) + 1
        session["last_chunk_time"] = datetime.utcnow().isoformat()
        
        save_session(session_id, session)
        
        # Cleanup temp files
        os.unlink(tmp_webm_path)
        if audio_path != tmp_wav_path and os.path.exists(audio_path):
            os.unlink(audio_path)  # Remove combined file if created
        # Keep tmp_wav_path for buffer extraction, then clean up old buffer
        old_buffer = session.get("buffer_audio_path")
        if old_buffer and old_buffer != buffer_wav_path and os.path.exists(old_buffer):
            try:
                os.unlink(old_buffer)
            except:
                pass
        
        return {
            "session_id": session_id,
            "transcript": merged_transcript,
            "incremental": new_transcript,
            "is_final": False,
        }
        
    except Exception as e:
        # Cleanup on error
        import traceback
        error_details = traceback.format_exc()
        print(f"Error processing chunk: {error_details}")
        
        if 'tmp_webm_path' in locals() and os.path.exists(tmp_webm_path):
            os.unlink(tmp_webm_path)
        if 'tmp_wav_path' in locals() and os.path.exists(tmp_wav_path):
            os.unlink(tmp_wav_path)
        
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@app.post("/api/v1/sessions/{session_id}/finalize")
async def finalize_session(session_id: str, request_obj=Depends(verify_api_key)):
    """Finalize a session and return complete transcript."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    final_transcript = session.get("transcript", "")
    
    # Optionally delete session or mark as completed
    session["status"] = "completed"
    session["completed_at"] = datetime.utcnow().isoformat()
    save_session(session_id, session)
    
    return {
        "session_id": session_id,
        "transcript": final_transcript,
        "is_final": True,
        "chunk_count": session.get("chunk_count", 0),
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)


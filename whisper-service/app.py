"""
FastAPI Whisper Service for Streaming Transcription
Handles audio chunks with buffer overlap and incremental transcript merging.
"""

import os
import uuid
import asyncio
import tempfile
import logging
import json
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, List
from queue import Queue
from threading import Lock

import whisper
import ffmpeg
from fastapi import FastAPI, HTTPException, UploadFile, File, Header, Depends, Request
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Whisper Transcription Service", version="1.0.0")


@app.on_event("startup")
async def startup_event():
    """Pre-load Whisper model on startup for faster first request."""
    logger.info("Application startup - pre-loading Whisper model...")
    try:
        # Pre-load the model in background
        import threading
        def preload_model():
            get_whisper_model()
            logger.info("✅ Whisper model pre-loaded successfully on startup")
        
        thread = threading.Thread(target=preload_model, daemon=True)
        thread.start()
        logger.info("Model pre-loading initiated in background")
    except Exception as e:
        logger.warning(f"Failed to pre-load model on startup: {e}. Will load on first request.")
    
    # Start background cleanup task
    async def periodic_cleanup():
        """Periodically clean up expired sessions."""
        while True:
            try:
                await asyncio.sleep(60)  # Run every minute
                cleanup_expired_sessions()
            except Exception as e:
                logger.error(f"Error in periodic cleanup: {e}")
    
    # Start cleanup task in background
    asyncio.create_task(periodic_cleanup())
    logger.info("Periodic session cleanup task started")

# CORS configuration - restrict origins in production
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",")
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()]

# If no origins specified, default to allowing all (with warning)
if not ALLOWED_ORIGINS:
    logger.warning("ALLOWED_ORIGINS not set. CORS is open to all origins. Set ALLOWED_ORIGINS env var for production.")
    ALLOWED_ORIGINS = ["*"]

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Redis connection with improved error handling
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client = None
redis_retry_count = 0
MAX_REDIS_RETRIES = 3

def init_redis():
    """Initialize Redis connection with retry logic."""
    global redis_client, redis_retry_count
    if redis_client is not None:
        return redis_client
    
    try:
        redis_client = redis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
            health_check_interval=30
        )
        redis_client.ping()
        logger.info(f"Redis connected successfully: {REDIS_URL}")
        redis_retry_count = 0
        return redis_client
    except redis.ConnectionError as e:
        redis_retry_count += 1
        if redis_retry_count <= MAX_REDIS_RETRIES:
            logger.warning(f"Redis connection failed (attempt {redis_retry_count}/{MAX_REDIS_RETRIES}): {e}")
        else:
            logger.error(f"Redis connection failed after {MAX_REDIS_RETRIES} attempts: {e}. Using in-memory storage.")
            redis_client = None
        return None
    except Exception as e:
        logger.error(f"Unexpected Redis error: {e}. Using in-memory storage.")
        redis_client = None
        return None

# Initialize Redis on startup
init_redis()

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
REQUIRE_API_KEY = os.getenv("REQUIRE_API_KEY", "true").lower() == "true"

# Validate API key configuration
if REQUIRE_API_KEY and not WHISPER_API_KEY:
    logger.warning("REQUIRE_API_KEY is true but WHISPER_API_KEY is not set. API authentication is disabled.")
    logger.warning("Set WHISPER_API_KEY environment variable or set REQUIRE_API_KEY=false to disable this warning.")
elif not REQUIRE_API_KEY:
    logger.warning("API key authentication is disabled (REQUIRE_API_KEY=false). This is not recommended for production.")

# Processing queue
processing_queue = Queue(maxsize=10)


def get_whisper_model():
    """Load Whisper model (singleton pattern)."""
    global whisper_model
    if whisper_model is None:
        with model_lock:
            if whisper_model is None:
                logger.info(f"Loading Whisper model: {WHISPER_MODEL}")
                whisper_model = whisper.load_model(WHISPER_MODEL, device=WHISPER_DEVICE)
                logger.info("Whisper model loaded successfully")
    return whisper_model


def get_session_storage():
    """Get session storage (Redis or in-memory)."""
    # Try to reconnect if Redis was lost
    if redis_client is None:
        init_redis()
    return redis_client if redis_client else sessions


def get_session(session_id: str) -> Optional[Dict]:
    """Get session data with error handling."""
    if redis_client:
        try:
            data = redis_client.get(f"session:{session_id}")
            if data:
                return json.loads(data)
            return None
        except redis.RedisError as e:
            logger.error(f"Redis error getting session {session_id}: {e}")
            # Fallback to in-memory
            with sessions_lock:
                return sessions.get(session_id)
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error for session {session_id}: {e}")
            return None
    else:
        with sessions_lock:
            return sessions.get(session_id)


def save_session(session_id: str, data: Dict):
    """Save session data with error handling."""
    if redis_client:
        try:
            redis_client.setex(
                f"session:{session_id}",
                SESSION_TTL,
                json.dumps(data)
            )
        except redis.RedisError as e:
            logger.error(f"Redis error saving session {session_id}: {e}")
            # Fallback to in-memory
            with sessions_lock:
                sessions[session_id] = data
            # Try to reconnect
            init_redis()
    else:
        with sessions_lock:
            sessions[session_id] = data


def delete_session(session_id: str):
    """Delete session data with error handling."""
    # Clean up buffer audio file if it exists
    try:
        session = get_session(session_id)
        if session and session.get("buffer_audio_path"):
            buffer_path = session.get("buffer_audio_path")
            if buffer_path and os.path.exists(buffer_path):
                try:
                    os.unlink(buffer_path)
                    logger.debug(f"Cleaned up buffer file: {buffer_path}")
                except OSError as e:
                    logger.warning(f"Failed to cleanup buffer file {buffer_path}: {e}")
    except Exception as e:
        logger.warning(f"Error cleaning up buffer for session {session_id}: {e}")
    
    if redis_client:
        try:
            redis_client.delete(f"session:{session_id}")
        except redis.RedisError as e:
            logger.error(f"Redis error deleting session {session_id}: {e}")
            # Fallback to in-memory
            with sessions_lock:
                sessions.pop(session_id, None)
    else:
        with sessions_lock:
            sessions.pop(session_id, None)


def cleanup_expired_sessions():
    """Clean up expired sessions based on last activity time."""
    now = datetime.now(timezone.utc)
    expired_count = 0
    
    if redis_client:
        # Redis handles TTL automatically, but we can still clean up stale sessions
        # by checking keys and their TTL
        try:
            # Get all session keys
            session_keys = redis_client.keys("session:*")
            for key in session_keys:
                try:
                    # Check TTL - if it's -1 (no expiry) or very old, check the session data
                    ttl = redis_client.ttl(key)
                    if ttl == -1:  # No expiry set, check manually
                        data = redis_client.get(key)
                        if data:
                            session = json.loads(data)
                            last_chunk_time = session.get("last_chunk_time")
                            created_at = session.get("created_at")
                            
                            # Check if session is expired
                            if last_chunk_time:
                                last_time = datetime.fromisoformat(last_chunk_time.replace('Z', '+00:00'))
                                if (now - last_time).total_seconds() > SESSION_TTL:
                                    redis_client.delete(key)
                                    expired_count += 1
                                    logger.info(f"Cleaned up expired session: {key}")
                            elif created_at:
                                created_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                                if (now - created_time).total_seconds() > SESSION_TTL:
                                    redis_client.delete(key)
                                    expired_count += 1
                                    logger.info(f"Cleaned up expired session: {key}")
                except Exception as e:
                    logger.warning(f"Error checking session {key}: {e}")
        except redis.RedisError as e:
            logger.warning(f"Redis error during cleanup: {e}")
    else:
        # In-memory cleanup
        with sessions_lock:
            expired_sessions = []
            for session_id, session in sessions.items():
                last_chunk_time = session.get("last_chunk_time")
                created_at = session.get("created_at")
                
                # Check if session is expired
                expired = False
                if last_chunk_time:
                    try:
                        last_time = datetime.fromisoformat(last_chunk_time.replace('Z', '+00:00'))
                        if (now - last_time).total_seconds() > SESSION_TTL:
                            expired = True
                    except Exception as e:
                        logger.warning(f"Error parsing last_chunk_time for session {session_id}: {e}")
                
                if not expired and created_at:
                    try:
                        created_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                        if (now - created_time).total_seconds() > SESSION_TTL:
                            expired = True
                    except Exception as e:
                        logger.warning(f"Error parsing created_at for session {session_id}: {e}")
                
                if expired:
                    expired_sessions.append(session_id)
            
            # Delete expired sessions
            for session_id in expired_sessions:
                delete_session(session_id)
                expired_count += 1
                logger.info(f"Cleaned up expired session: {session_id}")
    
    if expired_count > 0:
        logger.info(f"Cleaned up {expired_count} expired session(s)")
    
    return expired_count


def verify_api_key(api_key: Optional[str] = Header(None, alias="X-API-Key")):
    """Verify API key. Raises HTTPException if invalid."""
    if not REQUIRE_API_KEY:
        return  # API key not required
    
    if not WHISPER_API_KEY:
        logger.warning("API key verification requested but WHISPER_API_KEY not set")
        return  # Allow if not configured (backward compatibility)
    
    if not api_key:
        logger.warning("API key required but not provided in request")
        raise HTTPException(status_code=401, detail="API key required")
    
    if api_key != WHISPER_API_KEY:
        logger.warning(f"Invalid API key attempted")
        raise HTTPException(status_code=403, detail="Invalid API key")
    
    return  # Valid API key


# Pydantic models
class SessionCreate(BaseModel):
    prompt: Optional[str] = None


class ChunkResponse(BaseModel):
    session_id: str
    transcript: str
    is_final: bool


@app.get("/health")
async def health_check():
    """Health check endpoint. Also triggers model loading if not already loaded."""
    redis_connected = False
    active_sessions = 0
    model_loaded = whisper_model is not None
    
    # Trigger model load if not loaded (for warmup)
    if not model_loaded:
        try:
            get_whisper_model()
            model_loaded = True
        except Exception as e:
            logger.warning(f"Model loading failed during health check: {e}")
    
    if redis_client:
        try:
            redis_client.ping()
            redis_connected = True
            active_sessions = redis_client.dbsize()
        except Exception as e:
            logger.warning(f"Redis health check failed: {e}")
            redis_connected = False
    
    if not redis_connected:
        with sessions_lock:
            active_sessions = len(sessions)
    
    return {
        "status": "healthy",
        "model": WHISPER_MODEL,
        "device": WHISPER_DEVICE,
        "model_loaded": model_loaded,
        "redis_connected": redis_connected,
        "active_sessions": active_sessions,
        "ready": model_loaded  # Indicates if ready to process requests
    }


@app.post("/api/v1/sessions")
@limiter.limit("10/minute")
async def create_session(
    request: Request,
    session_data: SessionCreate,
    request_obj=Depends(verify_api_key)
):
    """Create a new transcription session."""
    # Clean up expired sessions before checking limit
    cleanup_expired_sessions()
    
    # Check session limit after cleanup
    if redis_client:
        try:
            # Count only session keys
            session_keys = redis_client.keys("session:*")
            active_count = len(session_keys)
        except redis.RedisError as e:
            logger.error(f"Redis error checking session count: {e}")
            with sessions_lock:
                active_count = len(sessions)
    else:
        with sessions_lock:
            active_count = len(sessions)
    
    if active_count >= MAX_SESSIONS:
        # Try one more aggressive cleanup
        cleanup_expired_sessions()
        # Recheck count
        if redis_client:
            try:
                session_keys = redis_client.keys("session:*")
                active_count = len(session_keys)
            except redis.RedisError:
                with sessions_lock:
                    active_count = len(sessions)
        else:
            with sessions_lock:
                active_count = len(sessions)
        
        if active_count >= MAX_SESSIONS:
            raise HTTPException(status_code=503, detail="Maximum sessions reached")
    
    session_id = str(uuid.uuid4())
    session_data = {
        "session_id": session_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "transcript": "",
        "prompt": session_data.prompt,
        "chunk_count": 0,
        "last_chunk_time": None,
        "buffer_audio": None,  # Will store last 2 seconds of audio
    }
    
    save_session(session_id, session_data)
    
    return {"session_id": session_id, "status": "created"}


@app.get("/api/v1/sessions/{session_id}")
async def get_session_endpoint(session_id: str, request_obj=Depends(verify_api_key)):
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
    request: Request,
    session_id: str,
    file: UploadFile = File(...),
    request_obj=Depends(verify_api_key)
):
    """Process an audio chunk and return incremental transcript."""
    # Verify session exists
    try:
        session = get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Ensure session is a dict, not a coroutine
        if not isinstance(session, dict):
            logger.error(f"Invalid session type: {type(session)} for session {session_id}")
            raise HTTPException(status_code=500, detail="Invalid session data")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session {session_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get session: {str(e)}")
    
    # Check queue capacity
    if processing_queue.full():
        raise HTTPException(status_code=429, detail="Processing queue full")
    
    try:
        # Read audio file
        audio_data = await file.read()
        
        # Validate audio data - WebM files need at least a few KB to be valid
        if not audio_data or len(audio_data) < 2048:  # Minimum 2KB for valid WebM chunk
            logger.warning(f"Audio chunk too small: {len(audio_data) if audio_data else 0} bytes - skipping")
            # Return empty transcript for small/incomplete chunks
            session = get_session(session_id)
            if session:
                return {
                    "session_id": session_id,
                    "transcript": session.get("transcript", ""),
                    "incremental": "",
                    "is_final": False,
                }
            raise HTTPException(status_code=400, detail=f"Audio chunk is too small ({len(audio_data) if audio_data else 0} bytes). Minimum 2KB required.")
        
        logger.debug(f"Processing audio chunk: {len(audio_data)} bytes for session {session_id}")
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp_file:
            tmp_file.write(audio_data)
            tmp_webm_path = tmp_file.name
        
        # Convert WebM to WAV using ffmpeg
        tmp_wav_path = tmp_webm_path.replace(".webm", ".wav")
        try:
            # First, probe the file to check if it's valid
            probe_valid = False
            try:
                probe = ffmpeg.probe(tmp_webm_path)
                if probe and 'streams' in probe and len(probe['streams']) > 0:
                    probe_valid = True
                    logger.debug(f"WebM file validated: {len(probe.get('streams', []))} stream(s)")
                else:
                    logger.warning(f"Invalid WebM file: no streams found")
            except Exception as probe_error:
                error_str = str(probe_error)
                # Check if it's an EBML/header parsing error (incomplete chunk)
                if "EBML" in error_str or "Invalid data" in error_str or "Error opening input" in error_str:
                    logger.warning(f"Incomplete WebM chunk detected (likely MediaRecorder fragment): {probe_error}")
                    # Cleanup and return current transcript without error
                    if os.path.exists(tmp_webm_path):
                        os.unlink(tmp_webm_path)
                    session = get_session(session_id)
                    if session:
                        return {
                            "session_id": session_id,
                            "transcript": session.get("transcript", ""),
                            "incremental": "",
                            "is_final": False,
                        }
                    raise HTTPException(status_code=400, detail="Incomplete audio chunk - skipping")
                else:
                    logger.warning(f"ffmpeg probe failed: {probe_error}")
            
            # Only proceed if probe was successful or we want to try anyway
            if not probe_valid:
                logger.warning("Skipping chunk due to invalid probe")
                if os.path.exists(tmp_webm_path):
                    os.unlink(tmp_webm_path)
                session = get_session(session_id)
                if session:
                    return {
                        "session_id": session_id,
                        "transcript": session.get("transcript", ""),
                        "incremental": "",
                        "is_final": False,
                    }
                raise HTTPException(status_code=400, detail="Invalid audio chunk format")
            
            # Capture stderr to see actual ffmpeg errors
            process = (
                ffmpeg
                .input(tmp_webm_path)
                .output(
                    tmp_wav_path,
                    acodec='pcm_s16le',
                    ac=1,
                    ar='16000',
                    loglevel='error'
                )
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
        except ffmpeg.Error as e:
            # Log the actual ffmpeg error
            error_msg = str(e)
            stderr_msg = ""
            if hasattr(e, 'stderr') and e.stderr:
                stderr_msg = e.stderr.decode('utf-8', errors='ignore')
                error_msg = f"{error_msg}\nffmpeg stderr: {stderr_msg}"
            
            # Check if it's an incomplete chunk error
            if "EBML" in stderr_msg or "Invalid data" in stderr_msg or "Error opening input" in stderr_msg:
                logger.warning(f"Incomplete WebM chunk (EBML error): {stderr_msg[:200]}")
                # Cleanup and return current transcript without error
                if os.path.exists(tmp_webm_path):
                    os.unlink(tmp_webm_path)
                session = get_session(session_id)
                if session:
                    return {
                        "session_id": session_id,
                        "transcript": session.get("transcript", ""),
                        "incremental": "",
                        "is_final": False,
                    }
                raise HTTPException(status_code=400, detail="Incomplete audio chunk - skipping")
            
            logger.error(f"ffmpeg conversion failed for session {session_id}: {error_msg}")
            
            # Cleanup temp file
            if os.path.exists(tmp_webm_path):
                os.unlink(tmp_webm_path)
            
            raise HTTPException(status_code=400, detail=f"Audio conversion failed: {error_msg}")
        except Exception as e:
            logger.error(f"Unexpected error during ffmpeg conversion: {e}", exc_info=True)
            if os.path.exists(tmp_webm_path):
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
                logger.warning(f"Buffer concatenation failed: {e}. Using new chunk only.")
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
        
        # Update session with merged transcript
        session["transcript"] = merged_transcript
        session["chunk_count"] = session.get("chunk_count", 0) + 1
        session["last_chunk_time"] = datetime.now(timezone.utc).isoformat()
        
        save_session(session_id, session)
        
        logger.info(f"Processed chunk {session['chunk_count']} for session {session_id}: "
                   f"merged transcript length={len(merged_transcript)}, "
                   f"new text='{new_transcript[:50]}...'")
        
        # Cleanup temp files with improved error handling
        temp_files_to_cleanup = [tmp_webm_path]
        if audio_path != tmp_wav_path and os.path.exists(audio_path):
            temp_files_to_cleanup.append(audio_path)
        
        # Clean up old buffer file
        old_buffer = session.get("buffer_audio_path")
        if old_buffer and old_buffer != buffer_wav_path and os.path.exists(old_buffer):
            temp_files_to_cleanup.append(old_buffer)
        
        # Clean up all temp files
        for temp_file in temp_files_to_cleanup:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
                    logger.debug(f"Cleaned up temp file: {temp_file}")
            except OSError as e:
                logger.warning(f"Failed to cleanup temp file {temp_file}: {e}")
        
        # Note: tmp_wav_path is kept for buffer extraction, cleaned up in next iteration
        
        # Return merged transcript for continuous streaming transcription
        # The merged transcript contains all previous slices merged with the latest slice
        return {
            "session_id": session_id,
            "transcript": merged_transcript,  # Complete merged transcript so far
            "incremental": new_transcript,     # Just the new text from this slice
            "is_final": False,
        }
        
    except Exception as e:
        # Cleanup on error with improved logging
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Error processing chunk for session {session_id}: {error_details}")
        
        # Cleanup any temp files that were created
        temp_files_to_cleanup = []
        if 'tmp_webm_path' in locals() and tmp_webm_path and os.path.exists(tmp_webm_path):
            temp_files_to_cleanup.append(tmp_webm_path)
        if 'tmp_wav_path' in locals() and tmp_wav_path and os.path.exists(tmp_wav_path):
            temp_files_to_cleanup.append(tmp_wav_path)
        if 'audio_path' in locals() and audio_path and audio_path != tmp_wav_path and os.path.exists(audio_path):
            temp_files_to_cleanup.append(audio_path)
        
        for temp_file in temp_files_to_cleanup:
            try:
                os.unlink(temp_file)
            except OSError as cleanup_error:
                logger.warning(f"Failed to cleanup temp file {temp_file} on error: {cleanup_error}")
        
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@app.post("/api/v1/sessions/{session_id}/finalize")
async def finalize_session(session_id: str, request_obj=Depends(verify_api_key)):
    """Finalize a session and return complete transcript."""
    try:
        session = get_session(session_id)
        if not session:
            logger.warning(f"Session not found: {session_id}")
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Ensure session is a dict, not a coroutine
        if not isinstance(session, dict):
            logger.error(f"Invalid session type: {type(session)} for session {session_id}")
            raise HTTPException(status_code=500, detail="Invalid session data")
        
        final_transcript = session.get("transcript", "")
        
        # Mark as completed
        session["status"] = "completed"
        session["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        # Save before deleting (in case client needs to retrieve it)
        save_session(session_id, session)
        
        # Delete session immediately after finalization to free up space
        # Sessions are typically one-time use, so we can clean them up right away
        delete_session(session_id)
        logger.info(f"Finalized and cleaned up session: {session_id}")
        
        return {
            "session_id": session_id,
            "transcript": final_transcript,
            "is_final": True,
            "chunk_count": session.get("chunk_count", 0),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error finalizing session {session_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to finalize transcription: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    logger.info(f"Starting Whisper service on {host}:{port}")
    logger.info(f"Model: {WHISPER_MODEL}, Device: {WHISPER_DEVICE}")
    logger.info(f"Redis: {'Connected' if redis_client else 'Using in-memory storage'}")
    uvicorn.run(app, host=host, port=port, log_level="info")


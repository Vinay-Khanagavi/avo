"""
Grok API service for post-processing Whisper transcriptions.
Uses Groq API (Grok-compatible endpoint) to improve transcriptions.
"""

import os
import logging
import requests
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# Groq API configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.getenv("GROQ_MODEL", "mixtral-8x7b-32768")  # or "llama-3.1-70b-versatile"


def get_prompt_for_content_type(content_type: Optional[str], transcript: str) -> str:
    """Generate context-aware prompt based on content type."""
    
    base_instructions = """You are a text improvement assistant. Improve the following transcription:
- Fix grammar and spelling errors
- Remove filler words (um, uh, like, you know, etc.)
- Improve clarity and flow
- Maintain the original meaning and intent"""

    if content_type == "email":
        return f"""{base_instructions}
- Format as a professional email with proper structure
- Ensure proper greeting and closing
- Use professional tone

Raw transcription: {transcript}

Return only the improved email text, no explanations."""

    elif content_type == "message":
        return f"""{base_instructions}
- Keep casual, friendly tone
- Remove filler words and corrections (like "actually no")
- Make it sound natural for a text message

Raw transcription: {transcript}

Return only the improved message text, no explanations."""

    elif content_type == "list":
        return f"""{base_instructions}
- Format as a clear, numbered or bulleted list
- Each item should be on its own line
- Remove unnecessary words, keep items concise

Raw transcription: {transcript}

Return only the improved list text, no explanations."""

    elif content_type == "prompt":
        return f"""{base_instructions}
- Improve clarity and structure for use as an AI prompt
- Make it more specific and actionable
- Ensure it's well-organized and easy to understand

Raw transcription: {transcript}

Return only the improved prompt text, no explanations."""

    else:
        # Default: general improvement
        return f"""{base_instructions}

Raw transcription: {transcript}

Return only the improved text, no explanations."""


def improve_transcript(transcript: str, content_type: Optional[str] = None) -> str:
    """
    Improve a transcript using Groq API (Grok-compatible).
    
    Args:
        transcript: Raw transcript text from Whisper
        content_type: Type of content ("email", "message", "list", "prompt", or None)
    
    Returns:
        Improved transcript text, or original transcript if API call fails
    """
    # If no API key, return original transcript
    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set. Skipping transcript improvement.")
        return transcript
    
    # If transcript is empty, return as-is
    if not transcript or not transcript.strip():
        return transcript
    
    try:
        # Generate prompt based on content type
        prompt = get_prompt_for_content_type(content_type, transcript)
        
        # Prepare API request
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": GROQ_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.3,  # Lower temperature for more consistent, factual improvements
            "max_tokens": 2000,
        }
        
        # Make API request
        logger.info(f"Calling Groq API to improve transcript (content_type: {content_type})")
        response = requests.post(
            GROQ_API_URL,
            headers=headers,
            json=payload,
            timeout=30  # 30 second timeout
        )
        
        # Check response
        if response.status_code == 200:
            data = response.json()
            improved_text = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            
            if improved_text:
                logger.info(f"Successfully improved transcript (original length: {len(transcript)}, improved length: {len(improved_text)})")
                return improved_text
            else:
                logger.warning("Groq API returned empty response. Using original transcript.")
                return transcript
        else:
            logger.error(f"Groq API error: {response.status_code} - {response.text}")
            return transcript
            
    except requests.exceptions.Timeout:
        logger.error("Groq API request timed out. Using original transcript.")
        return transcript
    except requests.exceptions.RequestException as e:
        logger.error(f"Groq API request failed: {e}. Using original transcript.")
        return transcript
    except Exception as e:
        logger.error(f"Unexpected error improving transcript: {e}. Using original transcript.")
        return transcript


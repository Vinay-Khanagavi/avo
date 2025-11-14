
# AVO

Production-grade, real-time voice-to-text app with multi-service transcription, AI formatting, and custom dictionary. Built with Next.js 16, FastAPI, and PostgreSQL.

---


## Advanced Techniques & Algorithms

- **Audio Buffer Overlap**: 5-second audio chunks with 2-second overlap to preserve context and prevent word loss at chunk boundaries.
- **Hash-Based Duplicate Detection**: Uses hashing of word sequences to detect and merge overlapping or repeated transcript segments across audio chunks.
- **Smart Transcript Merging**: Aligns and merges partial results from streaming APIs, removing duplicates and ensuring seamless, incremental output.
- **Longest-Match Dictionary Replacement**: Applies user-defined word/phrase substitutions, sorted by length, for maximum accuracy.
- **Streaming Architecture**: Real-time chunked audio upload and processing, with low-latency feedback.
- **AI Post-Processing**: Optional formatting with Groq, OpenAI, or local LLM for bullet points, grammar, and structure.

See [`docs/WHISPERFLOW_MODEL_ANALYSIS.md`](./docs/WHISPERFLOW_MODEL_ANALYSIS.md) and [`docs/WISPR_FLOW_COMPARISON.md`](./docs/WISPR_FLOW_COMPARISON.md) for technical details.

---


## Features

- **Multi-Service Transcription**: Whisper (self-hosted FastAPI), Deepgram, AssemblyAI, Groq Whisper (Groq API)
- **AI Formatting**: Groq, OpenAI, or local LLM for bullet points, grammar, and smart formatting
- **Custom Dictionary**: User-defined word/phrase substitutions for accuracy
- **Authentication**: NextAuth.js (email/password)
- **Transcription History**: Search, copy, and manage past transcriptions
- **Settings**: Choose provider, manage API keys, and formatting preferences
- **Modern UI**: ShadCN + Tailwind v4, mobile-first, accessible
- **Security**: API key encryption, rate limiting, CORS, and protected routes

---


## Tech Stack

- Framework: Next.js 16 (App Router)
- UI: ShadCN UI (customized) + Tailwind CSS v4
- Database: PostgreSQL with Prisma ORM
- Authentication: NextAuth.js
- Transcription APIs: Whisper (FastAPI), Deepgram, AssemblyAI, Groq Whisper
- AI Formatting: Groq, OpenAI, Local LLM (Ollama)
- Hosting: Railway, Docker, AWS EC2 (for Whisper)

---


## Architecture

- **Next.js 16 App Router**: Main web app, API, and UI
- **Whisper Service (FastAPI)**: Streaming, chunked transcription with buffer overlap
- **Database**: PostgreSQL + Prisma (users, transcriptions, dictionary, settings)
- **AI Formatting**: Groq, OpenAI, or local LLM (Ollama)

All transcription services are routed through `/api/transcribe/stream` with a unified API. See [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) for a full architecture and workflow breakdown.

## 🧪 Advanced Techniques & Algorithms

AVO leverages state-of-the-art techniques inspired by the Wispr Flow research paper to deliver highly accurate, real-time transcription:

- **Audio Buffer Overlap**: 5-second audio chunks with 2-second overlap to preserve context and prevent word loss at chunk boundaries.
- **Hash-Based Duplicate Detection**: Uses hashing of word sequences to detect and merge overlapping or repeated transcript segments across audio chunks.
- **Smart Transcript Merging**: Aligns and merges partial results from streaming APIs, removing duplicates and ensuring seamless, incremental output.
- **Longest-Match Dictionary Replacement**: Applies user-defined word/phrase substitutions, sorted by length, for maximum accuracy.
- **Streaming Architecture**: Real-time chunked audio upload and processing, with low-latency feedback.
- **AI Post-Processing**: Optional formatting with Groq, OpenAI, or local LLM for bullet points, grammar, and structure.

See [`docs/WHISPERFLOW_MODEL_ANALYSIS.md`](./docs/WHISPERFLOW_MODEL_ANALYSIS.md) and [`docs/WISPR_FLOW_COMPARISON.md`](./docs/WISPR_FLOW_COMPARISON.md) for technical details.

---


## ✨ Features

- **Multi-Service Transcription**: Whisper (self-hosted FastAPI), Deepgram, AssemblyAI, Groq Whisper (Groq API)
- **AI Formatting**: Groq, OpenAI, or local LLM for bullet points, grammar, and smart formatting
- **Custom Dictionary**: User-defined word/phrase substitutions for accuracy
- **Authentication**: NextAuth.js (email/password)
- **Transcription History**: Search, copy, and manage past transcriptions
- **Settings**: Choose provider, manage API keys, and formatting preferences
- **Modern UI**: ShadCN + Tailwind v4, mobile-first, accessible
- **Security**: API key encryption, rate limiting, CORS, and protected routes

---

## 🏗️ Architecture

- **Next.js 16 App Router**: Main web app, API, and UI
- **Whisper Service (FastAPI)**: Streaming, chunked transcription with buffer overlap
- **Database**: PostgreSQL + Prisma (users, transcriptions, dictionary, settings)
- **AI Formatting**: Groq, OpenAI, or local LLM (Ollama)

All transcription services are routed through `/api/transcribe/stream` with a unified API. See [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) for a full architecture and workflow breakdown.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+, Yarn
- Python 3.10+ (for Whisper service)
- PostgreSQL (local or Railway)

### 1. Install dependencies

```bash
cd ai-voice-keyboard
yarn install
```

### 2. Set up environment variables

Create `.env.local`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ai_voice_keyboard"

# Auth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Transcription Services
WHISPER_SERVICE_URL="http://localhost:8000"
WHISPER_API_KEY="your-whisper-api-key"
DEEPGRAM_API_KEY="your-deepgram-key"
ASSEMBLYAI_API_KEY="your-assemblyai-key"
GROQ_API_KEY="your-groq-key"
OPENAI_API_KEY="your-openai-key"
OLLAMA_URL="http://localhost:11434"
```

### 3. Database setup

```bash
yarn prisma generate
---
```

### 4. Start services

**Main app:**
```bash
yarn dev
```

**Whisper service:**
```bash
cd whisper-service
pip install -r requirements.txt
python app.py
```

---

## 🗂️ Project Structure

```

├── app/                # Next.js app router, API, pages
---


# AI Voice Keyboard App

A production-quality AI Voice Keyboard web application that transforms speech into accurate, well-formatted text using Amazon Transcribe.

## Features

- **Authentication**: Email/password signup and login with NextAuth.js
- **Voice Dictation**: Real-time speech-to-text transcription with 5-second audio chunking
- **Custom Dictionary**: Add/update/delete custom words to improve transcription accuracy
- **Transcription History**: View, search, and copy past transcriptions
- **Settings**: Configure language and transcription preferences
- **Clean UI**: Minimalist design with ShadCN UI components and Tailwind v4


## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: ShadCN UI (customized) + Tailwind CSS v4
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Transcription APIs**: Whisper (FastAPI, self-hosted), Deepgram, AssemblyAI, Groq Whisper
- **AI Formatting**: Groq, OpenAI, Local LLM (Ollama)
- **Hosting**: Railway (recommended), Docker, AWS EC2 (for Whisper)

## Getting Started

### Prerequisites

- Node.js 18+ and Yarn
- PostgreSQL database (local or Railway)
- AWS account with Transcribe access
- AWS CLI configured with credentials

### Installation

1. **Clone and install dependencies:**

```bash
cd ai-voice-keyboard
yarn install
```

2. **Set up environment variables:**

Create a `.env.local` file:

│   ├── (auth)/          # Authentication pages


# AVO

Real-time, production-grade voice-to-text app with multi-service transcription, AI formatting, and custom dictionary. Built with Next.js 16, FastAPI, and PostgreSQL.

---

## ✨ Features

- **Multi-Service Transcription**: Whisper (self-hosted), Deepgram, AssemblyAI, and fallback to AWS Transcribe
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

See [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) for a full architecture and workflow breakdown.

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

│   ├── auth.ts          # NextAuth configuration

# AI Voice Keyboard


Production-grade, real-time voice-to-text app with multi-service transcription, AI formatting, and custom dictionary. Built with Next.js 16, FastAPI, and PostgreSQL.

---

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
├── components/         # UI and feature components
├── lib/                # Service integrations, utils
├── prisma/             # DB schema, migrations
├── whisper-service/    # FastAPI microservice (Python)
├── types/              # TypeScript types
```

---


## 🧠 Key Concepts

- **Audio Pipeline**: 5s WebM chunks, 2s buffer overlap, server-side merging
- **Service Routing**: `/api/transcribe/stream` proxies to selected backend (Whisper, Deepgram, AssemblyAI, Groq Whisper)
- **AI Formatting**: Optional, user-selectable, always falls back to raw transcript
- **Dictionary**: Longest-match, word/phrase replacement, user-specific
- **API Key Security**: Encrypted at rest, never sent to client

---

## 🛠️ Development

- **yarn dev**: Start Next.js app
- **python app.py**: Start Whisper service
- **yarn prisma studio**: DB browser
- **yarn prisma migrate dev**: Run migrations

See [`docs/`](./docs/) for advanced guides, deployment, and troubleshooting.

---


## 🏭 Deployment

- **Railway (recommended)**: One-click deploy for app and DB
- **Whisper Service**: Deploy separately (Docker, EC2, Railway)
- **Environment**: Set all required variables in Railway dashboard

See [`docs/deployment/RAILWAY_DEPLOYMENT.md`](./docs/deployment/RAILWAY_DEPLOYMENT.md) for full instructions.

---

## 🔒 Security & Best Practices

- API keys encrypted (AES-256-CBC)
- All API routes (except health) require auth
- Rate limiting on transcription endpoints
- CORS restricted in production
- Never expose secrets to client

---

## 📚 Documentation

- [AI Post-Processing Plan](./docs/AI_POST_PROCESSING_PLAN.md)
- [Whisper Service](./whisper-service/README.md)
- [Deployment Guide](./docs/deployment/RAILWAY_DEPLOYMENT.md)
- [Troubleshooting](./docs/troubleshooting/500_ERROR_FIX.md)

---

## License

MIT
## 🧠 Key Concepts

- **Audio Pipeline**: 5s WebM chunks, 2s buffer overlap, server-side merging
- **Service Routing**: `/api/transcribe/stream` proxies to selected backend
- **AI Formatting**: Optional, user-selectable, always falls back to raw transcript
- **Dictionary**: Longest-match, word/phrase replacement, user-specific
- **API Key Security**: Encrypted at rest, never sent to client

---

## 🛠️ Development

- **yarn dev**: Start Next.js app
- **python app.py**: Start Whisper service
- **yarn prisma studio**: DB browser
- **yarn prisma migrate dev**: Run migrations

See [`docs/`](./docs/) for advanced guides, deployment, and troubleshooting.

---

## 🏭 Deployment

- **Railway (recommended)**: One-click deploy for app and DB
- **Whisper Service**: Deploy separately (Docker, EC2, Railway)
- **Environment**: Set all required variables in Railway dashboard

See [`docs/deployment/RAILWAY_DEPLOYMENT.md`](./docs/deployment/RAILWAY_DEPLOYMENT.md) for full instructions.

---

## 🔒 Security & Best Practices

- API keys encrypted (AES-256-CBC)
- All API routes (except health) require auth
- Rate limiting on transcription endpoints
- CORS restricted in production
- Never expose secrets to client

---

## 📚 Documentation

- [AI Post-Processing Plan](./docs/AI_POST_PROCESSING_PLAN.md)
- [Whisper Service](./whisper-service/README.md)
- [Deployment Guide](./docs/deployment/RAILWAY_DEPLOYMENT.md)
- [Troubleshooting](./docs/troubleshooting/500_ERROR_FIX.md)

---

## License

MIT
```

## AWS Setup

### Configure AWS Credentials

The app uses AWS CLI credentials from `~/.aws/credentials`. Ensure you have:

1. AWS CLI installed and configured:
```bash
aws configure
```

2. IAM user with Transcribe permissions:
   - `transcribe:StartTranscriptionJob`
   - `transcribe:GetTranscriptionJob`
   - `s3:PutObject` (if using S3 for audio storage)

### Production AWS Transcribe Setup

For production, you'll need to:
1. Set up an S3 bucket for audio storage
2. Update `/app/api/transcribe/route.ts` to upload audio to S3
3. Start transcription jobs and poll for completion
4. Retrieve transcripts from the job results

Currently, the API includes a mock implementation for development.

## Deployment on Railway

See the [Deployment Documentation](./docs/deployment/RAILWAY_DEPLOYMENT.md) for complete deployment instructions.

Quick steps:
1. **Create Railway project** and connect your GitHub repository
2. **Add PostgreSQL** service in Railway
3. **Set environment variables** (see [Deployment Guide](./docs/deployment/RAILWAY_DEPLOYMENT.md#step-3-configure-environment-variables))
4. **Deploy**: Railway will automatically build and deploy

For troubleshooting, see [Troubleshooting Guide](./docs/troubleshooting/500_ERROR_FIX.md).

## Development Notes

- The app uses **yarn** as the package manager
- Tailwind v4 is configured with the Notebook theme from TweakCN
- Audio processing happens client-side using Web Audio API
- Authentication is handled server-side with NextAuth.js
- Database queries use Prisma ORM

## API Endpoints

- `POST /api/signup` - User registration
- `POST /api/auth/[...nextauth]` - NextAuth endpoints
- `POST /api/transcribe` - Transcribe audio
- `GET /api/transcriptions` - List transcriptions
- `GET /api/dictionary` - List dictionary words
- `POST /api/dictionary` - Add dictionary word
- `PUT /api/dictionary` - Update dictionary word
- `DELETE /api/dictionary` - Delete dictionary word

## License

MIT

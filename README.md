# AVO

Production-grade, real-time voice-to-text application with multi-service transcription, AI formatting, and custom dictionary support. Built with Next.js 16, FastAPI, and PostgreSQL.

---

## Overview

AVO is a comprehensive voice transcription platform that combines multiple transcription services with intelligent AI post-processing. The system uses advanced audio processing techniques including buffer overlap, duplicate detection, and smart merging to deliver accurate, real-time transcription results.

---

## Core Features

### Multi-Service Transcription
- **Whisper (Self-hosted)**: FastAPI-based service with streaming support and buffer overlap
- **Deepgram**: Cloud-based transcription with real-time streaming
- **AssemblyAI**: High-accuracy transcription service
- **Groq Whisper**: Groq API-powered Whisper implementation

### AI-Powered Formatting
- Automatic bullet point detection and conversion
- Grammar refinement and correction
- Punctuation improvement
- Capitalization fixes
- Supports Groq, OpenAI, and local LLM (Ollama)

### Custom Dictionary
- User-defined word and phrase substitutions
- Longest-match replacement algorithm for accuracy
- Persistent storage per user
- Integration with transcription prompts

### User Management
- NextAuth.js authentication with email/password
- Encrypted API key storage
- Per-user settings and preferences
- Transcription history with search functionality

### Security
- AES-256-CBC API key encryption
- Rate limiting on transcription endpoints
- CORS configuration
- Protected API routes with session validation

---

## Advanced Techniques

### Audio Buffer Overlap
5-second audio chunks with 2-second overlap preserve context and prevent word loss at chunk boundaries. The system maintains a rolling buffer that ensures continuity across segments.

### Hash-Based Duplicate Detection
Word sequence hashing detects and merges overlapping or repeated transcript segments. The algorithm uses difflib similarity scoring with a 90% threshold to identify duplicates while preserving legitimate variations.

### Smart Transcript Merging
Intelligent alignment and merging of partial results from streaming APIs. The system uses word-boundary detection and fuzzy matching to combine incremental transcription results without duplication.

### Streaming Architecture
Real-time chunked audio upload and processing with low-latency feedback. WebM audio with Opus codec is streamed in 5-second intervals, processed immediately, and results are returned incrementally.

For detailed technical analysis, see [`docs/WHISPERFLOW_MODEL_ANALYSIS.md`](./docs/WHISPERFLOW_MODEL_ANALYSIS.md) and [`docs/WISPR_FLOW_COMPARISON.md`](./docs/WISPR_FLOW_COMPARISON.md).

---

## Technology Stack

### Frontend
- **Framework**: Next.js 16 with App Router
- **UI Library**: ShadCN UI components (customized)
- **Styling**: Tailwind CSS v4
- **State Management**: React Context API
- **Forms**: React Hook Form with Zod validation
- **Authentication**: NextAuth.js

### Backend
- **API**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Transcription Service**: FastAPI (Python)
- **Session Storage**: Redis (with in-memory fallback)
- **Audio Processing**: ffmpeg

### AI Services
- **Transcription**: Whisper, Deepgram, AssemblyAI, Groq
- **Formatting**: Groq API, OpenAI API, Ollama (local)

### Deployment
- **Application**: Railway, Vercel
- **Whisper Service**: Docker, AWS EC2
- **Database**: Railway PostgreSQL, AWS RDS

---

## Architecture

### System Components

**Next.js Application**
- Handles user authentication and session management
- Provides web interface and API endpoints
- Routes transcription requests to appropriate services
- Manages database operations via Prisma

**Whisper Service (FastAPI)**
- Processes audio chunks with buffer overlap
- Implements duplicate detection and merging
- Supports GPU/CPU optimization
- Manages session state via Redis

**Database Layer**
- User accounts and authentication
- Transcription history
- Custom dictionary entries
- Encrypted user settings and API keys

**AI Formatting Layer**
- Optional post-processing of transcripts
- Multiple provider support with fallback
- Configurable formatting options

### Request Flow

1. Client captures audio via MediaRecorder API
2. Audio chunks sent to `/api/transcribe/stream`
3. API routes request to selected transcription service
4. Service processes audio and returns incremental results
5. Optional AI formatting applied to final transcript
6. Dictionary replacements applied
7. Results saved to database and returned to client

For complete architecture details, see [`.github/copilot-instructions.md`](../.github/copilot-instructions.md).

---

## Getting Started

### Prerequisites

- Node.js 20 or higher
- Yarn package manager
- Python 3.10 or higher (for Whisper service)
- PostgreSQL database
- ffmpeg (for audio processing)

### Installation

1. Clone the repository and install dependencies:

```bash
cd ai-voice-keyboard
yarn install
```

2. Configure environment variables:

Create `.env.local` in the project root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ai_voice_keyboard"

# Authentication
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Whisper Service
WHISPER_SERVICE_URL="http://localhost:8000"
WHISPER_API_KEY="your-whisper-api-key"

# Transcription Services (optional)
DEEPGRAM_API_KEY="your-deepgram-key"
ASSEMBLYAI_API_KEY="your-assemblyai-key"
GROQ_API_KEY="your-groq-key"

# AI Formatting (optional)
OPENAI_API_KEY="your-openai-key"
OLLAMA_URL="http://localhost:11434"
```

3. Set up the database:

```bash
yarn prisma generate
yarn prisma migrate dev
```

4. Start the development server:

```bash
yarn dev
```

5. Start the Whisper service (in a separate terminal):

```bash
cd whisper-service
pip install -r requirements.txt
python app.py
```

The application will be available at `http://localhost:3000`.

---

## Project Structure

```
ai-voice-keyboard/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/         # Protected dashboard pages
│   │   ├── dictation/       # Main recording interface
│   │   ├── dictionary/      # Custom word management
│   │   ├── history/         # Transcription history
│   │   └── settings/        # User settings
│   └── api/                 # API endpoints
│       ├── auth/            # NextAuth routes
│       ├── dictionary/      # Dictionary CRUD
│       ├── settings/        # Settings management
│       ├── transcribe/      # Transcription endpoints
│       └── transcriptions/  # History endpoints
├── components/              # React components
│   ├── auth/               # Authentication forms
│   ├── dictation/          # Recording interface
│   ├── dictionary/         # Dictionary management
│   ├── landing/            # Landing page
│   ├── layout/             # Layout components
│   ├── transcriptions/     # History display
│   └── ui/                 # ShadCN UI components
├── lib/                    # Utility functions
│   ├── ai-formatter.ts     # AI formatting service
│   ├── assemblyai-service.ts
│   ├── audio-processor.ts  # Audio capture and processing
│   ├── auth.ts             # NextAuth configuration
│   ├── deepgram-service.ts
│   ├── dictionary-replace.ts
│   ├── groq-whisper-service.ts
│   ├── prisma.ts           # Prisma client
│   └── whisper-stream.ts   # Whisper service client
├── prisma/                 # Database
│   ├── migrations/         # Database migrations
│   └── schema.prisma       # Database schema
├── whisper-service/        # FastAPI microservice
│   ├── app.py             # Main service application
│   ├── merge_transcripts.py # Merging algorithms
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile         # Container configuration
├── docs/                   # Documentation
└── types/                  # TypeScript type definitions
```

---

## Database Schema

### User
Stores user authentication and profile information.

### Transcription
Records all transcription history with timestamps and user associations.

### Dictionary
User-specific word and phrase substitutions with unique constraints per user.

### UserSettings
Encrypted API keys and formatting preferences. Includes fields for:
- AI formatter provider selection
- Encrypted API keys (Groq, OpenAI)
- Ollama URL for local LLM
- Formatting options (bullet points, grammar, punctuation, capitalization)

---

## Configuration

### Whisper Service Configuration

Create `whisper-service/.env`:

```env
WHISPER_MODEL=base
WHISPER_DEVICE=auto
WHISPER_API_KEY=your-api-key
REQUIRE_API_KEY=true
BUFFER_OVERLAP_SECONDS=2.0
SESSION_TTL=1800
MAX_SESSIONS=5
REDIS_URL=redis://localhost:6379
ALLOWED_ORIGINS=http://localhost:3000
```

### AI Formatting Configuration

Configure in user settings or environment variables:
- Provider selection (groq, openai, local)
- API keys (encrypted in database)
- Formatting options (bullet points, grammar, punctuation, capitalization)

---

## Deployment

### Railway Deployment

1. Connect GitHub repository to Railway
2. Configure environment variables in Railway dashboard
3. Deploy main application and Whisper service as separate services
4. Use Railway PostgreSQL for database

### Docker Deployment

```bash
# Build and run Whisper service
cd whisper-service
docker-compose up -d
```

### AWS EC2 Deployment

For GPU-accelerated Whisper transcription:

```bash
cd whisper-service
./deploy-ec2.sh
```

---

## API Documentation

### Transcription Endpoints

**POST /api/transcribe/stream**
- Create session: `{ action: "create", service: "whisper" }`
- Upload chunk: FormData with `action: "chunk"`, `sessionId`, `file`
- Finalize: `{ action: "finalize", sessionId }`

### Dictionary Endpoints

**GET /api/dictionary** - Fetch user dictionary
**POST /api/dictionary** - Add dictionary entry
**DELETE /api/dictionary** - Remove dictionary entry

### Settings Endpoints

**GET /api/settings** - Fetch user settings
**POST /api/settings** - Update user settings

---

## Development

### Running Tests

```bash
yarn test
```

### Database Operations

```bash
# Generate Prisma client
yarn prisma generate

# Create migration
yarn prisma migrate dev --name migration_name

# Open Prisma Studio
yarn prisma studio

# Reset database (development only)
yarn prisma migrate reset
```

### Linting

```bash
yarn lint
```

---

## Troubleshooting

### Whisper Service Not Running

Check service health:
```bash
curl http://localhost:8000/health
```

Start service:
```bash
cd whisper-service
python app.py
```

### Database Connection Issues

Verify DATABASE_URL in `.env.local` and ensure PostgreSQL is running:
```bash
psql -U user -d ai_voice_keyboard
```

### Audio Permission Denied

- Enable microphone permissions in browser settings
- Check browser console for permission errors
- Ensure HTTPS in production (required for MediaRecorder API)

### Model Download Issues

Whisper models download automatically on first use. Ensure:
- Sufficient disk space (1-3GB depending on model)
- Internet connectivity
- Write permissions in model cache directory

---

## Performance Considerations

### Whisper Service
- GPU acceleration recommended for production
- Base model: ~1GB RAM, 2-3s processing per 5s audio
- Large model: ~3GB RAM, 5-8s processing per 5s audio

### Database
- Index on userId and createdAt for transcription queries
- Regular cleanup of old transcriptions recommended

### Frontend
- Audio chunks limited to 5 seconds for optimal latency
- WebM with Opus codec for efficient compression
- Incremental display of transcription results

---

## License

MIT License - see LICENSE file for details.

---

## Contributing

Contributions are welcome. Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request with clear description

---

## Support

For issues and questions:
- GitHub Issues: Report bugs and feature requests
- Documentation: See `docs/` directory for detailed guides

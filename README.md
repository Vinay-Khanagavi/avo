# AI Voice Keyboard App

A production-quality AI Voice Keyboard web application that transforms speech into accurate, well-formatted text using Amazon Transcribe.

## Features

- **Authentication**: Email/password signup and login with NextAuth.js
- **Voice Dictation**: Real-time speech-to-text transcription with 5-second audio chunking
- **Custom Dictionary**: Add/update/delete custom words to improve transcription accuracy
- **Transcription History**: View, search, and copy past transcriptions
- **Settings**: Configure language and transcription preferences
- **Clean UI**: Minimalist design with ShadCN UI components and Tailwind v4

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: ShadCN UI with Notebook theme
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **AI Transcription**: Amazon Transcribe
- **Hosting**: Railway (recommended)

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

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ai_voice_keyboard?schema=public"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here" # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# AWS Credentials (from AWS CLI)
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="us-east-1"
AWS_PROFILE="default" # Optional, defaults to "default"
```

3. **Set up database:**

```bash
# Generate Prisma client
yarn prisma generate

# Run migrations
yarn prisma migrate dev --name init
```

4. **Run development server:**

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
ai-voice-keyboard/
├── app/
│   ├── (auth)/          # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/     # Protected dashboard pages
│   │   ├── dictation/
│   │   ├── dictionary/
│   │   ├── history/
│   │   └── settings/
│   ├── api/             # API routes
│   │   ├── auth/
│   │   ├── signup/
│   │   ├── transcribe/
│   │   ├── dictionary/
│   │   └── transcriptions/
│   └── layout.tsx        # Root layout
├── components/
│   ├── ui/              # ShadCN components
│   ├── auth/            # Auth components
│   ├── dictation/       # Dictation components
│   ├── dictionary/      # Dictionary components
│   ├── transcriptions/  # History components
│   └── layout/          # Layout components
├── lib/
│   ├── auth.ts          # NextAuth configuration
│   ├── prisma.ts        # Prisma client
│   ├── transcribe.ts    # Amazon Transcribe client
│   └── audio-processor.ts # Audio processing utilities
└── prisma/
    └── schema.prisma    # Database schema
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

1. **Create Railway project** and connect your GitHub repository
2. **Add PostgreSQL** service in Railway
3. **Set environment variables** in Railway:
   - `DATABASE_URL` (auto-populated from PostgreSQL service)
   - `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
   - `NEXTAUTH_URL` (your Railway app URL)
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
4. **Deploy**: Railway will automatically build and deploy

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

# Railway Deployment Guide

Complete guide to deploy the AI Voice Keyboard frontend and database to Railway.

## Prerequisites

- Railway account (sign up at https://railway.app)
- Railway CLI installed (optional, but recommended)
- GitHub repository connected to Railway

## Step 1: Create PostgreSQL Database on Railway

1. **Log in to Railway Dashboard**
   - Go to https://railway.app
   - Sign in or create an account

2. **Create a New Project**
   - Click "New Project"
   - Select "Provision PostgreSQL"

3. **Get Database Connection String**
   - Click on the PostgreSQL service
   - Go to the "Variables" tab
   - Copy the `DATABASE_URL` value
   - **Important**: Save this for later steps

## Step 2: Deploy Next.js Frontend

### Option A: Deploy via Railway Dashboard (Recommended)

1. **Create New Service**
   - In your Railway project, click "New Service"
   - Select "Deploy from GitHub repo"
   - Choose your repository (`avo` or `ai-voice-keyboard`)
   - Railway will auto-detect it's a Next.js app

2. **Configure Root Directory** (if needed)
   - Go to Settings → Root Directory
   - Set to: `ai-voice-keyboard` (if your repo root is different)

3. **Set Build Command**
   - Go to Settings → Build Command
   - Set to: `cd ai-voice-keyboard && yarn install && yarn prisma generate && yarn build`
   - Or if root is already `ai-voice-keyboard`: `yarn install && yarn prisma generate && yarn build`

4. **Set Start Command**
   - Go to Settings → Start Command
   - Set to: `cd ai-voice-keyboard && yarn start`
   - Or if root is already `ai-voice-keyboard`: `yarn start`

5. **Set Port**
   - Railway automatically sets `PORT` environment variable
   - Next.js will use this automatically

### Option B: Deploy via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize Railway in your project
cd ai-voice-keyboard
railway init

# Link to existing project or create new
railway link

# Deploy
railway up
```

## Step 3: Configure Environment Variables

Go to your Railway service → **Variables** tab and add:

### Required Database Variables

```env
DATABASE_URL=postgresql://postgres:password@host:5432/railway
```
*(Use the DATABASE_URL from Step 1)*

### Required NextAuth Variables

```env
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-app-name.railway.app
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Required Whisper Service Variables

```env
WHISPER_SERVICE_URL=http://18.204.48.204:8000
WHISPER_API_KEY=16e90a8598c12bcf2606a34a4e04fda5b0c7c4f3b2cadcbc5d8ddb61ca9b5189
```

### Optional AWS Variables (if using AWS Transcribe as fallback)

```env
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
```

### Complete Environment Variables List

```env
# Database (from Railway PostgreSQL service)
DATABASE_URL=postgresql://postgres:password@host:5432/railway

# NextAuth
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=https://your-app-name.railway.app

# Whisper Service (AWS EC2)
WHISPER_SERVICE_URL=http://18.204.48.204:8000
WHISPER_API_KEY=16e90a8598c12bcf2606a34a4e04fda5b0c7c4f3b2cadcbc5d8ddb61ca9b5189

# Optional: AWS (if needed)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
```

## Step 4: Run Database Migrations

After deployment, you need to run Prisma migrations:

### Option A: Via Railway CLI

```bash
railway run yarn prisma migrate deploy
```

### Option B: Via Railway Dashboard

1. Go to your service → **Deployments**
2. Click on the latest deployment
3. Open the **Shell** tab
4. Run:
   ```bash
   yarn prisma migrate deploy
   ```

### Option C: Via Local Connection

```bash
# Get database URL from Railway
railway variables

# Set locally
export DATABASE_URL="postgresql://..."

# Run migrations
cd ai-voice-keyboard
yarn prisma migrate deploy
```

## Step 5: Verify Deployment

1. **Check Service Health**
   - Go to your Railway service
   - Check the "Metrics" tab for CPU/Memory usage
   - Check the "Logs" tab for any errors

2. **Test the Application**
   - Visit your Railway URL: `https://your-app-name.railway.app`
   - Try signing up a new user
   - Test the dictation feature

3. **Check Database Connection**
   - In Railway dashboard, go to PostgreSQL service
   - Use the "Query" tab to verify tables exist:
     ```sql
     SELECT * FROM users LIMIT 1;
     ```

## Step 6: Configure Custom Domain (Optional)

1. Go to your service → **Settings** → **Domains**
2. Click "Generate Domain" or add your custom domain
3. Update `NEXTAUTH_URL` to match your domain

## Troubleshooting

### Build Fails

- **Error**: "Module not found"
  - **Fix**: Ensure `Root Directory` is set correctly in Railway settings
  - Check that `package.json` is in the root directory

- **Error**: "Prisma Client not generated"
  - **Fix**: Add `yarn prisma generate` to your build command

### Database Connection Fails

- **Error**: "Can't reach database server"
  - **Fix**: Ensure `DATABASE_URL` is set correctly
  - Check that PostgreSQL service is running in Railway

### Whisper Service Not Working

- **Error**: "Whisper service unavailable"
  - **Fix**: Verify AWS EC2 instance is running: `http://18.204.48.204:8000/health`
  - Check `WHISPER_SERVICE_URL` and `WHISPER_API_KEY` are set correctly
  - Ensure EC2 security group allows traffic from Railway (or 0.0.0.0/0)

### NextAuth Issues

- **Error**: "Invalid NEXTAUTH_SECRET"
  - **Fix**: Generate a new secret: `openssl rand -base64 32`
  - Ensure `NEXTAUTH_URL` matches your Railway domain exactly

## Quick Reference Commands

```bash
# Deploy to Railway
railway up

# View logs
railway logs

# Run migrations
railway run yarn prisma migrate deploy

# Open shell
railway shell

# View variables
railway variables

# Check service status
railway status
```

## Architecture Overview

```
┌─────────────────┐
│   Railway       │
│   (Frontend)    │──┐
│   Next.js App   │  │
└─────────────────┘  │
                     │ HTTP Requests
┌─────────────────┐  │
│   Railway       │  │
│   PostgreSQL    │◄─┘
│   Database      │
└─────────────────┘

┌─────────────────┐
│   AWS EC2       │
│   Whisper       │◄─── HTTP Requests (from Railway Frontend)
│   Service       │
│   Port 8000     │
└─────────────────┘
```

## Cost Estimation

- **Railway Frontend**: Free tier (500 hours/month) or $5/month for Hobby plan
- **Railway PostgreSQL**: Free tier (256MB) or $5/month for 1GB
- **AWS EC2 t3.small**: ~$15/month (running 24/7)

**Total**: ~$20-25/month for full production setup

## Next Steps

1. ✅ Deploy PostgreSQL database
2. ✅ Deploy Next.js frontend
3. ✅ Configure environment variables
4. ✅ Run database migrations
5. ✅ Test the application
6. ⏭️ Set up monitoring and alerts
7. ⏭️ Configure custom domain
8. ⏭️ Set up CI/CD for automatic deployments


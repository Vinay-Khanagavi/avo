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

Go to your Railway service → **Variables** tab and add the following:

### Quick Setup Instructions

1. **Get DATABASE_URL from Railway PostgreSQL**
   - Go to Railway Dashboard → PostgreSQL Service → Variables tab
   - Copy the `DATABASE_URL` value

2. **Get your Railway App URL**
   - Go to Railway Dashboard → Your Next.js Service → Settings → Domains
   - Copy your Railway domain (e.g., `https://your-app-name.railway.app`)

3. **Add Variables to Railway**
   - Go to Railway Dashboard → Your Next.js Service → Variables tab
   - Click "New Variable" for each variable below

### Required Environment Variables

#### 1. DATABASE_URL
- **Source**: Railway PostgreSQL service → Variables tab
- **Format**: `postgresql://postgres:password@host:5432/railway`
- **Action**: Copy the entire connection string from Railway PostgreSQL service

#### 2. NEXTAUTH_SECRET
- **Generate**: Run `openssl rand -base64 32` in your terminal
- **Action**: Copy the generated value
- **Example**: `F9kv4UQvY9QjkN+mp9RsDDYsfjFF/n6H582SHO671uY=`

#### 3. NEXTAUTH_URL
- **Format**: `https://your-service-name.railway.app`
- **Action**: 
  1. Deploy your service first
  2. Go to Settings → Domains
  3. Copy your Railway domain
  4. Update this variable

#### 4. WHISPER_SERVICE_URL
- **Value**: `http://18.204.48.204:8000` (or your Whisper service URL)
- **Action**: Set to your Whisper service endpoint

#### 5. WHISPER_API_KEY
- **Value**: Your Whisper service API key
- **Action**: Set to match your Whisper service configuration

### Complete Environment Variables List

```env
# Database (from Railway PostgreSQL service)
DATABASE_URL=postgresql://postgres:password@host:5432/railway

# NextAuth
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=https://your-app-name.railway.app

# Whisper Service
WHISPER_SERVICE_URL=http://18.204.48.204:8000
WHISPER_API_KEY=your-whisper-api-key-here

# Optional: AWS (if using AWS Transcribe as fallback)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
```

### Environment Variable Verification

After adding all variables:

1. **Redeploy your service** (Railway will automatically redeploy when variables change)
2. **Check logs** for any environment variable errors
3. **Test the application**:
   - Visit your Railway URL
   - Try signing up
   - Test dictation feature

### Troubleshooting Environment Variables

- **Variable Not Found Error**: Ensure variable name matches exactly (case-sensitive), check for extra spaces or quotes, redeploy after adding variables
- **Database Connection Error**: Verify `DATABASE_URL` is correct, ensure PostgreSQL service is running, check that migrations have run
- **NextAuth Error**: Verify `NEXTAUTH_SECRET` is set correctly, ensure `NEXTAUTH_URL` matches your Railway domain exactly, check for HTTPS (Railway uses HTTPS by default)
- **Whisper Service Error**: Verify Whisper service is running, check `WHISPER_SERVICE_URL` and `WHISPER_API_KEY` are correct, ensure security groups allow Railway traffic

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


# Railway Deployment Checklist

Quick checklist for deploying to Railway.

## ✅ Pre-Deployment

- [ ] Railway account created
- [ ] GitHub repository is public or Railway has access
- [ ] AWS EC2 Whisper service is running and accessible
- [ ] Have AWS EC2 IP address: `18.204.48.204`
- [ ] Have Whisper API key: `16e90a8598c12bcf2606a34a4e04fda5b0c7c4f3b2cadcbc5d8ddb61ca9b5189`

## 📦 Step 1: Create PostgreSQL Database

- [ ] Log in to Railway dashboard
- [ ] Create new project
- [ ] Add PostgreSQL service
- [ ] Copy `DATABASE_URL` from Variables tab
- [ ] Save `DATABASE_URL` for next step

## 🚀 Step 2: Deploy Frontend

- [ ] Add new service → Deploy from GitHub repo
- [ ] Select your repository
- [ ] Set root directory: `ai-voice-keyboard` (if needed)
- [ ] Railway auto-detects Next.js (or verify build command)
- [ ] Service starts building

## ⚙️ Step 3: Configure Environment Variables

Add these in Railway service → Variables:

- [ ] `DATABASE_URL` = (from PostgreSQL service)
- [ ] `NEXTAUTH_SECRET` = (generate with `openssl rand -base64 32`)
- [ ] `NEXTAUTH_URL` = `https://your-app-name.railway.app`
- [ ] `WHISPER_SERVICE_URL` = `http://18.204.48.204:8000`
- [ ] `WHISPER_API_KEY` = `16e90a8598c12bcf2606a34a4e04fda5b0c7c4f3b2cadcbc5d8ddb61ca9b5189`

## 🗄️ Step 4: Run Database Migrations

- [ ] Open Railway service shell or use CLI
- [ ] Run: `yarn prisma migrate deploy`
- [ ] Verify migrations completed successfully

## ✅ Step 5: Verify Deployment

- [ ] Visit Railway URL: `https://your-app-name.railway.app`
- [ ] Check service logs for errors
- [ ] Test signup flow
- [ ] Test dictation feature
- [ ] Verify database connection (check Railway PostgreSQL Query tab)

## 🔧 Troubleshooting

### Build Fails
- [ ] Check root directory is correct
- [ ] Verify `package.json` exists
- [ ] Check build logs for specific errors

### Database Connection Fails
- [ ] Verify `DATABASE_URL` is correct
- [ ] Check PostgreSQL service is running
- [ ] Ensure migrations ran successfully

### Whisper Service Not Working
- [ ] Verify EC2 instance is running: `curl http://18.204.48.204:8000/health`
- [ ] Check `WHISPER_SERVICE_URL` is correct
- [ ] Verify `WHISPER_API_KEY` matches EC2 `.env` file
- [ ] Check EC2 security group allows Railway traffic

## 📝 Quick Commands

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Test Whisper service
curl http://18.204.48.204:8000/health

# Run migrations (via Railway CLI)
railway run yarn prisma migrate deploy

# View logs
railway logs
```

## 🎯 Expected Result

After completing all steps:
- ✅ Frontend accessible at Railway URL
- ✅ Database connected and migrations applied
- ✅ Users can sign up and log in
- ✅ Dictation feature works with AWS EC2 Whisper service
- ✅ Transcriptions saved to database


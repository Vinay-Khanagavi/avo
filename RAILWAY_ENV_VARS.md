# Railway Environment Variables Setup

## Quick Setup Instructions

1. **Get DATABASE_URL from Railway PostgreSQL**
   - Go to Railway Dashboard → PostgreSQL Service → Variables tab
   - Copy the `DATABASE_URL` value

2. **Get your Railway App URL**
   - Go to Railway Dashboard → Your Next.js Service → Settings → Domains
   - Copy your Railway domain (e.g., `https://your-app-name.railway.app`)

3. **Add Variables to Railway**
   - Go to Railway Dashboard → Your Next.js Service → Variables tab
   - Click "New Variable" for each variable below

## Required Environment Variables

Copy these exact values to Railway:

```env
DATABASE_URL=postgresql://postgres:password@host:5432/railway
```

*(Replace with actual DATABASE_URL from Railway PostgreSQL service)*

```env
NEXTAUTH_SECRET=F9kv4UQvY9QjkN+mp9RsDDYsfjFF/n6H582SHO671uY=
```

```env
NEXTAUTH_URL=https://your-app-name.railway.app
```

*(Replace `your-app-name` with your actual Railway service name)*

```env
WHISPER_SERVICE_URL=http://18.204.48.204:8000
```

```env
WHISPER_API_KEY=16e90a8598c12bcf2606a34a4e04fda5b0c7c4f3b2cadcbc5d8ddb61ca9b5189
```

## Step-by-Step Guide

### 1. DATABASE_URL
- **Source**: Railway PostgreSQL service → Variables tab
- **Format**: `postgresql://postgres:password@host:5432/railway`
- **Action**: Copy the entire connection string from Railway

### 2. NEXTAUTH_SECRET
- **Value**: `F9kv4UQvY9QjkN+mp9RsDDYsfjFF/n6H582SHO671uY=`
- **Action**: Copy this exact value (already generated)

### 3. NEXTAUTH_URL
- **Format**: `https://your-service-name.railway.app`
- **Action**: 
  1. Deploy your service first
  2. Go to Settings → Domains
  3. Copy your Railway domain
  4. Update this variable

### 4. WHISPER_SERVICE_URL
- **Value**: `http://18.204.48.204:8000`
- **Action**: Copy this exact value (AWS EC2 instance)

### 5. WHISPER_API_KEY
- **Value**: `16e90a8598c12bcf2606a34a4e04fda5b0c7c4f3b2cadcbc5d8ddb61ca9b5189`
- **Action**: Copy this exact value (matches AWS EC2 configuration)

## Verification

After adding all variables:

1. **Redeploy your service** (Railway will automatically redeploy when variables change)
2. **Check logs** for any environment variable errors
3. **Test the application**:
   - Visit your Railway URL
   - Try signing up
   - Test dictation feature

## Troubleshooting

### Variable Not Found Error
- Ensure variable name matches exactly (case-sensitive)
- Check for extra spaces or quotes
- Redeploy after adding variables

### Database Connection Error
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL service is running
- Check that migrations have run

### NextAuth Error
- Verify `NEXTAUTH_SECRET` is set correctly
- Ensure `NEXTAUTH_URL` matches your Railway domain exactly
- Check for HTTPS (Railway uses HTTPS by default)

### Whisper Service Error
- Verify EC2 instance is running: `curl http://18.204.48.204:8000/health`
- Check `WHISPER_SERVICE_URL` and `WHISPER_API_KEY` are correct
- Ensure EC2 security group allows Railway traffic


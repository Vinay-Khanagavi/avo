# Railway Database Connection Troubleshooting Guide

This guide helps you resolve database connection errors when deploying to Railway.

## Common Error Messages

### Error: `P1001: Can't reach database server at ...`

This error indicates that Prisma cannot connect to your PostgreSQL database on Railway.

## Root Causes

1. **DATABASE_URL not set** - The environment variable is missing or incorrect
2. **Database service not linked** - PostgreSQL service isn't connected to your app service
3. **Database service not running** - PostgreSQL service is stopped or failed to start
4. **Incorrect DATABASE_URL format** - The connection string is malformed
5. **Network connectivity issues** - Services can't communicate

## Step-by-Step Fix

### Step 1: Verify PostgreSQL Service is Running

1. Go to Railway Dashboard → Your Project
2. Check if PostgreSQL service exists and is running (green status)
3. If not running, click on PostgreSQL service → Start/Deploy

### Step 2: Get Correct DATABASE_URL

1. Go to Railway Dashboard → Your PostgreSQL Service
2. Click on **Variables** tab
3. Find `DATABASE_URL` variable
4. **Copy the entire value** (it should look like: `postgresql://postgres:password@host:5432/railway`)

**Important**: Use the DATABASE_URL from the PostgreSQL service, not a manually created one.

### Step 3: Link Database Service to App Service

1. Go to Railway Dashboard → Your App Service (Next.js service)
2. Click on **Settings** tab
3. Scroll to **Service Connections** section
4. Click **+ New Connection**
5. Select your PostgreSQL service
6. Click **Connect**

This ensures your app service can access the database service.

### Step 4: Set DATABASE_URL in App Service

1. Go to Railway Dashboard → Your App Service
2. Click on **Variables** tab
3. Click **+ New Variable**
4. Name: `DATABASE_URL`
5. Value: Paste the DATABASE_URL you copied from PostgreSQL service
6. Click **Add**

**Important**: 
- Variable name must be exactly `DATABASE_URL` (case-sensitive)
- Value should be the complete connection string from PostgreSQL service
- Don't add quotes around the value

### Step 5: Verify Environment Variables

Your app service should have these variables:

```
DATABASE_URL=postgresql://postgres:password@host:5432/railway
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://your-app-name.railway.app
WHISPER_SERVICE_URL=http://your-whisper-service:8000
WHISPER_API_KEY=your-api-key
```

### Step 6: Redeploy Your Service

After setting variables:

1. Railway will automatically redeploy when variables change
2. Or manually trigger: Go to Deployments → Click "Redeploy"
3. Watch the build logs for any errors

### Step 7: Check Build Logs

1. Go to Railway Dashboard → Your App Service
2. Click on **Deployments** tab
3. Click on the latest deployment
4. Check **Build Logs** for:
   - ✓ `yarn prisma generate` completes successfully
   - ✓ `yarn build` completes successfully
   - ✗ Any database connection errors

### Step 8: Check Runtime Logs

1. Go to Railway Dashboard → Your App Service
2. Click on **Logs** tab
3. Look for:
   - ✓ "Database connection successful"
   - ✓ "Migrations completed successfully"
   - ✓ "Starting Next.js server"
   - ✗ Any connection errors

## Verification Steps

### Test Database Connection via Railway Shell

1. Go to Railway Dashboard → Your App Service
2. Click on **Deployments** → Latest deployment → **Shell** tab
3. Run:
   ```bash
   echo $DATABASE_URL
   ```
   Should show your database URL

4. Test connection:
   ```bash
   yarn prisma db execute --stdin <<< "SELECT 1;"
   ```
   Should return success

### Test via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Check variables
railway variables

# Test connection
railway run yarn prisma db execute --stdin <<< "SELECT 1;"
```

## Common Issues and Solutions

### Issue: "DATABASE_URL is not set"

**Solution**:
- Verify DATABASE_URL is set in Railway Variables
- Check variable name is exactly `DATABASE_URL` (case-sensitive)
- Redeploy after adding variable

### Issue: "Can't reach database server"

**Solution**:
1. Verify PostgreSQL service is running
2. Link database service to app service (Step 3 above)
3. Verify DATABASE_URL is correct
4. Check network connectivity in Railway logs

### Issue: "Connection timeout"

**Solution**:
- Database service might be starting up (wait 1-2 minutes)
- Check PostgreSQL service logs for errors
- Verify service is in the same Railway project

### Issue: "Authentication failed"

**Solution**:
- Use DATABASE_URL directly from PostgreSQL service Variables tab
- Don't modify the connection string manually
- Ensure password isn't URL-encoded incorrectly

### Issue: Build fails with database error

**Solution**:
- `prisma generate` shouldn't require database connection
- Check if DATABASE_URL is set during build (it should be)
- Verify build command in `railway.json` is correct

## Prevention Checklist

Before deploying, ensure:

- [ ] PostgreSQL service is created and running
- [ ] DATABASE_URL is copied from PostgreSQL service Variables tab
- [ ] Database service is linked to app service
- [ ] DATABASE_URL is set in app service Variables tab
- [ ] All other required environment variables are set
- [ ] Build completes successfully
- [ ] Migrations run successfully on startup

## Getting Help

If issues persist:

1. Check Railway Status: https://status.railway.app
2. Review Railway Logs for detailed error messages
3. Verify all steps above are completed
4. Check Railway Discord/Support for platform issues

## Related Documentation

- [Railway Deployment Guide](../deployment/RAILWAY_DEPLOYMENT.md)
- [Deployment Checklist](../deployment/DEPLOYMENT_CHECKLIST.md)
- [500 Error Fix](./500_ERROR_FIX.md)


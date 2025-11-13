# Signup Error Fix - Production Deployment

## Issues Fixed

1. **Improved Error Handling**: Updated `/app/api/signup/route.ts` to provide better error messages for:
   - Database connection errors (P1000, P1001)
   - Duplicate user errors (P2002)
   - General Prisma errors

2. **Automatic Migration Deployment**: Created `scripts/migrate-and-start.sh` that:
   - Runs database migrations automatically on startup
   - Checks for DATABASE_URL before proceeding
   - Handles migration failures gracefully

3. **Updated Railway Configuration**: Modified `railway.json` to use the migration script in the start command.

## Common Causes of Signup 500 Error

### 1. Database Migrations Not Run (MOST COMMON)
**Symptom**: 500 error when trying to sign up
**Fix**: The new startup script will automatically run migrations. If you still see errors:
```bash
# Via Railway CLI
railway run yarn prisma migrate deploy

# Or via Railway Dashboard → Service → Shell
yarn prisma migrate deploy
```

### 2. DATABASE_URL Not Set or Incorrect
**Symptom**: Database connection errors in logs
**Fix**: 
1. Go to Railway Dashboard → PostgreSQL Service → Variables
2. Copy the `DATABASE_URL` value
3. Go to Railway Dashboard → Your Next.js Service → Variables
4. Add/Update `DATABASE_URL` with the copied value
5. Redeploy the service

### 3. Prisma Client Not Generated
**Symptom**: "Prisma Client not generated" errors
**Fix**: Already handled in build command (`yarn prisma generate`), but verify:
- Check Railway build logs to ensure `prisma generate` runs successfully
- Verify `railway.json` build command includes `yarn prisma generate`

## Verification Steps

After deploying these fixes:

1. **Check Railway Logs**:
   - Go to Railway Dashboard → Your Service → Logs
   - Look for "Running database migrations..." message
   - Verify migrations complete successfully

2. **Test Signup**:
   - Visit your production URL: `https://avo-production.up.railway.app/signup`
   - Try creating an account
   - Check browser console for any errors

3. **Verify Database Tables**:
   - Go to Railway Dashboard → PostgreSQL Service → Query tab
   - Run: `SELECT * FROM users LIMIT 1;`
   - Should return empty result (no error means table exists)

## Required Environment Variables

Ensure these are set in Railway → Your Service → Variables:

```env
DATABASE_URL=postgresql://postgres:password@host:5432/railway
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://avo-production.up.railway.app
WHISPER_SERVICE_URL=http://18.204.48.204:8000
WHISPER_API_KEY=16e90a8598c12bcf2606a34a4e04fda5b0c7c4f3b2cadcbc5d8ddb61ca9b5189
```

## Next Steps

1. **Commit and Push Changes**:
   ```bash
   git add .
   git commit -m "Fix signup error: improve error handling and auto-run migrations"
   git push
   ```

2. **Redeploy on Railway**:
   - Railway will automatically redeploy when you push
   - Or manually trigger redeploy from Railway Dashboard

3. **Monitor Logs**:
   - Watch Railway logs during deployment
   - Look for migration messages
   - Test signup after deployment completes

4. **If Still Failing**:
   - Check Railway logs for specific error messages
   - Verify all environment variables are set correctly
   - Ensure PostgreSQL service is running
   - Try running migrations manually via Railway shell


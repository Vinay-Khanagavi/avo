# 500 Internal Server Error - Fix Summary

This document covers fixes for 500 Internal Server Errors, including signup errors and general API errors.

## Issues Fixed

### 1. **Improved Prisma Client Error Handling** (`lib/prisma.ts`)
   - Added proper connection error handling
   - Added graceful disconnection on process termination
   - Better error logging for database connection issues
   - Handles `PrismaClientInitializationError` specifically
   - Added `checkDatabaseConnection()` helper function

### 2. **Enhanced Authentication Error Handling** (`lib/auth.ts`)
   - Wrapped database queries in try-catch blocks
   - Prevents database errors from exposing sensitive information
   - Returns null instead of throwing errors (NextAuth best practice)

### 3. **Comprehensive API Route Error Handling**
   - **Signup API** (`app/api/signup/route.ts`):
     - Handles `PrismaClientInitializationError` (database unreachable)
     - Handles connection errors with specific error messages
     - Returns 503 Service Unavailable instead of 500 for connection issues
     - Provides helpful error messages to users
   
   - **Dictionary API** (`app/api/dictionary/route.ts`):
     - Handles Prisma connection errors (P1000, P1001)
     - Handles duplicate entry errors (P2002)
     - Handles not found errors (P2025)
     - Returns appropriate HTTP status codes (503 for connection issues)
   
   - **Transcriptions API** (`app/api/transcriptions/route.ts`):
     - Handles database connection errors gracefully
     - Returns 503 Service Unavailable for connection issues
   
   - **Transcribe APIs** (`app/api/transcribe/route.ts` & `app/api/transcribe/stream/route.ts`):
     - Database save failures no longer break the request
     - Better error handling for Whisper service connection issues
     - Handles network errors (ECONNREFUSED)

### 4. **Health Check Endpoint** (`app/api/health/route.ts`)
   - New endpoint to diagnose production issues
   - Tests database connectivity with 5-second timeout
   - Handles `PrismaClientInitializationError` specifically
   - Returns detailed error messages for connection issues
   - Accessible at: `https://your-domain.com/api/health`

## Common Causes of 500 Errors

### 1. **Database Connection Issues** (Most Common)
   **Symptoms:**
   - 500 errors on API routes
   - `PrismaClientInitializationError` in logs
   - Error message: "Can't reach database server at..."
   - Prisma error codes: P1000, P1001
   
   **Common Causes:**
   - Database service is stopped or paused in Railway
   - Database URL is incorrect or expired
   - Network connectivity issues
   - Database server is overloaded or timing out
   
   **Solutions:**
   1. **Check Database Service Status**:
      - Go to Railway Dashboard → PostgreSQL Service
      - Verify the service is running (not paused)
      - Check service logs for any errors
   
   2. **Verify DATABASE_URL**:
      - Go to Railway Dashboard → PostgreSQL Service → Variables
      - Copy the `DATABASE_URL` value
      - Go to Railway Dashboard → Your Next.js Service → Variables
      - Ensure `DATABASE_URL` matches exactly
      - Redeploy after updating
   
   3. **Test Database Connection**:
      - Use `/api/health` endpoint: `curl https://your-domain.com/api/health`
      - Check Railway logs for connection errors
      - Try connecting via Railway shell: `railway shell` then `psql $DATABASE_URL`
   
   4. **Restart Services**:
      - Restart PostgreSQL service in Railway
      - Redeploy your Next.js service
      - Wait a few minutes for services to stabilize
   
   5. **Check Connection Limits**:
      - Railway free tier has connection limits
      - Ensure you're not exceeding connection pool size
      - Consider upgrading if needed

### 2. **Missing Database Migrations** (Common for Signup Errors)
   **Symptoms:**
   - 500 error when trying to sign up
   - Errors mentioning missing tables or columns
   - Prisma error codes: P2025, P2010
   
   **Solutions:**
   - Migrations should run automatically via `scripts/migrate-and-start.sh`
   - Manually run: `railway run yarn prisma migrate deploy`
   - Check Railway build logs for migration errors
   - Verify migrations completed successfully in Railway logs

### 3. **Prisma Client Not Generated**
   **Symptoms:**
   - "Prisma Client not generated" errors
   
   **Solutions:**
   - Should be handled in build command: `yarn prisma generate`
   - Check Railway build logs
   - Verify `railway.json` includes Prisma generation

### 4. **Whisper Service Connection Issues**
   **Symptoms:**
   - Transcription endpoints return 503
   - ECONNREFUSED errors
   
   **Solutions:**
   - Verify `WHISPER_SERVICE_URL` is set correctly
   - Check if Whisper service is running
   - Verify `WHISPER_API_KEY` matches between services

## Debugging Production Issues

### 1. **Check Health Endpoint**
   ```bash
   curl https://your-domain.com/api/health
   ```
   
   This will show:
   - Database connection status
   - Any database errors
   - Environment information

### 2. **Check Railway Logs**
   - Go to Railway Dashboard → Your Service → Logs
   - Look for error messages with stack traces
   - Check for Prisma error codes (P1000, P1001, P2002, etc.)

### 3. **Verify Environment Variables**
   Required variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `NEXTAUTH_SECRET` - NextAuth secret key
   - `NEXTAUTH_URL` - Your application URL
   - `WHISPER_SERVICE_URL` - Whisper service endpoint
   - `WHISPER_API_KEY` - API key for Whisper service

### 4. **Test Database Connection**
   ```bash
   # Via Railway CLI
   railway run yarn prisma db pull
   
   # Or check via Railway Shell
   railway shell
   yarn prisma db pull
   ```

## Error Response Codes

- **400 Bad Request**: Validation errors, duplicate entries
- **401 Unauthorized**: Authentication required
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Unexpected server errors
- **503 Service Unavailable**: Database connection issues, external service unavailable

## Next Steps

1. **Deploy these changes** to production
2. **Monitor Railway logs** for any remaining errors
3. **Use `/api/health` endpoint** to verify service health
4. **Check error responses** - they now provide more specific information

## Signup-Specific Issues

### Common Signup Errors

1. **Database Migrations Not Run** (MOST COMMON)
   - **Symptom**: 500 error when trying to sign up
   - **Fix**: Migrations run automatically via startup script. If still failing:
     ```bash
     railway run yarn prisma migrate deploy
     ```

2. **Duplicate User Error** (P2002)
   - **Symptom**: "User with this email already exists"
   - **Fix**: This is now handled gracefully - returns 400 instead of 500

3. **Prisma Client Not Generated**
   - **Symptom**: "Prisma Client not generated" errors
   - **Fix**: Verify `railway.json` build command includes `yarn prisma generate`

### Verification Steps for Signup

1. **Check Railway Logs**:
   - Look for "Running database migrations..." message
   - Verify migrations complete successfully

2. **Test Signup**:
   - Visit your production URL: `https://your-domain.com/signup`
   - Try creating an account
   - Check browser console for any errors

3. **Verify Database Tables**:
   - Go to Railway Dashboard → PostgreSQL Service → Query tab
   - Run: `SELECT * FROM users LIMIT 1;`
   - Should return empty result (no error means table exists)

## Testing

After deployment, test:
1. `/api/health` - Should return `{"status": "healthy", "database": "connected"}`
2. Sign up endpoint - Should handle errors gracefully
3. Dictionary endpoints - Should return appropriate error codes
4. Transcription endpoints - Should handle database failures gracefully


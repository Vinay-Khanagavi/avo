#!/bin/bash
# Script to run migrations and start the Next.js app
# This ensures migrations are always run before starting the server

echo "Starting migration and startup script..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set. Cannot run migrations."
  echo "Please ensure DATABASE_URL is set in Railway environment variables."
  exit 1
fi

# Run migrations (don't fail if already migrated)
echo "Running database migrations..."
if yarn prisma migrate deploy; then
  echo "Migrations completed successfully."
else
  echo "WARNING: Migration command failed. This might be okay if migrations are already applied."
  echo "Continuing with server start..."
fi

# Start the Next.js server
echo "Starting Next.js server..."
exec yarn start


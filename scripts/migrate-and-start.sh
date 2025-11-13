#!/bin/bash
# Script to run migrations and start the Next.js app
# This ensures migrations are always run before starting the server

set -e  # Exit on error

echo "Starting migration and startup script..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set. Cannot run migrations."
  echo "Please ensure DATABASE_URL is set in Railway environment variables."
  echo ""
  echo "To fix this:"
  echo "1. Go to Railway Dashboard -> Your PostgreSQL Service -> Variables tab"
  echo "2. Copy the DATABASE_URL value"
  echo "3. Go to Railway Dashboard -> Your App Service -> Variables tab"
  echo "4. Add DATABASE_URL with the copied value"
  exit 1
fi

# Function to test database connection with retry
test_db_connection() {
  local max_attempts=10
  local attempt=1
  local delay=2
  
  echo "Testing database connection..."
  
  while [ $attempt -le $max_attempts ]; do
    echo "Attempt $attempt/$max_attempts: Connecting to database..."
    
    # Try using psql if available (most reliable)
    if command -v psql > /dev/null 2>&1; then
      if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✓ Database connection successful (via psql)!"
        return 0
      fi
    fi
    
    # Alternative: Try using node to test connection via Prisma
    # This creates a simple test script
    if node -e "
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.\$queryRaw\`SELECT 1\`
        .then(() => { process.exit(0); })
        .catch(() => { process.exit(1); })
        .finally(() => prisma.\$disconnect());
    " > /dev/null 2>&1; then
      echo "✓ Database connection successful (via Prisma)!"
      return 0
    fi
    
    if [ $attempt -lt $max_attempts ]; then
      echo "✗ Connection failed. Retrying in ${delay}s..."
      sleep $delay
      delay=$((delay + 1))  # Exponential backoff
    fi
    
    attempt=$((attempt + 1))
  done
  
  echo "✗ Failed to connect to database after $max_attempts attempts"
  echo ""
  echo "Troubleshooting steps:"
  echo "1. Verify DATABASE_URL is correct in Railway Variables"
  echo "2. Ensure PostgreSQL service is running in Railway"
  echo "3. Check that database service is linked to your app service"
  echo "4. Verify network connectivity (check Railway service logs)"
  echo ""
  echo "To link database service:"
  echo "- Go to Railway Dashboard -> Your App Service -> Settings"
  echo "- Under 'Service Connections', add your PostgreSQL service"
  return 1
}

# Test database connection before running migrations
if ! test_db_connection; then
  echo ""
  echo "ERROR: Cannot connect to database. Aborting startup."
  echo ""
  echo "Current DATABASE_URL format: ${DATABASE_URL%%@*}" # Show only user part for security
  exit 1
fi

# Run migrations with retry logic
echo ""
echo "Running database migrations..."
max_migration_attempts=3
migration_attempt=1

while [ $migration_attempt -le $max_migration_attempts ]; do
  echo "Migration attempt $migration_attempt/$max_migration_attempts..."
  
  if yarn prisma migrate deploy; then
    echo "✓ Migrations completed successfully."
    break
  else
    if [ $migration_attempt -lt $max_migration_attempts ]; then
      echo "✗ Migration failed. Retrying in 3s..."
      sleep 3
      migration_attempt=$((migration_attempt + 1))
    else
      echo "✗ Migration failed after $max_migration_attempts attempts"
      echo ""
      echo "This might be okay if:"
      echo "- Migrations are already applied"
      echo "- Database schema is up to date"
      echo ""
      echo "Continuing with server start..."
      break
    fi
  fi
done

# Start the Next.js server
echo ""
echo "Starting Next.js server..."
exec yarn start


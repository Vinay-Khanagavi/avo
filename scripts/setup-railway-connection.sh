#!/bin/bash
# Script to set up Railway service connection between app and database

set -e

echo "=== Railway Service Connection Setup ==="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "Railway CLI is not installed. Installing..."
    npm install -g @railway/cli
fi

# Check if logged in
echo "Checking Railway authentication..."
if ! railway whoami &> /dev/null; then
    echo "Please login to Railway first:"
    echo "  railway login"
    exit 1
fi

echo "✓ Logged in to Railway"
echo ""

# Link to project (if not already linked)
echo "Linking to Railway project..."
if [ ! -f .railway/project.toml ]; then
    echo "Project not linked. Please run: railway link"
    echo "Then select your project: 'soothing-luck'"
    exit 1
fi

echo "✓ Project linked"
echo ""

# List services
echo "Available services in your project:"
railway service list
echo ""

# Get service IDs
echo "To connect services, Railway typically handles this automatically when:"
echo "1. Both services are in the same project"
echo "2. DATABASE_URL is set correctly"
echo ""
echo "Let's verify DATABASE_URL is set:"
railway variables | grep DATABASE_URL || echo "⚠ DATABASE_URL not found in variables"
echo ""

echo "=== Next Steps ==="
echo ""
echo "If DATABASE_URL is set correctly, Railway should handle connections automatically."
echo ""
echo "To manually verify connection:"
echo "1. Go to Railway Dashboard"
echo "2. Click on your 'avo' service (not Postgres)"
echo "3. Go to Settings tab"
echo "4. Look for 'Service Connections' or 'Connections' section"
echo "5. Add connection to Postgres service"
echo ""
echo "Or test the connection:"
echo "  railway run yarn prisma db execute --stdin <<< 'SELECT 1;'"


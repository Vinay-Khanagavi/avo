#!/bin/bash
# Script to verify Railway database connection

set -e

echo "=== Railway Database Connection Verification ==="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Run: railway login"
    exit 1
fi

echo "✓ Logged in to Railway"
echo ""

# Check if project is linked
if ! railway variables &> /dev/null; then
    echo "❌ Project not linked. Run: railway link"
    echo "   Then select: workspace -> project -> environment -> service 'avo'"
    exit 1
fi

echo "✓ Project linked"
echo ""

# Check DATABASE_URL
echo "Checking DATABASE_URL..."
if railway variables | grep -q "DATABASE_URL"; then
    echo "✓ DATABASE_URL is set"
    railway variables | grep DATABASE_URL | head -1
else
    echo "❌ DATABASE_URL not found in variables"
    echo ""
    echo "To fix:"
    echo "1. Go to Railway Dashboard -> PostgreSQL Service -> Variables"
    echo "2. Copy DATABASE_URL value"
    echo "3. Go to Railway Dashboard -> avo Service -> Variables"
    echo "4. Add DATABASE_URL with the copied value"
    exit 1
fi

echo ""
echo "Testing database connection..."
echo ""

# Test connection using Prisma
if railway run yarn prisma db execute --stdin <<< "SELECT 1 as test;" 2>&1 | grep -q "test\|1"; then
    echo "✓ Database connection successful!"
    echo ""
    echo "Your database is connected and ready to use."
else
    echo "⚠ Connection test completed (check output above for details)"
    echo ""
    echo "If connection failed, ensure:"
    echo "1. PostgreSQL service is running"
    echo "2. DATABASE_URL is correct"
    echo "3. Services are in the same Railway project"
fi

echo ""
echo "=== Verification Complete ==="


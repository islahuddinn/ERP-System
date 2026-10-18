#!/bin/bash

echo "🚀 Railway Production Fix Script"
echo "================================"

# Check if we're in Railway environment
if [ -z "$RAILWAY_ENVIRONMENT" ]; then
    echo "⚠️  Warning: Not running in Railway environment"
    echo "This script is designed for Railway deployment"
fi

echo "📋 Environment Check:"
echo "MASTER_DATABASE_URL: ${MASTER_DATABASE_URL:0:20}..."
echo "DATABASE_URL: ${DATABASE_URL:0:20}..."
echo "RAILWAY_ENVIRONMENT: $RAILWAY_ENVIRONMENT"

echo ""
echo "🔧 Step 1: Installing dependencies if needed..."
npm install @prisma/tenant-client bcrypt

echo ""
echo "🔧 Step 2: Running tenant fix..."
node fix-production-login.js

echo ""
echo "🔧 Step 3: Verifying users..."
node verify-tenant-users.js

echo ""
echo "🔧 Step 4: Health check..."
node production-health-check.js

echo ""
echo "✅ Railway fix completed!"
echo "📯 Next steps:"
echo "1. Test login with tenantId: 8549"
echo "2. Monitor Railway logs for any remaining errors"
echo "3. Check frontend can successfully authenticate"

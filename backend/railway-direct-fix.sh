#!/bin/bash

echo "🚀 Railway Direct Fix Script"
echo "============================"

# Your Railway backend URL
BACKEND_URL="https://factorydistributionsystem-production.up.railway.app"

echo "📊 Testing backend connection..."
curl -s "$BACKEND_URL/api/health" | head -5

echo ""
echo "🔧 Attempting to create tenant 8549..."

# Try to create tenant via a simple endpoint
response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  "$BACKEND_URL/emergency-fix/create-tenant" 2>/dev/null)

if [[ $response == *"success"* ]]; then
    echo "✅ Success! Tenant fix completed"
    echo "Response: $response"
else
    echo "❌ Endpoint not available. Trying alternative method..."
    
    # If the endpoint doesn't exist, we'll create a simple curl command
    echo "💡 Use this curl command in Railway Console:"
    echo "curl -X POST https://factorydistributionsystem-production.up.railway.app/admin/fix-tenant"
    
    echo ""
    echo "🔍 Or check existing tenants:"
    echo "curl https://factorydistributionsystem-production.up.railway.app/admin/check-tenants"
fi

echo ""
echo "🎯 After fix, test login with:"
echo "   Tenant ID: 8549"
echo "   Email: Check user database"
echo "   Password: Check user database"

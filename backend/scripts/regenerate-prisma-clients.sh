#!/bin/sh
# Script to regenerate Prisma clients with binary engine type
# This ensures clients are always generated with the correct engine type

set -e

echo "🔄 Regenerating Prisma clients with binary engine type..."

# Set environment variable
export PRISMA_CLIENT_ENGINE_TYPE=binary

# Remove old generated clients
rm -rf node_modules/.prisma 2>/dev/null || true
rm -rf node_modules/@prisma/tenant-client 2>/dev/null || true
rm -rf backend/generated 2>/dev/null || true
rm -rf backend/prisma/generated 2>/dev/null || true

# Regenerate with binary engine type
echo "📦 Generating master Prisma client..."
PRISMA_CLIENT_ENGINE_TYPE=binary npx prisma generate --schema=prisma/master/schema.prisma

echo "📦 Generating tenant Prisma client..."
PRISMA_CLIENT_ENGINE_TYPE=binary npx prisma generate --schema=prisma/tenant/schema.prisma

echo "✅ Prisma clients regenerated successfully!"


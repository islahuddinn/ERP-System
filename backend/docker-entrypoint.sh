#!/bin/sh
set -e

echo "[entrypoint] Waiting for Postgres to be ready..."

# Wait for DB (service name inside docker network is `db`)
until pg_isready -h db -p 5432 -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}" >/dev/null 2>&1; do
  sleep 2
done

echo "[entrypoint] Postgres is ready."

echo "[entrypoint] Generating Prisma clients..."
npx prisma generate --schema=prisma/master/schema.prisma
npx prisma generate --schema=prisma/tenant/schema.prisma

echo "[entrypoint] Skipping Prisma migrate deploy (master). Master schema is created idempotently by Postgres init script."

echo "[entrypoint] Applying Prisma migrations (tenant)..."
if [ "$NODE_ENV" = "development" ]; then
  echo "[entrypoint] Development mode detected, using prisma migrate dev"
  npx prisma migrate dev --schema=prisma/tenant/schema.prisma --accept-data-loss || echo "[entrypoint] Migration dev completed or failed"
else
  echo "[entrypoint] Production mode detected, using prisma migrate deploy"
  npx prisma migrate deploy --schema=prisma/tenant/schema.prisma
fi

if [ "${AUTO_SEED_LOCAL:-false}" = "true" ]; then
  echo "[entrypoint] AUTO_SEED_LOCAL=true, seeding master+tenant minimal data..."
  node prisma/seed-local.js
fi

echo "[entrypoint] Starting NestJS..."
exec node dist/main.js



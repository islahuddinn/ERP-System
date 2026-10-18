# ─── Stage 1: Build ───────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy dependency manifests + Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Copy full source
COPY . .

# Install ALL dependencies (including devDeps)
RUN npm install --legacy-peer-deps

# Generate Prisma clients + Build NestJS
RUN npm run generate:all \
    && npx nest build -p tsconfig.build.json


# ─── Stage 2: Runtime ──────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat postgresql-client

WORKDIR /app

ENV NODE_ENV=production

# Copy compiled output
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

# Copy generated Prisma clients directly from builder (avoids re-generation issues)
COPY --from=builder /app/node_modules/@prisma/master-client ./node_modules/@prisma/master-client
COPY --from=builder /app/node_modules/@prisma/tenant-client ./node_modules/@prisma/tenant-client

# Install ONLY production dependencies
RUN npm install --legacy-peer-deps --omit=dev

EXPOSE 5000

RUN chmod +x ./docker-entrypoint.sh

CMD ["node", "dist/main.js"]

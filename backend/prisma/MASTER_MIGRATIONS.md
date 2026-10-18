# Master Database Migrations

This document explains how to set up and manage migrations for the master database (`inventory_master`) using `prisma/master/master.prisma`.

## Initial Setup (One-time Baseline)

Since the `tenants` table already exists in the database, you need to establish a baseline migration:

### Step 1: Run Migration Baseline (Interactive)

```bash
docker exec -it inventory_backend sh
cd /app
npx prisma migrate dev --schema=prisma/master/master.prisma --name init_master
```

When Prisma detects that the table already exists, it will prompt you:

- **Select**: "Mark existing table as applied" (or similar option)
- This tells Prisma that the current database state matches the schema

### Step 2: Verify Migration

```bash
# Check that migration was recorded
npx prisma migrate status --schema=prisma/master/master.prisma
```

## Future Migrations

After the baseline is established, all future schema changes should go through Prisma migrations:

1. **Edit `prisma/master/master.prisma`** to modify the schema
2. **Generate migration**:
   ```bash
   npm run master:migrate
   ```
3. **Rebuild backend** to include new Prisma client:
   ```bash
   docker-compose build backend
   docker-compose restart backend
   ```

## Production Deployments

For production, use `prisma migrate deploy` instead of `prisma migrate dev`:

```bash
npm run master:deploy
```

This applies all pending migrations without prompting.

## Important Notes

- **DO NOT** manually alter the database schema - always use Prisma migrations
- **DO NOT** drop existing tables - use migrations to evolve the schema
- The master database uses **Int IDs** (not UUIDs) for the `tenants` table
- All schema changes must be reflected in `prisma/master/master.prisma`

## Seed Data

To seed the master database with initial tenant data:

```bash
npm run master:seed-simple
```

Or directly:

```bash
docker exec inventory_backend sh -c "cd /app && npx ts-node prisma/seed_master.ts"
```

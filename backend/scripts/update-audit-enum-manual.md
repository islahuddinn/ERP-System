# Manual Update Guide for Existing Tenant Databases

This guide shows you how to safely update existing tenant databases with the new `BULK_ADJUST` and `BULK_TRANSFER` enum values **without losing any data**.

## Option 1: Using the Automated Script (Recommended)

Run the TypeScript script that will update all tenants automatically:

```bash
cd backend
npx ts-node scripts/update-audit-enum-for-tenants.ts
```

Or if you have the project compiled:

```bash
cd backend
npm run build
node dist/scripts/update-audit-enum-for-tenants.js
```

The script will:
- Connect to the master database to get all tenants
- Decrypt each tenant's database URL
- Check if enum values already exist
- Add the enum values safely
- Show a summary of results

## Option 2: Manual SQL Update (Per Tenant)

If you prefer to update tenants one by one, use the SQL script:

### Step 1: Get the tenant's database connection string
- Go to your admin panel
- Find the tenant's encrypted database URL
- Decrypt it (or use the connection details directly)

### Step 2: Connect to the tenant database
Using `psql`:
```bash
psql -h localhost -U your_user -d tenant_database_name
```

Or using any PostgreSQL client (pgAdmin, DBeaver, etc.)

### Step 3: Run the SQL commands

```sql
-- Add BULK_ADJUST (safe - won't error if already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'BULK_ADJUST' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
    ) THEN
        ALTER TYPE "AuditAction" ADD VALUE 'BULK_ADJUST';
    END IF;
END $$;

-- Add BULK_TRANSFER (safe - won't error if already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'BULK_TRANSFER' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
    ) THEN
        ALTER TYPE "AuditAction" ADD VALUE 'BULK_TRANSFER';
    END IF;
END $$;
```

### Step 4: Verify the update

```sql
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
ORDER BY enumsortorder;
```

You should see `BULK_ADJUST` and `BULK_TRANSFER` in the list.

## Option 3: Using Prisma Migrate Deploy

If you have the migration file in place, you can use:

```bash
cd backend
# Set the tenant's database URL
export DATABASE_URL="postgresql://user:password@localhost:5432/tenant_db"

# Deploy the migration
npx prisma migrate deploy
```

## Important Notes

✅ **Safe Operations**: Adding enum values in PostgreSQL is a safe operation that:
- Does NOT require a database reset
- Does NOT delete any data
- Does NOT modify existing records
- Only adds new possible values to the enum type

⚠️ **After Updating**: 
1. Regenerate Prisma client: `npx prisma generate`
2. Restart your backend server
3. The bulk operations will now work for that tenant

## Verification

After updating, you can verify by checking the enum values:

```sql
SELECT unnest(enum_range(NULL::"AuditAction")) AS audit_action;
```

Or check if the values exist:

```sql
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'BULK_ADJUST' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
    ) THEN '✅ BULK_ADJUST exists' ELSE '❌ BULK_ADJUST missing' END,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'BULK_TRANSFER' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
    ) THEN '✅ BULK_TRANSFER exists' ELSE '❌ BULK_TRANSFER missing' END;
```


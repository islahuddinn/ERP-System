-- SQL script to update a single tenant database
-- Run this script directly on the tenant database using psql or your database client
-- 
-- Usage:
--   psql -h localhost -U your_user -d tenant_database_name -f update-single-tenant-enum.sql
-- 
-- Or connect to the database and run:
--   \i update-single-tenant-enum.sql

-- Add BULK_ADJUST enum value (safe - won't error if it already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'BULK_ADJUST' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
    ) THEN
        ALTER TYPE "AuditAction" ADD VALUE 'BULK_ADJUST';
        RAISE NOTICE 'Added BULK_ADJUST to AuditAction enum';
    ELSE
        RAISE NOTICE 'BULK_ADJUST already exists in AuditAction enum';
    END IF;
END $$;

-- Add BULK_TRANSFER enum value (safe - won't error if it already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'BULK_TRANSFER' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
    ) THEN
        ALTER TYPE "AuditAction" ADD VALUE 'BULK_TRANSFER';
        RAISE NOTICE 'Added BULK_TRANSFER to AuditAction enum';
    ELSE
        RAISE NOTICE 'BULK_TRANSFER already exists in AuditAction enum';
    END IF;
END $$;

-- Verify the enum values were added
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
ORDER BY enumsortorder;


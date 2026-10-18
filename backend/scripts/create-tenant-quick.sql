-- Quick SQL to create a tenant in master database
-- Run this on Railway Postgres (master database)
-- Replace the values below with your actual data

-- Step 1: Check existing tenants
SELECT id, name, email, "short_tenant_id", "is_active" 
FROM tenants 
ORDER BY created_at DESC;

-- Step 2: Create tenant (uncomment and modify as needed)
-- IMPORTANT: Replace all placeholder values with your actual data

/*
INSERT INTO tenants (
    id,
    name,
    email,
    "short_tenant_id",
    "database_name",
    "database_url",
    "subscription_type",
    "subscription_start_date",
    "is_active",
    "is_suspended",
    "created_at",
    "updated_at"
) VALUES (
    gen_random_uuid()::text,  -- Auto-generate UUID
    'Your Company Name',  -- Replace with your company name
    'admin@yourcompany.com',  -- Replace with tenant admin email
    '8549',  -- Your short tenant ID
    'tenant_8549',  -- Database name (can be same as master for now)
    'postgresql://postgres:password@host:port/railway',  -- Replace with your DATABASE_URL (can use same as master for now)
    'PERMANENT',  -- Subscription type: PERMANENT, MONTHLY, QUARTERLY, ANNUALLY, TRIAL, YEARLY
    NOW(),  -- Subscription start date
    true,  -- Active
    false,  -- Not suspended
    NOW(),  -- Created at
    NOW()   -- Updated at
);
*/

-- Step 3: Verify tenant was created
-- SELECT * FROM tenants WHERE "short_tenant_id" = '8549';

-- Note: After creating tenant, you also need to:
-- 1. Create user in tenant database (if using separate database)
-- 2. Or if using same database, make sure user exists in the users table


INSERT INTO "Tenant" ("id", "name", "database_url", "database_name", "is_active", "created_at", "updated_at")
VALUES ('default-tenant-123', 'Demo Tenant', 'postgresql://postgres:password@db:5432/inventory?schema=public', 'inventory', true, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

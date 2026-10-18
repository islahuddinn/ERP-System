# Single Tenant RBAC Migration Script

This script migrates a specific tenant database to support the new RBAC (Role-Based Access Control) system.

## Target Tenant

- **Email:** admin@malindtech.com
- **Code:** 1130
- **Password:** 123456789

## What This Script Does

1. ✅ Adds new columns to User table:
   - `status` (UserStatus enum)
   - `phone` (optional)
   - `avatar` (optional)
   - `last_login_at`
   - `last_activity_at`
   - `email_verified`
   - `created_by`

2. ✅ Creates UserStatus enum (ACTIVE, INACTIVE, SUSPENDED, PENDING)

3. ✅ Updates UserRole enum with new roles:
   - MANAGER
   - SALES_PERSON
   - CASHIER
   - WAREHOUSE_STAFF
   - ACCOUNTANT
   - VIEWER

4. ✅ Creates Permission table

5. ✅ Creates RolePermission table

6. ✅ Creates UserPermission table

7. ✅ Seeds all system permissions (48 permissions)

8. ✅ Assigns default permissions to all roles

9. ✅ Ensures ADMIN users have all permissions

10. ✅ Updates existing users to have ACTIVE status and emailVerified = true

## Prerequisites

1. Make sure you have a **backup** of the tenant database before running this script
2. Ensure the `.env` file has:
   - `MASTER_DATABASE_URL` - Connection to master database
   - `ENCRYPTION_KEY` - Key for decrypting tenant database URLs

## How to Run

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Run the migration script:
   ```bash
   npx ts-node scripts/migrate-single-tenant-rbac.ts
   ```

## Expected Output

```
🔧 RBAC Migration Script for Single Tenant
==========================================

Target Tenant:
  Email: admin@malindtech.com
  Code: 1130

✅ Connected to master database

✅ Found tenant: [Tenant Name] (ID: [tenant-id])
   Email: admin@malindtech.com
   Code: 1130
   Active: Yes

⚠️  This will migrate the tenant database.
   Make sure you have a backup before proceeding!

📊 Migrating [Tenant Name] ([tenant-id])...
   ✅ Connected to database
   🔧 Adding new columns to User table...
   ✅ User table columns added
   🔧 Adding UserStatus enum...
   ✅ UserStatus enum added
   🔧 Updating UserRole enum...
   ✅ UserRole enum updated
   🔧 Creating Permission table...
   ✅ Permission table created
   🔧 Creating RolePermission table...
   ✅ RolePermission table created
   🔧 Creating UserPermission table...
   ✅ UserPermission table created
   🔧 Adding foreign key for created_by...
   ✅ Foreign key for created_by added
   🌱 Seeding permissions...
   ✅ Permissions seeded
   🔐 Ensuring ADMIN users have all permissions...
   ✅ ADMIN permissions verified
   🔧 Updating existing users status...
   ✅ User statuses updated
   🔧 Updating existing users emailVerified...
   ✅ User emailVerified updated

   ✅ [Tenant Name] migration completed successfully!

==========================================
✅ Migration completed successfully!
==========================================
```

## Verification

After running the script, you can verify the migration by:

1. **Check User table columns:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'users';
   ```

2. **Check Permission table:**
   ```sql
   SELECT COUNT(*) FROM permissions;
   -- Should return 48
   ```

3. **Check Role Permissions:**
   ```sql
   SELECT role, COUNT(*) as permission_count
   FROM role_permissions
   GROUP BY role;
   ```

4. **Check ADMIN permissions:**
   ```sql
   SELECT COUNT(*) 
   FROM role_permissions 
   WHERE role = 'ADMIN';
   -- Should return 48 (all permissions)
   ```

## Troubleshooting

### Error: "Tenant not found"
- Verify the tenant exists in the master database
- Check that the email is exactly "admin@malindtech.com" or code is "1130"
- Ensure the tenant is active (`is_active = true`)

### Error: "ENCRYPTION_KEY environment variable is required"
- Make sure your `.env` file has the `ENCRYPTION_KEY` set
- The key should be the same one used to encrypt tenant database URLs

### Error: "Connection refused" or database connection errors
- Verify the `MASTER_DATABASE_URL` is correct
- Check that the tenant's database URL can be decrypted
- Ensure the tenant database is accessible

### Error: "Permission already exists" or similar
- This is normal if you run the script multiple times
- The script uses `IF NOT EXISTS` checks to prevent errors
- It's safe to run the script multiple times

## Notes

- This script only affects the specified tenant (admin@malindtech.com / code 1130)
- Other tenants are not affected
- The script is idempotent - safe to run multiple times
- All existing data is preserved
- Only adds new tables and columns, doesn't modify existing data

## After Migration

Once the migration is complete:

1. ✅ The tenant database will have all RBAC tables
2. ✅ All permissions will be seeded
3. ✅ Role permissions will be assigned
4. ✅ Existing users will have ACTIVE status
5. ✅ You can now use the new User Management and Roles & Permissions features

## Support

If you encounter any issues, check:
1. Database connection strings
2. Environment variables
3. Database permissions
4. Tenant status in master database


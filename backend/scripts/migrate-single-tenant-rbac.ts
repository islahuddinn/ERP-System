/**
 * Migration Script for Single Tenant Database
 *
 * This script migrates a specific tenant database to support the new RBAC system.
 * It targets only the tenant with:
 * - Email: admin@malindtech.com
 * - Code: 1130
 *
 * It:
 * 1. Adds new columns to User table (status, phone, avatar, lastLoginAt, lastActivityAt, emailVerified, createdBy)
 * 2. Creates Permission, RolePermission, and UserPermission tables
 * 3. Seeds all permissions
 * 4. Assigns default role permissions
 * 5. Ensures existing ADMIN users have all permissions
 *
 * Usage:
 *   npx ts-node scripts/migrate-single-tenant-rbac.ts
 */

import { PrismaClient } from "@prisma/tenant-client";
import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";
import {
  PERMISSIONS,
  getAllPermissionNames,
} from "../src/users/permissions/permission.definitions";
import { v4 as uuidv4 } from "uuid";

// Define role permissions directly to avoid TypeScript issues with outdated Prisma types
const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    "dashboard.view",
    "products.create",
    "products.read",
    "products.update",
    "products.delete",
    "products.bulk_import",
    "stock.read",
    "stock.adjust",
    "stock.transfer",
    "stock.stocktake",
    "pos.create_sale",
    "pos.process_payment",
    "pos.refund",
    "pos.cancel_sale",
    "pos.credit_sale",
    "pos.view_all_sales",
    "purchases.create",
    "purchases.read",
    "purchases.update",
    "purchases.delete",
    "purchases.approve",
    "purchases.receive",
    "customers.create",
    "customers.read",
    "customers.update",
    "customers.delete",
    "suppliers.create",
    "suppliers.read",
    "suppliers.update",
    "suppliers.delete",
    "locations.create",
    "locations.read",
    "locations.update",
    "locations.delete",
    "users.create",
    "users.read",
    "users.update",
    "users.delete",
    "users.manage_roles",
    "settings.view",
    "settings.update_branding",
    "settings.manage_roles",
    "reports.view_all",
    "reports.export",
    "audit.view",
    "cash.view",
    "cash.count",
    "cash.approve",
  ],
  MANAGER: [
    "dashboard.view",
    "products.create",
    "products.read",
    "products.update",
    "products.delete",
    "products.bulk_import",
    "stock.read",
    "stock.adjust",
    "stock.transfer",
    "stock.stocktake",
    "pos.view_all_sales",
    "purchases.create",
    "purchases.read",
    "purchases.update",
    "purchases.delete",
    "purchases.approve",
    "purchases.receive",
    "customers.create",
    "customers.read",
    "customers.update",
    "customers.delete",
    "suppliers.create",
    "suppliers.read",
    "suppliers.update",
    "suppliers.delete",
    "locations.create",
    "locations.read",
    "locations.update",
    "locations.delete",
    "settings.view",
    "settings.update_branding",
    "reports.view_all",
    "reports.export",
    "audit.view",
    "cash.view",
    "cash.count",
    "cash.approve",
  ],
  SALES_PERSON: [
    "dashboard.view",
    "pos.create_sale",
    "pos.process_payment",
    "pos.credit_sale",
    "pos.view_all_sales",
    "customers.create",
    "customers.read",
    "customers.update",
    "products.read",
    "stock.read",
    "reports.view_own",
  ],
  CASHIER: [
    "dashboard.view",
    "pos.create_sale",
    "pos.process_payment",
    "pos.view_all_sales",
    "customers.read",
    "products.read",
    "stock.read",
  ],
  WAREHOUSE_STAFF: [
    "dashboard.view",
    "stock.read",
    "stock.adjust",
    "stock.transfer",
    "stock.stocktake",
    "products.read",
    "locations.read",
    "purchases.receive",
    "reports.view_own",
  ],
  ACCOUNTANT: [
    "dashboard.view",
    "purchases.read",
    "pos.view_all_sales",
    "customers.read",
    "reports.view_all",
    "reports.export",
    "audit.view",
    "cash.view",
  ],
  VIEWER: [
    "dashboard.view",
    "products.read",
    "stock.read",
    "purchases.read",
    "pos.view_all_sales",
    "customers.read",
    "suppliers.read",
    "locations.read",
    "reports.view_all",
  ],
  STAFF: ["dashboard.view", "products.read", "stock.read"],
};

class SimpleEncryption {
  private readonly encryptionKey: string;

  constructor() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error("ENCRYPTION_KEY environment variable is required");
    }
    this.encryptionKey = key;
  }

  decrypt(encryptedValue: string): string {
    // Simple XOR decryption (same as EncryptionService)
    const key = Buffer.from(this.encryptionKey, "hex");
    const encrypted = Buffer.from(encryptedValue, "hex");
    const decrypted = Buffer.alloc(encrypted.length);

    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ key[i % key.length];
    }

    return decrypted.toString("utf8");
  }
}

async function migrateTenantDatabase(
  tenantId: string,
  tenantName: string,
  databaseUrl: string,
): Promise<void> {
  console.log(`\n📊 Migrating ${tenantName} (${tenantId})...`);

  // Create PrismaClient with custom database URL
  // We need to override the DATABASE_URL environment variable temporarily
  const originalDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = databaseUrl;

  const tenantClient = new PrismaClient();

  // Restore original DATABASE_URL after creating client
  if (originalDatabaseUrl) {
    process.env.DATABASE_URL = originalDatabaseUrl;
  } else {
    delete process.env.DATABASE_URL;
  }

  try {
    await tenantClient.$connect();
    console.log(`   ✅ Connected to database`);

    // Step 1: Add UserStatus enum FIRST (before adding columns that use it)
    console.log(`   🔧 Adding UserStatus enum...`);
    await tenantClient.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserStatus') THEN
          CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');
        END IF;
      END;
      $$;
    `);
    console.log(`   ✅ UserStatus enum added`);

    // Step 2: Add new columns to User table
    console.log(`   🔧 Adding new columns to User table...`);
    await tenantClient.$executeRawUnsafe(`
      DO $$
      BEGIN
        -- Add status column
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'status'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "status" "UserStatus" DEFAULT 'ACTIVE';
        END IF;

        -- Add phone column
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'phone'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "phone" TEXT;
        END IF;

        -- Add avatar column
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'avatar'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "avatar" TEXT;
        END IF;

        -- Add lastLoginAt column
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'last_login_at'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "last_login_at" TIMESTAMP(3);
        END IF;

        -- Add lastActivityAt column
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'last_activity_at'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "last_activity_at" TIMESTAMP(3);
        END IF;

        -- Add emailVerified column
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'email_verified'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "email_verified" BOOLEAN DEFAULT true;
        END IF;

        -- Add createdBy column
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'created_by'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "created_by" TEXT;
        END IF;
      END;
      $$;
    `);
    console.log(`   ✅ User table columns added`);

    // Step 3: Update UserRole enum to include new roles (if it exists)
    console.log(`   🔧 Updating UserRole enum...`);
    await tenantClient.$executeRawUnsafe(`
      DO $$
      BEGIN
        -- Add new role values if they don't exist
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MANAGER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
          ALTER TYPE "UserRole" ADD VALUE 'MANAGER';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SALES_PERSON' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
          ALTER TYPE "UserRole" ADD VALUE 'SALES_PERSON';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CASHIER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
          ALTER TYPE "UserRole" ADD VALUE 'CASHIER';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'WAREHOUSE_STAFF' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
          ALTER TYPE "UserRole" ADD VALUE 'WAREHOUSE_STAFF';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ACCOUNTANT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
          ALTER TYPE "UserRole" ADD VALUE 'ACCOUNTANT';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'VIEWER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
          ALTER TYPE "UserRole" ADD VALUE 'VIEWER';
        END IF;
      END;
      $$;
    `);
    console.log(`   ✅ UserRole enum updated`);

    // Step 4: Create Permission table
    console.log(`   🔧 Creating Permission table...`);
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "permissions" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "module" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
      )
    `);
    // Create indexes separately
    await tenantClient.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "permissions_name_key" ON "permissions"("name")`,
    );
    await tenantClient.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "permissions_module_idx" ON "permissions"("module")`,
    );
    await tenantClient.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "permissions_name_idx" ON "permissions"("name")`,
    );
    console.log(`   ✅ Permission table created`);

    // Step 5: Create RolePermission table
    console.log(`   🔧 Creating RolePermission table...`);
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "role_permissions" (
        "id" TEXT NOT NULL,
        "role" "UserRole" NOT NULL,
        "permission_id" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
      )
    `);
    // Create unique constraint for role and permission_id
    await tenantClient.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'role_permissions_role_permission_id_key'
        ) THEN
          CREATE UNIQUE INDEX "role_permissions_role_permission_id_key" 
          ON "role_permissions"("role", "permission_id");
        END IF;
      END;
      $$
    `);
    await tenantClient.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "role_permissions_role_idx" ON "role_permissions"("role")`,
    );
    // Add foreign key constraint
    await tenantClient.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'role_permissions_permission_id_fkey'
        ) THEN
          ALTER TABLE "role_permissions" 
          ADD CONSTRAINT "role_permissions_permission_id_fkey" 
          FOREIGN KEY ("permission_id") 
          REFERENCES "permissions"("id") 
          ON DELETE CASCADE 
          ON UPDATE CASCADE;
        END IF;
      END;
      $$
    `);
    console.log(`   ✅ RolePermission table created`);

    // Step 6: Create UserPermission table
    console.log(`   🔧 Creating UserPermission table...`);
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "user_permissions" (
        "id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "permission_id" TEXT NOT NULL,
        "granted_by" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
      )
    `);
    // Create unique constraint for user_id and permission_id
    await tenantClient.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'user_permissions_user_id_permission_id_key'
        ) THEN
          CREATE UNIQUE INDEX "user_permissions_user_id_permission_id_key" 
          ON "user_permissions"("user_id", "permission_id");
        END IF;
      END;
      $$
    `);
    await tenantClient.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "user_permissions_user_id_idx" ON "user_permissions"("user_id")`,
    );
    // Add foreign key constraints
    await tenantClient.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'user_permissions_user_id_fkey'
        ) THEN
          ALTER TABLE "user_permissions" 
          ADD CONSTRAINT "user_permissions_user_id_fkey" 
          FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") 
          ON DELETE CASCADE 
          ON UPDATE CASCADE;
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'user_permissions_permission_id_fkey'
        ) THEN
          ALTER TABLE "user_permissions" 
          ADD CONSTRAINT "user_permissions_permission_id_fkey" 
          FOREIGN KEY ("permission_id") 
          REFERENCES "permissions"("id") 
          ON DELETE CASCADE 
          ON UPDATE CASCADE;
        END IF;
      END;
      $$
    `);
    console.log(`   ✅ UserPermission table created`);

    // Step 7: Add foreign key for createdBy in users table
    console.log(`   🔧 Adding foreign key for created_by...`);
    await tenantClient.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'users_created_by_fkey'
        ) THEN
          ALTER TABLE "users" 
          ADD CONSTRAINT "users_created_by_fkey" 
          FOREIGN KEY ("created_by") 
          REFERENCES "users"("id") 
          ON DELETE SET NULL 
          ON UPDATE CASCADE;
        END IF;
      END;
      $$;
    `);
    console.log(`   ✅ Foreign key for created_by added`);

    // Step 8: Seed permissions
    console.log(`   🌱 Seeding permissions...`);
    const permissionNames = getAllPermissionNames();
    let createdCount = 0;
    let updatedCount = 0;

    // Helper function to escape SQL strings
    const escapeSql = (str: string | null | undefined): string => {
      if (!str) return "NULL";
      return `'${str.replace(/'/g, "''")}'`;
    };

    for (const permissionName of permissionNames) {
      const permissionDef = PERMISSIONS[permissionName];
      const permissionId = uuidv4();
      const escapedName = permissionName.replace(/'/g, "''");
      const escapedDescription = (permissionDef.description || "").replace(/'/g, "''");
      const escapedModule = permissionDef.module.replace(/'/g, "''");
      const escapedAction = permissionDef.action.replace(/'/g, "''");

      // Check if permission exists
      const existing = await tenantClient.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM permissions WHERE name = '${escapedName}'
      `);

      if (existing && existing.length > 0) {
        // Update if exists
        await tenantClient.$executeRawUnsafe(`
          UPDATE permissions 
          SET description = ${escapeSql(permissionDef.description)}, 
              module = '${escapedModule}', 
              action = '${escapedAction}'
          WHERE name = '${escapedName}'
        `);
        updatedCount++;
      } else {
        // Create if doesn't exist
        await tenantClient.$executeRawUnsafe(`
          INSERT INTO permissions (id, name, description, module, action, created_at)
          VALUES ('${permissionId}', '${escapedName}', ${escapeSql(permissionDef.description)}, '${escapedModule}', '${escapedAction}', NOW())
        `);
        createdCount++;
      }
    }
    console.log(`   ✅ Permissions seeded: ${createdCount} created, ${updatedCount} updated`);

    // Step 9: Get all permissions for role assignment
    const allPermissions = await tenantClient.$queryRawUnsafe<Array<{ id: string; name: string }>>(`
      SELECT id, name FROM permissions
    `);
    const permissionMap = new Map(allPermissions.map((p: any) => [p.name, p.id]));

    // Step 10: Assign default permissions to roles
    console.log(`   🔐 Assigning default role permissions...`);
    let totalAssigned = 0;

    for (const [role, permissionNames] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      let roleAssigned = 0;

      for (const permissionName of permissionNames) {
        const permissionId = permissionMap.get(permissionName);
        if (!permissionId) {
          console.log(`   ⚠️  Permission not found: ${permissionName}, skipping...`);
          continue;
        }

        // Check if already assigned
        const existing = await tenantClient.$queryRawUnsafe<Array<{ id: string }>>(`
          SELECT id FROM role_permissions 
          WHERE role = '${role}' AND permission_id = '${permissionId}'
        `);

        if (!existing || existing.length === 0) {
          const rolePermissionId = uuidv4();
          await tenantClient.$executeRawUnsafe(`
            INSERT INTO role_permissions (id, role, permission_id, created_at)
            VALUES ('${rolePermissionId}', '${role}', '${permissionId}', NOW())
          `);
          roleAssigned++;
        }
      }

      console.log(`   ✅ Assigned ${roleAssigned} permissions to role: ${role}`);
      totalAssigned += roleAssigned;
    }
    console.log(`   ✅ Total role permissions assigned: ${totalAssigned}`);

    // Step 11: Ensure ADMIN has all permissions
    console.log(`   🔐 Ensuring ADMIN users have all permissions...`);
    let adminAssigned = 0;

    for (const permission of allPermissions) {
      const existing = await tenantClient.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM role_permissions 
        WHERE role = 'ADMIN' AND permission_id = '${permission.id}'
      `);

      if (!existing || existing.length === 0) {
        const rolePermissionId = uuidv4();
        await tenantClient.$executeRawUnsafe(`
          INSERT INTO role_permissions (id, role, permission_id, created_at)
          VALUES ('${rolePermissionId}', 'ADMIN', '${permission.id}', NOW())
        `);
        adminAssigned++;
      }
    }

    if (adminAssigned > 0) {
      console.log(`   ✅ Assigned ${adminAssigned} additional permissions to ADMIN`);
    } else {
      console.log(`   ✅ ADMIN already has all permissions`);
    }

    // Step 12: Update existing users to have ACTIVE status if status is null
    console.log(`   🔧 Updating existing users status...`);
    await tenantClient.$executeRawUnsafe(`
      UPDATE "users" 
      SET "status" = 'ACTIVE' 
      WHERE "status" IS NULL;
    `);
    console.log(`   ✅ User statuses updated`);

    // Step 13: Update existing users to have emailVerified = true if null
    console.log(`   🔧 Updating existing users emailVerified...`);
    await tenantClient.$executeRawUnsafe(`
      UPDATE "users" 
      SET "email_verified" = true 
      WHERE "email_verified" IS NULL;
    `);
    console.log(`   ✅ User emailVerified updated`);

    console.log(`\n   ✅ ${tenantName} migration completed successfully!`);
  } catch (error: any) {
    console.error(`   ❌ Migration failed for ${tenantName}:`, error.message);
    console.error(`   Stack:`, error.stack);
    throw error;
  } finally {
    await tenantClient.$disconnect();
  }
}

async function main() {
  console.log("🔧 RBAC Migration Script for Single Tenant");
  console.log("==========================================\n");
  console.log("Target Tenant:");
  console.log("  Email: admin@malindtech.com");
  console.log("  Code: 1130\n");

  const masterPrisma = new MasterPrismaClient({
    datasources: {
      db: {
        url: process.env.MASTER_DATABASE_URL,
      },
    },
  });

  const encryptionService = new SimpleEncryption();

  try {
    await masterPrisma.$connect();
    console.log("✅ Connected to master database\n");

    // Find tenant by email or shortTenantId (code)
    const tenant = await masterPrisma.$queryRawUnsafe<
      Array<{
        id: string;
        name: string;
        database_url: string;
        is_active: boolean;
        email?: string;
        short_tenant_id?: string;
      }>
    >(`
      SELECT t.id, t.name, t.database_url, t.is_active, 
             t.email, t.short_tenant_id
      FROM tenants t
      WHERE (t.email = 'admin@malindtech.com' OR t.short_tenant_id = '1130')
        AND t.is_active = true
      LIMIT 1;
    `);

    if (!tenant || tenant.length === 0) {
      console.error('❌ Tenant not found with email "admin@malindtech.com" or code "1130"');
      console.error("   Please verify the tenant exists and is active in the master database.");
      process.exit(1);
    }

    const targetTenant = tenant[0];
    console.log(`✅ Found tenant: ${targetTenant.name} (ID: ${targetTenant.id})`);
    console.log(`   Email: ${targetTenant.email || "N/A"}`);
    console.log(`   Code: ${targetTenant.short_tenant_id || "N/A"}`);
    console.log(`   Active: ${targetTenant.is_active ? "Yes" : "No"}\n`);

    if (!targetTenant.is_active) {
      console.error("❌ Tenant is not active. Cannot proceed with migration.");
      process.exit(1);
    }

    console.log("⚠️  This will migrate the tenant database.");
    console.log("   Make sure you have a backup before proceeding!\n");

    // Decrypt database URL
    const decryptedUrl = encryptionService.decrypt(targetTenant.database_url);

    // Migrate the tenant database
    await migrateTenantDatabase(targetTenant.id, targetTenant.name, decryptedUrl);

    console.log("\n==========================================");
    console.log("✅ Migration completed successfully!");
    console.log("==========================================\n");
  } catch (error: any) {
    console.error("\n❌ Migration script failed:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  } finally {
    await masterPrisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

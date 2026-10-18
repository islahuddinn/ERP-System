/**
 * Migration Script for Existing Tenant Databases
 *
 * This script migrates existing tenant databases to support the new RBAC system.
 * It:
 * 1. Adds new columns to User table (status, phone, avatar, lastLoginAt, lastActivityAt, emailVerified, createdBy)
 * 2. Creates Permission, RolePermission, and UserPermission tables
 * 3. Seeds all permissions
 * 4. Assigns default role permissions
 * 5. Ensures existing ADMIN users have all permissions
 *
 * Usage:
 *   npx ts-node scripts/migrate-existing-tenants-rbac.ts
 */

import { PrismaClient } from "@prisma/tenant-client";
import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";
import { EncryptionService } from "../src/prisma/encryption.service";
import { ConfigService } from "@nestjs/config";
import { PermissionsSeedService } from "../src/users/permissions/permissions-seed.service";

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

  const tenantClient = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    await tenantClient.$connect();
    console.log(`   ✅ Connected to database`);

    // Step 1: Add new columns to User table
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

    // Step 2: Add UserStatus enum if it doesn't exist
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

    // Step 3: Update UserRole enum to include new roles
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
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS "permissions_name_key" ON "permissions"("name");
      CREATE INDEX IF NOT EXISTS "permissions_module_idx" ON "permissions"("module");
      CREATE INDEX IF NOT EXISTS "permissions_name_idx" ON "permissions"("name");
    `);
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
      );
      
      -- Create unique constraint for role and permission_id
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
      $$;
      CREATE INDEX IF NOT EXISTS "role_permissions_role_idx" ON "role_permissions"("role");
      
      -- Add foreign key constraint
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
      $$;
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
      );
      
      -- Create unique constraint for user_id and permission_id
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
      $$;
      CREATE INDEX IF NOT EXISTS "user_permissions_user_id_idx" ON "user_permissions"("user_id");
      
      -- Add foreign key constraints
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
      $$;
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
    const permissionsSeedService = new PermissionsSeedService();
    await permissionsSeedService.seedPermissions(tenantClient);
    console.log(`   ✅ Permissions seeded`);

    // Step 9: Ensure existing ADMIN users have all permissions
    console.log(`   🔐 Ensuring ADMIN users have all permissions...`);
    await permissionsSeedService.ensureAdminHasAllPermissions(tenantClient);
    console.log(`   ✅ ADMIN permissions verified`);

    // Step 10: Update existing users to have ACTIVE status if status is null
    console.log(`   🔧 Updating existing users status...`);
    await tenantClient.$executeRawUnsafe(`
      UPDATE "users" 
      SET "status" = 'ACTIVE' 
      WHERE "status" IS NULL;
    `);
    console.log(`   ✅ User statuses updated`);

    console.log(`   ✅ ${tenantName} migration completed successfully!`);
  } catch (error: any) {
    console.error(`   ❌ Migration failed for ${tenantName}:`, error.message);
    throw error;
  } finally {
    await tenantClient.$disconnect();
  }
}

async function main() {
  console.log("🔧 RBAC Migration Script for Existing Tenants");
  console.log("================================================\n");

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

    // Get all active tenants
    const tenants = await masterPrisma.$queryRawUnsafe<
      Array<{
        id: string;
        name: string;
        database_url: string;
        is_active: boolean;
      }>
    >(`
      SELECT id, name, database_url, is_active
      FROM tenants
      WHERE is_active = true
      ORDER BY name;
    `);

    if (tenants.length === 0) {
      console.log("⚠️  No active tenants found.");
      return;
    }

    console.log(`Found ${tenants.length} active tenant(s):\n`);
    tenants.forEach((tenant, index) => {
      console.log(`   ${index + 1}. ${tenant.name} (ID: ${tenant.id})`);
    });

    console.log("\n⚠️  This will migrate all active tenant databases.");
    console.log("   Make sure you have backups before proceeding!\n");

    // In a real scenario, you might want to add a confirmation prompt here
    // For now, we'll proceed with migration

    let successCount = 0;
    let failCount = 0;

    for (const tenant of tenants) {
      try {
        const decryptedUrl = encryptionService.decrypt(tenant.database_url);
        await migrateTenantDatabase(tenant.id, tenant.name, decryptedUrl);
        successCount++;
      } catch (error: any) {
        console.error(`\n❌ Failed to migrate ${tenant.name}:`, error.message);
        failCount++;
      }
    }

    console.log("\n================================================");
    console.log("📊 Migration Summary:");
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log("================================================\n");
  } catch (error: any) {
    console.error("❌ Migration script failed:", error);
    process.exit(1);
  } finally {
    await masterPrisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

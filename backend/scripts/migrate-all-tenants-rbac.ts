/**
 * Global RBAC & User Schema Migration Script (All Tenants)
 *
 * This script:
 *  - Iterates over ALL active tenants in the master database
 *  - Decrypts each tenant's database_url
 *  - Connects to each tenant database and applies ALL RBAC + user schema updates:
 *      1. Ensures UserStatus enum exists
 *      2. Ensures user table columns exist (status, phone, avatar, last_login_at,
 *         last_activity_at, email_verified, created_by)
 *      3. Ensures UserRole enum has all new roles (MANAGER, SALES_PERSON, etc.)
 *      4. Creates / verifies RBAC tables:
 *           - permissions
 *           - role_permissions
 *           - user_permissions
 *      5. Creates / verifies Custom Role tables:
 *           - custom_roles
 *           - custom_role_permissions
 *      6. Adds required foreign keys and indexes
 *      7. Seeds / updates permissions from PERMISSIONS definitions
 *      8. Assigns default role permissions for all roles
 *      9. Ensures ADMIN has all permissions
 *     10. Backfills users.status and users.email_verified with safe defaults
 *
 *  - The script is:
 *      - Non-destructive (no data is deleted)
 *      - Idempotent (safe to run multiple times)
 *
 * Usage:
 *   From backend directory:
 *     npx ts-node scripts/migrate-all-tenants-rbac.ts
 *
 * After running:
 *   - RESTART the backend server so MultiTenantPrismaService recreates its clients
 */

import { PrismaClient } from "@prisma/tenant-client";
import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";
import * as crypto from "crypto";
import {
  PERMISSIONS,
  getAllPermissionNames,
} from "../src/users/permissions/permission.definitions";
import { v4 as uuidv4 } from "uuid";

/**
 * AES-256-GCM decryption compatible with EncryptionService
 */
class SimpleEncryption {
  private readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly saltLength = 64;
  private readonly tagLength = 16;
  private readonly tagPosition = this.saltLength + this.ivLength;
  private readonly encryptedPosition = this.tagPosition + this.tagLength;
  private readonly encryptionKey: Buffer;

  constructor() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error("ENCRYPTION_KEY environment variable is not set");
    }

    // Derive a 32-byte key using PBKDF2 (same as EncryptionService)
    this.encryptionKey = crypto.pbkdf2Sync(
      key,
      "inventory-multi-tenant-salt",
      100000,
      this.keyLength,
      "sha512",
    );
  }

  decrypt(ciphertext: string): string {
    if (!ciphertext) {
      return ciphertext;
    }

    try {
      const combined = Buffer.from(ciphertext, "base64");
      const iv = combined.slice(this.saltLength, this.tagPosition);
      const tag = combined.slice(this.tagPosition, this.encryptedPosition);
      const encrypted = combined.slice(this.encryptedPosition);

      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, null, "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error: any) {
      // Fallback: treat as plaintext (for backward compatibility)
      console.warn(
        `   ⚠️  Decryption failed ("${error.message}"), treating database_url as plaintext`,
      );
      return ciphertext;
    }
  }
}

// Default role permissions
// ADMIN gets all permissions; other roles get curated subsets
const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: getAllPermissionNames(),
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

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

async function migrateTenantDatabase(tenant: {
  id: string;
  name: string;
  database_url: string;
  email?: string;
  short_tenant_id?: string;
}): Promise<{ tenantId: string; tenantName: string; success: boolean; error?: string }> {
  const encryption = new SimpleEncryption();

  console.log(`\n📊 Migrating tenant: ${tenant.name} (${tenant.id})`);
  if (tenant.email || tenant.short_tenant_id) {
    console.log(`   Info: email=${tenant.email || "N/A"}, code=${tenant.short_tenant_id || "N/A"}`);
  }

  if (!tenant.database_url || tenant.database_url.trim() === "") {
    const msg = "Tenant database_url is empty, skipping";
    console.error(`   ❌ ${msg}`);
    return { tenantId: tenant.id, tenantName: tenant.name, success: false, error: msg };
  }

  // Decrypt database URL
  const decryptedUrl = encryption.decrypt(tenant.database_url);
  if (!decryptedUrl || decryptedUrl.trim() === "") {
    const msg = "Decrypted database URL is empty, skipping";
    console.error(`   ❌ ${msg}`);
    return { tenantId: tenant.id, tenantName: tenant.name, success: false, error: msg };
  }

  // Log database connection info (without password) for debugging
  try {
    const urlObj = new URL(decryptedUrl);
    console.log(
      `   📊 Database: ${urlObj.hostname}:${urlObj.port || 5432}/${urlObj.pathname.slice(1)}`,
    );
  } catch (e) {
    console.log(`   ⚠️  Could not parse database URL format`);
  }

  console.log(`   ✅ Obtained tenant database URL`);

  // Override DATABASE_URL only while creating PrismaClient
  const originalDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = decryptedUrl;
  const tenantClient = new PrismaClient({
    datasources: { db: { url: decryptedUrl } },
  });
  if (originalDatabaseUrl) {
    process.env.DATABASE_URL = originalDatabaseUrl;
  } else {
    delete process.env.DATABASE_URL;
  }

  try {
    console.log(`   🔌 Attempting to connect to tenant database...`);
    await tenantClient.$connect();
    console.log("   ✅ Connected to tenant database");

    // === 1. Ensure UserStatus enum exists ===
    console.log('   🔧 Ensuring "UserStatus" enum exists...');
    await tenantClient.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserStatus') THEN
          CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');
        END IF;
      END;
      $$;
    `);

    // === 2. Ensure user columns exist ===
    console.log("   🔧 Ensuring user columns exist...");
    await tenantClient.$executeRawUnsafe(`
      DO $$
      BEGIN
        -- status
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'status'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "status" "UserStatus" DEFAULT 'ACTIVE';
        END IF;

        -- phone
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'phone'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "phone" TEXT;
        END IF;

        -- avatar
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'avatar'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "avatar" TEXT;
        END IF;

        -- last_login_at
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'last_login_at'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "last_login_at" TIMESTAMP(3);
        END IF;

        -- last_activity_at
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'last_activity_at'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "last_activity_at" TIMESTAMP(3);
        END IF;

        -- email_verified
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'email_verified'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "email_verified" BOOLEAN DEFAULT true;
        END IF;

        -- created_by
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'created_by'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "created_by" TEXT;
        END IF;
      END;
      $$;
    `);

    // === 3. Ensure UserRole enum has all roles ===
    console.log('   🔧 Ensuring "UserRole" enum has all roles...');
    await tenantClient.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
          -- If UserRole doesn't exist at all, create with all values
          CREATE TYPE "UserRole" AS ENUM (
            'ADMIN', 'STAFF', 'MANAGER', 'SALES_PERSON', 'CASHIER',
            'WAREHOUSE_STAFF', 'ACCOUNTANT', 'VIEWER'
          );
        ELSE
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
        END IF;
      END;
      $$;
    `);

    // === 4. Create permissions table ===
    console.log('   🔧 Creating/ensuring "permissions" table...');
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
    `);
    await tenantClient.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "permissions_name_key" ON "permissions"("name");`,
    );
    await tenantClient.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "permissions_module_idx" ON "permissions"("module");`,
    );
    await tenantClient.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "permissions_name_idx" ON "permissions"("name");`,
    );

    // === 5. Create role_permissions table ===
    console.log('   🔧 Creating/ensuring "role_permissions" table...');
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "role_permissions" (
        "id" TEXT NOT NULL,
        "role" "UserRole" NOT NULL,
        "permission_id" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
      );
    `);
    await tenantClient.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "role_permissions_role_permission_id_key" 
      ON "role_permissions"("role", "permission_id");
    `);
    await tenantClient.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "role_permissions_role_idx" ON "role_permissions"("role");`,
    );
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
          ON DELETE CASCADE;
        END IF;
      END;
      $$;
    `);

    // === 6. Create user_permissions table ===
    console.log('   🔧 Creating/ensuring "user_permissions" table...');
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "user_permissions" (
        "id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "permission_id" TEXT NOT NULL,
        "granted_by" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
      );
    `);
    await tenantClient.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "user_permissions_user_id_permission_id_key" 
      ON "user_permissions"("user_id", "permission_id");
    `);
    await tenantClient.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "user_permissions_user_id_idx" ON "user_permissions"("user_id");`,
    );
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
          ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'user_permissions_permission_id_fkey'
        ) THEN
          ALTER TABLE "user_permissions" 
          ADD CONSTRAINT "user_permissions_permission_id_fkey" 
          FOREIGN KEY ("permission_id") 
          REFERENCES "permissions"("id") 
          ON DELETE CASCADE;
        END IF;
      END;
      $$;
    `);

    // === 7. Ensure foreign key for users.created_by ===
    console.log("   🔧 Ensuring foreign key for users.created_by...");
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

    // === 8. Create custom_roles and custom_role_permissions tables ===
    console.log('   🔧 Creating/ensuring "custom_roles" and "custom_role_permissions" tables...');

    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "custom_roles" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_by" TEXT,
        CONSTRAINT "custom_roles_pkey" PRIMARY KEY ("id")
      );
    `);
    await tenantClient.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "custom_roles_name_key" ON "custom_roles"("name");`,
    );
    await tenantClient.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "custom_roles_is_active_idx" ON "custom_roles"("is_active");`,
    );
    await tenantClient.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'custom_roles_created_by_fkey'
        ) THEN
          ALTER TABLE "custom_roles" 
          ADD CONSTRAINT "custom_roles_created_by_fkey" 
          FOREIGN KEY ("created_by") 
          REFERENCES "users"("id") 
          ON DELETE SET NULL 
          ON UPDATE CASCADE;
        END IF;
      END;
      $$;
    `);

    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "custom_role_permissions" (
        "id" TEXT NOT NULL,
        "custom_role_id" TEXT NOT NULL,
        "permission_id" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "custom_role_permissions_pkey" PRIMARY KEY ("id")
      );
    `);
    await tenantClient.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "custom_role_permissions_unique" 
      ON "custom_role_permissions"("custom_role_id", "permission_id");
    `);
    await tenantClient.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "custom_role_permissions_custom_role_id_idx" ON "custom_role_permissions"("custom_role_id");`,
    );
    await tenantClient.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'custom_role_permissions_custom_role_id_fkey'
        ) THEN
          ALTER TABLE "custom_role_permissions" 
          ADD CONSTRAINT "custom_role_permissions_custom_role_id_fkey" 
          FOREIGN KEY ("custom_role_id") 
          REFERENCES "custom_roles"("id") 
          ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'custom_role_permissions_permission_id_fkey'
        ) THEN
          ALTER TABLE "custom_role_permissions" 
          ADD CONSTRAINT "custom_role_permissions_permission_id_fkey" 
          FOREIGN KEY ("permission_id") 
          REFERENCES "permissions"("id") 
          ON DELETE CASCADE;
        END IF;
      END;
      $$;
    `);

    // === 9. Seed / update permissions ===
    console.log("   🌱 Seeding permissions...");
    let createdCount = 0;
    let updatedCount = 0;

    for (const [key, permission] of Object.entries(PERMISSIONS)) {
      const permissionId = uuidv4();
      const name = escapeSql(key);
      const description = permission.description
        ? `'${escapeSql(permission.description)}'`
        : "NULL";
      const module = escapeSql(permission.module);
      const action = escapeSql(permission.action);

      const existing = await tenantClient.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM "permissions" WHERE "name" = '${name}' LIMIT 1;
      `);

      if (existing.length === 0) {
        await tenantClient.$executeRawUnsafe(`
          INSERT INTO "permissions" ("id", "name", "description", "module", "action", "created_at")
          VALUES ('${permissionId}', '${name}', ${description}, '${module}', '${action}', CURRENT_TIMESTAMP);
        `);
        createdCount++;
      } else {
        await tenantClient.$executeRawUnsafe(`
          UPDATE "permissions"
          SET "description" = ${description},
              "module" = '${module}',
              "action" = '${action}'
          WHERE "name" = '${name}';
        `);
        updatedCount++;
      }
    }

    console.log(`   ✅ Permissions seeded: ${createdCount} created, ${updatedCount} updated`);

    // === 10. Assign default role permissions ===
    console.log("   🔐 Assigning default role permissions...");
    let totalAssigned = 0;

    for (const [role, permissionNames] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      let roleAssigned = 0;

      // Ensure role exists in UserRole enum
      const roleCheck = await tenantClient.$queryRawUnsafe<Array<{ exists: boolean }>>(`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = '${role}' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
        ) as exists;
      `);
      if (!roleCheck[0]?.exists) {
        console.log(
          `   ⚠️  Role '${role}' does not exist in UserRole enum for this tenant, skipping...`,
        );
        continue;
      }

      for (const permissionName of permissionNames) {
        const permResult = await tenantClient.$queryRawUnsafe<Array<{ id: string }>>(`
          SELECT id FROM "permissions" WHERE "name" = '${escapeSql(permissionName)}' LIMIT 1;
        `);
        if (permResult.length === 0) {
          continue;
        }
        const permissionId = permResult[0].id;

        const existing = await tenantClient.$queryRawUnsafe<Array<{ id: string }>>(`
          SELECT id FROM "role_permissions" 
          WHERE "role" = '${role}'::"UserRole" AND "permission_id" = '${permissionId}'
          LIMIT 1;
        `);

        if (existing.length === 0) {
          const rolePermId = uuidv4();
          await tenantClient.$executeRawUnsafe(`
            INSERT INTO "role_permissions" ("id", "role", "permission_id", "created_at")
            VALUES ('${rolePermId}', '${role}'::"UserRole", '${permissionId}', CURRENT_TIMESTAMP);
          `);
          roleAssigned++;
        }
      }

      if (roleAssigned > 0) {
        console.log(`   ✅ Assigned ${roleAssigned} permissions to role: ${role}`);
      }
      totalAssigned += roleAssigned;
    }

    console.log(`   ✅ Total role permissions assigned: ${totalAssigned}`);

    // === 11. Ensure ADMIN has all permissions ===
    console.log("   🔐 Ensuring ADMIN has all permissions...");
    const allPerms = await tenantClient.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "permissions";
    `);

    let adminAdditional = 0;
    for (const perm of allPerms) {
      const existing = await tenantClient.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM "role_permissions"
        WHERE "role" = 'ADMIN'::"UserRole" AND "permission_id" = '${perm.id}'
        LIMIT 1;
      `);
      if (existing.length === 0) {
        const rolePermId = uuidv4();
        await tenantClient.$executeRawUnsafe(`
          INSERT INTO "role_permissions" ("id", "role", "permission_id", "created_at")
          VALUES ('${rolePermId}', 'ADMIN'::"UserRole", '${perm.id}', CURRENT_TIMESTAMP);
        `);
        adminAdditional++;
      }
    }

    if (adminAdditional > 0) {
      console.log(
        `   ✅ Assigned ${adminAdditional} additional permissions to ADMIN for this tenant`,
      );
    } else {
      console.log("   ✅ ADMIN already has all permissions");
    }

    // === 12. Backfill user status and email_verified ===
    console.log("   🔧 Backfilling users.status and users.email_verified...");
    await tenantClient.$executeRawUnsafe(`
      UPDATE "users"
      SET "status" = 'ACTIVE'
      WHERE "status" IS NULL;
    `);
    await tenantClient.$executeRawUnsafe(`
      UPDATE "users"
      SET "email_verified" = true
      WHERE "email_verified" IS NULL;
    `);

    console.log(`   ✅ User fields backfilled`);

    // === 13. Final verification of RBAC tables ===
    const tables = await tenantClient.$queryRawUnsafe<Array<{ table_name: string }>>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN (
          'permissions',
          'role_permissions',
          'user_permissions',
          'custom_roles',
          'custom_role_permissions'
        )
      ORDER BY table_name;
    `);
    console.log(`   ✅ Found RBAC tables: ${tables.map((t) => t.table_name).join(", ") || "none"}`);

    return { tenantId: tenant.id, tenantName: tenant.name, success: true };
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`   ❌ Migration failed for tenant ${tenant.name}: ${errorMessage}`);

    // Provide more detailed diagnostics for connection errors
    if (
      errorMessage.includes("Can't reach database server") ||
      errorMessage.includes("connect") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("timeout")
    ) {
      try {
        const urlObj = new URL(decryptedUrl);
        console.error(`   🔍 Connection Diagnostics:`);
        console.error(`      - Host: ${urlObj.hostname}`);
        console.error(`      - Port: ${urlObj.port || 5432}`);
        console.error(`      - Database: ${urlObj.pathname.slice(1)}`);
        console.error(`      - Possible causes:`);
        console.error(`        1. Database server is down or unreachable`);
        console.error(`        2. Network connectivity issues`);
        console.error(`        3. Database URL in master DB might be stale/incorrect`);
        console.error(`        4. Firewall blocking connection`);
      } catch (e) {
        console.error(`   🔍 Could not parse database URL for diagnostics`);
      }
    }

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      success: false,
      error: errorMessage,
    };
  } finally {
    try {
      await tenantClient.$disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
  }
}

async function main() {
  console.log("🔧 Global RBAC & User Schema Migration (All Tenants)");
  console.log("====================================================\n");

  if (!process.env.MASTER_DATABASE_URL) {
    console.error("❌ MASTER_DATABASE_URL is not set in environment");
    console.error("   Please set MASTER_DATABASE_URL in your .env file");
    process.exit(1);
  }

  // Verify MASTER_DATABASE_URL format
  const masterDbUrl = process.env.MASTER_DATABASE_URL;
  if (!masterDbUrl.startsWith("postgresql://") && !masterDbUrl.startsWith("postgres://")) {
    console.error("❌ MASTER_DATABASE_URL must start with postgresql:// or postgres://");
    process.exit(1);
  }

  // Log connection info (without password)
  const urlObj = new URL(masterDbUrl);
  console.log(
    `📊 Master Database: ${urlObj.hostname}:${urlObj.port || 5432}/${urlObj.pathname.slice(1)}\n`,
  );

  // Temporarily override DATABASE_URL for MasterPrismaClient initialization
  const originalDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = masterDbUrl;

  const masterPrisma = new MasterPrismaClient({
    datasources: {
      db: {
        url: masterDbUrl,
      },
    },
  });

  // Restore original DATABASE_URL after creating client
  if (originalDatabaseUrl) {
    process.env.DATABASE_URL = originalDatabaseUrl;
  } else {
    delete process.env.DATABASE_URL;
  }

  try {
    console.log("🔌 Connecting to master database...");
    await masterPrisma.$connect();
    console.log("✅ Connected to master database\n");

    const tenants = await masterPrisma.$queryRawUnsafe<
      Array<{
        id: string;
        name: string;
        database_url: string;
        is_active: boolean;
        email?: string;
        short_tenant_id?: string;
      }>
    >(`
      SELECT t.id,
             t.name,
             t.database_url,
             t.is_active,
             t.email,
             t.short_tenant_id
      FROM tenants t
      WHERE t.is_active = true
        AND t.database_url IS NOT NULL
        AND TRIM(t.database_url) <> ''
    `);

    if (!tenants || tenants.length === 0) {
      console.log("⚠️  No active tenants with database_url found. Nothing to migrate.");
      return;
    }

    console.log(`\nFound ${tenants.length} active tenant(s) to migrate.\n`);

    const results = [];
    for (const tenant of tenants) {
      const result = await migrateTenantDatabase(tenant);
      results.push(result);
    }

    console.log("\n====================================================");
    console.log("Migration summary:");
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    for (const r of results) {
      if (r.success) {
        console.log(`  ✅ ${r.tenantName} (${r.tenantId})`);
      } else {
        console.log(`  ❌ ${r.tenantName} (${r.tenantId}) - ${r.error}`);
      }
    }

    console.log("----------------------------------------------------");
    console.log(`Total tenants:   ${results.length}`);
    console.log(`Succeeded:       ${successCount}`);
    console.log(`Failed:          ${failureCount}`);
    console.log("====================================================");
    console.log("💡 After this, RESTART your backend server.");
    console.log("   This ensures Prisma clients pick up the new schema.\n");

    if (failureCount > 0) {
      process.exitCode = 1;
    }
  } catch (error: any) {
    console.error("\n❌ Global migration failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await masterPrisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Fatal error in migration script:", error);
  process.exit(1);
});

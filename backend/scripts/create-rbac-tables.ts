import { PrismaClient } from "@prisma/tenant-client";
import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";
import * as crypto from "crypto";
import {
  PERMISSIONS,
  getAllPermissionNames,
} from "../src/users/permissions/permission.definitions";
import { v4 as uuidv4 } from "uuid";

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
    if (!key) throw new Error("ENCRYPTION_KEY not set");
    this.encryptionKey = crypto.pbkdf2Sync(
      key,
      "inventory-multi-tenant-salt",
      100000,
      this.keyLength,
      "sha512",
    );
  }

  decrypt(ciphertext: string): string {
    if (!ciphertext) return ciphertext;
    try {
      const combined = Buffer.from(ciphertext, "base64");
      const salt = combined.slice(0, this.saltLength);
      const iv = combined.slice(this.saltLength, this.tagPosition);
      const tag = combined.slice(this.tagPosition, this.encryptedPosition);
      const encrypted = combined.slice(this.encryptedPosition);
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(encrypted, null, "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error: any) {
      return ciphertext;
    }
  }
}

// Default role permissions (same as in migrate-single-tenant-rbac.ts)
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

async function createRBACTables() {
  const masterPrisma = new MasterPrismaClient();
  const encryption = new SimpleEncryption();

  try {
    console.log("🔧 Creating RBAC Tables");
    console.log("==========================================\n");

    const tenant = await masterPrisma.$queryRawUnsafe<
      Array<{
        id: string;
        name: string;
        database_url: string;
      }>
    >(`
      SELECT t.id, t.name, t.database_url
      FROM tenants t
      WHERE (t.email = 'admin@malindtech.com' OR t.short_tenant_id = '1130')
        AND t.is_active = true
      LIMIT 1;
    `);

    if (!tenant || tenant.length === 0) {
      console.error("❌ Tenant not found");
      process.exit(1);
    }

    const targetTenant = tenant[0];
    console.log(`✅ Found tenant: ${targetTenant.name}\n`);

    const databaseUrl = encryption.decrypt(targetTenant.database_url);
    const originalDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = databaseUrl;
    const tenantClient = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }

    try {
      await tenantClient.$connect();
      console.log("✅ Connected to tenant database\n");

      // Step 0: Update UserRole enum to include new roles
      console.log("🔧 Step 0: Updating UserRole enum...");
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
      console.log("   ✅ UserRole enum updated\n");

      // Step 1: Create Permission table
      console.log("🔧 Step 1: Creating Permission table...");
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
      await tenantClient.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "permissions_name_key" ON "permissions"("name");
      `);
      await tenantClient.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "permissions_module_idx" ON "permissions"("module");
      `);
      await tenantClient.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "permissions_name_idx" ON "permissions"("name");
      `);
      console.log("   ✅ Permission table created\n");

      // Step 2: Create RolePermission table
      console.log("🔧 Step 2: Creating RolePermission table...");
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
      await tenantClient.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "role_permissions_role_idx" ON "role_permissions"("role");
      `);
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
      console.log("   ✅ RolePermission table created\n");

      // Step 3: Create UserPermission table
      console.log("🔧 Step 3: Creating UserPermission table...");
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
      await tenantClient.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "user_permissions_user_id_idx" ON "user_permissions"("user_id");
      `);
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
        END;
        $$;
      `);
      await tenantClient.$executeRawUnsafe(`
        DO $$
        BEGIN
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
      console.log("   ✅ UserPermission table created\n");

      // Step 4: Seed permissions
      console.log("🔧 Step 4: Seeding permissions...");
      let permissionsCreated = 0;
      let permissionsUpdated = 0;

      for (const [key, permission] of Object.entries(PERMISSIONS)) {
        const permissionId = uuidv4();
        const name = escapeSql(key); // The key IS the permission name
        const description = permission.description ? escapeSql(permission.description) : null;
        const module = escapeSql(permission.module);
        const action = escapeSql(permission.action);

        const checkResult = await tenantClient.$queryRawUnsafe<Array<{ id: string }>>(`
          SELECT id FROM "permissions" WHERE "name" = '${name}' LIMIT 1;
        `);

        if (checkResult.length === 0) {
          await tenantClient.$executeRawUnsafe(`
            INSERT INTO "permissions" ("id", "name", "description", "module", "action", "created_at")
            VALUES ('${permissionId}', '${name}', ${description ? `'${description}'` : "NULL"}, '${module}', '${action}', CURRENT_TIMESTAMP);
          `);
          permissionsCreated++;
        } else {
          await tenantClient.$executeRawUnsafe(`
            UPDATE "permissions" 
            SET "description" = ${description ? `'${description}'` : "NULL"}, 
                "module" = '${module}', 
                "action" = '${action}'
            WHERE "name" = '${name}';
          `);
          permissionsUpdated++;
        }
      }
      console.log(
        `   ✅ Permissions seeded: ${permissionsCreated} created, ${permissionsUpdated} updated\n`,
      );

      // Step 5: Assign default role permissions
      console.log("🔧 Step 5: Assigning default role permissions...");
      let totalAssigned = 0;

      for (const [role, permissionNames] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
        let roleAssigned = 0;

        // First verify the role exists in the enum
        const roleCheck = await tenantClient.$queryRawUnsafe<Array<{ exists: boolean }>>(`
          SELECT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = '${role}' 
              AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
          ) as exists;
        `);

        if (!roleCheck[0]?.exists) {
          console.log(`   ⚠️  Role '${role}' does not exist in UserRole enum, skipping...`);
          continue;
        }

        for (const permissionName of permissionNames) {
          // Get permission ID
          const permResult = await tenantClient.$queryRawUnsafe<Array<{ id: string }>>(`
            SELECT id FROM "permissions" WHERE "name" = '${escapeSql(permissionName)}' LIMIT 1;
          `);

          if (permResult.length > 0) {
            const permissionId = permResult[0].id;

            // Check if already exists
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
        }

        if (roleAssigned > 0) {
          console.log(`   ✅ Assigned ${roleAssigned} permissions to role: ${role}`);
        }
        totalAssigned += roleAssigned;
      }
      console.log(`   ✅ Total role permissions assigned: ${totalAssigned}\n`);

      // Step 6: Ensure ADMIN has all permissions
      console.log("🔧 Step 6: Ensuring ADMIN has all permissions...");
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
        console.log(`   ✅ Assigned ${adminAdditional} additional permissions to ADMIN\n`);
      } else {
        console.log(`   ✅ ADMIN already has all permissions\n`);
      }

      // Step 7: Verify tables exist
      console.log("🔧 Step 7: Verifying tables exist...");
      const tables = await tenantClient.$queryRawUnsafe<Array<{ table_name: string }>>(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('permissions', 'role_permissions', 'user_permissions')
        ORDER BY table_name;
      `);

      console.log("   ✅ Found tables:");
      tables.forEach((table) => {
        console.log(`      - ${table.table_name}`);
      });

      if (tables.length < 3) {
        console.error(`\n   ⚠️  Warning: Expected 3 tables, found ${tables.length}`);
      } else {
        console.log(`\n   ✅ All 3 RBAC tables exist!\n`);
      }

      // Step 8: Test Prisma query
      console.log("🔧 Step 8: Testing Prisma query...");
      try {
        const rolePerms = await tenantClient.rolePermission.findMany({
          where: { role: "ADMIN" },
          take: 5,
        });
        console.log(
          `   ✅ Prisma query successful! Found ${rolePerms.length} ADMIN permissions (showing first 5)`,
        );
      } catch (error: any) {
        console.error(`   ❌ Prisma query failed: ${error.message}`);
        throw error;
      }

      console.log("\n✅ All RBAC tables created and seeded successfully!");
    } finally {
      await tenantClient.$disconnect();
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await masterPrisma.$disconnect();
  }
}

createRBACTables()
  .then(() => {
    console.log("\n==========================================");
    console.log("✅ Script completed successfully!");
    console.log("==========================================\n");
    console.log("💡 Now RESTART your backend server to use the RBAC tables.\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });

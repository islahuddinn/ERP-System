import { PrismaClient } from "@prisma/tenant-client";
import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";
import * as crypto from "crypto";

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

async function createCustomRoleTables() {
  const masterPrisma = new MasterPrismaClient();
  const encryption = new SimpleEncryption();

  try {
    console.log("🔧 Creating Custom Role Tables");
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

      // Step 1: Create CustomRole table
      console.log("🔧 Step 1: Creating CustomRole table...");
      await tenantClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "custom_roles" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "is_active" BOOLEAN NOT NULL DEFAULT true,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL,
          "created_by" TEXT,
          CONSTRAINT "custom_roles_pkey" PRIMARY KEY ("id")
        );
      `);
      await tenantClient.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "custom_roles_name_key" ON "custom_roles"("name");
      `);
      await tenantClient.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "custom_roles_name_idx" ON "custom_roles"("name");
      `);
      await tenantClient.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "custom_roles_is_active_idx" ON "custom_roles"("is_active");
      `);
      console.log("   ✅ CustomRole table created\n");

      // Step 2: Create CustomRolePermission table
      console.log("🔧 Step 2: Creating CustomRolePermission table...");
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
        CREATE UNIQUE INDEX IF NOT EXISTS "custom_role_permissions_custom_role_id_permission_id_key" 
        ON "custom_role_permissions"("custom_role_id", "permission_id");
      `);
      await tenantClient.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "custom_role_permissions_custom_role_id_idx" 
        ON "custom_role_permissions"("custom_role_id");
      `);
      console.log("   ✅ CustomRolePermission table created\n");

      // Step 3: Add foreign key constraints
      console.log("🔧 Step 3: Adding foreign key constraints...");
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
            ON DELETE SET NULL;
          END IF;
        END;
        $$;
      `);
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
        END;
        $$;
      `);
      await tenantClient.$executeRawUnsafe(`
        DO $$
        BEGIN
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
      console.log("   ✅ Foreign key constraints added\n");

      // Step 4: Verify tables exist
      console.log("🔧 Step 4: Verifying tables exist...");
      const tables = await tenantClient.$queryRawUnsafe<Array<{ table_name: string }>>(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('custom_roles', 'custom_role_permissions')
        ORDER BY table_name;
      `);

      console.log("   ✅ Found tables:");
      tables.forEach((table) => {
        console.log(`      - ${table.table_name}`);
      });

      if (tables.length < 2) {
        console.error(`\n   ⚠️  Warning: Expected 2 tables, found ${tables.length}`);
      } else {
        console.log(`\n   ✅ All 2 custom role tables exist!\n`);
      }

      // Step 5: Test Prisma query
      console.log("🔧 Step 5: Testing Prisma query...");
      try {
        const customRoles = await tenantClient.customRole.findMany({
          take: 5,
        });
        console.log(`   ✅ Prisma query successful! Found ${customRoles.length} custom roles`);
      } catch (error: any) {
        console.error(`   ❌ Prisma query failed: ${error.message}`);
        throw error;
      }

      console.log("\n✅ All custom role tables created successfully!");
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

createCustomRoleTables()
  .then(() => {
    console.log("\n==========================================");
    console.log("✅ Script completed successfully!");
    console.log("==========================================\n");
    console.log("💡 Now RESTART your backend server to use the custom role tables.\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });

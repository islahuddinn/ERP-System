import { PrismaClient } from "@prisma/tenant-client";
import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";
import * as crypto from "crypto";

class SimpleEncryption {
  private readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
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
      "inventory-multi-tenant-salt", // Salt for key derivation
      100000, // Iterations
      this.keyLength,
      "sha512",
    );
  }

  decrypt(ciphertext: string): string {
    if (!ciphertext) {
      return ciphertext;
    }

    try {
      // Decode base64
      const combined = Buffer.from(ciphertext, "base64");

      // Extract components
      const salt = combined.slice(0, this.saltLength);
      const iv = combined.slice(this.saltLength, this.tagPosition);
      const tag = combined.slice(this.tagPosition, this.encryptedPosition);
      const encrypted = combined.slice(this.encryptedPosition);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(tag);

      // Decrypt
      let decrypted = decipher.update(encrypted, null, "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error: any) {
      // If decryption fails, assume it might be plaintext (for backward compatibility)
      console.warn(`Decryption failed: ${error.message}, returning as-is (might be plaintext)`);
      return ciphertext;
    }
  }
}

async function fixTenantUsersTable() {
  // Verify ENCRYPTION_KEY is set
  if (!process.env.ENCRYPTION_KEY) {
    console.error("❌ ENCRYPTION_KEY environment variable is not set");
    console.error("   Please set it in your .env file");
    process.exit(1);
  }

  const masterPrisma = new MasterPrismaClient();
  const encryption = new SimpleEncryption();

  try {
    console.log("🔧 Fix Tenant Users Table Script");
    console.log("==========================================\n");

    // Find the target tenant using raw SQL (same as migration script)
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
      console.error("❌ Tenant is not active. Cannot proceed.");
      process.exit(1);
    }

    // Decrypt database URL
    if (!targetTenant.database_url || targetTenant.database_url.trim() === "") {
      console.error("❌ Tenant database_url field is empty or null");
      console.error(`   Database URL field value: ${targetTenant.database_url}`);
      process.exit(1);
    }

    console.log(
      `   🔐 Decrypting database URL (encrypted length: ${targetTenant.database_url.length})...`,
    );

    let databaseUrl: string;
    try {
      databaseUrl = encryption.decrypt(targetTenant.database_url);
    } catch (error: any) {
      console.error("❌ Failed to decrypt database URL");
      console.error(`   Error: ${error.message}`);
      console.error(
        `   Encrypted value (first 50 chars): ${targetTenant.database_url.substring(0, 50)}...`,
      );
      process.exit(1);
    }

    if (!databaseUrl || databaseUrl.trim() === "") {
      console.error("❌ Decrypted database URL is empty");
      console.error(`   Encrypted value length: ${targetTenant.database_url.length}`);
      process.exit(1);
    }

    console.log(`   ✅ Database URL decrypted successfully (length: ${databaseUrl.length})`);

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
      console.log("✅ Connected to tenant database\n");

      // Step 1: Ensure UserStatus enum exists
      console.log("🔧 Checking UserStatus enum...");
      await tenantClient.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserStatus') THEN
            CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');
            RAISE NOTICE 'UserStatus enum created';
          ELSE
            RAISE NOTICE 'UserStatus enum already exists';
          END IF;
        END;
        $$;
      `);
      console.log("   ✅ UserStatus enum verified\n");

      // Step 2: Check and add status column
      console.log("🔧 Checking status column...");
      const statusColumnCheck = await tenantClient.$queryRawUnsafe<Array<{ exists: boolean }>>(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'status'
        ) as exists;
      `);

      if (!statusColumnCheck[0]?.exists) {
        console.log("   ⚠️  status column missing, adding...");
        await tenantClient.$executeRawUnsafe(`
          ALTER TABLE "users" ADD COLUMN "status" "UserStatus" DEFAULT 'ACTIVE';
        `);
        console.log("   ✅ status column added");
      } else {
        console.log("   ✅ status column already exists");
      }

      // Step 3: Update existing users to have ACTIVE status if null
      console.log("\n🔧 Updating existing users...");
      const updateResult = await tenantClient.$executeRawUnsafe(`
        UPDATE "users" 
        SET "status" = 'ACTIVE' 
        WHERE "status" IS NULL;
      `);
      console.log(`   ✅ Updated users with null status`);

      // Step 4: Verify the column exists
      console.log("\n🔧 Verifying column...");
      const verifyResult = await tenantClient.$queryRawUnsafe<
        Array<{ column_name: string; data_type: string }>
      >(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'status';
      `);

      if (verifyResult.length > 0) {
        console.log(
          `   ✅ Column verified: ${verifyResult[0].column_name} (${verifyResult[0].data_type})`,
        );
      } else {
        console.error("   ❌ Column still not found after fix attempt");
      }

      // Step 5: Test query
      console.log("\n🔧 Testing user query...");
      const testUser = await tenantClient.$queryRawUnsafe<
        Array<{ id: string; email: string; status: string }>
      >(`
        SELECT id, email, status::text as status 
        FROM "users" 
        LIMIT 1;
      `);

      if (testUser.length > 0) {
        console.log(
          `   ✅ Test query successful: ${testUser[0].email} (status: ${testUser[0].status})`,
        );
      } else {
        console.log("   ⚠️  No users found in database");
      }

      console.log("\n✅ Fix completed successfully!");
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

fixTenantUsersTable()
  .then(() => {
    console.log("\n==========================================");
    console.log("✅ Script completed successfully!");
    console.log("==========================================\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });

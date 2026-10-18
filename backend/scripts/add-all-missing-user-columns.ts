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

async function addAllMissingColumns() {
  const masterPrisma = new MasterPrismaClient();
  const encryption = new SimpleEncryption();

  try {
    console.log("🔧 Adding All Missing User Columns");
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

      // Step 1: Ensure UserStatus enum exists
      console.log("🔧 Step 1: Ensuring UserStatus enum exists...");
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

      // Step 2: Add all missing columns in one transaction
      console.log("🔧 Step 2: Adding all missing columns...");
      await tenantClient.$executeRawUnsafe(`
        DO $$
        BEGIN
          -- Add status column
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'users' 
              AND column_name = 'status'
          ) THEN
            ALTER TABLE "users" ADD COLUMN "status" "UserStatus" DEFAULT 'ACTIVE';
            RAISE NOTICE 'status column added';
          END IF;

          -- Add phone column
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'users' 
              AND column_name = 'phone'
          ) THEN
            ALTER TABLE "users" ADD COLUMN "phone" TEXT;
            RAISE NOTICE 'phone column added';
          END IF;

          -- Add avatar column
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'users' 
              AND column_name = 'avatar'
          ) THEN
            ALTER TABLE "users" ADD COLUMN "avatar" TEXT;
            RAISE NOTICE 'avatar column added';
          END IF;

          -- Add last_login_at column
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'users' 
              AND column_name = 'last_login_at'
          ) THEN
            ALTER TABLE "users" ADD COLUMN "last_login_at" TIMESTAMP(3);
            RAISE NOTICE 'last_login_at column added';
          END IF;

          -- Add last_activity_at column
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'users' 
              AND column_name = 'last_activity_at'
          ) THEN
            ALTER TABLE "users" ADD COLUMN "last_activity_at" TIMESTAMP(3);
            RAISE NOTICE 'last_activity_at column added';
          END IF;

          -- Add email_verified column
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'users' 
              AND column_name = 'email_verified'
          ) THEN
            ALTER TABLE "users" ADD COLUMN "email_verified" BOOLEAN DEFAULT true;
            RAISE NOTICE 'email_verified column added';
          END IF;

          -- Add created_by column
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'users' 
              AND column_name = 'created_by'
          ) THEN
            ALTER TABLE "users" ADD COLUMN "created_by" TEXT;
            RAISE NOTICE 'created_by column added';
          END IF;
        END;
        $$;
      `);
      console.log("   ✅ All columns checked/added\n");

      // Step 3: Update existing users
      console.log("🔧 Step 3: Updating existing users...");
      await tenantClient.$executeRawUnsafe(`
        UPDATE "users" 
        SET 
          "status" = COALESCE("status", 'ACTIVE'),
          "email_verified" = COALESCE("email_verified", true)
        WHERE "status" IS NULL OR "email_verified" IS NULL;
      `);
      console.log("   ✅ Users updated\n");

      // Step 4: Add foreign key for created_by if it doesn't exist
      console.log("🔧 Step 4: Adding foreign key constraint for created_by...");
      await tenantClient.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'users_created_by_fkey'
              AND table_name = 'users'
          ) THEN
            ALTER TABLE "users" 
            ADD CONSTRAINT "users_created_by_fkey" 
            FOREIGN KEY ("created_by") 
            REFERENCES "users"("id") 
            ON DELETE SET NULL;
            RAISE NOTICE 'Foreign key created_by added';
          ELSE
            RAISE NOTICE 'Foreign key created_by already exists';
          END IF;
        END;
        $$;
      `);
      console.log("   ✅ Foreign key verified\n");

      // Step 5: Add indexes if they don't exist
      console.log("🔧 Step 5: Adding indexes...");
      await tenantClient.$executeRawUnsafe(`
        DO $$
        BEGIN
          -- Index for status
          IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'users' 
              AND indexname = 'users_status_idx'
          ) THEN
            CREATE INDEX "users_status_idx" ON "users"("status");
            RAISE NOTICE 'Index users_status_idx created';
          END IF;

          -- Index for created_by
          IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'users' 
              AND indexname = 'users_created_by_idx'
          ) THEN
            CREATE INDEX "users_created_by_idx" ON "users"("created_by");
            RAISE NOTICE 'Index users_created_by_idx created';
          END IF;
        END;
        $$;
      `);
      console.log("   ✅ Indexes verified\n");

      // Step 6: Verify all columns exist
      console.log("🔧 Step 6: Verifying all columns exist...");
      const columns = await tenantClient.$queryRawUnsafe<
        Array<{ column_name: string; data_type: string }>
      >(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name IN ('status', 'phone', 'avatar', 'last_login_at', 'last_activity_at', 'email_verified', 'created_by')
        ORDER BY column_name;
      `);

      console.log("   ✅ Found columns:");
      columns.forEach((col) => {
        console.log(`      - ${col.column_name} (${col.data_type})`);
      });

      if (columns.length < 7) {
        console.error(`\n   ⚠️  Warning: Expected 7 columns, found ${columns.length}`);
      } else {
        console.log(`\n   ✅ All 7 columns exist!\n`);
      }

      // Step 7: Test Prisma query
      console.log("🔧 Step 7: Testing Prisma query...");
      try {
        const user = await tenantClient.user.findFirst({
          select: {
            id: true,
            email: true,
            status: true,
            phone: true,
            avatar: true,
            lastLoginAt: true,
            lastActivityAt: true,
            emailVerified: true,
            createdBy: true,
          },
        });
        if (user) {
          console.log(`   ✅ Prisma query successful!`);
          console.log(`      Email: ${user.email}`);
          console.log(`      Status: ${user.status || "NULL"}`);
          console.log(`      Phone: ${user.phone || "NULL"}`);
          console.log(`      Email Verified: ${user.emailVerified || "NULL"}`);
        } else {
          console.log("   ⚠️  No users found");
        }
      } catch (error: any) {
        console.error(`   ❌ Prisma query failed: ${error.message}`);
        throw error;
      }

      console.log("\n✅ All columns added and verified successfully!");
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

addAllMissingColumns()
  .then(() => {
    console.log("\n==========================================");
    console.log("✅ Script completed successfully!");
    console.log("==========================================\n");
    console.log("💡 Now RESTART your backend server to use the updated schema.\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });

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
    if (!key) {
      throw new Error("ENCRYPTION_KEY environment variable is not set");
    }
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
      console.warn(`Decryption failed: ${error.message}, returning as-is`);
      return ciphertext;
    }
  }
}

async function verifyAndFix() {
  const masterPrisma = new MasterPrismaClient();
  const encryption = new SimpleEncryption();

  try {
    console.log("🔍 Verifying and Fixing Status Column");
    console.log("==========================================\n");

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
      console.error("❌ Tenant not found");
      process.exit(1);
    }

    const targetTenant = tenant[0];
    console.log(`✅ Found tenant: ${targetTenant.name}\n`);

    const databaseUrl = encryption.decrypt(targetTenant.database_url);
    if (!databaseUrl || !databaseUrl.startsWith("postgresql://")) {
      console.error("❌ Invalid database URL");
      process.exit(1);
    }

    const originalDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = databaseUrl;
    const tenantClient = new PrismaClient();
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }

    try {
      await tenantClient.$connect();
      console.log("✅ Connected to tenant database\n");

      // Step 1: Check if UserStatus enum exists
      console.log("🔍 Checking UserStatus enum...");
      const enumCheck = await tenantClient.$queryRawUnsafe<Array<{ exists: boolean }>>(`
        SELECT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'UserStatus'
        ) as exists;
      `);

      if (!enumCheck[0]?.exists) {
        console.log("   ⚠️  UserStatus enum missing, creating...");
        await tenantClient.$executeRawUnsafe(`
          CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');
        `);
        console.log("   ✅ UserStatus enum created");
      } else {
        console.log("   ✅ UserStatus enum exists");
      }

      // Step 2: Check if status column exists using information_schema
      console.log("\n🔍 Checking status column in users table...");
      const columnCheck = await tenantClient.$queryRawUnsafe<
        Array<{ column_name: string; data_type: string }>
      >(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'status';
      `);

      if (columnCheck.length === 0) {
        console.log("   ⚠️  status column MISSING, adding...");
        await tenantClient.$executeRawUnsafe(`
          ALTER TABLE "users" ADD COLUMN "status" "UserStatus" DEFAULT 'ACTIVE';
        `);
        console.log("   ✅ status column added");
      } else {
        console.log(`   ✅ status column exists (type: ${columnCheck[0].data_type})`);
      }

      // Step 3: Update null statuses
      console.log("\n🔍 Updating null statuses...");
      const updateResult = await tenantClient.$executeRawUnsafe(`
        UPDATE "users" 
        SET "status" = 'ACTIVE' 
        WHERE "status" IS NULL;
      `);
      console.log(`   ✅ Updated null statuses`);

      // Step 4: Verify with direct SQL query
      console.log("\n🔍 Verifying with direct SQL query...");
      const testQuery = await tenantClient.$queryRawUnsafe<
        Array<{ id: string; email: string; status: string }>
      >(`
        SELECT id, email, status::text as status 
        FROM "users" 
        LIMIT 3;
      `);

      if (testQuery.length > 0) {
        console.log("   ✅ Direct SQL query successful:");
        testQuery.forEach((user, idx) => {
          console.log(`      ${idx + 1}. ${user.email} - status: ${user.status || "NULL"}`);
        });
      } else {
        console.log("   ⚠️  No users found");
      }

      // Step 5: Test Prisma query
      console.log("\n🔍 Testing Prisma query...");
      try {
        const prismaTest = await tenantClient.user.findFirst({
          select: { id: true, email: true, status: true },
        });
        if (prismaTest) {
          console.log(
            `   ✅ Prisma query successful: ${prismaTest.email} - status: ${prismaTest.status || "NULL"}`,
          );
        } else {
          console.log("   ⚠️  No users found with Prisma");
        }
      } catch (error: any) {
        console.error(`   ❌ Prisma query failed: ${error.message}`);
        console.error(`   This means Prisma client doesn't know about the status column yet.`);
        console.error(`   You need to regenerate Prisma client: npx prisma generate`);
      }

      console.log("\n✅ Verification completed!");
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

verifyAndFix()
  .then(() => {
    console.log("\n==========================================");
    console.log("✅ Script completed!");
    console.log("==========================================\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });

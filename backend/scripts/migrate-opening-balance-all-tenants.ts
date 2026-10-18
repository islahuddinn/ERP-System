/**
 * Opening Balance Migration Script (All Tenants)
 *
 * This script:
 *  - Iterates over ALL active tenants in the master database
 *  - Decrypts each tenant's database_url
 *  - Connects to each tenant database and applies opening balance schema updates:
 *      1. Ensures OpeningBalanceType enum exists
 *      2. Ensures LedgerTransactionType includes OPENING_BALANCE
 *      3. Adds opening balance columns to customers table
 *      4. Adds opening balance columns to suppliers table
 *
 *  - The script is:
 *      - Non-destructive (no data is deleted)
 *      - Idempotent (safe to run multiple times)
 *
 * Usage:
 *   From backend directory:
 *     npx ts-node scripts/migrate-opening-balance-all-tenants.ts
 *
 * After running:
 *   - RESTART the backend server so MultiTenantPrismaService recreates its clients
 */

import { PrismaClient } from "@prisma/tenant-client";
import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";
import * as crypto from "crypto";

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
      const salt = combined.slice(0, this.saltLength);
      const iv = combined.slice(this.saltLength, this.tagPosition);
      const tag = combined.slice(this.tagPosition, this.encryptedPosition);
      const encrypted = combined.slice(this.encryptedPosition);

      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, undefined, "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error: any) {
      // Fallback: treat as plaintext (for backward compatibility)
      console.warn(
        `   ⚠️  Failed to decrypt database_url (${error.message}); treating as plaintext`,
      );
      return ciphertext;
    }
  }
}

async function addColumnIfMissing(
  prisma: PrismaClient,
  tableName: string,
  columnName: string,
  definition: string,
) {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = '${tableName}'
          AND column_name = '${columnName}'
      ) THEN
        ALTER TABLE "${tableName}"
        ADD COLUMN "${columnName}" ${definition};
      END IF;
    END;
    $$;
  `);
}

async function ensureOpeningBalanceEnums(prisma: PrismaClient) {
  console.log("   🔄 Ensuring OpeningBalanceType enum exists");
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'OpeningBalanceType'
      ) THEN
        CREATE TYPE "OpeningBalanceType" AS ENUM ('RECEIVABLE', 'PAYABLE');
      END IF;
    END;
    $$;
  `);

  console.log("   🔄 Ensuring LedgerTransactionType includes OPENING_BALANCE");
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LedgerTransactionType') THEN
        ALTER TYPE "LedgerTransactionType" ADD VALUE IF NOT EXISTS 'OPENING_BALANCE';
      END IF;
    END;
    $$;
  `);
}

async function ensureColumnType(
  prisma: PrismaClient,
  tableName: string,
  columnName: string,
  targetTypeExpression: string,
  targetUdtName: string,
) {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = '${tableName}'
          AND column_name = '${columnName}'
          AND udt_name <> '${targetUdtName}'
      ) THEN
        ALTER TABLE "${tableName}"
        ALTER COLUMN "${columnName}"
        TYPE ${targetTypeExpression}
        USING CASE
          WHEN "${columnName}" IS NULL THEN NULL
          ELSE "${columnName}"::text::${targetTypeExpression}
        END;
      END IF;
    END;
    $$;
  `);
}

async function ensureOpeningBalanceColumns(prisma: PrismaClient) {
  await ensureOpeningBalanceEnums(prisma);

  console.log("   🔄 Ensuring opening balance columns on customers table");
  await addColumnIfMissing(prisma, "customers", "opening_balance_amount", "NUMERIC(12,2)");
  await addColumnIfMissing(prisma, "customers", "opening_balance_type", '"OpeningBalanceType"');
  await addColumnIfMissing(prisma, "customers", "opening_balance_date", "TIMESTAMPTZ");
  await addColumnIfMissing(prisma, "customers", "opening_balance_note", "TEXT");
  await addColumnIfMissing(prisma, "customers", "opening_balance_created_by", "TEXT");
  await ensureColumnType(
    prisma,
    "customers",
    "opening_balance_type",
    '"OpeningBalanceType"',
    "openingbalancetype",
  );

  console.log("   🔄 Ensuring opening balance columns on suppliers table");
  await addColumnIfMissing(prisma, "suppliers", "opening_balance_amount", "NUMERIC(12,2)");
  await addColumnIfMissing(prisma, "suppliers", "opening_balance_type", '"OpeningBalanceType"');
  await addColumnIfMissing(prisma, "suppliers", "opening_balance_date", "TIMESTAMPTZ");
  await addColumnIfMissing(prisma, "suppliers", "opening_balance_note", "TEXT");
  await addColumnIfMissing(prisma, "suppliers", "opening_balance_created_by", "TEXT");
  await ensureColumnType(
    prisma,
    "suppliers",
    "opening_balance_type",
    '"OpeningBalanceType"',
    "openingbalancetype",
  );

  console.log("   ✅ Opening balance columns ensured");
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

    await ensureOpeningBalanceColumns(tenantClient);
    console.log(`   🎉 Opening balance migration complete for ${tenant.name}`);

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
  console.log("🔧 Opening Balance Migration (All Tenants)");
  console.log("==========================================\n");

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

    console.log("\n==========================================");
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

    console.log("------------------------------------------");
    console.log(`Total tenants:   ${results.length}`);
    console.log(`Succeeded:       ${successCount}`);
    console.log(`Failed:          ${failureCount}`);
    console.log("==========================================");
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

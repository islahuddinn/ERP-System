/**
 * Fix script to ensure `stock_transactions.sale_return_id` exists for a specific tenant.
 *
 * Target tenant: admin@malindtech.com (code 1130)
 *
 * Usage:
 *   npx ts-node scripts/fix-tenant-stock-transactions-column.ts
 */

import { PrismaClient } from "@prisma/tenant-client";
import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";
import * as crypto from "crypto";

const TARGET_EMAIL = "admin@malindtech.com";
const TARGET_CODE = "1130";

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
      console.warn(
        `Decryption failed (${error.message}). Returning original value (might be plaintext).`,
      );
      return ciphertext;
    }
  }
}

async function ensureColumnExists(tenantClient: PrismaClient) {
  console.log("   🔧 Ensuring stock_transactions.sale_return_id column exists...");
  await tenantClient.$executeRawUnsafe(`
    ALTER TABLE "stock_transactions"
    ADD COLUMN IF NOT EXISTS "sale_return_id" TEXT;
  `);

  await tenantClient.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "stock_transactions_sale_return_idx"
    ON "stock_transactions"("sale_return_id");
  `);

  await tenantClient.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'stock_transactions_sale_return_id_fkey'
      ) THEN
        ALTER TABLE "stock_transactions"
        ADD CONSTRAINT "stock_transactions_sale_return_id_fkey"
        FOREIGN KEY ("sale_return_id") REFERENCES "sale_returns"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END;
    $$;
  `);

  const columns = await tenantClient.$queryRawUnsafe<Array<{ column_name: string }>>(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stock_transactions'
      AND column_name = 'sale_return_id';
  `);

  if (columns.length === 1) {
    console.log("   ✅ Column confirmed in schema");
  } else {
    console.warn("   ⚠️ Column still not visible in information_schema; please inspect manually.");
  }
}

async function main() {
  console.log("==============================================");
  console.log("🔧 Fix stock_transactions.sale_return_id column");
  console.log("Target tenant: admin@malindtech.com (code 1130)");
  console.log("==============================================\n");

  const masterClient = new MasterPrismaClient({
    datasources: {
      db: {
        url: process.env.MASTER_DATABASE_URL,
      },
    },
  });

  const encryption = new SimpleEncryption();

  try {
    await masterClient.$connect();

    const tenants = await masterClient.$queryRawUnsafe<
      Array<{
        id: string;
        name: string;
        database_url: string;
        email: string | null;
        short_tenant_id: string | null;
        is_active: boolean;
      }>
    >(`
      SELECT id, name, database_url, email, short_tenant_id, is_active
      FROM tenants
      WHERE (email = '${TARGET_EMAIL}' OR short_tenant_id = '${TARGET_CODE}')
      LIMIT 1;
    `);

    if (!tenants || tenants.length === 0) {
      console.error("❌ Tenant not found. Please verify the email/code.");
      process.exit(1);
    }

    const tenant = tenants[0];
    if (!tenant.is_active) {
      console.error("❌ Tenant is inactive. Aborting.");
      process.exit(1);
    }

    console.log(`✅ Target tenant: ${tenant.name} (${tenant.id})`);

    const decryptedUrl = encryption.decrypt(tenant.database_url);

    const originalDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = decryptedUrl;
    const tenantClient = new PrismaClient();
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }

    await tenantClient.$connect();
    console.log("   ✅ Connected to tenant database");

    await ensureColumnExists(tenantClient);

    await tenantClient.$disconnect();
    console.log("\n🎉 Fix completed successfully!");
  } catch (error: any) {
    console.error("❌ Fix failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await masterClient.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

/**
 * Verifies the tenant database URL, disconnects stale Prisma sessions,
 * and confirms sale-return schema columns exist.
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
      throw new Error("ENCRYPTION_KEY not set");
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
      let decrypted = decipher.update(encrypted, undefined, "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error: any) {
      console.warn(`Failed to decrypt database_url (${error.message}); returning original value`);
      return ciphertext;
    }
  }
}

async function main() {
  console.log("==============================================");
  console.log("🔧 Clear Tenant Cache & Verify Schema");
  console.log(`Target tenant: ${TARGET_EMAIL} (code ${TARGET_CODE})`);
  console.log("==============================================\n");

  const masterClient = new MasterPrismaClient();
  const encryption = new SimpleEncryption();

  try {
    const tenants = await masterClient.$queryRawUnsafe<
      Array<{ id: string; name: string; database_url: string; database_name: string | null }>
    >(`
      SELECT id, name, database_url, database_name
      FROM tenants
      WHERE (email = '${TARGET_EMAIL}' OR short_tenant_id = '${TARGET_CODE}')
        AND is_active = true
      LIMIT 1;
    `);

    if (!tenants.length) {
      console.error("❌ Tenant not found or inactive.");
      process.exit(1);
    }

    const tenant = tenants[0];
    console.log(`✅ Found tenant: ${tenant.name} (${tenant.id})`);
    console.log(`   Master DB name entry: ${tenant.database_name ?? "N/A"}`);

    const decryptedUrl = encryption.decrypt(tenant.database_url);
    console.log(
      `🔐 Decrypted DB URL (password hidden): ${decryptedUrl.replace(/:[^:@]+@/, ":****@")}`,
    );

    const dbNameMatch = decryptedUrl.match(/\/([^/?]+)/);
    console.log(`📊 Database from URL: ${dbNameMatch?.[1] ?? "Unknown"}\n`);

    const tenantClient = new PrismaClient({
      datasources: { db: { url: decryptedUrl } },
    });

    await tenantClient.$connect();
    console.log("✅ Connected to tenant database");

    const [{ current_database }] =
      await tenantClient.$queryRawUnsafe<Array<{ current_database: string }>>(
        `SELECT current_database()`,
      );
    console.log(`📍 Current database reported by PostgreSQL: ${current_database}\n`);

    // List active Prisma sessions
    const sessions = await tenantClient.$queryRawUnsafe<
      Array<{ pid: number; application_name: string; state: string; backend_start: Date }>
    >(`
      SELECT pid, application_name, state, backend_start
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND application_name ILIKE 'prisma%'
        AND pid <> pg_backend_pid();
    `);

    if (sessions.length) {
      console.log("🔍 Active Prisma sessions before cleanup:");
      console.table(sessions);

      await tenantClient.$executeRawUnsafe(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND application_name ILIKE 'prisma%'
          AND pid <> pg_backend_pid();
      `);
      console.log("🧹 Terminated other Prisma sessions.");
    } else {
      console.log("✅ No other Prisma sessions detected.");
    }

    await tenantClient.$executeRawUnsafe(`DISCARD ALL;`);
    console.log("🧼 Cleared session state with DISCARD ALL.\n");

    // Verify sale_return_id column
    const columns = await tenantClient.$queryRawUnsafe<Array<{ column_name: string }>>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'stock_transactions'
    `);

    const columnNames = columns.map((c) => c.column_name);
    if (columnNames.includes("sale_return_id")) {
      console.log("✅ Column sale_return_id EXISTS in stock_transactions.\n");
    } else {
      console.warn("❌ Column sale_return_id missing. Adding it now...");
      await tenantClient.$executeRawUnsafe(`
        ALTER TABLE "stock_transactions" ADD COLUMN IF NOT EXISTS "sale_return_id" TEXT;
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
      console.log("   ✅ Column added.");
    }

    console.log("\n📋 Current stock_transactions columns:");
    console.table(columns);

    console.log(
      "\n✅ Verification complete. Restart the backend server now so Prisma reconnects with the fresh schema.",
    );
  } catch (error: any) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  } finally {
    await masterClient.$disconnect();
  }
}

main();

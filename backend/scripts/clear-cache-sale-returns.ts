/**
 * Clears active Prisma sessions for the target tenant, ensures sale-return tables/columns exist,
 * and runs a verification query so the backend can reconnect with a fresh schema.
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

async function ensureSaleReturnSchema(client: PrismaClient) {
  console.log("🔧 Ensuring sale_returns table exists...");
  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "sale_returns" (
      "id" TEXT PRIMARY KEY,
      "return_number" TEXT NOT NULL UNIQUE,
      "original_sale_id" TEXT NOT NULL,
      "location_id" TEXT NOT NULL,
      "return_date" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "tax_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "discount_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "refund_method" TEXT NOT NULL,
      "refund_status" TEXT NOT NULL DEFAULT 'PENDING',
      "refunded_at" TIMESTAMPTZ,
      "reason" TEXT NOT NULL,
      "notes" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "processed_by" TEXT NOT NULL,
      "approved_by" TEXT,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("🔧 Ensuring sale_return_items table exists...");
  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "sale_return_items" (
      "id" TEXT PRIMARY KEY,
      "return_id" TEXT NOT NULL,
      "original_sale_item_id" TEXT NOT NULL,
      "product_id" TEXT,
      "item_type" TEXT NOT NULL,
      "item_name" TEXT NOT NULL,
      "sku" TEXT,
      "quantity_returned" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "original_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "unit_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "line_subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "item_tax_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "item_discount_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "line_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "notes" TEXT,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("🔧 Ensuring stock_transactions.sale_return_id column exists...");
  await client.$executeRawUnsafe(`
    ALTER TABLE "stock_transactions"
    ADD COLUMN IF NOT EXISTS "sale_return_id" TEXT;
  `);

  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "stock_transactions_sale_return_idx"
    ON "stock_transactions"("sale_return_id");
  `);

  await client.$executeRawUnsafe(`
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
}

async function ensureEnums(client: PrismaClient) {
  const enumDefinitions = [
    {
      name: "SaleReturnStatus",
      values: ["PENDING", "APPROVED", "PROCESSED", "REJECTED", "CANCELLED"],
    },
    { name: "RefundStatus", values: ["PENDING", "PROCESSED", "FAILED"] },
  ];

  for (const { name, values } of enumDefinitions) {
    const exists = await client.$queryRawUnsafe<Array<{ typname: string }>>(
      `SELECT typname FROM pg_type WHERE typname = '${name}'`,
    );

    if (!exists.length) {
      console.log(`🔧 Creating enum ${name}...`);
      await client.$executeRawUnsafe(`
        CREATE TYPE "${name}" AS ENUM (${values.map((v) => `'${v}'`).join(", ")});
      `);
    } else {
      console.log(`✅ Enum ${name} exists. Ensuring values...`);
      for (const value of values) {
        await client.$executeRawUnsafe(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_enum
              WHERE enumlabel = '${value}'
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = '${name}')
            ) THEN
              ALTER TYPE "${name}" ADD VALUE '${value}';
            END IF;
          END;
          $$;
        `);
      }
    }
  }
}

async function main() {
  console.log("==============================================");
  console.log("🧼 Clear Tenant Cache & Verify Sale Return Schema");
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

    const decryptedUrl = encryption.decrypt(tenant.database_url);
    const safeUrl = decryptedUrl.replace(/:[^:@]+@/, ":****@");
    console.log(`🔐 Decrypted DB URL: ${safeUrl}\n`);

    const tenantClient = new PrismaClient({
      datasources: { db: { url: decryptedUrl } },
    });

    await tenantClient.$connect();
    console.log("✅ Connected to tenant database");

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
      console.log("🔍 Terminating stale Prisma sessions...");
      console.table(sessions);
      await tenantClient.$executeRawUnsafe(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND application_name ILIKE 'prisma%'
          AND pid <> pg_backend_pid();
      `);
      console.log("🧹 Other Prisma sessions terminated.");
    } else {
      console.log("✅ No other Prisma sessions detected.");
    }

    await tenantClient.$executeRawUnsafe("DISCARD ALL;");
    console.log("🧼 Session state cleared with DISCARD ALL.\n");

    await ensureEnums(tenantClient);
    await ensureSaleReturnSchema(tenantClient);

    const [returnsCount] = await tenantClient.$queryRawUnsafe<Array<{ total: string }>>(
      `SELECT COUNT(*)::text AS total FROM sale_returns`,
    );
    const [itemsCount] = await tenantClient.$queryRawUnsafe<Array<{ total: string }>>(
      `SELECT COUNT(*)::text AS total FROM sale_return_items`,
    );

    console.log("\n📊 Verification snapshot:");
    console.log(`   sale_returns rows: ${returnsCount?.total ?? "0"}`);
    console.log(`   sale_return_items rows: ${itemsCount?.total ?? "0"}`);

    await tenantClient.$disconnect();
    console.log(
      "\n✅ Cache cleared & schema verified. Restart the backend API so Prisma reconnects cleanly.",
    );
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  } finally {
    await masterClient.$disconnect();
  }
}

main();

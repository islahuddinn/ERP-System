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

async function ensureSaleReturnTables(prisma: PrismaClient) {
  console.log("🔧 Ensuring sale_returns table exists...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "sale_returns" (
      "id" TEXT PRIMARY KEY,
      "return_number" TEXT NOT NULL UNIQUE,
      "original_sale_id" TEXT NOT NULL,
      "location_id" TEXT NOT NULL,
      "return_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "tax_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "discount_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "refund_method" TEXT NOT NULL,
      "refund_status" TEXT NOT NULL DEFAULT 'PENDING',
      "refunded_at" TIMESTAMP WITH TIME ZONE,
      "reason" TEXT NOT NULL,
      "notes" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "processed_by" TEXT NOT NULL,
      "approved_by" TEXT,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  console.log("🔧 Ensuring sale_return_items table exists...");
  await prisma.$executeRawUnsafe(`
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
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  console.log("🔧 Ensuring sale_return_id column on stock_transactions...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "stock_transactions"
    ADD COLUMN IF NOT EXISTS "sale_return_id" TEXT;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "stock_transactions_sale_return_idx"
    ON "stock_transactions"("sale_return_id");
  `);

  await prisma.$executeRawUnsafe(`
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

async function main() {
  console.log("==============================================");
  console.log("🔍 Verify & Fix Sale Return Schema");
  console.log(`Target tenant: ${TARGET_EMAIL} (code ${TARGET_CODE})`);
  console.log("==============================================\n");

  const masterClient = new MasterPrismaClient();
  const encryption = new SimpleEncryption();

  try {
    const tenants = await masterClient.$queryRawUnsafe<
      Array<{ id: string; name: string; database_url: string; is_active: boolean }>
    >(`
      SELECT id, name, database_url, is_active
      FROM tenants
      WHERE (email = '${TARGET_EMAIL}' OR short_tenant_id = '${TARGET_CODE}')
        AND is_active = true
      LIMIT 1;
    `);

    if (!tenants || tenants.length === 0) {
      console.error("❌ Tenant not found or inactive.");
      process.exit(1);
    }

    const tenant = tenants[0];
    const decryptedUrl = encryption.decrypt(tenant.database_url);

    const prisma = new PrismaClient({
      datasources: {
        db: { url: decryptedUrl },
      },
    });

    await prisma.$connect();
    console.log(`✅ Connected to tenant ${tenant.name}`);

    await ensureSaleReturnTables(prisma);

    await prisma.$disconnect();
    console.log("\n✅ Schema verification complete.");
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  } finally {
    await masterClient.$disconnect();
  }
}

main();

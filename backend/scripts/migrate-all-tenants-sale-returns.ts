import { PrismaClient, Prisma } from "@prisma/tenant-client";
import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";
import * as crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

const NEW_PERMISSIONS = [
  {
    name: "pos.create_return",
    module: "pos",
    action: "create_return",
    description: "Create sale returns",
    roles: ["ADMIN", "MANAGER"],
  },
  {
    name: "pos.view_returns",
    module: "pos",
    action: "view_returns",
    description: "View sale returns",
    roles: ["ADMIN", "MANAGER", "ACCOUNTANT"],
  },
  {
    name: "pos.process_return",
    module: "pos",
    action: "process_return",
    description: "Approve or process sale returns",
    roles: ["ADMIN"],
  },
] as const;

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
      console.warn(
        `   ⚠️  Failed to decrypt database_url (${error.message}); treating as plaintext`,
      );
      return ciphertext;
    }
  }
}

async function ensureEnums(prisma: PrismaClient) {
  const enumDefs = [
    {
      name: "SaleReturnStatus",
      values: ["PENDING", "APPROVED", "PROCESSED", "REJECTED", "CANCELLED"],
    },
    { name: "RefundStatus", values: ["PENDING", "PROCESSED", "FAILED"] },
  ];

  for (const enumDef of enumDefs) {
    const exists = await prisma.$queryRawUnsafe<Array<{ typname: string }>>(
      `SELECT typname FROM pg_type WHERE typname = '${enumDef.name}'`,
    );
    if (!exists.length) {
      await prisma.$executeRawUnsafe(
        `CREATE TYPE "${enumDef.name}" AS ENUM (${enumDef.values.map((v) => `'${v}'`).join(", ")})`,
      );
    } else {
      for (const value of enumDef.values) {
        await prisma.$executeRawUnsafe(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_enum
              WHERE enumlabel = '${value}'
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = '${enumDef.name}')
            ) THEN
              ALTER TYPE "${enumDef.name}" ADD VALUE '${value}';
            END IF;
          END;
          $$;
        `);
      }
    }
  }
}

async function ensureSaleReturnTables(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
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
      "notes" TEXT,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "sale_return_items"
    ADD COLUMN IF NOT EXISTS "notes" TEXT;
  `);
}

async function ensureStockTransactionsColumn(prisma: PrismaClient) {
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

async function ensureColumnTypes(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "sale_returns"
    ALTER COLUMN "status" DROP DEFAULT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "sale_returns"
    ALTER COLUMN "status" TYPE "SaleReturnStatus" USING "status"::"SaleReturnStatus";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "sale_returns"
    ALTER COLUMN "status" SET DEFAULT 'PENDING'::"SaleReturnStatus";
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "sale_returns"
    ALTER COLUMN "refund_status" DROP DEFAULT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "sale_returns"
    ALTER COLUMN "refund_status" TYPE "RefundStatus" USING "refund_status"::"RefundStatus";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "sale_returns"
    ALTER COLUMN "refund_status" SET DEFAULT 'PENDING'::"RefundStatus";
  `);
}

async function ensurePermissions(prisma: PrismaClient) {
  for (const perm of NEW_PERMISSIONS) {
    const existing = await prisma.permission.findUnique({ where: { name: perm.name } });
    let permissionId = existing?.id;
    if (!permissionId) {
      const created = await prisma.permission.create({
        data: {
          name: perm.name,
          module: perm.module,
          action: perm.action,
          description: perm.description,
        },
      });
      permissionId = created.id;
    } else {
      await prisma.permission.update({
        where: { id: permissionId },
        data: {
          module: perm.module,
          action: perm.action,
          description: perm.description,
        },
      });
    }

    for (const role of perm.roles) {
      const rolePermission = await prisma.rolePermission.findFirst({
        where: {
          role,
          permissionId,
        },
      });
      if (!rolePermission) {
        await prisma.rolePermission.create({
          data: {
            role,
            permissionId,
          },
        });
      }
    }
  }
}

async function migrateTenant(tenantId: string, name: string, databaseUrl: string) {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  await prisma.$connect();
  console.log(`   ✅ Connected to tenant ${name}`);

  await ensureEnums(prisma);
  await ensureSaleReturnTables(prisma);
  await ensureStockTransactionsColumn(prisma);
  await ensureColumnTypes(prisma);
  await ensurePermissions(prisma);

  await prisma.$disconnect();
  console.log(`   ✅ Sale return migration complete for ${name}`);
}

async function main() {
  console.log("==============================================");
  console.log("🔧 Global Sale Return Migration (All Tenants)");
  console.log("==============================================\n");

  const masterPrisma = new MasterPrismaClient();
  const encryption = new SimpleEncryption();

  try {
    const tenants = await masterPrisma.$queryRawUnsafe<
      Array<{ id: string; name: string; database_url: string }>
    >(`
      SELECT id, name, database_url
      FROM tenants
      WHERE is_active = true
    `);

    console.log(`Found ${tenants.length} active tenant(s)\n`);

    for (const tenant of tenants) {
      console.log(`➡️  Migrating tenant: ${tenant.name} (${tenant.id})`);
      try {
        const decryptedUrl = encryption.decrypt(tenant.database_url);
        await migrateTenant(tenant.id, tenant.name, decryptedUrl);
      } catch (tenantError: any) {
        console.error(`   ❌ Failed to migrate ${tenant.name}: ${tenantError.message}`);
      }
      console.log("");
    }
  } catch (error: any) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await masterPrisma.$disconnect();
  }

  console.log("🎉 Completed sale return migration for all tenants.");
  console.log("Please restart the backend server so Prisma reconnects with updated schemas.");
}

main();

/**
 * Single-tenant migration script to bring a tenant database up to the latest schema
 * for sale returns, stock tracking, and permissions.
 *
 * Target tenant:
 *   - Email: admin@malindtech.com
 *   - Code: 1130
 *
 * Usage:
 *   npx ts-node scripts/migrate-single-tenant-sale-returns.ts
 */

import { PrismaClient } from "@prisma/tenant-client";
import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";
import { v4 as uuidv4 } from "uuid";
import * as crypto from "crypto";

const TARGET_EMAIL = "admin@malindtech.com";
const TARGET_CODE = "1130";

const NEW_PERMISSIONS = [
  {
    name: "pos.create_return",
    module: "pos",
    action: "create_return",
    description: "Create sale returns",
  },
  {
    name: "pos.view_returns",
    module: "pos",
    action: "view_returns",
    description: "View sale returns",
  },
  {
    name: "pos.process_return",
    module: "pos",
    action: "process_return",
    description: "Approve or process sale returns",
  },
] as const;

const PERMISSION_ROLE_ASSIGNMENTS: Record<string, string[]> = {
  "pos.create_return": ["ADMIN", "MANAGER"],
  "pos.view_returns": ["ADMIN", "MANAGER", "ACCOUNTANT"],
  "pos.process_return": ["ADMIN"],
};

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

async function migrateTenantDatabase(tenantId: string, tenantName: string, databaseUrl: string) {
  console.log(`\n🚀 Migrating tenant ${tenantName} (${tenantId}) to latest sale-return schema...`);

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
    console.log("   ✅ Connected to tenant database");

    // 1. Ensure enums
    console.log("   🔧 Ensuring sale-return enums exist...");
    await tenantClient.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SaleReturnStatus') THEN
          CREATE TYPE "SaleReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSED', 'REJECTED', 'CANCELLED');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RefundStatus') THEN
          CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');
        END IF;
      END;
      $$;
    `);
    console.log("   ✅ Enums ready");

    // 2. Create sale_returns table
    console.log("   🔧 Creating sale_returns table (if missing)...");
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sale_returns" (
        "id" TEXT NOT NULL,
        "return_number" TEXT NOT NULL,
        "original_sale_id" TEXT NOT NULL,
        "location_id" TEXT NOT NULL,
        "return_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "total_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "refund_method" "PaymentMethod" NOT NULL,
        "refund_status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
        "refunded_at" TIMESTAMP(3),
        "reason" TEXT NOT NULL,
        "notes" TEXT,
        "processed_by" TEXT NOT NULL,
        "approved_by" TEXT,
        "status" "SaleReturnStatus" NOT NULL DEFAULT 'PENDING',
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "sale_returns_pkey" PRIMARY KEY ("id")
      );
    `);
    await tenantClient.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "sale_returns_return_number_key" ON "sale_returns"("return_number");
    `);
    await tenantClient.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "sale_returns_original_sale_idx" ON "sale_returns"("original_sale_id");
    `);
    await tenantClient.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "sale_returns_location_idx" ON "sale_returns"("location_id");
    `);
    await tenantClient.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "sale_returns_status_idx" ON "sale_returns"("status");
    `);
    await tenantClient.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sale_returns_original_sale_id_fkey'
        ) THEN
          ALTER TABLE "sale_returns"
          ADD CONSTRAINT "sale_returns_original_sale_id_fkey"
          FOREIGN KEY ("original_sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sale_returns_location_id_fkey'
        ) THEN
          ALTER TABLE "sale_returns"
          ADD CONSTRAINT "sale_returns_location_id_fkey"
          FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sale_returns_processed_by_fkey'
        ) THEN
          ALTER TABLE "sale_returns"
          ADD CONSTRAINT "sale_returns_processed_by_fkey"
          FOREIGN KEY ("processed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sale_returns_approved_by_fkey'
        ) THEN
          ALTER TABLE "sale_returns"
          ADD CONSTRAINT "sale_returns_approved_by_fkey"
          FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END;
      $$;
    `);
    console.log("   ✅ sale_returns table ready");

    // 3. Create sale_return_items table
    console.log("   🔧 Creating sale_return_items table (if missing)...");
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sale_return_items" (
        "id" TEXT NOT NULL,
        "return_id" TEXT NOT NULL,
        "original_sale_item_id" TEXT NOT NULL,
        "product_id" TEXT,
        "item_type" "ItemType" NOT NULL,
        "item_name" TEXT NOT NULL,
        "sku" TEXT,
        "quantity_returned" DECIMAL(10,3) NOT NULL,
        "original_quantity" DECIMAL(10,3) NOT NULL,
        "unit_price" DECIMAL(10,2) NOT NULL,
        "line_subtotal" DECIMAL(10,2) NOT NULL,
        "item_tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "item_discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "line_total" DECIMAL(10,2) NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "sale_return_items_pkey" PRIMARY KEY ("id")
      );
    `);
    await tenantClient.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "sale_return_items_return_idx" ON "sale_return_items"("return_id");
    `);
    await tenantClient.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "sale_return_items_sale_item_idx" ON "sale_return_items"("original_sale_item_id");
    `);
    await tenantClient.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sale_return_items_return_id_fkey'
        ) THEN
          ALTER TABLE "sale_return_items"
          ADD CONSTRAINT "sale_return_items_return_id_fkey"
          FOREIGN KEY ("return_id") REFERENCES "sale_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sale_return_items_sale_item_fkey'
        ) THEN
          ALTER TABLE "sale_return_items"
          ADD CONSTRAINT "sale_return_items_sale_item_fkey"
          FOREIGN KEY ("original_sale_item_id") REFERENCES "sale_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'sale_return_items_product_fkey'
        ) THEN
          ALTER TABLE "sale_return_items"
          ADD CONSTRAINT "sale_return_items_product_fkey"
          FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END;
      $$;
    `);
    console.log("   ✅ sale_return_items table ready");

    // 4. Extend stock_transactions
    console.log("   🔧 Updating stock_transactions for return references...");
    await tenantClient.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'stock_transactions' AND column_name = 'sale_return_id'
        ) THEN
          ALTER TABLE "stock_transactions" ADD COLUMN "sale_return_id" TEXT;
        END IF;
      END;
      $$;
    `);
    await tenantClient.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "stock_transactions_sale_return_idx" ON "stock_transactions"("sale_return_id");
    `);
    await tenantClient.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'stock_transactions_sale_return_id_fkey'
        ) THEN
          ALTER TABLE "stock_transactions"
          ADD CONSTRAINT "stock_transactions_sale_return_id_fkey"
          FOREIGN KEY ("sale_return_id") REFERENCES "sale_returns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END;
      $$;
    `);
    console.log("   ✅ stock_transactions column ready");

    // 5. Seed new permissions
    console.log("   🔧 Seeding sale return permissions...");
    for (const perm of NEW_PERMISSIONS) {
      const existing = await tenantClient.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM permissions WHERE name = '${perm.name.replace(/'/g, "''")}'`,
      );

      let permissionId = existing?.[0]?.id;
      if (!permissionId) {
        permissionId = uuidv4();
        await tenantClient.$executeRawUnsafe(`
          INSERT INTO permissions (id, name, description, module, action, created_at)
          VALUES (
            '${permissionId}',
            '${perm.name.replace(/'/g, "''")}',
            ${perm.description ? `'${perm.description.replace(/'/g, "''")}'` : "NULL"},
            '${perm.module.replace(/'/g, "''")}',
            '${perm.action.replace(/'/g, "''")}',
            NOW()
          );
        `);
        console.log(`     ➕ Created permission ${perm.name}`);
      } else {
        await tenantClient.$executeRawUnsafe(`
          UPDATE permissions
          SET description = ${perm.description ? `'${perm.description.replace(/'/g, "''")}'` : "NULL"},
              module = '${perm.module.replace(/'/g, "''")}',
              action = '${perm.action.replace(/'/g, "''")}'
          WHERE id = '${permissionId}';
        `);
      }

      const roles = PERMISSION_ROLE_ASSIGNMENTS[perm.name] || [];
      for (const role of roles) {
        const existingRolePerm = await tenantClient.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM role_permissions WHERE role = '${role}' AND permission_id = '${permissionId}'`,
        );
        if (!existingRolePerm || existingRolePerm.length === 0) {
          await tenantClient.$executeRawUnsafe(`
            INSERT INTO role_permissions (id, role, permission_id, created_at)
            VALUES ('${uuidv4()}', '${role}', '${permissionId}', NOW());
          `);
        }
      }
    }
    console.log("   ✅ Permissions seeded & assigned");

    console.log(`\n✅ Tenant ${tenantName} is now on the latest sale-return schema!\n`);
  } finally {
    await tenantClient.$disconnect();
  }
}

async function main() {
  console.log("==============================================");
  console.log("🔧 Single Tenant Sale-Return Migration");
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

    const decryptedUrl = encryption.decrypt(tenant.database_url);

    await migrateTenantDatabase(tenant.id, tenant.name, decryptedUrl);

    console.log("🎉 Migration completed successfully!");
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
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

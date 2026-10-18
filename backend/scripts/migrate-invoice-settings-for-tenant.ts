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
      console.warn(
        `   ⚠️  Failed to decrypt database_url (${error.message}); treating as plaintext`,
      );
      return ciphertext;
    }
  }
}

const CAMEL_TO_SNAKE_MAP: Record<string, string> = {
  customPageWidth: '"custom_page_width"',
  customPageHeight: '"custom_page_height"',
  showLogo: '"show_logo"',
  logoSize: '"logo_size"',
  logoPosition: '"logo_position"',
  brandNameFontSize: '"brand_name_font_size"',
  brandNameColor: '"brand_name_color"',
  receiptTitle: '"receipt_title"',
  receiptTitleFontSize: '"receipt_title_font_size"',
  showLocationAddress: '"show_location_address"',
  showCustomerInfo: '"show_customer_info"',
  customerInfoFontSize: '"customer_info_font_size"',
  showItemsTable: '"show_items_table"',
  itemsTableFontSize: '"items_table_font_size"',
  showPayments: '"show_payments"',
  paymentsFontSize: '"payments_font_size"',
  footerText: '"footer_text"',
  showFooter: '"show_footer"',
  footerFontSize: '"footer_font_size"',
  footerColor: '"footer_color"',
  dividerColor: '"divider_color"',
  dividerStyle: '"divider_style"',
  backgroundColor: '"background_color"',
  textColor: '"text_color"',
  createdAt: '"created_at"',
  updatedAt: '"updated_at"',
};

async function ensureInvoiceSettingsTable(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "invoice_settings" (
      "id" TEXT PRIMARY KEY,
      "page_size" TEXT NOT NULL DEFAULT 'A4',
      "page_orientation" TEXT NOT NULL DEFAULT 'portrait',
      "custom_page_width" DOUBLE PRECISION,
      "custom_page_height" DOUBLE PRECISION,
      "margin" DOUBLE PRECISION NOT NULL DEFAULT 16,
      "show_logo" BOOLEAN NOT NULL DEFAULT false,
      "logo_size" DOUBLE PRECISION NOT NULL DEFAULT 50,
      "logo_position" TEXT NOT NULL DEFAULT 'center',
      "brand_name_font_size" DOUBLE PRECISION NOT NULL DEFAULT 19,
      "brand_name_color" TEXT NOT NULL DEFAULT '#111827',
      "receipt_title" TEXT NOT NULL DEFAULT 'SALES RECEIPT',
      "receipt_title_font_size" DOUBLE PRECISION NOT NULL DEFAULT 11,
      "show_location_address" BOOLEAN NOT NULL DEFAULT true,
      "show_customer_info" BOOLEAN NOT NULL DEFAULT true,
      "customer_info_font_size" DOUBLE PRECISION NOT NULL DEFAULT 11,
      "show_items_table" BOOLEAN NOT NULL DEFAULT true,
      "items_table_font_size" DOUBLE PRECISION NOT NULL DEFAULT 9,
      "show_payments" BOOLEAN NOT NULL DEFAULT true,
      "payments_font_size" DOUBLE PRECISION NOT NULL DEFAULT 9,
      "footer_text" TEXT,
      "show_footer" BOOLEAN NOT NULL DEFAULT true,
      "footer_font_size" DOUBLE PRECISION NOT NULL DEFAULT 8,
      "footer_color" TEXT NOT NULL DEFAULT '#9ca3af',
      "divider_color" TEXT NOT NULL DEFAULT '#d1d5db',
      "divider_style" TEXT NOT NULL DEFAULT 'dashed',
      "background_color" TEXT,
      "text_color" TEXT NOT NULL DEFAULT '#111827',
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const toSnakeCase = (value: string) =>
    value
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/-/g, "_")
      .toLowerCase();

  const columns = [
    { name: "page_size", sql: '"page_size"', definition: `TEXT NOT NULL DEFAULT 'A4'` },
    {
      name: "page_orientation",
      sql: '"page_orientation"',
      definition: `TEXT NOT NULL DEFAULT 'portrait'`,
    },
    { name: "custom_page_width", sql: '"custom_page_width"', definition: "DOUBLE PRECISION" },
    { name: "custom_page_height", sql: '"custom_page_height"', definition: "DOUBLE PRECISION" },
    { name: "margin", sql: '"margin"', definition: "DOUBLE PRECISION NOT NULL DEFAULT 16" },
    { name: "show_logo", sql: '"show_logo"', definition: "BOOLEAN NOT NULL DEFAULT false" },
    { name: "logo_size", sql: '"logo_size"', definition: "DOUBLE PRECISION NOT NULL DEFAULT 50" },
    { name: "logo_position", sql: '"logo_position"', definition: `TEXT NOT NULL DEFAULT 'center'` },
    {
      name: "brand_name_font_size",
      sql: '"brand_name_font_size"',
      definition: "DOUBLE PRECISION NOT NULL DEFAULT 19",
    },
    {
      name: "brand_name_color",
      sql: '"brand_name_color"',
      definition: `TEXT NOT NULL DEFAULT '#111827'`,
    },
    {
      name: "receipt_title",
      sql: '"receipt_title"',
      definition: `TEXT NOT NULL DEFAULT 'SALES RECEIPT'`,
    },
    {
      name: "receipt_title_font_size",
      sql: '"receipt_title_font_size"',
      definition: "DOUBLE PRECISION NOT NULL DEFAULT 11",
    },
    {
      name: "show_location_address",
      sql: '"show_location_address"',
      definition: "BOOLEAN NOT NULL DEFAULT true",
    },
    {
      name: "show_customer_info",
      sql: '"show_customer_info"',
      definition: "BOOLEAN NOT NULL DEFAULT true",
    },
    {
      name: "customer_info_font_size",
      sql: '"customer_info_font_size"',
      definition: "DOUBLE PRECISION NOT NULL DEFAULT 11",
    },
    {
      name: "show_items_table",
      sql: '"show_items_table"',
      definition: "BOOLEAN NOT NULL DEFAULT true",
    },
    {
      name: "items_table_font_size",
      sql: '"items_table_font_size"',
      definition: "DOUBLE PRECISION NOT NULL DEFAULT 9",
    },
    { name: "show_payments", sql: '"show_payments"', definition: "BOOLEAN NOT NULL DEFAULT true" },
    {
      name: "payments_font_size",
      sql: '"payments_font_size"',
      definition: "DOUBLE PRECISION NOT NULL DEFAULT 9",
    },
    { name: "footer_text", sql: '"footer_text"', definition: "TEXT" },
    { name: "show_footer", sql: '"show_footer"', definition: "BOOLEAN NOT NULL DEFAULT true" },
    {
      name: "footer_font_size",
      sql: '"footer_font_size"',
      definition: "DOUBLE PRECISION NOT NULL DEFAULT 8",
    },
    { name: "footer_color", sql: '"footer_color"', definition: `TEXT NOT NULL DEFAULT '#9ca3af'` },
    {
      name: "divider_color",
      sql: '"divider_color"',
      definition: `TEXT NOT NULL DEFAULT '#d1d5db'`,
    },
    { name: "divider_style", sql: '"divider_style"', definition: `TEXT NOT NULL DEFAULT 'dashed'` },
    { name: "background_color", sql: '"background_color"', definition: "TEXT" },
    { name: "text_color", sql: '"text_color"', definition: `TEXT NOT NULL DEFAULT '#111827'` },
    { name: "created_at", sql: '"created_at"', definition: "TIMESTAMPTZ NOT NULL DEFAULT NOW()" },
    { name: "updated_at", sql: '"updated_at"', definition: "TIMESTAMPTZ NOT NULL DEFAULT NOW()" },
  ];

  for (const column of columns) {
    const snakeName = toSnakeCase(column.name);
    const checkNames = Array.from(new Set([column.name, snakeName]))
      .map((name) => `'${name}'`)
      .join(", ");

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'invoice_settings'
            AND column_name IN (${checkNames})
        ) THEN
          ALTER TABLE "invoice_settings"
          ADD COLUMN ${column.sql} ${column.definition};
        END IF;
      END;
      $$;
    `);
  }

  // Rename any previously misnamed camelCase columns back to snake_case where needed
  const camelColumns = {
    pageSize: '"page_size"',
    pageOrientation: '"page_orientation"',
    ...CAMEL_TO_SNAKE_MAP,
  };

  for (const [camel, snake] of Object.entries(camelColumns)) {
    const camelExists = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'invoice_settings'
        AND column_name = '${camel}';
    `);

    if (camelExists.length) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "invoice_settings"
        RENAME COLUMN "${camel}" TO ${snake};
      `);
    }
  }
}

async function ensureDefaultSettings(prisma: PrismaClient) {
  const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM "invoice_settings" LIMIT 1;`,
  );
  if (existing.length) {
    console.log("   ✅ Invoice settings record already exists");
    return;
  }

  console.log("   ➕ Seeding default invoice settings");
  await prisma.$executeRawUnsafe(`
    INSERT INTO "invoice_settings" (
      id,
      "page_size",
      "page_orientation",
      "custom_page_width",
      "custom_page_height",
      margin,
      "show_logo",
      "logo_size",
      "logo_position",
      "brand_name_font_size",
      "brand_name_color",
      "receipt_title",
      "receipt_title_font_size",
      "show_location_address",
      "show_customer_info",
      "customer_info_font_size",
      "show_items_table",
      "items_table_font_size",
      "show_payments",
      "payments_font_size",
      "footer_text",
      "show_footer",
      "footer_font_size",
      "footer_color",
      "divider_color",
      "divider_style",
      "background_color",
      "text_color",
      "created_at",
      "updated_at"
    ) VALUES (
      gen_random_uuid(),
      'A4',
      'portrait',
      NULL,
      NULL,
      16,
      false,
      50,
      'center',
      19,
      '#111827',
      'SALES RECEIPT',
      11,
      true,
      true,
      11,
      true,
      9,
      true,
      9,
      NULL,
      true,
      8,
      '#9ca3af',
      '#d1d5db',
      'dashed',
      NULL,
      '#111827',
      NOW(),
      NOW()
    );
  `);
  console.log("   ✅ Default invoice settings created");
}

async function migrateTenant(tenantId: string, name: string, databaseUrl: string) {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  await prisma.$connect();
  console.log(`   ✅ Connected to tenant ${name} (${tenantId})`);

  await ensureInvoiceSettingsTable(prisma);
  await ensureDefaultSettings(prisma);

  await prisma.$disconnect();
  console.log(`   🎉 Invoice settings migration complete for ${name}`);
}

async function main() {
  console.log("==============================================");
  console.log("🔧 Targeted Invoice Settings Migration");
  console.log("==============================================\n");
  console.log(`Tenant email : ${TARGET_EMAIL}`);
  console.log(`Tenant code  : ${TARGET_CODE}\n`);

  const masterPrisma = new MasterPrismaClient();
  const encryption = new SimpleEncryption();

  try {
    const tenants = await masterPrisma.$queryRawUnsafe<
      Array<{ id: string; name: string; database_url: string }>
    >(`
      SELECT id, name, database_url
      FROM tenants
      WHERE is_active = true
        AND (email = '${TARGET_EMAIL}' OR short_tenant_id = '${TARGET_CODE}')
      LIMIT 1;
    `);

    if (!tenants.length) {
      console.error("❌ Tenant not found or inactive.");
      process.exit(1);
    }

    const tenant = tenants[0];
    console.log(`➡️  Preparing migration for tenant: ${tenant.name} (${tenant.id})`);

    const decryptedUrl = encryption.decrypt(tenant.database_url);
    await migrateTenant(tenant.id, tenant.name, decryptedUrl);
  } catch (error: any) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await masterPrisma.$disconnect();
  }

  console.log("\n✅ Migration finished. You can now run the verifier to confirm schema.");
}

main();

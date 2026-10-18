/**
 * Clears Prisma sessions for a target tenant and verifies invoice settings schema/data.
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

const REQUIRED_COLUMNS = [
  "id",
  "pageSize",
  "pageOrientation",
  "custom_page_width",
  "custom_page_height",
  "margin",
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
  "updated_at",
];

async function verifyInvoiceSettingsSchema(tenantClient: PrismaClient) {
  const columns = await tenantClient.$queryRawUnsafe<
    Array<{ column_name: string; data_type: string }>
  >(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoice_settings'
    ORDER BY ordinal_position;
  `);

  if (!columns.length) {
    console.error("❌ Table invoice_settings does not exist.");
    return false;
  }

  const columnNames = columns.map((col) => col.column_name);
  const missingColumns = REQUIRED_COLUMNS.filter((col) => !columnNames.includes(col));

  if (missingColumns.length) {
    console.error("❌ invoice_settings table is missing columns:", missingColumns);
  } else {
    console.log("✅ invoice_settings table contains all required columns.");
  }

  console.log("\n📋 Current invoice_settings columns:");
  console.table(columns);

  return missingColumns.length === 0;
}

async function verifyInvoiceSettingsData(tenantClient: PrismaClient) {
  const settingsRows = await tenantClient.$queryRawUnsafe<Array<Record<string, any>>>(
    `SELECT * FROM "invoice_settings" LIMIT 1;`,
  );
  if (!settingsRows.length) {
    console.error("❌ No invoice settings record found.");
    return false;
  }

  const settings = settingsRows[0];
  console.log("✅ Invoice settings record found:");
  console.table([settings]);

  const hasCustomPageSize =
    settings.pageSize === "CUSTOM" && settings.custom_page_width && settings.custom_page_height;
  if (settings.pageSize === "CUSTOM" && !hasCustomPageSize) {
    console.warn("⚠️ pageSize is CUSTOM but width/height are missing.");
  }

  return true;
}

async function main() {
  console.log("=======================================================");
  console.log("🔧 Clear Tenant Cache & Verify Invoice Settings Schema");
  console.log(`Target tenant: ${TARGET_EMAIL} (code ${TARGET_CODE})`);
  console.log("=======================================================\n");

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

    const sanitizedUrl = decryptedUrl.split("?")[0];
    const lastSlash = sanitizedUrl.lastIndexOf("/");
    const dbName = lastSlash >= 0 ? sanitizedUrl.slice(lastSlash + 1) : "Unknown";
    console.log(`📊 Database from URL: ${dbName}\n`);

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

    const schemaOk = await verifyInvoiceSettingsSchema(tenantClient);
    const dataOk = await verifyInvoiceSettingsData(tenantClient);

    if (schemaOk && dataOk) {
      console.log("\n✅ Invoice settings schema & data verified successfully.");
    } else {
      console.log("\n⚠️ Invoice settings verification completed with warnings/errors.");
    }

    await tenantClient.$disconnect();
    console.log("\n✅ Tenant connection closed.");
  } catch (error: any) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  } finally {
    await masterClient.$disconnect();
  }
}

main();

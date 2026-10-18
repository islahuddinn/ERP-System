/**
 * Clears Prisma sessions for every active tenant and verifies invoice settings schema/data.
 */

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
  "page_size",
  "page_orientation",
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

async function verifySchema(tenantClient: PrismaClient) {
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
    console.error("   ❌ invoice_settings table does not exist.");
    return false;
  }

  const columnNames = columns.map((col) => col.column_name);
  const missing = REQUIRED_COLUMNS.filter((name) => !columnNames.includes(name));

  if (missing.length) {
    console.error("   ❌ invoice_settings table missing columns:", missing);
  } else {
    console.log("   ✅ invoice_settings table contains all required columns.");
  }

  console.table(columns);
  return missing.length === 0;
}

async function verifyData(tenantClient: PrismaClient) {
  const rows = await tenantClient.$queryRawUnsafe<Array<Record<string, any>>>(
    `SELECT * FROM "invoice_settings" LIMIT 1;`,
  );

  if (!rows.length) {
    console.error("   ❌ No invoice settings record found.");
    return false;
  }

  const settings = rows[0];
  console.log("   ✅ Invoice settings record found:");
  console.table([settings]);

  if (
    settings.page_size === "CUSTOM" &&
    (!settings.custom_page_width || !settings.custom_page_height)
  ) {
    console.warn("   ⚠️ page_size is CUSTOM but width/height are missing.");
  }

  return true;
}

async function verifyTenant(
  tenantId: string,
  name: string,
  databaseUrl: string,
  encryption: SimpleEncryption,
) {
  console.log(`\n➡️  Verifying tenant: ${name} (${tenantId})`);

  const decryptedUrl = encryption.decrypt(databaseUrl);
  const tenantClient = new PrismaClient({
    datasources: { db: { url: decryptedUrl } },
  });

  try {
    await tenantClient.$connect();
    console.log("   ✅ Connected to tenant database.");

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
      console.log("   🔍 Active Prisma sessions before cleanup:");
      console.table(sessions);
      await tenantClient.$executeRawUnsafe(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND application_name ILIKE 'prisma%'
          AND pid <> pg_backend_pid();
      `);
      console.log("   🧹 Terminated other Prisma sessions.");
    } else {
      console.log("   ✅ No other Prisma sessions detected.");
    }

    await tenantClient.$executeRawUnsafe(`DISCARD ALL;`);
    console.log("   🧼 Cleared session state with DISCARD ALL.");

    const schemaOk = await verifySchema(tenantClient);
    const dataOk = await verifyData(tenantClient);

    if (schemaOk && dataOk) {
      console.log("   ✅ Verification successful.");
    } else {
      console.log("   ⚠️ Verification completed with warnings/errors.");
    }
  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
  } finally {
    await tenantClient.$disconnect();
    console.log("   ✅ Tenant connection closed.");
  }
}

async function main() {
  console.log("=======================================================");
  console.log("🔧 Clear Cache & Verify Invoice Settings (All Tenants)");
  console.log("=======================================================\n");

  const masterClient = new MasterPrismaClient();
  const encryption = new SimpleEncryption();

  try {
    const tenants = await masterClient.$queryRawUnsafe<
      Array<{ id: string; name: string; database_url: string }>
    >(`
      SELECT id, name, database_url
      FROM tenants
      WHERE is_active = true;
    `);

    console.log(`Found ${tenants.length} active tenant(s).\n`);

    for (const tenant of tenants) {
      await verifyTenant(tenant.id, tenant.name, tenant.database_url, encryption);
    }
  } catch (error: any) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  } finally {
    await masterClient.$disconnect();
  }

  console.log("\n🎉 Completed invoice settings verification for all tenants.");
}

main();

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

async function dropInvoiceSettings(prisma: PrismaClient) {
  console.log("   ⚠️  Dropping invoice_settings table and related metadata...");
  await prisma.$executeRawUnsafe(`
    DROP TABLE IF EXISTS "invoice_settings" CASCADE;
  `);
  console.log("   ✅ invoice_settings table removed.");
}

async function main() {
  console.log("==============================================");
  console.log("🧨 Drop Invoice Settings Table (Target Tenant)");
  console.log("==============================================\n");
  console.log(`Target email : ${TARGET_EMAIL}`);
  console.log(`Target code  : ${TARGET_CODE}\n`);

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
    console.log(`➡️  Target tenant: ${tenant.name} (${tenant.id})`);

    const decryptedUrl = encryption.decrypt(tenant.database_url);
    const tenantClient = new PrismaClient({
      datasources: { db: { url: decryptedUrl } },
    });

    await tenantClient.$connect();
    console.log("   ✅ Connected to tenant database.");

    await dropInvoiceSettings(tenantClient);

    await tenantClient.$disconnect();
    console.log("   ✅ Tenant connection closed.");
  } catch (error: any) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  } finally {
    await masterPrisma.$disconnect();
  }

  console.log("\nDone. You can now rerun the migration script to recreate the table cleanly.");
}

main();

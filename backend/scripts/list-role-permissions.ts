import { PrismaClient } from "@prisma/tenant-client";
import * as crypto from "crypto";
import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";

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
  console.log("🔍 Inspect Tenant Role Permissions");
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
    console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);

    const prisma = new PrismaClient({
      datasources: {
        db: { url: decryptedUrl },
      },
    });

    await prisma.$connect();
    console.log("✅ Connected to tenant database\n");

    const roles = await prisma.rolePermission.groupBy({
      by: ["role"],
      _count: true,
    });

    for (const roleGroup of roles) {
      console.log(`Role: ${roleGroup.role} (${roleGroup._count} permissions)`);
      const assignments = await prisma.rolePermission.findMany({
        where: { role: roleGroup.role },
        include: { permission: true },
        orderBy: { permission: { name: "asc" } },
      });
      assignments
        .map((assignment) => assignment.permission?.name)
        .filter(Boolean)
        .forEach((name) => console.log(`  - ${name}`));
      console.log("");
    }

    await prisma.$disconnect();
    console.log("✅ Done.");
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  } finally {
    await masterClient.$disconnect();
  }
}

main();

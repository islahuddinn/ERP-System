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

async function addColumnIfMissing(
  prisma: PrismaClient,
  tableName: string,
  columnName: string,
  definition: string,
) {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = '${tableName}'
          AND column_name = '${columnName}'
      ) THEN
        ALTER TABLE "${tableName}"
        ADD COLUMN "${columnName}" ${definition};
      END IF;
    END;
    $$;
  `);
}

async function ensureOpeningBalanceEnums(prisma: PrismaClient) {
  console.log("   🔄 Ensuring OpeningBalanceType enum exists");
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'OpeningBalanceType'
      ) THEN
        CREATE TYPE "OpeningBalanceType" AS ENUM ('RECEIVABLE', 'PAYABLE');
      END IF;
    END;
    $$;
  `);

  console.log("   🔄 Ensuring LedgerTransactionType includes OPENING_BALANCE");
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LedgerTransactionType') THEN
        ALTER TYPE "LedgerTransactionType" ADD VALUE IF NOT EXISTS 'OPENING_BALANCE';
      END IF;
    END;
    $$;
  `);
}

async function ensureColumnType(
  prisma: PrismaClient,
  tableName: string,
  columnName: string,
  targetTypeExpression: string,
  targetUdtName: string,
) {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = '${tableName}'
          AND column_name = '${columnName}'
          AND udt_name <> '${targetUdtName}'
      ) THEN
        ALTER TABLE "${tableName}"
        ALTER COLUMN "${columnName}"
        TYPE ${targetTypeExpression}
        USING CASE
          WHEN "${columnName}" IS NULL THEN NULL
          ELSE "${columnName}"::text::${targetTypeExpression}
        END;
      END IF;
    END;
    $$;
  `);
}

async function ensureOpeningBalanceColumns(prisma: PrismaClient) {
  await ensureOpeningBalanceEnums(prisma);

  console.log("   🔄 Ensuring opening balance columns on customers table");
  await addColumnIfMissing(prisma, "customers", "opening_balance_amount", "NUMERIC(12,2)");
  await addColumnIfMissing(prisma, "customers", "opening_balance_type", '"OpeningBalanceType"');
  await addColumnIfMissing(prisma, "customers", "opening_balance_date", "TIMESTAMPTZ");
  await addColumnIfMissing(prisma, "customers", "opening_balance_note", "TEXT");
  await addColumnIfMissing(prisma, "customers", "opening_balance_created_by", "TEXT");
  await ensureColumnType(
    prisma,
    "customers",
    "opening_balance_type",
    '"OpeningBalanceType"',
    "openingbalancetype",
  );

  console.log("   🔄 Ensuring opening balance columns on suppliers table");
  await addColumnIfMissing(prisma, "suppliers", "opening_balance_amount", "NUMERIC(12,2)");
  await addColumnIfMissing(prisma, "suppliers", "opening_balance_type", '"OpeningBalanceType"');
  await addColumnIfMissing(prisma, "suppliers", "opening_balance_date", "TIMESTAMPTZ");
  await addColumnIfMissing(prisma, "suppliers", "opening_balance_note", "TEXT");
  await addColumnIfMissing(prisma, "suppliers", "opening_balance_created_by", "TEXT");
  await ensureColumnType(
    prisma,
    "suppliers",
    "opening_balance_type",
    '"OpeningBalanceType"',
    "openingbalancetype",
  );

  console.log("   ✅ Opening balance columns ensured");
}

async function migrateTenant(tenantId: string, name: string, databaseUrl: string) {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  console.log(`➡️  Connecting to tenant ${name} (${tenantId})`);
  await prisma.$connect();

  try {
    await ensureOpeningBalanceColumns(prisma);
    console.log(`🎉 Opening balance migration complete for ${name}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("==============================================");
  console.log("🔧 Opening Balance Migration (Single Tenant)");
  console.log("==============================================\n");
  console.log(`Tenant email : ${TARGET_EMAIL}`);
  console.log(`Tenant code  : ${TARGET_CODE}\n`);

  const masterPrisma = new MasterPrismaClient();
  const encryption = new SimpleEncryption();

  try {
    const tenants = await masterPrisma.$queryRawUnsafe<
      Array<{ id: string; name: string; database_url: string }>
    >(
      `
        SELECT id, name, database_url
        FROM tenants
        WHERE is_active = true
          AND (email = '${TARGET_EMAIL}' OR short_tenant_id = '${TARGET_CODE}')
        LIMIT 1;
      `,
    );

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

  console.log(
    "\n✅ Migration finished. You can now test the opening balance feature on this tenant.",
  );
}

main();

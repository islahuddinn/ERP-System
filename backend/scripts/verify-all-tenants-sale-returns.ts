import { PrismaClient, UserRole } from "@prisma/tenant-client";
import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";
import * as crypto from "crypto";

const PERMISSIONS = ["pos.create_return", "pos.view_returns", "pos.process_return"] as const;
const ROLE_ASSIGNMENTS: Record<(typeof PERMISSIONS)[number], UserRole[]> = {
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
    if (!key) throw new Error("ENCRYPTION_KEY not set");
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

async function checkEnum(prisma: PrismaClient, enumName: string) {
  const result = await prisma.$queryRawUnsafe<Array<{ typname: string }>>(
    `SELECT typname FROM pg_type WHERE typname = '${enumName}'`,
  );
  return result.length > 0;
}

async function checkTable(prisma: PrismaClient, tableName: string) {
  const results = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    `
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = '${tableName}'
  `,
  );
  return results.length > 0;
}

async function checkColumn(prisma: PrismaClient, tableName: string, columnName: string) {
  const results = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '${tableName}'
      AND column_name = '${columnName}'
  `,
  );
  return results.length > 0;
}

async function checkColumnType(
  prisma: PrismaClient,
  tableName: string,
  columnName: string,
  expectedType: string,
) {
  const results = await prisma.$queryRawUnsafe<Array<{ udt_name: string }>>(
    `
    SELECT udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '${tableName}'
      AND column_name = '${columnName}'
  `,
  );

  if (!results.length) return false;
  return results[0].udt_name.toLowerCase() === expectedType.toLowerCase();
}

async function checkPermission(prisma: PrismaClient, name: string) {
  const permission = await prisma.permission.findUnique({ where: { name } });
  return permission;
}

async function verifyTenant(name: string, url: string) {
  const prisma = new PrismaClient({
    datasources: { db: { url } },
  });
  await prisma.$connect();

  const issues: string[] = [];

  if (!(await checkEnum(prisma, "SaleReturnStatus"))) {
    issues.push("Missing enum SaleReturnStatus");
  }

  if (!(await checkEnum(prisma, "RefundStatus"))) {
    issues.push("Missing enum RefundStatus");
  }

  if (!(await checkTable(prisma, "sale_returns"))) {
    issues.push("Missing table sale_returns");
  }

  if (!(await checkTable(prisma, "sale_return_items"))) {
    issues.push("Missing table sale_return_items");
  } else {
    if (!(await checkColumn(prisma, "sale_return_items", "notes"))) {
      issues.push("Missing column sale_return_items.notes");
    }
  }

  if (!(await checkColumn(prisma, "stock_transactions", "sale_return_id"))) {
    issues.push("Missing column stock_transactions.sale_return_id");
  }

  if (!(await checkColumnType(prisma, "sale_returns", "status", "SaleReturnStatus"))) {
    issues.push("sale_returns.status is not SaleReturnStatus enum");
  }

  if (!(await checkColumnType(prisma, "sale_returns", "refund_status", "RefundStatus"))) {
    issues.push("sale_returns.refund_status is not RefundStatus enum");
  }

  for (const permName of PERMISSIONS) {
    const permission = await checkPermission(prisma, permName);
    if (!permission) {
      issues.push(`Missing permission ${permName}`);
      continue;
    }

    const roles = ROLE_ASSIGNMENTS[permName];
    for (const role of roles) {
      const assignment = await prisma.rolePermission.findFirst({
        where: {
          role,
          permissionId: permission.id,
        },
      });
      if (!assignment) {
        issues.push(`Permission ${permName} not assigned to role ${role}`);
      }
    }
  }

  await prisma.$disconnect();
  return issues;
}

async function main() {
  console.log("==============================================");
  console.log("🔍 Verify Sale Return Migration (All Tenants)");
  console.log("==============================================\n");

  const masterPrisma = new MasterPrismaClient();
  const encryption = new SimpleEncryption();

  try {
    const tenants = await masterPrisma.$queryRawUnsafe<
      Array<{ id: string; name: string; database_url: string }>
    >(`SELECT id, name, database_url FROM tenants WHERE is_active = true`);

    let totalIssues = 0;
    for (const tenant of tenants) {
      console.log(`➡️  Verifying tenant: ${tenant.name} (${tenant.id})`);
      try {
        const decryptedUrl = encryption.decrypt(tenant.database_url);
        const issues = await verifyTenant(tenant.name, decryptedUrl);
        if (issues.length === 0) {
          console.log("   ✅ All checks passed\n");
        } else {
          totalIssues += issues.length;
          console.log("   ❌ Issues found:");
          issues.forEach((issue) => console.log(`      - ${issue}`));
          console.log("");
        }
      } catch (tenantError: any) {
        totalIssues += 1;
        console.error(`   ❌ Verification failed: ${tenantError.message}\n`);
      }
    }

    if (totalIssues === 0) {
      console.log("🎉 All tenants passed verification.");
    } else {
      console.log(`⚠️  Verification completed with ${totalIssues} issue(s). Review logs above.`);
    }
  } catch (error: any) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  } finally {
    await masterPrisma.$disconnect();
  }
}

main();

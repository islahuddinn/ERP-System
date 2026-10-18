import { PrismaClient } from "@prisma/tenant-client";
import * as readline from "readline";
import * as crypto from "crypto";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Script to safely add BULK_ADJUST and BULK_TRANSFER to AuditAction enum
 * for existing tenant databases without losing any data
 *
 * Usage:
 *   npx ts-node scripts/update-audit-enum-for-tenants.ts
 *
 * Or compile and run:
 *   npm run build
 *   node dist/scripts/update-audit-enum-for-tenants.js
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

// Simple encryption/decryption helper (matches EncryptionService logic)
class SimpleEncryption {
  private readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly saltLength = 64;
  private readonly tagLength = 16;
  private readonly tagPosition: number;
  private readonly encryptedPosition: number;
  private readonly encryptionKey: Buffer;

  constructor() {
    this.tagPosition = this.saltLength + this.ivLength;
    this.encryptedPosition = this.tagPosition + this.tagLength;

    const key = process.env.ENCRYPTION_KEY || this.generateDefaultKey();
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

      let decrypted = decipher.update(encrypted, null, "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      // If decryption fails, assume it might be plaintext (for backward compatibility)
      console.warn("Decryption failed, assuming plaintext");
      return ciphertext;
    }
  }

  private generateDefaultKey(): string {
    return crypto.randomBytes(32).toString("hex");
  }
}

async function updateTenantDatabase(
  connectionString: string,
  tenantName: string,
): Promise<boolean> {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: connectionString,
      },
    },
  });

  try {
    console.log(`\n📊 Updating ${tenantName}...`);

    // Check if enum values already exist
    const checkQuery = `
      SELECT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'BULK_ADJUST' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
      ) as has_bulk_adjust,
      EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'BULK_TRANSFER' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
      ) as has_bulk_transfer;
    `;

    const checkResult = (await client.$queryRawUnsafe(checkQuery)) as any[];
    const hasBulkAdjust = checkResult[0]?.has_bulk_adjust;
    const hasBulkTransfer = checkResult[0]?.has_bulk_transfer;

    if (hasBulkAdjust && hasBulkTransfer) {
      console.log(`✅ ${tenantName} already has the enum values. Skipping...`);
      return true;
    }

    // Add enum values if they don't exist
    if (!hasBulkAdjust) {
      console.log(`   Adding BULK_ADJUST...`);
      await client.$executeRawUnsafe(
        `ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BULK_ADJUST';`,
      );
    }

    if (!hasBulkTransfer) {
      console.log(`   Adding BULK_TRANSFER...`);
      await client.$executeRawUnsafe(
        `ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BULK_TRANSFER';`,
      );
    }

    console.log(`✅ ${tenantName} updated successfully!`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error updating ${tenantName}:`, error.message);
    return false;
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  console.log("🔧 AuditAction Enum Update Script");
  console.log("==================================\n");
  console.log("This script will safely add BULK_ADJUST and BULK_TRANSFER");
  console.log("to the AuditAction enum for existing tenant databases.\n");

  // Connect to master database to get all tenants
  const masterDatabaseUrl = process.env.MASTER_DATABASE_URL;
  if (!masterDatabaseUrl) {
    console.error("❌ MASTER_DATABASE_URL environment variable is not set.");
    console.error("Please set it in your .env file.");
    process.exit(1);
  }

  // Use Prisma client with master database URL
  const masterPrisma = new PrismaClient({
    datasources: {
      db: {
        url: masterDatabaseUrl,
      },
    },
  });

  const encryption = new SimpleEncryption();

  try {
    console.log("✅ Connecting to master database...\n");

    // Query tenants using raw SQL with Prisma
    const result = await masterPrisma.$queryRawUnsafe<
      Array<{
        id: string;
        name: string;
        databaseUrl: string;
        isActive: boolean;
      }>
    >(`
      SELECT id, name, database_url as "databaseUrl", is_active as "isActive"
      FROM tenants
      WHERE is_active = true
      ORDER BY name
    `);

    const tenants = result;

    if (tenants.length === 0) {
      console.log("No active tenants found in the master database.");
      return;
    }

    console.log(`Found ${tenants.length} active tenant(s):\n`);
    tenants.forEach((tenant: any, index: number) => {
      console.log(`  ${index + 1}. ${tenant.name} (ID: ${tenant.id})`);
    });

    const answer = await question("\nDo you want to update all tenants? (yes/no): ");

    if (answer.toLowerCase() !== "yes" && answer.toLowerCase() !== "y") {
      console.log("Operation cancelled.");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const tenant of tenants) {
      try {
        // Decrypt database URL
        const decryptedUrl = encryption.decrypt(tenant.databaseUrl);

        const success = await updateTenantDatabase(decryptedUrl, tenant.name);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error: any) {
        console.error(`❌ Failed to process ${tenant.name}:`, error.message);
        failCount++;
      }
    }

    console.log("\n==================================");
    console.log("📊 Summary:");
    console.log(`   ✅ Successfully updated: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log("==================================\n");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await masterPrisma.$disconnect();
    rl.close();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

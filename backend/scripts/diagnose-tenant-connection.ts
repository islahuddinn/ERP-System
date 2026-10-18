/**
 * Diagnostic Script for Tenant Database Connection
 *
 * This script helps diagnose connection issues with a specific tenant's database.
 *
 * Usage:
 *   npx ts-node scripts/diagnose-tenant-connection.ts <tenant-code-or-email>
 *
 * Example:
 *   npx ts-node scripts/diagnose-tenant-connection.ts 8549
 *   npx ts-node scripts/diagnose-tenant-connection.ts adeel@gmail.com
 */

import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";
import { PrismaClient } from "@prisma/tenant-client";
import * as crypto from "crypto";
import * as net from "net";

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
    if (!ciphertext) return ciphertext;
    try {
      const combined = Buffer.from(ciphertext, "base64");
      const iv = combined.slice(this.saltLength, this.tagPosition);
      const tag = combined.slice(this.tagPosition, this.encryptedPosition);
      const encrypted = combined.slice(this.encryptedPosition);
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(encrypted, null, "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error: any) {
      console.warn(`   ⚠️  Decryption failed: ${error.message}, treating as plaintext`);
      return ciphertext;
    }
  }
}

function testTcpConnection(host: string, port: number, timeout: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let connected = false;

    socket.setTimeout(timeout);

    socket.once("connect", () => {
      connected = true;
      socket.destroy();
      resolve(true);
    });

    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.once("error", () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function diagnoseTenant(identifier: string) {
  console.log("🔍 Tenant Database Connection Diagnostic");
  console.log("========================================\n");

  if (!process.env.MASTER_DATABASE_URL) {
    console.error("❌ MASTER_DATABASE_URL is not set");
    process.exit(1);
  }

  if (!process.env.ENCRYPTION_KEY) {
    console.error("❌ ENCRYPTION_KEY is not set");
    process.exit(1);
  }

  const originalDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = process.env.MASTER_DATABASE_URL;

  const masterPrisma = new MasterPrismaClient({
    datasources: {
      db: { url: process.env.MASTER_DATABASE_URL },
    },
  });

  if (originalDatabaseUrl) {
    process.env.DATABASE_URL = originalDatabaseUrl;
  } else {
    delete process.env.DATABASE_URL;
  }

  const encryption = new SimpleEncryption();

  try {
    await masterPrisma.$connect();
    console.log("✅ Connected to master database\n");

    // Find tenant
    const tenant = await masterPrisma.$queryRawUnsafe<
      Array<{
        id: string;
        name: string;
        database_url: string;
        is_active: boolean;
        email?: string;
        short_tenant_id?: string;
      }>
    >(
      `
      SELECT t.id, t.name, t.database_url, t.is_active, 
             t.email, t.short_tenant_id
      FROM tenants t
      WHERE (t.email = $1 OR t.short_tenant_id = $1)
        AND t.is_active = true
      LIMIT 1;
    `,
      identifier,
    );

    if (!tenant || tenant.length === 0) {
      console.error(`❌ Tenant not found with identifier: ${identifier}`);
      console.error("   Try using the tenant email or code (short_tenant_id)");
      process.exit(1);
    }

    const targetTenant = tenant[0];
    console.log(`📊 Found tenant: ${targetTenant.name}`);
    console.log(`   ID: ${targetTenant.id}`);
    console.log(`   Email: ${targetTenant.email || "N/A"}`);
    console.log(`   Code: ${targetTenant.short_tenant_id || "N/A"}`);
    console.log(`   Active: ${targetTenant.is_active ? "Yes" : "No"}\n`);

    if (!targetTenant.database_url || targetTenant.database_url.trim() === "") {
      console.error("❌ Tenant database_url is empty in master database");
      process.exit(1);
    }

    // Decrypt database URL
    console.log("🔐 Decrypting database URL...");
    const decryptedUrl = encryption.decrypt(targetTenant.database_url);

    if (!decryptedUrl || decryptedUrl.trim() === "") {
      console.error("❌ Decrypted database URL is empty");
      process.exit(1);
    }

    let urlObj: URL;
    try {
      urlObj = new URL(decryptedUrl);
    } catch (e) {
      console.error("❌ Invalid database URL format");
      console.error(`   URL (first 50 chars): ${decryptedUrl.substring(0, 50)}...`);
      process.exit(1);
    }

    console.log("✅ Database URL decrypted successfully\n");
    console.log("📊 Database Connection Details:");
    console.log(`   Host: ${urlObj.hostname}`);
    console.log(`   Port: ${urlObj.port || 5432}`);
    console.log(`   Database: ${urlObj.pathname.slice(1)}`);
    console.log(`   User: ${urlObj.username || "N/A"}\n`);

    // Test TCP connection
    const port = parseInt(urlObj.port || "5432", 10);
    console.log(`🔌 Testing TCP connection to ${urlObj.hostname}:${port}...`);
    const tcpConnected = await testTcpConnection(urlObj.hostname, port, 10000);

    if (tcpConnected) {
      console.log("✅ TCP connection successful (server is reachable)\n");
    } else {
      console.log("❌ TCP connection failed (server is not reachable)\n");
      console.log("💡 Possible issues:");
      console.log("   1. Database server is down");
      console.log("   2. Network connectivity problem");
      console.log("   3. Firewall blocking the connection");
      console.log("   4. Wrong host/port in database URL\n");
    }

    // Test Prisma connection
    console.log("🔌 Testing Prisma connection...");
    const originalDbUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = decryptedUrl;

    const tenantClient = new PrismaClient({
      datasources: { db: { url: decryptedUrl } },
    });

    if (originalDbUrl) {
      process.env.DATABASE_URL = originalDbUrl;
    } else {
      delete process.env.DATABASE_URL;
    }

    try {
      await tenantClient.$connect();
      console.log("✅ Prisma connection successful\n");

      // Try a simple query
      console.log("🔍 Testing database query...");
      const userCount = await tenantClient.$queryRawUnsafe<Array<{ count: bigint }>>(
        "SELECT COUNT(*) as count FROM users LIMIT 1",
      );
      console.log(`✅ Query successful - Found ${userCount[0]?.count || 0} users in database\n`);

      console.log("✅ All connection tests passed!");
      console.log("   The database is accessible and working correctly.\n");
    } catch (error: any) {
      console.error(`❌ Prisma connection failed: ${error.message}\n`);

      if (tcpConnected) {
        console.log("💡 TCP connection works but Prisma connection fails.");
        console.log("   This suggests:");
        console.log("   1. Database credentials might be incorrect");
        console.log("   2. Database name might be wrong");
        console.log("   3. Database might not exist");
        console.log("   4. User might not have access permissions\n");
      }
    } finally {
      try {
        await tenantClient.$disconnect();
      } catch (e) {
        // Ignore
      }
    }
  } catch (error: any) {
    console.error(`❌ Diagnostic failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await masterPrisma.$disconnect();
  }
}

// Get tenant identifier from command line
const identifier = process.argv[2];

if (!identifier) {
  console.error("❌ Please provide a tenant identifier (email or code)");
  console.error("\nUsage:");
  console.error("  npx ts-node scripts/diagnose-tenant-connection.ts <tenant-code-or-email>");
  console.error("\nExample:");
  console.error("  npx ts-node scripts/diagnose-tenant-connection.ts 8549");
  console.error("  npx ts-node scripts/diagnose-tenant-connection.ts adeel@gmail.com");
  process.exit(1);
}

diagnoseTenant(identifier)
  .then(() => {
    console.log("========================================");
    console.log("✅ Diagnostic completed\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });

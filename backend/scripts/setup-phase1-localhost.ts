import { PrismaClient as MasterPrismaClient } from "../@prisma/master-client";
import { PrismaClient as TenantPrismaClient } from "@prisma/tenant-client";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import * as pg from "pg";

const { Client } = pg;

// Database connection details from .env
const MASTER_DB_URL =
  process.env.MASTER_DATABASE_URL ||
  "postgresql://postgres:password@localhost:5434/inventory_master?schema=public";
const TENANT_DB_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5434/inventory?schema=public";

// Extract connection details for creating databases
function parseConnectionString(url: string) {
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!match) throw new Error("Invalid connection string");
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  };
}

async function ensureDatabaseExists(conn: {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
}) {
  // Connect to postgres database to create target database
  const adminClient = new Client({
    user: conn.user,
    password: conn.password,
    host: conn.host,
    port: conn.port,
    database: "postgres",
  });

  try {
    await adminClient.connect();
    console.log(`✅ Connected to PostgreSQL server`);

    // Check if database exists
    const result = await adminClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [
      conn.database,
    ]);

    if (result.rows.length === 0) {
      console.log(`📦 Creating database: ${conn.database}...`);
      await adminClient.query(`CREATE DATABASE "${conn.database}"`);
      console.log(`✅ Database created: ${conn.database}`);
    } else {
      console.log(`✅ Database already exists: ${conn.database}`);
    }
  } catch (error: any) {
    if (error.message.includes("already exists")) {
      console.log(`✅ Database already exists: ${conn.database}`);
    } else {
      throw error;
    }
  } finally {
    await adminClient.end();
  }
}

// Encryption service (simplified version)
class EncryptionService {
  private encryptionKey: Buffer;

  constructor(key: string) {
    this.encryptionKey = crypto.pbkdf2Sync(
      key,
      "inventory-multi-tenant-salt",
      100000,
      32,
      "sha512",
    );
  }

  encrypt(plaintext: string): string {
    const algorithm = "aes-256-gcm";
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");
    const tag = cipher.getAuthTag();

    const combined = Buffer.concat([
      Buffer.alloc(64), // salt placeholder
      iv,
      tag,
      Buffer.from(encrypted, "base64"),
    ]);

    return combined.toString("base64");
  }
}

async function main() {
  console.log("🚀 Phase-1 Localhost Setup Script");
  console.log("==================================\n");

  try {
    // Step 1: Ensure databases exist
    console.log("📋 Step 1: Ensuring databases exist...\n");
    const masterConn = parseConnectionString(MASTER_DB_URL);
    const tenantConn = parseConnectionString(TENANT_DB_URL);

    await ensureDatabaseExists(masterConn);
    await ensureDatabaseExists(tenantConn);

    // Step 2: Initialize master Prisma client
    console.log("\n📋 Step 2: Connecting to master database...");
    const masterPrisma = new MasterPrismaClient({
      datasources: {
        db: { url: MASTER_DB_URL },
      },
    });

    await masterPrisma.$connect();
    console.log("✅ Connected to master database");

    // Step 3: Check if tenant 8549 exists
    console.log("\n📋 Step 3: Checking for test tenant (ID: 8549)...");
    let tenant = await masterPrisma.tenant.findUnique({
      where: { id: "8549" },
    });

    const encryptionKey = process.env.ENCRYPTION_KEY || "01234567890123456789012345678901";
    const encryptionService = new EncryptionService(encryptionKey);
    const encryptedDbUrl = encryptionService.encrypt(TENANT_DB_URL);

    if (!tenant) {
      console.log("📦 Creating test tenant...");
      tenant = await masterPrisma.tenant.create({
        data: {
          id: "8549",
          name: "Test Tenant",
          email: "test@example.com",
          databaseName: "inventory",
          databaseUrl: encryptedDbUrl,
          subscriptionType: "PERMANENT",
          subscriptionStartDate: new Date(),
          isActive: true,
          isSuspended: false,
        },
      });
      console.log("✅ Test tenant created");
    } else {
      console.log("✅ Test tenant already exists");
      // Update database URL in case it changed
      await masterPrisma.tenant.update({
        where: { id: "8549" },
        data: {
          databaseUrl: encryptedDbUrl,
          isActive: true,
          isSuspended: false,
        },
      });
      console.log("✅ Test tenant updated");
    }

    // Step 4: Initialize tenant Prisma client
    console.log("\n📋 Step 4: Connecting to tenant database...");
    const tenantPrisma = new TenantPrismaClient({
      datasources: {
        db: { url: TENANT_DB_URL },
      },
    });

    await tenantPrisma.$connect();
    console.log("✅ Connected to tenant database");

    // Step 5: Check if test user exists
    console.log("\n📋 Step 5: Checking for test admin user...");
    const testEmail = "john@example.com";
    let testUser = await tenantPrisma.user.findUnique({
      where: { email: testEmail },
    });

    if (!testUser) {
      console.log("📦 Creating test admin user...");
      const hashedPassword = await bcrypt.hash("password123", 10);

      // Get ADMIN role permissions or create user with ADMIN role
      testUser = await tenantPrisma.user.create({
        data: {
          email: testEmail,
          name: "John Doe",
          passwordHash: hashedPassword,
          role: "ADMIN",
          status: "ACTIVE",
          emailVerified: true,
        },
      });
      console.log("✅ Test admin user created");
      console.log(`   Email: ${testEmail}`);
      console.log(`   Password: password123`);
    } else {
      console.log("✅ Test admin user already exists");
      // Update password to ensure it's correct
      const hashedPassword = await bcrypt.hash("password123", 10);
      await tenantPrisma.user.update({
        where: { email: testEmail },
        data: {
          passwordHash: hashedPassword,
          status: "ACTIVE",
        },
      });
      console.log("✅ Test admin user password updated");
    }

    // Cleanup
    await masterPrisma.$disconnect();
    await tenantPrisma.$disconnect();

    console.log("\n✅ Phase-1 setup completed successfully!");
    console.log("\n📝 Summary:");
    console.log(`   - Master DB: ${masterConn.database} ✅`);
    console.log(`   - Tenant DB: ${tenantConn.database} ✅`);
    console.log(`   - Test Tenant ID: 8549 ✅`);
    console.log(`   - Test User: ${testEmail} ✅`);
    console.log("\n🚀 You can now run: npm run start:dev");
  } catch (error: any) {
    console.error("\n❌ Setup failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

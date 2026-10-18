/**
 * All Tenants Expense Module Update Script
 *
 * This script updates ALL active tenants' databases:
 *  1. Ensures expense module schema is up to date (enums, tables)
 *  2. Seeds default expense categories
 *  3. Seeds expense permissions
 *  4. Assigns expense permissions to appropriate roles
 *
 * The script is:
 *  - Non-destructive (no data is deleted)
 *  - Idempotent (safe to run multiple times)
 *  - Handles errors gracefully (continues with other tenants if one fails)
 *
 * Usage:
 *   From backend directory:
 *     npx ts-node scripts/update-all-tenants-expenses.ts
 *
 * After running:
 *   - RESTART the backend server so Prisma clients pick up the new schema
 */

import { PrismaClient } from "@prisma/tenant-client";
import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";
import * as crypto from "crypto";
import { PERMISSIONS } from "../src/users/permissions/permission.definitions";
import { v4 as uuidv4 } from "uuid";

/**
 * AES-256-GCM decryption compatible with EncryptionService
 */
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

    // Derive a 32-byte key using PBKDF2 (same as EncryptionService)
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

      let decrypted = decipher.update(encrypted, undefined, "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error: any) {
      // Fallback: treat as plaintext (for backward compatibility)
      console.warn(
        `   ⚠️  Failed to decrypt database_url (${error.message}); treating as plaintext`,
      );
      return ciphertext;
    }
  }
}

// Default expense categories
const defaultCategories = [
  {
    name: "Rent & Utilities",
    description: "Office/store rent, electricity, water, internet",
    icon: "rent",
    color: "#3B82F6",
  },
  {
    name: "Salaries & Wages",
    description: "Employee salaries, wages, bonuses",
    icon: "salary",
    color: "#10B981",
  },
  {
    name: "Marketing & Advertising",
    description: "Promotions, ads, social media",
    icon: "marketing",
    color: "#F59E0B",
  },
  {
    name: "Travel & Transportation",
    description: "Fuel, vehicle maintenance, travel expenses",
    icon: "travel",
    color: "#EF4444",
  },
  {
    name: "Office Supplies",
    description: "Stationery, equipment, furniture",
    icon: "office",
    color: "#8B5CF6",
  },
  {
    name: "Professional Services",
    description: "Legal, accounting, consulting",
    icon: "services",
    color: "#EC4899",
  },
  {
    name: "Insurance",
    description: "Business insurance, health insurance",
    icon: "insurance",
    color: "#06B6D4",
  },
  {
    name: "Maintenance & Repairs",
    description: "Equipment repairs, facility maintenance",
    icon: "maintenance",
    color: "#84CC16",
  },
  {
    name: "Communication",
    description: "Phone bills, internet, postage",
    icon: "communication",
    color: "#6366F1",
  },
  {
    name: "Miscellaneous",
    description: "Other expenses",
    icon: "misc",
    color: "#64748B",
  },
];

// Expense permissions to assign to roles
const EXPENSE_PERMISSIONS = [
  "expenses.create",
  "expenses.read",
  "expenses.update",
  "expenses.delete",
  "expenses.approve",
  "expenses.reports",
];

// Roles that should get expense permissions (ADMIN gets all automatically)
const EXPENSE_ROLE_PERMISSIONS: Record<string, string[]> = {
  MANAGER: [
    "expenses.create",
    "expenses.read",
    "expenses.update",
    "expenses.delete",
    "expenses.approve",
    "expenses.reports",
  ],
  ACCOUNTANT: [
    "expenses.create",
    "expenses.read",
    "expenses.update",
    "expenses.approve",
    "expenses.reports",
  ],
};

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

async function ensureExpenseSchema(tenantClient: PrismaClient) {
  console.log("   🔧 Ensuring expense module schema...");

  // 1. Ensure ExpenseStatus enum exists
  console.log("      🔧 Ensuring ExpenseStatus enum...");
  await tenantClient.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExpenseStatus') THEN
        CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');
      END IF;
    END;
    $$;
  `);

  // 2. Ensure RecurringFrequency enum exists
  console.log("      🔧 Ensuring RecurringFrequency enum...");
  await tenantClient.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RecurringFrequency') THEN
        CREATE TYPE "RecurringFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');
      END IF;
    END;
    $$;
  `);

  // 3. Ensure expense_categories table exists
  console.log("      🔧 Ensuring expense_categories table...");
  await tenantClient.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "expense_categories" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "icon" TEXT,
      "color" TEXT,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
    );
  `);
  await tenantClient.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "expense_categories_name_key" ON "expense_categories"("name");`,
  );

  // 4. Ensure expenses table exists
  console.log("      🔧 Ensuring expenses table...");
  await tenantClient.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "expenses" (
      "id" TEXT NOT NULL,
      "expense_number" TEXT NOT NULL,
      "category_id" TEXT NOT NULL,
      "location_id" TEXT NOT NULL,
      "amount" DECIMAL(10,2) NOT NULL,
      "payment_method" "PaymentMethod" NOT NULL,
      "payment_date" TIMESTAMP(3) NOT NULL,
      "expense_date" TIMESTAMP(3) NOT NULL,
      "description" TEXT,
      "vendor" TEXT,
      "reference_number" TEXT,
      "is_recurring" BOOLEAN NOT NULL DEFAULT false,
      "recurring_frequency" "RecurringFrequency",
      "next_recurring_date" TIMESTAMP(3),
      "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
      "approved_by" TEXT,
      "approved_at" TIMESTAMP(3),
      "rejection_reason" TEXT,
      "cash_transaction_id" TEXT,
      "deleted_at" TIMESTAMP(3),
      "created_by" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
    );
  `);
  await tenantClient.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "expenses_expense_number_key" ON "expenses"("expense_number");`,
  );
  await tenantClient.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "expenses_category_id_idx" ON "expenses"("category_id");`,
  );
  await tenantClient.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "expenses_location_id_idx" ON "expenses"("location_id");`,
  );
  await tenantClient.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "expenses_expense_date_idx" ON "expenses"("expense_date");`,
  );
  await tenantClient.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "expenses_payment_date_idx" ON "expenses"("payment_date");`,
  );
  await tenantClient.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "expenses_status_idx" ON "expenses"("status");`,
  );
  await tenantClient.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "expenses_created_by_idx" ON "expenses"("created_by");`,
  );
  await tenantClient.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "expenses_deleted_at_idx" ON "expenses"("deleted_at");`,
  );

  // Add unique constraint for cash_transaction_id (for one-to-one relation)
  await tenantClient.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'expenses_cash_transaction_id_key'
      ) THEN
        CREATE UNIQUE INDEX "expenses_cash_transaction_id_key" 
        ON "expenses"("cash_transaction_id") 
        WHERE "cash_transaction_id" IS NOT NULL;
      END IF;
    END;
    $$;
  `);

  // 5. Ensure foreign key constraints
  console.log("      🔧 Ensuring foreign key constraints...");
  await tenantClient.$executeRawUnsafe(`
    DO $$
    BEGIN
      -- expense_categories -> expenses
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'expenses_category_id_fkey'
      ) THEN
        ALTER TABLE "expenses" 
        ADD CONSTRAINT "expenses_category_id_fkey" 
        FOREIGN KEY ("category_id") 
        REFERENCES "expense_categories"("id") 
        ON DELETE RESTRICT;
      END IF;

      -- locations -> expenses
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'expenses_location_id_fkey'
      ) THEN
        ALTER TABLE "expenses" 
        ADD CONSTRAINT "expenses_location_id_fkey" 
        FOREIGN KEY ("location_id") 
        REFERENCES "locations"("id") 
        ON DELETE RESTRICT;
      END IF;

      -- users -> expenses (created_by)
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'expenses_created_by_fkey'
      ) THEN
        ALTER TABLE "expenses" 
        ADD CONSTRAINT "expenses_created_by_fkey" 
        FOREIGN KEY ("created_by") 
        REFERENCES "users"("id") 
        ON DELETE RESTRICT;
      END IF;

      -- users -> expenses (approved_by)
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'expenses_approved_by_fkey'
      ) THEN
        ALTER TABLE "expenses" 
        ADD CONSTRAINT "expenses_approved_by_fkey" 
        FOREIGN KEY ("approved_by") 
        REFERENCES "users"("id") 
        ON DELETE SET NULL;
      END IF;

      -- cash_transactions -> expenses
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'expenses_cash_transaction_id_fkey'
      ) THEN
        ALTER TABLE "expenses" 
        ADD CONSTRAINT "expenses_cash_transaction_id_fkey" 
        FOREIGN KEY ("cash_transaction_id") 
        REFERENCES "cash_transactions"("id") 
        ON DELETE SET NULL;
      END IF;
    END;
    $$;
  `);

  console.log("   ✅ Expense module schema ensured");
}

async function seedExpenseCategories(tenantClient: PrismaClient) {
  console.log("   🌱 Seeding expense categories...");

  // Get existing categories using raw SQL
  const existingCategories = await tenantClient.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM "expense_categories";`,
  );
  const existingNames = new Set(existingCategories.map((c) => c.name));
  const existingNamesLower = new Set(existingCategories.map((c) => c.name.toLowerCase()));

  let created = 0;
  let skipped = 0;
  let errors = 0;

  // Seed each category
  for (const category of defaultCategories) {
    try {
      // Check if category already exists (exact match first, then case-insensitive)
      if (existingNames.has(category.name)) {
        skipped++;
        continue;
      }

      // Also check case-insensitive to avoid potential issues
      if (existingNamesLower.has(category.name.toLowerCase())) {
        skipped++;
        continue;
      }

      // Create category using raw SQL
      const categoryId = uuidv4();
      const name = escapeSql(category.name);
      const description = category.description ? `'${escapeSql(category.description)}'` : "NULL";
      const icon = category.icon ? `'${escapeSql(category.icon)}'` : "NULL";
      const color = category.color ? `'${escapeSql(category.color)}'` : "NULL";

      await tenantClient.$executeRawUnsafe(`
        INSERT INTO "expense_categories" ("id", "name", "description", "icon", "color", "is_active", "created_at", "updated_at")
        VALUES ('${categoryId}', '${name}', ${description}, ${icon}, ${color}, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      `);

      created++;
      console.log(`      ➕ Created category: ${category.name}`);
    } catch (error: any) {
      // If it's a unique constraint error, category already exists
      if (
        error.code === "23505" ||
        error.message?.includes("Unique constraint") ||
        error.message?.includes("duplicate key")
      ) {
        skipped++;
      } else {
        console.error(`      ⚠️  Error creating category "${category.name}": ${error.message}`);
        errors++;
      }
    }
  }

  console.log(`   ✅ Categories seeded: ${created} created, ${skipped} skipped, ${errors} errors`);
  return { created, skipped, errors };
}

async function seedExpensePermissions(tenantClient: PrismaClient) {
  console.log("   🔐 Seeding expense permissions...");

  let created = 0;
  let updated = 0;

  for (const permissionName of EXPENSE_PERMISSIONS) {
    const permission = PERMISSIONS[permissionName];
    if (!permission) {
      console.warn(`      ⚠️  Permission definition not found: ${permissionName}`);
      continue;
    }

    const permissionId = uuidv4();
    const name = escapeSql(permissionName);
    const description = permission.description ? `'${escapeSql(permission.description)}'` : "NULL";
    const module = escapeSql(permission.module);
    const action = escapeSql(permission.action);

    const existing = await tenantClient.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "permissions" WHERE "name" = '${name}' LIMIT 1;`,
    );

    if (existing.length === 0) {
      await tenantClient.$executeRawUnsafe(`
        INSERT INTO "permissions" ("id", "name", "description", "module", "action", "created_at")
        VALUES ('${permissionId}', '${name}', ${description}, '${module}', '${action}', CURRENT_TIMESTAMP);
      `);
      created++;
      console.log(`      ➕ Created permission: ${permissionName}`);
    } else {
      await tenantClient.$executeRawUnsafe(`
        UPDATE "permissions"
        SET "description" = ${description},
            "module" = '${module}',
            "action" = '${action}'
        WHERE "name" = '${name}';
      `);
      updated++;
      console.log(`      ✅ Updated permission: ${permissionName}`);
    }
  }

  console.log(`   ✅ Permissions seeded: ${created} created, ${updated} updated`);
  return { created, updated };
}

async function assignExpensePermissionsToRoles(tenantClient: PrismaClient) {
  console.log("   🔐 Assigning expense permissions to roles...");

  let totalAssigned = 0;

  // 1. Ensure ADMIN has all expense permissions
  console.log("      🔐 Ensuring ADMIN has all expense permissions...");
  const allExpensePerms = await tenantClient.$queryRawUnsafe<Array<{ id: string; name: string }>>(
    `SELECT id, name FROM "permissions" WHERE "name" IN (${EXPENSE_PERMISSIONS.map((p) => `'${escapeSql(p)}'`).join(", ")})`,
  );

  let adminAssigned = 0;
  for (const perm of allExpensePerms) {
    const existing = await tenantClient.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "role_permissions" 
       WHERE "role" = 'ADMIN'::"UserRole" AND "permission_id" = '${perm.id}'
       LIMIT 1;`,
    );

    if (existing.length === 0) {
      const rolePermId = uuidv4();
      await tenantClient.$executeRawUnsafe(`
        INSERT INTO "role_permissions" ("id", "role", "permission_id", "created_at")
        VALUES ('${rolePermId}', 'ADMIN'::"UserRole", '${perm.id}', CURRENT_TIMESTAMP);
      `);
      adminAssigned++;
    }
  }

  if (adminAssigned > 0) {
    console.log(`      ✅ Assigned ${adminAssigned} expense permissions to ADMIN`);
  } else {
    console.log(`      ✅ ADMIN already has all expense permissions`);
  }
  totalAssigned += adminAssigned;

  // 2. Assign permissions to other roles
  for (const [role, permissionNames] of Object.entries(EXPENSE_ROLE_PERMISSIONS)) {
    // Check if role exists in UserRole enum
    const roleCheck = await tenantClient.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = '${role}' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
      ) as exists;`,
    );

    if (!roleCheck[0]?.exists) {
      console.log(`      ⚠️  Role '${role}' does not exist in UserRole enum, skipping...`);
      continue;
    }

    let roleAssigned = 0;
    for (const permissionName of permissionNames) {
      const permResult = await tenantClient.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM "permissions" WHERE "name" = '${escapeSql(permissionName)}' LIMIT 1;`,
      );

      if (permResult.length === 0) {
        continue;
      }

      const permissionId = permResult[0].id;

      const existing = await tenantClient.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM "role_permissions" 
         WHERE "role" = '${role}'::"UserRole" AND "permission_id" = '${permissionId}'
         LIMIT 1;`,
      );

      if (existing.length === 0) {
        const rolePermId = uuidv4();
        await tenantClient.$executeRawUnsafe(`
          INSERT INTO "role_permissions" ("id", "role", "permission_id", "created_at")
          VALUES ('${rolePermId}', '${role}'::"UserRole", '${permissionId}', CURRENT_TIMESTAMP);
        `);
        roleAssigned++;
      }
    }

    if (roleAssigned > 0) {
      console.log(`      ✅ Assigned ${roleAssigned} expense permissions to role: ${role}`);
    } else {
      console.log(`      ✅ Role ${role} already has all assigned expense permissions`);
    }
    totalAssigned += roleAssigned;
  }

  console.log(`   ✅ Total role permissions assigned: ${totalAssigned}`);
  return totalAssigned;
}

async function updateTenantDatabase(tenant: {
  id: string;
  name: string;
  database_url: string;
  email?: string;
  short_tenant_id?: string;
}): Promise<{ success: boolean; error?: string }> {
  const encryption = new SimpleEncryption();

  console.log(`\n📊 Updating tenant: ${tenant.name} (${tenant.id})`);
  if (tenant.email || tenant.short_tenant_id) {
    console.log(`   Info: email=${tenant.email || "N/A"}, code=${tenant.short_tenant_id || "N/A"}`);
  }

  if (!tenant.database_url || tenant.database_url.trim() === "") {
    const msg = "Tenant database_url is empty, skipping";
    console.error(`   ❌ ${msg}`);
    return { success: false, error: msg };
  }

  // Decrypt database URL
  const decryptedUrl = encryption.decrypt(tenant.database_url);
  if (!decryptedUrl || decryptedUrl.trim() === "") {
    const msg = "Decrypted database URL is empty, skipping";
    console.error(`   ❌ ${msg}`);
    return { success: false, error: msg };
  }

  // Log database connection info (without password) for debugging
  try {
    const urlObj = new URL(decryptedUrl);
    console.log(
      `   📊 Database: ${urlObj.hostname}:${urlObj.port || 5432}/${urlObj.pathname.slice(1)}`,
    );
  } catch (e) {
    console.log(`   ⚠️  Could not parse database URL format`);
  }

  console.log(`   ✅ Obtained tenant database URL`);

  // Override DATABASE_URL only while creating PrismaClient
  const originalDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = decryptedUrl;
  const tenantClient = new PrismaClient({
    datasources: { db: { url: decryptedUrl } },
  });
  if (originalDatabaseUrl) {
    process.env.DATABASE_URL = originalDatabaseUrl;
  } else {
    delete process.env.DATABASE_URL;
  }

  try {
    console.log(`   🔌 Attempting to connect to tenant database...`);
    await tenantClient.$connect();
    console.log("   ✅ Connected to tenant database");

    // Step 1: Ensure expense module schema
    await ensureExpenseSchema(tenantClient);

    // Step 2: Seed expense categories
    await seedExpenseCategories(tenantClient);

    // Step 3: Seed expense permissions
    await seedExpensePermissions(tenantClient);

    // Step 4: Assign expense permissions to roles
    await assignExpensePermissionsToRoles(tenantClient);

    console.log(`\n   🎉 Expense module update complete for ${tenant.name}`);

    return { success: true };
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`   ❌ Update failed for tenant ${tenant.name}: ${errorMessage}`);
    console.error(error.stack);

    // Provide more detailed diagnostics for connection errors
    if (
      errorMessage.includes("Can't reach database server") ||
      errorMessage.includes("connect") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("timeout")
    ) {
      try {
        const urlObj = new URL(decryptedUrl);
        console.error(`   🔍 Connection Diagnostics:`);
        console.error(`      - Host: ${urlObj.hostname}`);
        console.error(`      - Port: ${urlObj.port || 5432}`);
        console.error(`      - Database: ${urlObj.pathname.slice(1)}`);
        console.error(`      - Possible causes:`);
        console.error(`        1. Database server is down or unreachable`);
        console.error(`        2. Network connectivity issues`);
        console.error(`        3. Database URL in master DB might be stale/incorrect`);
        console.error(`        4. Firewall blocking connection`);
      } catch (e) {
        console.error(`   🔍 Could not parse database URL for diagnostics`);
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  } finally {
    try {
      await tenantClient.$disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
  }
}

async function main() {
  console.log("🔧 All Tenants Expense Module Update");
  console.log("=====================================\n");

  if (!process.env.MASTER_DATABASE_URL) {
    console.error("❌ MASTER_DATABASE_URL is not set in environment");
    console.error("   Please set MASTER_DATABASE_URL in your .env file");
    process.exit(1);
  }

  if (!process.env.ENCRYPTION_KEY) {
    console.error("❌ ENCRYPTION_KEY is not set in environment");
    console.error("   Please set ENCRYPTION_KEY in your .env file");
    process.exit(1);
  }

  // Verify MASTER_DATABASE_URL format
  const masterDbUrl = process.env.MASTER_DATABASE_URL;
  if (!masterDbUrl.startsWith("postgresql://") && !masterDbUrl.startsWith("postgres://")) {
    console.error("❌ MASTER_DATABASE_URL must start with postgresql:// or postgres://");
    process.exit(1);
  }

  // Log connection info (without password) for debugging
  const urlObj = new URL(masterDbUrl);
  console.log(
    `📊 Master Database: ${urlObj.hostname}:${urlObj.port || 5432}/${urlObj.pathname.slice(1)}\n`,
  );

  // Temporarily override DATABASE_URL for MasterPrismaClient initialization
  const originalDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = masterDbUrl;

  const masterPrisma = new MasterPrismaClient({
    datasources: {
      db: {
        url: masterDbUrl,
      },
    },
  });

  // Restore original DATABASE_URL after creating client
  if (originalDatabaseUrl) {
    process.env.DATABASE_URL = originalDatabaseUrl;
  } else {
    delete process.env.DATABASE_URL;
  }

  try {
    console.log("🔌 Connecting to master database...");
    await masterPrisma.$connect();
    console.log("✅ Connected to master database\n");

    // Fetch ALL active tenants
    const tenants = await masterPrisma.$queryRawUnsafe<
      Array<{
        id: string;
        name: string;
        database_url: string;
        email?: string;
        short_tenant_id?: string;
      }>
    >(`
      SELECT t.id,
             t.name,
             t.database_url,
             t.email,
             t.short_tenant_id
      FROM tenants t
      WHERE t.is_active = true
        AND t.database_url IS NOT NULL
        AND TRIM(t.database_url) <> ''
      ORDER BY t.name;
    `);

    if (!tenants || tenants.length === 0) {
      console.error("❌ No active tenants found in master database");
      console.error("   Please verify tenants exist and are active");
      process.exit(1);
    }

    console.log(`✅ Found ${tenants.length} active tenant(s)\n`);

    // Track results
    const results: Array<{
      tenantName: string;
      tenantId: string;
      success: boolean;
      error?: string;
    }> = [];

    // Process each tenant
    for (let i = 0; i < tenants.length; i++) {
      const tenant = tenants[i];
      console.log(`\n[${i + 1}/${tenants.length}] Processing tenant...`);

      const result = await updateTenantDatabase(tenant);
      results.push({
        tenantName: tenant.name,
        tenantId: tenant.id,
        success: result.success,
        error: result.error,
      });
    }

    // Print summary
    console.log("\n\n=====================================");
    console.log("📊 UPDATE SUMMARY");
    console.log("=====================================\n");

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log(`✅ Successful: ${successful.length}/${results.length}`);
    if (successful.length > 0) {
      successful.forEach((r) => {
        console.log(`   ✓ ${r.tenantName} (${r.tenantId})`);
      });
    }

    console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
    if (failed.length > 0) {
      failed.forEach((r) => {
        console.log(`   ✗ ${r.tenantName} (${r.tenantId})`);
        if (r.error) {
          console.log(`     Error: ${r.error}`);
        }
      });
    }

    console.log("\n=====================================");
    if (failed.length === 0) {
      console.log("✅ All tenants updated successfully!");
    } else {
      console.log(`⚠️  ${failed.length} tenant(s) failed to update`);
      process.exitCode = 1;
    }
    console.log("=====================================");
    console.log("💡 After this, RESTART your backend server.");
    console.log("   This ensures Prisma clients pick up the new schema.\n");
  } catch (error: any) {
    console.error("\n❌ Update failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await masterPrisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Fatal error in update script:", error);
  process.exit(1);
});

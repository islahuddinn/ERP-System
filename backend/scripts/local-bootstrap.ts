/**
 * Local dev bootstrap — schema-current seed for a FRESH database.
 *
 * Creates: tenant 8549 (master) + admin user + system UOMs + a few categories/companies.
 * Matches the CURRENT prisma schema (User.password + User.tenantId, Tenant.schemaName/shortTenantId/status).
 *
 * Usage (env must be loaded):
 *   npx ts-node scripts/local-bootstrap.ts
 *
 * Login after this: admin@example.com (password from SEED_ADMIN_PASSWORD)  (tenant 8549)
 */
import { PrismaClient as MasterClient } from "@prisma/master-client";
import { PrismaClient as TenantClient } from "@prisma/tenant-client";
import * as bcrypt from "bcrypt";
import { UOM_SEED_FLAT } from "../src/uoms/utils/uom-seed-data";
import { requireSeedPassword } from "./lib/require-seed-password";

const SHORT_TENANT_ID = "8549";
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = requireSeedPassword();

async function main() {
  const master = new MasterClient({ datasources: { db: { url: process.env.MASTER_DATABASE_URL } } });
  const tenant = new TenantClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

  try {
    // 1. Tenant in master DB.
    //    NOTE: `schemaName` is used by buildClient() as the DATABASE NAME
    //    (URL pathname becomes /<schemaName>?schema=public). In this single-DB
    //    local setup the tenant tables live in the `inventory` database.
    console.log(`📦 Upserting tenant ${SHORT_TENANT_ID}...`);
    const tenantRow = await master.tenant.upsert({
      where: { shortTenantId: SHORT_TENANT_ID },
      update: { status: "ACTIVE", schemaName: "inventory" },
      create: {
        name: "Test Tenant",
        email: "tenant8549@example.com",
        shortTenantId: SHORT_TENANT_ID,
        schemaName: "inventory",
        status: "ACTIVE",
      },
    });
    const canonicalTenantId = tenantRow.id;
    console.log(`   ✅ tenant id (canonical uuid): ${canonicalTenantId}`);

    // 2. Admin user (role ADMIN bypasses permissions guard)
    console.log(`📦 Upserting admin user ${ADMIN_EMAIL}...`);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const existing = await tenant.user.findFirst({ where: { email: ADMIN_EMAIL, tenantId: canonicalTenantId } });
    if (existing) {
      await tenant.user.update({ where: { id: existing.id }, data: { password: passwordHash, status: "ACTIVE", isActive: true } });
    } else {
      await tenant.user.create({
        data: {
          email: ADMIN_EMAIL,
          password: passwordHash,
          name: "Admin",
          tenantId: canonicalTenantId,
          role: "ADMIN",
          status: "ACTIVE",
          isActive: true,
        },
      });
    }
    console.log("   ✅ admin ready");

    // 3. System UOMs
    console.log(`📦 Seeding ${UOM_SEED_FLAT.length} system UOMs...`);
    for (const uom of UOM_SEED_FLAT) {
      await tenant.uOM.upsert({
        where: { code: uom.code },
        update: { name: uom.name, symbol: uom.symbol, category: uom.category, isSystem: true },
        create: { name: uom.name, symbol: uom.symbol, code: uom.code, category: uom.category, isSystem: true, isActive: true },
      });
    }
    console.log("   ✅ UOMs seeded");

    // 4. A few companies for dropdowns
    for (const name of ["Acme Industries", "Global Supplies Co"]) {
      await tenant.company.upsert({ where: { name }, update: {}, create: { name } });
    }
    console.log("   ✅ companies seeded");

    console.log("\n✅ Bootstrap complete.");
    console.log(`   Login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}  (tenant ${SHORT_TENANT_ID})`);
  } catch (err: any) {
    console.error("❌ Bootstrap failed:", err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await master.$disconnect();
    await tenant.$disconnect();
  }
}

main();

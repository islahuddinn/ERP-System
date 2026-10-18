/**
 * Comprehensive local module test data for a tenant database.
 * Idempotent — safe to run multiple times (uses upserts / existence checks).
 *
 * Usage (from backend/):
 *   npx ts-node scripts/seed-module-test-data.ts
 *   TENANT_SHORT_ID=3991 npx ts-node scripts/seed-module-test-data.ts
 *
 * Reads DATABASE_URL from backend/.env and connects to the tenant DB named by
 * TENANT_SHORT_ID (default 3991). Do NOT paste a placeholder URL like postgresql://...@...
 */
import { readFileSync } from "fs";
import path from "path";
import { URL } from "url";
import { PrismaClient } from "@prisma/tenant-client";

const SEED_MARKER = "MODULE-TEST-SEED";

function loadEnvFile(envPath: string): Record<string, string> {
  const env: Record<string, string> = {};
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!key) continue;
    const value = rest.join("=").trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
    env[key] = value;
  }
  return env;
}

function buildTenantDatabaseUrl(baseUrl: string, tenantShortId: string): string {
  const url = new URL(baseUrl);
  url.search = "";
  url.pathname = `/${tenantShortId}`;
  url.searchParams.set("schema", "public");
  return url.toString();
}

function resolveTenantDatabaseUrl(): string {
  const envPath = path.resolve(__dirname, "../.env");
  if (!process.env.DATABASE_URL) {
    const env = loadEnvFile(envPath);
    for (const [key, value] of Object.entries(env)) {
     if (!process.env[key]) process.env[key] = value;
    }
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — add it to backend/.env");
  }

  const tenantShortId = process.env.TENANT_SHORT_ID ?? "3991";
  return buildTenantDatabaseUrl(process.env.DATABASE_URL, tenantShortId);
}

async function main() {
  const databaseUrl = resolveTenantDatabaseUrl();
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    console.log(`🌱 Seeding module test data into ${databaseUrl.split("@")[1]?.split("?")[0] ?? "tenant DB"}...\n`);

    const pieceUom = await prisma.uOM.findFirst({ where: { code: "PIECE" } });
    const kgUom = await prisma.uOM.findFirst({ where: { code: "KILOGRAM" } });
    if (!pieceUom || !kgUom) {
      throw new Error("System UOMs missing — run: npx ts-node prisma/tenant/seed/seed-uoms.ts");
    }

    const company = await prisma.company.upsert({
      where: { name: "Malind Test Company" },
      update: { isActive: true },
      create: { name: "Malind Test Company", code: "MTC001", isActive: true },
    });
    console.log("  ✅ Company");

    const location = await prisma.location.upsert({
      where: { id: "00000000-0000-0000-0000-000000000101" },
      update: { name: "Main Factory Location" },
      create: {
        id: "00000000-0000-0000-0000-000000000101",
        name: "Main Factory Location",
        address: "123 Industrial Avenue",
        city: "Lahore",
        state: "Punjab",
        country: "Pakistan",
      },
    });
    console.log("  ✅ Location");

    const productCategory = await prisma.productCategory.upsert({
      where: { name: "Finished Goods" },
      update: { status: "ACTIVE" },
      create: { name: "Finished Goods", status: "ACTIVE" },
    });

    const productBrand = await prisma.productBrand.upsert({
      where: { name: "Malind Brand" },
      update: { status: "ACTIVE" },
      create: { name: "Malind Brand", status: "ACTIVE" },
    });

    const productGroup = await prisma.productGroup.upsert({
      where: { name: "Core Products" },
      update: { status: "ACTIVE" },
      create: { name: "Core Products", status: "ACTIVE" },
    });
    console.log("  ✅ Product category / brand / group");

    let product = await prisma.product.findFirst({ where: { code: "PROD-TEST-001" } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: "Test Finished Product",
          code: "PROD-TEST-001",
          description: SEED_MARKER,
          type: "FINISHED_GOOD",
          uomId: pieceUom.id,
          categoryId: productCategory.id,
          brandId: productBrand.id,
          productGroupId: productGroup.id,
          currentStock: 500,
          sellingPrice: 250,
          costPrice: 180,
          isActive: true,
        },
      });
    }

    const extraProducts = [
      {
        code: "PROD-TEST-002",
        name: "Test Product — Low Stock",
        currentStock: 15,
        sellingPrice: 180,
        isActive: true,
      },
      {
        code: "PROD-TEST-003",
        name: "Test Product — Medium Stock",
        currentStock: 250,
        sellingPrice: 320,
        isActive: true,
      },
      {
        code: "PROD-TEST-INACTIVE",
        name: "Test Product — Inactive",
        currentStock: 0,
        sellingPrice: 100,
        isActive: false,
      },
    ];

    for (const spec of extraProducts) {
      const existing = await prisma.product.findFirst({ where: { code: spec.code } });
      if (existing) continue;
      await prisma.product.create({
        data: {
          name: spec.name,
          code: spec.code,
          description: SEED_MARKER,
          type: "FINISHED_GOOD",
          uomId: pieceUom.id,
          categoryId: productCategory.id,
          brandId: productBrand.id,
          productGroupId: productGroup.id,
          currentStock: spec.currentStock,
          sellingPrice: spec.sellingPrice,
          costPrice: Math.round(spec.sellingPrice * 0.7),
          isActive: spec.isActive,
        },
      });
    }
    console.log("  ✅ Product(s)");

    let rawMaterial = await prisma.rawMaterial.findFirst({ where: { code: "RM-TEST-001" } });
    if (!rawMaterial) {
      rawMaterial = await prisma.rawMaterial.create({
        data: {
          name: "Test Raw Material",
          code: "RM-TEST-001",
          description: SEED_MARKER,
          uomId: kgUom.id,
          currentStock: 1000,
          lastPurchasePrice: 50,
        },
      });
    }
    console.log("  ✅ Raw material");

    const site = await prisma.site.upsert({
      where: { code: "SITE-TEST-001" },
      update: { status: "ACTIVE" },
      create: {
        name: "Main Production Site",
        code: "SITE-TEST-001",
        type: "PLANT",
        category: "FINISHED_GOODS",
        status: "ACTIVE",
        locationId: location.id,
        description: SEED_MARKER,
      },
    });
    console.log("  ✅ Site");

    const plant = await prisma.plant.upsert({
      where: { code: "PLANT-TEST-001" },
      update: { isActive: true },
      create: {
        name: "Main Manufacturing Plant",
        code: "PLANT-TEST-001",
        locationId: location.id,
        plantType: "MANUFACTURING",
        capacity: "MEDIUM",
        isActive: true,
        description: SEED_MARKER,
      },
    });
    console.log("  ✅ Plant");

    const warehouse = await prisma.warehouse.upsert({
      where: { code: "WH-TEST-001" },
      update: { isActive: true, status: "ACTIVE" },
      create: {
        name: "Main Storage Warehouse",
        code: "WH-TEST-001",
        warehouseType: "STORAGE",
        locationId: location.id,
        totalCapacity: 10000,
        availableCapacity: 10000,
        usedCapacity: 0,
        status: "ACTIVE",
        isActive: true,
        description: SEED_MARKER,
      },
    });

    await prisma.warehouseZone.upsert({
      where: { warehouseId_code: { warehouseId: warehouse.id, code: "ZONE-A" } },
      update: { isActive: true },
      create: {
        warehouseId: warehouse.id,
        name: "Zone A",
        code: "ZONE-A",
        zoneType: "FINISHED_GOODS",
        totalCapacity: 5000,
        availableCapacity: 5000,
        usedCapacity: 0,
        isActive: true,
      },
    });
    console.log("  ✅ Warehouse + zone");

    const suppliers = [
      { name: "Global Steel Traders", email: "steel@example.com" },
      { name: "Apex Packaging Co", email: "apex@example.com" },
      { name: "Nile Chemicals Ltd", email: "nile@example.com" },
    ];
    for (const supplier of suppliers) {
      const existing = await prisma.supplier.findFirst({ where: { name: supplier.name } });
      if (!existing) {
        await prisma.supplier.create({
          data: {
            name: supplier.name,
            email: supplier.email,
            phone: "+92-300-0000000",
            notes: SEED_MARKER,
            isActive: true,
          },
        });
      }
    }
    console.log("  ✅ Suppliers");

    const department = await prisma.department.upsert({
      where: { name: "Operations" },
      update: {},
      create: { name: "Operations", description: SEED_MARKER },
    });

    const position = await prisma.position.upsert({
      where: { title: "Operations Manager" },
      update: {},
      create: { title: "Operations Manager", description: SEED_MARKER },
    });

    await prisma.designation.upsert({
      where: { title: "Manager" },
      update: {},
      create: { title: "Manager", description: SEED_MARKER },
    });
    console.log("  ✅ HR department / position / designation");

    let distributor = await prisma.employee.findFirst({ where: { employeeCode: "EMP-DIST-001" } });
    if (!distributor) {
      distributor = await prisma.employee.create({
        data: {
          employeeCode: "EMP-DIST-001",
          dateOfJoining: new Date("2024-01-01"),
          status: "ACTIVE",
        },
      });
    }

    const region = await prisma.region.upsert({
      where: { name: "Central Region" },
      update: { status: "ACTIVE" },
      create: { name: "Central Region", countryName: "Pakistan", status: "ACTIVE" },
    });

    const zone = await prisma.zone.upsert({
      where: { name_regionId: { name: "Lahore Zone", regionId: region.id } },
      update: { status: "ACTIVE" },
      create: { name: "Lahore Zone", regionId: region.id, status: "ACTIVE" },
    });

    const city = await prisma.city.upsert({
      where: { name_zoneId: { name: "Lahore", zoneId: zone.id } },
      update: { status: "ACTIVE" },
      create: { name: "Lahore", zoneId: zone.id, status: "ACTIVE" },
    });

    const branch = await prisma.branch.upsert({
      where: { code: "BR-TEST-001" },
      update: { status: "ACTIVE", productGroupIds: [productGroup.id] },
      create: {
        code: "BR-TEST-001",
        name: "Lahore Main Branch",
        cityId: city.id,
        distributorId: distributor.id,
        address: "45 Mall Road, Lahore",
        productGroupIds: [productGroup.id],
        status: "ACTIVE",
        type: "PRIMARY",
      },
    });

    const area = await prisma.area.upsert({
      where: { name_branchId: { name: "Garden Town", branchId: branch.id } },
      update: { status: "ACTIVE" },
      create: { name: "Garden Town", branchId: branch.id, status: "ACTIVE" },
    });
    console.log("  ✅ Sales territory (region → area)");

    const customerCategory = await prisma.customerCategory.upsert({
      where: { name: "Retail Shops" },
      update: { status: "ACTIVE" },
      create: { name: "Retail Shops", status: "ACTIVE" },
    });

    const dummyCustomers = [
      { shopName: "Meridian Retail Shop", balance: 85000 },
      { shopName: "Coastline Wholesale", balance: 62000 },
      { shopName: "Summit Distributors", balance: 48000 },
      { shopName: "Harbor Trading Co", balance: 31000 },
    ];

    let customerIndex = 0;
    for (const customer of dummyCustomers) {
      customerIndex += 1;
      const code = `CUST-TEST-${String(customerIndex).padStart(3, "0")}`;
      const existing = await prisma.customer.findFirst({ where: { code } });
      if (existing) continue;

      await prisma.customer.create({
        data: {
          code,
          shopName: customer.shopName,
          shopkeeperName: "Test Shopkeeper",
          phone: `+92300${String(customerIndex).padStart(7, "0")}`,
          email: `shop${customerIndex}@example.com`,
          cnic: `35202-${String(customerIndex).padStart(7, "0")}-1`,
          customerType: "RETAILER",
          categoryId: customerCategory.id,
          paymentMode: "CREDIT",
          address: "Test address, Lahore",
          areaId: area.id,
          remarks: SEED_MARKER,
          status: "ACTIVE",
          balance: customer.balance,
        },
      });
    }
    console.log("  ✅ Customers");

    const existingBom = await prisma.bOM.findFirst({ where: { bomNumber: "BOM-TEST-001" } });
    if (!existingBom) {
      await prisma.bOM.create({
        data: {
          bomNumber: "BOM-TEST-001",
          name: "Test Product Recipe",
          description: SEED_MARKER,
          productId: product.id,
          status: "ACTIVE",
          items: {
            create: [{ rawMaterialId: rawMaterial.id, quantityPerUnit: 2, uomId: kgUom.id }],
          },
        },
      });
    }
    console.log("  ✅ BOM");

    console.log("\n✅ Module test data seed complete.");
    console.log("   Next: npm run seed:demo-workflows  (status tabs + stock + approvable workflows)");
    console.log("   If credit/debit notes fail: npm run tenant:schema-sync  (tenant 3991)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

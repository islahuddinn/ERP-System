/// <reference types="node" />
import { PrismaClient } from "../../../node_modules/@prisma/tenant-client";
import { UOM_SEED_FLAT } from "../../../src/uoms/utils/uom-seed-data";

const DATABASE_URL = process.env.TENANT_SEED_DATABASE_URL || process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: { db: { url: DATABASE_URL } },
});

async function main() {
  console.log("🌱 Seeding system UOMs...");
  console.log(`📦 Database: ${DATABASE_URL?.split("@")[1]?.split("?")[0] ?? "unknown"}`);

  for (const uom of UOM_SEED_FLAT) {
    await prisma.uOM.upsert({
      where: { code: uom.code },
      update: { name: uom.name, symbol: uom.symbol, category: uom.category, isSystem: true },
      create: { ...uom, isSystem: true, isActive: true },
    });
  }

  console.log(`✅ Seeded ${UOM_SEED_FLAT.length} system UOMs`);
}

main()
  .catch((e) => {
    console.error("❌ UOM seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

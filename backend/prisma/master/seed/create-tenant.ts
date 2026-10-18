import { TenantStatus, TenantType, PrismaClient } from "@prisma/master-client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting master tenant seed...");

  try {
    // Create tenant with ID 8549
    const tenant = await prisma.tenant.upsert({
      where: { shortTenantId: "8549" },
      update: {},
      create: {
        id: "0898c41e-d7e2-44c9-847b-1dc46c40cff8",
        name: "Factory Distribution System",
        email: "admin@factory.com",
        phone: null,
        address: null,
        type: TenantType.SHARED,
        subdomain: "factory",
        shortTenantId: "8549",
        databaseName: "inventory",
        databaseUrl:
          "postgresql://postgres:QCt3sWRd4gmeaQOtOyAhFg==@db:5432/inventory?schema=public",
        brandingName: null,
        brandingLogoUrl: null,
        brandingLogoId: null,
        brandingUpdatedAt: null,
        status: TenantStatus.ACTIVE,
        suspensionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    });

    console.log("✅ Tenant created successfully:", tenant.shortTenantId);

    // Verify tenant exists
    const verifyTenant = await prisma.tenant.findUnique({
      where: { shortTenantId: "8549" },
    });

    if (verifyTenant) {
      console.log("✅ Tenant verification successful!");
      console.log(`   - ID: ${verifyTenant.id}`);
      console.log(`   - Name: ${verifyTenant.name}`);
      console.log(`   - Short Tenant ID: ${verifyTenant.shortTenantId}`);
      console.log(`   - Database: ${verifyTenant.databaseName}`);
    } else {
      console.log("❌ Tenant verification failed!");
    }
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("🔌 Disconnected from database");
  });

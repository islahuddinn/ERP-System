"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const master_client_1 = require("@prisma/master-client");
const prisma = new master_client_1.PrismaClient();
async function main() {
    console.log("🌱 Starting master tenant seed...");
    try {
        const tenant = await prisma.tenant.upsert({
            where: { shortTenantId: "8549" },
            update: {},
            create: {
                id: "0898c41e-d7e2-44c9-847b-1dc46c40cff8",
                name: "Factory Distribution System",
                email: "admin@factory.com",
                phone: null,
                address: null,
                type: master_client_1.ETenantType.SHARED,
                subdomain: "factory",
                shortTenantId: "8549",
                databaseName: "inventory",
                databaseUrl: "postgresql://postgres:QCt3sWRd4gmeaQOtOyAhFg==@db:5432/inventory?schema=public",
                brandingName: null,
                brandingLogoUrl: null,
                brandingLogoId: null,
                brandingUpdatedAt: null,
                status: master_client_1.ETenantStatus.ACTIVE,
                suspensionReason: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            },
        });
        console.log("✅ Tenant created successfully:", tenant.shortTenantId);
        const verifyTenant = await prisma.tenant.findUnique({
            where: { shortTenantId: "8549" },
        });
        if (verifyTenant) {
            console.log("✅ Tenant verification successful!");
            console.log(`   - ID: ${verifyTenant.id}`);
            console.log(`   - Name: ${verifyTenant.name}`);
            console.log(`   - Short Tenant ID: ${verifyTenant.shortTenantId}`);
            console.log(`   - Database: ${verifyTenant.databaseName}`);
        }
        else {
            console.log("❌ Tenant verification failed!");
        }
    }
    catch (error) {
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
//# sourceMappingURL=create-tenant.js.map
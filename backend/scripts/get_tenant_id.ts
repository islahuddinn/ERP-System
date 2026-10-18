import { PrismaClient } from "@prisma/tenant-client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.MASTER_DATABASE_URL,
    },
  },
});

async function main() {
  console.log("Checking for existing tenants...");

  let tenant = await prisma.tenant.findFirst();

  if (!tenant) {
    console.log('No tenant found. Creating "Demo Tenant"...');
    // We need a valid encrypted connection string context.
    // For simplicity in this helper, we will use a loose seed approach
    // OR just ask the user to run the seed if standard seed works.
    // But standard master seed only creates super admin.

    // We'll create a tenant with a dummy connection string that points to local inventory
    // WE MUST BE CAREFUL ABOUT ENCRYPTION.
    // If AuthService decrypts, we need to encrypt it here.
    // Since we can't easily import EncryptionService in this standalone script without Nest,
    // We will assume the user has run the setup or we guide them to the Super Admin.

    // Actually, asking the user to use "Super Admin" login might be easier if implemented?
    // But Phase 1 is "Tenant Login".

    console.log("CRITICAL: No tenant exists. You must create one.");
    console.log("Please insert a tenant manually or use the Super Admin API.");
  } else {
    console.log("------------------------------------------------");
    console.log("✅ FOUND VALID TENANT FOR TESTING");
    console.log("------------------------------------------------");
    console.log(`Tenant Name: ${tenant.name}`);
    console.log(`Tenant ID:   ${tenant.id}`);
    console.log("------------------------------------------------");
    console.log("Use this Tenant ID in your Login POST body!");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

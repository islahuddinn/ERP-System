import "dotenv/config";
import { PrismaClient } from "@prisma/master-client";

/**
 * Hard delete ALL tenants from the master database.
 *
 * WARNING: This is destructive and will cascade-delete related records
 * (subscriptions, payments, tenant migrations) because of ON DELETE CASCADE
 * relations defined in prisma/master/schema.prisma.
 *
 * Usage (PowerShell on Windows):
 *   $env:CONFIRM_DELETE_ALL_TENANTS="YES"
 *   npm run tenants:delete:hard
 *
 * Usage (bash):
 *   CONFIRM_DELETE_ALL_TENANTS=YES npm run tenants:delete:hard
 */

async function run(): Promise<void> {
  if (process.env.CONFIRM_DELETE_ALL_TENANTS !== "YES") {
    throw new Error(
      "Refusing to proceed. Set CONFIRM_DELETE_ALL_TENANTS=YES to confirm hard delete.",
    );
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$connect();

    const countBefore = await prisma.tenant.count();
    console.log(`Found ${countBefore} tenants in master DB`);
    if (countBefore === 0) {
      console.log("Nothing to delete.");
      return;
    }

    console.time("delete-tenants");
    const res = await prisma.tenant.deleteMany({});
    console.timeEnd("delete-tenants");
    console.log(`Hard-deleted ${res.count} tenants`);
  } finally {
    await PrismaClient.prototype.$disconnect.call(prisma);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

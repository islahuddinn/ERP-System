// import { PrismaClient } from "@prisma/master-client;

// const prisma = new PrismaClient();

// async function main() {
//   await prisma.tenant.upsert({
//     where: { id: 8549 },
//     update: {},
//     create: {
//       id: 8549,
//       name: "Tenant One",
//       status: true,
//       shortTenantId: "8549",
//       subdomain: "tenant-one",
//     },
//   });

//   console.log("✅ Seed completed successfully!");
// }

// main()
//   .catch((e) => {
//     console.error("❌ Seed failed:", e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });

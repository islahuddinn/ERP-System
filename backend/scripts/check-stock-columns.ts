import { PrismaClient } from "@prisma/tenant-client";

const db = new PrismaClient();

async function main() {
  const rows = await db.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stock_transactions'
    ORDER BY ordinal_position
  `;

  console.table(rows);
}

main()
  .catch((error) => {
    console.error("Error checking stock_transactions columns:", error);
  })
  .finally(async () => {
    await db.$disconnect();
  });

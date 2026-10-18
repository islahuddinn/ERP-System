const { PrismaClient } = require("@prisma/tenant-client");

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'vendor_bills',
        'vendor_payments',
        'vendor_payment_allocations',
        'customer_invoices',
        'customer_ar_payments',
        'customer_ar_payment_allocations',
        'bank_accounts',
        'bank_transactions',
        'fixed_assets',
        'depreciation_entries',
        'budgets',
        'budget_lines'
      )
    ORDER BY table_name
  `);

  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

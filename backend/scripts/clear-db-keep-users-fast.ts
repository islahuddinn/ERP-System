import { PrismaClient } from "@prisma/tenant-client";

const prisma = new PrismaClient();

async function clearDatabaseKeepUsersFast() {
  console.log("🚀 Starting database cleanup (keeping users) - Fast Mode...\n");

  try {
    // Use raw SQL for faster bulk deletes
    // Delete in order to respect foreign key constraints

    console.log("1. Deleting cash transactions...");
    await prisma.$executeRawUnsafe("DELETE FROM cash_transactions");
    console.log("   ✓ Cash transactions deleted");

    console.log("2. Deleting cash in hand records...");
    await prisma.$executeRawUnsafe("DELETE FROM cash_in_hand");
    console.log("   ✓ Cash in hand records deleted");

    console.log("3. Deleting customer payments...");
    await prisma.$executeRawUnsafe("DELETE FROM customer_payments");
    console.log("   ✓ Customer payments deleted");

    console.log("4. Deleting purchase payments...");
    await prisma.$executeRawUnsafe("DELETE FROM purchase_payments");
    console.log("   ✓ Purchase payments deleted");

    console.log("5. Deleting purchase return items...");
    await prisma.$executeRawUnsafe("DELETE FROM purchase_return_items");
    console.log("   ✓ Purchase return items deleted");

    console.log("6. Deleting purchase returns...");
    await prisma.$executeRawUnsafe("DELETE FROM purchase_returns");
    console.log("   ✓ Purchase returns deleted");

    console.log("7. Deleting purchase items...");
    await prisma.$executeRawUnsafe("DELETE FROM purchase_items");
    console.log("   ✓ Purchase items deleted");

    console.log("8. Deleting purchase orders...");
    await prisma.$executeRawUnsafe("DELETE FROM purchase_orders");
    console.log("   ✓ Purchase orders deleted");

    console.log("9. Deleting sale refunds...");
    await prisma.$executeRawUnsafe("DELETE FROM sale_refunds");
    console.log("   ✓ Sale refunds deleted");

    console.log("10. Deleting receipts...");
    await prisma.$executeRawUnsafe("DELETE FROM receipts");
    console.log("   ✓ Receipts deleted");

    console.log("11. Deleting payments...");
    await prisma.$executeRawUnsafe("DELETE FROM payments");
    console.log("   ✓ Payments deleted");

    console.log("12. Deleting sale items...");
    await prisma.$executeRawUnsafe("DELETE FROM sale_items");
    console.log("   ✓ Sale items deleted");

    console.log("13. Deleting sales...");
    await prisma.$executeRawUnsafe("DELETE FROM sales");
    console.log("   ✓ Sales deleted");

    console.log("14. Deleting held invoices...");
    await prisma.$executeRawUnsafe("DELETE FROM held_invoices");
    console.log("   ✓ Held invoices deleted");

    console.log("15. Deleting stock transactions...");
    await prisma.$executeRawUnsafe("DELETE FROM stock_transactions");
    console.log("   ✓ Stock transactions deleted");

    console.log("16. Deleting stocktakes...");
    await prisma.$executeRawUnsafe("DELETE FROM stocktakes");
    console.log("   ✓ Stocktakes deleted");

    console.log("17. Deleting stock balances...");
    await prisma.$executeRawUnsafe("DELETE FROM stock_balances");
    console.log("   ✓ Stock balances deleted");

    console.log("18. Deleting audit logs...");
    await prisma.$executeRawUnsafe("DELETE FROM audit_logs");
    console.log("   ✓ Audit logs deleted");

    console.log("19. Deleting bulk import records...");
    await prisma.$executeRawUnsafe("DELETE FROM bulk_import_records");
    console.log("   ✓ Bulk import records deleted");

    console.log("20. Deleting products...");
    await prisma.$executeRawUnsafe("DELETE FROM products");
    console.log("   ✓ Products deleted");

    console.log("21. Deleting customers...");
    await prisma.$executeRawUnsafe("DELETE FROM customers");
    console.log("   ✓ Customers deleted");

    console.log("22. Deleting suppliers...");
    await prisma.$executeRawUnsafe("DELETE FROM suppliers");
    console.log("   ✓ Suppliers deleted");

    console.log("23. Deleting locations...");
    await prisma.$executeRawUnsafe("DELETE FROM locations");
    console.log("   ✓ Locations deleted");

    console.log("24. Deleting categories...");
    await prisma.$executeRawUnsafe("DELETE FROM categories");
    console.log("   ✓ Categories deleted");

    console.log("25. Deleting companies...");
    await prisma.$executeRawUnsafe("DELETE FROM companies");
    console.log("   ✓ Companies deleted");

    console.log("26. Deleting UOMs...");
    await prisma.$executeRawUnsafe("DELETE FROM uoms");
    console.log("   ✓ UOMs deleted");

    console.log("\n✅ Database cleanup completed successfully!");
    console.log("👤 Users table preserved - all users remain intact.\n");

    // Get count of remaining users
    const userCount = await prisma.user.count();
    console.log(`📊 Total users remaining: ${userCount}`);
  } catch (error) {
    console.error("❌ Error during database cleanup:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
clearDatabaseKeepUsersFast()
  .then(() => {
    console.log("✨ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });

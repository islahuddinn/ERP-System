import { PrismaClient } from "@prisma/tenant-client";

const prisma = new PrismaClient();

async function clearDatabaseKeepUsers() {
  console.log("🚀 Starting database cleanup (keeping users)...\n");

  try {
    // Start transaction with increased timeout (60 seconds)
    await prisma.$transaction(
      async (tx) => {
        // Delete in order to respect foreign key constraints
        // Start with most dependent tables (children) and work up to parent tables

        console.log("1. Deleting cash transactions...");
        await tx.cashTransaction.deleteMany({});
        console.log("   ✓ Cash transactions deleted");

        console.log("2. Deleting cash in hand records...");
        await tx.cashInHand.deleteMany({});
        console.log("   ✓ Cash in hand records deleted");

        console.log("3. Deleting customer payments...");
        await tx.customerPayment.deleteMany({});
        console.log("   ✓ Customer payments deleted");

        console.log("4. Deleting purchase payments...");
        await tx.purchasePayment.deleteMany({});
        console.log("   ✓ Purchase payments deleted");

        console.log("5. Deleting purchase return items...");
        await tx.purchaseReturnItem.deleteMany({});
        console.log("   ✓ Purchase return items deleted");

        console.log("6. Deleting purchase returns...");
        await tx.purchaseReturn.deleteMany({});
        console.log("   ✓ Purchase returns deleted");

        console.log("7. Deleting purchase items...");
        await tx.purchaseItem.deleteMany({});
        console.log("   ✓ Purchase items deleted");

        console.log("8. Deleting purchase orders...");
        await tx.purchaseOrder.deleteMany({});
        console.log("   ✓ Purchase orders deleted");

        console.log("9. Deleting sale refunds...");
        await tx.saleRefund.deleteMany({});
        console.log("   ✓ Sale refunds deleted");

        console.log("10. Deleting receipts...");
        await tx.receipt.deleteMany({});
        console.log("   ✓ Receipts deleted");

        console.log("11. Deleting payments...");
        await tx.payment.deleteMany({});
        console.log("   ✓ Payments deleted");

        console.log("12. Deleting sale items...");
        await tx.saleItem.deleteMany({});
        console.log("   ✓ Sale items deleted");

        console.log("13. Deleting sales...");
        await tx.sale.deleteMany({});
        console.log("   ✓ Sales deleted");

        console.log("14. Deleting held invoices...");
        await tx.heldInvoice.deleteMany({});
        console.log("   ✓ Held invoices deleted");

        console.log("15. Deleting stock transactions...");
        await tx.stockTransaction.deleteMany({});
        console.log("   ✓ Stock transactions deleted");

        console.log("16. Deleting stocktakes...");
        await tx.stocktake.deleteMany({});
        console.log("   ✓ Stocktakes deleted");

        console.log("17. Deleting stock balances...");
        await tx.stockBalance.deleteMany({});
        console.log("   ✓ Stock balances deleted");

        console.log("18. Deleting audit logs...");
        await tx.auditLog.deleteMany({});
        console.log("   ✓ Audit logs deleted");

        console.log("19. Deleting bulk import records...");
        await tx.bulkImportRecord.deleteMany({});
        console.log("   ✓ Bulk import records deleted");

        console.log("20. Deleting products...");
        await tx.product.deleteMany({});
        console.log("   ✓ Products deleted");

        console.log("21. Deleting customers...");
        await tx.customer.deleteMany({});
        console.log("   ✓ Customers deleted");

        console.log("22. Deleting suppliers...");
        await tx.supplier.deleteMany({});
        console.log("   ✓ Suppliers deleted");

        console.log("23. Deleting locations...");
        await tx.location.deleteMany({});
        console.log("   ✓ Locations deleted");

        console.log("25. Deleting companies...");
        await tx.company.deleteMany({});
        console.log("   ✓ Companies deleted");

        console.log("26. Deleting UOMs...");
        await tx.uOM.deleteMany({});
        console.log("   ✓ UOMs deleted");

        console.log("\n✅ Database cleanup completed successfully!");
        console.log("👤 Users table preserved - all users remain intact.\n");
      },
      {
        maxWait: 60000, // Maximum time to wait for a transaction slot (60 seconds)
        timeout: 120000, // Maximum time the transaction can run (120 seconds / 2 minutes)
      },
    );

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
clearDatabaseKeepUsers()
  .then(() => {
    console.log("✨ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });

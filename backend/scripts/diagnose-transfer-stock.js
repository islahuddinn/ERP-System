const { PrismaClient } = require("@prisma/tenant-client");

const prisma = new PrismaClient();

async function diagnoseStock() {
  const productId = "16ed2c54-39ba-45c3-b4ff-193de809cd21";
  const warehouseId = "be65fcc9-6138-4acc-aaae-be8e89bbe17e";
  const requiredQty = 11;

  console.log("\n========================================");
  console.log("STOCK DIAGNOSTIC REPORT");
  console.log("========================================\n");
  console.log(`Product ID: ${productId}`);
  console.log(`Warehouse ID: ${warehouseId}`);
  console.log(`Required Quantity: ${requiredQty}\n`);

  // 1. Check batches
  console.log("1. CHECKING BATCHES:");
  console.log("----------------------------------------");
  const batches = await prisma.batch.findMany({
    where: {
      productId,
      warehouseId,
    },
    select: {
      id: true,
      batchNumber: true,
      quantity: true,
      consumedQuantity: true,
      availableQty: true,
      status: true,
      expiryDate: true,
      receivedDate: true,
      deletedAt: true,
      warehouseId: true,
      productId: true,
    },
    orderBy: {
      receivedDate: "asc",
    },
  });

  console.log(`Total batches found: ${batches.length}\n`);

  if (batches.length === 0) {
    console.log("❌ NO BATCHES FOUND - This is the problem!");
    console.log("   Stock must exist in batch records, not just warehouse_stock_balances.\n");
  } else {
    let totalAvailable = 0;
    let activeAvailable = 0;
    let expiredCount = 0;
    let deletedCount = 0;

    batches.forEach((batch, index) => {
      const isExpired = batch.expiryDate && new Date(batch.expiryDate) <= new Date();
      const isDeleted = batch.deletedAt !== null;
      const isActive = batch.status === "ACTIVE" && !isDeleted && !isExpired;

      console.log(`Batch ${index + 1}:`);
      console.log(`  ID: ${batch.id}`);
      console.log(`  Batch Number: ${batch.batchNumber}`);
      console.log(`  Status: ${batch.status}`);
      console.log(`  Quantity: ${batch.quantity}`);
      console.log(`  Consumed: ${batch.consumedQuantity}`);
      console.log(`  Available Qty: ${batch.availableQty}`);
      console.log(`  Expiry Date: ${batch.expiryDate || "N/A"}`);
      console.log(`  Expired: ${isExpired ? "YES ❌" : "NO ✅"}`);
      console.log(`  Deleted: ${isDeleted ? "YES ❌" : "NO ✅"}`);
      console.log(
        `  Active & Available: ${isActive && batch.availableQty > 0 ? "YES ✅" : "NO ❌"}`,
      );
      console.log("");

      totalAvailable += Number(batch.availableQty || 0);
      if (isActive && batch.availableQty > 0) {
        activeAvailable += Number(batch.availableQty || 0);
      }
      if (isExpired) expiredCount++;
      if (isDeleted) deletedCount++;
    });

    console.log(`Summary:`);
    console.log(`  Total Available (all batches): ${totalAvailable}`);
    console.log(`  Active & Non-Expired Available: ${activeAvailable}`);
    console.log(`  Expired Batches: ${expiredCount}`);
    console.log(`  Deleted Batches: ${deletedCount}`);
    console.log(
      `  Sufficient for ${requiredQty} units: ${activeAvailable >= requiredQty ? "✅ YES" : "❌ NO"}\n`,
    );
  }

  // 2. Check warehouse_stock_balances
  console.log("\n2. CHECKING WAREHOUSE_STOCK_BALANCES:");
  console.log("----------------------------------------");
  const stockBalances = await prisma.warehouseStockBalance.findMany({
    where: {
      productId,
      warehouseId,
    },
    select: {
      id: true,
      batchId: true,
      quantity: true,
      availableQuantity: true,
      reservedQuantity: true,
    },
  });

  console.log(`Total stock balance records: ${stockBalances.length}\n`);

  if (stockBalances.length === 0) {
    console.log("❌ NO STOCK BALANCE RECORDS FOUND\n");
  } else {
    let aggregateQty = 0;
    let batchQty = 0;

    stockBalances.forEach((balance, index) => {
      const isAggregate = balance.batchId === null;
      console.log(`Balance ${index + 1}:`);
      console.log(`  ID: ${balance.id}`);
      console.log(`  Batch ID: ${balance.batchId || "AGGREGATE (null)"}`);
      console.log(`  Type: ${isAggregate ? "AGGREGATE" : "BATCH-SPECIFIC"}`);
      console.log(`  Quantity: ${balance.quantity}`);
      console.log(`  Available: ${balance.availableQuantity}`);
      console.log(`  Reserved: ${balance.reservedQuantity}`);
      console.log("");

      if (isAggregate) {
        aggregateQty = balance.quantity;
      } else {
        batchQty += balance.quantity;
      }
    });

    console.log(`Summary:`);
    console.log(`  Aggregate Quantity: ${aggregateQty}`);
    console.log(`  Batch-Specific Quantity: ${batchQty}`);
    console.log(`  Total in warehouse_stock_balances: ${aggregateQty + batchQty}\n`);
  }

  // 3. Check what the stock check function would find
  console.log("\n3. SIMULATING STOCK CHECK:");
  console.log("----------------------------------------");
  const checkBatches = await prisma.batch.findMany({
    where: {
      productId,
      warehouseId,
      status: "ACTIVE",
      availableQty: { gt: 0 },
      deletedAt: null,
      OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
    },
    select: { availableQty: true },
  });

  const checkTotalAvailable = checkBatches.reduce((sum, b) => sum + Number(b.availableQty || 0), 0);

  console.log(`Batches matching stock check criteria: ${checkBatches.length}`);
  console.log(`Total available (as calculated by checkStockAvailability): ${checkTotalAvailable}`);
  console.log(`Required: ${requiredQty}`);
  console.log(
    `Result: ${checkTotalAvailable >= requiredQty ? "✅ SUFFICIENT" : "❌ INSUFFICIENT"}\n`,
  );

  // 4. Root cause analysis
  console.log("\n4. ROOT CAUSE ANALYSIS:");
  console.log("----------------------------------------");

  if (batches.length === 0) {
    console.log("❌ ROOT CAUSE: No batch records exist for this product/warehouse");
    console.log("   SOLUTION: Create batch records for existing stock\n");
  } else if (checkTotalAvailable < requiredQty) {
    if (expiredCount > 0) {
      console.log("❌ ROOT CAUSE: All batches are expired");
      console.log(`   Found ${expiredCount} expired batches`);
      console.log("   SOLUTION: Create new batches or update expiry dates\n");
    } else if (deletedCount > 0) {
      console.log("❌ ROOT CAUSE: All batches are deleted");
      console.log(`   Found ${deletedCount} deleted batches`);
      console.log("   SOLUTION: Restore batches or create new ones\n");
    } else {
      console.log("❌ ROOT CAUSE: Insufficient available quantity in active batches");
      console.log(`   Available: ${checkTotalAvailable}, Required: ${requiredQty}`);
      console.log("   SOLUTION: Add more stock to batches\n");
    }
  } else {
    console.log("✅ Stock should be available. If error persists, check:");
    console.log("   1. Warehouse ID matches exactly");
    console.log("   2. Product ID matches exactly");
    console.log("   3. Backend logs for detailed error messages\n");
  }

  await prisma.$disconnect();
}

diagnoseStock().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

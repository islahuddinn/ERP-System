/**
 * Interactive demo workflow data — one record per status/tab where possible.
 * Idempotent (skips rows that already exist by fixed demo numbers).
 *
 * Run order (from backend/):
 *   1. npx ts-node scripts/ensure-tenant-3991-demo-ready.ts
 *   2. npx ts-node scripts/seed-module-test-data.ts
 *   3. npx ts-node scripts/seed-demo-workflows.ts
 *
 *   TENANT_SHORT_ID=3991 npx ts-node scripts/seed-demo-workflows.ts
 */
import { readFileSync } from "fs";
import path from "path";
import { URL } from "url";
import {
  BOMStatus,
  BranchStockRequestStatus,
  CustomerLedgerAdjustmentType,
  CustomerLedgerEntryType,
  PrismaClient,
  ProductionOrderStatus,
  ProductAdjustmentType,
  ProductBatchStatus,
  PurchaseStatus,
  ReceivingStatus,
  ReceivingType,
  ReturnApprovalStatus,
  ReturnStatus,
} from "@prisma/tenant-client";

const DEMO_MARKER = "DEMO-WORKFLOW-SEED";
const ADMIN_EMAIL = "islahuddin.malindtech@gmail.com";
const FACTORY_MANAGER_EMAIL = "factory.manager@malindtech.com";

function loadEnvFile(envPath: string): Record<string, string> {
  const env: Record<string, string> = {};
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!key) continue;
    const value = rest.join("=").trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
    env[key] = value;
  }
  return env;
}

function buildTenantDatabaseUrl(baseUrl: string, tenantShortId: string): string {
  const url = new URL(baseUrl);
  url.search = "";
  url.pathname = `/${tenantShortId}`;
  url.searchParams.set("schema", "public");
  return url.toString();
}

function resolveTenantDatabaseUrl(): string {
  const envPath = path.resolve(__dirname, "../.env");
  if (!process.env.DATABASE_URL) {
    const env = loadEnvFile(envPath);
    for (const [key, value] of Object.entries(env)) {
      if (!process.env[key]) process.env[key] = value;
    }
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — add it to backend/.env");
  }

  const tenantShortId = process.env.TENANT_SHORT_ID ?? "3991";
  return buildTenantDatabaseUrl(process.env.DATABASE_URL, tenantShortId);
}

async function main() {
  const databaseUrl = resolveTenantDatabaseUrl();
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    console.log(
      `🌱 Seeding demo workflows into ${databaseUrl.split("@")[1]?.split("?")[0] ?? "tenant DB"}...\n`,
    );

    const adminUser = await prisma.user.findFirst({ where: { email: ADMIN_EMAIL } });
    if (!adminUser) {
      throw new Error(`Admin user not found (${ADMIN_EMAIL}) — run ensure-tenant-3991-demo-ready.ts first`);
    }

    const factoryManagerUser = await prisma.user.findFirst({ where: { email: FACTORY_MANAGER_EMAIL } });
    const adminEmployee = await prisma.employee.findFirst({ where: { userId: adminUser.id } });

    const product = await prisma.product.findFirst({ where: { code: "PROD-TEST-001" } });
    const rawMaterial = await prisma.rawMaterial.findFirst({ where: { code: "RM-TEST-001" } });
    const supplier = await prisma.supplier.findFirst({ where: { name: "Global Steel Traders" } });
    const site = await prisma.site.findFirst({ where: { code: "SITE-TEST-001" } });
    const branch = await prisma.branch.findFirst({ where: { code: "BR-TEST-001" } });
    const customer = await prisma.customer.findFirst({ where: { code: "CUST-TEST-001" } });
    const activeBom = await prisma.bOM.findFirst({ where: { bomNumber: "BOM-TEST-001" } });
    const kgUom = await prisma.uOM.findFirst({ where: { code: "KILOGRAM" } });

    const missing = [
      !product && "product PROD-TEST-001",
      !rawMaterial && "raw material RM-TEST-001",
      !supplier && "supplier",
      !site && "site",
      !branch && "branch",
      !customer && "customer CUST-TEST-001",
      !activeBom && "BOM-TEST-001",
      !kgUom && "KILOGRAM UOM",
      !adminEmployee && "admin employee",
    ].filter(Boolean);

    if (missing.length) {
      throw new Error(`Missing master data: ${missing.join(", ")} — run seed-module-test-data.ts first`);
    }

    const createdById = adminUser.id;
    const requestedById = adminEmployee!.id;

    // ── Customer credit / debit notes ───────────────────────────────────────
    const ledgerAdjustments = [
      {
        adjustmentNumber: "CN-DEMO-001",
        type: CustomerLedgerAdjustmentType.CREDIT_NOTE,
        amount: 5000,
        reason: "Demo credit note — price correction",
      },
      {
        adjustmentNumber: "DN-DEMO-001",
        type: CustomerLedgerAdjustmentType.DEBIT_NOTE,
        amount: 2500,
        reason: "Demo debit note — short delivery charge",
      },
    ] as const;

    for (const row of ledgerAdjustments) {
      const existing = await prisma.customerLedgerAdjustment.findFirst({
        where: { adjustmentNumber: row.adjustmentNumber },
      });
      if (existing) continue;

      const isCredit = row.type === CustomerLedgerAdjustmentType.CREDIT_NOTE;
      const label = isCredit ? "Credit note" : "Debit note";

      await prisma.$transaction(async (tx) => {
        const adjustment = await tx.customerLedgerAdjustment.create({
          data: {
            adjustmentNumber: row.adjustmentNumber,
            customerId: customer!.id,
            type: row.type,
            amount: row.amount,
            reason: row.reason,
            notes: DEMO_MARKER,
            createdById,
          },
        });

        await tx.customerLedger.create({
          data: {
            customerId: customer!.id,
            date: adjustment.adjustedAt,
            type: CustomerLedgerEntryType.ADJUSTMENT,
            reference: adjustment.adjustmentNumber,
            referenceId: adjustment.id,
            description: `${label} ${adjustment.adjustmentNumber} — ${row.reason}`,
            debit: isCredit ? 0 : row.amount,
            credit: isCredit ? row.amount : 0,
            notes: DEMO_MARKER,
            createdById,
          },
        });
      });
    }
    console.log("  ✅ Customer ledger adjustments (credit + debit notes)");

    // ── Product adjustments ───────────────────────────────────────────────────
    const productAdjustments = [
      {
        adjustmentNumber: "PA-DEMO-001",
        type: ProductAdjustmentType.ADDITION,
        quantity: 12,
        reason: "Demo stock addition — recount surplus",
      },
      {
        adjustmentNumber: "PA-DEMO-002",
        type: ProductAdjustmentType.DEDUCTION,
        quantity: 5,
        reason: "Demo stock deduction — damaged units",
      },
    ] as const;

    for (const row of productAdjustments) {
      const existing = await prisma.productAdjustment.findFirst({
        where: { adjustmentNumber: row.adjustmentNumber },
      });
      if (existing) continue;

      await prisma.productAdjustment.create({
        data: {
          adjustmentNumber: row.adjustmentNumber,
          customerId: customer!.id,
          productId: product!.id,
          type: row.type,
          quantity: row.quantity,
          reason: row.reason,
          notes: DEMO_MARKER,
          createdById,
        },
      });
    }
    console.log("  ✅ Product adjustments (addition + deduction)");

    // ── Draft BOM (tab filter) ────────────────────────────────────────────────
    const existingDraftBom = await prisma.bOM.findFirst({ where: { bomNumber: "BOM-DEMO-DRAFT" } });
    if (!existingDraftBom) {
      await prisma.bOM.create({
        data: {
          bomNumber: "BOM-DEMO-DRAFT",
          name: "Demo Draft Recipe",
          description: DEMO_MARKER,
          productId: product!.id,
          status: BOMStatus.DRAFT,
          items: {
            create: [{ rawMaterialId: rawMaterial!.id, quantityPerUnit: 1.5, uomId: kgUom!.id }],
          },
        },
      });
    }
    console.log("  ✅ Draft BOM (BOM-DEMO-DRAFT)");

    // ── Purchase orders — one per status tab ───────────────────────────────────
    const purchaseOrderSpecs = [
      { orderNumber: "PO-DEMO-DRAFT", status: PurchaseStatus.DRAFT, receivedQty: 0 },
      { orderNumber: "PO-DEMO-CONFIRMED", status: PurchaseStatus.CONFIRMED, receivedQty: 0 },
      { orderNumber: "PO-DEMO-PARTIAL", status: PurchaseStatus.PARTIAL, receivedQty: 50 },
      { orderNumber: "PO-DEMO-RECEIVED", status: PurchaseStatus.RECEIVED, receivedQty: 100 },
      { orderNumber: "PO-DEMO-CANCELLED", status: PurchaseStatus.CANCELLED, receivedQty: 0 },
    ] as const;

    const unitPrice = 50;
    const orderQty = 100;

    for (const spec of purchaseOrderSpecs) {
      const existing = await prisma.purchaseOrder.findFirst({ where: { orderNumber: spec.orderNumber } });
      if (existing) continue;

      await prisma.purchaseOrder.create({
        data: {
          orderNumber: spec.orderNumber,
          supplierId: supplier!.id,
          status: spec.status,
          subTotal: orderQty * unitPrice,
          totalAmount: orderQty * unitPrice,
          remarks: DEMO_MARKER,
          createdById,
          items: {
            create: [
              {
                rawMaterialId: rawMaterial!.id,
                quantity: orderQty,
                receivedQty: spec.receivedQty,
                unitPrice,
                totalPrice: orderQty * unitPrice,
              },
            ],
          },
        },
      });
    }
    console.log("  ✅ Purchase orders (draft / confirmed / partial / received / cancelled)");

    // ── GRN + raw material batch (for purchase return demo) ───────────────────
    const receivedPo = await prisma.purchaseOrder.findFirst({ where: { orderNumber: "PO-DEMO-RECEIVED" } });
    let demoGrn = await prisma.gRN.findFirst({ where: { receivingNumber: "GRN-DEMO-001" } });
    let demoBatch = await prisma.rawMaterialBatch.findFirst({ where: { batchNumber: "RMB-DEMO-001" } });

    if (receivedPo && !demoGrn) {
      demoGrn = await prisma.gRN.create({
        data: {
          receivingNumber: "GRN-DEMO-001",
          status: ReceivingStatus.COMPLETED,
          receivingType: ReceivingType.PURCHASE_ORDER,
          receivedDate: new Date(),
          purchaseOrderId: receivedPo.id,
          notes: DEMO_MARKER,
          createdById,
          items: {
            create: [
              {
                rawMaterialId: rawMaterial!.id,
                uomId: kgUom!.id,
                expectedQuantity: orderQty,
                receivedQuantity: orderQty,
              },
            ],
          },
        },
      });
    }

    if (demoGrn && !demoBatch) {
      const grnItem = await prisma.gRNItem.findFirst({ where: { grnId: demoGrn.id } });
      if (grnItem) {
        demoBatch = await prisma.rawMaterialBatch.create({
          data: {
            batchNumber: "RMB-DEMO-001",
            rawMaterialId: rawMaterial!.id,
            grnItemId: grnItem.id,
            siteId: site!.id,
            receivedQuantity: orderQty,
            availableQuantity: 80,
            reservedQuantity: 20,
            unitCost: unitPrice,
            receivedDate: new Date(),
            createdById,
            notes: DEMO_MARKER,
          },
        });
      }
    }
    console.log("  ✅ GRN + raw material batch (for returns)");

    // ── Purchase return — DRAFT with pending factory-manager approval ─────────
    const existingReturn = await prisma.purchaseReturn.findFirst({ where: { returnNumber: "PR-DEMO-001" } });
    if (!existingReturn && receivedPo && demoGrn && demoBatch && factoryManagerUser) {
      const returnQty = 20;
      const returnTotal = returnQty * unitPrice;
      const purchaseItem = await prisma.purchaseItem.findFirst({
        where: { purchaseOrderId: receivedPo.id },
      });
      const grnItem = await prisma.gRNItem.findFirst({ where: { grnId: demoGrn.id } });

      await prisma.$transaction(async (tx) => {
        const purchaseReturn = await tx.purchaseReturn.create({
          data: {
            returnNumber: "PR-DEMO-001",
            purchaseOrderId: receivedPo.id,
            grnId: demoGrn!.id,
            reason: "Demo return — quality issue (approve as factory manager)",
            remarks: DEMO_MARKER,
            totalAmount: returnTotal,
            status: ReturnStatus.DRAFT,
            createdById,
          },
        });

        await tx.purchaseReturnItem.create({
          data: {
            returnId: purchaseReturn.id,
            rawMaterialId: rawMaterial!.id,
            batchId: demoBatch!.id,
            grnItemId: grnItem?.id ?? null,
            purchaseItemId: purchaseItem?.id ?? null,
            quantity: returnQty,
            unitPrice,
            totalPrice: returnTotal,
            reason: "Demo batch rejection",
          },
        });

        await tx.purchaseReturnApproval.create({
          data: {
            returnId: purchaseReturn.id,
            approverId: factoryManagerUser.id,
            status: ReturnApprovalStatus.PENDING,
          },
        });

        await tx.rawMaterialBatch.update({
          where: { id: demoBatch!.id },
          data: { reservedQuantity: { increment: returnQty } },
        });
      });
    }
    console.log("  ✅ Purchase return PR-DEMO-001 (pending approval — log in as factory manager)");

    // ── Production orders — one per status tab ────────────────────────────────
    const productionSpecs = [
      { orderNumber: "PRO-DEMO-DRAFT", status: ProductionOrderStatus.DRAFT, producedQuantity: 0 },
      {
        orderNumber: "PRO-DEMO-IN-PROGRESS",
        status: ProductionOrderStatus.IN_PROGRESS,
        producedQuantity: 40,
        startedAt: new Date(),
      },
      {
        orderNumber: "PRO-DEMO-COMPLETED",
        status: ProductionOrderStatus.COMPLETED,
        producedQuantity: 100,
        startedAt: new Date(Date.now() - 86400000),
        completedAt: new Date(),
      },
      { orderNumber: "PRO-DEMO-CANCELLED", status: ProductionOrderStatus.CANCELLED, producedQuantity: 0 },
    ] as const;

    let completedProductionOrderId: string | null = null;

    for (const spec of productionSpecs) {
      const existing = await prisma.productionOrder.findFirst({ where: { orderNumber: spec.orderNumber } });
      if (existing) {
        if (spec.status === ProductionOrderStatus.COMPLETED) completedProductionOrderId = existing.id;
        continue;
      }

      const created = await prisma.productionOrder.create({
        data: {
          orderNumber: spec.orderNumber,
          productId: product!.id,
          bomId: activeBom!.id,
          siteId: site!.id,
          plannedQuantity: 100,
          producedQuantity: spec.producedQuantity,
          status: spec.status,
          startedAt: "startedAt" in spec ? spec.startedAt : null,
          completedAt: "completedAt" in spec ? spec.completedAt : null,
          notes: DEMO_MARKER,
          createdById,
        },
      });

      if (spec.status === ProductionOrderStatus.COMPLETED) {
        completedProductionOrderId = created.id;
      }
    }
    console.log("  ✅ Production orders (draft / in progress / completed / cancelled)");

    // ── Product batches — lifecycle statuses for tab filters ──────────────────
    if (completedProductionOrderId) {
      const batchSpecs = [
        {
          batchNumber: "PB-DEMO-ACTIVE",
          availableQuantity: 100,
          consumedQuantity: 0,
          status: ProductBatchStatus.ACTIVE,
        },
        {
          batchNumber: "PB-DEMO-PARTIAL",
          availableQuantity: 60,
          consumedQuantity: 40,
          status: ProductBatchStatus.PARTIAL,
        },
        {
          batchNumber: "PB-DEMO-CONSUMED",
          availableQuantity: 0,
          consumedQuantity: 100,
          status: ProductBatchStatus.CONSUMED,
        },
      ] as const;

      for (const spec of batchSpecs) {
        const existing = await prisma.productBatch.findFirst({ where: { batchNumber: spec.batchNumber } });
        if (existing) continue;

        await prisma.productBatch.create({
          data: {
            batchNumber: spec.batchNumber,
            productId: product!.id,
            siteId: site!.id,
            productionOrderId: completedProductionOrderId,
            currentStage: "Finished",
            isFinal: true,
            quantity: spec.availableQuantity + spec.consumedQuantity,
            availableQuantity: spec.availableQuantity,
            consumedQuantity: spec.consumedQuantity,
            costPerUnit: 180,
            salePrice: 250,
            status: spec.status,
            notes: DEMO_MARKER,
            createdById,
          },
        });
      }
      console.log("  ✅ Product batches (active / partial / consumed)");
    }

    // ── Branch stock request — PENDING (approve as factory manager) ───────────
    const existingRequest = await prisma.branchStockRequest.findFirst({
      where: { requestNumber: "BSR-DEMO-001" },
    });
    if (!existingRequest) {
      await prisma.branchStockRequest.create({
        data: {
          requestNumber: "BSR-DEMO-001",
          requesterBranchId: branch!.id,
          fulfillerBranchId: null,
          status: BranchStockRequestStatus.PENDING,
          requestedById,
          notes: DEMO_MARKER,
          items: {
            create: [
              {
                productId: product!.id,
                quantity: 50,
                unitPrice: product!.sellingPrice ?? 250,
                totalAmount: 50 * (product!.sellingPrice ?? 250),
              },
            ],
          },
        },
      });
    }
    console.log("  ✅ Branch stock request BSR-DEMO-001 (pending — approve as factory manager)");

    // ── Warehouse / factory / branch stock (all warehouses + active products) ─
    const warehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      include: { zones: { where: { isActive: true }, orderBy: { code: "asc" } } },
      orderBy: { code: "asc" },
    });

    const activeProducts = await prisma.product.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { code: "asc" },
    });

    let warehouseBalanceCount = 0;
    let factoryBalanceCount = 0;
    let branchBalanceCount = 0;

    for (let productIndex = 0; productIndex < activeProducts.length; productIndex++) {
      const activeProduct = activeProducts[productIndex];
      let warehouseTotal = 0;
      let factoryQty = 150 + productIndex * 40;

      for (let warehouseIndex = 0; warehouseIndex < warehouses.length; warehouseIndex++) {
        const warehouse = warehouses[warehouseIndex];
        const zone = warehouse.zones[0] ?? null;
        const quantity = 40 + productIndex * 12 + warehouseIndex * 30;
        const reservedQuantity = warehouseIndex === 0 ? Math.min(5, quantity) : 0;
        const availableQuantity = quantity - reservedQuantity;
        warehouseTotal += quantity;

        const existingBalance = await prisma.warehouseStockBalance.findFirst({
          where: {
            warehouseId: warehouse.id,
            productId: activeProduct.id,
            zoneId: zone?.id ?? null,
            batchId: null,
          },
        });

        if (existingBalance) {
          await prisma.warehouseStockBalance.update({
            where: { id: existingBalance.id },
            data: { quantity, reservedQuantity, availableQuantity },
          });
        } else {
          await prisma.warehouseStockBalance.create({
            data: {
              warehouseId: warehouse.id,
              zoneId: zone?.id ?? null,
              productId: activeProduct.id,
              quantity,
              reservedQuantity,
              availableQuantity,
            },
          });
        }
        warehouseBalanceCount += 1;
      }

      await prisma.factoryStockBalance.upsert({
        where: { productId: activeProduct.id },
        update: { quantity: factoryQty },
        create: { productId: activeProduct.id, quantity: factoryQty },
      });
      factoryBalanceCount += 1;

      if (branch) {
        const branchQty = 25 + productIndex * 8;
        await prisma.branchStockBalance.upsert({
          where: { branchId_productId: { branchId: branch.id, productId: activeProduct.id } },
          update: { quantity: branchQty },
          create: { branchId: branch.id, productId: activeProduct.id, quantity: branchQty },
        });
        branchBalanceCount += 1;
      }

      await prisma.product.update({
        where: { id: activeProduct.id },
        data: { currentStock: warehouseTotal + factoryQty },
      });
    }

    const rawMaterials = await prisma.rawMaterial.findMany();
    for (let index = 0; index < rawMaterials.length; index++) {
      const material = rawMaterials[index];
      const stock = 500 + index * 250;
      await prisma.rawMaterial.update({
        where: { id: material.id },
        data: { currentStock: stock },
      });
    }

    console.log(
      `  ✅ Inventory stock (${warehouseBalanceCount} warehouse balances, ${factoryBalanceCount} factory, ${branchBalanceCount} branch, ${rawMaterials.length} raw materials)`,
    );

    console.log("\n✅ Demo workflow seed complete.");
    console.log("   Interactive items:");
    console.log("   • Purchase return PR-DEMO-001 → approve/reject (factory.manager@malindtech.com)");
    console.log("   • Branch stock request BSR-DEMO-001 → approve (factory manager)");
    console.log("   • Purchase orders / production / BOM / adjustments → browse each status tab");
    console.log("\n   Log out and back in after seeding if lists look stale.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Demo workflow seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

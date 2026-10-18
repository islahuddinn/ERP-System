import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/tenant-client";

@Injectable()
export class InventoryReportsService {
  private readonly logger = new Logger(InventoryReportsService.name);

  async getValuation(tenantClient: PrismaClient, method: "FIFO" | "MOVING_AVG" = "MOVING_AVG") {
    // Get all products with stock
    const stockBalances = await tenantClient.stockBalance.findMany({
      include: {
        product: true,
        location: true,
      },
    });

    const valuationData = [];

    for (const balance of stockBalances) {
      const quantity = Number(balance.quantity);
      if (quantity <= 0) continue;

      let unitCost = 0;
      let totalValue = 0;

      if (method === "MOVING_AVG") {
        // Use product's cost price (moving average)
        unitCost = Number(balance.product.sellingPrice || 0);
        totalValue = unitCost * quantity;
      } else {
        // FIFO: Get latest purchase cost from stock ledger
        const latestLedger = await tenantClient.stockLedger.findFirst({
          where: {
            productId: balance.productId,
            transactionType: "IN",
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        if (latestLedger) {
          // Calculate average cost from recent purchases
          const purchaseLedgers = await tenantClient.stockLedger.findMany({
            where: {
              productId: balance.productId,
              transactionType: "IN",
              createdAt: {
                gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 10,
          });

          if (purchaseLedgers.length > 0) {
            // Get cost from financial events for these purchases
            const totalCost = await tenantClient.financialEvent.aggregate({
              where: {
                productId: balance.productId,
                type: "COST_PURCHASE",
                createdAt: {
                  gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                },
              },
              _sum: {
                amount: true,
              },
            });

            const totalQty = purchaseLedgers.reduce((sum, l) => sum + Number(l.quantity), 0);
            unitCost =
              totalQty > 0
                ? Number(totalCost._sum.amount || 0) / totalQty
                : Number(balance.product.sellingPrice || 0);
          } else {
            unitCost = Number(balance.product.sellingPrice || 0);
          }
        } else {
          unitCost = Number(balance.product.sellingPrice || 0);
        }

        totalValue = unitCost * quantity;
      }

      valuationData.push({
        productId: balance.productId,
        product: balance.product,
        locationId: balance.locationId,
        location: balance.location,
        quantity,
        unitCost,
        totalValue,
        valuationMethod: method,
      });
    }

    const totalStockValue = valuationData.reduce((sum, item) => sum + item.totalValue, 0);

    return {
      valuationData,
      totalStockValue,
      totalItems: valuationData.length,
      valuationMethod: method,
    };
  }

  async getStockAging(tenantClient: PrismaClient) {
    // Get products with batches and their ages
    const batches = await tenantClient.rawMaterialBatch.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
      },
      include: {
        rawMaterial: true,
      },
      orderBy: {
        receivedDate: "asc",
      },
    });

    const agingData = [];

    for (const batch of batches) {
      const receivedDate = batch.receivedDate;
      const ageInDays = Math.floor((Date.now() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));

      let ageCategory = "NEW";
      if (ageInDays > 180) ageCategory = "OLD";
      else if (ageInDays > 90) ageCategory = "AGING";
      else if (ageInDays > 30) ageCategory = "MATURE";

      agingData.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        rawMaterialId: batch.rawMaterialId,
        rawMaterial: batch.rawMaterial,
        quantity: Number(batch.availableQuantity),
        receivedDate,
        ageInDays,
        ageCategory,
        expiryDate: batch.expiryDate,
        daysToExpiry: batch.expiryDate
          ? Math.floor((batch.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
      });
    }

    return {
      agingData,
      summary: {
        new: agingData.filter((a) => a.ageCategory === "NEW").length,
        mature: agingData.filter((a) => a.ageCategory === "MATURE").length,
        aging: agingData.filter((a) => a.ageCategory === "AGING").length,
        old: agingData.filter((a) => a.ageCategory === "OLD").length,
      },
    };
  }

  async getStockSnapshot(tenantClient: PrismaClient, date?: string) {
    const snapshotDate = date ? new Date(date) : new Date();
    snapshotDate.setHours(23, 59, 59, 999);

    // Get stock balances at the snapshot date
    const stockLedgers = await tenantClient.stockLedger.findMany({
      where: {
        createdAt: {
          lte: snapshotDate,
        },
      },
      include: {
        product: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Calculate closing quantities for each product
    const productStockMap = new Map<string, any>();

    for (const ledger of stockLedgers) {
      const productId = ledger.productId;
      if (!productStockMap.has(productId)) {
        productStockMap.set(productId, {
          productId,
          product: ledger.product,
          openingQty: Number(ledger.openingQty || 0),
          closingQty: Number(ledger.closingQty || 0),
          transactions: [],
        });
      }

      const stock = productStockMap.get(productId)!;
      stock.closingQty = Number(ledger.closingQty || 0);
      stock.transactions.push({
        date: ledger.createdAt,
        type: ledger.transactionType,
        quantity: Number(ledger.quantity),
        referenceType: ledger.referenceType,
        referenceId: ledger.referenceId,
      });
    }

    return {
      snapshotDate,
      products: Array.from(productStockMap.values()),
      totalProducts: productStockMap.size,
      totalStockValue: Array.from(productStockMap.values()).reduce(
        (sum, p) => sum + Number(p.product.sellingPrice || 0) * p.closingQty,
        0,
      ),
    };
  }
}

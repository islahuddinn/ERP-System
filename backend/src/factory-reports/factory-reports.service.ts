import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/tenant-client";
import PDFDocument from "pdfkit";

@Injectable()
export class FactoryReportsService {
  private readonly logger = new Logger(FactoryReportsService.name);

  async getProductionReport(
    tenantClient: PrismaClient,
    tenantId: string,
    startDate?: string,
    endDate?: string,
    siteId?: string,
  ) {
    const where: Prisma.ProductionOrderWhereInput = {};

    if (siteId) {
      where.siteId = siteId;
    }

    if (startDate || endDate) {
      where.completedAt = {};
      if (startDate) where.completedAt.gte = new Date(startDate);
      if (endDate) where.completedAt.lte = new Date(endDate);
    }

    const orders = await tenantClient.productionOrder.findMany({
      where,
      include: {
        product: true,
        site: true,
      },
      orderBy: {
        completedAt: "desc",
      },
    });

    return orders.map((order) => ({
      id: order.id,
      date: order.completedAt || order.createdAt,
      orderNumber: order.orderNumber,
      productName: order.product.name,
      plannedQty: order.plannedQuantity,
      producedQty: order.producedQuantity,
      status: order.status,
      site: order.site?.name,
    }));
  }

  async getMaterialReport(
    tenantClient: PrismaClient,
    tenantId: string,
    startDate?: string,
    endDate?: string,
    plantId?: string,
  ) {
    const where: Prisma.MaterialRequestWhereInput = {
      tenantId,
      status: "FULFILLED",
    };

    if (plantId) {
      where.plantId = plantId;
    }

    if (startDate || endDate) {
      where.fulfilledDate = {};
      if (startDate) where.fulfilledDate.gte = new Date(startDate);
      if (endDate) where.fulfilledDate.lte = new Date(endDate);
    }

    const requests = await tenantClient.materialRequest.findMany({
      where,
      include: {
        items: {
          include: {
            material: {
              include: {
                uom: {
                  select: {
                    symbol: true,
                  },
                },
              },
            },
          },
        },
        plant: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        fulfilledDate: "desc",
      },
    });

    const materialMap = new Map<string, any>();

    for (const request of requests) {
      for (const item of request.items) {
        const materialId = item.materialId;
        const quantityUsed = Number(item.fulfilledQuantity || item.approvedQuantity || 0);
        const costPrice = Number(item.material.sellingPrice || 0);
        const totalCost = quantityUsed * costPrice;

        if (!materialMap.has(materialId)) {
          // Calculate scrap rate from waste records for this material
          const wasteRecords = await tenantClient.wasteManagement.findMany({
            where: {
              rawMaterialId: materialId,
              createdAt: {
                gte: request.fulfilledDate || request.requiredDate,
              },
              deletedAt: null,
            },
            select: {
              quantity: true,
            },
          });

          const wasteQty = wasteRecords.reduce((sum, w) => sum + Number(w.quantity || 0), 0);
          const scrapRate = quantityUsed > 0 ? (wasteQty / quantityUsed) * 100 : 0;

          materialMap.set(materialId, {
            id: materialId,
            date: request.fulfilledDate || request.requiredDate,
            materialName: item.material.name,
            materialSku: item.material.code || "N/A",
            batchNumber: null, // Can be enhanced with batch tracking
            quantityUsed,
            uom: item.material.uom?.symbol || "KG",
            scrapRate,
            totalCost,
            plant: request.plant?.name || "N/A",
            requestNumber: request.requestNumber,
          });
        } else {
          const existing = materialMap.get(materialId)!;
          existing.quantityUsed += quantityUsed;
          existing.totalCost += totalCost;

          // Recalculate scrap rate
          const wasteRecords = await tenantClient.wasteManagement.findMany({
            where: {
              rawMaterialId: materialId,
              createdAt: {
                gte: existing.date,
              },
              deletedAt: null,
            },
            select: {
              quantity: true,
            },
          });
          const wasteQty = wasteRecords.reduce((sum, w) => sum + Number(w.quantity || 0), 0);
          existing.scrapRate =
            existing.quantityUsed > 0 ? (wasteQty / existing.quantityUsed) * 100 : 0;
        }
      }
    }

    return Array.from(materialMap.values());
  }

  async getQualityReport(
    tenantClient: PrismaClient,
    tenantId: string,
    startDate?: string,
    endDate?: string,
    plantId?: string,
  ) {
    const where: Prisma.QualityControlWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (startDate || endDate) {
      where.inspectedDate = {};
      if (startDate) where.inspectedDate.gte = new Date(startDate);
      if (endDate) where.inspectedDate.lte = new Date(endDate);
    }

    const inspections = await tenantClient.qualityControl.findMany({
      where,
      include: {
        product: {
          select: {
            name: true,
            code: true,
          },
        },
        rawMaterialBatch: {
          select: {
            batchNumber: true,
          },
        },
      },
      orderBy: {
        inspectedDate: "desc",
      },
    });

    return inspections.map((inspection) => ({
      id: inspection.id,
      date: inspection.inspectedDate,
      inspectionNumber: inspection.inspectionNumber,
      batchId: inspection.batchId,
      productId: inspection.productId,
      inspectionType: inspection.inspectionType,
      qualityStatus: inspection.qualityStatus,
      results: inspection.results,
      observations: inspection.observations || [],
      inspectedById: inspection.inspectedById,
      passRate:
        inspection.qualityStatus === "PASSED"
          ? 100
          : inspection.qualityStatus === "CONDITIONAL"
            ? 50
            : 0,
    }));
  }

  async getWasteReport(
    tenantClient: PrismaClient,
    tenantId: string,
    startDate?: string,
    endDate?: string,
    plantId?: string,
  ) {
    const where: Prisma.WasteManagementWhereInput = {
      deletedAt: null,
    };

    if (plantId) {
      where.siteId = plantId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const wasteRecords = await tenantClient.wasteManagement.findMany({
      where,
      include: {
        product: true,
        rawMaterial: true,
        site: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return wasteRecords.map((waste) => ({
      id: waste.id,
      date: waste.createdAt,
      wasteNumber: waste.wasteNumber,
      wasteType: waste.wasteType,
      itemType: waste.itemType,
      productName: waste.product?.name || waste.rawMaterial?.name || "N/A",
      quantity: waste.quantity,
      cost: Number(waste.cost),
      reason: waste.reason,
      status: waste.status,
      site: waste.site?.name || "N/A",
    }));
  }

  async getWarehouseReport(
    tenantClient: PrismaClient,
    tenantId: string,
    startDate?: string,
    endDate?: string,
    warehouseId?: string,
  ) {
    // Get warehouse stock balances for current stock levels
    const stockBalanceWhere: Prisma.WarehouseStockBalanceWhereInput = {};
    if (warehouseId) {
      stockBalanceWhere.warehouseId = warehouseId;
    }

    const stockBalances = await tenantClient.warehouseStockBalance.findMany({
      where: stockBalanceWhere,
      include: {
        product: {
          select: {
            name: true,
            code: true,
          },
        },
        warehouse: {
          select: {
            name: true,
            code: true,
            totalCapacity: true,
            usedCapacity: true,
            availableCapacity: true,
          },
        },
      },
    });

    // Get stock ledger movements for the date range
    const ledgerWhere: Prisma.StockLedgerWhereInput = {};
    if (warehouseId) {
      ledgerWhere.warehouseId = warehouseId;
    }
    if (startDate || endDate) {
      ledgerWhere.createdAt = {};
      if (startDate) ledgerWhere.createdAt.gte = new Date(startDate);
      if (endDate) ledgerWhere.createdAt.lte = new Date(endDate);
    }

    const ledgers = await tenantClient.stockLedger.findMany({
      where: ledgerWhere,
      include: {
        product: {
          select: {
            name: true,
            code: true,
          },
        },
        warehouse: {
          select: {
            name: true,
            code: true,
            totalCapacity: true,
            usedCapacity: true,
            availableCapacity: true,
          },
        },
        zone: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group by warehouse and product
    const warehouseProductMap = new Map<string, any>();
    const warehouseStockTotals = new Map<string, number>(); // Track total stock per warehouse

    // First pass: Calculate total stock per warehouse
    for (const balance of stockBalances) {
      const warehouseId = balance.warehouseId;
      const currentStock = Number(balance.availableQuantity || 0);
      const existingTotal = warehouseStockTotals.get(warehouseId) || 0;
      warehouseStockTotals.set(warehouseId, existingTotal + currentStock);
    }

    // Initialize with current stock balances
    for (const balance of stockBalances) {
      const key = `${balance.warehouseId}-${balance.productId}`;
      if (!warehouseProductMap.has(key)) {
        const currentStock = Number(balance.availableQuantity || 0);
        const totalCapacity = Number(balance.warehouse?.totalCapacity || 0);
        const usedCapacity = Number(balance.warehouse?.usedCapacity || 0);

        // Calculate utilization: prefer usedCapacity if available, otherwise use sum of stock levels
        let capacityUtilization = 0;
        if (totalCapacity > 0) {
          if (usedCapacity > 0) {
            // Use warehouse's tracked used capacity
            capacityUtilization = (usedCapacity / totalCapacity) * 100;
          } else {
            // Fallback: calculate from actual stock totals
            const totalStock = warehouseStockTotals.get(balance.warehouseId) || 0;
            capacityUtilization = (totalStock / totalCapacity) * 100;
          }
        }

        warehouseProductMap.set(key, {
          id: key,
          date: new Date(),
          location: balance.warehouse?.name || "Unknown",
          locationCode: balance.warehouse?.code || "N/A",
          item: balance.product.name,
          itemSku: balance.product.code || "N/A",
          zone: null,
          incoming: 0,
          outgoing: 0,
          stockLevel: currentStock,
          capacityUtilization: Math.min(100, Math.max(0, capacityUtilization)), // Clamp between 0-100
        });
      }
    }

    // Aggregate movements and update warehouse stock totals
    for (const ledger of ledgers) {
      const warehouseId = ledger.warehouseId || "unknown";
      if (warehouseId !== "unknown") {
        const currentStock = Number(ledger.closingQty || 0);
        const existingTotal = warehouseStockTotals.get(warehouseId) || 0;
        warehouseStockTotals.set(warehouseId, existingTotal + currentStock);
      }
    }

    // Aggregate movements
    for (const ledger of ledgers) {
      const key = `${ledger.warehouseId || "unknown"}-${ledger.productId}`;
      if (!warehouseProductMap.has(key)) {
        const currentStock = Number(ledger.closingQty || 0);
        const totalCapacity = Number(ledger.warehouse?.totalCapacity || 0);
        const usedCapacity = Number(ledger.warehouse?.usedCapacity || 0);

        // Calculate utilization: prefer usedCapacity if available, otherwise use sum of stock levels
        let capacityUtilization = 0;
        if (totalCapacity > 0) {
          if (usedCapacity > 0) {
            // Use warehouse's tracked used capacity
            capacityUtilization = (usedCapacity / totalCapacity) * 100;
          } else {
            // Fallback: calculate from actual stock totals
            const totalStock = warehouseStockTotals.get(ledger.warehouseId || "unknown") || 0;
            capacityUtilization = (totalStock / totalCapacity) * 100;
          }
        }

        warehouseProductMap.set(key, {
          id: key,
          date: ledger.createdAt,
          location: ledger.warehouse?.name || "Unknown",
          locationCode: ledger.warehouse?.code || "N/A",
          item: ledger.product.name,
          itemSku: ledger.product.code || "N/A",
          zone: ledger.zone?.name || null,
          incoming: 0,
          outgoing: 0,
          stockLevel: currentStock,
          capacityUtilization: Math.min(100, Math.max(0, capacityUtilization)), // Clamp between 0-100
        });
      }

      const stats = warehouseProductMap.get(key)!;
      const qty = Math.abs(Number(ledger.quantity));

      if (ledger.transactionType === "IN" || ledger.transactionType === "TRANSFER_IN") {
        stats.incoming += qty;
      } else if (ledger.transactionType === "OUT" || ledger.transactionType === "TRANSFER_OUT") {
        stats.outgoing += qty;
      }

      // Update stock level to latest
      if (ledger.closingQty !== null) {
        stats.stockLevel = Number(ledger.closingQty);
      }

      // Update utilization if warehouse capacity is available
      if (ledger.warehouse) {
        const totalCapacity = Number(ledger.warehouse.totalCapacity || 0);
        const usedCapacity = Number(ledger.warehouse.usedCapacity || 0);
        if (totalCapacity > 0) {
          if (usedCapacity > 0) {
            stats.capacityUtilization = Math.min(
              100,
              Math.max(0, (usedCapacity / totalCapacity) * 100),
            );
          } else {
            // Fallback: recalculate from stock totals
            const totalStock = warehouseStockTotals.get(ledger.warehouseId || "unknown") || 0;
            stats.capacityUtilization = Math.min(
              100,
              Math.max(0, (totalStock / totalCapacity) * 100),
            );
          }
        }
      }
    }

    return Array.from(warehouseProductMap.values());
  }

  async getCostingReport(
    tenantClient: PrismaClient,
    tenantId: string,
    startDate?: string,
    endDate?: string,
    siteId?: string,
  ) {
    const where: Prisma.ProductionOrderWhereInput = {
      status: "COMPLETED",
    };

    if (siteId) {
      where.siteId = siteId;
    }

    if (startDate || endDate) {
      where.completedAt = {};
      if (startDate) where.completedAt.gte = new Date(startDate);
      if (endDate) where.completedAt.lte = new Date(endDate);
    }

    const orders = await tenantClient.productionOrder.findMany({
      where,
      include: {
        product: true,
        site: true,
        materials: true,
      },
    });

    const costingData = [];

    for (const order of orders) {
      const materialCost = order.materials.reduce(
        (sum, material) => sum + Number(material.actualCost || material.estimatedCost),
        0,
      );
      const productionCost = Number(order.additionalCost) + Number(order.wasteInputCost);
      const totalCost = Number(order.totalCost);
      const unitCost =
        order.producedQuantity > 0 ? totalCost / order.producedQuantity : Number(order.costPerUnit || 0);

      costingData.push({
        id: order.id,
        orderNumber: order.orderNumber,
        productName: order.product.name,
        site: order.site?.name,
        quantity: order.producedQuantity,
        materialCost,
        productionCost,
        totalCost,
        unitCost,
        date: order.completedAt || order.createdAt,
      });
    }

    return costingData;
  }

  /**
   * Generate PDF for production report
   */
  async generateProductionReportPDF(
    tenantClient: PrismaClient,
    tenantId: string,
    startDate?: string,
    endDate?: string,
    plantId?: string,
  ): Promise<Buffer> {
    const data = await this.getProductionReport(
      tenantClient,
      tenantId,
      startDate,
      endDate,
      plantId,
    );

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header
      doc.fontSize(20).text("Production Report", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, {
        align: "center",
      });
      doc.moveDown(2);

      // Table header
      const tableTop = doc.y;
      const colWidths = [80, 100, 120, 60, 60, 60, 80];
      const headers = ["Date", "Order #", "Product", "Planned", "Produced", "Efficiency", "Status"];

      doc.fontSize(10).font("Helvetica-Bold");
      let x = 50;
      headers.forEach((header, i) => {
        doc.text(header, x, tableTop);
        x += colWidths[i];
      });

      // Table rows
      doc.font("Helvetica").fontSize(9);
      let y = tableTop + 20;
      data.forEach((row) => {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
        const date = row.date ? new Date(row.date).toLocaleDateString() : "N/A";
        doc.text(date, 50, y);
        doc.text(row.orderNumber, 130, y);
        doc.text(row.productName.substring(0, 20), 230, y);
        const efficiency = row.plannedQty > 0 ? (row.producedQty / row.plannedQty) * 100 : 0;
        doc.text(row.plannedQty.toString(), 350, y);
        doc.text(row.producedQty.toString(), 410, y);
        doc.text(`${efficiency.toFixed(1)}%`, 470, y);
        doc.text(row.status, 530, y);
        y += 20;
      });

      doc.end();
    });
  }

  /**
   * Generate PDF for material report
   */
  async generateMaterialReportPDF(
    tenantClient: PrismaClient,
    tenantId: string,
    startDate?: string,
    endDate?: string,
    plantId?: string,
  ): Promise<Buffer> {
    const data = await this.getMaterialReport(tenantClient, tenantId, startDate, endDate, plantId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(20).text("Material Usage Report", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, {
        align: "center",
      });
      doc.moveDown(2);

      const tableTop = doc.y;
      const colWidths = [80, 120, 80, 80, 80, 80];
      const headers = ["Date", "Material", "Qty Used", "UOM", "Scrap Rate", "Total Cost"];

      doc.fontSize(10).font("Helvetica-Bold");
      let x = 50;
      headers.forEach((header, i) => {
        doc.text(header, x, tableTop);
        x += colWidths[i];
      });

      doc.font("Helvetica").fontSize(9);
      let y = tableTop + 20;
      data.forEach((row) => {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
        const date = row.date ? new Date(row.date).toLocaleDateString() : "N/A";
        doc.text(date, 50, y);
        doc.text(row.materialName.substring(0, 18), 130, y);
        doc.text(row.quantityUsed.toString(), 250, y);
        doc.text(row.uom, 330, y);
        doc.text(`${row.scrapRate.toFixed(2)}%`, 410, y);
        doc.text(`$${row.totalCost.toFixed(2)}`, 490, y);
        y += 20;
      });

      doc.end();
    });
  }

  /**
   * Generate PDF for quality report
   */
  async generateQualityReportPDF(
    tenantClient: PrismaClient,
    tenantId: string,
    startDate?: string,
    endDate?: string,
    plantId?: string,
  ): Promise<Buffer> {
    const data = await this.getQualityReport(tenantClient, tenantId, startDate, endDate, plantId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(20).text("Quality Control Report", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, {
        align: "center",
      });
      doc.moveDown(2);

      const tableTop = doc.y;
      const colWidths = [80, 100, 100, 80, 80, 100];
      const headers = ["Date", "Product", "Batch", "Type", "Status", "Pass Rate"];

      doc.fontSize(10).font("Helvetica-Bold");
      let x = 50;
      headers.forEach((header, i) => {
        doc.text(header, x, tableTop);
        x += colWidths[i];
      });

      doc.font("Helvetica").fontSize(9);
      let y = tableTop + 20;
      data.forEach((row) => {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
        const date = row.date ? new Date(row.date).toLocaleDateString() : "N/A";
        doc.text(date, 50, y);
        doc.text(row.productId.substring(0, 15), 130, y);
        doc.text(row.batchId.substring(0, 15), 230, y);
        doc.text(row.inspectionType, 330, y);
        doc.text(row.qualityStatus, 410, y);
        doc.text(`${row.passRate}%`, 490, y);
        y += 20;
      });

      doc.end();
    });
  }

  /**
   * Generate PDF for waste report
   */
  async generateWasteReportPDF(
    tenantClient: PrismaClient,
    tenantId: string,
    startDate?: string,
    endDate?: string,
    plantId?: string,
  ): Promise<Buffer> {
    const data = await this.getWasteReport(tenantClient, tenantId, startDate, endDate, plantId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(20).text("Waste Management Report", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, {
        align: "center",
      });
      doc.moveDown(2);

      const tableTop = doc.y;
      const colWidths = [80, 100, 100, 80, 80, 80, 100];
      const headers = ["Date", "Waste #", "Product", "Type", "Quantity", "Cost", "Site"];

      doc.fontSize(10).font("Helvetica-Bold");
      let x = 50;
      headers.forEach((header, i) => {
        doc.text(header, x, tableTop);
        x += colWidths[i];
      });

      doc.font("Helvetica").fontSize(9);
      let y = tableTop + 20;
      data.forEach((row) => {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
        const date = row.date ? new Date(row.date).toLocaleDateString() : "N/A";
        doc.text(date, 50, y);
        doc.text(row.wasteNumber.substring(0, 15), 130, y);
        doc.text(row.productName.substring(0, 15), 230, y);
        doc.text(row.wasteType, 330, y);
        doc.text(row.quantity.toString(), 410, y);
        doc.text(`$${row.cost.toFixed(2)}`, 490, y);
        doc.text(row.site.substring(0, 15), 570, y);
        y += 20;
      });

      doc.end();
    });
  }

  /**
   * Generate PDF for warehouse report
   */
  async generateWarehouseReportPDF(
    tenantClient: PrismaClient,
    tenantId: string,
    startDate?: string,
    endDate?: string,
    warehouseId?: string,
  ): Promise<Buffer> {
    const data = await this.getWarehouseReport(
      tenantClient,
      tenantId,
      startDate,
      endDate,
      warehouseId,
    );

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(20).text("Warehouse Report", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, {
        align: "center",
      });
      doc.moveDown(2);

      const tableTop = doc.y;
      const colWidths = [100, 120, 80, 80, 80, 80, 80];
      const headers = ["Location", "Item", "Incoming", "Outgoing", "Stock Level", "Capacity %"];

      doc.fontSize(10).font("Helvetica-Bold");
      let x = 50;
      headers.forEach((header, i) => {
        doc.text(header, x, tableTop);
        x += colWidths[i];
      });

      doc.font("Helvetica").fontSize(9);
      let y = tableTop + 20;
      data.forEach((row) => {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
        doc.text(row.location.substring(0, 15), 50, y);
        doc.text(row.item.substring(0, 18), 150, y);
        doc.text(row.incoming.toString(), 270, y);
        doc.text(row.outgoing.toString(), 350, y);
        doc.text(row.stockLevel.toString(), 430, y);
        doc.text(`${row.capacityUtilization.toFixed(1)}%`, 510, y);
        y += 20;
      });

      doc.end();
    });
  }
}

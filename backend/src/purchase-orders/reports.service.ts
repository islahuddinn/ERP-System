import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/tenant-client";
import { ReportsQueryDto } from "./dto/reports-query.dto";
import { currencySymbol } from "../common/utils/currency.util";

@Injectable()
export class PurchaseReportsService {
  private getPrisma(tenantClient?: PrismaClient): PrismaClient {
    if (!tenantClient)
      throw new BadRequestException("Tenant context is required for purchase reports");
    return tenantClient;
  }

  async getReports(tenantClient: PrismaClient, queryDto: ReportsQueryDto) {
    const prisma = this.getPrisma(tenantClient);
    const { startDate, endDate, supplierId, rawMaterialId, status } = queryDto;

    const orderWhere: Prisma.PurchaseOrderWhereInput = {};
    if (startDate || endDate) {
      orderWhere.orderDate = {};
      if (startDate) orderWhere.orderDate.gte = new Date(startDate);
      if (endDate) orderWhere.orderDate.lte = new Date(endDate);
    }
    if (supplierId) orderWhere.supplierId = supplierId;
    if (status) orderWhere.status = status;
    if (rawMaterialId) {
      orderWhere.items = { some: { rawMaterialId } };
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: orderWhere,
      include: {
        supplier: { select: { id: true, name: true } },
        items: {
          include: {
            rawMaterial: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { orderDate: "desc" },
    });

    const totalOrders = purchaseOrders.length;
    const totalValue = purchaseOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const totalItems = purchaseOrders.reduce(
      (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
      0,
    );

    const materialStats = new Map<
      string,
      { material: any; totalQuantity: number; totalValue: number; orderCount: number }
    >();
    purchaseOrders.forEach((order) => {
      order.items.forEach((item) => {
        const key = item.rawMaterialId;
        if (!materialStats.has(key)) {
          materialStats.set(key, {
            material: item.rawMaterial,
            totalQuantity: 0,
            totalValue: 0,
            orderCount: 0,
          });
        }
        const stat = materialStats.get(key)!;
        stat.totalQuantity += item.quantity;
        stat.totalValue += Number(item.totalPrice);
        stat.orderCount += 1;
      });
    });

    const topMaterials = Array.from(materialStats.values())
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    const supplierStats = new Map<
      string,
      { supplier: any; totalValue: number; orderCount: number }
    >();
    purchaseOrders.forEach((order) => {
      if (!order.supplier) return;
      const key = order.supplierId!;
      if (!supplierStats.has(key)) {
        supplierStats.set(key, { supplier: order.supplier, totalValue: 0, orderCount: 0 });
      }
      const stat = supplierStats.get(key)!;
      stat.totalValue += Number(order.totalAmount);
      stat.orderCount += 1;
    });

    const topSuppliers = Array.from(supplierStats.values())
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    return {
      summary: {
        totalOrders,
        totalValue,
        totalItems,
        averageOrderValue: totalOrders > 0 ? totalValue / totalOrders : 0,
      },
      topMaterials,
      topSuppliers,
      purchaseOrders: purchaseOrders.slice(0, 100).map((o) => ({
        ...o,
        subTotal: Number(o.subTotal),
        shippingCost: Number(o.shippingCost),
        totalAmount: Number(o.totalAmount),
        amountPaid: Number(o.amountPaid),
        items: o.items.map((item) => ({
          ...item,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
      })),
    };
  }

  async getMonthlyComparison(tenantClient: PrismaClient, queryDto: ReportsQueryDto) {
    const prisma = this.getPrisma(tenantClient);
    const { startDate, endDate } = queryDto;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getFullYear() - 1, end.getMonth(), 1);

    const monthlyPurchasesRaw = await prisma.$queryRaw<
      Array<{
        month: Date;
        purchase_orders: bigint;
        purchase_value: Prisma.Decimal | number | null;
      }>
    >(Prisma.sql`
      SELECT
        DATE_TRUNC('month', "order_date") AS month,
        COUNT(*)::INTEGER AS purchase_orders,
        COALESCE(SUM("total_amount"), 0)::DOUBLE PRECISION AS purchase_value
      FROM purchase_orders
      WHERE "order_date" >= ${start} AND "order_date" <= ${end}
      GROUP BY DATE_TRUNC('month', "order_date")
      ORDER BY month ASC
    `);

    const monthlyReturnsRaw = await prisma.$queryRaw<
      Array<{ month: Date; return_orders: bigint; return_value: Prisma.Decimal | number | null }>
    >(Prisma.sql`
      SELECT
        DATE_TRUNC('month', "return_date") AS month,
        COUNT(*)::INTEGER AS return_orders,
        COALESCE(SUM("total_amount"), 0)::DOUBLE PRECISION AS return_value
      FROM purchase_returns
      WHERE "return_date" >= ${start} AND "return_date" <= ${end}
      GROUP BY DATE_TRUNC('month', "return_date")
      ORDER BY month ASC
    `);

    return {
      monthlyPurchases: monthlyPurchasesRaw.map((r) => ({
        ...r,
        purchase_orders: Number(r.purchase_orders),
        purchase_value: Number(r.purchase_value ?? 0),
      })),
      monthlyReturns: monthlyReturnsRaw.map((r) => ({
        ...r,
        return_orders: Number(r.return_orders),
        return_value: Number(r.return_value ?? 0),
      })),
    };
  }

  async getMaterialAnalysis(tenantClient: PrismaClient, queryDto: ReportsQueryDto) {
    const prisma = this.getPrisma(tenantClient);
    const { startDate, endDate, supplierId, rawMaterialId } = queryDto;

    const orderWhere: Prisma.PurchaseOrderWhereInput = {};
    if (startDate || endDate) {
      orderWhere.orderDate = {};
      if (startDate) orderWhere.orderDate.gte = new Date(startDate);
      if (endDate) orderWhere.orderDate.lte = new Date(endDate);
    }
    if (supplierId) orderWhere.supplierId = supplierId;

    const materialAnalysis = await prisma.purchaseItem.groupBy({
      by: ["rawMaterialId"],
      where: {
        ...(rawMaterialId ? { rawMaterialId } : {}),
        purchaseOrder: orderWhere,
      },
      _sum: { quantity: true, totalPrice: true },
      _count: { id: true },
      orderBy: { _sum: { totalPrice: "desc" } },
    });

    const rawMaterialIds = materialAnalysis.map((m) => m.rawMaterialId);
    const rawMaterials = rawMaterialIds.length
      ? await prisma.rawMaterial.findMany({
          where: { id: { in: rawMaterialIds } },
          select: { id: true, name: true, code: true },
        })
      : [];

    return materialAnalysis.map((analysis) => {
      const material = rawMaterials.find((m) => m.id === analysis.rawMaterialId);
      return {
        material: material ?? { id: analysis.rawMaterialId, name: "Unknown", code: "N/A" },
        totalQuantity: Number(analysis._sum.quantity ?? 0),
        totalValue: Number(analysis._sum.totalPrice ?? 0),
        orderCount: analysis._count.id,
        averagePrice:
          Number(analysis._sum.totalPrice ?? 0) / Math.max(Number(analysis._sum.quantity ?? 1), 1),
      };
    });
  }

  async exportToCsv(tenantClient: PrismaClient, queryDto: ReportsQueryDto): Promise<string> {
    const reports = await this.getReports(tenantClient, queryDto);
    let csv = "Order Number,Supplier,Order Date,Total Amount,Status,Payment Status,Items Count\n";
    reports.purchaseOrders.forEach((order) => {
      csv += `"${order.orderNumber}","${order.supplier?.name ?? ""}","${order.orderDate.toISOString().split("T")[0]}","${Number(order.totalAmount).toFixed(2)}","${order.status}","${order.paymentStatus}","${order.items.length}"\n`;
    });
    return csv;
  }

  async exportToPdf(tenantClient: PrismaClient, queryDto: ReportsQueryDto): Promise<Buffer> {
    const prisma = this.getPrisma(tenantClient);
    const reports = await this.getReports(tenantClient, queryDto);
    const settings = await prisma.settings.findFirst({ select: { currency: true } });
    const symbol = currencySymbol(settings?.currency);
    const content = `Purchase Reports\n\nTotal Orders: ${reports.summary.totalOrders}\nTotal Value: ${symbol} ${reports.summary.totalValue.toFixed(2)}\n`;
    return Buffer.from(content, "utf-8");
  }
}

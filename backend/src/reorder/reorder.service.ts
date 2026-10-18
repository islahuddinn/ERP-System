import { Injectable, NotFoundException } from "@nestjs/common";
import { ReorderAlertBalance, ReorderRepository } from "./reorder.repository";

export type ReorderAlert = ReorderAlertBalance;

export type ReorderSummary = {
  totalAlerts: number;
  criticalAlerts: number;
  lowStockAlerts: number;
  alertsByLocation: Array<{ location: string; count: number; alerts: ReorderAlert[] }>;
  alertsByProduct: Array<{ product: string; count: number; alerts: ReorderAlert[] }>;
};

export type ReorderSuggestion = {
  product: {
    id: string;
    name: string;
    code: string;
    unit: string;
    reorderLevel: number;
  };
  currentStock: number;
  suggestedReorder: number;
  stockByLocation: Array<{
    location: { id: string; name: string };
    quantity: number;
    status: "LOW" | "OK";
  }>;
};

@Injectable()
export class ReorderService {
  constructor(private readonly reorderRepository: ReorderRepository) {}

  async getReorderAlerts(): Promise<ReorderAlert[]> {
    const stockBalances = await this.reorderRepository.findStockBalancesWithReorder();

    return stockBalances.filter((balance) => {
      const reorderLevel = Number(balance.product.reorderLevel ?? 0);
      if (reorderLevel <= 0) return false;
      return Number(balance.quantity) < reorderLevel;
    });
  }

  async getReorderSummary(): Promise<ReorderSummary> {
    const alerts = await this.getReorderAlerts();

    return {
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter((alert) => Number(alert.quantity) <= 0).length,
      lowStockAlerts: alerts.filter((alert) => Number(alert.quantity) > 0).length,
      alertsByLocation: this.groupByLocation(alerts),
      alertsByProduct: this.groupByProduct(alerts),
    };
  }

  async getReorderSuggestions(productId: string): Promise<ReorderSuggestion> {
    const product = await this.reorderRepository.findProductStock(productId);

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const reorderLevel = Number(product.reorderLevel ?? 0);
    const totalStock = product.stockBalances.reduce((sum, balance) => sum + Number(balance.quantity), 0);
    const suggestedReorder = Math.max(0, reorderLevel - totalStock);

    return {
      product: {
        id: product.id,
        name: product.name,
        code: product.code,
        unit: product.uom.symbol,
        reorderLevel,
      },
      currentStock: totalStock,
      suggestedReorder,
      stockByLocation: product.stockBalances.map((balance) => ({
        location: balance.location,
        quantity: Number(balance.quantity),
        status: Number(balance.quantity) < reorderLevel ? "LOW" : "OK",
      })),
    };
  }

  private groupByLocation(alerts: ReorderAlert[]): ReorderSummary["alertsByLocation"] {
    const grouped = new Map<string, ReorderAlert[]>();

    for (const alert of alerts) {
      const locationName = alert.location.name;
      const existing = grouped.get(locationName) ?? [];
      existing.push(alert);
      grouped.set(locationName, existing);
    }

    return [...grouped.entries()].map(([location, locationAlerts]) => ({
      location,
      count: locationAlerts.length,
      alerts: locationAlerts,
    }));
  }

  private groupByProduct(alerts: ReorderAlert[]): ReorderSummary["alertsByProduct"] {
    const grouped = new Map<string, ReorderAlert[]>();

    for (const alert of alerts) {
      const productName = alert.product.name;
      const existing = grouped.get(productName) ?? [];
      existing.push(alert);
      grouped.set(productName, existing);
    }

    return [...grouped.entries()].map(([product, productAlerts]) => ({
      product,
      count: productAlerts.length,
      alerts: productAlerts,
    }));
  }
}

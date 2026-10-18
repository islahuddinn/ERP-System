import { ProductAdjustmentType } from "@prisma/tenant-client";

export interface ProductAdjustmentCustomerSummary {
  id: string;
  code: string;
  shopName: string;
}

export interface ProductAdjustmentProductSummary {
  id: string;
  code: string;
  name: string;
}

export interface ProductAdjustmentDetail {
  id: string;
  adjustmentNumber: string;
  customerId: string;
  productId: string;
  type: ProductAdjustmentType;
  quantity: number;
  reason: string;
  notes: string | null;
  adjustedAt: Date;
  createdById: string | null;
  createdAt: Date;
  customer: ProductAdjustmentCustomerSummary;
  product: ProductAdjustmentProductSummary;
}

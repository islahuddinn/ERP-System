import { ProductBonusGroupStatus } from "@prisma/tenant-client";

export interface ProductBonusGroupProductSummary {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface ProductBonusGroupListItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: ProductBonusGroupStatus;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductBonusGroupDetail {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: ProductBonusGroupStatus;
  productCount: number;
  products: ProductBonusGroupProductSummary[];
  createdAt: Date;
  updatedAt: Date;
}

import {
  ProductBonusGroupStatus,
  ProductBonusSchemeStatus,
  ProductBonusSchemeType,
} from "@prisma/tenant-client";

export interface ProductBonusSchemeGroupSummary {
  id: string;
  code: string;
  name: string;
  status: ProductBonusGroupStatus;
  productCount: number;
}

export interface ProductBonusSchemeListItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  productBonusGroupId: string;
  type: ProductBonusSchemeType;
  minPurchaseQty: number;
  bonusQty: number;
  validFrom: Date;
  validTo: Date | null;
  status: ProductBonusSchemeStatus;
  createdAt: Date;
  updatedAt: Date;
  productBonusGroup: ProductBonusSchemeGroupSummary;
}

export type ProductBonusSchemeDetail = ProductBonusSchemeListItem;

import { WasteType, WasteItemType } from "@prisma/tenant-client";

export interface CreateWasteManagementData {
  wasteNumber: string;
  wasteType: WasteType;
  itemType: WasteItemType;
  productId?: string;
  rawMaterialId?: string;
  quantity: number;
  cost: number;
  reason: string;
  remarks?: string;
  siteId?: string;
  createdById?: string;
}

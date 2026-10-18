import { Transform } from "class-transformer";
import { ReceivingStatus, ProductionOrderStatus, BOMStatus, ProductBatchStatus, PurchaseStatus } from "@prisma/tenant-client";

function upperCaseString(value: unknown): unknown {
  return typeof value === "string" ? value.toUpperCase() : value;
}

const GRN_STATUS_ALIASES: Record<string, ReceivingStatus> = {
  RECEIVED: ReceivingStatus.COMPLETED,
};

const PRODUCTION_STATUS_ALIASES: Record<string, ProductionOrderStatus> = {
  PENDING: ProductionOrderStatus.DRAFT,
  PLANNED: ProductionOrderStatus.DRAFT,
  COMPLETE: ProductionOrderStatus.COMPLETED,
};

const BOM_STATUS_ALIASES: Record<string, BOMStatus> = {
  ARCHIVED: BOMStatus.INACTIVE,
  OBSOLETE: BOMStatus.INACTIVE,
};

const PURCHASE_STATUS_ALIASES: Record<string, PurchaseStatus> = {
  SENT: PurchaseStatus.CONFIRMED,
  COMPLETED: PurchaseStatus.RECEIVED,
  COMPLETE: PurchaseStatus.RECEIVED,
};

export function transformGrnStatus({ value }: { value: unknown }): unknown {
  if (typeof value !== "string") return value;
  const upper = value.toUpperCase();
  return GRN_STATUS_ALIASES[upper] ?? upper;
}

export function transformProductionOrderStatus({ value }: { value: unknown }): unknown {
  if (typeof value !== "string") return value;
  const upper = value.toUpperCase();
  return PRODUCTION_STATUS_ALIASES[upper] ?? upper;
}

export function transformBomStatus({ value }: { value: unknown }): unknown {
  if (typeof value !== "string") return value;
  const upper = value.toUpperCase();
  return BOM_STATUS_ALIASES[upper] ?? upper;
}

export function transformPurchaseStatus({ value }: { value: unknown }): unknown {
  if (typeof value !== "string") return value;
  const upper = value.toUpperCase();
  return PURCHASE_STATUS_ALIASES[upper] ?? upper;
}

export function transformProductBatchStatus({ value }: { value: unknown }): unknown {
  return upperCaseString(value);
}

export function transformOptionalBooleanQuery({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return value;
}

/** Decorator helpers for query DTOs */
export const TransformGrnStatus = () => Transform(transformGrnStatus);
export const TransformProductionOrderStatus = () => Transform(transformProductionOrderStatus);
export const TransformBomStatus = () => Transform(transformBomStatus);
export const TransformPurchaseStatus = () => Transform(transformPurchaseStatus);
export const TransformProductBatchStatus = () => Transform(transformProductBatchStatus);
export const TransformOptionalBooleanQuery = () => Transform(transformOptionalBooleanQuery);

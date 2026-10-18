import { RawMaterialBatch } from "@prisma/tenant-client";
import { FifoAllocationResult } from "./interfaces";

/**
 * Allocates `requiredQuantity` across batches in FIFO order, skipping
 * quantity already reserved by other production orders.
 */
export function allocateFifo(
  batches: RawMaterialBatch[],
  requiredQuantity: number,
): FifoAllocationResult {
  const allocations: FifoAllocationResult["allocations"] = [];
  let remaining = requiredQuantity;

  for (const batch of batches) {
    if (remaining <= 0) break;

    const allocatable = batch.availableQuantity - batch.reservedQuantity;
    if (allocatable <= 0) continue;

    const allocateQty = Math.min(allocatable, remaining);
    const unitCost = batch.unitCost ?? 0;

    allocations.push({
      rawMaterialBatchId: batch.id,
      allocatedQuantity: allocateQty,
      unitCost,
      totalCost: allocateQty * unitCost,
    });

    remaining -= allocateQty;
  }

  return {
    allocations,
    allocatedQuantity: requiredQuantity - remaining,
    shortfall: Math.max(0, remaining),
    totalCost: allocations.reduce((sum, a) => sum + a.totalCost, 0),
  };
}

/**
 * requiredQuantity for a BOM item = quantityPerUnit * plannedQuantity * (1 + wastagePercent / 100)
 */
export function calculateRequiredQuantity(
  quantityPerUnit: number,
  plannedQuantity: number,
  wastagePercent: number,
): number {
  return quantityPerUnit * plannedQuantity * (1 + wastagePercent / 100);
}

import { ProductBatchStatus, Prisma } from "@prisma/tenant-client";

const MANUAL_PRODUCT_BATCH_STATUSES: ProductBatchStatus[] = [
  ProductBatchStatus.BLOCKED,
  ProductBatchStatus.QUARANTINE,
  ProductBatchStatus.EXPIRED,
];

export interface ProductBatchQuantitySnapshot {
  availableQuantity: number | { toNumber?: () => number };
  reservedQuantity: number | { toNumber?: () => number };
  consumedQuantity: number | { toNumber?: () => number };
  status: ProductBatchStatus;
}

function toNumber(value: number | { toNumber?: () => number }): number {
  if (typeof value === "number") return value;
  if (value && typeof value.toNumber === "function") return value.toNumber();
  return Number(value);
}

/**
 * Derives inventory lifecycle status from batch quantities.
 * Manual QA statuses (blocked/quarantine/expired) are never overridden.
 */
export function deriveProductBatchStatus(batch: ProductBatchQuantitySnapshot): ProductBatchStatus {
  if (MANUAL_PRODUCT_BATCH_STATUSES.includes(batch.status)) {
    return batch.status;
  }

  const available = toNumber(batch.availableQuantity);
  const reserved = toNumber(batch.reservedQuantity);
  const consumed = toNumber(batch.consumedQuantity);

  if (available <= 0 && reserved <= 0 && consumed > 0) {
    return ProductBatchStatus.CONSUMED;
  }

  if (consumed > 0) {
    return ProductBatchStatus.PARTIAL;
  }

  return ProductBatchStatus.ACTIVE;
}

/**
 * Re-reads batch quantities inside a transaction and applies derived lifecycle status.
 * Skips manual QA statuses (blocked / quarantine / expired).
 */
export async function syncProductBatchDerivedStatus(
  tx: Prisma.TransactionClient,
  productBatchId: string,
): Promise<void> {
  const batch = await tx.productBatch.findUnique({
    where: { id: productBatchId },
    select: {
      availableQuantity: true,
      reservedQuantity: true,
      consumedQuantity: true,
      status: true,
    },
  });

  if (!batch || MANUAL_PRODUCT_BATCH_STATUSES.includes(batch.status)) {
    return;
  }

  const status = deriveProductBatchStatus(batch);
  if (status === batch.status) {
    return;
  }

  await tx.productBatch.update({
    where: { id: productBatchId },
    data: { status },
  });
}

/** Backfill derived statuses for batches that pre-date automatic lifecycle updates. */
export async function reconcileAllProductBatchDerivedStatuses(
  prisma: Prisma.TransactionClient | { productBatch: Prisma.TransactionClient["productBatch"] },
): Promise<number> {
  const batches = await prisma.productBatch.findMany({
    where: {
      deletedAt: null,
      status: { notIn: MANUAL_PRODUCT_BATCH_STATUSES },
    },
    select: {
      id: true,
      availableQuantity: true,
      reservedQuantity: true,
      consumedQuantity: true,
      status: true,
    },
  });

  let updated = 0;

  for (const batch of batches) {
    const status = deriveProductBatchStatus(batch);
    if (status === batch.status) continue;

    await prisma.productBatch.update({
      where: { id: batch.id },
      data: { status },
    });
    updated += 1;
  }

  return updated;
}

/**
 * Utility functions for sale operations
 */

export interface SaleEditCheck {
  canEdit: boolean;
  reason?: string;
}

/**
 * Checks if a sale can be edited based on various conditions
 * @param sale - The sale object to check
 * @returns Object with canEdit boolean and optional reason string
 */
export function canEditSale(sale: any): SaleEditCheck {
  // Check 1: Cancelled
  if (sale.status === 'CANCELLED' || sale.paymentStatus === 'CANCELLED') {
    return { canEdit: false, reason: 'Cannot edit: Sale is cancelled' };
  }
  
  // Check 2: Refunded
  if (sale.status === 'REFUNDED' || sale.paymentStatus === 'REFUNDED') {
    return { canEdit: false, reason: 'Cannot edit: Sale is refunded' };
  }
  
  // Check 3: Processed sale returns
  // Check both 'returns' (from Prisma) and 'saleReturns' (from API response) for compatibility
  const saleReturns = sale.returns || sale.saleReturns || [];
  const hasProcessedReturns = saleReturns.some((r: any) => r.status === 'PROCESSED');
  if (hasProcessedReturns) {
    return { canEdit: false, reason: 'Cannot edit: Sale has processed returns' };
  }
  
  // Check 4: Fully paid and completed
  if (sale.status === 'COMPLETED' && sale.paymentStatus === 'PAID') {
    return { canEdit: false, reason: 'Cannot edit: Sale is fully paid and completed' };
  }
  
  // Check 5: Multiple payments
  const paymentsCount = sale.payments?.length || sale._count?.payments || 0;
  if (paymentsCount > 1) {
    return { canEdit: false, reason: 'Cannot edit: Sale has multiple payments' };
  }
  
  return { canEdit: true };
}


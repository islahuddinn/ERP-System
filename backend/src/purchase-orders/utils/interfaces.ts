export interface PurchaseOrderDashboardStats {
  totalPurchaseOrders: number;
  draftPurchaseOrders: number;
  confirmedPurchaseOrders: number;
  partialPurchaseOrders: number;
  receivedPurchaseOrders: number;
  cancelledPurchaseOrders: number;
  pendingApprovalCount: number;
  totalPurchaseValue: number;
  totalOutstandingAmount: number;
}

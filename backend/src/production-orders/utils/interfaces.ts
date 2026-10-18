export interface BatchAllocation {
  rawMaterialBatchId: string;
  allocatedQuantity: number;
  unitCost: number;
  totalCost: number;
}

export interface FifoAllocationResult {
  allocations: BatchAllocation[];
  allocatedQuantity: number;
  shortfall: number;
  totalCost: number;
}

export interface ProductionOrderDashboardStats {
  totalProductionOrders: number;
  draftProductionOrders: number;
  inProgressProductionOrders: number;
  completedProductionOrders: number;
  cancelledProductionOrders: number;
  totalProductionCost: number;
  totalWasteCost: number;
}

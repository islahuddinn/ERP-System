export interface PaginatedRawMaterials<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface RawMaterialDashboardStats {
  totalRawMaterials: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringBatchesCount: number;
}

export interface PaginatedProducts<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ProductDashboardStats {
  totalActiveProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

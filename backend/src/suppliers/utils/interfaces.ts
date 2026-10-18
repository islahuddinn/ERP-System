export interface SupplierDashboardStats {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
}

export interface TopSupplierBySpend {
  supplierId: string;
  supplierName: string;
  totalSpend: number;
}

export interface TopCustomerByBalance {
  customerId: string;
  customerName: string;
  balance: number;
}

export interface CustomerDashboardStats {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  topCustomersByBalance: TopCustomerByBalance[];
}

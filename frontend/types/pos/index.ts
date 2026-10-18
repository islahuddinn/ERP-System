// Re-export all types from hooks for easier imports
export type { Product } from '../../hooks/pos/useProducts';
export type { CartItem, Discount } from '../../hooks/pos/useCart';
export type { Customer } from '../../hooks/pos/useCustomers';
export type { Location } from '../../hooks/pos/useLocations';
export type { SaleData } from '../../hooks/pos/useSales';

// Import types for local usage in interfaces
import type { Product } from '../../hooks/pos/useProducts';
import type { CartItem, Discount } from '../../hooks/pos/useCart';
import type { Customer } from '../../hooks/pos/useCustomers';
import type { Location } from '../../hooks/pos/useLocations';

// Additional POS-specific types
export interface PaymentMethod {
  type: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE';
  label: string;
}

export interface PaymentData {
  method: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
}

export interface ServiceFormData {
  name: string;
  stock: string;
  uom?: string;
  quantity: number;
  unitPrice: string;
}

export interface BiltyFormData {
  address: string;
  contact: string;
  labour?: string;
  freightCharges: number;
  labourExpense: number;
}

export interface SearchState {
  term: string;
  results: Product[];
  showDropdown: boolean;
  loading: boolean;
  selectedIndex: number;
}

export interface QuantityEditing {
  [itemId: string]: string;
}

export interface PaginationState {
  currentPage: number;
  displayedProducts: Product[];
  isLoadingMore: boolean;
  productsPerPage: number;
}

export interface InvoiceData {
  location: Location;
  invoiceNumber: string;
  date: Date;
  customer: Customer | null;
  broker?: any;
  customerBalanceDue?: number;
  projectedBalanceAfterInvoice?: number;
  biltyAddress?: string;
  biltyContact?: string;
  items: CartItem[];
  payments?: Array<{
    paymentMethod: string;
    amount: number;
    referenceNumber?: string | null;
    paymentDate?: Date;
  }>;
  subtotal: number;
  itemDiscounts: number;
  saleDiscount: Discount;
  additionalCharges: {
    labourExpense: number;
    freightCharges: number;
  };
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export interface UpdateSaleDto {
  saleType?: string;
  customerId?: string;
  locationId?: string;
  items?: Array<{
    productId?: string;
    itemType: 'PRODUCT' | 'SERVICE';
    itemName: string;
    itemDescription?: string;
    sku?: string;
    barcode?: string;
    quantity: number;
    unitPrice: number;
    costPrice?: number;
    itemTaxRate?: number;
    itemDiscountType?: 'PERCENTAGE' | 'FIXED';
    itemDiscountRate?: number;
    notes?: string;
  }>;
  payments?: Array<{
    paymentMethod: 'CASH' | 'CARD' | 'MOBILE_PAYMENT' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';
    amount: number;
    referenceNumber?: string;
    cardLastFour?: string;
    cardType?: string;
    bankName?: string;
    chequeNumber?: string;
    notes?: string;
  }>;
  taxRate?: number;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  notes?: string;
  customerNotes?: string;
  isCreditSale?: boolean;
  amountPaid?: number;
  totalAmount?: number;
  changeReason?: string;
  skipStockValidation?: boolean;
}

export interface CancelSaleDto {
  reason: string;
  reverseStock?: boolean;
  reverseCustomerBalance?: boolean;
  reverseCashTransaction?: boolean;
}

/**
 * Hook for updating a sale
 */
export const useUpdateSale = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSaleDto }) => {
      const response = await apiClient.patch(`/pos/sales/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all sale-related queries
      queryClient.invalidateQueries({ queryKey: ['pos', 'sales'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'sales', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'sales-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'credit-sales'] });
      
      toast.success(`Sale ${data.saleNumber || variables.id} updated successfully`);
    },
    onError: (error: any) => {
      // Enhanced error handling with detailed messages
      let errorMessage = 'Failed to update sale. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Handle validation errors with details
      if (error.response?.data?.details) {
        const details = error.response.data.details;
        if (Array.isArray(details)) {
          errorMessage = details.join(', ');
        } else if (typeof details === 'string') {
          errorMessage = details;
        } else if (details.message) {
          errorMessage = details.message;
        }
      }
      
      // Show error with longer duration for complex messages
      toast.error(errorMessage, { duration: 6000 });
    },
  });
};

/**
 * Hook for cancelling a sale
 */
export const useCancelSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CancelSaleDto }) => {
      const response = await apiClient.post(`/pos/sales/${id}/cancel`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all sale-related queries
      queryClient.invalidateQueries({ queryKey: ['pos', 'sales'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'sales', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'sales-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'credit-sales'] });
      
      toast.success(`Sale ${data.saleNumber || variables.id} cancelled successfully`);
    },
    onError: (error: any) => {
      // Enhanced error handling with detailed messages
      let errorMessage = 'Failed to cancel sale. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Handle validation errors with details
      if (error.response?.data?.details) {
        const details = error.response.data.details;
        if (Array.isArray(details)) {
          errorMessage = details.join(', ');
        } else if (typeof details === 'string') {
          errorMessage = details;
        } else if (details.message) {
          errorMessage = details.message;
        }
      }
      
      // Show error with longer duration for complex messages
      toast.error(errorMessage, { duration: 6000 });
    },
  });
};

import { useQuery } from '@tanstack/react-query';

/**
 * Hook for fetching a single sale by ID
 */
export const useSale = (id: string | null) => {
  return useQuery({
    queryKey: ['pos', 'sales', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get(`/pos/sales/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};


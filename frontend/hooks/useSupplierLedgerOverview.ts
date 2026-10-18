import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface SupplierLedgerSummary {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  balance: number;
  totalPurchases: number;
  totalPayments: number;
  totalReturns: number;
  transactionCount: number;
  lastTransactionDate?: string | null;
  lastPaymentDate?: string;
}

export const useSupplierLedgerOverview = (searchTerm?: string) => {
  return useQuery({
    queryKey: ['supplier-ledger-overview', searchTerm],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/suppliers/ledger-overview', {
        params: searchTerm ? { search: searchTerm } : undefined,
      });
      const responseData = response?.data || response;
      return (Array.isArray(responseData) ? responseData : (responseData?.data || [])) as SupplierLedgerSummary[];
    },
    // Keep the previous list mounted while a new search refetches (QA #11 — no blank/loader flash on each keystroke).
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

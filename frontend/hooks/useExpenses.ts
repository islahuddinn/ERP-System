import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';
import { extractPaginatedDataFromResponse, unwrapResponse } from '@/lib/response-utils';

export interface Expense {
  id: string;
  expenseNumber: string;
  categoryId: string;
  locationId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  expenseDate: string;
  description?: string;
  vendor?: string;
  referenceNumber?: string;
  isRecurring: boolean;
  recurringFrequency?: string;
  nextRecurringDate?: string;
  attachments: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  approvedById?: string;
  approvedAt?: string;
  rejectionReason?: string;
  cashTransactionId?: string;
  category: {
    id: string;
    name: string;
    color?: string;
    icon?: string;
  };
  location: {
    id: string;
    name: string;
  };
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseDto {
  categoryId: string;
  locationId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  expenseDate: string;
  description?: string;
  vendor?: string;
  referenceNumber?: string;
  isRecurring?: boolean;
  recurringFrequency?: string;
  attachments?: string[];
}

export interface ExpenseQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  locationId?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExpenseResponse {
  data: Expense[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const useExpenses = (params?: ExpenseQueryParams) => {
  return useQuery<ExpenseResponse>({
    queryKey: ['expenses', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.append(key, value.toString());
        }
      });

      const response = await apiClient.get(`/expenses?${searchParams.toString()}`);
      const paginated = extractPaginatedDataFromResponse<Expense>(response.data);
      return {
        data: paginated.data,
        total: paginated.meta?.total ?? paginated.data.length,
        page: paginated.meta?.page ?? 1,
        limit: paginated.meta?.limit ?? 20,
        totalPages: paginated.meta?.totalPages ?? 1,
      };
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
};

export const useExpense = (id: string) => {
  return useQuery<Expense>({
    queryKey: ['expense', id],
    queryFn: async () => {
      const response = await apiClient.get(`/expenses/${id}`);
      return unwrapResponse(response.data) as Expense;
    },
    enabled: !!id,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExpenseDto) => {
      const response = await apiClient.post('/expenses', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create expense');
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateExpenseDto> }) => {
      const response = await apiClient.patch(`/expenses/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update expense');
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/expenses/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete expense');
    },
  });
};

export const useApproveExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) => {
      const response = await apiClient.post(`/expenses/${id}/approve`, { status, rejectionReason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense status updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update expense status');
    },
  });
};

export const useMarkExpenseAsPaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/expenses/${id}/pay`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense marked as paid');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to mark expense as paid');
    },
  });
};


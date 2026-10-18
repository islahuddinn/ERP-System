import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';
import { extractArrayFromResponse, unwrapResponse } from '@/lib/response-utils';

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  _count?: {
    expenses: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseCategoryDto {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
}

export const useExpenseCategories = (includeInactive = false) => {
  return useQuery<ExpenseCategory[]>({
    queryKey: ['expense-categories', includeInactive],
    queryFn: async () => {
      const response = await apiClient.get('/expense-categories', {
        params: { includeInactive },
      });
      return extractArrayFromResponse<ExpenseCategory>(response.data);
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useExpenseCategory = (id: string) => {
  return useQuery<ExpenseCategory>({
    queryKey: ['expense-category', id],
    queryFn: async () => {
      const response = await apiClient.get(`/expense-categories/${id}`);
      return unwrapResponse(response.data) as ExpenseCategory;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateExpenseCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExpenseCategoryDto) => {
      const response = await apiClient.post('/expense-categories', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Category created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create category');
    },
  });
};

export const useUpdateExpenseCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateExpenseCategoryDto> }) => {
      const response = await apiClient.patch(`/expense-categories/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Category updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update category');
    },
  });
};

export const useDeleteExpenseCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/expense-categories/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    },
  });
};


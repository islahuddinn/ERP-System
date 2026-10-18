import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';

// Purchase Summary Hooks
export const usePurchaseSummary = (params?: { startDate?: string; endDate?: string; limit?: number }) => {
  return useQuery({
    queryKey: ['purchase-summary', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);
      if (params?.limit) searchParams.append('limit', params.limit.toString());

      const { data } = await apiClient.get(`/purchase-orders/summary?${searchParams.toString()}`);
      return data;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
};

export const useMonthlyTrends = (params?: { startDate?: string; endDate?: string }) => {
  return useQuery({
    queryKey: ['purchase-trends', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);

      const { data } = await apiClient.get(`/purchase-orders/summary/monthly-trends?${searchParams.toString()}`);
      return data;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
};

export const useTopSuppliers = (params?: { startDate?: string; endDate?: string; limit?: number }) => {
  return useQuery({
    queryKey: ['top-suppliers', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);
      if (params?.limit) searchParams.append('limit', params.limit.toString());

      const { data } = await apiClient.get(`/purchase-orders/summary/top-suppliers?${searchParams.toString()}`);
      return data;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
};

// Purchase Reports Hooks
export const usePurchaseReports = (params?: {
  startDate?: string;
  endDate?: string;
  supplierId?: string;
  productId?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: ['purchase-reports', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);
      if (params?.supplierId) searchParams.append('supplierId', params.supplierId);
      if (params?.productId) searchParams.append('productId', params.productId);
      if (params?.status) searchParams.append('status', params.status);

      const { data } = await apiClient.get(`/purchase-orders/reports?${searchParams.toString()}`);
      return data;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
};

export const useMonthlyComparison = (params?: { startDate?: string; endDate?: string }) => {
  return useQuery({
    queryKey: ['purchase-comparison', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);

      const { data } = await apiClient.get(`/purchase-orders/reports/monthly-comparison?${searchParams.toString()}`);
      return data;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
};

export const useProductAnalysis = (params?: {
  startDate?: string;
  endDate?: string;
  supplierId?: string;
}) => {
  return useQuery({
    queryKey: ['product-analysis', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);
      if (params?.supplierId) searchParams.append('supplierId', params.supplierId);

      const { data } = await apiClient.get(`/purchase-orders/reports/product-analysis?${searchParams.toString()}`);
      return data;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
};

// Export Hooks
export const useExportReports = () => {
  return useMutation({
    mutationFn: async ({ format, params }: { format: 'csv' | 'pdf'; params?: any }) => {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);
      if (params?.supplierId) searchParams.append('supplierId', params.supplierId);
      if (params?.productId) searchParams.append('productId', params.productId);
      if (params?.status) searchParams.append('status', params.status);

      const response = await apiClient.get(`/purchase-orders/reports/export/${format}?${searchParams.toString()}`, {
        responseType: 'blob'
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      const blob = new Blob([data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `purchase-reports.${variables.format}`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Export ${variables.format.toUpperCase()} downloaded successfully`);
    },
    onError: (error: any) => {
      toast.error(`Failed to export: ${error.response?.data?.message || error.message}`);
    },
  });
};

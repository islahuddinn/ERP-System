import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { extractArrayFromResponse, unwrapResponse } from '@/lib/response-utils';

export interface ExpenseSummary {
  summary: {
    totalAmount: number;
    totalCount: number;
    averageAmount: number;
  };
  byCategory: Array<{
    categoryId: string;
    category: {
      id: string;
      name: string;
      color?: string;
      icon?: string;
    } | null;
    totalAmount: number;
    count: number;
    percentage: number;
  }>;
  byPaymentMethod: Array<{
    paymentMethod: string;
    totalAmount: number;
    count: number;
    percentage: number;
  }>;
  byStatus: Array<{
    status: string;
    totalAmount: number;
    count: number;
    percentage: number;
  }>;
  byLocation: Array<{
    locationId: string;
    location: {
      id: string;
      name: string;
    } | null;
    totalAmount: number;
    count: number;
    percentage: number;
  }>;
}

export interface CategoryBreakdown {
  categoryId: string;
  category: {
    id: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  } | null;
  totalAmount: number;
  count: number;
  averageAmount: number;
  percentage: number;
}

export interface PaymentMethodBreakdown {
  paymentMethod: string;
  totalAmount: number;
  count: number;
  averageAmount: number;
  percentage: number;
}

export interface LocationBreakdown {
  locationId: string;
  location: {
    id: string;
    name: string;
    type?: string;
  } | null;
  totalAmount: number;
  count: number;
  averageAmount: number;
  percentage: number;
}

export interface StatusBreakdown {
  status: string;
  totalAmount: number;
  count: number;
  averageAmount: number;
  percentage: number;
}

export interface TrendData {
  period: string;
  totalAmount: number;
  count: number;
}

export interface MonthlyComparison {
  month: string;
  totalAmount: number;
  count: number;
}

export interface ExpenseReportsParams {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export const useExpenseSummary = (params?: ExpenseReportsParams) => {
  return useQuery<ExpenseSummary>({
    queryKey: ['expense-reports', 'summary', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);

      const response = await apiClient.get(
        `/expenses/reports/summary?${searchParams.toString()}`
      );
      return unwrapResponse(response.data) as ExpenseSummary;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useExpenseCategoryBreakdown = (params?: ExpenseReportsParams) => {
  return useQuery<CategoryBreakdown[]>({
    queryKey: ['expense-reports', 'category-breakdown', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);

      const response = await apiClient.get(
        `/expenses/reports/category-breakdown?${searchParams.toString()}`
      );
      return extractArrayFromResponse<CategoryBreakdown>(response.data);
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useExpensePaymentMethodBreakdown = (params?: ExpenseReportsParams) => {
  return useQuery<PaymentMethodBreakdown[]>({
    queryKey: ['expense-reports', 'payment-method-breakdown', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);

      const response = await apiClient.get(
        `/expenses/reports/payment-method-breakdown?${searchParams.toString()}`
      );
      return extractArrayFromResponse<PaymentMethodBreakdown>(response.data);
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useExpenseLocationBreakdown = (params?: ExpenseReportsParams) => {
  return useQuery<LocationBreakdown[]>({
    queryKey: ['expense-reports', 'location-breakdown', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);

      const response = await apiClient.get(
        `/expenses/reports/location-breakdown?${searchParams.toString()}`
      );
      return extractArrayFromResponse<LocationBreakdown>(response.data);
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useExpenseStatusBreakdown = (params?: ExpenseReportsParams) => {
  return useQuery<StatusBreakdown[]>({
    queryKey: ['expense-reports', 'status-breakdown', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);

      const response = await apiClient.get(
        `/expenses/reports/status-breakdown?${searchParams.toString()}`
      );
      return extractArrayFromResponse<StatusBreakdown>(response.data);
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useExpenseTrends = (params?: ExpenseReportsParams) => {
  return useQuery<TrendData[]>({
    queryKey: ['expense-reports', 'trends', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);
      if (params?.groupBy) searchParams.append('groupBy', params.groupBy);

      const response = await apiClient.get(
        `/expenses/reports/trends?${searchParams.toString()}`
      );
      return extractArrayFromResponse<TrendData>(response.data);
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useExpenseMonthlyComparison = (params?: ExpenseReportsParams) => {
  return useQuery<MonthlyComparison[]>({
    queryKey: ['expense-reports', 'monthly-comparison', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);

      const response = await apiClient.get(
        `/expenses/reports/monthly-comparison?${searchParams.toString()}`
      );
      return extractArrayFromResponse<MonthlyComparison>(response.data);
    },
    staleTime: 5 * 60 * 1000,
  });
};


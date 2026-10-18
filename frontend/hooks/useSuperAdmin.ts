import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { superAdminApiClient } from "@/lib/super-admin-api-client";
import { toast } from "react-hot-toast";

// ==================== TENANTS ====================

export interface Tenant {
  id: string;
  shortTenantId?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  subdomain?: string;
  databaseName: string;
  brandingName?: string | null;
  brandingLogoUrl?: string | null;
  isActive: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  subscriptionType: "MONTHLY" | "PERMANENT" | "YEARLY" | "TRIAL";
  subscriptionStartDate: string;
  subscriptionEndDate?: string;
  createdAt: string;
  updatedAt: string;
  subscriptions?: Subscription[];
  _count?: {
    subscriptions: number;
    tenantMigrations: number;
  };
}

export interface TenantUserPassword {
  password: string;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

export interface CreateTenantDto {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  subdomain?: string;
  subscriptionType: "MONTHLY" | "PERMANENT" | "YEARLY" | "TRIAL";
  subscriptionStartDate: string;
  subscriptionEndDate?: string;
  databaseUrl: string;
  adminEmail: string;
  adminPassword: string;
}

export interface UpdateTenantDto {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  subdomain?: string;
  isActive?: boolean;
  isSuspended?: boolean;
  suspensionReason?: string;
  subscriptionType?: "MONTHLY" | "PERMANENT" | "YEARLY" | "TRIAL";
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
}

export function useTenants(params?: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  isSuspended?: boolean;
  subscriptionType?: string;
}) {
  return useQuery({
    queryKey: ["super-admin", "tenants", params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.search && params.search.trim() !== "")
        queryParams.append("search", params.search);
      if (params?.isActive !== undefined)
        queryParams.append("isActive", params.isActive.toString());
      if (params?.isSuspended !== undefined)
        queryParams.append("isSuspended", params.isSuspended.toString());
      if (params?.subscriptionType && params.subscriptionType.trim() !== "")
        queryParams.append("subscriptionType", params.subscriptionType);

      const queryString = queryParams.toString();
      const url = queryString ? `/super-admin/tenants?${queryString}` : "/super-admin/tenants";
      const response = await superAdminApiClient.get(url);
      return response.data;
    },
  });
}

export function useDeletedTenants(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["super-admin", "tenants", "deleted", params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      const url = queryParams.toString()
        ? `/super-admin/tenants/deleted?${queryParams.toString()}`
        : "/super-admin/tenants/deleted";
      const response = await superAdminApiClient.get(url);
      return response.data;
    },
  });
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: ["super-admin", "tenants", id],
    queryFn: async () => {
      const response = await superAdminApiClient.get(`/super-admin/tenants/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useTenantUserPassword(tenantId?: string, userEmail?: string) {
  return useQuery({
    queryKey: ["super-admin", "tenants", tenantId, "password", userEmail],
    enabled: !!tenantId && !!userEmail,
    queryFn: async () => {
      const encodedEmail = encodeURIComponent(userEmail!);
      const response = await superAdminApiClient.get(
        `/super-admin/tenants/${tenantId}/users/${encodedEmail}/password`,
      );
      return response.data as TenantUserPassword;
    },
  });
}

export function useUpdateTenantUserPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenantId,
      userEmail,
      newPassword,
    }: {
      tenantId: string;
      userEmail: string;
      newPassword: string;
    }) => {
      const encodedEmail = encodeURIComponent(userEmail);
      await superAdminApiClient.post(
        `/super-admin/tenants/${tenantId}/users/${encodedEmail}/password`,
        { newPassword },
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["super-admin", "tenants", variables.tenantId, "password", variables.userEmail],
      });
      toast.success("Password updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update password");
    },
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTenantDto) => superAdminApiClient.post("/super-admin/tenants", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "tenants"] });
      toast.success("Tenant created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create tenant");
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTenantDto }) =>
      superAdminApiClient.patch(`/super-admin/tenants/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "tenants"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin", "tenants", variables.id] });
      toast.success("Tenant updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update tenant");
    },
  });
}

export function useToggleTenantActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      superAdminApiClient.patch(`/super-admin/tenants/${id}`, { isActive }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "tenants"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin", "tenants", variables.id] });
      toast.success(
        variables.isActive ? "Tenant activated successfully" : "Tenant deactivated successfully",
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update tenant status");
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => superAdminApiClient.delete(`/super-admin/tenants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "tenants"] });
      toast.success("Tenant deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete tenant");
    },
  });
}

export function useRestoreTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => superAdminApiClient.patch(`/super-admin/tenants/${id}/restore`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "tenants"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin", "tenants", "deleted"] });
      toast.success("Tenant restored successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to restore tenant");
    },
  });
}

export function useHardDeleteTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => superAdminApiClient.delete(`/super-admin/tenants/${id}/permanent`),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "tenants"] });
      // Use the message from the response if available, otherwise use default
      const message = response?.data?.message || "Tenant permanently deleted and data wiped";
      if (response?.data?.databaseWiped === false) {
        // Show warning if database wasn't wiped
        toast(message, { icon: "⚠️" });
      } else {
        toast.success(message);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to permanently delete tenant");
    },
  });
}

export function useSuspendTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      superAdminApiClient.post(`/super-admin/tenants/${id}/suspend`, { reason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "tenants"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin", "tenants", variables.id] });
      toast.success("Tenant suspended successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to suspend tenant");
    },
  });
}

export function useUnsuspendTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => superAdminApiClient.post(`/super-admin/tenants/${id}/unsuspend`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "tenants"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin", "tenants", id] });
      toast.success("Tenant unsuspended successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to unsuspend tenant");
    },
  });
}

// ==================== SUBSCRIPTIONS ====================

export interface Subscription {
  id: string;
  tenantId: string;
  type: "MONTHLY" | "PERMANENT" | "YEARLY" | "TRIAL";
  startDate: string;
  endDate?: string;
  amount: number;
  currency: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "SUSPENDED" | "PENDING";
  notes?: string;
  createdAt: string;
  updatedAt: string;
  tenant?: {
    id: string;
    name: string;
    email: string;
  };
  payments?: Payment[];
  _count?: {
    payments: number;
  };
}

export interface CreateSubscriptionDto {
  tenantId: string;
  type: "MONTHLY" | "PERMANENT" | "YEARLY" | "TRIAL";
  startDate: string;
  endDate?: string;
  amount: number;
  currency?: string;
  notes?: string;
}

export interface UpdateSubscriptionDto {
  type?: "MONTHLY" | "PERMANENT" | "YEARLY" | "TRIAL";
  startDate?: string;
  endDate?: string;
  amount?: number;
  currency?: string;
  status?: "ACTIVE" | "EXPIRED" | "CANCELLED" | "SUSPENDED" | "PENDING";
  notes?: string;
}

export function useSubscriptions(params?: {
  page?: number;
  limit?: number;
  tenantId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["super-admin", "subscriptions", params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.tenantId && params.tenantId.trim() !== "")
        queryParams.append("tenantId", params.tenantId);
      if (params?.status && params.status.trim() !== "")
        queryParams.append("status", params.status);

      const queryString = queryParams.toString();
      const url = queryString
        ? `/super-admin/subscriptions?${queryString}`
        : "/super-admin/subscriptions";
      const response = await superAdminApiClient.get(url);
      return response.data;
    },
  });
}

export function useSubscription(id: string) {
  return useQuery({
    queryKey: ["super-admin", "subscriptions", id],
    queryFn: async () => {
      const response = await superAdminApiClient.get(`/super-admin/subscriptions/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSubscriptionDto) =>
      superAdminApiClient.post("/super-admin/subscriptions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "subscriptions"] });
      toast.success("Subscription created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create subscription");
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSubscriptionDto }) =>
      superAdminApiClient.patch(`/super-admin/subscriptions/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin", "subscriptions", variables.id] });
      toast.success("Subscription updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update subscription");
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => superAdminApiClient.post(`/super-admin/subscriptions/${id}/cancel`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin", "subscriptions", id] });
      toast.success("Subscription cancelled successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to cancel subscription");
    },
  });
}

// ==================== PAYMENTS ====================

export interface Payment {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: "STRIPE" | "BANK_TRANSFER" | "CASH" | "CHEQUE" | "PAYPAL" | "OTHER";
  referenceNumber?: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "CANCELLED";
  notes?: string;
  createdAt: string;
  updatedAt: string;
  subscription?: {
    id: string;
    tenant?: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export interface CreatePaymentDto {
  subscriptionId: string;
  amount: number;
  currency?: string;
  paymentDate?: string;
  paymentMethod: "STRIPE" | "BANK_TRANSFER" | "CASH" | "CHEQUE" | "PAYPAL" | "OTHER";
  referenceNumber?: string;
  status?: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "CANCELLED";
  notes?: string;
}

export interface UpdatePaymentDto {
  amount?: number;
  currency?: string;
  paymentDate?: string;
  paymentMethod?: "STRIPE" | "BANK_TRANSFER" | "CASH" | "CHEQUE" | "PAYPAL" | "OTHER";
  referenceNumber?: string;
  status?: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "CANCELLED";
  notes?: string;
}

export function usePayments(params?: {
  page?: number;
  limit?: number;
  subscriptionId?: string;
  tenantId?: string;
  paymentMethod?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ["super-admin", "payments", params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.subscriptionId && params.subscriptionId.trim() !== "")
        queryParams.append("subscriptionId", params.subscriptionId);
      if (params?.tenantId && params.tenantId.trim() !== "")
        queryParams.append("tenantId", params.tenantId);
      if (params?.paymentMethod && params.paymentMethod.trim() !== "")
        queryParams.append("paymentMethod", params.paymentMethod);
      if (params?.status && params.status.trim() !== "")
        queryParams.append("status", params.status);
      if (params?.startDate && params.startDate.trim() !== "")
        queryParams.append("startDate", params.startDate);
      if (params?.endDate && params.endDate.trim() !== "")
        queryParams.append("endDate", params.endDate);

      const queryString = queryParams.toString();
      const url = queryString ? `/super-admin/payments?${queryString}` : "/super-admin/payments";
      const response = await superAdminApiClient.get(url);
      return response.data;
    },
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ["super-admin", "payments", id],
    queryFn: async () => {
      const response = await superAdminApiClient.get(`/super-admin/payments/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function usePaymentStats(tenantId?: string) {
  return useQuery({
    queryKey: ["super-admin", "payments", "stats", tenantId],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (tenantId) queryParams.append("tenantId", tenantId);

      const response = await superAdminApiClient.get(
        `/super-admin/payments/stats?${queryParams.toString()}`,
      );
      return response.data;
    },
  });
}

// ==================== BRANDING ====================

export interface TenantBranding {
  name: string;
  logoUrl?: string | null;
  logoId?: string | null;
  updatedAt?: string | null;
}

export function useTenantBranding(id?: string) {
  return useQuery({
    queryKey: ["super-admin", "tenants", id, "branding"],
    queryFn: async () => {
      const response = await superAdminApiClient.get(`/super-admin/tenants/${id}/branding`);
      return response.data as TenantBranding;
    },
    enabled: !!id,
  });
}

export function useUpdateTenantBranding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      brandingName,
      logo,
    }: {
      id: string;
      brandingName?: string;
      logo?: File | null;
    }) => {
      const formData = new FormData();
      if (brandingName !== undefined) formData.append("brandingName", brandingName);
      if (logo) formData.append("logo", logo);

      const response = await superAdminApiClient.patch(
        `/super-admin/tenants/${id}/branding`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return response.data as TenantBranding;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "tenants", variables.id] });
      queryClient.setQueryData(["super-admin", "tenants", variables.id, "branding"], data);
      toast.success("Branding updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update branding");
    },
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentDto) => superAdminApiClient.post("/super-admin/payments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "payments"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin", "payments", "stats"] });
      toast.success("Payment created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create payment");
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePaymentDto }) =>
      superAdminApiClient.patch(`/super-admin/payments/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "payments"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin", "payments", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["super-admin", "payments", "stats"] });
      toast.success("Payment updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update payment");
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => superAdminApiClient.delete(`/super-admin/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "payments"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin", "payments", "stats"] });
      toast.success("Payment deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete payment");
    },
  });
}

// ==================== ANALYTICS ====================

export interface AnalyticsOverview {
  tenants: {
    total: number;
    active: number;
    suspended: number;
    inactive: number;
  };
  subscriptions: {
    total: number;
    active: number;
  };
  payments: {
    total: number;
    completed: number;
  };
  revenue: {
    total: number;
    currency: string;
  };
  recentTenants: Array<{
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    isSuspended: boolean;
    createdAt: string;
  }>;
  expiringSubscriptions: Array<{
    id: string;
    endDate: string;
    tenant: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export interface RevenueStats {
  total: number;
  currency: string;
  monthly: Record<string, number>;
  byMethod: Array<{
    method: string;
    amount: number;
  }>;
  payments: number;
}

export interface TenantStats {
  total: number;
  active: number;
  suspended: number;
  inactive: number;
  bySubscriptionType: Record<string, number>;
  recent: Array<{
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    isSuspended: boolean;
    subscriptionType: string;
    createdAt: string;
  }>;
  growth: Array<{
    month: string;
    count: number;
    cumulative: number;
  }>;
}

export interface SubscriptionAnalytics {
  total: number;
  active: number;
  expired: number;
  cancelled: number;
  byType: Record<string, number>;
  expiring: Array<{
    id: string;
    endDate: string;
    tenant: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export interface UsageMetrics {
  totalTenants: number;
  totalSubscriptions: number;
  totalPayments: number;
  message?: string;
}

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ["super-admin", "analytics", "overview"],
    queryFn: async () => {
      const response = await superAdminApiClient.get("/super-admin/analytics/overview");
      return response.data as AnalyticsOverview;
    },
  });
}

export function useAnalyticsRevenue(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["super-admin", "analytics", "revenue", startDate, endDate],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);

      const queryString = queryParams.toString();
      const url = queryString
        ? `/super-admin/analytics/revenue?${queryString}`
        : "/super-admin/analytics/revenue";
      const response = await superAdminApiClient.get(url);
      return response.data as RevenueStats;
    },
  });
}

export function useAnalyticsTenants() {
  return useQuery({
    queryKey: ["super-admin", "analytics", "tenants"],
    queryFn: async () => {
      const response = await superAdminApiClient.get("/super-admin/analytics/tenants");
      return response.data as TenantStats;
    },
  });
}

export function useAnalyticsSubscriptions() {
  return useQuery({
    queryKey: ["super-admin", "analytics", "subscriptions"],
    queryFn: async () => {
      const response = await superAdminApiClient.get("/super-admin/analytics/subscriptions");
      return response.data as SubscriptionAnalytics;
    },
  });
}

export function useAnalyticsUsage() {
  return useQuery({
    queryKey: ["super-admin", "analytics", "usage"],
    queryFn: async () => {
      const response = await superAdminApiClient.get("/super-admin/analytics/usage");
      return response.data as UsageMetrics;
    },
  });
}

// ==================== SCHEMA UPDATES ====================

export interface UpdateSchemaResponse {
  success: boolean;
  message: string;
  migrationsApplied?: number;
  tenantName?: string;
}

export interface UpdateAllSchemasResponse {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    tenantId: string;
    tenantName: string;
    success: boolean;
    message: string;
  }>;
}

export function useUpdateTenantSchema() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await superAdminApiClient.post(
        `/super-admin/tenants/${tenantId}/update-schema`,
      );
      return response.data as UpdateSchemaResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "tenants"] });
      if (data.success) {
        toast.success(
          data.migrationsApplied && data.migrationsApplied > 0
            ? `Schema updated successfully for ${data.tenantName || "tenant"}. Applied ${data.migrationsApplied} migration(s).`
            : `Schema is already up to date for ${data.tenantName || "tenant"}.`,
        );
      } else {
        toast.error(data.message || "Failed to update schema");
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update tenant schema");
    },
  });
}

export function useUpdateAllTenantsSchema() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await superAdminApiClient.post("/super-admin/tenants/update-schema/all");
      return response.data as UpdateAllSchemasResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "tenants"] });
      if (data.total === 0) {
        toast.success("No active tenants to update");
      } else if (data.successful > 0 && data.failed === 0) {
        toast.success(`✅ Successfully updated schemas for all ${data.successful} tenant(s)`);
      } else if (data.successful > 0 && data.failed > 0) {
        toast(
          `⚠️ Schema update completed: ${data.successful} successful, ${data.failed} failed out of ${data.total} tenants`,
          { duration: 6000, icon: "⚠️" },
        );
      } else {
        toast.error(`❌ Schema update failed for all ${data.failed} tenant(s)`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update all tenant schemas");
    },
  });
}

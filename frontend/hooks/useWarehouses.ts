import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { isDummyDataEnabled } from '@/lib/dummy-data';
import {
  generateDummyWarehouses,
  generateDummyZones,
  generateDummyCapacityAlerts,
  getDummyZonesForWarehouse,
  getDummyAlertsForWarehouse,
  dummyWarehouses,
  dummyZonesByWarehouse,
  dummyLocations,
  dummyUsers,
} from '@/data/dummy/factory/warehouses';

const getUseDummyData = () => isDummyDataEnabled()

// In-memory storage for dummy data mutations
let dummyDataStore = {
  warehouses: [...dummyWarehouses],
  zones: new Map<string, WarehouseZone[]>(),
  alerts: new Map<string, CapacityAlert[]>(),
};

// Initialize zones for all warehouses from pre-generated data
dummyWarehouses.forEach(warehouse => {
  const zones = dummyZonesByWarehouse.get(warehouse.id) || getDummyZonesForWarehouse(warehouse.id);
  dummyDataStore.zones.set(warehouse.id, zones);
  const zoneIds = zones.map(z => z.id);
  const alerts = getDummyAlertsForWarehouse(warehouse.id, zoneIds);
  dummyDataStore.alerts.set(warehouse.id, alerts);
});

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  warehouseType: 'STORAGE' | 'DISPATCH';
  locationId: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  totalCapacity: number;
  usedCapacity: number;
  availableCapacity: number;
  capacityUnit: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'FULL';
  isActive: boolean;
  managerId?: string;
  description?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  location?: {
    id: string;
    name: string;
    type: string;
  };
  manager?: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    zones: number;
    stockBalances: number;
    capacityAlerts: number;
  };
}

export interface WarehouseZone {
  id: string;
  warehouseId: string;
  name: string;
  code: string;
  zoneType: 'RAW_MATERIALS' | 'PACKAGING' | 'FINISHED_GOODS' | 'QUARANTINE' | 'REJECTED' | 'TEMPORARY';
  description?: string;
  totalCapacity: number;
  usedCapacity: number;
  availableCapacity: number;
  isActive: boolean;
  temperature?: number;
  humidity?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  warehouse?: {
    id: string;
    name: string;
    code: string;
  };
  _count?: {
    stockBalances: number;
  };
}

export interface WarehouseFilters {
  page?: number;
  limit?: number;
  search?: string;
  warehouseType?: 'STORAGE' | 'DISPATCH';
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'FULL';
  locationId?: string;
  managerId?: string;
  isActive?: boolean;
}

export interface CreateWarehouseDto {
  name: string;
  code: string;
  warehouseType: 'STORAGE' | 'DISPATCH';
  locationId: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  totalCapacity: number;
  capacityUnit?: string;
  description?: string;
  notes?: string;
  managerId?: string;
  isActive?: boolean;
}

export interface UpdateWarehouseDto extends Partial<CreateWarehouseDto> { }

export interface WarehouseStats {
  warehouse: {
    id: string;
    name: string;
    code: string;
    status: string;
    isActive: boolean;
  };
  capacity: {
    total: number;
    used: number;
    available: number;
    percentage: number;
    unit: string;
  };
  counts: {
    zones: number;
    stockBalances: number;
    totalAlerts: number;
    activeAlerts: number;
  };
}

export interface CapacityAlert {
  id: string;
  warehouseId: string;
  zoneId?: string;
  alertLevel: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'FULL';
  currentCapacity: number;
  currentUsed: number;
  currentAvailable: number;
  threshold: number;
  message?: string;
  isResolved: boolean;
  resolvedById?: string;
  resolvedAt?: string;
  createdAt: string;
  zone?: {
    id: string;
    name: string;
    code: string;
  };
}

export function useWarehouses(filters?: WarehouseFilters) {
  return useQuery({
    queryKey: ['warehouses', filters],
    queryFn: async () => {
      if (getUseDummyData()) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));

        let warehouses = [...dummyDataStore.warehouses];

        // Apply filters
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          warehouses = warehouses.filter(w =>
            w.name.toLowerCase().includes(searchLower) ||
            w.code.toLowerCase().includes(searchLower) ||
            w.location?.name.toLowerCase().includes(searchLower)
          );
        }

        if (filters?.warehouseType) {
          warehouses = warehouses.filter(w => w.warehouseType === filters.warehouseType);
        }

        if (filters?.status) {
          warehouses = warehouses.filter(w => w.status === filters.status);
        }

        if (filters?.locationId) {
          warehouses = warehouses.filter(w => w.locationId === filters.locationId);
        }

        if (filters?.managerId) {
          warehouses = warehouses.filter(w => w.managerId === filters.managerId);
        }

        if (filters?.isActive !== undefined) {
          warehouses = warehouses.filter(w => w.isActive === filters.isActive);
        }

        // Pagination
        const page = filters?.page || 1;
        const limit = filters?.limit || 20;
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedWarehouses = warehouses.slice(start, end);

        return {
          data: paginatedWarehouses,
          meta: {
            total: warehouses.length,
            page,
            limit,
            totalPages: Math.ceil(warehouses.length / limit),
          },
        };
      }

      // Backend API call
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.warehouseType) params.append('warehouseType', filters.warehouseType);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.locationId) params.append('locationId', filters.locationId);
      if (filters?.managerId) params.append('managerId', filters.managerId);
      if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());

      const response = await apiClient.get(`/warehouses?${params.toString()}`);
      // Handle wrapped response from ResponseInterceptor
      // Response format: { success: true, message: string, data: { data: [...], meta: {...} } }
      const responseData = response.data;

      // If response is wrapped, extract the inner data
      if (responseData && typeof responseData === 'object' && 'data' in responseData && !Array.isArray(responseData.data)) {
        // Wrapped response: { success, message, data: { data: [...], meta: {...} } }
        return responseData.data;
      }

      // Direct response: { data: [...], meta: {...} }
      return responseData;
    },
  });
}

export function useWarehouse(id: string) {
  return useQuery({
    queryKey: ['warehouse', id],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 200));
        const warehouse = dummyDataStore.warehouses.find(w => w.id === id);
        if (!warehouse) {
          throw new Error('Warehouse not found');
        }
        return warehouse;
      }

      const response = await apiClient.get(`/warehouses/${id}`);
      const responseData = response.data;
      // Handle wrapped response: { success, message, data }
      if (responseData && typeof responseData === 'object' && 'success' in responseData && 'data' in responseData) {
        return responseData.data;
      }
      return responseData;
    },
    enabled: !!id,
  });
}

export function useWarehouseStats(id: string) {
  return useQuery({
    queryKey: ['warehouse-stats', id],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 200));
        const warehouse = dummyDataStore.warehouses.find(w => w.id === id);
        if (!warehouse) {
          throw new Error('Warehouse not found');
        }

        const zones = dummyDataStore.zones.get(id) || [];
        const alerts = dummyDataStore.alerts.get(id) || [];

        const stats: WarehouseStats = {
          warehouse: {
            id: warehouse.id,
            name: warehouse.name,
            code: warehouse.code,
            status: warehouse.status,
            isActive: warehouse.isActive,
          },
          capacity: {
            total: warehouse.totalCapacity,
            used: warehouse.usedCapacity,
            available: warehouse.availableCapacity,
            percentage: (warehouse.usedCapacity / warehouse.totalCapacity) * 100,
            unit: warehouse.capacityUnit,
          },
          counts: {
            zones: zones.length,
            stockBalances: warehouse._count?.stockBalances || 0,
            totalAlerts: alerts.length,
            activeAlerts: alerts.filter(a => !a.isResolved).length,
          },
        };

        return stats;
      }

      const response = await apiClient.get(`/warehouses/${id}/stats`);
      const responseData = response.data;
      // Handle wrapped response: { success, message, data }
      if (responseData && typeof responseData === 'object' && 'success' in responseData && 'data' in responseData) {
        return responseData.data as WarehouseStats;
      }
      return responseData as WarehouseStats;
    },
    enabled: !!id,
  });
}

export function useWarehouseStockSummary(id: string) {
  return useQuery({
    queryKey: ['warehouse-stock', id],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 200));
        const warehouse = dummyDataStore.warehouses.find(w => w.id === id);
        if (!warehouse) {
          return { data: [], meta: { total: 0 } };
        }

        // Generate dummy stock summary
        const stockSummary = Array.from({ length: 20 }, (_, i) => ({
          id: `stock-${id}-${i}`,
          productId: `product-${i}`,
          productName: `Product ${i + 1}`,
          productCode: `PROD-${String(i + 1).padStart(3, '0')}`,
          quantity: Math.floor(Math.random() * 1000) + 100,
          reservedQuantity: Math.floor(Math.random() * 100),
          availableQuantity: Math.floor(Math.random() * 900) + 100,
          zoneId: `zone-${id}-${Math.floor(Math.random() * 5) + 1}`,
          zoneName: `Zone ${Math.floor(Math.random() * 5) + 1}`,
          unit: 'UNIT',
        }));

        const result = {
          data: stockSummary,
          meta: { total: stockSummary.length },
        };
        return result;
      }

      const response = await apiClient.get(`/warehouses/${id}/stock`);
      const responseData = response.data;

      // Handle wrapped response: { success, message, data: { warehouse, summary, stockBalances } }
      if (responseData && typeof responseData === 'object' && 'success' in responseData && 'data' in responseData) {
        const actualData = responseData.data;
        // Transform to { data: stockBalances, ... } for the UI
        return {
          data: actualData.stockBalances || [],
          summary: actualData.summary,
          warehouse: actualData.warehouse,
          meta: { total: actualData.summary?.totalProducts || actualData.stockBalances?.length || 0 }
        };
      }

      // If responseData is already an array
      if (Array.isArray(responseData)) {
        return { data: responseData, meta: { total: responseData.length } };
      }

      return { data: [], meta: { total: 0 } };
    },
    enabled: !!id,
  });
}

export function useWarehouseCapacityInfo(id: string) {
  return useQuery({
    queryKey: ['warehouse-capacity', id],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 200));
        const warehouse = dummyDataStore.warehouses.find(w => w.id === id);
        if (!warehouse) {
          throw new Error('Warehouse not found');
        }

        const capacityPercentage = warehouse.totalCapacity > 0
          ? (warehouse.usedCapacity / warehouse.totalCapacity) * 100
          : 0;

        const result = {
          totalCapacity: warehouse.totalCapacity,
          usedCapacity: warehouse.usedCapacity,
          availableCapacity: warehouse.availableCapacity,
          capacityPercentage,
          capacityUnit: warehouse.capacityUnit,
        };
        return result;
      }

      const response = await apiClient.get(`/warehouses/${id}/capacity`);
      const responseData = response.data;

      // Handle wrapped response from ResponseInterceptor
      if (responseData && typeof responseData === 'object' && 'data' in responseData && !Array.isArray(responseData.data)) {
        // Wrapped response: { success, message, data: { totalCapacity, usedCapacity, ... } }
        return responseData.data;
      }

      // Direct response: { totalCapacity, usedCapacity, ... }
      return responseData;
    },
    enabled: !!id,
  });
}

export function useWarehouseCapacityAlerts(id: string) {
  return useQuery({
    queryKey: ['warehouse-alerts', id],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 200));
        const alerts = dummyDataStore.alerts.get(id) || [];
        return alerts;
      }

      const response = await apiClient.get(`/warehouses/${id}/alerts`);
      const responseData = response.data;

      // Handle wrapped response: { success, message, data: [alerts...] }
      if (responseData && typeof responseData === 'object' && 'success' in responseData && 'data' in responseData) {
        return Array.isArray(responseData.data) ? responseData.data : [];
      }

      // If responseData is already an array
      if (Array.isArray(responseData)) {
        return responseData;
      }

      return [];
    },
    enabled: !!id,
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWarehouseDto) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const location = dummyLocations.find(l => l.id === data.locationId);
        const manager = data.managerId ? dummyUsers.find(u => u.id === data.managerId) : undefined;

        const newWarehouse: Warehouse = {
          id: `wh-${Date.now()}`,
          name: data.name,
          code: data.code,
          warehouseType: data.warehouseType,
          locationId: data.locationId,
          address: data.address,
          contactPerson: data.contactPerson,
          contactPhone: data.contactPhone,
          contactEmail: data.contactEmail,
          totalCapacity: data.totalCapacity,
          usedCapacity: 0,
          availableCapacity: data.totalCapacity,
          capacityUnit: data.capacityUnit || 'CUBIC_METER',
          status: data.isActive === false ? 'INACTIVE' : 'ACTIVE',
          isActive: data.isActive !== false,
          managerId: data.managerId,
          description: data.description,
          notes: data.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          location: location ? {
            id: location.id,
            name: location.name,
            type: 'WAREHOUSE',
          } : undefined,
          manager: manager ? {
            id: manager.id,
            name: manager.name,
            email: manager.email,
          } : undefined,
          _count: {
            zones: 0,
            stockBalances: 0,
            capacityAlerts: 0,
          },
        };

        dummyDataStore.warehouses.push(newWarehouse);
        // Generate initial zones for the new warehouse
        const initialZones = getDummyZonesForWarehouse(newWarehouse.id);
        dummyDataStore.zones.set(newWarehouse.id, initialZones);
        // Generate alerts if capacity is high
        const zoneIds = initialZones.map(z => z.id);
        const initialAlerts = getDummyAlertsForWarehouse(newWarehouse.id, zoneIds);
        dummyDataStore.alerts.set(newWarehouse.id, initialAlerts);

        return newWarehouse;
      }

      const response = await apiClient.post('/warehouses', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWarehouseDto }) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const index = dummyDataStore.warehouses.findIndex(w => w.id === id);
        if (index === -1) {
          throw new Error('Warehouse not found');
        }

        const existing = dummyDataStore.warehouses[index];
        const location = data.locationId ? dummyLocations.find(l => l.id === data.locationId) : existing.location;
        const manager = data.managerId ? dummyUsers.find(u => u.id === data.managerId) : existing.manager;

        const updated: Warehouse = {
          ...existing,
          ...data,
          locationId: data.locationId || existing.locationId,
          managerId: data.managerId !== undefined ? data.managerId : existing.managerId,
          totalCapacity: data.totalCapacity !== undefined ? data.totalCapacity : existing.totalCapacity,
          capacityUnit: data.capacityUnit || existing.capacityUnit,
          isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
          status: data.isActive === false ? 'INACTIVE' : (existing.status === 'INACTIVE' ? 'ACTIVE' : existing.status),
          updatedAt: new Date().toISOString(),
          location: location ? {
            id: location.id,
            name: location.name,
            type: 'WAREHOUSE',
          } : existing.location,
          manager: manager ? {
            id: manager.id,
            name: manager.name,
            email: manager.email,
          } : existing.manager,
        };

        // Recalculate available capacity if total capacity changed
        if (data.totalCapacity !== undefined) {
          updated.availableCapacity = updated.totalCapacity - updated.usedCapacity;
        }

        dummyDataStore.warehouses[index] = updated;

        return updated;
      }

      const response = await apiClient.patch(`/warehouses/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stats', variables.id] });
    },
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const index = dummyDataStore.warehouses.findIndex(w => w.id === id);
        if (index === -1) {
          throw new Error('Warehouse not found');
        }

        dummyDataStore.warehouses.splice(index, 1);
        dummyDataStore.zones.delete(id);
        dummyDataStore.alerts.delete(id);

        return { success: true };
      }

      const response = await apiClient.delete(`/warehouses/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
  });
}

export function useAssignWarehouseManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, managerId }: { id: string; managerId: string }) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 300));

        const warehouse = dummyDataStore.warehouses.find(w => w.id === id);
        if (!warehouse) {
          throw new Error('Warehouse not found');
        }

        const manager = dummyUsers.find(u => u.id === managerId);
        if (!manager) {
          throw new Error('Manager not found');
        }

        warehouse.managerId = managerId;
        warehouse.manager = {
          id: manager.id,
          name: manager.name,
          email: manager.email,
        };
        warehouse.updatedAt = new Date().toISOString();

        return warehouse;
      }

      const response = await apiClient.patch(`/warehouses/${id}/manager`, { managerId });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
  });
}

export function useRemoveWarehouseManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 300));

        const warehouse = dummyDataStore.warehouses.find(w => w.id === id);
        if (!warehouse) {
          throw new Error('Warehouse not found');
        }

        warehouse.managerId = undefined;
        warehouse.manager = undefined;
        warehouse.updatedAt = new Date().toISOString();

        return warehouse;
      }

      const response = await apiClient.delete(`/warehouses/${id}/manager`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse', id] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
  });
}

export function useUpdateWarehouseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'FULL' }) => {
      const response = await apiClient.patch(`/warehouses/${id}/status`, { status });
      const responseData = response.data;
      // Handle wrapped response: { success, message, data }
      if (responseData && typeof responseData === 'object' && 'success' in responseData && 'data' in responseData) {
        return responseData.data;
      }
      return responseData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
  });
}

export function useUpdateWarehouseCapacity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { totalCapacity?: number; usedCapacity?: number; capacityUnit?: string } }) => {
      const response = await apiClient.patch(`/warehouses/${id}/capacity`, data);
      const responseData = response.data;
      // Handle wrapped response: { success, message, data }
      if (responseData && typeof responseData === 'object' && 'success' in responseData && 'data' in responseData) {
        return responseData.data;
      }
      return responseData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-capacity', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stats', variables.id] });
    },
  });
}

// Zone hooks
export function useWarehouseZones(warehouseId: string) {
  return useQuery({
    queryKey: ['warehouse-zones', warehouseId],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 200));
        const zones = dummyDataStore.zones.get(warehouseId) || [];
        return zones;
      }

      const response = await apiClient.get(`/warehouses/${warehouseId}/zones`);
      const responseData = response.data;

      // Handle wrapped response: { success, message, data: [zones...] }
      if (responseData && typeof responseData === 'object' && 'success' in responseData && 'data' in responseData) {
        return Array.isArray(responseData.data) ? responseData.data : [];
      }

      // If responseData is already an array
      if (Array.isArray(responseData)) {
        return responseData;
      }

      return [];
    },
    enabled: !!warehouseId,
  });
}

export function useWarehouseZone(warehouseId: string, zoneId: string) {
  return useQuery({
    queryKey: ['warehouse-zone', warehouseId, zoneId],
    queryFn: async () => {
      const response = await apiClient.get(`/warehouses/${warehouseId}/zones/${zoneId}`);
      return response.data as WarehouseZone;
    },
    enabled: !!warehouseId && !!zoneId,
  });
}

export function useCreateWarehouseZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ warehouseId, data }: { warehouseId: string; data: any }) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const existingZones = dummyDataStore.zones.get(warehouseId) || [];
        const zoneCount = existingZones.length;

        const newZone: WarehouseZone = {
          id: `zone-${warehouseId}-${Date.now()}`,
          warehouseId,
          name: data.name,
          code: data.code,
          zoneType: data.zoneType,
          description: data.description,
          totalCapacity: data.totalCapacity || 100,
          usedCapacity: 0,
          availableCapacity: data.totalCapacity || 100,
          isActive: data.isActive !== false,
          temperature: data.temperature,
          humidity: data.humidity,
          notes: data.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _count: {
            stockBalances: 0,
          },
        };

        existingZones.push(newZone);
        dummyDataStore.zones.set(warehouseId, existingZones);

        // Update warehouse zone count
        const warehouse = dummyDataStore.warehouses.find(w => w.id === warehouseId);
        if (warehouse && warehouse._count) {
          warehouse._count.zones = existingZones.length;
        }

        return newZone;
      }

      const response = await apiClient.post(`/warehouses/${warehouseId}/zones`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-zones', variables.warehouseId] });
      queryClient.invalidateQueries({ queryKey: ['warehouse', variables.warehouseId] });
    },
  });
}

export function useUpdateWarehouseZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ warehouseId, zoneId, data }: { warehouseId: string; zoneId: string; data: any }) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const zones = dummyDataStore.zones.get(warehouseId) || [];
        const index = zones.findIndex(z => z.id === zoneId);

        if (index === -1) {
          throw new Error('Zone not found');
        }

        const existing = zones[index];
        const updated: WarehouseZone = {
          ...existing,
          ...data,
          totalCapacity: data.totalCapacity !== undefined ? data.totalCapacity : existing.totalCapacity,
          updatedAt: new Date().toISOString(),
        };

        // Recalculate available capacity if total capacity changed
        if (data.totalCapacity !== undefined) {
          updated.availableCapacity = updated.totalCapacity - updated.usedCapacity;
        }

        zones[index] = updated;
        dummyDataStore.zones.set(warehouseId, zones);

        return updated;
      }

      const response = await apiClient.patch(`/warehouses/${warehouseId}/zones/${zoneId}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-zones', variables.warehouseId] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-zone', variables.warehouseId, variables.zoneId] });
      queryClient.invalidateQueries({ queryKey: ['warehouse', variables.warehouseId] });
    },
  });
}

export function useDeleteWarehouseZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ warehouseId, zoneId }: { warehouseId: string; zoneId: string }) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const zones = dummyDataStore.zones.get(warehouseId) || [];
        const index = zones.findIndex(z => z.id === zoneId);

        if (index === -1) {
          throw new Error('Zone not found');
        }

        zones.splice(index, 1);
        dummyDataStore.zones.set(warehouseId, zones);

        // Update warehouse zone count
        const warehouse = dummyDataStore.warehouses.find(w => w.id === warehouseId);
        if (warehouse && warehouse._count) {
          warehouse._count.zones = zones.length;
        }

        return { success: true };
      }


      const response = await apiClient.delete(`/warehouses/${warehouseId}/zones/${zoneId}`);


      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-zones', variables.warehouseId] });
      queryClient.invalidateQueries({ queryKey: ['warehouse', variables.warehouseId] });
    },
  });
}

// Export dummyDataStore for use in zones page
export function getDummyDataStore() {
  return dummyDataStore;
}


import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { PaginationMeta } from '@/components/ui/pagination'
import { Plant, ProductionLine, Machine } from './usePlants'
import { isDummyDataEnabled } from '@/lib/dummy-data'

// Use dummy data until backend is fully verified for this module
const getUseDummyData = () => isDummyDataEnabled()

export type WorkOrderStatus = 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface WorkOrder {
    id: string
    orderNumber: string
    title: string
    description?: string
    status: WorkOrderStatus
    priority: WorkOrderPriority
    productionOrderId?: string
    plantId: string
    plant?: Plant
    productionLineId?: string
    productionLine?: ProductionLine
    machineId?: string
    machine?: Machine
    assignedToId?: string
    assignedToName?: string // Populated for UI convenience
    startDate?: string
    endDate?: string
    dueDate?: string
    createdAt: string
    updatedAt: string
}

export interface WorkOrderFilters {
    page?: number
    limit?: number
    search?: string
    status?: WorkOrderStatus
    priority?: WorkOrderPriority
    plantId?: string
    assignedToId?: string
    startDate?: string
    endDate?: string
}

export interface WorkOrdersListResponse {
    data: WorkOrder[]
    meta: PaginationMeta
}

// Dummy Data
const dummyWorkOrders: WorkOrder[] = [
    {
        id: 'wo-1',
        orderNumber: 'WO-2024-001',
        title: 'Routine Maintenance - Line A',
        description: 'Monthly lubrication and safety check',
        status: 'SCHEDULED',
        priority: 'MEDIUM',
        plantId: 'plant-1',
        plant: { id: 'plant-1', name: 'Main Factory', code: 'FAC-01', locationId: 'loc-1', status: 'ACTIVE', productionLinesCount: 5, machinesCount: 10, activeWorkOrdersCount: 2, createdAt: '', updatedAt: '' },
        productionLineId: 'line-1',
        productionLine: { id: 'line-1', name: 'Assembly Line 1', code: 'AL-01', plantId: 'plant-1', status: 'ACTIVE', capacity: 100, currentUtilization: 75, activeWorkOrdersCount: 1, createdAt: '', updatedAt: '' },
        assignedToId: 'usr-2',
        assignedToName: 'John Technician',
        startDate: '2024-01-10T09:00:00Z',
        dueDate: '2024-01-10T17:00:00Z',
        createdAt: '2023-12-28T10:00:00Z',
        updatedAt: '2023-12-28T10:00:00Z'
    },
    {
        id: 'wo-2',
        orderNumber: 'WO-2024-002',
        title: 'Emergency Repair - Conveyor Belt',
        description: 'Belt snapped during operation',
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        plantId: 'plant-1',
        plant: { id: 'plant-1', name: 'Main Factory', code: 'FAC-01', locationId: 'loc-1', status: 'ACTIVE', productionLinesCount: 5, machinesCount: 10, activeWorkOrdersCount: 2, createdAt: '', updatedAt: '' },
        productionLineId: 'line-2',
        productionLine: { id: 'line-2', name: 'Packaging Line', code: 'PL-01', plantId: 'plant-1', status: 'ACTIVE', capacity: 80, currentUtilization: 60, activeWorkOrdersCount: 1, createdAt: '', updatedAt: '' },
        assignedToId: 'usr-3',
        assignedToName: 'Sarah Engineer',
        startDate: '2024-01-02T08:00:00Z',
        dueDate: '2024-01-02T12:00:00Z',
        createdAt: '2024-01-02T07:30:00Z',
        updatedAt: '2024-01-02T08:00:00Z'
    },
    {
        id: 'wo-3',
        orderNumber: 'WO-2024-003',
        title: 'Calibration - CNC Machine',
        status: 'COMPLETED',
        priority: 'HIGH',
        plantId: 'plant-2',
        plant: { id: 'plant-2', name: 'West Annex', code: 'FAC-02', locationId: 'loc-2', status: 'ACTIVE', productionLinesCount: 3, machinesCount: 5, activeWorkOrdersCount: 1, createdAt: '', updatedAt: '' },
        machineId: 'mach-1',
        machine: { id: 'mach-1', name: 'CNC-01', code: 'CNC-001', type: 'CNC', plantId: 'plant-2', status: 'OPERATIONAL', serialNumber: 'SN123', createdAt: '', updatedAt: '' },
        assignedToId: 'usr-2',
        assignedToName: 'John Technician',
        startDate: '2023-12-20T10:00:00Z',
        endDate: '2023-12-20T14:00:00Z',
        dueDate: '2023-12-21T00:00:00Z',
        createdAt: '2023-12-15T09:00:00Z',
        updatedAt: '2023-12-20T14:00:00Z'
    },
    {
        id: 'wo-4',
        orderNumber: 'WO-2024-004',
        title: 'Quarterly Inspection',
        status: 'DRAFT',
        priority: 'LOW',
        plantId: 'plant-1',
        plant: { id: 'plant-1', name: 'Main Factory', code: 'FAC-01', locationId: 'loc-1', status: 'ACTIVE', productionLinesCount: 5, machinesCount: 10, activeWorkOrdersCount: 2, createdAt: '', updatedAt: '' },
        dueDate: '2024-03-01T00:00:00Z',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
    },
    {
        id: 'wo-5',
        orderNumber: 'WO-2024-005',
        title: 'Broken Light Fixture',
        status: 'CANCELLED',
        priority: 'LOW',
        plantId: 'plant-1',
        plant: { id: 'plant-1', name: 'Main Factory', code: 'FAC-01', locationId: 'loc-1', status: 'ACTIVE', productionLinesCount: 5, machinesCount: 10, activeWorkOrdersCount: 2, createdAt: '', updatedAt: '' },
        dueDate: '2024-01-05T00:00:00Z',
        createdAt: '2024-01-01T08:00:00Z',
        updatedAt: '2024-01-02T10:00:00Z'
    }
]

function transformWorkOrder(raw: any): WorkOrder {
    if (!raw) {
        // Fallback empty shape to avoid runtime errors
        const now = new Date().toISOString()
        return {
            id: '',
            orderNumber: '',
            title: '',
            description: '',
            status: 'SCHEDULED',
            priority: 'MEDIUM',
            plantId: '',
            plant: undefined,
            productionLineId: undefined,
            productionLine: undefined,
            machineId: undefined,
            machine: undefined,
            assignedToId: undefined,
            assignedToName: undefined,
            startDate: undefined,
            endDate: undefined,
            dueDate: undefined,
            createdAt: now,
            updatedAt: now,
        }
    }

    const productionOrder = raw.productionOrder || {}
    const plant = productionOrder.plant || raw.plant
    const assignedTo = raw.assignedTo

    const actualStartDate = raw.actualStartDate || raw.startDate
    const actualEndDate = raw.actualEndDate || raw.endDate
    const scheduledEndDate = raw.scheduledEndDate || raw.dueDate

    return {
        id: raw.id,
        orderNumber: raw.workOrderNumber || raw.orderNumber || '',
        title: raw.title,
        description: raw.description ?? undefined,
        status: raw.status as WorkOrderStatus,
        priority: raw.priority as WorkOrderPriority,
        plantId: plant?.id || productionOrder.plantId || raw.plantId || '',
        plant: plant
            ? {
                id: plant.id,
                name: plant.name,
                code: plant.code,
                locationId: plant.locationId,
                status: plant.status,
                productionLinesCount: plant.productionLinesCount ?? 0,
                machinesCount: plant.machinesCount ?? 0,
                activeWorkOrdersCount: plant.activeWorkOrdersCount ?? 0,
                createdAt: plant.createdAt ?? new Date().toISOString(),
                updatedAt: plant.updatedAt ?? new Date().toISOString(),
            }
            : undefined,
        // Work order → production line/machine are optional and may not be loaded yet
        productionLineId: raw.productionLineId,
        productionLine: raw.productionLine as ProductionLine | undefined,
        machineId: raw.machineId,
        machine: raw.machine as Machine | undefined,
        assignedToId: raw.assignedToId,
        startDate: actualStartDate ? new Date(actualStartDate).toISOString() : undefined,
        endDate: actualEndDate ? new Date(actualEndDate).toISOString() : undefined,
        // Frontend treats dueDate as the scheduled end date
        dueDate: scheduledEndDate
            ? new Date(scheduledEndDate).toISOString()
            : undefined,
        createdAt: raw.createdAt
            ? new Date(raw.createdAt).toISOString()
            : new Date().toISOString(),
        updatedAt: raw.updatedAt
            ? new Date(raw.updatedAt).toISOString()
            : new Date().toISOString(),
    }
}

export function useWorkOrders(filters?: WorkOrderFilters) {
    return useQuery<WorkOrdersListResponse>({
        queryKey: ['work-orders', filters],
        queryFn: async () => {
            if (getUseDummyData()) {
                // Simulate API delay
                await new Promise(resolve => setTimeout(resolve, 600))

                let filtered = [...dummyWorkOrders]

                if (filters?.search) {
                    const searchLower = filters.search.toLowerCase()
                    filtered = filtered.filter(wo =>
                        wo.orderNumber.toLowerCase().includes(searchLower) ||
                        wo.title.toLowerCase().includes(searchLower) ||
                        wo.plant?.name.toLowerCase().includes(searchLower)
                    )
                }

                if (filters?.status) {
                    filtered = filtered.filter(wo => wo.status === filters.status)
                }

                if (filters?.plantId) {
                    filtered = filtered.filter(wo => wo.plantId === filters.plantId)
                }

                if (filters?.priority) {
                    filtered = filtered.filter(wo => wo.priority === filters.priority)
                }

                return {
                    data: filtered,
                    meta: {
                        total: filtered.length,
                        page: filters?.page || 1,
                        limit: filters?.limit || 20,
                        totalPages: 1
                    }
                }
            }

            // Map frontend filters to backend filters (e.g. DRAFT → SCHEDULED)
            const backendFilters: any = { ...(filters || {}) }
            if (backendFilters.status === 'DRAFT') {
                // Backend does not have a DRAFT status; use SCHEDULED as the initial state
                backendFilters.status = 'SCHEDULED'
            }

            const response = await apiClient.get('/work-orders', { params: backendFilters })
            const payload = response.data?.data || response.data

            if (payload && Array.isArray(payload.data)) {
                return {
                    ...payload,
                    data: payload.data.map(transformWorkOrder),
                }
            }

            // Fallback if backend returns a bare array
            if (Array.isArray(payload)) {
                return {
                    data: payload.map(transformWorkOrder),
                    meta: {
                        total: payload.length,
                        page: backendFilters.page || 1,
                        limit: backendFilters.limit || payload.length,
                        totalPages: 1,
                    },
                }
            }

            return payload
        }
    })
}

export function useWorkOrder(id: string) {
    return useQuery({
        queryKey: ['work-orders', id],
        queryFn: async () => {
            if (getUseDummyData()) {
                await new Promise(resolve => setTimeout(resolve, 500))
                return dummyWorkOrders.find(w => w.id === id) || null
            }
            const response = await apiClient.get(`/work-orders/${id}`)
            const payload = response.data?.data || response.data
            return transformWorkOrder(payload)
        },
        enabled: !!id
    })
}

export function useCreateWorkOrder() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (data: any) => {
            if (getUseDummyData()) {
                await new Promise(resolve => setTimeout(resolve, 1000))
                const newOrder: WorkOrder = {
                    ...data,
                    id: `wo-${Date.now()}`,
                    orderNumber: `WO-2024-${Math.floor(Math.random() * 1000)}`,
                    status: data.status || 'DRAFT',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    plant: { id: 'plant-1', name: 'Main Factory' } as any
                }
                dummyWorkOrders.push(newOrder)
                return newOrder
            }
            const response = await apiClient.post('/work-orders', data)
            return response.data?.data || response.data
        },
        onSuccess: async () => {
            // Invalidate and refetch all work order queries
            await queryClient.invalidateQueries({ queryKey: ['work-orders'] })
            // Explicitly refetch to ensure UI updates
            await queryClient.refetchQueries({ queryKey: ['work-orders'] })
        }
    })
}

export function useUpdateWorkOrder() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<WorkOrder> }) => {
            if (getUseDummyData()) {
                await new Promise(resolve => setTimeout(resolve, 1000))
                const index = dummyWorkOrders.findIndex(w => w.id === id)
                if (index !== -1) {
                    dummyWorkOrders[index] = { ...dummyWorkOrders[index], ...data, updatedAt: new Date().toISOString() }
                    return dummyWorkOrders[index]
                }
                throw new Error('Work order not found')
            }
            const response = await apiClient.patch(`/work-orders/${id}`, data)
            return response.data?.data || response.data
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['work-orders'] })
            queryClient.invalidateQueries({ queryKey: ['work-orders', variables.id] })
        }
    })
}


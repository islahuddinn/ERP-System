import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface ProductionReport {
    id: string
    date: string
    orderNumber: string
    productName: string
    plannedQty: number
    producedQty: number
    efficiency: number
    status: string
    plant: string
}

export interface MaterialReport {
    id: string
    date: string
    materialName: string
    materialSku?: string
    batchNumber: string | null
    quantityUsed: number
    uom: string
    scrapRate: number
    totalCost: number
    plant?: string
    requestNumber?: string
}

export interface QualityReport {
    id: string
    date: string
    inspectionNumber?: string
    batchNumber: string
    productName: string
    productSku?: string
    inspectionType: string
    qualityStatus: string
    results: string
    observations?: string[]
    inspectedBy?: string
    passRate: number
}

export interface WasteReport {
    id: string
    date: string
    wasteNumber: string
    wasteType: string
    productName: string
    batchNumber: string | null
    quantity: number
    cost: number
    reason: string
    plant: string
}

export interface WarehouseReport {
    id?: string
    date: string
    location: string
    locationCode?: string
    item: string
    itemSku?: string
    zone?: string | null
    incoming: number
    outgoing: number
    stockLevel: number
    capacityUtilization: number
}

export interface CostingReport {
    id: string
    orderNumber: string
    productName: string
    plant: string
    quantity: number
    materialCost: number
    productionCost: number
    totalCost: number
    unitCost: number
    date: string
}

export function useFactoryReports() {
    return {
        useProductionReports: (startDate?: string, endDate?: string, plantId?: string) => useQuery<ProductionReport[]>({
            queryKey: ['factory-reports', 'production', startDate, endDate, plantId],
            queryFn: async () => {
                const params: any = {}
                if (startDate) params.startDate = startDate
                if (endDate) params.endDate = endDate
                if (plantId) params.plantId = plantId
                const response = await apiClient.get('/factory/reports/production', { params })
                const data = response.data?.data || response.data
                return Array.isArray(data) ? data : []
            }
        }),

        useMaterialReports: (startDate?: string, endDate?: string, plantId?: string) => useQuery<MaterialReport[]>({
            queryKey: ['factory-reports', 'material', startDate, endDate, plantId],
            queryFn: async () => {
                const params: any = {}
                if (startDate) params.startDate = startDate
                if (endDate) params.endDate = endDate
                if (plantId) params.plantId = plantId
                const response = await apiClient.get('/factory/reports/material', { params })
                const data = response.data?.data || response.data
                return Array.isArray(data) ? data : []
            }
        }),

        useQualityReports: (startDate?: string, endDate?: string, plantId?: string) => useQuery<QualityReport[]>({
            queryKey: ['factory-reports', 'quality', startDate, endDate, plantId],
            queryFn: async () => {
                const params: any = {}
                if (startDate) params.startDate = startDate
                if (endDate) params.endDate = endDate
                if (plantId) params.plantId = plantId
                const response = await apiClient.get('/factory/reports/quality', { params })
                const data = response.data?.data || response.data
                return Array.isArray(data) ? data : []
            }
        }),

        useWasteReports: (startDate?: string, endDate?: string, plantId?: string) => useQuery<WasteReport[]>({
            queryKey: ['factory-reports', 'waste', startDate, endDate, plantId],
            queryFn: async () => {
                const params: any = {}
                if (startDate) params.startDate = startDate
                if (endDate) params.endDate = endDate
                if (plantId) params.plantId = plantId
                const response = await apiClient.get('/factory/reports/waste', { params })
                const data = response.data?.data || response.data
                return Array.isArray(data) ? data : []
            }
        }),

        useWarehouseReports: (startDate?: string, endDate?: string, warehouseId?: string) => useQuery<WarehouseReport[]>({
            queryKey: ['factory-reports', 'warehouse', startDate, endDate, warehouseId],
            queryFn: async () => {
                const params: any = {}
                if (startDate) params.startDate = startDate
                if (endDate) params.endDate = endDate
                if (warehouseId) params.warehouseId = warehouseId
                const response = await apiClient.get('/factory/reports/warehouse', { params })
                const data = response.data?.data || response.data
                return Array.isArray(data) ? data : []
            }
        }),

        useCostingReports: (startDate?: string, endDate?: string, plantId?: string) => useQuery<CostingReport[]>({
            queryKey: ['factory-reports', 'costing', startDate, endDate, plantId],
            queryFn: async () => {
                const params: any = {}
                if (startDate) params.startDate = startDate
                if (endDate) params.endDate = endDate
                if (plantId) params.plantId = plantId
                const response = await apiClient.get('/factory/reports/costing', { params })
                return response.data
            }
        })
    }
}

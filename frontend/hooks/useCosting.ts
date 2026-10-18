import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { format, subMonths } from 'date-fns'
import { isDummyDataEnabled } from '@/lib/dummy-data'

const getUseDummyData = () => isDummyDataEnabled()

export interface CostSummary {
    totalProductionCost: number
    totalMaterialCost: number
    overheadCost: number
    costPerUnit: number
    monthlyTrend: { month: string, cost: number }[]
    categoryBreakdown: { category: string, value: number }[]
}

export function useCostDashboard(period: string = 'this_month', filters?: { startDate?: string; endDate?: string; plantId?: string; productId?: string }) {
    return useQuery({
        queryKey: ['costing', 'dashboard', period, filters],
        queryFn: async () => {
            if (getUseDummyData()) {
                return {
                    totalProductionCost: 154200.50,
                    totalMaterialCost: 89500.25,
                    overheadCost: 24700.00,
                    costPerUnit: 12.50,
                    monthlyTrend: Array.from({ length: 6 }).map((_, i) => ({
                        month: format(subMonths(new Date(), 5 - i), 'MMM'),
                        cost: 120000 + Math.random() * 50000
                    })),
                    categoryBreakdown: [
                        { category: 'Raw Materials', value: 45 },
                        { category: 'Labor', value: 30 },
                        { category: 'Overhead', value: 15 },
                        { category: 'Logistics', value: 10 },
                    ]
                } as CostSummary
            }
            const params: any = { period }
            if (filters?.startDate) params.startDate = filters.startDate
            if (filters?.endDate) params.endDate = filters.endDate
            if (filters?.plantId) params.plantId = filters.plantId
            if (filters?.productId) params.productId = filters.productId
            
            const response = await apiClient.get('/costing/dashboard', { params })
            return response.data?.data || response.data
        }
    })
}

export function useCostReports(filters: any = {}) {
    return useQuery({
        queryKey: ['costing', 'reports', filters],
        queryFn: async () => {
            if (getUseDummyData()) {
                return {
                    data: Array.from({ length: 15 }).map((_, i) => ({
                        id: `rpt-${i}`,
                        reportDate: subMonths(new Date(), i).toISOString(),
                        batchNumber: `BATCH-2024-${100 + i}`,
                        productName: i % 2 === 0 ? 'Industrial Steel Sheet' : 'Copper Wiring',
                        producedQty: 1000 + i * 50,
                        totalCost: 5000 + i * 200,
                        unitCost: (5000 + i * 200) / (1000 + i * 50)
                    })),
                    meta: {
                        total: 15,
                        page: filters.page || 1,
                        limit: filters.limit || 20,
                        totalPages: 1
                    }
                }
            }
            const response = await apiClient.get('/costing/reports', { params: filters })
            return response.data?.data || response.data
        }
    })
}

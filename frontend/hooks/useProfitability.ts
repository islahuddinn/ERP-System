import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface ProfitabilityData {
    totalRevenue: number
    grossProfit: number
    netProfit: number
    margin: number
    monthlyComparison: { month: string; sales: number; cost: number }[]
    productMargins: { name: string; cost: number; price: number; profit: number; margin: number }[]
}

export interface DailyProfitData {
    date: string
    day: string
    revenue: number
    cost: number
    profit: number
    margin: number
}

export interface MonthlyProfitData {
    month: string
    monthFull: string
    revenue: number
    cost: number
    profit: number
    margin: number
}

export interface ProductProfitData {
    productId: string
    productName: string
    productSku: string
    revenue: number
    cost: number
    profit: number
    margin: number
    quantity: number
}

export interface PlantProfitData {
    plantId: string
    plantName: string
    plantCode: string
    revenue: number
    cost: number
    profit: number
    margin: number
    orderCount: number
}

export function useProfitability(period: string = 'this_month', filters?: { startDate?: string; endDate?: string; plantId?: string }) {
    return useQuery<ProfitabilityData>({
        queryKey: ['profitability', period, filters],
        queryFn: async () => {
            const params: any = { period }
            if (filters?.startDate) params.startDate = filters.startDate
            if (filters?.endDate) params.endDate = filters.endDate
            if (filters?.plantId) params.plantId = filters.plantId
            
            const response = await apiClient.get('/costing/profitability', { params })
            return response.data?.data || response.data
        }
    })
}

export function useDailyProfit(period: string = 'this_month', filters?: { startDate?: string; endDate?: string; plantId?: string }) {
    return useQuery<DailyProfitData[]>({
        queryKey: ['daily-profit', period, filters],
        queryFn: async () => {
            const params: any = { period }
            if (filters?.startDate) params.startDate = filters.startDate
            if (filters?.endDate) params.endDate = filters.endDate
            if (filters?.plantId) params.plantId = filters.plantId
            
            const response = await apiClient.get('/costing/profit/daily', { params })
            return response.data?.data || response.data || []
        }
    })
}

export function useMonthlyProfit(period: string = 'this_year', filters?: { startDate?: string; endDate?: string; plantId?: string }) {
    return useQuery<MonthlyProfitData[]>({
        queryKey: ['monthly-profit', period, filters],
        queryFn: async () => {
            const params: any = { period }
            if (filters?.startDate) params.startDate = filters.startDate
            if (filters?.endDate) params.endDate = filters.endDate
            if (filters?.plantId) params.plantId = filters.plantId
            
            const response = await apiClient.get('/costing/profit/monthly', { params })
            return response.data?.data || response.data || []
        }
    })
}

export function useProductProfit(period: string = 'this_month', filters?: { startDate?: string; endDate?: string; plantId?: string }) {
    return useQuery<ProductProfitData[]>({
        queryKey: ['product-profit', period, filters],
        queryFn: async () => {
            const params: any = { period }
            if (filters?.startDate) params.startDate = filters.startDate
            if (filters?.endDate) params.endDate = filters.endDate
            if (filters?.plantId) params.plantId = filters.plantId
            
            const response = await apiClient.get('/costing/profit/product', { params })
            return response.data?.data || response.data || []
        }
    })
}

export function usePlantProfit(period: string = 'this_month', filters?: { startDate?: string; endDate?: string; plantId?: string }) {
    return useQuery<PlantProfitData[]>({
        queryKey: ['plant-profit', period, filters],
        queryFn: async () => {
            const params: any = { period }
            if (filters?.startDate) params.startDate = filters.startDate
            if (filters?.endDate) params.endDate = filters.endDate
            if (filters?.plantId) params.plantId = filters.plantId
            
            const response = await apiClient.get('/costing/profit/plant', { params })
            return response.data?.data || response.data || []
        }
    })
}


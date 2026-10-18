import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

function unwrapData<T>(payload: any, fallback: T): T {
    if (payload == null) return fallback
    if (Array.isArray(fallback)) {
        if (Array.isArray(payload)) return payload as T
        if (Array.isArray(payload.data)) return payload.data as T
        if (Array.isArray(payload.data?.data)) return payload.data.data as T
        return fallback
    }
    if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data) && 'totalSales' in payload.data) {
        return payload.data as T
    }
    return (payload.data ?? payload) as T
}

function unwrapBrokerList(payload: any): any[] {
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.data)) return payload.data
    if (Array.isArray(payload?.data?.data)) return payload.data.data
    return []
}

export function useBrokers(filters?: any) {
    return useQuery({
        queryKey: ['brokers', filters],
        queryFn: async () => {
            const params = new URLSearchParams()
            if (filters?.search) params.append('search', filters.search)
            if (filters?.status) params.append('status', filters.status)
            if (filters?.zoneId) params.append('zoneId', filters.zoneId)
            params.append('page', String(filters?.page ?? 1))
            params.append('limit', String(filters?.limit ?? 100))

            const query = params.toString()
            const response = await apiClient.get(`/brokers?${query}`)
            return unwrapBrokerList(response.data)
        },
    })
}

export function useBroker(id: string) {
    return useQuery({
        queryKey: ['broker', id],
        queryFn: async () => {
            const response = await apiClient.get(`/brokers/${id}`)
            return unwrapData<any>(response.data, null)
        },
        enabled: !!id,
    })
}

export function useCreateBroker() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (data: any) => {
            const response = await apiClient.post('/brokers', data)
            return unwrapData(response.data, response.data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['brokers'] })
        },
    })
}

export function useUpdateBroker() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await apiClient.patch(`/brokers/${id}`, data)
            return unwrapData(response.data, response.data)
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['brokers'] })
            queryClient.invalidateQueries({ queryKey: ['broker', data.id] })
        },
    })
}

export function useDeleteBroker() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await apiClient.delete(`/brokers/${id}`)
            return response.data.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['brokers'] })
        },
    })
}

export function useAssignProducts() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await apiClient.post(`/brokers/${id}/products`, data)
            return response.data.data
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['broker', data.id] })
        },
    })
}

export function useAssignTerritories() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await apiClient.post(`/brokers/${id}/territories`, data)
            return response.data.data
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['broker', data.id] })
        },
    })
}

export function useBrokerCommissions(filters?: any) {
    return useQuery({
        queryKey: ['broker-commissions', filters],
        queryFn: async () => {
            const params = new URLSearchParams()
            if (filters?.brokerId) params.append('brokerId', filters.brokerId)
            if (filters?.status) params.append('status', filters.status)
            if (filters?.startDate) params.append('startDate', filters.startDate)
            if (filters?.endDate) params.append('endDate', filters.endDate)

            const response = await apiClient.get(`/brokers/commissions?${params.toString()}`)
            return unwrapData<any[]>(response.data, [])
        },
    })
}

export function useBrokerPerformance(brokerId: string) {
    return useQuery({
        queryKey: ['broker-performance', brokerId],
        queryFn: async () => {
            const response = await apiClient.get(`/brokers/${brokerId}/performance`)
            return unwrapData(response.data, {
                totalSales: 0,
                totalCommission: 0,
                paidCommission: 0,
                pendingCommission: 0,
                salesCount: 0,
                salesTarget: 0,
                achievement: 0,
                salesAttributed: false,
                sales: [],
                broker: { id: brokerId, name: '', brokerCode: '', commissionRate: 0, salesTarget: 0 },
            })
        },
        enabled: Boolean(brokerId) && brokerId !== 'all',
    })
}

export function useSuggestedBrokers(productId?: string, customerArea?: string) {
    return useQuery({
        queryKey: ['suggested-brokers', productId, customerArea],
        queryFn: async () => {
            const params = new URLSearchParams()
            if (productId) params.append('productId', productId)
            if (customerArea) params.append('customerArea', customerArea)

            const response = await apiClient.get(`/brokers/suggest?${params.toString()}`)
            return unwrapData<any[]>(response.data, [])
        },
        enabled: !!productId,
    })
}

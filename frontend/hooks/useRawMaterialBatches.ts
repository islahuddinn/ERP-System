import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import type { RawMaterialBatch, RawMaterialBatchConsumption } from '@/types/common'

export type { RawMaterialBatch, RawMaterialBatchConsumption }

export type BatchStatus = 'ACTIVE' | 'PARTIAL' | 'CONSUMED' | 'EXPIRED' | 'BLOCKED' | 'QUARANTINE'
export type InspectionType = 'VISUAL' | 'DIMENSIONAL' | 'FUNCTIONAL' | 'LAB_TEST' | 'DOCUMENTATION'
export type QualityStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'CONDITIONAL'

export interface BatchInspection {
    id: string
    batchId: string
    inspectionNumber: string
    inspectionType: InspectionType
    qualityStatus: QualityStatus
    results: string
    approvedQuantity?: number | null
    rejectedQuantity?: number | null
    notes?: string | null
    observations?: string[] | null
    inspectedById?: string | null
    createdAt: string
    updatedAt: string
}

export interface BatchFilters {
    rawMaterialId?: string
    siteId?: string
    grnId?: string
    status?: BatchStatus
    expiringDays?: number
    startDate?: string
    endDate?: string
    search?: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
}

export function useRawMaterialBatches(filters: BatchFilters = {}) {
    const query = useQuery({
        queryKey: ['raw-material-batches', filters],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/raw-material-batches', { params: filters })
            return {
                data: response?.data ?? response ?? [],
                meta: response?.meta ?? null,
            }
        },
        placeholderData: keepPreviousData,
        // QA #14: reflect raw-material add/edit/delete (e.g. renamed material shown
        // in the list) without requiring a manual page refresh.
        staleTime: 0,
        refetchOnMount: 'always',
    })

    // Surface API validation errors (e.g. invalid "expiring in days" value -> 400)
    // to the user via a toast instead of silently swallowing them (QA #15).
    useEffect(() => {
        if (!query.isError || !query.error) return
        const err = query.error as any
        const message =
            err?.response?.data?.message ??
            err?.message ??
            'Failed to load raw material batches'
        toast.error(Array.isArray(message) ? message.join(', ') : message)
    }, [query.isError, query.error])

    return query
}

export function useRawMaterialBatch(id: string) {
    return useQuery({
        queryKey: ['raw-material-batches', id],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/raw-material-batches/${id}`)
            return (response?.data || response) as RawMaterialBatch
        },
        enabled: !!id
    })
}

export function useExpiringBatches(days: number = 30) {
    return useQuery({
        queryKey: ['raw-material-batches', 'expiring', days],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/raw-material-batches/expiring', { params: { days } })
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as RawMaterialBatch[]
        }
    })
}

export function useFIFOAllocation(rawMaterialId: string, quantity?: number) {
    return useQuery({
        queryKey: ['raw-material-batches', 'fifo', rawMaterialId, quantity],
        queryFn: async () => {
            const params = quantity !== undefined ? { quantity } : {}
            const { data: response } = await apiClient.get(
                `/raw-material-batches/fifo/${rawMaterialId}`,
                { params }
            )
            return response?.data || response
        },
        enabled: !!rawMaterialId && quantity !== undefined && quantity > 0
    })
}

export function useBatchConsumptions(batchId: string) {
    return useQuery({
        queryKey: ['raw-material-batches', batchId, 'consumptions'],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/raw-material-batches/${batchId}/consumptions`)
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as RawMaterialBatchConsumption[]
        },
        enabled: !!batchId
    })
}

export function useUpdateBatch() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: {
            id: string
            data: { status?: BatchStatus; notes?: string }
        }) => {
            const { data: response } = await apiClient.patch(`/raw-material-batches/${id}`, data)
            return response?.data || response
        },
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['raw-material-batches'] })
            queryClient.invalidateQueries({ queryKey: ['raw-material-batches', id] })
            toast.success('Batch updated')
        }
    })
}

export function useConsumeFromBatch() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ batchId, data }: {
            batchId: string
            data: {
                quantity: number
                referenceType?: string
                referenceId?: string
                notes?: string
            }
        }) => {
            const { data: response } = await apiClient.post(`/raw-material-batches/${batchId}/consume`, data)
            return response?.data || response
        },
        onSuccess: (_, { batchId }) => {
            queryClient.invalidateQueries({ queryKey: ['raw-material-batches'] })
            queryClient.invalidateQueries({ queryKey: ['raw-material-batches', batchId] })
            toast.success('Consumption recorded')
        }
    })
}

export function useCreateBatchInspection() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ batchId, data }: {
            batchId: string
            data: {
                inspectionType: InspectionType
                qualityStatus: QualityStatus
                results: string
                rejectedQuantity?: number
                notes?: string
                observations?: string[]
            }
        }) => {
            const { data: response } = await apiClient.post(`/raw-material-batches/${batchId}/inspections`, data)
            return response?.data || response
        },
        onSuccess: (_, { batchId }) => {
            queryClient.invalidateQueries({ queryKey: ['raw-material-batches'] })
            queryClient.invalidateQueries({ queryKey: ['raw-material-batches', batchId] })
            toast.success('Inspection recorded')
        },
        // Surface API errors (e.g. re-inspecting an already-inspected batch) to the
        // user instead of failing silently (QA #19).
        onError: (error: any) => {
            const message =
                error?.response?.data?.message ??
                error?.message ??
                'Failed to record inspection'
            toast.error(Array.isArray(message) ? message.join(', ') : message)
        }
    })
}

export function useGetBatchInspections(batchId: string) {
    return useQuery({
        queryKey: ['raw-material-batches', batchId, 'inspections'],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/raw-material-batches/${batchId}/inspections`)
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as BatchInspection[]
        },
        enabled: !!batchId
    })
}

export function useUpdateBatchInspection() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ inspectionId, data }: {
            inspectionId: string
            data: {
                qualityStatus?: QualityStatus
                approvedQuantity?: number
                rejectedQuantity?: number
                results?: string
                observations?: string[]
                notes?: string
            }
        }) => {
            const { data: response } = await apiClient.patch(`/raw-material-batches/inspections/${inspectionId}`, data)
            return response?.data || response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['raw-material-batches'] })
            toast.success('Inspection updated')
        }
    })
}

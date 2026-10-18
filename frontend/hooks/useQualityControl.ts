import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { isDummyDataEnabled } from '@/lib/dummy-data'

export type InspectionStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'CONDITIONAL' | 'all'
export type InspectionStage = 'INCOMING' | 'IN_PROCESS' | 'FINAL'

export interface QualityInspection {
    id: string
    inspectionNumber: string
    productId: string
    productName?: string
    productCode?: string
    batchId?: string
    batchNumber?: string
    inspectionType: 'VISUAL' | 'DIMENSIONAL' | 'FUNCTIONAL' | 'LAB_TEST' | 'DOCUMENTATION'
    status: InspectionStatus
    results: string
    observations: string[]
    notes?: string
    inspectorId?: string
    inspectorName?: string
    inspectedDate?: string
    createdAt: string
    updatedAt: string
}

export interface QualityFilters {
    page?: number
    limit?: number
    search?: string
    qualityStatus?: InspectionStatus
    productId?: string
    batchId?: string
    startDate?: string
    endDate?: string
}

const getUseDummyData = () => isDummyDataEnabled()

const dummyInspections: QualityInspection[] = [
    {
        id: 'insp-1',
        inspectionNumber: 'QC-2024-001',
        productId: 'prod-1',
        productName: 'Steel Sheet 2mm',
        productCode: 'P001',
        inspectionType: 'VISUAL',
        status: 'PASSED',
        results: 'All visual checks passed. No defects found.',
        observations: ['Surface finish is smooth', 'No visible cracks', 'Dimensions within tolerance'],
        inspectorId: 'usr-1',
        inspectorName: 'Alice Inspector',
        createdAt: '2024-01-10T09:00:00Z',
        updatedAt: '2024-01-10T10:00:00Z'
    },
    {
        id: 'insp-2',
        inspectionNumber: 'QC-2024-002',
        productId: 'prod-2',
        productName: 'Widget Assembly',
        productCode: 'P002',
        batchId: 'batch-1',
        batchNumber: 'BATCH-001',
        inspectionType: 'DIMENSIONAL',
        status: 'PENDING',
        results: 'Dimensional inspection in progress',
        observations: ['Length: 100mm', 'Width: 50mm'],
        inspectorId: 'usr-2',
        inspectorName: 'Bob Quality',
        createdAt: '2024-01-11T14:00:00Z',
        updatedAt: '2024-01-11T14:00:00Z'
    },
    {
        id: 'insp-3',
        inspectionNumber: 'QC-2024-003',
        productId: 'prod-3',
        productName: 'Final Product',
        productCode: 'P003',
        inspectionType: 'FUNCTIONAL',
        status: 'FAILED',
        results: 'Functional test failed. Unit does not power on.',
        observations: ['Power button unresponsive', 'LED indicator not working'],
        inspectorId: 'usr-3',
        inspectorName: 'Charlie Control',
        notes: 'Dimensions out of tolerance on outer shell.',
        createdAt: '2024-01-12T11:00:00Z',
        updatedAt: '2024-01-12T13:00:00Z'
    },
    {
        id: 'insp-4',
        inspectionNumber: 'QC-2024-004',
        productId: 'prod-4',
        productName: 'Component X',
        productCode: 'P004',
        batchId: 'batch-2',
        batchNumber: 'BATCH-002',
        inspectionType: 'LAB_TEST',
        status: 'CONDITIONAL',
        results: 'Lab test results acceptable with minor deviations',
        observations: ['Chemical composition within range', 'Minor surface scratches detected'],
        inspectorId: 'usr-1',
        inspectorName: 'Alice Inspector',
        notes: 'Minor surface scratches, acceptable for Grade B distribution.',
        createdAt: '2024-01-13T08:00:00Z',
        updatedAt: '2024-01-13T09:00:00Z'
    },
    {
        id: 'insp-5',
        inspectionNumber: 'QC-2024-005',
        productId: 'prod-5',
        productName: 'Electronic Component',
        productCode: 'P005',
        inspectionType: 'DOCUMENTATION',
        status: 'PENDING',
        results: 'Documentation review pending',
        observations: [],
        inspectorId: 'usr-2',
        inspectorName: 'Bob Quality',
        createdAt: '2024-01-14T09:00:00Z',
        updatedAt: '2024-01-14T09:00:00Z'
    }
]

function transformInspection(raw: any): QualityInspection {
    if (!raw) {
        return {
            id: '',
            inspectionNumber: '',
            productId: '',
            inspectionType: 'VISUAL',
            status: 'PENDING',
            results: '',
            observations: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
    }

    return {
        id: raw.id,
        inspectionNumber: raw.inspectionNumber || '',
        productId: raw.productId,
        productName: raw.product?.name,
        productCode: raw.product?.sku || raw.product?.code,
        batchId: raw.batchId,
        batchNumber: raw.batch?.batchNumber,
        inspectionType: raw.inspectionType,
        status: raw.qualityStatus || raw.status || 'PENDING',
        results: raw.results || '',
        observations: Array.isArray(raw.observations) ? raw.observations : [],
        notes: raw.notes,
        inspectorId: raw.inspectedById,
        inspectedDate: raw.inspectedDate,
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || new Date().toISOString(),
    }
}

export function useInspections(filters: QualityFilters = {}) {
    return useQuery({
        queryKey: ['inspections', filters],
        queryFn: async () => {
            if (getUseDummyData()) {
                let filtered = [...dummyInspections]

                if (filters.qualityStatus) {
                    filtered = filtered.filter(i => i.status === filters.qualityStatus)
                }

                if (filters.productId) {
                    filtered = filtered.filter(i => i.productId === filters.productId)
                }

                if (filters.search) {
                    const s = filters.search.toLowerCase()
                    filtered = filtered.filter(i =>
                        i.inspectionNumber.toLowerCase().includes(s) ||
                        i.productName?.toLowerCase().includes(s) ||
                        i.inspectorName?.toLowerCase().includes(s)
                    )
                }

                // Simple pagination
                const page = filters.page || 1
                const limit = filters.limit || 10
                const start = (page - 1) * limit
                const end = start + limit
                const paginated = filtered.slice(start, end)

                return {
                    data: paginated,
                    meta: {
                        total: filtered.length,
                        page,
                        limit,
                        totalPages: Math.ceil(filtered.length / limit)
                    }
                }
            }

            const backendFilters: any = { ...filters }
            if (backendFilters.qualityStatus) {
                // Backend uses qualityStatus, not status
                // Already correct
            }

            const response = await apiClient.get('/quality-control/inspections', { params: backendFilters })
            const payload = response.data?.data || response.data

            if (payload && Array.isArray(payload.data)) {
                return {
                    ...payload,
                    data: payload.data.map(transformInspection),
                }
            }

            if (Array.isArray(payload)) {
                return {
                    data: payload.map(transformInspection),
                    meta: {
                        total: payload.length,
                        page: filters.page || 1,
                        limit: filters.limit || payload.length,
                        totalPages: 1,
                    },
                }
            }

            return payload
        }
    })
}

export function useInspection(id: string) {
    return useQuery({
        queryKey: ['inspections', id],
        queryFn: async () => {
            if (getUseDummyData()) {
                const inspection = dummyInspections.find(i => i.id === id)
                if (!inspection) throw new Error('Inspection not found')
                return inspection
            }
            const response = await apiClient.get(`/quality-control/inspections/${id}`)
            const payload = response.data?.data || response.data
            return transformInspection(payload)
        },
        enabled: !!id
    })
}

export function useCreateInspection() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: {
            productId: string
            inspectionType: 'VISUAL' | 'DIMENSIONAL' | 'FUNCTIONAL' | 'LAB_TEST' | 'DOCUMENTATION'
            qualityStatus: InspectionStatus
            results: string
            observations: string[]
            notes?: string
            batchId?: string
        }) => {
            if (getUseDummyData()) {
                const newInsp: QualityInspection = {
                    ...data,
                    id: Math.random().toString(36).substr(2, 9),
                    inspectionNumber: `QC-2024-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
                    status: data.qualityStatus,
                    inspectorId: 'usr-1',
                    inspectorName: 'Admin User',
                    results: data.results,
                    observations: data.observations || [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
                dummyInspections.unshift(newInsp)
                return newInsp
            }
            const response = await apiClient.post('/quality-control/inspections', data)
            const payload = response.data?.data || response.data
            return transformInspection(payload)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inspections'] })
            toast.success('Inspection created successfully')
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to create inspection'
            toast.error(errorMessage)
        }
    })
}

export function useUpdateInspection() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: {
            id: string, data: Partial<{
                inspectionType: 'VISUAL' | 'DIMENSIONAL' | 'FUNCTIONAL' | 'LAB_TEST' | 'DOCUMENTATION'
                qualityStatus: InspectionStatus
                results: string
                observations: string[]
                notes: string
            }>
        }) => {
            if (getUseDummyData()) {
                const index = dummyInspections.findIndex(i => i.id === id)
                if (index !== -1) {
                    dummyInspections[index] = {
                        ...dummyInspections[index],
                        ...data,
                        status: data.qualityStatus || dummyInspections[index].status,
                        updatedAt: new Date().toISOString()
                    }
                    return dummyInspections[index]
                }
                throw new Error('Inspection not found')
            }
            const response = await apiClient.patch(`/quality-control/inspections/${id}`, data)
            const payload = response.data?.data || response.data
            return transformInspection(payload)
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['inspections'] })
            queryClient.invalidateQueries({ queryKey: ['inspections', variables.id] })
            toast.success('Inspection updated successfully')
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to update inspection'
            toast.error(errorMessage)
        }
    })
}

export function useDeleteInspection() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            if (getUseDummyData()) {
                const index = dummyInspections.findIndex(i => i.id === id)
                if (index !== -1) {
                    dummyInspections.splice(index, 1)
                    return { success: true }
                }
                throw new Error('Inspection not found')
            }
            const response = await apiClient.delete(`/quality-control/inspections/${id}`)
            return response.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inspections'] })
            toast.success('Inspection deleted successfully')
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to delete inspection'
            toast.error(errorMessage)
        }
    })
}

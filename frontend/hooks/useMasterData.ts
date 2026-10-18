import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { isDummyDataEnabled } from '@/lib/dummy-data'

export interface Category {
    id: string
    name: string
    code: string
}

export interface UOM {
    id: string
    name: string
    symbol: string      // display: "kg", "L", "pcs"
    code: string        // enum key: "KILOGRAM", "LITER", "PIECE"
    category: 'WEIGHT' | 'VOLUME' | 'LENGTH' | 'COUNT'
    isSystem: boolean
    description?: string
    isActive?: boolean
}

export interface Company {
    id: string
    name: string
    code?: string
}

const getUseDummyData = () => isDummyDataEnabled()

/**
 * De-duplicate a list of UOMs by their unique `id`.
 *
 * Guards against duplicate rows reaching the UI (QA bug #7/#9: "Kilogram"
 * appearing twice and a stale/duplicate id causing a NotFound on the second
 * delete). If the same id appears more than once, only the first occurrence is
 * kept so every rendered row / dropdown option maps to a unique, deletable id.
 */
const dedupeUOMsById = (uoms: UOM[]): UOM[] => {
    const seen = new Set<string>()
    return uoms.filter((u) => {
        if (!u?.id || seen.has(u.id)) return false
        seen.add(u.id)
        return true
    })
}

export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            // Always use real API for categories (ignore dummy data mode)
            // Request with max allowed limit (100) and fetch all pages if needed
            try {
                // Fetch first page with max limit (100)
                const { data: response } = await apiClient.get('/categories?limit=100&page=1')
                // Backend ResponseInterceptor wraps: { success: true, data: { data: [...], meta: {...} }, message: "..." }
                // Extract the actual data from the wrapped response
                const responseData = response?.data || response
                // Backend returns paginated response: { data: [...], meta: {...} }
                let categoriesArray = responseData?.data || (Array.isArray(responseData) ? responseData : [])

                // If there are more pages, fetch them all
                const meta = responseData?.meta || response?.meta
                if (meta && meta.totalPages > 1) {
                    const additionalPages = []
                    for (let page = 2; page <= meta.totalPages; page++) {
                        const { data: pageResponse } = await apiClient.get(`/categories?limit=100&page=${page}`)
                        const pageData = pageResponse?.data || pageResponse
                        if (pageData?.data) {
                            additionalPages.push(...pageData.data)
                        } else if (Array.isArray(pageData)) {
                            additionalPages.push(...pageData)
                        }
                    }
                    categoriesArray = [...categoriesArray, ...additionalPages]
                }
                // Map backend response - generate code from name for frontend compatibility
                const mappedData = categoriesArray.map((cat: any) => ({
                    id: cat.id,
                    name: cat.name,
                    code: cat.code || cat.name.substring(0, 4).toUpperCase().replace(/\s/g, ''), // Generate code from name if not present
                }))
                return mappedData
            } catch (error: any) {
                throw error
            }
        }
    })
}

export function useUOMs() {
    return useQuery({
        queryKey: ['uoms'],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/uoms')
            const responseData = response?.data || response
            // Backend returns grouped object: { WEIGHT: [], VOLUME: [], LENGTH: [], COUNT: [] }
            // Flatten to a single array for backward compatibility with form selectors
            if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
                const grouped = responseData as Record<string, UOM[]>
                return dedupeUOMsById(Object.values(grouped).flat() as UOM[])
            }
            return dedupeUOMsById((Array.isArray(responseData) ? responseData : []) as UOM[])
        }
    })
}

export function useUOMsDropdown(category?: 'WEIGHT' | 'VOLUME' | 'LENGTH' | 'COUNT') {
    return useQuery({
        queryKey: ['uoms', 'dropdown', category],
        queryFn: async () => {
            const params = category ? { category } : {}
            const { data: response } = await apiClient.get('/uoms/dropdown', { params })
            const responseData = response?.data || response
            // Handle plain array or paginated { data: [...], meta: {...} } shape
            const arr = Array.isArray(responseData)
                ? responseData
                : Array.isArray(responseData?.data)
                    ? responseData.data
                    : []
            return dedupeUOMsById(arr as UOM[])
        }
    })
}

export function useCompanies() {
    return useQuery({
        queryKey: ['companies'],
        queryFn: async () => {
            // Always use real API for companies (ignore dummy data mode)
            // Backend returns all companies when no pagination params provided
            try {
                const { data: response } = await apiClient.get('/companies')
                // Backend ResponseInterceptor wraps: { success: true, data: [...], message: "..." }
                // Extract the actual data from the wrapped response
                const responseData = response?.data || response
                // Backend may return paginated response or array directly
                const companiesArray = responseData?.data || (Array.isArray(responseData) ? responseData : [])
                return companiesArray
            } catch (error: any) {
                throw error
            }
        }
    })
}

// Mutations

export function useCreateCategory() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: Omit<Category, 'id'>) => {
            // Always use real API for categories (ignore dummy data mode)
            // Backend only accepts: name, description?, imageUrl?, isActive?
            // Frontend sends: name, code - but backend doesn't accept code
            const backendPayload = {
                name: data.name,
                // Optionally include description if provided (though frontend Category interface doesn't have it)
            }
            try {
                const { data: response } = await apiClient.post('/categories', backendPayload)
                // Extract data from wrapped response: { success: true, data: {...}, message: "..." }
                const categoryData = response?.data || response
                // Map backend response - generate code from name for frontend compatibility
                return {
                    id: categoryData.id,
                    name: categoryData.name,
                    code: data.code || categoryData.name.substring(0, 4).toUpperCase().replace(/\s/g, ''),
                }
            } catch (error: any) {
                throw error
            }
        },
        onSuccess: async () => {
            // Invalidate and refetch all category queries
            await queryClient.invalidateQueries({ queryKey: ['categories'] })
            // Explicitly refetch to ensure UI updates
            await queryClient.refetchQueries({ queryKey: ['categories'] })
            toast.success('Category created successfully')
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || error?.message || 'Failed to create category')
        }
    })
}

export function useDeleteCategory() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            // Always use real API for categories (ignore dummy data mode)
            await apiClient.delete(`/categories/${id}`)
        },
        onSuccess: async () => {
            // Invalidate and refetch all category queries
            await queryClient.invalidateQueries({ queryKey: ['categories'] })
            // Explicitly refetch to ensure UI updates
            await queryClient.refetchQueries({ queryKey: ['categories'] })
            toast.success('Category deleted successfully')
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || error?.message || 'Failed to delete category')
        }
    })
}


export function useDeleteUOM() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            // Always use real API for UOMs (ignore dummy data mode)
            await apiClient.delete(`/uoms/${id}`)
        },
        onSuccess: async () => {
            // Invalidate and refetch all UOM queries
            await queryClient.invalidateQueries({ queryKey: ['uoms'] })
            // Explicitly refetch to ensure UI updates
            await queryClient.refetchQueries({ queryKey: ['uoms'] })
            toast.success('UOM deleted successfully')
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || error?.message || 'Failed to delete UOM')
        }
    })
}

export function useCreateCompany() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: Omit<Company, 'id'>) => {
            // Always use real API for companies (ignore dummy data mode)
            // Backend accepts: name (required), code (optional)
            const backendPayload = {
                name: data.name,
                code: data.code || undefined, // Optional field
            }
            try {
                const { data: response } = await apiClient.post('/companies', backendPayload)
                // Extract data from wrapped response: { success: true, data: {...}, message: "..." }
                return response?.data || response
            } catch (error: any) {
                throw error
            }
        },
        onSuccess: async () => {
            // Invalidate and refetch all company queries
            await queryClient.invalidateQueries({ queryKey: ['companies'] })
            // Explicitly refetch to ensure UI updates
            await queryClient.refetchQueries({ queryKey: ['companies'] })
            toast.success('Company created successfully')
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || error?.message || 'Failed to create company')
        }
    })
}

export function useDeleteCompany() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            // Always use real API for companies (ignore dummy data mode)
            await apiClient.delete(`/companies/${id}`)
        },
        onSuccess: async () => {
            // Invalidate and refetch all company queries
            await queryClient.invalidateQueries({ queryKey: ['companies'] })
            // Explicitly refetch to ensure UI updates
            await queryClient.refetchQueries({ queryKey: ['companies'] })
            toast.success('Company deleted successfully')
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || error?.message || 'Failed to delete company')
        }
    })
}

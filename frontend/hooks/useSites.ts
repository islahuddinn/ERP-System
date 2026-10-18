import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'

export type SiteType = 'WAREHOUSE' | 'ZONE' | 'UNIT' | 'PLANT' | 'WORKSHOP' | 'ROOM' | 'STORAGE' | 'AREA'
export type SiteCategory =
  | 'RAW_MATERIAL'
  | 'WORK_IN_PROGRESS'
  | 'FINISHED_GOODS'
  | 'PACKAGING'
  | 'SPARE_PARTS'
  | 'CONSUMABLES'
  | 'REJECTED'
  | 'QUARANTINE'
  | 'HAZARDOUS'
  | 'GENERAL'
export type SiteStatus = 'ACTIVE' | 'INACTIVE' | 'QUARANTINE' | 'UNDER_MAINTENANCE' | 'FULL'

export interface Site {
  id: string
  name: string
  code: string
  type: SiteType
  category: SiteCategory
  status: SiteStatus
  parentId?: string
  locationId?: string
  managerId?: string
  totalCapacity?: number
  capacityUnit?: string
  temperature?: number
  humidity?: number
  description?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  parent?: { id: string; name: string; code: string }
  location?: { id: string; name: string; address?: string | null }
  children?: Site[]
}

export interface SiteDropdownItem {
  id: string
  name: string
  code: string
  type: SiteType
}

export interface SitesFilters {
  page?: number
  limit?: number
  search?: string
  type?: SiteType
  category?: SiteCategory
  status?: SiteStatus
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface CreateSiteDto {
  name: string
  code: string
  type: SiteType
  category?: SiteCategory
  parentId?: string
  locationId?: string
  managerId?: string
  totalCapacity?: number
  capacityUnit?: string
  temperature?: number
  humidity?: number
  description?: string
  status?: SiteStatus
  metadata?: Record<string, unknown>
}

const extract = (response: any) => response?.data?.data ?? response?.data ?? response

export interface SitesMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext?: boolean
  hasPrev?: boolean
}

export interface SitesListResult {
  data: Site[]
  meta: SitesMeta | null
}

export function useSites(filters: SitesFilters = {}) {
  return useQuery({
    queryKey: ['sites', filters],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/sites', { params: filters })
      // Backend shape: { success, data: [...], meta: { total, page, limit, totalPages, ... } }
      const items: Site[] = response?.data ?? []
      const meta: SitesMeta | null = response?.meta ?? null
      return { data: items, meta } as SitesListResult
    },
    placeholderData: keepPreviousData,
  })
}

export function useSite(siteId: string) {
  return useQuery({
    queryKey: ['sites', siteId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/sites/${siteId}`)
      return extract(data) as Site
    },
    enabled: !!siteId,
  })
}

export function useSitesDropdown() {
  return useQuery({
    queryKey: ['sites', 'dropdown'],
    queryFn: async () => {
      const { data } = await apiClient.get('/sites/dropdown')
      const result = extract(data)
      return (Array.isArray(result) ? result : []) as SiteDropdownItem[]
    },
  })
}

export function useSiteTree() {
  return useQuery({
    queryKey: ['sites', 'tree'],
    queryFn: async () => {
      const { data } = await apiClient.get('/sites/tree')
      const result = extract(data)
      return (Array.isArray(result) ? result : []) as Site[]
    },
  })
}

export function useSiteChildren(siteId: string) {
  return useQuery({
    queryKey: ['sites', siteId, 'children'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/sites/${siteId}/children`)
      const result = extract(data)
      return (Array.isArray(result) ? result : []) as Site[]
    },
    enabled: !!siteId,
  })
}

export function useSiteAncestors(siteId: string) {
  return useQuery({
    queryKey: ['sites', siteId, 'ancestors'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/sites/${siteId}/ancestors`)
      const result = extract(data)
      return (Array.isArray(result) ? result : []) as Site[]
    },
    enabled: !!siteId,
  })
}

export function useCreateSite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (dto: CreateSiteDto) => {
      const { data } = await apiClient.post('/sites', dto)
      return extract(data) as Site
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      toast.success('Site created successfully')
    },
  })
}

export function useUpdateSite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ siteId, data }: { siteId: string; data: Partial<CreateSiteDto> }) => {
      const { data: response } = await apiClient.patch(`/sites/${siteId}`, data)
      return extract(response) as Site
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      queryClient.invalidateQueries({ queryKey: ['sites', variables.siteId] })
      toast.success('Site updated successfully')
    },
  })
}

export function useUpdateSiteStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ siteId, status }: { siteId: string; status: SiteStatus }) => {
      // The dedicated PATCH /sites/:siteId/status route is commented out on the
      // backend, so update status via the standard PATCH /sites/:siteId route.
      const { data } = await apiClient.patch(`/sites/${siteId}`, { status })
      return extract(data) as Site
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update site status')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      toast.success('Site status updated')
    },
  })
}

export function useDeleteSite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (siteId: string) => {
      await apiClient.delete(`/sites/${siteId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      toast.success('Site deactivated')
    },
  })
}

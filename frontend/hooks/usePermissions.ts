import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface Permission {
  id: string
  name: string
  description: string | null
  module: string
  action: string
}

export interface PermissionsByModule {
  [module: string]: Permission[]
}

// GET /permissions — all permissions grouped by module ({ [module]: Permission[] }).
export const usePermissions = () => {
  return useQuery<PermissionsByModule>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/permissions')
      return (response?.data || response) as PermissionsByModule
    },
  })
}

// GET /permissions/modules — flat list of module names.
export const usePermissionModules = () => {
  return useQuery<string[]>({
    queryKey: ['permission-modules'],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/permissions/modules')
      const responseData = response?.data || response
      return (Array.isArray(responseData) ? responseData : []) as string[]
    },
  })
}

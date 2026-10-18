import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'

export interface AccountSettings {
  id: string
  tenantId: string
  accountName?: string | null
  companyName?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  postalCode?: string | null
  country?: string | null
  timezone: string
  currency: string
  language: string
  settings?: Record<string, any> | null
  createdAt: string
  updatedAt: string
}

export interface UpdateAccountSettingsDto {
  accountName?: string
  companyName?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  country?: string
  timezone?: string
  currency?: string
  language?: string
  settings?: Record<string, any>
}

export function useAccountSettings() {
  return useQuery<AccountSettings>({
    queryKey: ['settings', 'account'],
    queryFn: async () => {
      const response = await apiClient.get('/settings/account')
      return response.data
    },
  })
}

export function useUpdateAccountSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateAccountSettingsDto) => {
      const response = await apiClient.patch('/settings/account', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'account'] })
      toast.success('Settings updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update settings')
    },
  })
}


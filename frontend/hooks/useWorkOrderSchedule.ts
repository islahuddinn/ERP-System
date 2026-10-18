import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { WorkOrder } from './useWorkOrders'

export function useWorkOrderSchedule(startDate?: string, endDate?: string) {
  return useQuery<WorkOrder[]>({
    queryKey: ['work-orders', 'schedule', startDate, endDate],
    queryFn: async () => {
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const response = await apiClient.get('/work-orders/schedule', { params })
      return response.data?.data || response.data || []
    },
  })
}


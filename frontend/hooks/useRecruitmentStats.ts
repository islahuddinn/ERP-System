import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { unwrapEntity } from './useRecruitmentShared'

export interface RecruitmentStats {
  totalRequisitions: number
  openRequisitions: number
  totalCandidates: number
  totalApplications: number
  applicationsByStage: Record<string, number>
  upcomingInterviews: number
  pendingOffers: number
}

export function useRecruitmentStats() {
  return useQuery({
    queryKey: ['recruitment', 'stats'],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/hr/recruitment/stats')
      return unwrapEntity<RecruitmentStats>(response)
    },
  })
}

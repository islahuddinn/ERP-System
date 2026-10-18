import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  normalizeRecruitmentList,
  unwrapEntity,
  recruitmentListQueryOptions,
  type RecruitmentListResponse,
  type RecruitmentListFilters,
  type RecruitmentUserRef,
} from './useRecruitmentShared'
import type { ApplicationCandidateRef, ApplicationRequisitionRef } from './useApplications'

export interface InterviewApplicationRef {
  id: string
  stage: string
  candidate?: ApplicationCandidateRef | null
  requisition?: ApplicationRequisitionRef | null
}

export interface Interview {
  id: string
  applicationId: string
  interviewerId: string
  interviewType: string
  interviewDate: string
  result: string | null
  feedback: string | null
  createdAt: string
  updatedAt: string
  createdById: string | null
  application?: InterviewApplicationRef | null
  interviewer?: RecruitmentUserRef | null
  creator?: RecruitmentUserRef | null
}

export interface InterviewFilters extends RecruitmentListFilters {
  applicationId?: string
  interviewerId?: string
  dateFrom?: string
  dateTo?: string
}

export interface CreateInterviewPayload {
  applicationId: string
  interviewerId: string
  interviewDate: string // ISO
  interviewType: string
}

export interface UpdateInterviewPayload {
  interviewDate?: string // ISO
  interviewType?: string
  result?: string | null
  feedback?: string | null
}

const LIST_KEY = ['recruitment', 'interviews']

export function useInterviews(filters: InterviewFilters = {}) {
  return useQuery({
    queryKey: [...LIST_KEY, filters],
    queryFn: async (): Promise<RecruitmentListResponse<Interview>> => {
      const { data: response } = await apiClient.get('/hr/recruitment/interviews', {
        params: filters,
      })
      return normalizeRecruitmentList<Interview>(response)
    },
    ...recruitmentListQueryOptions,
  })
}

export function useInterview(id: string) {
  return useQuery({
    queryKey: [...LIST_KEY, id],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/hr/recruitment/interviews/${id}`)
      return unwrapEntity<Interview>(response)
    },
    enabled: !!id,
  })
}

export function useCreateInterview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateInterviewPayload) => {
      const { data: response } = await apiClient.post('/hr/recruitment/interviews', payload)
      return unwrapEntity<Interview>(response)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY })
      toast.success('Interview scheduled successfully')
    },
  })
}

export function useUpdateInterview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInterviewPayload }) => {
      const { data: response } = await apiClient.put(`/hr/recruitment/interviews/${id}`, data)
      return unwrapEntity<Interview>(response)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY })
      queryClient.invalidateQueries({ queryKey: [...LIST_KEY, variables.id] })
      queryClient.invalidateQueries({
        queryKey: ['audit-logs', 'entity', 'Interview', variables.id],
      })
      toast.success('Interview updated successfully')
    },
  })
}

export function useDeleteInterview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/hr/recruitment/interviews/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY })
      toast.success('Interview deleted successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete interview'))
    },
  })
}

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
  type RecruitmentDepartmentRef,
  type RecruitmentPositionRef,
} from './useRecruitmentShared'

export type ApplicationStage =
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'OFFERED'
  | 'REJECTED'
  | 'HIRED'

export const APPLICATION_STAGES: ApplicationStage[] = [
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFERED',
  'REJECTED',
  'HIRED',
]

// The linear progression the backend enforces (REJECTED is reachable from any stage).
const STAGE_ORDER: ApplicationStage[] = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFERED', 'HIRED']

/**
 * Mirrors the backend `validateStageTransition`: you may advance exactly one
 * step forward, or move to REJECTED from anywhere. Backwards / skipping is
 * rejected server-side.
 */
export function allowedNextStages(current: ApplicationStage): ApplicationStage[] {
  if (current === 'HIRED' || current === 'REJECTED') return []
  const currentIndex = STAGE_ORDER.indexOf(current)
  const next: ApplicationStage[] = []
  if (currentIndex >= 0 && currentIndex + 1 < STAGE_ORDER.length) {
    next.push(STAGE_ORDER[currentIndex + 1])
  }
  next.push('REJECTED')
  return next
}

export interface ApplicationCandidateRef {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
}

export interface ApplicationRequisitionRef {
  id: string
  title: string
  department?: RecruitmentDepartmentRef | null
  position?: RecruitmentPositionRef | null
}

export interface ApplicationInterviewRef {
  id: string
  interviewType: string
  interviewDate: string
  result?: string | null
  feedback?: string | null
  interviewer?: RecruitmentUserRef | null
}

export interface ApplicationOfferRef {
  id: string
  status: string
  createdAt: string
}

export interface Application {
  id: string
  tenantId?: string
  candidateId: string
  requisitionId: string
  stage: ApplicationStage
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  createdById: string | null
  candidate?: ApplicationCandidateRef | null
  requisition?: ApplicationRequisitionRef | null
  interviews?: ApplicationInterviewRef[]
  offers?: ApplicationOfferRef[]
  creator?: RecruitmentUserRef | null
  _count?: { interviews: number; offers: number }
}

export interface ApplicationFilters extends RecruitmentListFilters {
  candidateId?: string
  requisitionId?: string
  stage?: ApplicationStage
}

export interface CreateApplicationPayload {
  candidateId: string
  requisitionId: string
  notes?: string | null
}

export interface UpdateApplicationPayload {
  stage?: ApplicationStage
  status?: string
  notes?: string | null
}

export interface MoveStagePayload {
  stage: ApplicationStage
  notes?: string
}

const LIST_KEY = ['recruitment', 'applications']

export function useApplications(filters: ApplicationFilters = {}) {
  return useQuery({
    queryKey: [...LIST_KEY, filters],
    queryFn: async (): Promise<RecruitmentListResponse<Application>> => {
      const { data: response } = await apiClient.get('/hr/recruitment/applications', {
        params: filters,
      })
      return normalizeRecruitmentList<Application>(response)
    },
    ...recruitmentListQueryOptions,
  })
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: [...LIST_KEY, id],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/hr/recruitment/applications/${id}`)
      return unwrapEntity<Application>(response)
    },
    enabled: !!id,
  })
}

export function useCreateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateApplicationPayload) => {
      const { data: response } = await apiClient.post('/hr/recruitment/applications', payload)
      return unwrapEntity<Application>(response)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY })
      toast.success('Application created successfully')
    },
  })
}

export function useUpdateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateApplicationPayload }) => {
      const { data: response } = await apiClient.put(`/hr/recruitment/applications/${id}`, data)
      return unwrapEntity<Application>(response)
    },
    onSuccess: (_, variables) => {
      invalidateApplication(queryClient, variables.id)
      toast.success('Application updated successfully')
    },
  })
}

export function useMoveApplicationStage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MoveStagePayload }) => {
      const { data: response } = await apiClient.put(
        `/hr/recruitment/applications/${id}/stage`,
        data,
      )
      return unwrapEntity<Application>(response)
    },
    onSuccess: (_, variables) => {
      invalidateApplication(queryClient, variables.id)
      toast.success('Application stage updated')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to move application stage'))
    },
  })
}

export function useDeleteApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/hr/recruitment/applications/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY })
      toast.success('Application deleted successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete application'))
    },
  })
}

function invalidateApplication(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
): void {
  queryClient.invalidateQueries({ queryKey: LIST_KEY })
  queryClient.invalidateQueries({ queryKey: [...LIST_KEY, id] })
  queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'Application', id] })
}

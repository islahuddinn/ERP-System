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

export interface CandidateApplicationRef {
  id: string
  stage: string
  status: string
  requisition?: {
    id: string
    title: string
    department?: RecruitmentDepartmentRef | null
    position?: RecruitmentPositionRef | null
  } | null
}

export interface Candidate {
  id: string
  tenantId: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  resumeUrl: string | null
  source: string | null
  status: string
  createdAt: string
  updatedAt: string
  createdById: string | null
  creator?: RecruitmentUserRef | null
  applications?: CandidateApplicationRef[]
  _count?: { applications: number }
}

export interface CandidateFilters extends RecruitmentListFilters {
  source?: string
}

export interface CreateCandidatePayload {
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  resumeUrl?: string | null
  source?: string | null
}

export type UpdateCandidatePayload = Partial<CreateCandidatePayload>

export function candidateFullName(candidate: Pick<Candidate, 'firstName' | 'lastName'>): string {
  return `${candidate.firstName} ${candidate.lastName}`.trim()
}

const LIST_KEY = ['recruitment', 'candidates']

export function useCandidates(filters: CandidateFilters = {}) {
  return useQuery({
    queryKey: [...LIST_KEY, filters],
    queryFn: async (): Promise<RecruitmentListResponse<Candidate>> => {
      const { data: response } = await apiClient.get('/hr/recruitment/candidates', {
        params: filters,
      })
      return normalizeRecruitmentList<Candidate>(response)
    },
    ...recruitmentListQueryOptions,
  })
}

// Lightweight candidate list for selects (reuses the paginated list at a high limit).
export function useCandidatesDropdown() {
  return useQuery({
    queryKey: [...LIST_KEY, 'dropdown'],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/hr/recruitment/candidates', {
        params: { page: 1, limit: 200 },
      })
      return normalizeRecruitmentList<Candidate>(response).data
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useCandidate(id: string) {
  return useQuery({
    queryKey: [...LIST_KEY, id],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/hr/recruitment/candidates/${id}`)
      return unwrapEntity<Candidate>(response)
    },
    enabled: !!id,
  })
}

export function useCreateCandidate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateCandidatePayload) => {
      const { data: response } = await apiClient.post('/hr/recruitment/candidates', payload)
      return unwrapEntity<Candidate>(response)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY })
      toast.success('Candidate created successfully')
    },
  })
}

export function useUpdateCandidate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCandidatePayload }) => {
      const { data: response } = await apiClient.put(`/hr/recruitment/candidates/${id}`, data)
      return unwrapEntity<Candidate>(response)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY })
      queryClient.invalidateQueries({ queryKey: [...LIST_KEY, variables.id] })
      queryClient.invalidateQueries({
        queryKey: ['audit-logs', 'entity', 'Candidate', variables.id],
      })
      toast.success('Candidate updated successfully')
    },
  })
}

export function useDeleteCandidate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/hr/recruitment/candidates/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY })
      toast.success('Candidate deleted successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete candidate'))
    },
  })
}

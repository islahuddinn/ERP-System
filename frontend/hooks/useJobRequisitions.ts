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

export type JobRequisitionStatus = 'OPEN' | 'CLOSED' | 'HOLD'
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP'

export const JOB_REQUISITION_STATUSES: JobRequisitionStatus[] = ['OPEN', 'CLOSED', 'HOLD']
export const EMPLOYMENT_TYPES: EmploymentType[] = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']

export function employmentTypeLabel(type: EmploymentType | string): string {
  return String(type).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export interface JobRequisition {
  id: string
  tenantId: string
  title: string
  description: string | null
  departmentId: string
  positionId: string
  employmentType: EmploymentType
  openings: number
  status: JobRequisitionStatus
  createdAt: string
  updatedAt: string
  createdById: string | null
  department?: RecruitmentDepartmentRef | null
  position?: RecruitmentPositionRef | null
  creator?: RecruitmentUserRef | null
  applications?: JobRequisitionApplicationRef[]
  _count?: { applications: number }
}

export interface JobRequisitionApplicationRef {
  id: string
  stage: string
  status: string
  candidate?: { firstName: string; lastName: string; email: string } | null
}

export interface JobRequisitionFilters extends RecruitmentListFilters {
  departmentId?: string
  positionId?: string
  status?: JobRequisitionStatus
  employmentType?: EmploymentType
}

export interface CreateJobRequisitionPayload {
  title: string
  departmentId: string
  positionId: string
  employmentType: EmploymentType
  openings: number
  status?: JobRequisitionStatus
  description?: string | null
}

export type UpdateJobRequisitionPayload = Partial<CreateJobRequisitionPayload>

const LIST_KEY = ['recruitment', 'job-requisitions']

export function useJobRequisitions(filters: JobRequisitionFilters = {}) {
  return useQuery({
    queryKey: [...LIST_KEY, filters],
    queryFn: async (): Promise<RecruitmentListResponse<JobRequisition>> => {
      const { data: response } = await apiClient.get('/hr/recruitment/job-requisitions', {
        params: filters,
      })
      return normalizeRecruitmentList<JobRequisition>(response)
    },
    ...recruitmentListQueryOptions,
  })
}

export function useJobRequisition(id: string) {
  return useQuery({
    queryKey: [...LIST_KEY, id],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/hr/recruitment/job-requisitions/${id}`)
      return unwrapEntity<JobRequisition>(response)
    },
    enabled: !!id,
  })
}

export function useCreateJobRequisition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateJobRequisitionPayload) => {
      const { data: response } = await apiClient.post('/hr/recruitment/job-requisitions', payload)
      return unwrapEntity<JobRequisition>(response)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY })
      toast.success('Job requisition created successfully')
    },
  })
}

export function useUpdateJobRequisition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateJobRequisitionPayload }) => {
      const { data: response } = await apiClient.put(
        `/hr/recruitment/job-requisitions/${id}`,
        data,
      )
      return unwrapEntity<JobRequisition>(response)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY })
      queryClient.invalidateQueries({ queryKey: [...LIST_KEY, variables.id] })
      queryClient.invalidateQueries({
        queryKey: ['audit-logs', 'entity', 'JobRequisition', variables.id],
      })
      toast.success('Job requisition updated successfully')
    },
  })
}

export function useDeleteJobRequisition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/hr/recruitment/job-requisitions/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY })
      toast.success('Job requisition deleted successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete job requisition'))
    },
  })
}

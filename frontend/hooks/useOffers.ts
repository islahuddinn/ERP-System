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

export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED'

export const OFFER_STATUSES: OfferStatus[] = ['PENDING', 'ACCEPTED', 'DECLINED']

export interface OfferApplicationRef {
  id: string
  stage: string
  candidate?: ApplicationCandidateRef | null
  requisition?: ApplicationRequisitionRef | null
}

export interface Offer {
  id: string
  tenantId: string
  applicationId: string
  // Serialized from a Decimal column — arrives as a string or number depending on serializer.
  offeredSalary: number | string
  joiningDate: string | null
  status: OfferStatus
  createdAt: string
  updatedAt: string
  createdById: string | null
  application?: OfferApplicationRef | null
  creator?: RecruitmentUserRef | null
}

export interface OfferFilters extends RecruitmentListFilters {
  applicationId?: string
  status?: OfferStatus
}

export interface CreateOfferPayload {
  applicationId: string
  offeredSalary: number
  joiningDate: string // ISO
}

export interface UpdateOfferPayload {
  offeredSalary?: number
  joiningDate?: string // ISO
  status?: OfferStatus
}

const LIST_KEY = ['recruitment', 'offers']

export function useOffers(filters: OfferFilters = {}) {
  return useQuery({
    queryKey: [...LIST_KEY, filters],
    queryFn: async (): Promise<RecruitmentListResponse<Offer>> => {
      const { data: response } = await apiClient.get('/hr/recruitment/offers', { params: filters })
      return normalizeRecruitmentList<Offer>(response)
    },
    ...recruitmentListQueryOptions,
  })
}

export function useOffer(id: string) {
  return useQuery({
    queryKey: [...LIST_KEY, id],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/hr/recruitment/offers/${id}`)
      return unwrapEntity<Offer>(response)
    },
    enabled: !!id,
  })
}

export function useCreateOffer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateOfferPayload) => {
      const { data: response } = await apiClient.post('/hr/recruitment/offers', payload)
      return unwrapEntity<Offer>(response)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY })
      queryClient.invalidateQueries({ queryKey: ['recruitment', 'applications'] })
      toast.success('Offer created successfully')
    },
  })
}

export function useUpdateOffer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateOfferPayload }) => {
      const { data: response } = await apiClient.put(`/hr/recruitment/offers/${id}`, data)
      return unwrapEntity<Offer>(response)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY })
      queryClient.invalidateQueries({ queryKey: [...LIST_KEY, variables.id] })
      queryClient.invalidateQueries({ queryKey: ['recruitment', 'applications'] })
      queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'Offer', variables.id] })
      toast.success('Offer updated successfully')
    },
  })
}

export function useDeleteOffer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/hr/recruitment/offers/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY })
      toast.success('Offer deleted successfully')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete offer'))
    },
  })
}

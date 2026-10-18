'use client'

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryMeta } from './useRegions'
import { formatEmployeeCashPerson } from './useEmployeeCashLedger'
import { employeeLabel, type EmployeeDropdownItem } from './useEmployees'

export type EmployeeCashTransferStatus = 'PENDING' | 'RECEIVED' | 'REJECTED'

export const EMPLOYEE_CASH_TRANSFER_STATUS_LABELS: Record<EmployeeCashTransferStatus, string> = {
  PENDING: 'Pending',
  RECEIVED: 'Received',
  REJECTED: 'Rejected',
}

export interface EmployeeCashTransferEmployee {
  id: string
  employeeCode: string
  user?: { id: string; firstName: string; lastName: string; phone: string | null }
}

export interface EmployeeCashTransfer {
  id: string
  transferNumber: string
  fromEmployeeId: string
  toEmployeeId: string
  amount: number
  status: EmployeeCashTransferStatus
  senderNotes?: string | null
  receiverNotes?: string | null
  transferredAt: string
  respondedAt?: string | null
  settlesTransferId?: string | null
  fromEmployee?: EmployeeCashTransferEmployee
  toEmployee?: EmployeeCashTransferEmployee
  settlesTransfer?: {
    id: string
    transferNumber: string
    toBranch?: { id: string; name: string; code: string }
  } | null
}

export interface EmployeeCashTransferFilters {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  fromEmployeeId?: string
  toEmployeeId?: string
}

export interface EmployeeCashTransfersResponse {
  data: EmployeeCashTransfer[]
  meta: TerritoryMeta | null
}

export interface CreateEmployeeCashTransferPayload {
  toEmployeeId: string
  amount: number
  notes?: string
  settlesTransferId?: string
}

export interface RespondEmployeeCashTransferPayload {
  decision: 'RECEIVED' | 'REJECTED'
  notes?: string
}

const KEY = 'employee-cash-transfers'

export { formatEmployeeCashPerson }

export function useEmployeeCashTransfers(filters: EmployeeCashTransferFilters = {}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async (): Promise<EmployeeCashTransfersResponse> => {
      const { data: response } = await apiClient.get('/employee-cash-transfer', { params: filters })
      return {
        data: response?.data ?? (Array.isArray(response) ? response : []),
        meta: response?.meta ?? null,
      }
    },
    placeholderData: keepPreviousData,
  })
}

export function useEmployeeCashTransfer(transferId: string) {
  return useQuery({
    queryKey: [KEY, transferId],
    enabled: !!transferId,
    queryFn: async (): Promise<EmployeeCashTransfer> => {
      const { data: response } = await apiClient.get(`/employee-cash-transfer/${transferId}`)
      return response?.data ?? response
    },
  })
}

export function useCreateEmployeeCashTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateEmployeeCashTransferPayload) => {
      const { data: response } = await apiClient.post('/employee-cash-transfer', payload)
      return response?.data ?? response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      queryClient.invalidateQueries({ queryKey: ['employee-cash-ledger'] })
      toast.success('Cash transfer recorded — waiting for recipient confirmation')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to record cash transfer'))
    },
  })
}

export function useRespondEmployeeCashTransfer(transferId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: RespondEmployeeCashTransferPayload) => {
      const { data: response } = await apiClient.post(
        `/employee-cash-transfer/${transferId}/respond`,
        payload,
      )
      return response?.data ?? response
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      queryClient.invalidateQueries({ queryKey: [KEY, transferId] })
      queryClient.invalidateQueries({ queryKey: ['employee-cash-ledger'] })
      queryClient.invalidateQueries({ queryKey: ['branch-ledger'] })
      toast.success(
        variables.decision === 'RECEIVED' ? 'Transfer confirmed' : 'Transfer rejected',
      )
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to respond to transfer'))
    },
  })
}

export function formatTransferEmployeeName(employee?: EmployeeCashTransferEmployee | null): string {
  if (!employee) return '—'
  return employeeLabel(employee as EmployeeDropdownItem)
}

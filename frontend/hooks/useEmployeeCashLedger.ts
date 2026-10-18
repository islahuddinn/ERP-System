'use client'

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryMeta } from './useRegions'
import { employeeLabel, type EmployeeDropdownItem } from './useEmployees'

export type EmployeeCashLedgerEntryType =
  | 'RECOVERY_COLLECTED'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'STOCK_RECEIVED'
  | 'STOCK_DISPATCHED'
  | 'ADJUSTMENT'
  | 'OPENING_BALANCE'

export const EMPLOYEE_CASH_LEDGER_ENTRY_LABELS: Record<EmployeeCashLedgerEntryType, string> = {
  RECOVERY_COLLECTED: 'Recovery Collected',
  TRANSFER_IN: 'Transfer In',
  TRANSFER_OUT: 'Transfer Out',
  STOCK_RECEIVED: 'Stock Received',
  STOCK_DISPATCHED: 'Stock Dispatched',
  ADJUSTMENT: 'Adjustment',
  OPENING_BALANCE: 'Opening Balance',
}

export interface EmployeeCashLedgerEmployee {
  id: string
  employeeCode: string
  user?: { id: string; firstName: string; lastName: string; phone: string | null }
}

export interface EmployeeCashLedgerEntry {
  id: string
  employeeId: string
  type: EmployeeCashLedgerEntryType
  date: string
  reference?: string | null
  referenceId: string | null
  description: string
  debit: number
  credit: number
  balance: number
  notes?: string | null
  createdAt: string
}

export interface EmployeeCashLedgerSummary {
  totalCollected: number
  totalReceived: number
  totalTransferredOut: number
  currentCashInHand: number
  netStockDebt: number
  totalEntries: number
}

export interface EmployeeCashLedgerFilters {
  page?: number
  limit?: number
  startDate?: string
  endDate?: string
  withEmployeeId?: string
}

export interface EmployeeCashLedgerResponse {
  employee: EmployeeCashLedgerEmployee
  summary: EmployeeCashLedgerSummary
  ledger: {
    data: EmployeeCashLedgerEntry[]
    meta: TerritoryMeta | null
  }
}

const KEY = 'employee-cash-ledger'

export function formatEmployeeCashPerson(
  employee?: EmployeeCashLedgerEmployee | EmployeeDropdownItem | null,
): string {
  if (!employee) return '—'
  if ('employeeCode' in employee && employee.user) {
    return employeeLabel(employee as EmployeeDropdownItem)
  }
  if ('employeeCode' in employee) {
    const name = employee.user
      ? `${employee.user.firstName} ${employee.user.lastName}`.trim()
      : employee.employeeCode
    return `${name} (${employee.employeeCode})`
  }
  return '—'
}

export function useEmployeeCashLedger(
  employeeId: string | undefined,
  filters: EmployeeCashLedgerFilters = {},
) {
  return useQuery({
    queryKey: [KEY, employeeId, filters],
    enabled: !!employeeId,
    queryFn: async (): Promise<EmployeeCashLedgerResponse> => {
      const { data: response } = await apiClient.get(`/employee-cash-ledger/${employeeId}`, {
        params: filters,
      })
      const payload = response?.data ?? response
      return {
        employee: payload.employee,
        summary: payload.summary,
        ledger: {
          data: payload.ledger?.data ?? [],
          meta: payload.ledger?.meta ?? null,
        },
      }
    },
    placeholderData: keepPreviousData,
  })
}

export function invalidateEmployeeCashLedgerQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  employeeId?: string,
) {
  queryClient.invalidateQueries({
    queryKey: employeeId ? [KEY, employeeId] : [KEY],
  })
}

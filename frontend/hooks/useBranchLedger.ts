'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { TerritoryMeta } from './useRegions'
import type { BranchLookup, ProductLookup } from './useBranchStock'

export type BranchLedgerEntryType = 'STOCK_RECEIVED' | 'PAYMENT' | 'STOCK_RETURNED'

export interface BranchLedgerEntry {
  id: string
  date: string
  type: BranchLedgerEntryType
  referenceId: string | null
  description: string
  debit: number
  credit: number
  branch: BranchLookup
  counterparty: BranchLookup | null
}

export interface BranchLedgerFilters {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  search?: string
  type?: BranchLedgerEntryType
}

export interface BranchLedgerResponse {
  data: BranchLedgerEntry[]
  meta: TerritoryMeta | null
}

export interface BranchLedgerSummary {
  branchId: string
  owedToParent: number
  owedFromChildren: number
  totalChargedByParent: number
  totalChargedToChildren: number
  profitLoss: number
}

const KEY = 'branch-ledger'

export const BRANCH_LEDGER_ENTRY_TYPE_LABELS: Record<BranchLedgerEntryType, string> = {
  STOCK_RECEIVED: 'Stock Received',
  PAYMENT: 'Payment',
  STOCK_RETURNED: 'Stock Returned',
}

export function useBranchLedger(branchLedgerFilters: BranchLedgerFilters = {}) {
  return useQuery({
    queryKey: [KEY, branchLedgerFilters],
    queryFn: async (): Promise<BranchLedgerResponse> => {
      const { data: response } = await apiClient.get('/sales-management/branch-ledger', {
        params: branchLedgerFilters,
      })

      return {
        data: response?.data ?? (Array.isArray(response) ? response : []),
        meta: response?.meta ?? null,
      }
    },
    placeholderData: keepPreviousData,
  })
}

export function useBranchLedgerSummary() {
  return useQuery({
    queryKey: [KEY, 'summary'],
    queryFn: async (): Promise<BranchLedgerSummary> => {
      const { data: response } = await apiClient.get('/sales-management/branch-ledger/summary')
      return response?.data ?? response
    },
    placeholderData: keepPreviousData,
  })
}


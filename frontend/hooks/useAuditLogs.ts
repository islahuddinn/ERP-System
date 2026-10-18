// React Query hooks for Audit Logs — aligned to docs/api/audit-logs-api.md
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export type AuditAction =
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'
  | 'EXPORT' | 'IMPORT' | 'APPROVE' | 'REJECT' | 'RESTORE'

export interface AuditLog {
  id: string
  actorId: string
  module: string
  entityName: string
  entityId: string
  entityLabel: string | null
  action: AuditAction
  oldValue: Record<string, any> | null
  newValue: Record<string, any> | null
  metadata: any
  createdAt: string
  actor?: { id: string; name: string; email: string } | null
}

export interface AuditLogFilters {
  page?: number
  limit?: number
  module?: string
  entityName?: string
  entityId?: string
  actorId?: string
  action?: AuditAction
  fromDate?: string
  toDate?: string
  search?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface AuditLogList {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AuditSummary {
  totalLogs: number
  recentLogs: AuditLog[]
  byAction: Record<string, number>
  byModule: Record<string, number>
}

// Global, paginated list. NOTE: the API envelope here is { logs, total, page, limit, totalPages }
// (not the usual { data, meta }) — the ResponseInterceptor nests it under `data`.
export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async (): Promise<AuditLogList> => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
      })
      const { data: response } = await apiClient.get(`/audit-logs?${params.toString()}`)
      const payload = (response?.data ?? response) as Partial<AuditLogList>
      return {
        logs: Array.isArray(payload?.logs) ? payload.logs! : [],
        total: payload?.total ?? 0,
        page: payload?.page ?? 1,
        limit: payload?.limit ?? 50,
        totalPages: payload?.totalPages ?? 0,
      }
    },
    // Audit entries are written by actions in other modules, so the global
    // 1-minute staleTime would show a stale list after an action until a manual
    // refresh (#13). Always treat as stale + refetch on mount so revisiting the
    // page reflects the latest entries.
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useAuditSummary() {
  return useQuery({
    queryKey: ['audit-logs', 'summary'],
    queryFn: async (): Promise<AuditSummary> => {
      const { data: response } = await apiClient.get('/audit-logs/summary')
      const payload = (response?.data ?? response) as Partial<AuditSummary>
      return {
        totalLogs: payload?.totalLogs ?? 0,
        recentLogs: Array.isArray(payload?.recentLogs) ? payload.recentLogs! : [],
        byAction: payload?.byAction ?? {},
        byModule: payload?.byModule ?? {},
      }
    },
  })
}

/**
 * Per-record history timeline (the "View History" button on detail screens).
 * `entityName` is the exact Prisma model name (e.g. RawMaterial, PurchaseOrder, GRN).
 * Returns newest-first; empty array (not error) when there's no history.
 */
export function useEntityHistory(entityName?: string, entityId?: string) {
  return useQuery({
    queryKey: ['audit-logs', 'entity', entityName, entityId],
    enabled: !!entityName && !!entityId,
    queryFn: async (): Promise<AuditLog[]> => {
      const { data: response } = await apiClient.get(`/audit-logs/entity/${entityName}/${entityId}`)
      const payload = response?.data ?? response
      return Array.isArray(payload) ? (payload as AuditLog[]) : []
    },
    // The View History dialog gates this query via `enabled`. With the global
    // 1-minute staleTime, reopening the dialog after an edit served cached
    // history missing the new entry (#13). staleTime 0 makes re-enabling on each
    // open refetch fresh history.
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useAuditLog(id?: string) {
  return useQuery({
    queryKey: ['audit-logs', 'single', id],
    enabled: !!id,
    queryFn: async (): Promise<AuditLog> => {
      const { data: response } = await apiClient.get(`/audit-logs/${id}`)
      return (response?.data ?? response) as AuditLog
    },
  })
}

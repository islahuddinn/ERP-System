import { keepPreviousData } from '@tanstack/react-query'

/**
 * Shared types and helpers for the HR Recruitment suite.
 *
 * NOTE ON THE LIST SHAPE: the recruitment backend repositories return
 * `{ items, total, page, limit }` (NOT the standard `{ data, meta }` envelope
 * used elsewhere). `normalizeRecruitmentList` converts either shape into the
 * `{ data, meta }` shape the shared <DataTable> expects.
 */

export interface RecruitmentMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface RecruitmentListResponse<T> {
  data: T[]
  meta: RecruitmentMeta | null
}

// A minimal user reference (creator / interviewer). The recruitment backend
// selects `{ id, firstName, lastName, email }` for these relations.
export interface RecruitmentUserRef {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
}

export interface RecruitmentDepartmentRef {
  id: string
  name: string
}

export interface RecruitmentPositionRef {
  id: string
  title: string
}

// Shared query-param base for every recruitment list hook.
export interface RecruitmentListFilters {
  search?: string
  page?: number
  limit?: number
}

export const recruitmentListQueryOptions = {
  placeholderData: keepPreviousData,
}

/**
 * Accepts the raw axios `response.data` payload (which may itself be wrapped in
 * a `{ data: ... }` success envelope by the global interceptor) and normalizes
 * it to `{ data, meta }`.
 */
export function normalizeRecruitmentList<T>(rawResponse: any): RecruitmentListResponse<T> {
  // Unwrap the global success envelope ({ success, message, data }) if present.
  const payload = rawResponse?.data !== undefined ? rawResponse.data : rawResponse

  // Repository shape: { items, total, page, limit }
  if (payload && Array.isArray(payload.items)) {
    const total: number = payload.total ?? payload.items.length
    const page: number = payload.page ?? 1
    const limit: number = payload.limit ?? (payload.items.length || 1)
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1
    return {
      data: payload.items as T[],
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  }

  // Standard envelope shape: { data, meta }
  if (payload && Array.isArray(payload.data)) {
    return { data: payload.data as T[], meta: payload.meta ?? null }
  }

  // Bare array fallback.
  if (Array.isArray(payload)) {
    return { data: payload as T[], meta: null }
  }

  return { data: [], meta: null }
}

/** Unwraps a single-entity response from the global `{ success, data }` envelope. */
export function unwrapEntity<T>(rawResponse: any): T {
  return (rawResponse?.data ?? rawResponse) as T
}

export function recruitmentUserName(user: RecruitmentUserRef | null | undefined): string {
  if (!user) return '—'
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
  return fullName || user.email || '—'
}

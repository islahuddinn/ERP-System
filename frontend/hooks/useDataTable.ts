'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import type { SortOrder } from '@/components/ui/table-sort'

export interface UseDataTableOptions {
  /** Page size. Default 10. */
  initialLimit?: number
  /** Initial sort column (backend field) + direction. */
  initialSortBy?: string
  initialSortOrder?: SortOrder
  /** Search debounce in ms. Default 750 — waits for the user to stop typing. */
  debounceMs?: number
  /** Initial filter values keyed by query-param name. */
  initialFilters?: Record<string, string>
}

/**
 * State manager for the generic <DataTable>. Owns page/limit, debounced search,
 * sort, and dynamic column filters, and exposes a ready-to-spread `queryParams`
 * object for the page's data hook (page, limit, search, sortBy, sortOrder, …filters).
 * Search is debounced (default 750ms) so the endpoint is only hit once the user
 * stops typing. Page auto-resets to 1 whenever search/sort/filters change.
 */
export function useDataTable(options: UseDataTableOptions = {}) {
  const {
    initialLimit = 10,
    initialSortBy,
    initialSortOrder = 'ASC',
    debounceMs = 750,
    initialFilters = {},
  } = options

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(initialLimit)
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounce(searchInput, debounceMs)
  const [sortBy, setSortBy] = useState<string | undefined>(initialSortBy)
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder)
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters)

  const filtersKey = JSON.stringify(filters)

  // Any change to what's being queried (besides the page itself) returns to page 1.
  useEffect(() => {
    setPage(1)
  }, [search, sortBy, sortOrder, limit, filtersKey])

  const setSort = (by: string | undefined, order: SortOrder) => {
    setSortBy(by)
    setSortOrder(order)
  }

  /** Click-to-sort on a column header: asc → desc → cleared. */
  const toggleSort = (column: string) => {
    if (sortBy !== column) {
      setSort(column, 'ASC')
    } else if (sortOrder === 'ASC') {
      setSort(column, 'DESC')
    } else {
      setSort(undefined, 'ASC')
    }
  }

  const setFilter = useCallback((key: string, value: string | undefined) => {
    setFilters((prev) => {
      const next = { ...prev }
      if (!value) delete next[key]
      else next[key] = value
      return next
    })
  }, [])

  const resetFilters = useCallback(() => setFilters({}), [])

  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = { page, limit }
    if (search.trim()) params.search = search.trim()
    if (sortBy) {
      params.sortBy = sortBy
      params.sortOrder = sortOrder
    }
    for (const [key, value] of Object.entries(filters)) {
      if (value) params[key] = value
    }
    return params
  }, [page, limit, search, sortBy, sortOrder, filters])

  const isFiltered = Boolean(search.trim()) || Object.keys(filters).length > 0

  return {
    page,
    setPage,
    limit,
    setLimit,
    searchInput,
    setSearchInput,
    sortBy,
    sortOrder,
    setSort,
    toggleSort,
    filters,
    setFilter,
    resetFilters,
    isFiltered,
    queryParams,
  }
}

export type DataTableController = ReturnType<typeof useDataTable>

export interface ClientPagingAccessors<T> {
  /** Concatenated text a row matches the search box against. */
  search?: (row: T) => string
  /** Map of filter-key → the row value to compare against the active filter. */
  filters?: Record<string, (row: T) => string | number | null | undefined>
  /** Map of sortBy field → comparable value accessor. */
  sort?: Record<string, (row: T) => string | number | Date | null | undefined>
}

interface ClientPagingResult<T> {
  data: T[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

/**
 * Client-side adapter for the generic <DataTable>: filters, sorts, and paginates
 * an already-fetched array using the controller's state. Use for endpoints that
 * don't (yet) support server-side search/sort/pagination, so any list can adopt
 * the unified table without a backend change. For large lists prefer the server
 * path (spread `controller.queryParams` into the list hook).
 */
export function applyClientPaging<T>(
  rows: T[] | undefined,
  controller: DataTableController,
  accessors: ClientPagingAccessors<T> = {},
  options: { ignorePaging?: boolean } = {},
): ClientPagingResult<T> {
  const q = controller.queryParams
  let result = rows ?? []

  const search = typeof q.search === 'string' ? q.search.toLowerCase() : ''
  if (search && accessors.search) {
    result = result.filter((r) => accessors.search!(r).toLowerCase().includes(search))
  }

  if (accessors.filters) {
    for (const [key, accessor] of Object.entries(accessors.filters)) {
      const val = q[key]
      if (val !== undefined && val !== '') {
        result = result.filter((r) => String(accessor(r) ?? '') === String(val))
      }
    }
  }

  const sortBy = typeof q.sortBy === 'string' ? q.sortBy : undefined
  if (sortBy && accessors.sort?.[sortBy]) {
    const acc = accessors.sort[sortBy]
    const dir = q.sortOrder === 'DESC' ? -1 : 1
    result = [...result].sort((a, b) => {
      const av = acc(a)
      const bv = acc(b)
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
  }

  const total = result.length
  const page = Number(q.page) || 1
  const limit = Number(q.limit) || 10
  if (options.ignorePaging) {
    return { data: result, meta: { total, page: 1, limit: total, totalPages: 1 } }
  }
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const start = (page - 1) * limit
  return { data: result.slice(start, start + limit), meta: { total, page, limit, totalPages } }
}

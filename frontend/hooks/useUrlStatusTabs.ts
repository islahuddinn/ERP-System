'use client'

import { useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { DataTableController } from '@/hooks/useDataTable'

export interface StatusTabOption {
  value: string
  label: string
}

interface UseUrlStatusTabsOptions {
  basePath: string
  paramName?: string
  /** Query params kept when switching tabs (e.g. orderId, requestId). */
  preserveParams?: string[]
  allValue?: string
  /** Map legacy sidebar values to canonical backend enum strings. */
  normalizeValue?: (raw: string) => string | undefined
}

/**
 * URL-driven status tabs — same pattern as Quality Control → Inspections.
 * Does not touch DataTable state; pair with `useListQueryParams` for API calls.
 */
export function useUrlStatusTabs({
  basePath,
  paramName = 'status',
  preserveParams = [],
  allValue = 'all',
  normalizeValue,
}: UseUrlStatusTabsOptions) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const rawUrlValue = searchParams.get(paramName)
  const normalizedUrlValue =
    rawUrlValue && normalizeValue ? normalizeValue(rawUrlValue) : rawUrlValue
  const value = normalizedUrlValue ?? allValue
  const filterValue = value === allValue ? undefined : value

  const onChange = useCallback(
    (nextValue: string) => {
      const params = new URLSearchParams()

      for (const key of preserveParams) {
        const preserved = searchParams.get(key)
        if (preserved) params.set(key, preserved)
      }

      if (nextValue !== allValue) {
        params.set(paramName, nextValue)
      }

      const queryString = params.toString()
      router.push(queryString ? `${basePath}?${queryString}` : basePath)
    },
    [router, searchParams, basePath, paramName, preserveParams, allValue],
  )

  return { value, onChange, filterValue, paramName }
}

/** Merges URL tab filter + optional extra URL filters into DataTable query params. */
export function useListQueryParams(
  controller: DataTableController,
  urlTabs: Pick<ReturnType<typeof useUrlStatusTabs>, 'filterValue' | 'paramName'>,
  extraFilters: Record<string, string | undefined> = {},
): Record<string, string | number> {
  const extraKey = JSON.stringify(extraFilters)

  return useMemo(() => {
    const params: Record<string, string | number> = { ...controller.queryParams }

    // Always clear the URL-tab param first so stale values from a prior tab do not leak.
    delete params[urlTabs.paramName]

    if (urlTabs.filterValue) {
      params[urlTabs.paramName] = urlTabs.filterValue
    }

    for (const [key, val] of Object.entries(extraFilters)) {
      if (val) params[key] = val
    }

    return params
  }, [controller.queryParams, urlTabs.filterValue, urlTabs.paramName, extraKey])
}

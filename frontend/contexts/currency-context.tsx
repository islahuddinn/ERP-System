'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/contexts/auth-context'
import { CURRENCIES, DEFAULT_CURRENCY, currencyByCode, type CurrencyOption } from '@/lib/currencies'
import { formatMoney, setActiveCurrency } from '@/lib/currency'

interface CurrencyContextValue {
  /** The active currency (code + symbol + position). */
  currency: CurrencyOption
  /** All selectable currencies (for the settings picker). */
  currencies: CurrencyOption[]
  /** Persist a new currency (tenant-wide) and apply it live across the app. */
  setCurrency: (code: string) => Promise<void>
  /** Format an amount with the active currency, e.g. "Rs. 1,000.00". Reactive. */
  format: (amount: number | null | undefined) => string
  isSaving: boolean
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined)

/**
 * Provides the tenant's display currency (from Settings.currency) as a single source
 * of truth, and keeps the module-level formatter (lib/currency) in sync so non-hook
 * callers reflect the same currency. Changing it persists to the backend and updates
 * the whole app immediately. Display-only — amounts are never converted.
 */
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const [currency, setCurrencyState] = useState<CurrencyOption>(DEFAULT_CURRENCY)
  const [isSaving, setIsSaving] = useState(false)

  // Load the tenant's saved currency once authenticated.
  const { data: accountSettings } = useQuery({
    queryKey: ['settings', 'account'],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/settings/account')
      return (response?.data ?? response) as { currency?: string }
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  })

  // Apply the loaded currency to state + the module-level formatter.
  useEffect(() => {
    const resolved = currencyByCode(accountSettings?.currency)
    setCurrencyState(resolved)
    setActiveCurrency(resolved)
  }, [accountSettings?.currency])

  const setCurrency = useCallback(
    async (code: string) => {
      const resolved = currencyByCode(code)
      setIsSaving(true)
      try {
        await apiClient.patch('/settings/account', { currency: resolved.code })
        setCurrencyState(resolved)
        setActiveCurrency(resolved)
        // Update the cached settings and refetch data-driven money everywhere so the
        // whole app (dashboard, lists, details) re-renders with the new symbol at once.
        queryClient.setQueryData(['settings', 'account'], (old: any) => ({
          ...(old ?? {}),
          currency: resolved.code,
        }))
        queryClient.invalidateQueries()
      } finally {
        setIsSaving(false)
      }
    },
    [queryClient],
  )

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      currencies: CURRENCIES,
      setCurrency,
      isSaving,
      format: (amount) => formatMoney(amount, currency),
    }),
    [currency, setCurrency, isSaving],
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider')
  return ctx
}

/** Convenience hook — returns a reactive `format(amount)` bound to the active currency. */
export function useMoney(): (amount: number | null | undefined) => string {
  return useCurrency().format
}

/**
 * Currency formatting utility.
 *
 * The active currency is a single source of truth updated at runtime by the
 * CurrencyProvider (see contexts/currency-context.tsx) from the tenant's saved
 * setting. Non-React callers (PDF/print utils, plain functions) use these helpers
 * and automatically reflect the current currency. React components should prefer the
 * `useMoney()` hook so they re-render instantly when the currency changes.
 *
 * This is a DISPLAY setting only — amounts are never converted (no FX).
 */
import { DEFAULT_CURRENCY, type CurrencyOption } from './currencies'

let ACTIVE: CurrencyOption = DEFAULT_CURRENCY

/** Set the process-wide active currency. Called by the CurrencyProvider. */
export function setActiveCurrency(currency: CurrencyOption): void {
  ACTIVE = currency
}

/** The currently active currency (symbol/code/position). */
export function getActiveCurrency(): CurrencyOption {
  return ACTIVE
}

/** Format the numeric part with thousands separators and 2 decimals. */
function formatAmount(amount: number | null | undefined): string {
  const n = amount === null || amount === undefined || isNaN(amount as number) ? 0 : Number(amount)
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Format a number as money using a given currency, or the active currency.
 * @returns e.g. "Rs. 100.00", "$ 100.00", "100.00 €"
 */
export function formatMoney(
  amount: number | null | undefined,
  currency: CurrencyOption = ACTIVE,
): string {
  const num = formatAmount(amount)
  return currency.position === 'after'
    ? `${num} ${currency.symbol}`
    : `${currency.symbol} ${num}`
}

/**
 * Formats a number as currency using the active currency.
 * (Kept for backward compatibility — every existing caller now becomes currency-aware.)
 * @returns Formatted string like "Rs. 100.00"
 */
export function formatCurrency(amount: number | null | undefined): string {
  return formatMoney(amount)
}

/**
 * Formats a balance status with currency — customer balances (Owes/Credit/Settled).
 */
export function formatBalanceStatus(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return `${formatCurrency(0)} (Settled)`
  }
  const numValue = Number(value)
  if (numValue > 0) return `${formatCurrency(numValue)} (Owes)`
  if (numValue < 0) return `${formatCurrency(Math.abs(numValue))} (Credit)`
  return `${formatCurrency(0)} (Settled)`
}

/**
 * Formats currency for display in balance contexts (Owes/Credit/Paid Up).
 */
export function formatCustomerBalance(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return `${formatCurrency(0)} (Paid Up)`
  }
  const numValue = Number(value)
  if (numValue > 0) return `${formatCurrency(numValue)} (Owes)`
  if (numValue < 0) return `${formatCurrency(Math.abs(numValue))} (Credit)`
  return `${formatCurrency(0)} (Paid Up)`
}

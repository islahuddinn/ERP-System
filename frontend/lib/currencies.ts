/**
 * Supported display currencies. This is a DISPLAY/symbol setting only — amounts are
 * never converted (no FX). Changing the currency swaps the symbol used everywhere.
 * `code` is what we persist (tenant Settings.currency); `symbol` is what we render.
 */
export interface CurrencyOption {
  code: string
  symbol: string
  name: string
  /** Where the symbol sits relative to the amount. */
  position: 'before' | 'after'
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'PKR', symbol: 'Rs.', name: 'Pakistani Rupee', position: 'before' },
  { code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' },
  { code: 'EUR', symbol: '€', name: 'Euro', position: 'before' },
  { code: 'GBP', symbol: '£', name: 'British Pound', position: 'before' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', position: 'before' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', position: 'before' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', position: 'before' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', position: 'before' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', position: 'before' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', position: 'before' },
]

/** The app default when no tenant setting is present. Matches the historic hardcoded "Rs.". */
export const DEFAULT_CURRENCY: CurrencyOption = CURRENCIES[0]

/** Resolve a currency by its code, falling back to the default (PKR/Rs.). */
export function currencyByCode(code: string | null | undefined): CurrencyOption {
  if (!code) return DEFAULT_CURRENCY
  return CURRENCIES.find((c) => c.code === code) ?? DEFAULT_CURRENCY
}

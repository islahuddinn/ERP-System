/**
 * Backend currency catalog — mirrors the frontend `lib/currencies.ts` catalog.
 *
 * This is a DISPLAY/symbol setting only — amounts are never converted (no FX).
 * The tenant's selected currency `code` is persisted in the tenant `Settings.currency`
 * column; this maps that code to the symbol we render in generated output
 * (PDF/thermal receipts, reports, emails).
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  PKR: "Rs.",
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  AED: "AED",
  SAR: "SAR",
  CNY: "¥",
  CAD: "C$",
  AUD: "A$",
};

/** The app default when no tenant setting is present. Matches the historic hardcoded "Rs.". */
export const DEFAULT_CURRENCY_SYMBOL = CURRENCY_SYMBOLS.PKR;

/**
 * Resolve a currency symbol from its code, falling back to the default (PKR/"Rs.").
 */
export function currencySymbol(code?: string | null): string {
  if (!code) return DEFAULT_CURRENCY_SYMBOL;
  return CURRENCY_SYMBOLS[code] ?? DEFAULT_CURRENCY_SYMBOL;
}

/**
 * Format a money amount with the tenant's currency symbol, e.g. "Rs. 1,234.56".
 * Amount is coerced to a Number (null/undefined → 0) and rendered with 2 fraction digits.
 */
export function formatMoney(amount: number | null | undefined, code?: string | null): string {
  const symbol = currencySymbol(code);
  const value = Number(amount ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${value}`;
}

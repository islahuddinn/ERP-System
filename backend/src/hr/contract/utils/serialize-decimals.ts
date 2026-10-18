import { Prisma } from "@prisma/tenant-client";

/**
 * Deep-converts Prisma.Decimal values to plain numbers, mirroring the global
 * ResponseInterceptor's decimal serialization.
 *
 * The audit interceptor computes its diff between the value passed to
 * `auditContext.setOldValue()` and the serialized HTTP response body. The
 * response has already had its Decimals turned into numbers by the
 * ResponseInterceptor, so an old-value snapshot that still holds raw
 * `Prisma.Decimal` objects (e.g. totalLeaves, consumedLeaves,
 * salaryRevisions[].baseSalary) would diff as "changed" even when nothing
 * changed. Running the old value through this helper first keeps both sides in
 * the same shape so only genuinely modified fields appear in the history.
 *
 * Dates are preserved as-is (the ResponseInterceptor keeps them as Date too).
 */
export function serializeDecimalsDeep<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value;
  if (value instanceof Prisma.Decimal) return value.toNumber() as unknown as T;

  if (Array.isArray(value)) {
    return value.map((item) => serializeDecimalsDeep(item)) as unknown as T;
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = serializeDecimalsDeep(val);
    }
    return out as unknown as T;
  }

  return value;
}

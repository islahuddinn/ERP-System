import { DEFAULT_SENSITIVE_FIELDS } from './constants';
import { DiffResult } from './interfaces';

/**
 * System-managed fields that are never meaningful to show in a diff.
 * These change automatically on every write and don't reflect user intent.
 */
const INTERNAL_FIELDS = new Set([
  'updatedById', 'updated_by_id',
  'createdById', 'created_by_id',
  'createdAt',   'created_at',
  'updatedAt',   'updated_at',
  'deletedAt',   'deleted_at',
]);

/**
 * Computes a field-level diff between oldValue and newValue.
 *
 * Rules applied:
 * 1. Internal system fields (updatedById, createdAt, etc.) are always skipped.
 * 2. A FK id field (e.g. uomId) is skipped when the corresponding relation
 *    object (e.g. uom) is already present in the snapshot — the object diff
 *    is more readable.
 * 3. Arrays of objects are compared by content, ignoring auto-generated `id`
 *    fields, so a delete-all + recreate pattern does not produce false diffs.
 * 4. Sensitive fields are masked as '[REDACTED]'.
 */
export function buildDiff(
  oldValue: Record<string, any> | null | undefined,
  newValue: Record<string, any> | null | undefined,
  sensitiveFields: readonly string[] = DEFAULT_SENSITIVE_FIELDS,
): DiffResult | null {
  if (!oldValue || !newValue) return null;

  const sensitiveSet = new Set(sensitiveFields.map((f) => f.toLowerCase()));
  const diff: DiffResult = {};

  const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);

  for (const key of allKeys) {
    if (INTERNAL_FIELDS.has(key)) continue;

    // Skip FK id field when its relation object is present in the snapshot.
    // e.g. skip 'uomId' when 'uom' exists — the nested object is more readable.
    if (isFkIdField(key) && relationKeyExists(key, oldValue, newValue)) continue;

    const from = oldValue[key];
    const to = newValue[key];

    if (isSensitive(key, sensitiveSet)) {
      if (!isEqual(from, to)) diff[key] = { from: '[REDACTED]', to: '[REDACTED]' };
      continue;
    }

    if (!isEqual(from, to)) {
      diff[key] = { from: from ?? null, to: to ?? null };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
}

/**
 * Strips sensitive fields from a snapshot before storing.
 */
export function sanitizeSnapshot(
  value: Record<string, any> | null | undefined,
  sensitiveFields: readonly string[] = DEFAULT_SENSITIVE_FIELDS,
): Record<string, any> | null {
  if (!value) return null;

  const sensitiveSet = new Set(sensitiveFields.map((f) => f.toLowerCase()));
  const sanitized: Record<string, any> = {};

  for (const [key, val] of Object.entries(value)) {
    sanitized[key] = isSensitive(key, sensitiveSet) ? '[REDACTED]' : val;
  }

  return sanitized;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isSensitive(key: string, sensitiveSet: Set<string>): boolean {
  return sensitiveSet.has(key.toLowerCase());
}

/**
 * Returns true for fields that look like FK id mirrors: end with 'Id'
 * and are longer than just 'id' itself.
 */
function isFkIdField(key: string): boolean {
  return key.length > 2 && key.endsWith('Id');
}

/**
 * Returns true when the relation object for a FK id field is present in
 * at least one of the snapshots (meaning we already have richer data).
 * e.g. 'uomId' → checks for 'uom' key.
 */
function relationKeyExists(
  fkKey: string,
  oldValue: Record<string, any>,
  newValue: Record<string, any>,
): boolean {
  const relationKey = fkKey.slice(0, -2); // strip trailing 'Id'
  return relationKey in oldValue || relationKey in newValue;
}

/**
 * Robust equality used to decide whether a field actually changed.
 *
 * Both sides are run through `normalizeValue` and compared by their JSON form.
 * This makes the comparison resilient to representation differences that are
 * NOT real changes, e.g.:
 *  - `null` vs `undefined` (missing key)            → treated as equal
 *  - a `Date` object vs an ISO string               → compared by instant
 *  - a `Prisma.Decimal` object vs another Decimal    → compared by value
 *  - arrays whose objects carry fresh auto-generated `id`s after a
 *    deleteMany + create (child records) → compared by content, id-agnostic
 */
function isEqual(a: any, b: any): boolean {
  return JSON.stringify(normalizeValue(a)) === JSON.stringify(normalizeValue(b));
}

/**
 * Normalizes a value into a stable, comparable form.
 * - null / undefined collapse to `null` so they compare equal.
 * - Dates become their ISO instant.
 * - Objects that know how to serialize themselves (e.g. Prisma.Decimal) use
 *   their `toJSON()`.
 * - Arrays and plain objects are recursed into, dropping auto-generated `id`
 *   fields and sorting for order-independent comparison.
 */
function normalizeValue(value: any): any {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'object') return value;

  // Prisma.Decimal and similar self-serializing objects.
  if (typeof (value as { toJSON?: unknown }).toJSON === 'function') {
    return (value as { toJSON: () => unknown }).toJSON();
  }

  if (Array.isArray(value)) {
    return value
      .map(normalizeValue)
      .sort((x, y) => (JSON.stringify(x) < JSON.stringify(y) ? -1 : 1));
  }

  const out: Record<string, any> = {};
  for (const key of Object.keys(value).sort()) {
    if (key === 'id') continue;
    out[key] = normalizeValue(value[key]);
  }
  return out;
}

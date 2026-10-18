/** Legacy sidebar / bookmark aliases → canonical backend enum values. */

const GRN_STATUS_ALIASES: Record<string, string> = {
  RECEIVED: 'COMPLETED',
}

const PRODUCTION_STATUS_ALIASES: Record<string, string> = {
  PENDING: 'DRAFT',
  PLANNED: 'DRAFT',
  COMPLETE: 'COMPLETED',
}

const BOM_STATUS_ALIASES: Record<string, string> = {
  ARCHIVED: 'INACTIVE',
  OBSOLETE: 'INACTIVE',
}

const PURCHASE_STATUS_ALIASES: Record<string, string> = {
  SENT: 'CONFIRMED',
  COMPLETED: 'RECEIVED',
  COMPLETE: 'RECEIVED',
}

function normalizeWithAliases(raw: string, aliases: Record<string, string>): string {
  const upper = raw.toUpperCase()
  return aliases[upper] ?? upper
}

export function normalizeGrnListStatus(raw: string | null): string | undefined {
  if (!raw || raw === 'all') return undefined
  return normalizeWithAliases(raw, GRN_STATUS_ALIASES)
}

export function normalizeProductionListStatus(raw: string | null): string | undefined {
  if (!raw || raw === 'all') return undefined
  return normalizeWithAliases(raw, PRODUCTION_STATUS_ALIASES)
}

export function normalizeBomListStatus(raw: string | null): string | undefined {
  if (!raw || raw === 'all') return undefined
  return normalizeWithAliases(raw, BOM_STATUS_ALIASES)
}

export function normalizePurchaseListStatus(raw: string | null): string | undefined {
  if (!raw || raw === 'all') return undefined
  return normalizeWithAliases(raw, PURCHASE_STATUS_ALIASES)
}

const WORK_ORDER_STATUS_ALIASES: Record<string, string> = {
  CANCELED: 'CANCELLED',
  COMPLETE: 'COMPLETED',
  PENDING: 'SCHEDULED',
}

export function normalizeWorkOrderListStatus(raw: string | null): string | undefined {
  if (!raw || raw === 'all') return undefined
  return normalizeWithAliases(raw, WORK_ORDER_STATUS_ALIASES)
}

export function normalizeProductBatchListStatus(raw: string | null): string | undefined {
  if (!raw || raw === 'all') return undefined
  return raw.toUpperCase()
}

/** Sidebar / URL isFinal tokens → API boolean string. */
export function normalizeProductBatchIsFinal(raw: string | null): string | undefined {
  if (!raw) return undefined
  if (raw === 'final' || raw === 'true') return 'true'
  if (raw === 'wip' || raw === 'false') return 'false'
  return undefined
}

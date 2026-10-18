'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { History, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useEntityHistory, type AuditAction, type AuditLog } from '@/hooks/useAuditLogs'

export const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700 border-green-200',
  UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
  APPROVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  REJECT: 'bg-orange-100 text-orange-700 border-orange-200',
  RESTORE: 'bg-teal-100 text-teal-700 border-teal-200',
  LOGIN: 'bg-gray-100 text-gray-700 border-gray-200',
  LOGOUT: 'bg-gray-100 text-gray-700 border-gray-200',
  EXPORT: 'bg-purple-100 text-purple-700 border-purple-200',
  IMPORT: 'bg-purple-100 text-purple-700 border-purple-200',
}

export function ActionBadge({ action }: { action: AuditAction | string }) {
  return <Badge className={`font-medium ${ACTION_STYLES[action] ?? 'bg-gray-100 text-gray-700'}`}>{action}</Badge>
}

/** Priority order of fields to use as a readable label for a relation object. */
const OBJECT_LABEL_FIELDS = ['name', 'symbol', 'code', 'title', 'label', 'displayName']

/**
 * Field keys that represent a calendar date with no meaningful time component.
 * Their values render date-only (#13) even though the API sends a full ISO
 * timestamp — e.g. dateOfJoining → "Jul 15, 2026", never "... 00:00".
 */
const DATE_ONLY_FIELDS = new Set([
  'dateOfJoining', 'dateOfBirth', 'joiningDate', 'date',
  'startDate', 'endDate', 'expiryDate', 'manufacturingDate', 'issueDate', 'dueDate',
])

/**
 * Sub-fields of an embedded user/account object worth showing, in display order.
 * The whole `user` object is stored in the diff even when a single field changed,
 * so we expand it and surface only the fields that actually differ (#9, #14).
 */
const ACCOUNT_SUBFIELDS = ['firstName', 'lastName', 'email', 'phone', 'role', 'loginAccess']

/** Humanize a raw module/action key like "raw-material" or "manage_capacity" (#8). */
const toTitleCase = (s: string): string =>
  s.replace(/[-_.]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T.*)?$/

const isIsoDateValue = (v: any): v is string => typeof v === 'string' && ISO_DATE_RE.test(v)

/** Format a date-only field value as "MMM dd, yyyy" (no time component). */
const fmtDateOnly = (v: any): string => {
  const d = new Date(v)
  return isNaN(d.getTime()) ? String(v) : format(d, 'MMM dd, yyyy')
}

/**
 * True for an embedded user/account object (has name/login fields). Such objects
 * are expanded field-by-field rather than collapsed to a single label.
 */
const isAccountObject = (v: any): boolean =>
  !!v && typeof v === 'object' && !Array.isArray(v) &&
  ('firstName' in v || 'lastName' in v || 'loginAccess' in v)

/**
 * Turns an audit value into a clean, human-readable string.
 * - Relation objects (e.g. UOM, site, shift) collapse to their display name
 *   instead of dumping raw JSON like `{"id":"..","name":"Kilogram","symbol":"KG"}`.
 * - Arrays map each element through the same extractor.
 */
const fmtVal = (v: any): string => {
  if (v === null || v === undefined || v === '') return '—'

  if (Array.isArray(v)) {
    const parts = v.map(fmtVal).filter(s => s && s !== '—')
    return parts.length ? parts.join(', ') : '—'
  }

  if (typeof v === 'object') {
    // A RolePermission junction row (role.rolePermissions entries) carries the
    // actual permission under a nested `permission` object — unwrap to that
    // instead of falling through to the raw roleId/permissionId scalars (#8).
    if (v.permission && typeof v.permission === 'object') {
      return fmtVal(v.permission)
    }

    // A Permission record itself: show "Module — Action" (e.g. "Products — View")
    // rather than its technical dotted name or raw id.
    if (typeof v.module === 'string' && typeof v.action === 'string') {
      return `${toTitleCase(v.module)} — ${toTitleCase(v.action)}`
    }

    const pick = (k: string): string | undefined =>
      v[k] !== null && v[k] !== undefined && typeof v[k] !== 'object' ? String(v[k]) : undefined

    // Prefer "Name (SYMBOL)" when both are present (e.g. UOM → "Kilogram (KG)").
    const name = pick('name')
    const symbol = pick('symbol')
    if (name !== undefined && symbol !== undefined && name !== symbol) {
      return `${name} (${symbol})`
    }

    for (const f of OBJECT_LABEL_FIELDS) {
      const val = pick(f)
      if (val !== undefined) return val
    }

    // Fallback: join the first couple of non-id, non-`_` scalar values.
    const scalars = Object.entries(v)
      .filter(([k, val]) => k !== 'id' && !k.startsWith('_') && val !== null && val !== undefined && typeof val !== 'object')
      .slice(0, 2)
      .map(([, val]) => String(val))
    return scalars.length ? scalars.join(', ') : '—'
  }

  return String(v)
}

/** Format a single field value, applying the date-only rule for known date fields. */
const fmtField = (key: string, v: any): string =>
  DATE_ONLY_FIELDS.has(key) && isIsoDateValue(v) ? fmtDateOnly(v) : fmtVal(v)

/**
 * Normalizes a value for change-detection: null/undefined/'' all collapse to null
 * and auto-generated `id` fields are dropped, so unchanged fields never look
 * changed (#9). Mirrors the backend diff's normalization.
 */
const normForCompare = (v: any): any => {
  if (v === null || v === undefined || v === '') return null
  if (Array.isArray(v)) return v.map(normForCompare)
  if (typeof v === 'object') {
    const out: Record<string, any> = {}
    for (const k of Object.keys(v).sort()) {
      if (k === 'id') continue
      out[k] = normForCompare(v[k])
    }
    return out
  }
  return v
}

const sameValue = (a: any, b: any): boolean =>
  JSON.stringify(normForCompare(a)) === JSON.stringify(normForCompare(b))

/** One "label: old → new" line. */
function ChangeRow({ rowKey, label, oldStr, newStr }: { rowKey: string; label: string; oldStr: string; newStr: string }) {
  return (
    <div key={rowKey}>
      <span className="text-gray-400">{label}:</span>{' '}
      <span className="text-red-600 line-through">{oldStr}</span>{' '}
      <span className="text-gray-400">→</span>{' '}
      <span className="text-green-700">{newStr}</span>
    </div>
  )
}

/**
 * Renders the change for a single top-level key as one or more rows. An embedded
 * user/account object is expanded so only the sub-fields that actually changed
 * appear (e.g. role or loginAccess), instead of collapsing to just the name.
 */
function renderChangeRows(key: string, oldVal: any, newVal: any): JSX.Element[] {
  if (isAccountObject(oldVal) && isAccountObject(newVal)) {
    const rows = ACCOUNT_SUBFIELDS
      .filter(sub => !sameValue(oldVal[sub], newVal[sub]))
      .map(sub => (
        <ChangeRow
          key={`${key}.${sub}`}
          rowKey={`${key}.${sub}`}
          label={sub}
          oldStr={fmtField(sub, oldVal[sub])}
          newStr={fmtField(sub, newVal[sub])}
        />
      ))
    if (rows.length > 0) return rows
  }
  return [
    <ChangeRow key={key} rowKey={key} label={key} oldStr={fmtField(key, oldVal)} newStr={fmtField(key, newVal)} />,
  ]
}

/** Renders the created values for a single key as one or more read-only lines. */
function renderCreateRows(key: string, val: any): JSX.Element[] {
  if (isAccountObject(val)) {
    return ACCOUNT_SUBFIELDS
      .filter(sub => val[sub] !== null && val[sub] !== undefined && val[sub] !== '')
      .map(sub => (
        <div key={`${key}.${sub}`}><span className="text-gray-400">{sub}:</span> {fmtField(sub, val[sub])}</div>
      ))
  }
  return [<div key={key}><span className="text-gray-400">{key}:</span> {fmtField(key, val)}</div>]
}

/** Renders the changed fields of a log entry as old → new. */
export function AuditDiff({ log }: { log: AuditLog }) {
  const oldV = log.oldValue ?? {}
  const newV = log.newValue ?? {}
  const allKeys = new Set([...Object.keys(oldV), ...Object.keys(newV)])
  // Drop a raw "<x>Id" scalar when its resolved relation object "<x>" is also in
  // the diff (e.g. "parentDepartmentId" alongside "parent": {id, name}) — showing
  // both duplicates the same change as one friendly row and one raw-UUID row (#8).
  const keys = Array.from(allKeys).filter((k) => {
    if (k === 'updatedAt' || k === 'createdAt') return false
    if (k.endsWith('Id') && k.length > 2) {
      const baseKey = k.slice(0, -2)
      if (allKeys.has(baseKey)) return false
    }
    return true
  })

  if (log.action === 'CREATE' && log.newValue) {
    return (
      <div className="text-xs text-gray-600 space-y-0.5">
        {keys.flatMap(k => renderCreateRows(k, newV[k]))}
      </div>
    )
  }
  if (keys.length === 0) return <span className="text-xs text-gray-400">—</span>
  return (
    <div className="text-xs space-y-0.5">
      {keys.flatMap(k => renderChangeRows(k, oldV[k], newV[k]))}
    </div>
  )
}

interface Props {
  entityName: string
  entityId: string
  /** Optional override for the trigger button label. */
  label?: string
  variant?: 'outline' | 'ghost' | 'default'
  size?: 'default' | 'sm'
}

/** Drop-in "View History" button + dialog for any record detail screen. */
export function ViewHistoryButton({ entityName, entityId, label = 'View History', variant = 'outline', size = 'sm' }: Props) {
  const [open, setOpen] = useState(false)
  const { data: history = [], isLoading, refetch } = useEntityHistory(open ? entityName : undefined, open ? entityId : undefined)

  // Refetch history every time the dialog opens so a just-performed edit shows
  // up without a manual page refresh (#13).
  useEffect(() => {
    if (open) refetch()
  }, [open, refetch])

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <History className="h-4 w-4 mr-2" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>History — {entityName}</DialogTitle></DialogHeader>
          {isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : history.length === 0 ? (
            <p className="text-center text-gray-500 py-10">No history available for this record.</p>
          ) : (
            <ol className="relative border-l border-gray-200 ml-3 space-y-6 py-2">
              {history.map(log => (
                <li key={log.id} className="ml-4">
                  <div className="absolute w-2 h-2 bg-green-500 rounded-full -left-[5px] mt-1.5" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <ActionBadge action={log.action} />
                    <span className="text-sm font-medium text-gray-900">{log.actor?.name ?? 'System'}</span>
                    <span className="text-xs text-gray-500">{format(new Date(log.createdAt), 'dd MMM yyyy, hh:mm a')}</span>
                  </div>
                  <div className="mt-1.5"><AuditDiff log={log} /></div>
                </li>
              ))}
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

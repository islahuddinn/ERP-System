'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface SortColumn {
  /** Backend field name passed as `sortBy` (e.g. "name", "createdAt"). */
  value: string
  /** Human label shown in the dropdown. */
  label: string
}

export type SortOrder = 'ASC' | 'DESC'

interface TableSortProps {
  columns: SortColumn[]
  sortBy?: string
  sortOrder?: SortOrder
  /** Called with the new (sortBy, sortOrder). sortBy is undefined when cleared. */
  onChange: (sortBy: string | undefined, sortOrder: SortOrder) => void
  className?: string
}

const NONE = '__none__'

/**
 * Shared sorting control: two dropdowns — column selector + direction
 * (Ascending / Descending). Emits the backend contract `sortBy=<field>` and
 * `sortOrder=ASC|DESC`. The direction dropdown is disabled until a column is
 * chosen.
 */
export function TableSort({ columns, sortBy, sortOrder = 'ASC', onChange, className }: TableSortProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select
        value={sortBy ?? NONE}
        onValueChange={(v) => onChange(v === NONE ? undefined : v, sortOrder)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Sort by…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Sort by…</SelectItem>
          {columns.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={sortOrder}
        onValueChange={(v) => onChange(sortBy, v as SortOrder)}
        disabled={!sortBy}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ASC">Ascending</SelectItem>
          <SelectItem value="DESC">Descending</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

'use client'

import * as React from 'react'
import {
  Search,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  ChevronDown,
  Loader2,
  X,
  Calendar as CalendarIcon,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Pagination, type PaginationMeta } from '@/components/ui/pagination'
import { cn } from '@/lib/utils'
import type { DataTableController } from '@/hooks/useDataTable'

export interface DataTableColumn<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  /** Backend sort field if different from `key`. */
  sortKey?: string
  align?: 'left' | 'right' | 'center'
  className?: string
  headClassName?: string
}

interface SelectFilter<T> {
  type?: 'select'
  /** Query-param name (e.g. "status"). */
  key: string
  label: string
  /** Static options. Omit and use `derive` to compute options from the data. */
  options?: { value: string; label: string }[]
  /**
   * Dynamic option source (request 3d): return the value for a row and the
   * table derives the DISTINCT set present in `data` — e.g. a Category filter
   * that only lists the categories actually in the current rows. Optionally
   * return `{ value, label }` to show a friendlier label.
   */
  derive?: (row: T) => string | { value: string; label: string } | null | undefined
  /** Render a searchable dropdown (for long option lists). */
  searchable?: boolean
  className?: string
}

interface DateRangeFilter {
  type: 'daterange'
  label: string
  /** Query-param names for the start / end dates. */
  fromKey: string
  toKey: string
}

export type DataTableFilter<T = any> = SelectFilter<T> | DateRangeFilter

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[] | undefined
  meta?: PaginationMeta | null
  controller: DataTableController
  rowKey?: (row: T) => string
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  emptyMessage?: string
  searchable?: boolean
  searchPlaceholder?: string
  filters?: DataTableFilter<T>[]
  /** Show a page-size selector. Pass options or `true` for the default set. */
  pageSizeOptions?: number[] | boolean
  actions?: (row: T) => React.ReactNode
  actionsHeader?: string
  onRowClick?: (row: T) => void
  /** Extra controls on the toolbar's right (e.g. a "New" button). */
  toolbarRight?: React.ReactNode
  className?: string
}

const DEFAULT_PAGE_SIZES = [10, 20, 50, 100]
const ALL = '__all__'

const alignClass = (a?: 'left' | 'right' | 'center') =>
  a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left'

/** Distinct {value,label} options derived from the data for a `derive` filter (3d). */
function deriveOptions<T>(rows: T[], derive: NonNullable<SelectFilter<T>['derive']>) {
  const map = new Map<string, string>()
  for (const row of rows) {
    const r = derive(row)
    if (r == null || r === '') continue
    if (typeof r === 'object') map.set(r.value, r.label)
    else map.set(String(r), String(r))
  }
  return Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label),
  )
}

/** Searchable single-select dropdown (Popover + search input + filtered list). */
function SearchableSelect({
  label,
  className,
  value,
  options,
  onChange,
}: {
  label: string
  className?: string
  value?: string
  options: { value: string; label: string }[]
  onChange: (v: string | undefined) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const selected = options.find((o) => o.value === value)
  const shown = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('h-10 justify-between gap-2 font-normal text-gray-700', className ?? 'w-52')}
        >
          <span className="truncate">{selected ? selected.label : label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 bg-white text-gray-900 border-gray-200" align="start">
        <div className="border-b border-gray-100 p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="h-9 pl-8"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          <button
            type="button"
            className="flex w-full items-center rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => { onChange(undefined); setOpen(false); setQuery('') }}
          >
            {label}: All
          </button>
          {shown.map((o) => (
            <button
              key={o.value}
              type="button"
              className={cn(
                'flex w-full items-center rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100',
                o.value === value && 'bg-green-50 text-green-700',
              )}
              onClick={() => { onChange(o.value); setOpen(false); setQuery('') }}
            >
              {o.label}
            </button>
          ))}
          {shown.length === 0 && <p className="px-2 py-3 text-center text-sm text-gray-400">No matches</p>}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** A single filter control — plain / searchable select, or a date range. */
function FilterControl<T>({
  filter,
  controller,
  rows,
}: {
  filter: DataTableFilter<T>
  controller: DataTableController
  rows: T[]
}) {
  const { filters: active, setFilter } = controller

  if (filter.type === 'daterange') {
    const from = active[filter.fromKey] ?? ''
    const to = active[filter.toKey] ?? ''
    const labelText = from || to ? `${from || '…'} → ${to || '…'}` : filter.label
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10 justify-start gap-2 font-normal text-gray-700">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
            <span className="truncate max-w-[200px]">{labelText}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-3 bg-white text-gray-900 border-gray-200" align="start">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">From</label>
            <Input type="date" value={from} onChange={(e) => setFilter(filter.fromKey, e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">To</label>
            <Input type="date" value={to} onChange={(e) => setFilter(filter.toKey, e.target.value)} />
          </div>
          {(from || to) && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-gray-600"
              onClick={() => { setFilter(filter.fromKey, undefined); setFilter(filter.toKey, undefined) }}
            >
              Clear dates
            </Button>
          )}
        </PopoverContent>
      </Popover>
    )
  }

  // Select filter — options are either static or derived from the data (3d).
  const options = filter.options ?? (filter.derive ? deriveOptions(rows, filter.derive) : [])
  const value = active[filter.key]

  if (filter.searchable) {
    return (
      <SearchableSelect
        label={filter.label}
        className={filter.className}
        value={value}
        options={options}
        onChange={(v) => setFilter(filter.key, v)}
      />
    )
  }

  return (
    <Select value={value ?? ALL} onValueChange={(v) => setFilter(filter.key, v === ALL ? undefined : v)}>
      <SelectTrigger className={filter.className ?? 'w-44'}>
        <SelectValue placeholder={filter.label} />
      </SelectTrigger>
      <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
        <SelectItem value={ALL}>{filter.label}: All</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Generic, server-driven data table: debounced search, click-to-sort headers,
 * config-driven filters (plain / searchable select, date range, or options
 * dynamically derived from the data), a page-size selector, and shared
 * pagination — all on the existing Radix/Tailwind theme. Pair with `useDataTable`
 * (spread its `queryParams` into your list hook).
 */
export function DataTable<T>({
  columns,
  data,
  meta,
  controller,
  rowKey = (row: T) => String((row as Record<string, unknown>).id ?? ''),
  isLoading,
  isError,
  errorMessage = 'Failed to load data.',
  emptyMessage = 'No records found.',
  searchable = true,
  searchPlaceholder = 'Search…',
  filters = [],
  pageSizeOptions,
  actions,
  actionsHeader = 'Actions',
  onRowClick,
  toolbarRight,
  className,
}: DataTableProps<T>) {
  const { searchInput, setSearchInput, sortBy, sortOrder, toggleSort, isFiltered, resetFilters, limit, setLimit } =
    controller
  const colCount = columns.length + (actions ? 1 : 0)
  const rows = data ?? []
  // Page-size selector shows by default (request #11: "pages dropdown missing");
  // pass pageSizeOptions={false} to opt out, or a custom array to override.
  const pageSizes =
    pageSizeOptions === false ? null : Array.isArray(pageSizeOptions) ? pageSizeOptions : DEFAULT_PAGE_SIZES

  const sortIcon = (col: DataTableColumn<T>) => {
    const field = col.sortKey ?? col.key
    if (sortBy !== field) return <ChevronsUpDown className="ml-1 h-3.5 w-3.5 text-gray-400" />
    return sortOrder === 'ASC' ? (
      <ArrowUp className="ml-1 h-3.5 w-3.5 text-gray-700" />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5 text-gray-700" />
    )
  }

  const clearAll = () => {
    setSearchInput('')
    resetFilters()
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Toolbar: search + filters (left, wrap) · page size + extras (right, inline) */}
      {(searchable || filters.length > 0 || pageSizes || toolbarRight) && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-start justify-between gap-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0 w-full sm:w-auto">
          {searchable && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9 pr-9"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {filters.map((f, i) => (
            <FilterControl key={('key' in f ? f.key : f.fromKey) + i} filter={f} controller={controller} rows={rows} />
          ))}

          {isFiltered && (
            <Button variant="ghost" size="sm" className="text-gray-600" onClick={clearAll}>
              <X className="mr-1 h-3.5 w-3.5" /> Clear
            </Button>
          )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto sm:justify-end">
            {pageSizes && (
              <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                  {pageSizes.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {toolbarRight}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border border-gray-200 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              {columns.map((col) => (
                <TableHead key={col.key} className={cn(alignClass(col.align), col.headClassName, col.className)}>
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.sortKey ?? col.key)}
                      className={cn(
                        'inline-flex items-center font-medium text-gray-500 hover:text-gray-900',
                        col.align === 'right' && 'flex-row-reverse',
                      )}
                    >
                      {col.header}
                      {sortIcon(col)}
                    </button>
                  ) : (
                    <span className="font-medium text-gray-500">{col.header}</span>
                  )}
                </TableHead>
              ))}
              {actions && <TableHead className="text-right text-gray-500">{actionsHeader}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="py-10 text-center text-gray-500">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                </TableCell>
              </TableRow>
            ) : isError && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="py-10 text-center text-red-500">
                  {errorMessage}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="py-10 text-center text-gray-500">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  className={cn('border-gray-200 hover:bg-gray-50', onRowClick && 'cursor-pointer')}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn('text-gray-700', alignClass(col.align), col.className)}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {actions(row)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <Pagination meta={meta} onPageChange={controller.setPage} />
    </div>
  )
}

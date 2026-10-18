'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext?: boolean
  hasPrev?: boolean
}

interface PaginationProps {
  meta?: PaginationMeta | null
  onPageChange: (page: number) => void
  className?: string
}

/**
 * Build the page-button sequence: always the first & last page, a window around
 * the current page, and 'ellipsis' markers for gaps (e.g. 1 … 4 5 6 … 20).
 */
function buildPageItems(page: number, totalPages: number): (number | 'ellipsis')[] {
  const window = 1 // pages shown on each side of the current page
  const pages = new Set<number>([1, totalPages])
  for (let p = page - window; p <= page + window; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p)
  }
  const sorted = [...pages].sort((a, b) => a - b)
  const items: (number | 'ellipsis')[] = []
  let prev = 0
  for (const p of sorted) {
    if (p - prev > 1) items.push('ellipsis')
    items.push(p)
    prev = p
  }
  return items
}

/**
 * Shared list pagination control: range summary + Previous / numbered pages / Next.
 * Renders nothing when there are no records. Works with the backend meta shape
 * `{ total, page, limit, totalPages, hasNext, hasPrev }`; falls back to deriving
 * hasNext/hasPrev from page/totalPages when those flags are absent.
 */
export function Pagination({ meta, onPageChange, className }: PaginationProps) {
  if (!meta) return null
  const total = meta.total ?? 0
  if (total === 0) return null

  const page = meta.page ?? 1
  const limit = meta.limit ?? 10
  const totalPages = meta.totalPages ?? 1
  const hasPrev = meta.hasPrev ?? page > 1
  const hasNext = meta.hasNext ?? page < totalPages

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  const pageItems = buildPageItems(page, totalPages)

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 px-1 py-2', className)}>
      <p className="text-sm text-muted-foreground">
        Showing {from}&ndash;{to} of {total} · Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => hasPrev && onPageChange(page - 1)}
          disabled={!hasPrev}
        >
          Previous
        </Button>

        {pageItems.map((item, i) =>
          item === 'ellipsis' ? (
            <span key={`e${i}`} className="px-2 text-sm text-gray-400 select-none">
              &hellip;
            </span>
          ) : (
            <Button
              key={item}
              variant={item === page ? 'default' : 'outline'}
              size="sm"
              aria-current={item === page ? 'page' : undefined}
              onClick={() => item !== page && onPageChange(item)}
              className={cn(
                'h-9 min-w-9 px-2',
                item === page && 'bg-green-600 hover:bg-green-700 text-white border-green-600',
              )}
            >
              {item}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => hasNext && onPageChange(page + 1)}
          disabled={!hasNext}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

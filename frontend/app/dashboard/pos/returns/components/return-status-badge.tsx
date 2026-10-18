'use client'

import { Badge } from '@/components/ui/badge'
import { SaleReturnStatus, RefundStatus } from '@/hooks/pos/useReturns'
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<SaleReturnStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  PROCESSED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-slate-100 text-slate-700',
}

const REFUND_STATUS_STYLES: Record<RefundStatus, string> = {
  PENDING: 'bg-orange-100 text-orange-800',
  PROCESSED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
}

interface ReturnStatusBadgeProps {
  status: SaleReturnStatus
}

interface RefundStatusBadgeProps {
  status: RefundStatus
}

export function ReturnStatusBadge({ status }: ReturnStatusBadgeProps) {
  return (
    <Badge className={cn('font-medium', STATUS_STYLES[status])} variant="outline">
      {status}
    </Badge>
  )
}

export function RefundStatusBadge({ status }: RefundStatusBadgeProps) {
  return (
    <Badge className={cn('font-medium', REFUND_STATUS_STYLES[status])} variant="outline">
      {status}
    </Badge>
  )
}


import { Badge } from '@/components/ui/badge'
import type { PayrollStatus } from '@/hooks/usePayroll'

const STATUS_STYLES: Record<PayrollStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
}

export function PayrollStatusBadge({ status }: { status: PayrollStatus }) {
  return (
    <Badge variant="outline" className={`border-transparent ${STATUS_STYLES[status]}`}>
      {status}
    </Badge>
  )
}

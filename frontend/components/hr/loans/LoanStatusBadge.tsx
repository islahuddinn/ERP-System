import { Badge } from '@/components/ui/badge'
import type {
  LoanRequestStatus,
  LoanApprovalStatus,
  LoanInstallmentStatus,
  LoanRepaymentStatus,
} from '@/hooks/useLoanRequests'

const REQUEST_STYLES: Record<LoanRequestStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  COMPLETED: 'bg-green-100 text-green-800',
}

const APPROVAL_STYLES: Record<LoanApprovalStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
}

const INSTALLMENT_STYLES: Record<LoanInstallmentStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PAID: 'bg-green-100 text-green-800',
}

const REPAYMENT_STYLES: Record<LoanRepaymentStatus, string> = {
  UNPAID: 'bg-gray-100 text-gray-800',
  PARTIALLY_PAID: 'bg-blue-100 text-blue-800',
  FULLY_PAID: 'bg-green-100 text-green-800',
}

function StyledBadge({ label, className }: { label: string; className: string }) {
  return (
    <Badge variant="outline" className={`border-transparent ${className}`}>
      {label}
    </Badge>
  )
}

export function LoanStatusBadge({ status }: { status: LoanRequestStatus }) {
  return <StyledBadge label={status} className={REQUEST_STYLES[status]} />
}

export function LoanApprovalBadge({ status }: { status: LoanApprovalStatus }) {
  return <StyledBadge label={status} className={APPROVAL_STYLES[status]} />
}

export function LoanInstallmentBadge({ status }: { status: LoanInstallmentStatus }) {
  return <StyledBadge label={status} className={INSTALLMENT_STYLES[status]} />
}

export function LoanRepaymentBadge({ status }: { status: LoanRepaymentStatus }) {
  return <StyledBadge label={status.replace('_', ' ')} className={REPAYMENT_STYLES[status]} />
}

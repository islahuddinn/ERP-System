import { Badge } from '@/components/ui/badge'
import type { JobRequisitionStatus } from '@/hooks/useJobRequisitions'
import type { ApplicationStage } from '@/hooks/useApplications'
import type { OfferStatus } from '@/hooks/useOffers'

const REQUISITION_STYLES: Record<JobRequisitionStatus, string> = {
  OPEN: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
  HOLD: 'bg-amber-100 text-amber-800',
}

const STAGE_STYLES: Record<ApplicationStage, string> = {
  APPLIED: 'bg-slate-100 text-slate-800',
  SCREENING: 'bg-indigo-100 text-indigo-800',
  INTERVIEW: 'bg-blue-100 text-blue-800',
  OFFERED: 'bg-purple-100 text-purple-800',
  REJECTED: 'bg-red-100 text-red-800',
  HIRED: 'bg-green-100 text-green-800',
}

const OFFER_STYLES: Record<OfferStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  DECLINED: 'bg-red-100 text-red-800',
}

function StyledBadge({ label, className }: { label: string; className: string }) {
  return (
    <Badge variant="outline" className={`border-transparent ${className}`}>
      {label}
    </Badge>
  )
}

export function RequisitionStatusBadge({ status }: { status: JobRequisitionStatus }) {
  return <StyledBadge label={status} className={REQUISITION_STYLES[status] ?? 'bg-gray-100 text-gray-800'} />
}

export function ApplicationStageBadge({ stage }: { stage: ApplicationStage }) {
  return <StyledBadge label={stage} className={STAGE_STYLES[stage] ?? 'bg-gray-100 text-gray-800'} />
}

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  return <StyledBadge label={status} className={OFFER_STYLES[status] ?? 'bg-gray-100 text-gray-800'} />
}

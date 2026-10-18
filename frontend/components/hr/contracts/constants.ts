import type {
  AllowanceType,
  Contract,
  ContractStatus,
  ContractType,
  SalaryFrequency,
  SalaryRevision,
} from '@/hooks/useContracts'

export const CONTRACT_TYPE_OPTIONS: { value: ContractType; label: string }[] = [
  { value: 'PERMANENT', label: 'Permanent' },
  { value: 'FIXED_TERM', label: 'Fixed Term' },
  { value: 'PROBATION', label: 'Probation' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACTOR', label: 'Contractor' },
]

export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = CONTRACT_TYPE_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<ContractType, string>,
)

export const CONTRACT_STATUS_VARIANT: Record<
  ContractStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  DRAFT: 'secondary',
  ACTIVE: 'default',
  EXPIRED: 'outline',
  TERMINATED: 'destructive',
  SUPERSEDED: 'outline',
}

export const ALLOWANCE_TYPE_OPTIONS: { value: AllowanceType; label: string }[] = [
  { value: 'HOUSE_RENT', label: 'House Rent' },
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'FUEL', label: 'Fuel' },
  { value: 'GYM', label: 'Gym' },
  { value: 'MOBILE', label: 'Mobile' },
  { value: 'OTHER', label: 'Other' },
]

export const ALLOWANCE_TYPE_LABEL: Record<AllowanceType, string> = ALLOWANCE_TYPE_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<AllowanceType, string>,
)

export const SALARY_FREQUENCY_OPTIONS: { value: SalaryFrequency; label: string }[] = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-weekly' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'HOURLY', label: 'Hourly' },
]

/** The active salary for a contract — the CURRENT revision, else the latest one. */
export function currentSalary(contract: Contract): SalaryRevision | null {
  const revisions = contract.salaryRevisions ?? []
  return revisions.find((r) => r.status === 'CURRENT') ?? revisions[0] ?? null
}

/** Full name of the employee on a contract, falling back to the employee code. */
export function contractEmployeeName(contract: Contract): string {
  const user = contract.employee?.user
  if (user) return `${user.firstName} ${user.lastName}`.trim()
  return contract.employee?.employeeCode ?? '—'
}

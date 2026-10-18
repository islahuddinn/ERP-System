export const PAYROLL_PERMISSIONS = {
  'payroll.view': {
    module: 'payroll',
    action: 'view',
    description: 'View payroll records for any employee',
  },
  'payroll.view-own': {
    module: 'payroll',
    action: 'view-own',
    description: 'View only your own payroll records',
  },
  'payroll.create': {
    module: 'payroll',
    action: 'create',
    description: 'Create and preview payroll records',
  },
  'payroll.approve': {
    module: 'payroll',
    action: 'approve',
    description: 'Approve payroll records and mark as paid',
  },
} as const;

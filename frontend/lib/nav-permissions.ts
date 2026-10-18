/**
 * Navigation permission mapping for the ERP sidebar.
 *
 * Maps normalized route paths (query strings stripped) to backend permission strings.
 * Unmapped paths are denied by default — secure by default.
 */

export type NavPermissionContext = {
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  isLoading: boolean
}

/** Strip query strings and hash fragments so `/path?foo=bar` resolves to `/path`. */
export function normalizeNavHref(href: string): string {
  return href.split('?')[0].split('#')[0]
}

/**
 * Maps each sidebar href (normalized) to the backend permission(s) required to view it.
 * Use a string array when any one of several permissions should grant access.
 */
export const NAV_ITEM_PERMISSION: Record<string, string | string[]> = {
  // ── Overview ──────────────────────────────────────────────────────────────
  '/dashboard': 'dashboard.view',
  '/dashboard/factory': 'reports.view',

  // ── Factory / Warehouse ───────────────────────────────────────────────────
  '/dashboard/factory/warehouses': 'warehouses.view',
  '/dashboard/factory/zones': 'zones.view',

  // ── Warehouse Stock ───────────────────────────────────────────────────────
  '/dashboard/warehouse-stock': 'warehouses.view',
  '/dashboard/warehouse-stock/warehouses': 'warehouses.view',
  '/dashboard/warehouse-stock/zones': 'warehouses.view',
  '/dashboard/warehouse-stock/transactions': 'stock.read',
  '/dashboard/warehouse-stock/alerts': 'warehouses.view',
  '/dashboard/stock/reorder': 'stock.read',
  '/dashboard/reorder': 'stock.read',

  // ── Raw Material Batches ──────────────────────────────────────────────────
  '/dashboard/raw-materials/batches': 'stock.read',

  // ── Material Requests ─────────────────────────────────────────────────────
  '/dashboard/factory/material-requests': 'raw-materials.read',
  '/dashboard/factory/material-requests/create': 'raw-materials.read',

  // ── Material Transfers ────────────────────────────────────────────────────
  '/dashboard/factory/material-transfers': 'stock.transfer',
  '/dashboard/factory/material-transfers/create': 'stock.transfer',

  // ── GRN / Receiving ───────────────────────────────────────────────────────
  '/dashboard/factory/receiving': 'grn.read',
  '/dashboard/factory/receiving/create': 'grn.create',

  // ── Production Orders ─────────────────────────────────────────────────────
  '/dashboard/production-orders': 'production-orders.read',
  '/dashboard/production-orders/create': 'production-orders.create',

  // ── Plants & Equipment ────────────────────────────────────────────────────
  '/dashboard/plants': 'plants.read',
  '/dashboard/factory/plants/create': 'plants.create',
  '/dashboard/plants/lines': 'production_lines.read',
  '/dashboard/plants/machines': 'machines.read',

  // ── Work Orders ───────────────────────────────────────────────────────────
  '/dashboard/work-orders': 'production.read',
  '/dashboard/work-orders/create': 'production.create',

  // ── BOM ───────────────────────────────────────────────────────────────────
  '/dashboard/bom': 'bom.read',
  '/dashboard/bom/create': 'bom.create',

  // ── Product Batches ───────────────────────────────────────────────────────
  '/dashboard/product-batches': 'stock.read',

  // ── Quality Control ───────────────────────────────────────────────────────
  '/dashboard/quality-control/inspections': 'production.read',
  '/dashboard/quality-control/inspections/create': 'production.create',

  // ── Waste Management ──────────────────────────────────────────────────────
  '/dashboard/waste-management': 'waste-management.read',
  '/dashboard/waste-management/create': 'waste-management.create',

  // ── Costing & Factory Reports ─────────────────────────────────────────────
  '/dashboard/factory/costing': 'reports.view',
  '/dashboard/factory/profit': 'reports.view',
  '/dashboard/factory/costing/reports': 'reports.view',
  '/dashboard/factory/reports': 'reports.view',
  '/dashboard/factory/reports/production': 'reports.view',
  '/dashboard/factory/reports/material': 'reports.view',
  '/dashboard/factory/reports/quality': 'reports.view',
  '/dashboard/factory/reports/waste': 'reports.view',
  '/dashboard/factory/reports/warehouse': 'reports.view',

  // ── Products ──────────────────────────────────────────────────────────────
  '/dashboard/products': 'products.read',
  '/dashboard/products/add': 'products.create',
  '/dashboard/products/uoms': 'uoms.read',

  // ── Raw Materials ─────────────────────────────────────────────────────────
  '/dashboard/raw-materials': 'raw-materials.read',
  '/dashboard/raw-materials/add': 'raw-materials.create',

  // ── Locations & Sites ─────────────────────────────────────────────────────
  '/dashboard/locations': 'locations.read',
  '/dashboard/sites': 'sites.read',
  '/dashboard/sites/create': 'sites.create',

  // ── Suppliers ─────────────────────────────────────────────────────────────
  '/dashboard/suppliers': 'suppliers.read',
  '/dashboard/suppliers/create': 'suppliers.create',
  '/dashboard/suppliers/ledger': 'suppliers.read',

  // ── Purchase Orders ─────────────────────────────────────────────────────────
  '/dashboard/purchases': 'purchases.read',
  '/dashboard/purchases/create': 'purchases.create',
  '/dashboard/purchases/returns/list': 'purchases.read',
  '/dashboard/purchases/draft': 'purchases.read',
  '/dashboard/purchases/sent': 'purchases.read',
  '/dashboard/purchases/partial': 'purchases.read',
  '/dashboard/purchases/completed': 'purchases.read',
  '/dashboard/purchases/cancelled': 'purchases.read',

  // ── Sales Orders (legacy) ─────────────────────────────────────────────────
  '/dashboard/sales': 'sales.read',
  '/dashboard/sales/create': 'sales.create',
  '/dashboard/sales/dispatches': 'sale-dispatches.read',
  '/dashboard/sales/returns': 'pos.view_returns',

  // ── Shop Orders ───────────────────────────────────────────────────────────
  '/dashboard/sales/customer-orders': 'customer-order.view',
  '/dashboard/sales/customer-orders/create': 'customer-order.create',

  // ── Shop Deliveries ───────────────────────────────────────────────────────
  '/dashboard/sales/customer-deliveries': 'customer-delivery.view',

  // ── Shop Returns ──────────────────────────────────────────────────────────
  '/dashboard/sales/customer-returns': 'customer-return.view',
  '/dashboard/sales/customer-returns/create': 'customer-return.create',

  // ── Shop Recovery ─────────────────────────────────────────────────────────
  '/dashboard/sales/customer-recovery': 'customer-recovery.view',
  '/dashboard/sales/customer-recovery/create': 'customer-recovery.create',

  // ── Shop Credit/Debit Notes ───────────────────────────────────────────────
  '/dashboard/sales/customer-adjustments': 'customer-ledger-adjustment.view',
  '/dashboard/sales/customer-adjustments/create': 'customer-ledger-adjustment.create',

  // ── Shop Product Adjustments ──────────────────────────────────────────────
  '/dashboard/sales/product-adjustments': 'product-adjustment.view',
  '/dashboard/sales/product-adjustments/create': 'product-adjustment.create',

  // ── Shop Ledger ───────────────────────────────────────────────────────────
  '/dashboard/sales/customer-ledger': 'customer-ledger.view',

  // ── Branch Stock & Ledger ─────────────────────────────────────────────────
  '/dashboard/sales/branch-stock': 'branch-stock.view',
  '/dashboard/sales/branch-ledger': 'branch-ledger.view',

  // ── Branch Stock Requests ─────────────────────────────────────────────────
  '/dashboard/sales/branch-stock-requests': 'branch-stock-request.view',
  '/dashboard/sales/branch-stock-requests/create': 'branch-stock-request.create',

  // ── Branch Stock Transfers ────────────────────────────────────────────────
  '/dashboard/sales/branch-stock-transfers': 'branch-stock-transfer.view',

  // ── Branch Stock Returns ──────────────────────────────────────────────────
  '/dashboard/sales/branch-stock-returns': 'branch-stock-return.view',
  '/dashboard/sales/branch-stock-returns/create': 'branch-stock-return.create',

  // ── Factory Stock ─────────────────────────────────────────────────────────
  '/dashboard/sales/factory-stock': 'factory-stock.view',

  // ── Pricing ───────────────────────────────────────────────────────────────
  '/dashboard/sales/price-lists': 'price-list.view',
  '/dashboard/sales/branch-product-prices': [
    'branch-product-price.view',
    'branch-stock-operations.view',
    'branch-stock-operations.manage',
  ],

  // ── Employee Cash ─────────────────────────────────────────────────────────
  '/dashboard/sales/employee-cash': [
    'employee-cash-ledger.view',
    'employee-cash-ledger.view-all',
  ],
  '/dashboard/sales/employee-cash/transfers': 'employee-cash-transfer.view',
  '/dashboard/sales/employee-cash/transfers/create': 'employee-cash-transfer.create',

  // ── Territory & Assignments ───────────────────────────────────────────────
  '/dashboard/sales/territory': 'sales-region.view',
  '/dashboard/sales/sales-person-assignments': 'sales-person-assignment.view',

  // ── Customer Categories & Bonus Groups ────────────────────────────────────
  '/dashboard/sales/customer-categories': 'customer-category.view',
  '/dashboard/sales/product-bonus-groups': 'product-bonus-group.view',
  '/dashboard/sales/product-bonus-schemes': 'product-bonus-scheme.view',
  '/dashboard/sales/transporters': 'transporter.view',

  // ── Customers & Brokers ───────────────────────────────────────────────────
  '/dashboard/customers': 'customers.read',
  '/dashboard/brokers': 'broker.view',
  '/dashboard/brokers/create': 'broker.manage',
  '/dashboard/brokers/commissions': 'broker.view',
  '/dashboard/brokers/performance': 'broker.view',

  // ── Profit ────────────────────────────────────────────────────────────────
  '/dashboard/profit': 'reports.view',
  '/dashboard/profit/daily': 'reports.view',
  '/dashboard/profit/monthly': 'reports.view',
  '/dashboard/profit/product': 'reports.view',
  '/dashboard/profit/plant': 'reports.view',

  // ── HR Core ───────────────────────────────────────────────────────────────
  '/dashboard/hr/employees': 'hr.view',
  '/dashboard/hr/managers': 'hr.view',
  '/dashboard/hr/departments': 'hr.view',
  '/dashboard/hr/positions': 'hr.view',
  '/dashboard/hr/contracts': 'hr.view',
  '/dashboard/hr/org-units': 'hr.view',
  '/dashboard/hr/org-chart': 'hr.view',
  '/dashboard/hr/grades': 'hr.view',
  '/dashboard/hr/config': 'hr.view',
  '/dashboard/hr/settings': 'hr-settings.view',
  '/dashboard/hr/attendance': 'attendance.view_all',
  '/dashboard/hr/shifts': 'shifts.view',
  '/dashboard/hr/leave': 'leave-requests.view',
  '/dashboard/hr/holidays': 'holidays.view',
  '/dashboard/hr/payroll': 'payroll.view',
  '/dashboard/hr/loans': 'loan-requests.view',
  '/dashboard/hr/recruitment': 'hr.view_recruitment',

  // ── Financial Management ──────────────────────────────────────────────────
  '/dashboard/financial': 'finance.view',
  '/dashboard/financial/coa': 'finance.view',
  '/dashboard/financial/coa/create': 'finance.manage_accounts',
  '/dashboard/financial/journal': 'finance.view',
  '/dashboard/financial/journal/create': 'finance.create_journal',
  '/dashboard/financial/reports': 'finance.view_reports',
  '/dashboard/financial/accounts-payable/aging': 'finance.view',
  '/dashboard/financial/accounts-receivable/aging': 'finance.view',
  '/dashboard/financial/accounts-payable/bills': 'finance.view',
  '/dashboard/financial/accounts-payable/payments': 'finance.view',
  '/dashboard/financial/accounts-payable/vendors': 'finance.view',
  '/dashboard/financial/accounts-receivable/invoices': 'finance.view',
  '/dashboard/financial/accounts-receivable/payments': 'finance.view',
  '/dashboard/financial/accounts-receivable/invoices/new': 'finance.view',
  '/dashboard/financial/accounts-receivable/payments/new': 'finance.view',
  '/dashboard/financial/cash-management/accounts': 'finance.view',
  '/dashboard/financial/cash-management/transactions': 'finance.view',
  '/dashboard/financial/cash-management/transactions/new': 'finance.view',
  '/dashboard/financial/fixed-assets': 'finance.view',
  '/dashboard/financial/fixed-assets/new': 'finance.view',
  '/dashboard/financial/fixed-assets/depreciation/run': 'finance.view',
  '/dashboard/financial/budgeting': 'finance.view',
  '/dashboard/financial/budgeting/variance': 'finance.view',
  '/dashboard/financial/reports/cash-flow': 'finance.view_reports',
  '/dashboard/financial/reports/profit-loss': 'finance.view_reports',
  '/dashboard/financial/reports/balance-sheet': 'finance.view_reports',
  '/dashboard/expenses': 'expenses.read',
  '/dashboard/expenses/add': 'expenses.create',
  '/dashboard/expenses/reports': 'expenses.reports',
  '/dashboard/expenses/categories': 'expenses.read',
  '/dashboard/cash-in-hand': 'cash.view',

  // ── System ────────────────────────────────────────────────────────────────
  '/dashboard/audit': 'audit.view',
  '/dashboard/users': 'users.read',
  '/dashboard/settings/account': 'settings.view',
  '/dashboard/settings/roles-permissions': 'roles.read',
}

/**
 * Returns whether the current user may see a sidebar nav item for the given href.
 * Denies by default when the path is unmapped or permissions are still loading.
 */
export function canViewNavHref(
  href: string,
  ctx: NavPermissionContext,
): boolean {
  if (ctx.isLoading) return false

  const normalizedPath = normalizeNavHref(href)
  const requiredPermission = NAV_ITEM_PERMISSION[normalizedPath]

  if (!requiredPermission) return false

  if (Array.isArray(requiredPermission)) {
    return ctx.hasAnyPermission(requiredPermission)
  }

  return ctx.hasPermission(requiredPermission)
}

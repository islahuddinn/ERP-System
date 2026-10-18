import { AUDIT_PERMISSIONS } from "./modules/audit.permissions";
import { BOM_PERMISSIONS } from "./modules/bom.permissions";
import { CASH_PERMISSIONS } from "./modules/cash.permissions";
import { COMPANIES_PERMISSIONS } from "./modules/companies.permissions";
import { CUSTOMERS_PERMISSIONS } from "./modules/customers.permissions";
import { CUSTOMER_CATEGORY_PERMISSIONS } from "./modules/customer-category.permissions";
import { CUSTOMER_LEDGER_PERMISSIONS } from "./modules/customer-ledger.permissions";
import { CUSTOMER_ORDER_PERMISSIONS } from "./modules/customer-order.permissions";
import { CUSTOMER_DELIVERY_PERMISSIONS } from "./modules/customer-delivery.permissions";
import { CUSTOMER_RETURN_PERMISSIONS } from "./modules/customer-return.permissions";
import { CUSTOMER_RECOVERY_PERMISSIONS } from "./modules/customer-recovery.permissions";
import { CUSTOMER_LEDGER_ADJUSTMENT_PERMISSIONS } from "./modules/customer-ledger-adjustment.permissions";
import { PRODUCT_ADJUSTMENT_PERMISSIONS } from "./modules/product-adjustment.permissions";
import { EMPLOYEE_CASH_LEDGER_PERMISSIONS } from "./modules/employee-cash-ledger.permissions";
import { EMPLOYEE_CASH_TRANSFER_PERMISSIONS } from "./modules/employee-cash-transfer.permissions";
import { DASHBOARD_PERMISSIONS } from "./modules/dashboard.permissions";
import { DISPATCH_PERMISSIONS } from "./modules/dispatch.permissions";
import { EXPENSES_PERMISSIONS } from "./modules/expenses.permissions";
import { FINANCE_PERMISSIONS } from "./modules/finance.permissions";
import { GRN_PERMISSIONS } from "./modules/grn.permissions";
import { HOLIDAYS_PERMISSIONS } from "./modules/holidays.permissions";
import { HR_PERMISSIONS } from "./modules/hr.permissions";
import { HR_DESIGNATIONS_PERMISSIONS } from "./modules/hr-designations.permissions";
import { HR_SETTINGS_PERMISSIONS } from "./modules/hr-settings.permissions";
import { LEAVE_REQUESTS_PERMISSIONS } from "./modules/leave-requests.permissions";
import { LOAN_REQUESTS_PERMISSIONS } from "./modules/loan-requests.permissions";
import { LOCATIONS_PERMISSIONS } from "./modules/locations.permissions";
import { MACHINES_PERMISSIONS } from "./modules/machines.permissions";
import { PAYROLL_PERMISSIONS } from "./modules/payroll.permissions";
import { PLANTS_PERMISSIONS } from "./modules/plants.permissions";
import { POS_PERMISSIONS } from "./modules/pos.permissions";
import { PRODUCTION_PERMISSIONS } from "./modules/production.permissions";
import { PRODUCTION_ORDERS_PERMISSIONS } from "./modules/production-orders.permissions";
import { PRODUCTION_LINES_PERMISSIONS } from "./modules/production-lines.permissions";
import { PRODUCTS_PERMISSIONS } from "./modules/products.permissions";
import { PRODUCT_BRAND_PERMISSIONS } from "./modules/product-brand.permissions";
import { PRODUCT_CATEGORY_PERMISSIONS } from "./modules/product-category.permissions";
import { PRODUCT_GROUP_PERMISSIONS } from "./modules/product-group.permissions";
import { PURCHASES_PERMISSIONS } from "./modules/purchases.permissions";
import { RAW_MATERIALS_PERMISSIONS } from "./modules/raw-materials.permissions";
import { REPORTS_PERMISSIONS } from "./modules/reports.permissions";
import { ROLES_PERMISSIONS } from "./modules/roles.permissions";
import { SALE_DISPATCHES_PERMISSIONS } from "./modules/sale-dispatches.permissions";
import { SALES_PERMISSIONS } from "./modules/sales.permissions";
import { SALES_REGION_PERMISSIONS } from "./modules/sales-region.permissions";
import { SALES_ZONE_PERMISSIONS } from "./modules/sales-zone.permissions";
import { SALES_CITY_PERMISSIONS } from "./modules/sales-city.permissions";
import { SALES_BRANCH_PERMISSIONS } from "./modules/sales-branch.permissions";
import { SALES_AREA_PERMISSIONS } from "./modules/sales-area.permissions";
import { BRANCH_PRODUCT_PRICE_PERMISSIONS } from "./modules/branch-product-price.permissions";
import { BRANCH_STOCK_PERMISSIONS } from "./modules/branch-stock.permissions";
import { BRANCH_STOCK_REQUEST_PERMISSIONS } from "./modules/branch-stock-request.permissions";
import { BRANCH_STOCK_TRANSFER_PERMISSIONS } from "./modules/branch-stock-transfer.permissions";
import { BRANCH_STOCK_RETURN_PERMISSIONS } from "./modules/branch-stock-return.permissions";
import { BRANCH_STOCK_OPERATIONS_PERMISSIONS } from "./modules/branch-stock-operations.permissions";
import { FACTORY_STOCK_PERMISSIONS } from "./modules/factory-stock.permissions";
import { SALES_PERSON_ASSIGNMENT_PERMISSIONS } from "./modules/sales-person-assignment.permissions";
import { BRANCH_LEDGER_PERMISSIONS } from "./modules/branch-ledger.permissions";
import { PRICE_LIST_PERMISSIONS } from "./modules/price-list.permissions";
import { PRODUCT_BONUS_GROUP_PERMISSIONS } from "./modules/product-bonus-group.permissions";
import { PRODUCT_BONUS_SCHEME_PERMISSIONS } from "./modules/product-bonus-scheme.permissions";
import { TRANSPORTER_PERMISSIONS } from "./modules/transporter.permissions";
import { BROKER_PERMISSIONS } from "./modules/broker.permissions";
import { SETTINGS_PERMISSIONS } from "./modules/settings.permissions";
import { ATTENDANCE_PERMISSIONS } from "./modules/attendance.permissions";
import { SHIFTS_PERMISSIONS } from "./modules/shifts.permissions";
import { SITES_PERMISSIONS } from "./modules/sites.permissions";
import { STOCK_PERMISSIONS } from "./modules/stock.permissions";
import { SUPPLIERS_PERMISSIONS } from "./modules/suppliers.permissions";
import { UOMS_PERMISSIONS } from "./modules/uoms.permissions";
import { USERS_PERMISSIONS } from "./modules/users.permissions";
import { WAREHOUSES_PERMISSIONS } from "./modules/warehouses.permissions";
import { WASTE_MANAGEMENT_PERMISSIONS } from "./modules/waste-management.permissions";
import { ZONES_PERMISSIONS } from "./modules/zones.permissions";

const HR_MODULE_PERMISSIONS = {
  ...HR_PERMISSIONS,
  ...HR_DESIGNATIONS_PERMISSIONS,
  ...SHIFTS_PERMISSIONS,
  ...ATTENDANCE_PERMISSIONS,
  ...HOLIDAYS_PERMISSIONS,
  ...HR_SETTINGS_PERMISSIONS,
  ...LEAVE_REQUESTS_PERMISSIONS,
  ...LOAN_REQUESTS_PERMISSIONS,
  ...PAYROLL_PERMISSIONS,
} as const;

const SALES_MANAGEMENT_MODULE_PERMISSIONS = {
  ...SALES_REGION_PERMISSIONS,
  ...SALES_ZONE_PERMISSIONS,
  ...SALES_CITY_PERMISSIONS,
  ...SALES_BRANCH_PERMISSIONS,
  ...SALES_AREA_PERMISSIONS,
  ...BRANCH_PRODUCT_PRICE_PERMISSIONS,
  ...BRANCH_STOCK_PERMISSIONS,
  ...BRANCH_STOCK_REQUEST_PERMISSIONS,
  ...BRANCH_STOCK_TRANSFER_PERMISSIONS,
  ...BRANCH_STOCK_RETURN_PERMISSIONS,
  ...BRANCH_STOCK_OPERATIONS_PERMISSIONS,
  ...FACTORY_STOCK_PERMISSIONS,
  ...SALES_PERSON_ASSIGNMENT_PERMISSIONS,
  ...BRANCH_LEDGER_PERMISSIONS,
  ...PRICE_LIST_PERMISSIONS,
  ...PRODUCT_BONUS_GROUP_PERMISSIONS,
  ...PRODUCT_BONUS_SCHEME_PERMISSIONS,
  ...TRANSPORTER_PERMISSIONS,
  ...BROKER_PERMISSIONS,
} as const;

const CUSTOMER_MANAGEMENT_MODULE_PERMISSIONS = {
  ...CUSTOMERS_PERMISSIONS,
  ...CUSTOMER_CATEGORY_PERMISSIONS,
  ...CUSTOMER_LEDGER_PERMISSIONS,
  ...CUSTOMER_ORDER_PERMISSIONS,
  ...CUSTOMER_DELIVERY_PERMISSIONS,
  ...CUSTOMER_RETURN_PERMISSIONS,
  ...CUSTOMER_RECOVERY_PERMISSIONS,
  ...CUSTOMER_LEDGER_ADJUSTMENT_PERMISSIONS,
  ...PRODUCT_ADJUSTMENT_PERMISSIONS,
} as const;

const MANUFACTURING_MODULE_PERMISSIONS = {
  ...RAW_MATERIALS_PERMISSIONS,
  ...PURCHASES_PERMISSIONS,
  ...GRN_PERMISSIONS,
  ...BOM_PERMISSIONS,
  ...PRODUCTION_PERMISSIONS,
  ...PRODUCTION_ORDERS_PERMISSIONS,
} as const;

/**
 * Active permissions — the modules currently in use. New/updated modules must be added here.
 */
const ACTIVE_PERMISSIONS = {
  ...DASHBOARD_PERMISSIONS,
  ...PRODUCTS_PERMISSIONS,
  ...PRODUCT_BRAND_PERMISSIONS,
  ...PRODUCT_CATEGORY_PERMISSIONS,
  ...PRODUCT_GROUP_PERMISSIONS,
  ...WASTE_MANAGEMENT_PERMISSIONS,
  ...UOMS_PERMISSIONS,
  ...MANUFACTURING_MODULE_PERMISSIONS,
  ...SITES_PERMISSIONS,
  ...SALES_PERMISSIONS,
  ...SALES_MANAGEMENT_MODULE_PERMISSIONS,
  ...SALE_DISPATCHES_PERMISSIONS,
  ...DISPATCH_PERMISSIONS,
  ...EXPENSES_PERMISSIONS,
  ...CUSTOMER_MANAGEMENT_MODULE_PERMISSIONS,
  ...EMPLOYEE_CASH_LEDGER_PERMISSIONS,
  ...EMPLOYEE_CASH_TRANSFER_PERMISSIONS,
  ...SUPPLIERS_PERMISSIONS,
  ...WAREHOUSES_PERMISSIONS,
  ...ZONES_PERMISSIONS,
  ...LOCATIONS_PERMISSIONS,
  ...HR_MODULE_PERMISSIONS,
  ...REPORTS_PERMISSIONS,
  ...AUDIT_PERMISSIONS,
  ...USERS_PERMISSIONS,
  ...ROLES_PERMISSIONS,
  ...SETTINGS_PERMISSIONS,
} as const;

/**
 * Stale permissions — kept only so their controllers still type-check and existing
 * role/permission rows in already-provisioned tenant DBs stay valid. Never seeded for
 * new tenants and never surfaced in the "all permissions" listing (see getAllPermissionNames
 * (getPermissionsByModule below). Do not add new permissions here.
 */
const STALE_PERMISSIONS = {
  ...COMPANIES_PERMISSIONS,
  ...STOCK_PERMISSIONS,
  ...PRODUCTION_LINES_PERMISSIONS,
  ...MACHINES_PERMISSIONS,
  ...PLANTS_PERMISSIONS,
  ...POS_PERMISSIONS,
  ...FINANCE_PERMISSIONS,
  ...CASH_PERMISSIONS,
} as const;

export const PERMISSIONS = {
  ...ACTIVE_PERMISSIONS,
  ...STALE_PERMISSIONS,
} as const;

export type PermissionName = keyof typeof PERMISSIONS;

export function getAllPermissionNames(): PermissionName[] {
  return Object.keys(ACTIVE_PERMISSIONS) as PermissionName[];
}

export function getPermissionsByModule(): Record<string, PermissionName[]> {
  const grouped: Record<string, PermissionName[]> = {};

  for (const [name, permission] of Object.entries(ACTIVE_PERMISSIONS)) {
    if (!grouped[permission.module]) {
      grouped[permission.module] = [];
    }
    grouped[permission.module].push(name as PermissionName);
  }

  return grouped;
}

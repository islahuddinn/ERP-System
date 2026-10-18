-- CreateEnum
CREATE TYPE "POApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProductBatchStageStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WeekDay" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateEnum
CREATE TYPE "OpeningBalanceType" AS ENUM ('RECEIVABLE', 'PAYABLE');

-- CreateEnum
CREATE TYPE "SupplierTransactionType" AS ENUM ('PAYMENT', 'PURCHASE', 'RETURN', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CustomerTransactionType" AS ENUM ('SALE', 'PAYMENT', 'RETURN', 'ADJUSTMENT', 'OPENING_BALANCE');

-- CreateEnum
CREATE TYPE "LoginAccess" AS ENUM ('ENABLED', 'DISABLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('RECEIPT', 'ISSUE', 'TRANSFER', 'ADJUSTMENT', 'SALE', 'PURCHASE', 'WASTE', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'APPROVE', 'REJECT', 'RESTORE');

-- CreateEnum
CREATE TYPE "AuditModule" AS ENUM ('PRODUCTS', 'RAW_MATERIALS', 'SITES', 'CATEGORIES', 'WAREHOUSES', 'LOCATIONS', 'SUPPLIERS', 'CUSTOMERS', 'PURCHASE_ORDERS', 'PURCHASE_RETURNS', 'INVOICES', 'EXPENSES', 'CASH_IN_HAND', 'PRODUCTION_ORDERS', 'PRODUCTION_LINES', 'MATERIAL_REQUESTS', 'MATERIAL_TRANSFERS', 'GRN', 'USERS', 'AUTH', 'UOM', 'BOM', 'MACHINES', 'PLANTS', 'BATCHES', 'RAW_MATERIAL_BATCHES', 'PRODUCT_BATCHES', 'WORK_ORDERS', 'QUALITY_CONTROL', 'STOCK_TRANSACTIONS', 'WASTE_MANAGEMENT', 'SALES', 'SALE_RETURNS', 'SALE_DISPATCHES', 'SYSTEM', 'HR_EMPLOYEES', 'HR_DEPARTMENTS', 'HR_POSITIONS', 'HR_GRADES', 'HR_ORG_UNITS', 'HR_CONTRACTS', 'HR_SHIFTS', 'HR_ATTENDANCE', 'HR_HOLIDAYS', 'HR_SETTINGS', 'HR_LEAVE_REQUESTS', 'HR_LOAN_REQUESTS', 'HR_PAYROLL', 'ROLES');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'MOBILE_PAYMENT', 'BANK_TRANSFER', 'CHEQUE', 'OTHER', 'CREDIT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'PARTIAL', 'CREDIT');

-- CreateEnum
CREATE TYPE "SaleDispatchStatus" AS ENUM ('DRAFT', 'APPROVED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "ReceiptType" AS ENUM ('ORIGINAL', 'DUPLICATE', 'REFUND');

-- CreateEnum
CREATE TYPE "ReceiptFormat" AS ENUM ('PDF', 'THERMAL');

-- CreateEnum
CREATE TYPE "RefundType" AS ENUM ('FULL', 'PARTIAL');

-- CreateEnum
CREATE TYPE "CashTransactionType" AS ENUM ('OPENING', 'CASH_SALE', 'PAYMENT_OUT', 'REFUND', 'ADJUSTMENT', 'CLOSING');

-- CreateEnum
CREATE TYPE "CashCountStatus" AS ENUM ('OPEN', 'COUNTED', 'APPROVED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PARTIAL', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReturnApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SaleReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "CapacityUnit" AS ENUM ('CUBIC_METER', 'SQUARE_METER', 'PALLET', 'TON', 'KG', 'UNIT');

-- CreateEnum
CREATE TYPE "WarehouseType" AS ENUM ('STORAGE', 'DISPATCH');

-- CreateEnum
CREATE TYPE "WarehouseStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'FULL');

-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('RAW_MATERIALS', 'PACKAGING', 'FINISHED_GOODS', 'QUARANTINE', 'REJECTED', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "CapacityAlertLevel" AS ENUM ('NORMAL', 'WARNING', 'CRITICAL', 'FULL');

-- CreateEnum
CREATE TYPE "RawMaterialBatchStatus" AS ENUM ('ACTIVE', 'PARTIAL', 'CONSUMED', 'EXPIRED', 'BLOCKED', 'QUARANTINE');

-- CreateEnum
CREATE TYPE "ProductBatchStatus" AS ENUM ('ACTIVE', 'PARTIAL', 'CONSUMED', 'EXPIRED', 'BLOCKED', 'QUARANTINE');

-- CreateEnum
CREATE TYPE "BOMStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "StockTransactionType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'RETURN', 'RESERVED');

-- CreateEnum
CREATE TYPE "ProductionOrderStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductionCostType" AS ENUM ('LABOUR', 'OVERHEAD', 'UTILITY', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "WasteType" AS ENUM ('PRODUCTION', 'QUALITY_REJECT', 'EXPIRY', 'DAMAGE', 'SPOILAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "WasteItemType" AS ENUM ('RAW_MATERIAL', 'PRODUCT');

-- CreateEnum
CREATE TYPE "WasteStatus" AS ENUM ('PENDING', 'DISPOSED', 'RECYCLED', 'REUSED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('SALES_DAILY', 'SALES_MONTHLY', 'SALES_HOURLY', 'PURCHASE_SUPPLIER', 'PURCHASE_PRODUCT', 'INVENTORY_VALUATION', 'INVENTORY_AGING', 'STOCK_MOVEMENT', 'PROFIT_DAILY', 'PROFIT_MONTHLY', 'FACTORY_PRODUCTION', 'FACTORY_MATERIAL', 'FACTORY_QUALITY', 'FACTORY_WASTE', 'FACTORY_WAREHOUSE', 'FACTORY_COSTING', 'EXPENSE_CATEGORY', 'EXPENSE_PLANT');

-- CreateEnum
CREATE TYPE "ProductionPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ProductionLineStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'UNDER_REPAIR', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "ProductionLineType" AS ENUM ('ASSEMBLY', 'PACKAGING', 'MANUFACTURING', 'QUALITY_CONTROL', 'TESTING', 'MIXED');

-- CreateEnum
CREATE TYPE "ProductionLinePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MachineStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'UNDER_REPAIR', 'OUT_OF_SERVICE', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "MachineType" AS ENUM ('PRODUCTION', 'ASSEMBLY', 'PACKAGING', 'TESTING', 'QUALITY_CONTROL', 'MATERIAL_HANDLING', 'UTILITY', 'CONVEYOR', 'CNC', 'ROBOTIC', 'OTHER');

-- CreateEnum
CREATE TYPE "MachinePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'PREDICTIVE', 'CALIBRATION');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PlantStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'UNDER_CONSTRUCTION', 'CLOSED');

-- CreateEnum
CREATE TYPE "PlantType" AS ENUM ('MANUFACTURING', 'ASSEMBLY', 'PACKAGING', 'WAREHOUSE', 'QUALITY_CONTROL', 'RESEARCH_DEVELOPMENT', 'ADMINISTRATION', 'MIXED');

-- CreateEnum
CREATE TYPE "PlantCapacity" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE');

-- CreateEnum
CREATE TYPE "MaterialRequestStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaterialRequestPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MaterialRequestType" AS ENUM ('PRODUCTION', 'MAINTENANCE', 'QUALITY_CONTROL', 'RESEARCH', 'GENERAL');

-- CreateEnum
CREATE TYPE "MaterialTransferStatus" AS ENUM ('PENDING', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaterialTransferPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MaterialTransferType" AS ENUM ('WAREHOUSE_TO_WAREHOUSE', 'WAREHOUSE_TO_PLANT', 'PLANT_TO_WAREHOUSE', 'PLANT_TO_PLANT', 'DEPARTMENT_TO_DEPARTMENT');

-- CreateEnum
CREATE TYPE "TransferLocationType" AS ENUM ('WAREHOUSE', 'PLANT', 'DEPARTMENT');

-- CreateEnum
CREATE TYPE "ReceivingStatus" AS ENUM ('PENDING', 'INSPECTING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReceivingType" AS ENUM ('PURCHASE_ORDER', 'RETURN', 'PRODUCTION_RETURN', 'OTHER');

-- CreateEnum
CREATE TYPE "QualityStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'CONDITIONAL');

-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('VISUAL', 'DIMENSIONAL', 'FUNCTIONAL', 'LAB_TEST', 'DOCUMENTATION');

-- CreateEnum
CREATE TYPE "FinancialEventType" AS ENUM ('REVENUE', 'COST_PURCHASE', 'COST_PRODUCTION', 'COST_WASTE', 'COST_ADJUSTMENT', 'SUPPLIER_PAYABLE', 'SALES_REVENUE', 'PRODUCTION_OUT');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED', 'ONBOARDING');

-- CreateEnum
CREATE TYPE "contract_type" AS ENUM ('PERMANENT', 'FIXED_TERM', 'PROBATION', 'INTERNSHIP', 'PART_TIME', 'CONTRACTOR');

-- CreateEnum
CREATE TYPE "contract_status" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "salary_frequency" AS ENUM ('MONTHLY', 'WEEKLY', 'BIWEEKLY', 'DAILY', 'HOURLY');

-- CreateEnum
CREATE TYPE "salary_revision_status" AS ENUM ('DRAFT', 'CURRENT', 'SUPERSEDED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "allowance_type" AS ENUM ('HOUSE_RENT', 'MEDICAL', 'TRANSPORT', 'FUEL', 'GYM', 'MOBILE', 'OTHER');

-- CreateEnum
CREATE TYPE "shift_type" AS ENUM ('FIXED', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "holiday_type" AS ENUM ('FULL_DAY', 'HALF_DAY');

-- CreateEnum
CREATE TYPE "leave_duration_type" AS ENUM ('FULL_DAY', 'HALF_DAY');

-- CreateEnum
CREATE TYPE "OrgUnitType" AS ENUM ('COMPANY', 'DIVISION', 'DEPARTMENT', 'TEAM', 'UNIT');

-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('MANUAL', 'BIOMETRIC', 'API');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('ON_SITE', 'WORK_FROM_HOME', 'FIELD_VISIT');

-- CreateEnum
CREATE TYPE "OvertimeApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeaveApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LoanRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LoanApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LoanInstallmentStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "payroll_status" AS ENUM ('DRAFT', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "SalaryComponentKind" AS ENUM ('EARNING', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "BrokerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeductionCalculationType" AS ENUM ('FIXED_AMOUNT', 'PERCENTAGE', 'FORMULA_BASED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "NormalBalance" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "BankTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAW');

-- CreateEnum
CREATE TYPE "SiteType" AS ENUM ('WAREHOUSE', 'ZONE', 'UNIT', 'PLANT', 'WORKSHOP', 'ROOM', 'STORAGE', 'AREA');

-- CreateEnum
CREATE TYPE "SiteCategory" AS ENUM ('RAW_MATERIAL', 'WORK_IN_PROGRESS', 'FINISHED_GOODS', 'PACKAGING', 'SPARE_PARTS', 'CONSUMABLES', 'REJECTED', 'QUARANTINE', 'HAZARDOUS', 'GENERAL');

-- CreateEnum
CREATE TYPE "SiteStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'QUARANTINE', 'UNDER_MAINTENANCE', 'FULL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "role_id" TEXT NOT NULL,
    "login_access" "LoginAccess" NOT NULL DEFAULT 'DISABLED',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "barcode" TEXT,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'FINISHED_GOOD',
    "uom_id" TEXT NOT NULL,
    "current_stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reserved_stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_rejected_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "min_stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "max_stock" DOUBLE PRECISION,
    "reorder_level" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "selling_price" DOUBLE PRECISION,
    "cost_price" DOUBLE PRECISION,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attributes" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,

    CONSTRAINT "product_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "phone" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_balances" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transactions" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "from_location_id" TEXT,
    "to_location_id" TEXT,
    "type" "TransactionType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "reference_no" TEXT,
    "remarks" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sale_id" TEXT,
    "purchase_order_id" TEXT,
    "sale_return_id" TEXT,
    "purchase_return_id" TEXT,

    CONSTRAINT "stock_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocktakes" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "counted_quantity" DOUBLE PRECISION NOT NULL,
    "system_quantity" DOUBLE PRECISION NOT NULL,
    "adjustment" DOUBLE PRECISION NOT NULL,
    "performed_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stocktakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "module" "AuditModule" NOT NULL DEFAULT 'SYSTEM',
    "entity_name" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_label" TEXT,
    "action" "AuditAction" NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "opening_balance_amount" DECIMAL(12,2),
    "opening_balance_date" TIMESTAMP(3),
    "opening_balance_note" TEXT,
    "opening_balance_set_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_transactions" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "SupplierTransactionType" NOT NULL,
    "reference" TEXT,
    "description" TEXT NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL,
    "credit" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_bank_accounts" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_title" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "iban" TEXT,
    "swift_code" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uoms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "uoms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_name" TEXT NOT NULL,
    "variant_value" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "additional_price" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_import_records" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "total_records" INTEGER NOT NULL,
    "successful_records" INTEGER NOT NULL,
    "failed_records" INTEGER NOT NULL,
    "errors" TEXT[],
    "user_id" TEXT NOT NULL,
    "summary" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "bulk_import_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "customer_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postal_code" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_transactions" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "CustomerTransactionType" NOT NULL,
    "reference" TEXT,
    "description" TEXT NOT NULL,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_bank_accounts" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_title" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "iban" TEXT,
    "swift_code" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "sale_number" TEXT NOT NULL,
    "customer_id" TEXT,
    "sale_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "items_discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_percentage" DECIMAL(5,2),
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "status" "SaleStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "invoice_id" TEXT,
    "notes" TEXT,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "product_id" TEXT,
    "item_type" "ItemType" NOT NULL,
    "item_name" TEXT NOT NULL,
    "item_description" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "cost_price" DECIMAL(10,2),
    "line_subtotal" DECIMAL(10,2) NOT NULL,
    "item_discount_percentage" DECIMAL(5,2),
    "item_discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "item_total_discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(10,2) NOT NULL,
    "dispatched_quantity" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reference_number" TEXT,
    "card_last_four" TEXT,
    "card_type" TEXT,
    "bank_name" TEXT,
    "cheque_number" TEXT,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_by_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "receipt_type" "ReceiptType" NOT NULL,
    "format" "ReceiptFormat" NOT NULL,
    "file_path" TEXT,
    "emailed_to" TEXT,
    "emailed_at" TIMESTAMP(3),
    "printed_at" TIMESTAMP(3),
    "print_count" INTEGER NOT NULL DEFAULT 0,
    "generated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_settings" (
    "id" TEXT NOT NULL,
    "page_size" TEXT NOT NULL DEFAULT 'A4',
    "page_orientation" TEXT NOT NULL DEFAULT 'portrait',
    "custom_page_width" DOUBLE PRECISION,
    "custom_page_height" DOUBLE PRECISION,
    "margin" DOUBLE PRECISION NOT NULL DEFAULT 16,
    "show_logo" BOOLEAN NOT NULL DEFAULT false,
    "logo_size" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "logo_position" TEXT NOT NULL DEFAULT 'center',
    "brand_name_font_size" DOUBLE PRECISION NOT NULL DEFAULT 19,
    "brand_name_color" TEXT NOT NULL DEFAULT '#111827',
    "receipt_title" TEXT NOT NULL DEFAULT 'SALES RECEIPT',
    "receipt_title_font_size" DOUBLE PRECISION NOT NULL DEFAULT 11,
    "show_location_address" BOOLEAN NOT NULL DEFAULT true,
    "show_customer_info" BOOLEAN NOT NULL DEFAULT true,
    "customer_info_font_size" DOUBLE PRECISION NOT NULL DEFAULT 11,
    "show_items_table" BOOLEAN NOT NULL DEFAULT true,
    "items_table_font_size" DOUBLE PRECISION NOT NULL DEFAULT 9,
    "show_payments" BOOLEAN NOT NULL DEFAULT true,
    "payments_font_size" DOUBLE PRECISION NOT NULL DEFAULT 9,
    "footer_text" TEXT,
    "show_footer" BOOLEAN NOT NULL DEFAULT true,
    "footer_font_size" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "footer_color" TEXT NOT NULL DEFAULT '#9ca3af',
    "divider_color" TEXT NOT NULL DEFAULT '#d1d5db',
    "divider_style" TEXT NOT NULL DEFAULT 'dashed',
    "background_color" TEXT,
    "text_color" TEXT NOT NULL DEFAULT '#111827',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_refunds" (
    "id" TEXT NOT NULL,
    "original_sale_id" TEXT NOT NULL,
    "refund_number" TEXT NOT NULL,
    "refund_type_id" "RefundType" NOT NULL,
    "refund_amount" DECIMAL(10,2) NOT NULL,
    "refund_method_id" "PaymentMethod" NOT NULL,
    "reason" TEXT NOT NULL,
    "processed_by_id" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "supplier_id" TEXT,
    "supplier_name" TEXT,
    "reference_no" TEXT,
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_date" TIMESTAMP(3),
    "status" "PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
    "sub_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shipping_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_approvals" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "approver_id" TEXT NOT NULL,
    "status" "POApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "raw_material_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "received_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_returns" (
    "id" TEXT NOT NULL,
    "return_number" TEXT NOT NULL,
    "purchase_order_id" TEXT,
    "grn_id" TEXT,
    "return_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "remarks" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "ReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_by_id" TEXT,
    "rejected_reason" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_return_approvals" (
    "id" TEXT NOT NULL,
    "return_id" TEXT NOT NULL,
    "approver_id" TEXT NOT NULL,
    "status" "ReturnApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_return_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_payments" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "reference_number" TEXT,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "paid_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT,
    "bank_account_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_payments" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_method" TEXT NOT NULL,
    "reference_number" TEXT,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "processed_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoice_id" TEXT,

    CONSTRAINT "customer_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_return_items" (
    "id" TEXT NOT NULL,
    "return_id" TEXT NOT NULL,
    "raw_material_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "grn_item_id" TEXT,
    "purchase_item_id" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_in_hand" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "location_id" TEXT NOT NULL,
    "opening_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "closing_balance" DECIMAL(10,2),
    "expected_closing" DECIMAL(10,2),
    "actual_count" DECIMAL(10,2),
    "variance" DECIMAL(10,2),
    "notes" TEXT,
    "counted_by_id" TEXT NOT NULL,
    "counted_at" TIMESTAMP(3) NOT NULL,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "status" "CashCountStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_in_hand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_transactions" (
    "id" TEXT NOT NULL,
    "cash_in_hand_id" TEXT,
    "location_id" TEXT NOT NULL,
    "type" "CashTransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "reference_type" TEXT,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "held_invoices" (
    "id" TEXT NOT NULL,
    "reference_number" TEXT NOT NULL,
    "customer_id" TEXT,
    "location_id" TEXT NOT NULL,
    "name" TEXT,
    "items" JSONB NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_type" "DiscountType",
    "discount_value" DECIMAL(10,2),
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "bilty_address" TEXT,
    "bilty_contact" TEXT,
    "labour_expense" DECIMAL(10,2),
    "freight_charges" DECIMAL(10,2),
    "notes" TEXT,
    "held_by" TEXT NOT NULL,
    "held_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restored_at" TIMESTAMP(3),
    "restored_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "held_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_returns" (
    "id" TEXT NOT NULL,
    "return_number" TEXT NOT NULL,
    "original_sale_id" TEXT NOT NULL,
    "location_id" TEXT,
    "return_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax_amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "refund_method" "PaymentMethod" NOT NULL,
    "refund_status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "refunded_at" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "processed_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "status" "SaleReturnStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "expense_number" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "location_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "expense_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "vendor" TEXT,
    "reference_number" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_frequency" "RecurringFrequency",
    "next_recurring_date" TIMESTAMP(3),
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "cash_transaction_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_return_items" (
    "id" TEXT NOT NULL,
    "return_id" TEXT NOT NULL,
    "original_sale_item_id" TEXT NOT NULL,
    "product_id" TEXT,
    "item_type" "ItemType" NOT NULL,
    "item_name" TEXT NOT NULL,
    "sku" TEXT,
    "quantity_returned" DECIMAL(10,3) NOT NULL,
    "original_quantity" DECIMAL(10,3) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "line_subtotal" DECIMAL(10,2) NOT NULL,
    "item_discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "warehouse_type" "WarehouseType" NOT NULL,
    "location_id" TEXT NOT NULL,
    "address" TEXT,
    "contact_person" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "total_capacity" DOUBLE PRECISION NOT NULL,
    "used_capacity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "available_capacity" DOUBLE PRECISION NOT NULL,
    "capacity_unit" TEXT NOT NULL DEFAULT 'CUBIC_METER',
    "status" "WarehouseStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "manager_id" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_zones" (
    "id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "zone_type" "ZoneType" NOT NULL,
    "description" TEXT,
    "total_capacity" DOUBLE PRECISION NOT NULL,
    "used_capacity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "available_capacity" DOUBLE PRECISION NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "temperature" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_stock_balances" (
    "id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "zone_id" TEXT,
    "product_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "reserved_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "available_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouse_stock_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_capacity_alerts" (
    "id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "zone_id" TEXT,
    "alert_level" "CapacityAlertLevel" NOT NULL,
    "current_capacity" DOUBLE PRECISION NOT NULL,
    "current_used" DOUBLE PRECISION NOT NULL,
    "current_available" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "message" TEXT,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouse_capacity_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "address" TEXT,
    "contact_person" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "manager_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "capacity" "PlantCapacity" NOT NULL DEFAULT 'MEDIUM',
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" TEXT,
    "departments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "operating_hours" TEXT,
    "plant_type" "PlantType" NOT NULL,
    "production_capacity" DOUBLE PRECISION,
    "status" "PlantStatus" NOT NULL DEFAULT 'ACTIVE',
    "total_area" DOUBLE PRECISION,
    "updated_by" TEXT,

    CONSTRAINT "plants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_material_batches" (
    "id" TEXT NOT NULL,
    "batch_number" TEXT NOT NULL,
    "raw_material_id" TEXT NOT NULL,
    "grn_item_id" TEXT,
    "site_id" TEXT,
    "received_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "consumed_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "returned_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "available_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reserved_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit_cost" DOUBLE PRECISION,
    "manufacturing_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "received_date" TIMESTAMP(3) NOT NULL,
    "status" "RawMaterialBatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raw_material_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_material_batch_consumptions" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "consumed_quantity" DOUBLE PRECISION NOT NULL,
    "remaining_after" DOUBLE PRECISION NOT NULL,
    "consumed_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_material_batch_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "bom_id" TEXT NOT NULL,
    "site_id" TEXT,
    "planned_quantity" DOUBLE PRECISION NOT NULL,
    "produced_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "ProductionOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "raw_material_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "additional_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waste_input_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cost_per_unit" DOUBLE PRECISION,
    "notes" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_order_materials" (
    "id" TEXT NOT NULL,
    "production_order_id" TEXT NOT NULL,
    "raw_material_id" TEXT NOT NULL,
    "uom_id" TEXT NOT NULL,
    "required_quantity" DOUBLE PRECISION NOT NULL,
    "consumed_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimated_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actual_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_order_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_order_material_batches" (
    "id" TEXT NOT NULL,
    "production_order_material_id" TEXT NOT NULL,
    "raw_material_batch_id" TEXT NOT NULL,
    "allocated_quantity" DOUBLE PRECISION NOT NULL,
    "unit_cost" DOUBLE PRECISION NOT NULL,
    "total_cost" DOUBLE PRECISION NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_order_material_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_order_costs" (
    "id" TEXT NOT NULL,
    "production_order_id" TEXT NOT NULL,
    "cost_type" "ProductionCostType" NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_order_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_order_wastes" (
    "id" TEXT NOT NULL,
    "production_order_id" TEXT NOT NULL,
    "raw_material_id" TEXT NOT NULL,
    "uom_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_cost" DOUBLE PRECISION NOT NULL,
    "total_cost" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_order_wastes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_batches" (
    "id" TEXT NOT NULL,
    "batch_number" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "site_id" TEXT,
    "production_order_id" TEXT NOT NULL,
    "current_stage" TEXT NOT NULL,
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "quantity" DOUBLE PRECISION NOT NULL,
    "consumed_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reserved_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "returned_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "available_quantity" DOUBLE PRECISION NOT NULL,
    "cost_per_unit" DOUBLE PRECISION NOT NULL,
    "retail_price" DOUBLE PRECISION,
    "sale_price" DOUBLE PRECISION,
    "manufacturing_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "status" "ProductBatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_batch_stages" (
    "id" TEXT NOT NULL,
    "product_batch_id" TEXT NOT NULL,
    "stage_name" TEXT NOT NULL,
    "site_id" TEXT,
    "status" "ProductBatchStageStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "received_quantity" DOUBLE PRECISION NOT NULL,
    "approved_quantity" DOUBLE PRECISION,
    "rejected_quantity" DOUBLE PRECISION,
    "additional_cost" DOUBLE PRECISION,
    "cost_per_unit" DOUBLE PRECISION,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "product_batch_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_lines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "capacity" DOUBLE PRECISION NOT NULL,
    "currentLoad" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineType" "ProductionLineType" NOT NULL DEFAULT 'MANUFACTURING',
    "status" "ProductionLineStatus" NOT NULL DEFAULT 'ACTIVE',
    "location" TEXT,
    "supervisor_id" TEXT,
    "operating_hours" TEXT,
    "tenantId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "created_by_id" TEXT,
    "notes" TEXT,
    "departments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "production_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "machineType" "MachineType" NOT NULL DEFAULT 'PRODUCTION',
    "status" "MachineStatus" NOT NULL DEFAULT 'ACTIVE',
    "location" TEXT,
    "supervisor_id" TEXT,
    "capacity" DOUBLE PRECISION,
    "efficiency" DOUBLE PRECISION DEFAULT 0,
    "operating_hours" TEXT,
    "purchase_date" TIMESTAMP(3),
    "installation_date" TIMESTAMP(3),
    "warranty_expiry_date" TIMESTAMP(3),
    "manufacturer" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "tenantId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "production_line_id" TEXT,
    "created_by_id" TEXT,
    "notes" TEXT,
    "departments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "components" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "maintenanceType" "MaintenanceType" NOT NULL DEFAULT 'PREVENTIVE',
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "estimated_duration" DOUBLE PRECISION NOT NULL,
    "actual_duration" DOUBLE PRECISION,
    "start_date" TIMESTAMP(3),
    "completed_date" TIMESTAMP(3),
    "estimated_cost" DOUBLE PRECISION,
    "actual_cost" DOUBLE PRECISION,
    "assigned_to_id" TEXT,
    "tenantId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "created_by_id" TEXT,
    "requiredParts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_requests" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "MaterialRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestType" "MaterialRequestType" NOT NULL,
    "priority" "MaterialRequestPriority" NOT NULL DEFAULT 'MEDIUM',
    "requiredDate" TIMESTAMP(3) NOT NULL,
    "approvedDate" TIMESTAMP(3),
    "approved_by_id" TEXT,
    "approval_comments" TEXT,
    "fulfilled_date" TIMESTAMP(3),
    "fulfilled_by_id" TEXT,
    "tenantId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "production_order_id" TEXT,
    "department_id" TEXT,
    "requested_by_id" TEXT,
    "warehouse_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_request_items" (
    "id" TEXT NOT NULL,
    "material_request_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "requested_quantity" DOUBLE PRECISION NOT NULL,
    "approved_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fulfilled_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "specifications" TEXT,
    "fulfillment_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_transfers" (
    "id" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "MaterialTransferStatus" NOT NULL DEFAULT 'PENDING',
    "transferType" "MaterialTransferType" NOT NULL,
    "priority" "MaterialTransferPriority" NOT NULL DEFAULT 'MEDIUM',
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "expected_delivery_date" TIMESTAMP(3),
    "approved_date" TIMESTAMP(3),
    "approved_by_id" TEXT,
    "approval_comments" TEXT,
    "in_transit_date" TIMESTAMP(3),
    "received_date" TIMESTAMP(3),
    "received_by_id" TEXT,
    "receiving_comments" TEXT,
    "transporter_id" TEXT,
    "transport_details" TEXT,
    "tracking_number" TEXT,
    "source_location_type" "TransferLocationType" NOT NULL,
    "source_location_id" TEXT NOT NULL,
    "source_location_details" TEXT,
    "destination_location_type" "TransferLocationType" NOT NULL,
    "destination_location_id" TEXT NOT NULL,
    "destination_location_details" TEXT,
    "tenantId" TEXT NOT NULL,
    "requested_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_transfer_items" (
    "id" TEXT NOT NULL,
    "material_transfer_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "actual_quantity" DOUBLE PRECISION,
    "damaged_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "specifications" TEXT,
    "receiving_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grn" (
    "id" TEXT NOT NULL,
    "receiving_number" TEXT NOT NULL,
    "status" "ReceivingStatus" NOT NULL DEFAULT 'PENDING',
    "receivingType" "ReceivingType" NOT NULL,
    "received_date" TIMESTAMP(3) NOT NULL,
    "vehicle_details" TEXT,
    "delivery_note_number" TEXT,
    "purchase_order_id" TEXT,
    "received_by_id" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grn_items" (
    "id" TEXT NOT NULL,
    "grn_id" TEXT NOT NULL,
    "raw_material_id" TEXT NOT NULL,
    "uom_id" TEXT NOT NULL,
    "expected_quantity" DOUBLE PRECISION NOT NULL,
    "received_quantity" DOUBLE PRECISION NOT NULL,
    "rejected_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "specifications" TEXT,
    "receiving_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grn_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_events" (
    "id" TEXT NOT NULL,
    "type" "FinancialEventType" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "product_id" TEXT,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_ledgers" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "warehouse_id" TEXT,
    "zone_id" TEXT,
    "batch_id" TEXT,
    "product_batch_id" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "transaction_type" "StockTransactionType" NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "opening_qty" DOUBLE PRECISION,
    "closing_qty" DOUBLE PRECISION,
    "remarks" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "work_order_number" TEXT NOT NULL,
    "production_order_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'SCHEDULED',
    "priority" "ProductionPriority" NOT NULL DEFAULT 'MEDIUM',
    "scheduled_start_date" TIMESTAMP(3) NOT NULL,
    "scheduled_end_date" TIMESTAMP(3) NOT NULL,
    "actual_start_date" TIMESTAMP(3),
    "actual_end_date" TIMESTAMP(3),
    "assigned_to_id" TEXT,
    "notes" TEXT,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boms" (
    "id" TEXT NOT NULL,
    "bom_number" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "BOMStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "boms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_items" (
    "id" TEXT NOT NULL,
    "bom_id" TEXT NOT NULL,
    "raw_material_id" TEXT NOT NULL,
    "uom_id" TEXT NOT NULL,
    "quantity_per_unit" DOUBLE PRECISION NOT NULL,
    "wastage_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bom_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_control" (
    "id" TEXT NOT NULL,
    "inspection_number" TEXT NOT NULL,
    "batch_id" TEXT,
    "product_id" TEXT NOT NULL,
    "inspectionType" "InspectionType" NOT NULL,
    "qualityStatus" "QualityStatus" NOT NULL DEFAULT 'PENDING',
    "results" TEXT NOT NULL,
    "inspected_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inspected_by_id" TEXT,
    "notes" TEXT,
    "observations" TEXT[],
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "quality_control_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_material_batch_inspections" (
    "id" TEXT NOT NULL,
    "inspection_number" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "inspection_type" "InspectionType" NOT NULL,
    "quality_status" "QualityStatus" NOT NULL DEFAULT 'PENDING',
    "approved_quantity" DOUBLE PRECISION,
    "rejected_quantity" DOUBLE PRECISION,
    "results" TEXT NOT NULL,
    "observations" TEXT[],
    "notes" TEXT,
    "inspected_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inspected_by_id" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raw_material_batch_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_management" (
    "id" TEXT NOT NULL,
    "waste_number" TEXT NOT NULL,
    "wasteType" "WasteType" NOT NULL,
    "item_type" "WasteItemType" NOT NULL,
    "product_id" TEXT,
    "raw_material_id" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "cost" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "remarks" TEXT,
    "site_id" TEXT,
    "status" "WasteStatus" NOT NULL DEFAULT 'PENDING',
    "resolved_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "waste_management_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "account_name" TEXT,
    "company_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postal_code" TEXT,
    "country" TEXT,
    "timezone" TEXT DEFAULT 'UTC',
    "currency" TEXT DEFAULT 'PKR',
    "language" TEXT DEFAULT 'en',
    "settings" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_snapshots" (
    "id" TEXT NOT NULL,
    "report_type" "ReportType" NOT NULL,
    "report_date" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "invoice_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "payment_received" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance_due" DECIMAL(12,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brokers" (
    "id" TEXT NOT NULL,
    "broker_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "zone_id" TEXT,
    "area_id" TEXT,
    "sales_target" DECIMAL(12,2) DEFAULT 0,
    "commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" "BrokerStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "brokers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker_products" (
    "id" TEXT NOT NULL,
    "broker_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "category_id" TEXT,
    "commission_rate" DECIMAL(5,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broker_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker_territories" (
    "id" TEXT NOT NULL,
    "broker_id" TEXT NOT NULL,
    "zone_id" TEXT,
    "area_name" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broker_territories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker_commissions" (
    "id" TEXT NOT NULL,
    "broker_id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "sale_amount" DECIMAL(12,2) NOT NULL,
    "commission_rate" DECIMAL(5,2) NOT NULL,
    "commission_amount" DECIMAL(12,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "accrued_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payable_date" TIMESTAMP(3),
    "approved_date" TIMESTAMP(3),
    "approved_by" TEXT,
    "paid_date" TIMESTAMP(3),
    "paid_amount" DECIMAL(12,2),
    "payment_reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broker_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_tax_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "country_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slab_min" DECIMAL(12,2) NOT NULL,
    "slab_max" DECIMAL(12,2),
    "rate_percent" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMPTZ(6) NOT NULL,
    "effective_to" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "hr_tax_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_deduction_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "calculation_type" "DeductionCalculationType" NOT NULL,
    "amount" DECIMAL(12,2),
    "rate_percent" DECIMAL(5,2),
    "formula" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "hr_deduction_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_working_calendars" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "country_code" TEXT NOT NULL,
    "weekend_days" TEXT[] DEFAULT '{6,0}'::text[],
    "holidays" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "hr_working_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_salary_components" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "calculation_type" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "percentage" DECIMAL(5,2),
    "formula" TEXT,
    "is_taxable" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMPTZ(6) NOT NULL,
    "effective_to" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "hr_salary_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_departments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parent_department_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_positions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_grades" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "salary_band_min" DECIMAL(12,2) NOT NULL,
    "salary_band_max" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "hr_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_org_units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "type" "OrgUnitType" NOT NULL,
    "parent_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "hr_org_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_shifts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "shift_type" NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "crosses_midnight" BOOLEAN NOT NULL DEFAULT false,
    "grace_minutes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_holidays" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "holiday_type" NOT NULL DEFAULT 'FULL_DAY',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "weekly_off_days" "WeekDay"[] DEFAULT ARRAY['SUNDAY', 'SATURDAY']::"WeekDay"[],
    "timezone" TEXT,
    "currency" TEXT,
    "settings" JSONB DEFAULT '{}',
    "max_loan_installment_percent" INTEGER NOT NULL DEFAULT 70,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT,
    "employee_code" VARCHAR(50) NOT NULL,
    "date_of_joining" TIMESTAMPTZ(6) NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "shift_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_employee_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "hr_employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_employee_contracts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "position_id" UUID,
    "department_id" UUID,
    "contract_type" "contract_type" NOT NULL,
    "status" "contract_status" NOT NULL DEFAULT 'DRAFT',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "probation_end_date" DATE,
    "total_leaves" DECIMAL(5,1) NOT NULL DEFAULT 15,
    "consumed_leaves" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_employee_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_contract_allowances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_id" UUID NOT NULL,
    "allowance_type" "allowance_type" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_contract_allowances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_salary_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_id" UUID NOT NULL,
    "effective_date" DATE NOT NULL,
    "base_salary" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'PKR',
    "salary_frequency" "salary_frequency" NOT NULL DEFAULT 'MONTHLY',
    "status" "salary_revision_status" NOT NULL DEFAULT 'CURRENT',
    "reason" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_salary_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_leave_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "duration_type" "leave_duration_type" NOT NULL DEFAULT 'FULL_DAY',
    "is_paid" BOOLEAN NOT NULL DEFAULT true,
    "total_days" DECIMAL(5,1) NOT NULL,
    "reason" TEXT,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "hr_leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_leave_request_approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "leave_request_id" UUID NOT NULL,
    "approver_id" UUID NOT NULL,
    "status" "LeaveApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "decided_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_leave_request_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_loan_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "description" TEXT,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "total_installments" INTEGER NOT NULL,
    "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "LoanRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "hr_loan_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_loan_request_approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loan_request_id" UUID NOT NULL,
    "approver_id" UUID NOT NULL,
    "status" "LoanApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "decided_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_loan_request_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_loan_installments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loan_request_id" UUID NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "return_month" VARCHAR(7) NOT NULL,
    "status" "LoanInstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_loan_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_payroll" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "paid_month" VARCHAR(7) NOT NULL,
    "gross_salary" DECIMAL(15,2) NOT NULL,
    "allowances_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "bonus_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "bonus_reason" TEXT,
    "salary_per_day" DECIMAL(15,4) NOT NULL,
    "salary_per_hour" DECIMAL(15,4) NOT NULL,
    "salary_per_minute" DECIMAL(15,6) NOT NULL,
    "total_calendar_days" INTEGER NOT NULL,
    "holidays" INTEGER NOT NULL DEFAULT 0,
    "weekends" INTEGER NOT NULL DEFAULT 0,
    "paid_leave_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "unpaid_leave_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "working_days" DECIMAL(5,1) NOT NULL,
    "present_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "absent_days" INTEGER NOT NULL DEFAULT 0,
    "absent_days_deduction" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "timing_minutes" INTEGER NOT NULL DEFAULT 0,
    "timing_deduction" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "unpaid_leave_deduction" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "loan_deduction" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(15,2) NOT NULL,
    "net_pay" DECIMAL(15,2) NOT NULL,
    "status" "payroll_status" NOT NULL DEFAULT 'DRAFT',
    "approved_by" TEXT,
    "approved_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_rosters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "employee_id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "hr_rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_attendance_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "employee_id" UUID NOT NULL,
    "check_in_time" TIMESTAMPTZ(6),
    "check_out_time" TIMESTAMPTZ(6),
    "source" "AttendanceSource" NOT NULL DEFAULT 'MANUAL',
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "hr_attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_attendance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "shift_id" UUID,
    "date" TEXT NOT NULL,
    "check_in" TEXT,
    "check_out" TEXT,
    "worked_minutes" INTEGER,
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "early_exit_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "workMode" "WorkMode" NOT NULL DEFAULT 'ON_SITE',
    "source" "AttendanceSource" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_overtimes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "employee_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "overtime_minutes" INTEGER NOT NULL,
    "approved_by" TEXT,
    "approval_status" "OvertimeApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "hr_overtimes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_salary_structures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "employee_id" UUID,
    "name" TEXT NOT NULL,
    "grade" TEXT,
    "base_salary" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMPTZ(6) NOT NULL,
    "effective_to" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "hr_salary_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_salary_structure_components" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "structure_id" UUID NOT NULL,
    "component_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "SalaryComponentKind" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "hr_salary_structure_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_payroll_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "department_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "run_date" TIMESTAMPTZ(6) NOT NULL,
    "total_employees" INTEGER DEFAULT 0,
    "total_gross_pay" DECIMAL(12,2) DEFAULT 0,
    "total_net_pay" DECIMAL(12,2) DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "hr_payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_payroll_employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "payroll_run_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "basic_salary" DECIMAL(12,2) NOT NULL,
    "gross_pay" DECIMAL(12,2) NOT NULL,
    "total_deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_pay" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "hr_payroll_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_payslips" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "employee_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "payslip_number" TEXT NOT NULL,
    "basic_salary" DECIMAL(12,2) NOT NULL,
    "gross_pay" DECIMAL(12,2) NOT NULL,
    "total_deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_pay" DECIMAL(12,2) NOT NULL,
    "pay_date" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "hr_payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_job_requisitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "department_id" UUID,
    "position_id" UUID,
    "grade" TEXT,
    "vacancies" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "closing_date" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "hr_job_requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_candidates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "resume_url" TEXT,
    "skills" TEXT[],
    "experience_years" INTEGER,
    "expected_salary" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "hr_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "requisition_id" UUID NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'APPLIED',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "applied_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "hr_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_interviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "interviewer_id" UUID NOT NULL,
    "interview_type" TEXT NOT NULL,
    "interview_date" TIMESTAMPTZ(6) NOT NULL,
    "duration_minutes" INTEGER,
    "location" TEXT,
    "meeting_link" TEXT,
    "feedback" TEXT,
    "rating" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "hr_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "application_id" UUID NOT NULL,
    "offer_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salary_offered" DECIMAL(12,2) NOT NULL,
    "start_date" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiry_date" TIMESTAMPTZ(6),
    "terms" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "hr_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_of_accounts" (
    "id" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "normalBalance" "NormalBalance" NOT NULL,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "total_debit" DECIMAL(65,30) NOT NULL,
    "total_credit" DECIMAL(65,30) NOT NULL,
    "posted_at" TIMESTAMP(3),
    "posted_by" TEXT,
    "posted_by_id" TEXT,
    "reversed_at" TIMESTAMP(3),
    "reversed_by" TEXT,
    "reversed_by_id" TEXT,
    "reversal_entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_lines" (
    "id" TEXT NOT NULL,
    "journal_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "description" TEXT,
    "debit_amount" DECIMAL(65,30),
    "credit_amount" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_bills" (
    "id" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "bill_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "total_amount" DECIMAL(65,30) NOT NULL,
    "paid_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "balance" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "journal_entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vendor_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_bill_items" (
    "id" TEXT NOT NULL,
    "bill_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(65,30) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "vendor_bill_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_payments" (
    "id" TEXT NOT NULL,
    "payment_number" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "method" TEXT NOT NULL,
    "bank_account_id" TEXT,
    "journal_entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vendor_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_payment_allocations" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "bill_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "vendor_payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_invoices" (
    "id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "total_amount" DECIMAL(65,30) NOT NULL,
    "paid_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "balance" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "journal_entry_id" TEXT,
    "items" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customer_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_ar_payments" (
    "id" TEXT NOT NULL,
    "payment_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "method" TEXT NOT NULL,
    "bank_account_id" TEXT,
    "journal_entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customer_ar_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_ar_payment_allocations" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "customer_ar_payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" TEXT NOT NULL,
    "bank_account_id" TEXT NOT NULL,
    "type" "BankTransactionType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "journal_entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" TEXT NOT NULL,
    "asset_name" TEXT NOT NULL,
    "cost" DECIMAL(65,30) NOT NULL,
    "useful_life" INTEGER NOT NULL,
    "depreciation_method" TEXT NOT NULL,
    "book_value" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depreciation_entries" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "journal_entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "depreciation_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "total_budget" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_lines" (
    "id" TEXT NOT NULL,
    "budget_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "budgeted_amount" DECIMAL(65,30) NOT NULL,
    "actual_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_materials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "uom_id" TEXT NOT NULL,
    "current_stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reserved_stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorder_level" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_purchase_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raw_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "SiteType" NOT NULL,
    "category" "SiteCategory" NOT NULL DEFAULT 'GENERAL',
    "status" "SiteStatus" NOT NULL DEFAULT 'ACTIVE',
    "parent_id" TEXT,
    "location_id" TEXT,
    "manager_id" TEXT,
    "total_capacity" DOUBLE PRECISION,
    "capacity_unit" "CapacityUnit",
    "temperature" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_dispatches" (
    "id" TEXT NOT NULL,
    "dispatch_number" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "status" "SaleDispatchStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" TEXT NOT NULL,
    "dispatch_officer_id" TEXT NOT NULL,
    "site_manager_id" TEXT NOT NULL,
    "approved_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_dispatch_items" (
    "id" TEXT NOT NULL,
    "dispatch_id" TEXT NOT NULL,
    "sale_item_id" TEXT NOT NULL,
    "product_batch_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_dispatch_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MaterialTransferToPlant" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MaterialTransferToPlant_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "categories_name_idx" ON "categories"("name");

-- CreateIndex
CREATE INDEX "categories_is_active_idx" ON "categories"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");

-- CreateIndex
CREATE INDEX "companies_name_idx" ON "companies"("name");

-- CreateIndex
CREATE INDEX "companies_is_active_idx" ON "companies"("is_active");

-- CreateIndex
CREATE INDEX "products_code_idx" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE INDEX "products_is_active_idx" ON "products"("is_active");

-- CreateIndex
CREATE INDEX "product_attributes_product_id_idx" ON "product_attributes"("product_id");

-- CreateIndex
CREATE INDEX "locations_name_idx" ON "locations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "stock_balances_product_id_location_id_key" ON "stock_balances"("product_id", "location_id");

-- CreateIndex
CREATE INDEX "stock_transactions_created_by_id_idx" ON "stock_transactions"("created_by_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_module_idx" ON "audit_logs"("module");

-- CreateIndex
CREATE INDEX "audit_logs_entity_name_entity_id_idx" ON "audit_logs"("entity_name", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");

-- CreateIndex
CREATE INDEX "suppliers_is_active_idx" ON "suppliers"("is_active");

-- CreateIndex
CREATE INDEX "suppliers_deleted_at_idx" ON "suppliers"("deleted_at");

-- CreateIndex
CREATE INDEX "supplier_transactions_supplier_id_idx" ON "supplier_transactions"("supplier_id");

-- CreateIndex
CREATE INDEX "supplier_transactions_date_idx" ON "supplier_transactions"("date");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_bank_accounts_account_number_key" ON "supplier_bank_accounts"("account_number");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_bank_accounts_iban_key" ON "supplier_bank_accounts"("iban");

-- CreateIndex
CREATE INDEX "supplier_bank_accounts_supplier_id_idx" ON "supplier_bank_accounts"("supplier_id");

-- CreateIndex
CREATE INDEX "supplier_bank_accounts_is_default_idx" ON "supplier_bank_accounts"("is_default");

-- CreateIndex
CREATE INDEX "supplier_bank_accounts_deleted_at_idx" ON "supplier_bank_accounts"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "uoms_code_key" ON "uoms"("code");

-- CreateIndex
CREATE INDEX "uoms_code_idx" ON "uoms"("code");

-- CreateIndex
CREATE INDEX "uoms_category_idx" ON "uoms"("category");

-- CreateIndex
CREATE INDEX "uoms_is_active_idx" ON "uoms"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "uoms_name_category_key" ON "uoms"("name", "category");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_barcode_key" ON "product_variants"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customer_number_key" ON "customers"("customer_number");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE INDEX "customers_customer_number_idx" ON "customers"("customer_number");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "customers_is_active_idx" ON "customers"("is_active");

-- CreateIndex
CREATE INDEX "customers_deleted_at_idx" ON "customers"("deleted_at");

-- CreateIndex
CREATE INDEX "customer_transactions_customer_id_idx" ON "customer_transactions"("customer_id");

-- CreateIndex
CREATE INDEX "customer_transactions_date_idx" ON "customer_transactions"("date");

-- CreateIndex
CREATE UNIQUE INDEX "customer_bank_accounts_account_number_key" ON "customer_bank_accounts"("account_number");

-- CreateIndex
CREATE UNIQUE INDEX "customer_bank_accounts_iban_key" ON "customer_bank_accounts"("iban");

-- CreateIndex
CREATE INDEX "customer_bank_accounts_customer_id_idx" ON "customer_bank_accounts"("customer_id");

-- CreateIndex
CREATE INDEX "customer_bank_accounts_is_default_idx" ON "customer_bank_accounts"("is_default");

-- CreateIndex
CREATE INDEX "customer_bank_accounts_deleted_at_idx" ON "customer_bank_accounts"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "sales_sale_number_key" ON "sales"("sale_number");

-- CreateIndex
CREATE INDEX "sales_created_by_idx" ON "sales"("created_by");

-- CreateIndex
CREATE INDEX "payments_processed_by_id_idx" ON "payments"("processed_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_receipt_number_key" ON "receipts"("receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "sale_refunds_refund_number_key" ON "sale_refunds"("refund_number");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_order_number_key" ON "purchase_orders"("order_number");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_orders_order_date_idx" ON "purchase_orders"("order_date");

-- CreateIndex
CREATE INDEX "purchase_orders_payment_status_idx" ON "purchase_orders"("payment_status");

-- CreateIndex
CREATE INDEX "purchase_order_approvals_purchase_order_id_idx" ON "purchase_order_approvals"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_order_approvals_approver_id_idx" ON "purchase_order_approvals"("approver_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_approvals_purchase_order_id_approver_id_key" ON "purchase_order_approvals"("purchase_order_id", "approver_id");

-- CreateIndex
CREATE INDEX "purchase_items_purchase_order_id_idx" ON "purchase_items"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_items_raw_material_id_idx" ON "purchase_items"("raw_material_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_returns_return_number_key" ON "purchase_returns"("return_number");

-- CreateIndex
CREATE INDEX "purchase_returns_purchase_order_id_idx" ON "purchase_returns"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_returns_grn_id_idx" ON "purchase_returns"("grn_id");

-- CreateIndex
CREATE INDEX "purchase_returns_status_idx" ON "purchase_returns"("status");

-- CreateIndex
CREATE INDEX "purchase_returns_return_date_idx" ON "purchase_returns"("return_date");

-- CreateIndex
CREATE INDEX "purchase_returns_return_number_idx" ON "purchase_returns"("return_number");

-- CreateIndex
CREATE INDEX "purchase_return_approvals_return_id_idx" ON "purchase_return_approvals"("return_id");

-- CreateIndex
CREATE INDEX "purchase_return_approvals_approver_id_idx" ON "purchase_return_approvals"("approver_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_return_approvals_return_id_approver_id_key" ON "purchase_return_approvals"("return_id", "approver_id");

-- CreateIndex
CREATE INDEX "purchase_payments_purchase_order_id_idx" ON "purchase_payments"("purchase_order_id");

-- CreateIndex
CREATE INDEX "customer_payments_processed_by_idx" ON "customer_payments"("processed_by");

-- CreateIndex
CREATE INDEX "purchase_return_items_return_id_idx" ON "purchase_return_items"("return_id");

-- CreateIndex
CREATE INDEX "purchase_return_items_raw_material_id_idx" ON "purchase_return_items"("raw_material_id");

-- CreateIndex
CREATE INDEX "purchase_return_items_batch_id_idx" ON "purchase_return_items"("batch_id");

-- CreateIndex
CREATE INDEX "purchase_return_items_grn_item_id_idx" ON "purchase_return_items"("grn_item_id");

-- CreateIndex
CREATE INDEX "purchase_return_items_purchase_item_id_idx" ON "purchase_return_items"("purchase_item_id");

-- CreateIndex
CREATE INDEX "cash_in_hand_counted_by_id_idx" ON "cash_in_hand"("counted_by_id");

-- CreateIndex
CREATE INDEX "cash_in_hand_approved_by_id_idx" ON "cash_in_hand"("approved_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "cash_in_hand_location_id_date_key" ON "cash_in_hand"("location_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "held_invoices_reference_number_key" ON "held_invoices"("reference_number");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "roles_name_idx" ON "roles"("name");

-- CreateIndex
CREATE INDEX "roles_is_active_idx" ON "roles"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "permissions_module_idx" ON "permissions"("module");

-- CreateIndex
CREATE INDEX "permissions_name_idx" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "sale_returns_return_number_key" ON "sale_returns"("return_number");

-- CreateIndex
CREATE INDEX "sale_returns_original_sale_id_idx" ON "sale_returns"("original_sale_id");

-- CreateIndex
CREATE INDEX "sale_returns_return_number_idx" ON "sale_returns"("return_number");

-- CreateIndex
CREATE INDEX "sale_returns_status_idx" ON "sale_returns"("status");

-- CreateIndex
CREATE INDEX "sale_returns_return_date_idx" ON "sale_returns"("return_date");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_name_key" ON "expense_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_expense_number_key" ON "expenses"("expense_number");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_cash_transaction_id_key" ON "expenses"("cash_transaction_id");

-- CreateIndex
CREATE INDEX "expenses_category_id_idx" ON "expenses"("category_id");

-- CreateIndex
CREATE INDEX "expenses_location_id_idx" ON "expenses"("location_id");

-- CreateIndex
CREATE INDEX "expenses_expense_date_idx" ON "expenses"("expense_date");

-- CreateIndex
CREATE INDEX "expenses_payment_date_idx" ON "expenses"("payment_date");

-- CreateIndex
CREATE INDEX "expenses_status_idx" ON "expenses"("status");

-- CreateIndex
CREATE INDEX "expenses_created_by_idx" ON "expenses"("created_by");

-- CreateIndex
CREATE INDEX "expenses_approved_by_idx" ON "expenses"("approved_by");

-- CreateIndex
CREATE INDEX "expenses_deleted_at_idx" ON "expenses"("deleted_at");

-- CreateIndex
CREATE INDEX "sale_return_items_return_id_idx" ON "sale_return_items"("return_id");

-- CreateIndex
CREATE INDEX "sale_return_items_original_sale_item_id_idx" ON "sale_return_items"("original_sale_item_id");

-- CreateIndex
CREATE INDEX "sale_return_items_product_id_idx" ON "sale_return_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE INDEX "warehouses_location_id_idx" ON "warehouses"("location_id");

-- CreateIndex
CREATE INDEX "warehouses_warehouse_type_idx" ON "warehouses"("warehouse_type");

-- CreateIndex
CREATE INDEX "warehouses_status_idx" ON "warehouses"("status");

-- CreateIndex
CREATE INDEX "warehouses_manager_id_idx" ON "warehouses"("manager_id");

-- CreateIndex
CREATE INDEX "warehouses_is_active_idx" ON "warehouses"("is_active");

-- CreateIndex
CREATE INDEX "warehouse_zones_warehouse_id_idx" ON "warehouse_zones"("warehouse_id");

-- CreateIndex
CREATE INDEX "warehouse_zones_zone_type_idx" ON "warehouse_zones"("zone_type");

-- CreateIndex
CREATE INDEX "warehouse_zones_is_active_idx" ON "warehouse_zones"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_zones_warehouse_id_code_key" ON "warehouse_zones"("warehouse_id", "code");

-- CreateIndex
CREATE INDEX "warehouse_stock_balances_warehouse_id_idx" ON "warehouse_stock_balances"("warehouse_id");

-- CreateIndex
CREATE INDEX "warehouse_stock_balances_zone_id_idx" ON "warehouse_stock_balances"("zone_id");

-- CreateIndex
CREATE INDEX "warehouse_stock_balances_product_id_idx" ON "warehouse_stock_balances"("product_id");

-- CreateIndex
CREATE INDEX "warehouse_stock_balances_batch_id_idx" ON "warehouse_stock_balances"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_stock_balances_warehouse_id_zone_id_product_id_ba_key" ON "warehouse_stock_balances"("warehouse_id", "zone_id", "product_id", "batch_id");

-- CreateIndex
CREATE INDEX "warehouse_capacity_alerts_warehouse_id_idx" ON "warehouse_capacity_alerts"("warehouse_id");

-- CreateIndex
CREATE INDEX "warehouse_capacity_alerts_zone_id_idx" ON "warehouse_capacity_alerts"("zone_id");

-- CreateIndex
CREATE INDEX "warehouse_capacity_alerts_alert_level_idx" ON "warehouse_capacity_alerts"("alert_level");

-- CreateIndex
CREATE INDEX "warehouse_capacity_alerts_is_resolved_idx" ON "warehouse_capacity_alerts"("is_resolved");

-- CreateIndex
CREATE INDEX "warehouse_capacity_alerts_created_at_idx" ON "warehouse_capacity_alerts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "plants_code_key" ON "plants"("code");

-- CreateIndex
CREATE INDEX "plants_location_id_idx" ON "plants"("location_id");

-- CreateIndex
CREATE INDEX "plants_manager_id_idx" ON "plants"("manager_id");

-- CreateIndex
CREATE INDEX "plants_is_active_idx" ON "plants"("is_active");

-- CreateIndex
CREATE INDEX "plants_plant_type_idx" ON "plants"("plant_type");

-- CreateIndex
CREATE INDEX "plants_status_idx" ON "plants"("status");

-- CreateIndex
CREATE INDEX "plants_name_idx" ON "plants"("name");

-- CreateIndex
CREATE INDEX "plants_code_idx" ON "plants"("code");

-- CreateIndex
CREATE UNIQUE INDEX "raw_material_batches_batch_number_key" ON "raw_material_batches"("batch_number");

-- CreateIndex
CREATE INDEX "raw_material_batches_raw_material_id_idx" ON "raw_material_batches"("raw_material_id");

-- CreateIndex
CREATE INDEX "raw_material_batches_grn_item_id_idx" ON "raw_material_batches"("grn_item_id");

-- CreateIndex
CREATE INDEX "raw_material_batches_site_id_idx" ON "raw_material_batches"("site_id");

-- CreateIndex
CREATE INDEX "raw_material_batches_batch_number_idx" ON "raw_material_batches"("batch_number");

-- CreateIndex
CREATE INDEX "raw_material_batches_status_idx" ON "raw_material_batches"("status");

-- CreateIndex
CREATE INDEX "raw_material_batches_expiry_date_idx" ON "raw_material_batches"("expiry_date");

-- CreateIndex
CREATE INDEX "raw_material_batches_received_date_idx" ON "raw_material_batches"("received_date");

-- CreateIndex
CREATE INDEX "raw_material_batches_deleted_at_idx" ON "raw_material_batches"("deleted_at");

-- CreateIndex
CREATE INDEX "raw_material_batch_consumptions_batch_id_idx" ON "raw_material_batch_consumptions"("batch_id");

-- CreateIndex
CREATE INDEX "raw_material_batch_consumptions_reference_id_idx" ON "raw_material_batch_consumptions"("reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "production_orders_order_number_key" ON "production_orders"("order_number");

-- CreateIndex
CREATE INDEX "production_orders_product_id_idx" ON "production_orders"("product_id");

-- CreateIndex
CREATE INDEX "production_orders_bom_id_idx" ON "production_orders"("bom_id");

-- CreateIndex
CREATE INDEX "production_orders_site_id_idx" ON "production_orders"("site_id");

-- CreateIndex
CREATE INDEX "production_orders_status_idx" ON "production_orders"("status");

-- CreateIndex
CREATE INDEX "production_orders_order_number_idx" ON "production_orders"("order_number");

-- CreateIndex
CREATE INDEX "production_order_materials_production_order_id_idx" ON "production_order_materials"("production_order_id");

-- CreateIndex
CREATE INDEX "production_order_materials_raw_material_id_idx" ON "production_order_materials"("raw_material_id");

-- CreateIndex
CREATE UNIQUE INDEX "production_order_materials_production_order_id_raw_material_key" ON "production_order_materials"("production_order_id", "raw_material_id");

-- CreateIndex
CREATE INDEX "production_order_material_batches_production_order_material_idx" ON "production_order_material_batches"("production_order_material_id");

-- CreateIndex
CREATE INDEX "production_order_material_batches_raw_material_batch_id_idx" ON "production_order_material_batches"("raw_material_batch_id");

-- CreateIndex
CREATE INDEX "production_order_costs_production_order_id_idx" ON "production_order_costs"("production_order_id");

-- CreateIndex
CREATE INDEX "production_order_wastes_production_order_id_idx" ON "production_order_wastes"("production_order_id");

-- CreateIndex
CREATE INDEX "production_order_wastes_raw_material_id_idx" ON "production_order_wastes"("raw_material_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_batches_batch_number_key" ON "product_batches"("batch_number");

-- CreateIndex
CREATE INDEX "product_batches_product_id_idx" ON "product_batches"("product_id");

-- CreateIndex
CREATE INDEX "product_batches_site_id_idx" ON "product_batches"("site_id");

-- CreateIndex
CREATE INDEX "product_batches_production_order_id_idx" ON "product_batches"("production_order_id");

-- CreateIndex
CREATE INDEX "product_batches_status_idx" ON "product_batches"("status");

-- CreateIndex
CREATE INDEX "product_batches_is_final_idx" ON "product_batches"("is_final");

-- CreateIndex
CREATE INDEX "product_batches_current_stage_idx" ON "product_batches"("current_stage");

-- CreateIndex
CREATE INDEX "product_batch_stages_product_batch_id_idx" ON "product_batch_stages"("product_batch_id");

-- CreateIndex
CREATE INDEX "product_batch_stages_status_idx" ON "product_batch_stages"("status");

-- CreateIndex
CREATE UNIQUE INDEX "production_lines_code_key" ON "production_lines"("code");

-- CreateIndex
CREATE INDEX "production_lines_tenantId_idx" ON "production_lines"("tenantId");

-- CreateIndex
CREATE INDEX "production_lines_plantId_idx" ON "production_lines"("plantId");

-- CreateIndex
CREATE INDEX "production_lines_isActive_idx" ON "production_lines"("isActive");

-- CreateIndex
CREATE INDEX "production_lines_name_idx" ON "production_lines"("name");

-- CreateIndex
CREATE INDEX "production_lines_code_idx" ON "production_lines"("code");

-- CreateIndex
CREATE INDEX "production_lines_status_idx" ON "production_lines"("status");

-- CreateIndex
CREATE UNIQUE INDEX "machines_code_key" ON "machines"("code");

-- CreateIndex
CREATE INDEX "machines_tenantId_idx" ON "machines"("tenantId");

-- CreateIndex
CREATE INDEX "machines_plantId_idx" ON "machines"("plantId");

-- CreateIndex
CREATE INDEX "machines_production_line_id_idx" ON "machines"("production_line_id");

-- CreateIndex
CREATE INDEX "machines_isActive_idx" ON "machines"("isActive");

-- CreateIndex
CREATE INDEX "machines_name_idx" ON "machines"("name");

-- CreateIndex
CREATE INDEX "machines_code_idx" ON "machines"("code");

-- CreateIndex
CREATE INDEX "machines_status_idx" ON "machines"("status");

-- CreateIndex
CREATE INDEX "maintenance_records_tenantId_idx" ON "maintenance_records"("tenantId");

-- CreateIndex
CREATE INDEX "maintenance_records_machineId_idx" ON "maintenance_records"("machineId");

-- CreateIndex
CREATE INDEX "maintenance_records_status_idx" ON "maintenance_records"("status");

-- CreateIndex
CREATE INDEX "maintenance_records_scheduled_date_idx" ON "maintenance_records"("scheduled_date");

-- CreateIndex
CREATE UNIQUE INDEX "material_requests_requestNumber_key" ON "material_requests"("requestNumber");

-- CreateIndex
CREATE INDEX "material_requests_tenantId_idx" ON "material_requests"("tenantId");

-- CreateIndex
CREATE INDEX "material_requests_status_idx" ON "material_requests"("status");

-- CreateIndex
CREATE INDEX "material_requests_plantId_idx" ON "material_requests"("plantId");

-- CreateIndex
CREATE INDEX "material_requests_warehouse_id_idx" ON "material_requests"("warehouse_id");

-- CreateIndex
CREATE INDEX "material_requests_requestType_idx" ON "material_requests"("requestType");

-- CreateIndex
CREATE INDEX "material_requests_requiredDate_idx" ON "material_requests"("requiredDate");

-- CreateIndex
CREATE INDEX "material_requests_requestNumber_idx" ON "material_requests"("requestNumber");

-- CreateIndex
CREATE INDEX "material_request_items_material_request_id_idx" ON "material_request_items"("material_request_id");

-- CreateIndex
CREATE INDEX "material_request_items_material_id_idx" ON "material_request_items"("material_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_transfers_transferNumber_key" ON "material_transfers"("transferNumber");

-- CreateIndex
CREATE INDEX "material_transfers_tenantId_idx" ON "material_transfers"("tenantId");

-- CreateIndex
CREATE INDEX "material_transfers_status_idx" ON "material_transfers"("status");

-- CreateIndex
CREATE INDEX "material_transfers_transferType_idx" ON "material_transfers"("transferType");

-- CreateIndex
CREATE INDEX "material_transfers_source_location_type_idx" ON "material_transfers"("source_location_type");

-- CreateIndex
CREATE INDEX "material_transfers_source_location_id_idx" ON "material_transfers"("source_location_id");

-- CreateIndex
CREATE INDEX "material_transfers_destination_location_type_idx" ON "material_transfers"("destination_location_type");

-- CreateIndex
CREATE INDEX "material_transfers_destination_location_id_idx" ON "material_transfers"("destination_location_id");

-- CreateIndex
CREATE INDEX "material_transfers_scheduled_date_idx" ON "material_transfers"("scheduled_date");

-- CreateIndex
CREATE INDEX "material_transfers_transferNumber_idx" ON "material_transfers"("transferNumber");

-- CreateIndex
CREATE INDEX "material_transfer_items_material_transfer_id_idx" ON "material_transfer_items"("material_transfer_id");

-- CreateIndex
CREATE INDEX "material_transfer_items_material_id_idx" ON "material_transfer_items"("material_id");

-- CreateIndex
CREATE UNIQUE INDEX "grn_receiving_number_key" ON "grn"("receiving_number");

-- CreateIndex
CREATE INDEX "grn_status_idx" ON "grn"("status");

-- CreateIndex
CREATE INDEX "grn_receivingType_idx" ON "grn"("receivingType");

-- CreateIndex
CREATE INDEX "grn_received_date_idx" ON "grn"("received_date");

-- CreateIndex
CREATE INDEX "grn_receiving_number_idx" ON "grn"("receiving_number");

-- CreateIndex
CREATE INDEX "grn_items_grn_id_idx" ON "grn_items"("grn_id");

-- CreateIndex
CREATE INDEX "grn_items_raw_material_id_idx" ON "grn_items"("raw_material_id");

-- CreateIndex
CREATE INDEX "grn_items_uom_id_idx" ON "grn_items"("uom_id");

-- CreateIndex
CREATE INDEX "financial_events_type_idx" ON "financial_events"("type");

-- CreateIndex
CREATE INDEX "financial_events_reference_id_idx" ON "financial_events"("reference_id");

-- CreateIndex
CREATE INDEX "financial_events_created_at_idx" ON "financial_events"("created_at");

-- CreateIndex
CREATE INDEX "stock_ledgers_product_id_idx" ON "stock_ledgers"("product_id");

-- CreateIndex
CREATE INDEX "stock_ledgers_warehouse_id_idx" ON "stock_ledgers"("warehouse_id");

-- CreateIndex
CREATE INDEX "stock_ledgers_batch_id_idx" ON "stock_ledgers"("batch_id");

-- CreateIndex
CREATE INDEX "stock_ledgers_product_batch_id_idx" ON "stock_ledgers"("product_batch_id");

-- CreateIndex
CREATE INDEX "stock_ledgers_created_at_idx" ON "stock_ledgers"("created_at");

-- CreateIndex
CREATE INDEX "stock_ledgers_created_by_id_idx" ON "stock_ledgers"("created_by_id");

-- CreateIndex
CREATE INDEX "stock_ledgers_reference_id_idx" ON "stock_ledgers"("reference_id");

-- CreateIndex
CREATE INDEX "stock_ledgers_reference_type_idx" ON "stock_ledgers"("reference_type");

-- CreateIndex
CREATE INDEX "stock_ledgers_zone_id_idx" ON "stock_ledgers"("zone_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_work_order_number_key" ON "work_orders"("work_order_number");

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_idx" ON "work_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "work_orders_production_order_id_idx" ON "work_orders"("production_order_id");

-- CreateIndex
CREATE INDEX "work_orders_status_idx" ON "work_orders"("status");

-- CreateIndex
CREATE INDEX "work_orders_scheduled_start_date_idx" ON "work_orders"("scheduled_start_date");

-- CreateIndex
CREATE INDEX "work_orders_work_order_number_idx" ON "work_orders"("work_order_number");

-- CreateIndex
CREATE UNIQUE INDEX "boms_bom_number_key" ON "boms"("bom_number");

-- CreateIndex
CREATE UNIQUE INDEX "boms_name_key" ON "boms"("name");

-- CreateIndex
CREATE INDEX "boms_product_id_idx" ON "boms"("product_id");

-- CreateIndex
CREATE INDEX "boms_status_idx" ON "boms"("status");

-- CreateIndex
CREATE INDEX "boms_bom_number_idx" ON "boms"("bom_number");

-- CreateIndex
CREATE INDEX "bom_items_bom_id_idx" ON "bom_items"("bom_id");

-- CreateIndex
CREATE INDEX "bom_items_raw_material_id_idx" ON "bom_items"("raw_material_id");

-- CreateIndex
CREATE INDEX "bom_items_uom_id_idx" ON "bom_items"("uom_id");

-- CreateIndex
CREATE UNIQUE INDEX "bom_items_bom_id_raw_material_id_key" ON "bom_items"("bom_id", "raw_material_id");

-- CreateIndex
CREATE UNIQUE INDEX "quality_control_inspection_number_key" ON "quality_control"("inspection_number");

-- CreateIndex
CREATE INDEX "quality_control_tenant_id_idx" ON "quality_control"("tenant_id");

-- CreateIndex
CREATE INDEX "quality_control_batch_id_idx" ON "quality_control"("batch_id");

-- CreateIndex
CREATE INDEX "quality_control_product_id_idx" ON "quality_control"("product_id");

-- CreateIndex
CREATE INDEX "quality_control_qualityStatus_idx" ON "quality_control"("qualityStatus");

-- CreateIndex
CREATE INDEX "quality_control_inspected_date_idx" ON "quality_control"("inspected_date");

-- CreateIndex
CREATE INDEX "quality_control_inspection_number_idx" ON "quality_control"("inspection_number");

-- CreateIndex
CREATE UNIQUE INDEX "raw_material_batch_inspections_inspection_number_key" ON "raw_material_batch_inspections"("inspection_number");

-- CreateIndex
CREATE INDEX "raw_material_batch_inspections_batch_id_idx" ON "raw_material_batch_inspections"("batch_id");

-- CreateIndex
CREATE INDEX "raw_material_batch_inspections_quality_status_idx" ON "raw_material_batch_inspections"("quality_status");

-- CreateIndex
CREATE INDEX "raw_material_batch_inspections_inspection_number_idx" ON "raw_material_batch_inspections"("inspection_number");

-- CreateIndex
CREATE UNIQUE INDEX "waste_management_waste_number_key" ON "waste_management"("waste_number");

-- CreateIndex
CREATE INDEX "waste_management_wasteType_idx" ON "waste_management"("wasteType");

-- CreateIndex
CREATE INDEX "waste_management_item_type_idx" ON "waste_management"("item_type");

-- CreateIndex
CREATE INDEX "waste_management_product_id_idx" ON "waste_management"("product_id");

-- CreateIndex
CREATE INDEX "waste_management_raw_material_id_idx" ON "waste_management"("raw_material_id");

-- CreateIndex
CREATE INDEX "waste_management_site_id_idx" ON "waste_management"("site_id");

-- CreateIndex
CREATE INDEX "waste_management_status_idx" ON "waste_management"("status");

-- CreateIndex
CREATE INDEX "waste_management_waste_number_idx" ON "waste_management"("waste_number");

-- CreateIndex
CREATE UNIQUE INDEX "settings_tenant_id_key" ON "settings"("tenant_id");

-- CreateIndex
CREATE INDEX "settings_tenant_id_idx" ON "settings"("tenant_id");

-- CreateIndex
CREATE INDEX "report_snapshots_tenant_id_idx" ON "report_snapshots"("tenant_id");

-- CreateIndex
CREATE INDEX "report_snapshots_report_type_idx" ON "report_snapshots"("report_type");

-- CreateIndex
CREATE INDEX "report_snapshots_report_date_idx" ON "report_snapshots"("report_date");

-- CreateIndex
CREATE UNIQUE INDEX "report_snapshots_tenant_id_report_type_report_date_key" ON "report_snapshots"("tenant_id", "report_type", "report_date");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_sale_id_key" ON "invoices"("sale_id");

-- CreateIndex
CREATE INDEX "invoices_created_by_idx" ON "invoices"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "brokers_broker_code_key" ON "brokers"("broker_code");

-- CreateIndex
CREATE INDEX "brokers_broker_code_idx" ON "brokers"("broker_code");

-- CreateIndex
CREATE INDEX "brokers_zone_id_idx" ON "brokers"("zone_id");

-- CreateIndex
CREATE INDEX "brokers_area_id_idx" ON "brokers"("area_id");

-- CreateIndex
CREATE INDEX "brokers_status_idx" ON "brokers"("status");

-- CreateIndex
CREATE INDEX "brokers_is_active_idx" ON "brokers"("is_active");

-- CreateIndex
CREATE INDEX "broker_products_broker_id_idx" ON "broker_products"("broker_id");

-- CreateIndex
CREATE INDEX "broker_products_product_id_idx" ON "broker_products"("product_id");

-- CreateIndex
CREATE INDEX "broker_products_category_id_idx" ON "broker_products"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "broker_products_broker_id_product_id_key" ON "broker_products"("broker_id", "product_id");

-- CreateIndex
CREATE INDEX "broker_territories_broker_id_idx" ON "broker_territories"("broker_id");

-- CreateIndex
CREATE INDEX "broker_territories_zone_id_idx" ON "broker_territories"("zone_id");

-- CreateIndex
CREATE INDEX "broker_territories_area_name_idx" ON "broker_territories"("area_name");

-- CreateIndex
CREATE UNIQUE INDEX "broker_territories_broker_id_area_name_key" ON "broker_territories"("broker_id", "area_name");

-- CreateIndex
CREATE INDEX "broker_commissions_broker_id_idx" ON "broker_commissions"("broker_id");

-- CreateIndex
CREATE INDEX "broker_commissions_sale_id_idx" ON "broker_commissions"("sale_id");

-- CreateIndex
CREATE INDEX "broker_commissions_invoice_id_idx" ON "broker_commissions"("invoice_id");

-- CreateIndex
CREATE INDEX "broker_commissions_status_idx" ON "broker_commissions"("status");

-- CreateIndex
CREATE INDEX "broker_commissions_accrued_date_idx" ON "broker_commissions"("accrued_date");

-- CreateIndex
CREATE INDEX "idx_hr_tax_rules_country_active" ON "hr_tax_rules"("country_code", "is_active");

-- CreateIndex
CREATE INDEX "idx_hr_tax_rules_effective_dates" ON "hr_tax_rules"("effective_from", "effective_to");

-- CreateIndex
CREATE UNIQUE INDEX "hr_deduction_rules_code_key" ON "hr_deduction_rules"("code");

-- CreateIndex
CREATE INDEX "idx_hr_deduction_rules_active" ON "hr_deduction_rules"("is_active");

-- CreateIndex
CREATE INDEX "idx_hr_deduction_rules_code" ON "hr_deduction_rules"("code");

-- CreateIndex
CREATE INDEX "idx_hr_working_calendars_active" ON "hr_working_calendars"("is_active");

-- CreateIndex
CREATE INDEX "idx_hr_working_calendars_year_country" ON "hr_working_calendars"("year", "country_code");

-- CreateIndex
CREATE UNIQUE INDEX "hr_salary_components_code_key" ON "hr_salary_components"("code");

-- CreateIndex
CREATE INDEX "idx_hr_salary_components_active" ON "hr_salary_components"("is_active");

-- CreateIndex
CREATE INDEX "idx_hr_salary_components_code" ON "hr_salary_components"("code");

-- CreateIndex
CREATE INDEX "idx_hr_salary_components_type" ON "hr_salary_components"("type");

-- CreateIndex
CREATE UNIQUE INDEX "hr_departments_name_key" ON "hr_departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "hr_positions_title_key" ON "hr_positions"("title");

-- CreateIndex
CREATE INDEX "idx_hr_grades_level" ON "hr_grades"("level");

-- CreateIndex
CREATE INDEX "idx_hr_grades_name" ON "hr_grades"("name");

-- CreateIndex
CREATE INDEX "idx_hr_org_units_name" ON "hr_org_units"("name");

-- CreateIndex
CREATE INDEX "idx_hr_org_units_parent_id" ON "hr_org_units"("parent_id");

-- CreateIndex
CREATE INDEX "idx_hr_org_units_type" ON "hr_org_units"("type");

-- CreateIndex
CREATE UNIQUE INDEX "hr_shifts_name_key" ON "hr_shifts"("name");

-- CreateIndex
CREATE INDEX "idx_hr_holidays_date_range" ON "hr_holidays"("start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_hr_holidays_name_start_date" ON "hr_holidays"("name", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "hr_employees_user_id_key" ON "hr_employees"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "hr_employees_employee_code_key" ON "hr_employees"("employee_code");

-- CreateIndex
CREATE INDEX "idx_hr_employees_user_id" ON "hr_employees"("user_id");

-- CreateIndex
CREATE INDEX "idx_hr_employees_status" ON "hr_employees"("status");

-- CreateIndex
CREATE INDEX "idx_hr_employee_documents_emp_type" ON "hr_employee_documents"("employee_id", "document_type");

-- CreateIndex
CREATE INDEX "idx_hr_contracts_employee_status" ON "hr_employee_contracts"("employee_id", "status");

-- CreateIndex
CREATE INDEX "idx_hr_contracts_status_end_date" ON "hr_employee_contracts"("status", "end_date");

-- CreateIndex
CREATE INDEX "idx_hr_contract_allowances_contract" ON "hr_contract_allowances"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_hr_contract_allowances_contract_type" ON "hr_contract_allowances"("contract_id", "allowance_type");

-- CreateIndex
CREATE INDEX "idx_hr_salary_revisions_contract_status" ON "hr_salary_revisions"("contract_id", "status");

-- CreateIndex
CREATE INDEX "idx_hr_leave_requests_employee_dates" ON "hr_leave_requests"("employee_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "idx_hr_leave_requests_status" ON "hr_leave_requests"("status");

-- CreateIndex
CREATE INDEX "idx_hr_leave_request_approvals_request" ON "hr_leave_request_approvals"("leave_request_id");

-- CreateIndex
CREATE INDEX "idx_hr_leave_request_approvals_approver" ON "hr_leave_request_approvals"("approver_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_hr_leave_request_approvals_request_approver" ON "hr_leave_request_approvals"("leave_request_id", "approver_id");

-- CreateIndex
CREATE INDEX "idx_hr_loan_requests_employee_status" ON "hr_loan_requests"("employee_id", "status");

-- CreateIndex
CREATE INDEX "idx_hr_loan_requests_status" ON "hr_loan_requests"("status");

-- CreateIndex
CREATE INDEX "idx_hr_loan_request_approvals_request" ON "hr_loan_request_approvals"("loan_request_id");

-- CreateIndex
CREATE INDEX "idx_hr_loan_request_approvals_approver" ON "hr_loan_request_approvals"("approver_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_hr_loan_request_approvals_request_approver" ON "hr_loan_request_approvals"("loan_request_id", "approver_id");

-- CreateIndex
CREATE INDEX "idx_hr_loan_installments_request" ON "hr_loan_installments"("loan_request_id");

-- CreateIndex
CREATE INDEX "idx_hr_loan_installments_status" ON "hr_loan_installments"("status");

-- CreateIndex
CREATE INDEX "idx_hr_loan_installments_return_month" ON "hr_loan_installments"("return_month");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_hr_loan_installments_request_number" ON "hr_loan_installments"("loan_request_id", "installment_number");

-- CreateIndex
CREATE INDEX "idx_hr_payroll_employee_status" ON "hr_payroll"("employee_id", "status");

-- CreateIndex
CREATE INDEX "idx_hr_payroll_status" ON "hr_payroll"("status");

-- CreateIndex
CREATE INDEX "idx_hr_payroll_paid_month" ON "hr_payroll"("paid_month");

-- CreateIndex
CREATE INDEX "idx_hr_payroll_created_at" ON "hr_payroll"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_hr_payroll_employee_period" ON "hr_payroll"("employee_id", "period_start");

-- CreateIndex
CREATE INDEX "idx_hr_rosters_employee_date" ON "hr_rosters"("employee_id", "date");

-- CreateIndex
CREATE INDEX "idx_hr_rosters_tenant_id_date" ON "hr_rosters"("tenant_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_hr_rosters_employee_date" ON "hr_rosters"("employee_id", "date");

-- CreateIndex
CREATE INDEX "idx_hr_attendance_logs_employee_checkin" ON "hr_attendance_logs"("employee_id", "check_in_time");

-- CreateIndex
CREATE INDEX "idx_hr_attendance_logs_tenant_id" ON "hr_attendance_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_hr_attendance_employee_date" ON "hr_attendance"("employee_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_hr_attendance_employee_date" ON "hr_attendance"("employee_id", "date");

-- CreateIndex
CREATE INDEX "idx_hr_overtimes_employee_date" ON "hr_overtimes"("employee_id", "date");

-- CreateIndex
CREATE INDEX "idx_hr_overtimes_tenant_date" ON "hr_overtimes"("tenant_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_hr_overtimes_employee_date" ON "hr_overtimes"("employee_id", "date");

-- CreateIndex
CREATE INDEX "idx_hr_salary_structures_tenant_employee_active" ON "hr_salary_structures"("tenant_id", "employee_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_hr_salary_structure_components_component" ON "hr_salary_structure_components"("component_id");

-- CreateIndex
CREATE INDEX "idx_hr_salary_structure_components_structure" ON "hr_salary_structure_components"("structure_id");

-- CreateIndex
CREATE INDEX "idx_hr_payroll_runs_department" ON "hr_payroll_runs"("department_id");

-- CreateIndex
CREATE INDEX "idx_hr_payroll_runs_tenant_year_month" ON "hr_payroll_runs"("tenant_id", "year", "month");

-- CreateIndex
CREATE INDEX "idx_hr_payroll_employees_employee" ON "hr_payroll_employees"("employee_id");

-- CreateIndex
CREATE INDEX "idx_hr_payroll_employees_tenant_run" ON "hr_payroll_employees"("tenant_id", "payroll_run_id");

-- CreateIndex
CREATE INDEX "idx_hr_payslips_employee_year_month" ON "hr_payslips"("employee_id", "year", "month");

-- CreateIndex
CREATE INDEX "idx_hr_payslips_tenant_year_month" ON "hr_payslips"("tenant_id", "year", "month");

-- CreateIndex
CREATE INDEX "idx_hr_job_requisitions_department" ON "hr_job_requisitions"("department_id");

-- CreateIndex
CREATE INDEX "idx_hr_job_requisitions_position" ON "hr_job_requisitions"("position_id");

-- CreateIndex
CREATE INDEX "idx_hr_job_requisitions_status" ON "hr_job_requisitions"("status");

-- CreateIndex
CREATE INDEX "idx_hr_job_requisitions_tenant" ON "hr_job_requisitions"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_hr_candidates_email" ON "hr_candidates"("email");

-- CreateIndex
CREATE INDEX "idx_hr_candidates_tenant" ON "hr_candidates"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_hr_applications_candidate" ON "hr_applications"("candidate_id");

-- CreateIndex
CREATE INDEX "idx_hr_applications_requisition" ON "hr_applications"("requisition_id");

-- CreateIndex
CREATE INDEX "idx_hr_applications_stage" ON "hr_applications"("stage");

-- CreateIndex
CREATE INDEX "idx_hr_interviews_application" ON "hr_interviews"("application_id");

-- CreateIndex
CREATE INDEX "idx_hr_interviews_date" ON "hr_interviews"("interview_date");

-- CreateIndex
CREATE INDEX "idx_hr_interviews_interviewer" ON "hr_interviews"("interviewer_id");

-- CreateIndex
CREATE INDEX "idx_hr_offers_application" ON "hr_offers"("application_id");

-- CreateIndex
CREATE INDEX "idx_hr_offers_status" ON "hr_offers"("status");

-- CreateIndex
CREATE INDEX "idx_hr_offers_tenant" ON "hr_offers"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_accountCode_key" ON "chart_of_accounts"("accountCode");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_entryNumber_key" ON "journal_entries"("entryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_bills_billNumber_key" ON "vendor_bills"("billNumber");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_payments_payment_number_key" ON "vendor_payments"("payment_number");

-- CreateIndex
CREATE UNIQUE INDEX "customer_invoices_invoice_number_key" ON "customer_invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "customer_ar_payments_payment_number_key" ON "customer_ar_payments"("payment_number");

-- CreateIndex
CREATE UNIQUE INDEX "budget_lines_budget_id_account_id_period_key" ON "budget_lines"("budget_id", "account_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "raw_materials_code_key" ON "raw_materials"("code");

-- CreateIndex
CREATE INDEX "raw_materials_name_idx" ON "raw_materials"("name");

-- CreateIndex
CREATE INDEX "raw_materials_code_idx" ON "raw_materials"("code");

-- CreateIndex
CREATE INDEX "raw_materials_uom_id_idx" ON "raw_materials"("uom_id");

-- CreateIndex
CREATE UNIQUE INDEX "sites_name_key" ON "sites"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sites_code_key" ON "sites"("code");

-- CreateIndex
CREATE INDEX "sites_parent_id_idx" ON "sites"("parent_id");

-- CreateIndex
CREATE INDEX "sites_location_id_idx" ON "sites"("location_id");

-- CreateIndex
CREATE INDEX "sites_manager_id_idx" ON "sites"("manager_id");

-- CreateIndex
CREATE INDEX "sites_type_idx" ON "sites"("type");

-- CreateIndex
CREATE INDEX "sites_category_idx" ON "sites"("category");

-- CreateIndex
CREATE INDEX "sites_status_idx" ON "sites"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sale_dispatches_dispatch_number_key" ON "sale_dispatches"("dispatch_number");

-- CreateIndex
CREATE INDEX "sale_dispatches_sale_id_idx" ON "sale_dispatches"("sale_id");

-- CreateIndex
CREATE INDEX "sale_dispatches_site_id_idx" ON "sale_dispatches"("site_id");

-- CreateIndex
CREATE INDEX "sale_dispatches_status_idx" ON "sale_dispatches"("status");

-- CreateIndex
CREATE INDEX "sale_dispatches_created_by_id_idx" ON "sale_dispatches"("created_by_id");

-- CreateIndex
CREATE INDEX "sale_dispatch_items_dispatch_id_idx" ON "sale_dispatch_items"("dispatch_id");

-- CreateIndex
CREATE INDEX "sale_dispatch_items_sale_item_id_idx" ON "sale_dispatch_items"("sale_item_id");

-- CreateIndex
CREATE INDEX "sale_dispatch_items_product_batch_id_idx" ON "sale_dispatch_items"("product_batch_id");

-- CreateIndex
CREATE INDEX "_MaterialTransferToPlant_B_index" ON "_MaterialTransferToPlant"("B");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "uoms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_sale_return_id_fkey" FOREIGN KEY ("sale_return_id") REFERENCES "sale_returns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_purchase_return_id_fkey" FOREIGN KEY ("purchase_return_id") REFERENCES "purchase_returns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocktakes" ADD CONSTRAINT "stocktakes_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocktakes" ADD CONSTRAINT "stocktakes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_transactions" ADD CONSTRAINT "supplier_transactions_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bank_accounts" ADD CONSTRAINT "supplier_bank_accounts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_transactions" ADD CONSTRAINT "customer_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_bank_accounts" ADD CONSTRAINT "customer_bank_accounts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_approvals" ADD CONSTRAINT "purchase_order_approvals_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "raw_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "grn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_approvals" ADD CONSTRAINT "purchase_return_approvals_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "purchase_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "supplier_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "raw_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "raw_material_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_grn_item_id_fkey" FOREIGN KEY ("grn_item_id") REFERENCES "grn_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_purchase_item_id_fkey" FOREIGN KEY ("purchase_item_id") REFERENCES "purchase_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "purchase_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_in_hand" ADD CONSTRAINT "cash_in_hand_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_cash_in_hand_id_fkey" FOREIGN KEY ("cash_in_hand_id") REFERENCES "cash_in_hand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "held_invoices" ADD CONSTRAINT "held_invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "held_invoices" ADD CONSTRAINT "held_invoices_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_original_sale_id_fkey" FOREIGN KEY ("original_sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_cash_transaction_id_fkey" FOREIGN KEY ("cash_transaction_id") REFERENCES "cash_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_original_sale_item_id_fkey" FOREIGN KEY ("original_sale_item_id") REFERENCES "sale_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "sale_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_zones" ADD CONSTRAINT "warehouse_zones_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_stock_balances" ADD CONSTRAINT "warehouse_stock_balances_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "raw_material_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_stock_balances" ADD CONSTRAINT "warehouse_stock_balances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_stock_balances" ADD CONSTRAINT "warehouse_stock_balances_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_stock_balances" ADD CONSTRAINT "warehouse_stock_balances_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "warehouse_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_capacity_alerts" ADD CONSTRAINT "warehouse_capacity_alerts_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_capacity_alerts" ADD CONSTRAINT "warehouse_capacity_alerts_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "warehouse_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plants" ADD CONSTRAINT "plants_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_material_batches" ADD CONSTRAINT "raw_material_batches_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "raw_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_material_batches" ADD CONSTRAINT "raw_material_batches_grn_item_id_fkey" FOREIGN KEY ("grn_item_id") REFERENCES "grn_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_material_batches" ADD CONSTRAINT "raw_material_batches_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_material_batch_consumptions" ADD CONSTRAINT "raw_material_batch_consumptions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "raw_material_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_bom_id_fkey" FOREIGN KEY ("bom_id") REFERENCES "boms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_materials" ADD CONSTRAINT "production_order_materials_production_order_id_fkey" FOREIGN KEY ("production_order_id") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_materials" ADD CONSTRAINT "production_order_materials_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "raw_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_materials" ADD CONSTRAINT "production_order_materials_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "uoms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_material_batches" ADD CONSTRAINT "production_order_material_batches_production_order_materia_fkey" FOREIGN KEY ("production_order_material_id") REFERENCES "production_order_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_material_batches" ADD CONSTRAINT "production_order_material_batches_raw_material_batch_id_fkey" FOREIGN KEY ("raw_material_batch_id") REFERENCES "raw_material_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_costs" ADD CONSTRAINT "production_order_costs_production_order_id_fkey" FOREIGN KEY ("production_order_id") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_wastes" ADD CONSTRAINT "production_order_wastes_production_order_id_fkey" FOREIGN KEY ("production_order_id") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_wastes" ADD CONSTRAINT "production_order_wastes_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "raw_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_wastes" ADD CONSTRAINT "production_order_wastes_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "uoms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_production_order_id_fkey" FOREIGN KEY ("production_order_id") REFERENCES "production_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batch_stages" ADD CONSTRAINT "product_batch_stages_product_batch_id_fkey" FOREIGN KEY ("product_batch_id") REFERENCES "product_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batch_stages" ADD CONSTRAINT "product_batch_stages_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_lines" ADD CONSTRAINT "production_lines_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "plants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machines" ADD CONSTRAINT "machines_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "plants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machines" ADD CONSTRAINT "machines_production_line_id_fkey" FOREIGN KEY ("production_line_id") REFERENCES "production_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "plants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_production_order_id_fkey" FOREIGN KEY ("production_order_id") REFERENCES "production_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_material_request_id_fkey" FOREIGN KEY ("material_request_id") REFERENCES "material_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_transfer_items" ADD CONSTRAINT "material_transfer_items_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_transfer_items" ADD CONSTRAINT "material_transfer_items_material_transfer_id_fkey" FOREIGN KEY ("material_transfer_id") REFERENCES "material_transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn" ADD CONSTRAINT "grn_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "grn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "raw_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "uoms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledgers" ADD CONSTRAINT "stock_ledgers_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "raw_material_batches"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_ledgers" ADD CONSTRAINT "stock_ledgers_product_batch_id_fkey" FOREIGN KEY ("product_batch_id") REFERENCES "product_batches"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_ledgers" ADD CONSTRAINT "stock_ledgers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_ledgers" ADD CONSTRAINT "stock_ledgers_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_ledgers" ADD CONSTRAINT "stock_ledgers_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "warehouse_zones"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_production_order_id_fkey" FOREIGN KEY ("production_order_id") REFERENCES "production_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boms" ADD CONSTRAINT "boms_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_bom_id_fkey" FOREIGN KEY ("bom_id") REFERENCES "boms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "raw_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "uoms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_control" ADD CONSTRAINT "quality_control_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "raw_material_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_control" ADD CONSTRAINT "quality_control_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_material_batch_inspections" ADD CONSTRAINT "raw_material_batch_inspections_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "raw_material_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_management" ADD CONSTRAINT "waste_management_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_management" ADD CONSTRAINT "waste_management_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "raw_materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_management" ADD CONSTRAINT "waste_management_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brokers" ADD CONSTRAINT "brokers_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "warehouse_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_products" ADD CONSTRAINT "broker_products_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_products" ADD CONSTRAINT "broker_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_products" ADD CONSTRAINT "broker_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_territories" ADD CONSTRAINT "broker_territories_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_commissions" ADD CONSTRAINT "broker_commissions_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_commissions" ADD CONSTRAINT "broker_commissions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_departments" ADD CONSTRAINT "hr_departments_parent_department_id_fkey" FOREIGN KEY ("parent_department_id") REFERENCES "hr_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employees" ADD CONSTRAINT "fk_hr_employees_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_employees" ADD CONSTRAINT "fk_hr_employees_shift" FOREIGN KEY ("shift_id") REFERENCES "hr_shifts"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_employee_documents" ADD CONSTRAINT "fk_hr_employee_documents_employee" FOREIGN KEY ("employee_id") REFERENCES "hr_employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_employee_contracts" ADD CONSTRAINT "fk_hr_contracts_employee" FOREIGN KEY ("employee_id") REFERENCES "hr_employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_employee_contracts" ADD CONSTRAINT "fk_hr_contracts_position" FOREIGN KEY ("position_id") REFERENCES "hr_positions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_employee_contracts" ADD CONSTRAINT "fk_hr_contracts_department" FOREIGN KEY ("department_id") REFERENCES "hr_departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_contract_allowances" ADD CONSTRAINT "fk_hr_contract_allowances_contract" FOREIGN KEY ("contract_id") REFERENCES "hr_employee_contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_salary_revisions" ADD CONSTRAINT "fk_hr_salary_revisions_contract" FOREIGN KEY ("contract_id") REFERENCES "hr_employee_contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_salary_revisions" ADD CONSTRAINT "fk_hr_salary_revisions_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "fk_hr_leave_requests_employee" FOREIGN KEY ("employee_id") REFERENCES "hr_employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_leave_request_approvals" ADD CONSTRAINT "fk_hr_leave_request_approvals_request" FOREIGN KEY ("leave_request_id") REFERENCES "hr_leave_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_loan_requests" ADD CONSTRAINT "fk_hr_loan_requests_employee" FOREIGN KEY ("employee_id") REFERENCES "hr_employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_loan_request_approvals" ADD CONSTRAINT "fk_hr_loan_request_approvals_request" FOREIGN KEY ("loan_request_id") REFERENCES "hr_loan_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_loan_installments" ADD CONSTRAINT "fk_hr_loan_installments_request" FOREIGN KEY ("loan_request_id") REFERENCES "hr_loan_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_payroll" ADD CONSTRAINT "fk_hr_payroll_employee" FOREIGN KEY ("employee_id") REFERENCES "hr_employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_payroll" ADD CONSTRAINT "fk_hr_payroll_approver" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_rosters" ADD CONSTRAINT "fk_hr_rosters_employee" FOREIGN KEY ("employee_id") REFERENCES "hr_employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_rosters" ADD CONSTRAINT "fk_hr_rosters_shift" FOREIGN KEY ("shift_id") REFERENCES "hr_shifts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_attendance_logs" ADD CONSTRAINT "fk_hr_attendance_logs_employee" FOREIGN KEY ("employee_id") REFERENCES "hr_employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_attendance" ADD CONSTRAINT "fk_hr_attendance_employee" FOREIGN KEY ("employee_id") REFERENCES "hr_employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_attendance" ADD CONSTRAINT "fk_hr_attendance_shift" FOREIGN KEY ("shift_id") REFERENCES "hr_shifts"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_overtimes" ADD CONSTRAINT "fk_hr_overtimes_employee" FOREIGN KEY ("employee_id") REFERENCES "hr_employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_payslips" ADD CONSTRAINT "hr_payslips_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_reversal_entry_id_fkey" FOREIGN KEY ("reversal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bills" ADD CONSTRAINT "vendor_bills_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bill_items" ADD CONSTRAINT "vendor_bill_items_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "vendor_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_payments" ADD CONSTRAINT "vendor_payments_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_payments" ADD CONSTRAINT "vendor_payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "supplier_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_payment_allocations" ADD CONSTRAINT "vendor_payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "vendor_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_payment_allocations" ADD CONSTRAINT "vendor_payment_allocations_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "vendor_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_ar_payments" ADD CONSTRAINT "customer_ar_payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_ar_payments" ADD CONSTRAINT "customer_ar_payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "customer_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_ar_payment_allocations" ADD CONSTRAINT "customer_ar_payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "customer_ar_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_ar_payment_allocations" ADD CONSTRAINT "customer_ar_payment_allocations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "customer_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_entries" ADD CONSTRAINT "depreciation_entries_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_materials" ADD CONSTRAINT "raw_materials_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "uoms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_dispatches" ADD CONSTRAINT "sale_dispatches_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_dispatches" ADD CONSTRAINT "sale_dispatches_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_dispatch_items" ADD CONSTRAINT "sale_dispatch_items_dispatch_id_fkey" FOREIGN KEY ("dispatch_id") REFERENCES "sale_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_dispatch_items" ADD CONSTRAINT "sale_dispatch_items_sale_item_id_fkey" FOREIGN KEY ("sale_item_id") REFERENCES "sale_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_dispatch_items" ADD CONSTRAINT "sale_dispatch_items_product_batch_id_fkey" FOREIGN KEY ("product_batch_id") REFERENCES "product_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MaterialTransferToPlant" ADD CONSTRAINT "_MaterialTransferToPlant_A_fkey" FOREIGN KEY ("A") REFERENCES "material_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MaterialTransferToPlant" ADD CONSTRAINT "_MaterialTransferToPlant_B_fkey" FOREIGN KEY ("B") REFERENCES "plants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

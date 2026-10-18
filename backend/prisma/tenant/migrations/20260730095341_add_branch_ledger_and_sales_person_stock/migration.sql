-- CreateEnum
CREATE TYPE "BranchLedgerEntryType" AS ENUM ('STOCK_RECEIVED', 'PAYMENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "AuditModule" ADD VALUE 'SALES_PERSON_ASSIGNMENTS';
ALTER TYPE "AuditModule" ADD VALUE 'SALES_PERSON_STOCK';
ALTER TYPE "AuditModule" ADD VALUE 'BRANCH_LEDGER';

-- AlterTable
ALTER TABLE "employee_cash_transfers" ADD COLUMN     "settles_branch_id" TEXT;

-- CreateTable
CREATE TABLE "sales_person_assignments" (
    "id" TEXT NOT NULL,
    "employee_id" UUID NOT NULL,
    "branch_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_person_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_person_stock_balances" (
    "id" TEXT NOT NULL,
    "employee_id" UUID NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_person_stock_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_ledgers" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "counterparty_branch_id" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "BranchLedgerEntryType" NOT NULL,
    "reference_id" TEXT,
    "distributor_id_at_time" UUID,
    "description" TEXT NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_person_assignments_employee_id_key" ON "sales_person_assignments"("employee_id");

-- CreateIndex
CREATE INDEX "sales_person_assignments_branch_id_idx" ON "sales_person_assignments"("branch_id");

-- CreateIndex
CREATE INDEX "sales_person_stock_balances_employee_id_idx" ON "sales_person_stock_balances"("employee_id");

-- CreateIndex
CREATE INDEX "sales_person_stock_balances_product_id_idx" ON "sales_person_stock_balances"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_person_stock_balances_employee_id_product_id_key" ON "sales_person_stock_balances"("employee_id", "product_id");

-- CreateIndex
CREATE INDEX "branch_ledgers_branch_id_idx" ON "branch_ledgers"("branch_id");

-- CreateIndex
CREATE INDEX "branch_ledgers_counterparty_branch_id_idx" ON "branch_ledgers"("counterparty_branch_id");

-- CreateIndex
CREATE INDEX "branch_ledgers_date_idx" ON "branch_ledgers"("date");

-- AddForeignKey
ALTER TABLE "employee_cash_transfers" ADD CONSTRAINT "employee_cash_transfers_settles_branch_id_fkey" FOREIGN KEY ("settles_branch_id") REFERENCES "sales_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_person_assignments" ADD CONSTRAINT "sales_person_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_person_assignments" ADD CONSTRAINT "sales_person_assignments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "sales_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_person_stock_balances" ADD CONSTRAINT "sales_person_stock_balances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_person_stock_balances" ADD CONSTRAINT "sales_person_stock_balances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_ledgers" ADD CONSTRAINT "branch_ledgers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "sales_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_ledgers" ADD CONSTRAINT "branch_ledgers_counterparty_branch_id_fkey" FOREIGN KEY ("counterparty_branch_id") REFERENCES "sales_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

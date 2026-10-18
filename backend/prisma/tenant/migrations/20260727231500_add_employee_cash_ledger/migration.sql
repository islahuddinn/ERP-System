-- CreateEnum
CREATE TYPE "EmployeeCashLedgerEntryType" AS ENUM ('RECOVERY_COLLECTED', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'OPENING_BALANCE');

-- AlterEnum
ALTER TYPE "AuditModule" ADD VALUE 'EMPLOYEE_CASH_TRANSFERS';

-- CreateTable
CREATE TABLE "employee_cash_ledgers" (
    "id" TEXT NOT NULL,
    "employee_id" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "EmployeeCashLedgerEntryType" NOT NULL,
    "reference" TEXT,
    "reference_id" TEXT,
    "description" TEXT NOT NULL,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_cash_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_cash_transfers" (
    "id" TEXT NOT NULL,
    "transfer_number" TEXT NOT NULL,
    "from_employee_id" UUID NOT NULL,
    "to_employee_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "transferred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_cash_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_cash_ledgers_employee_id_idx" ON "employee_cash_ledgers"("employee_id");

-- CreateIndex
CREATE INDEX "employee_cash_ledgers_date_idx" ON "employee_cash_ledgers"("date");

-- CreateIndex
CREATE INDEX "employee_cash_ledgers_reference_id_idx" ON "employee_cash_ledgers"("reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_cash_transfers_transfer_number_key" ON "employee_cash_transfers"("transfer_number");

-- CreateIndex
CREATE INDEX "employee_cash_transfers_from_employee_id_idx" ON "employee_cash_transfers"("from_employee_id");

-- CreateIndex
CREATE INDEX "employee_cash_transfers_to_employee_id_idx" ON "employee_cash_transfers"("to_employee_id");

-- AddForeignKey
ALTER TABLE "employee_cash_ledgers" ADD CONSTRAINT "employee_cash_ledgers_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_cash_transfers" ADD CONSTRAINT "employee_cash_transfers_from_employee_id_fkey" FOREIGN KEY ("from_employee_id") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_cash_transfers" ADD CONSTRAINT "employee_cash_transfers_to_employee_id_fkey" FOREIGN KEY ("to_employee_id") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

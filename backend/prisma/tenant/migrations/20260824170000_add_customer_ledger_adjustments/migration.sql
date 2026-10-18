-- CreateEnum
CREATE TYPE "CustomerLedgerAdjustmentType" AS ENUM ('CREDIT_NOTE', 'DEBIT_NOTE');

-- AlterEnum
ALTER TYPE "AuditModule" ADD VALUE 'CUSTOMER_LEDGER_ADJUSTMENTS';

-- CreateTable
CREATE TABLE "customer_ledger_adjustments" (
    "id" TEXT NOT NULL,
    "adjustment_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "type" "CustomerLedgerAdjustmentType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "adjusted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_ledger_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_ledger_adjustments_adjustment_number_key" ON "customer_ledger_adjustments"("adjustment_number");

-- CreateIndex
CREATE INDEX "customer_ledger_adjustments_customer_id_idx" ON "customer_ledger_adjustments"("customer_id");

-- CreateIndex
CREATE INDEX "customer_ledger_adjustments_type_idx" ON "customer_ledger_adjustments"("type");

-- AddForeignKey
ALTER TABLE "customer_ledger_adjustments" ADD CONSTRAINT "customer_ledger_adjustments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

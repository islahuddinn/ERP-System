-- Restore CustomerTransaction (legacy sales/POS ledger) to its original shape —
-- reverses this session's earlier, now-unwanted changes to it.
ALTER TABLE "customer_transactions" DROP COLUMN IF EXISTS "reference_id";
ALTER TABLE "customer_transactions" ADD COLUMN "updated_by" TEXT;

-- CreateTable: the new, independent ledger for customer-management's own
-- modules (customer-orders/deliveries/returns/recovery/ledger). Never
-- touched by the sales/POS module.
CREATE TABLE "customer_ledger_entries" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "CustomerTransactionType" NOT NULL,
    "reference" TEXT,
    "reference_id" TEXT,
    "description" TEXT NOT NULL,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_ledger_entries_customer_id_idx" ON "customer_ledger_entries"("customer_id");

-- CreateIndex
CREATE INDEX "customer_ledger_entries_date_idx" ON "customer_ledger_entries"("date");

-- CreateIndex
CREATE INDEX "customer_ledger_entries_reference_id_idx" ON "customer_ledger_entries"("reference_id");

-- AddForeignKey
ALTER TABLE "customer_ledger_entries" ADD CONSTRAINT "customer_ledger_entries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

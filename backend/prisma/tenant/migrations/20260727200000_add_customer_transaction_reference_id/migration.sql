-- AlterTable
ALTER TABLE "customer_transactions" ADD COLUMN "reference_id" TEXT;

-- CreateIndex
CREATE INDEX "customer_transactions_reference_id_idx" ON "customer_transactions"("reference_id");

-- AlterTable
ALTER TABLE "branch_stock_transfers"
  ADD COLUMN "cancelled_by" UUID,
  ADD COLUMN "cancelled_at" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "branch_stock_transfers"
  ADD CONSTRAINT "branch_stock_transfers_cancelled_by_fkey"
  FOREIGN KEY ("cancelled_by") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

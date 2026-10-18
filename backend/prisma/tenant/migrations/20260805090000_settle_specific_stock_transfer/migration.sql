-- DropForeignKey
ALTER TABLE "employee_cash_transfers" DROP CONSTRAINT "employee_cash_transfers_settles_branch_id_fkey";

-- AlterTable
ALTER TABLE "employee_cash_transfers" RENAME COLUMN "settles_branch_id" TO "settles_transfer_id";

-- AddForeignKey
ALTER TABLE "employee_cash_transfers" ADD CONSTRAINT "employee_cash_transfers_settles_transfer_id_fkey" FOREIGN KEY ("settles_transfer_id") REFERENCES "branch_stock_transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

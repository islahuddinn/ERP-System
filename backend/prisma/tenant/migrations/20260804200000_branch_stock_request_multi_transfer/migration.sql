-- One BranchStockRequest can now be fulfilled across multiple
-- BranchStockTransfer rows (installment delivery / follow-up shipments),
-- instead of exactly one.

-- DropIndex
DROP INDEX "branch_stock_transfers_request_id_key";

-- CreateIndex
CREATE INDEX "branch_stock_transfers_request_id_idx" ON "branch_stock_transfers"("request_id");

-- CreateEnum
CREATE TYPE "CustomerReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BranchStockReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "AuditModule" ADD VALUE 'BRANCH_STOCK_RETURNS';

-- AlterEnum
ALTER TYPE "BranchLedgerEntryType" ADD VALUE 'STOCK_RETURNED';

-- AlterTable
ALTER TABLE "customer_returns" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" UUID,
ADD COLUMN     "delivery_item_id" TEXT NOT NULL,
ADD COLUMN     "status" "CustomerReturnStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "branch_stock_returns" (
    "id" TEXT NOT NULL,
    "return_number" TEXT NOT NULL,
    "transfer_id" TEXT NOT NULL,
    "returning_branch_id" TEXT NOT NULL,
    "receiving_branch_id" TEXT,
    "status" "BranchStockReturnStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by" UUID NOT NULL,
    "approved_by" UUID,
    "request_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_stock_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_stock_return_items" (
    "id" TEXT NOT NULL,
    "return_id" TEXT NOT NULL,
    "transfer_item_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "branch_stock_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branch_stock_returns_return_number_key" ON "branch_stock_returns"("return_number");

-- CreateIndex
CREATE INDEX "branch_stock_returns_transfer_id_idx" ON "branch_stock_returns"("transfer_id");

-- CreateIndex
CREATE INDEX "branch_stock_returns_returning_branch_id_idx" ON "branch_stock_returns"("returning_branch_id");

-- CreateIndex
CREATE INDEX "branch_stock_returns_receiving_branch_id_idx" ON "branch_stock_returns"("receiving_branch_id");

-- CreateIndex
CREATE INDEX "branch_stock_returns_status_idx" ON "branch_stock_returns"("status");

-- CreateIndex
CREATE INDEX "branch_stock_return_items_return_id_idx" ON "branch_stock_return_items"("return_id");

-- CreateIndex
CREATE INDEX "branch_stock_return_items_transfer_item_id_idx" ON "branch_stock_return_items"("transfer_item_id");

-- CreateIndex
CREATE INDEX "customer_returns_delivery_item_id_idx" ON "customer_returns"("delivery_item_id");

-- CreateIndex
CREATE INDEX "customer_returns_status_idx" ON "customer_returns"("status");

-- AddForeignKey
ALTER TABLE "customer_returns" ADD CONSTRAINT "customer_returns_delivery_item_id_fkey" FOREIGN KEY ("delivery_item_id") REFERENCES "customer_delivery_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_returns" ADD CONSTRAINT "customer_returns_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_returns" ADD CONSTRAINT "branch_stock_returns_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "branch_stock_transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_returns" ADD CONSTRAINT "branch_stock_returns_returning_branch_id_fkey" FOREIGN KEY ("returning_branch_id") REFERENCES "sales_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_returns" ADD CONSTRAINT "branch_stock_returns_receiving_branch_id_fkey" FOREIGN KEY ("receiving_branch_id") REFERENCES "sales_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_returns" ADD CONSTRAINT "branch_stock_returns_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_returns" ADD CONSTRAINT "branch_stock_returns_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_return_items" ADD CONSTRAINT "branch_stock_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "branch_stock_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_return_items" ADD CONSTRAINT "branch_stock_return_items_transfer_item_id_fkey" FOREIGN KEY ("transfer_item_id") REFERENCES "branch_stock_transfer_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_return_items" ADD CONSTRAINT "branch_stock_return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


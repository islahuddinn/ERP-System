-- CreateEnum
CREATE TYPE "DistributionPricingMode" AS ENUM ('FIXED_PRICE', 'FREE_PRICE');

-- CreateEnum
CREATE TYPE "BranchStockRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BranchStockTransferStatus" AS ENUM ('PENDING', 'DISPATCHED', 'RECEIVED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "AuditModule" ADD VALUE 'BRANCH_PRODUCT_PRICES';
ALTER TYPE "AuditModule" ADD VALUE 'BRANCH_STOCK_REQUESTS';
ALTER TYPE "AuditModule" ADD VALUE 'BRANCH_STOCK_TRANSFERS';

-- AlterTable
ALTER TABLE "sales_branches" ADD COLUMN     "parent_branch_id" TEXT;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "distribution_pricing_mode" "DistributionPricingMode" NOT NULL DEFAULT 'FREE_PRICE';

-- CreateTable
CREATE TABLE "branch_product_prices" (
    "id" TEXT NOT NULL,
    "seller_branch_id" TEXT,
    "product_id" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_stock_balances" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_stock_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_stock_requests" (
    "id" TEXT NOT NULL,
    "request_number" TEXT NOT NULL,
    "requester_branch_id" TEXT NOT NULL,
    "fulfiller_branch_id" TEXT,
    "status" "BranchStockRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by" UUID NOT NULL,
    "approved_by" UUID,
    "request_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_stock_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_stock_request_items" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_price" DECIMAL(12,2),
    "total_amount" DECIMAL(12,2),

    CONSTRAINT "branch_stock_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_stock_transfers" (
    "id" TEXT NOT NULL,
    "transfer_number" TEXT NOT NULL,
    "from_branch_id" TEXT,
    "to_branch_id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "status" "BranchStockTransferStatus" NOT NULL DEFAULT 'PENDING',
    "dispatched_by" UUID,
    "dispatched_at" TIMESTAMP(3),
    "received_by" UUID,
    "received_at" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_stock_transfer_items" (
    "id" TEXT NOT NULL,
    "transfer_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "request_item_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "branch_stock_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "branch_product_prices_seller_branch_id_idx" ON "branch_product_prices"("seller_branch_id");

-- CreateIndex
CREATE INDEX "branch_product_prices_product_id_idx" ON "branch_product_prices"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "branch_product_prices_seller_branch_id_product_id_key" ON "branch_product_prices"("seller_branch_id", "product_id");

-- CreateIndex
CREATE INDEX "branch_stock_balances_branch_id_idx" ON "branch_stock_balances"("branch_id");

-- CreateIndex
CREATE INDEX "branch_stock_balances_product_id_idx" ON "branch_stock_balances"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "branch_stock_balances_branch_id_product_id_key" ON "branch_stock_balances"("branch_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "branch_stock_requests_request_number_key" ON "branch_stock_requests"("request_number");

-- CreateIndex
CREATE INDEX "branch_stock_requests_requester_branch_id_idx" ON "branch_stock_requests"("requester_branch_id");

-- CreateIndex
CREATE INDEX "branch_stock_requests_fulfiller_branch_id_idx" ON "branch_stock_requests"("fulfiller_branch_id");

-- CreateIndex
CREATE INDEX "branch_stock_requests_status_idx" ON "branch_stock_requests"("status");

-- CreateIndex
CREATE INDEX "branch_stock_request_items_request_id_idx" ON "branch_stock_request_items"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "branch_stock_transfers_transfer_number_key" ON "branch_stock_transfers"("transfer_number");

-- CreateIndex
CREATE UNIQUE INDEX "branch_stock_transfers_request_id_key" ON "branch_stock_transfers"("request_id");

-- CreateIndex
CREATE INDEX "branch_stock_transfers_from_branch_id_idx" ON "branch_stock_transfers"("from_branch_id");

-- CreateIndex
CREATE INDEX "branch_stock_transfers_to_branch_id_idx" ON "branch_stock_transfers"("to_branch_id");

-- CreateIndex
CREATE INDEX "branch_stock_transfers_status_idx" ON "branch_stock_transfers"("status");

-- CreateIndex
CREATE INDEX "branch_stock_transfer_items_transfer_id_idx" ON "branch_stock_transfer_items"("transfer_id");

-- CreateIndex
CREATE INDEX "sales_branches_parent_branch_id_idx" ON "sales_branches"("parent_branch_id");

-- AddForeignKey
ALTER TABLE "sales_branches" ADD CONSTRAINT "sales_branches_parent_branch_id_fkey" FOREIGN KEY ("parent_branch_id") REFERENCES "sales_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_product_prices" ADD CONSTRAINT "branch_product_prices_seller_branch_id_fkey" FOREIGN KEY ("seller_branch_id") REFERENCES "sales_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_product_prices" ADD CONSTRAINT "branch_product_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_balances" ADD CONSTRAINT "branch_stock_balances_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "sales_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_balances" ADD CONSTRAINT "branch_stock_balances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_requests" ADD CONSTRAINT "branch_stock_requests_requester_branch_id_fkey" FOREIGN KEY ("requester_branch_id") REFERENCES "sales_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_requests" ADD CONSTRAINT "branch_stock_requests_fulfiller_branch_id_fkey" FOREIGN KEY ("fulfiller_branch_id") REFERENCES "sales_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_requests" ADD CONSTRAINT "branch_stock_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_requests" ADD CONSTRAINT "branch_stock_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_request_items" ADD CONSTRAINT "branch_stock_request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "branch_stock_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_request_items" ADD CONSTRAINT "branch_stock_request_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_transfers" ADD CONSTRAINT "branch_stock_transfers_from_branch_id_fkey" FOREIGN KEY ("from_branch_id") REFERENCES "sales_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_transfers" ADD CONSTRAINT "branch_stock_transfers_to_branch_id_fkey" FOREIGN KEY ("to_branch_id") REFERENCES "sales_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_transfers" ADD CONSTRAINT "branch_stock_transfers_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "branch_stock_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_transfers" ADD CONSTRAINT "branch_stock_transfers_dispatched_by_fkey" FOREIGN KEY ("dispatched_by") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_transfers" ADD CONSTRAINT "branch_stock_transfers_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_transfer_items" ADD CONSTRAINT "branch_stock_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "branch_stock_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_transfer_items" ADD CONSTRAINT "branch_stock_transfer_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_stock_transfer_items" ADD CONSTRAINT "branch_stock_transfer_items_request_item_id_fkey" FOREIGN KEY ("request_item_id") REFERENCES "branch_stock_request_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

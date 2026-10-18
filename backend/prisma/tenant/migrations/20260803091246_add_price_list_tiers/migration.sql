-- CreateEnum
CREATE TYPE "PriceListTier" AS ENUM ('FACTORY_PRICE', 'DISTRIBUTOR_PRICE', 'TRADE_PRICE', 'MRP');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "AuditModule" ADD VALUE 'PRICE_LISTS';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "price_tier" "PriceListTier" NOT NULL DEFAULT 'TRADE_PRICE';

-- AlterTable
ALTER TABLE "sales_branches" ADD COLUMN     "price_tier" "PriceListTier";

-- CreateTable
CREATE TABLE "price_list_entries" (
    "id" TEXT NOT NULL,
    "tier" "PriceListTier" NOT NULL,
    "product_id" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_list_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_list_entries_tier_idx" ON "price_list_entries"("tier");

-- CreateIndex
CREATE INDEX "price_list_entries_product_id_idx" ON "price_list_entries"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "price_list_entries_tier_product_id_key" ON "price_list_entries"("tier", "product_id");

-- AddForeignKey
ALTER TABLE "price_list_entries" ADD CONSTRAINT "price_list_entries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

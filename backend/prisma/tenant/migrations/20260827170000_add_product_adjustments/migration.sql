-- CreateEnum
CREATE TYPE "ProductAdjustmentType" AS ENUM ('ADDITION', 'DEDUCTION');

-- CreateTable
CREATE TABLE "product_adjustments" (
    "id" TEXT NOT NULL,
    "adjustment_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "type" "ProductAdjustmentType" NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "adjusted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_adjustments_adjustment_number_key" ON "product_adjustments"("adjustment_number");

-- CreateIndex
CREATE INDEX "product_adjustments_customer_id_idx" ON "product_adjustments"("customer_id");

-- CreateIndex
CREATE INDEX "product_adjustments_product_id_idx" ON "product_adjustments"("product_id");

-- CreateIndex
CREATE INDEX "product_adjustments_type_idx" ON "product_adjustments"("type");

-- AddForeignKey
ALTER TABLE "product_adjustments" ADD CONSTRAINT "product_adjustments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_adjustments" ADD CONSTRAINT "product_adjustments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterEnum
ALTER TYPE "AuditModule" ADD VALUE 'CUSTOMER_PRODUCT_ADJUSTMENTS';

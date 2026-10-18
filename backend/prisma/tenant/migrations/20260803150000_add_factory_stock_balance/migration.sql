-- AlterEnum
ALTER TYPE "AuditModule" ADD VALUE 'FACTORY_STOCK';

-- CreateTable
CREATE TABLE "factory_stock_balances" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factory_stock_balances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "factory_stock_balances_product_id_key" ON "factory_stock_balances"("product_id");

-- AddForeignKey
ALTER TABLE "factory_stock_balances" ADD CONSTRAINT "factory_stock_balances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

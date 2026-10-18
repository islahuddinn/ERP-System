-- AlterEnum
ALTER TYPE "AuditModule" ADD VALUE 'CUSTOMER_ORDERS';

-- CreateEnum
CREATE TYPE "CustomerOrderStatus" AS ENUM ('PENDING', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CANCELLED');

-- DropForeignKey (old flat CustomerDelivery — table had 0 rows, replaced by header+items below)
ALTER TABLE "customer_deliveries" DROP CONSTRAINT "customer_deliveries_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "customer_deliveries" DROP CONSTRAINT "customer_deliveries_sales_person_id_fkey";

-- DropForeignKey
ALTER TABLE "customer_deliveries" DROP CONSTRAINT "customer_deliveries_product_id_fkey";

-- DropTable
DROP TABLE "customer_deliveries";

-- CreateTable
CREATE TABLE "customer_orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "sales_person_id" UUID NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "CustomerOrderStatus" NOT NULL DEFAULT 'PENDING',
    "total_amount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "customer_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_deliveries" (
    "id" TEXT NOT NULL,
    "delivery_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "sales_person_id" UUID NOT NULL,
    "order_id" TEXT,
    "delivery_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_delivery_items" (
    "id" TEXT NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "order_item_id" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "customer_delivery_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_orders_order_number_key" ON "customer_orders"("order_number");

-- CreateIndex
CREATE INDEX "customer_orders_customer_id_idx" ON "customer_orders"("customer_id");

-- CreateIndex
CREATE INDEX "customer_orders_sales_person_id_idx" ON "customer_orders"("sales_person_id");

-- CreateIndex
CREATE INDEX "customer_orders_status_idx" ON "customer_orders"("status");

-- CreateIndex
CREATE INDEX "customer_order_items_order_id_idx" ON "customer_order_items"("order_id");

-- CreateIndex
CREATE INDEX "customer_order_items_product_id_idx" ON "customer_order_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_deliveries_delivery_number_key" ON "customer_deliveries"("delivery_number");

-- CreateIndex
CREATE INDEX "customer_deliveries_customer_id_idx" ON "customer_deliveries"("customer_id");

-- CreateIndex
CREATE INDEX "customer_deliveries_sales_person_id_idx" ON "customer_deliveries"("sales_person_id");

-- CreateIndex
CREATE INDEX "customer_deliveries_order_id_idx" ON "customer_deliveries"("order_id");

-- CreateIndex
CREATE INDEX "customer_delivery_items_delivery_id_idx" ON "customer_delivery_items"("delivery_id");

-- CreateIndex
CREATE INDEX "customer_delivery_items_product_id_idx" ON "customer_delivery_items"("product_id");

-- CreateIndex
CREATE INDEX "customer_delivery_items_order_item_id_idx" ON "customer_delivery_items"("order_item_id");

-- AddForeignKey
ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_sales_person_id_fkey" FOREIGN KEY ("sales_person_id") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_order_items" ADD CONSTRAINT "customer_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "customer_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_order_items" ADD CONSTRAINT "customer_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_deliveries" ADD CONSTRAINT "customer_deliveries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_deliveries" ADD CONSTRAINT "customer_deliveries_sales_person_id_fkey" FOREIGN KEY ("sales_person_id") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_deliveries" ADD CONSTRAINT "customer_deliveries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "customer_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_delivery_items" ADD CONSTRAINT "customer_delivery_items_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "customer_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_delivery_items" ADD CONSTRAINT "customer_delivery_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_delivery_items" ADD CONSTRAINT "customer_delivery_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "customer_order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

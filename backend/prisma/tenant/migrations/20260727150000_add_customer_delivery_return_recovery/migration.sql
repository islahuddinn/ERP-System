-- AlterEnum
ALTER TYPE "AuditModule" ADD VALUE 'CUSTOMER_DELIVERIES';
ALTER TYPE "AuditModule" ADD VALUE 'CUSTOMER_RETURNS';
ALTER TYPE "AuditModule" ADD VALUE 'CUSTOMER_RECOVERIES';

-- CreateEnum
CREATE TYPE "CustomerReturnReason" AS ENUM ('DAMAGED', 'UNSOLD', 'EXPIRED', 'OTHER');

-- CreateTable
CREATE TABLE "customer_deliveries" (
    "id" TEXT NOT NULL,
    "delivery_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "sales_person_id" UUID NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "delivery_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_returns" (
    "id" TEXT NOT NULL,
    "return_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "sales_person_id" UUID NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "reason" "CustomerReturnReason" NOT NULL,
    "return_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_recoveries" (
    "id" TEXT NOT NULL,
    "recovery_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "sales_person_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_mode" "PaymentMethod" NOT NULL,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_recoveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_deliveries_delivery_number_key" ON "customer_deliveries"("delivery_number");

-- CreateIndex
CREATE INDEX "customer_deliveries_customer_id_idx" ON "customer_deliveries"("customer_id");

-- CreateIndex
CREATE INDEX "customer_deliveries_sales_person_id_idx" ON "customer_deliveries"("sales_person_id");

-- CreateIndex
CREATE INDEX "customer_deliveries_product_id_idx" ON "customer_deliveries"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_returns_return_number_key" ON "customer_returns"("return_number");

-- CreateIndex
CREATE INDEX "customer_returns_customer_id_idx" ON "customer_returns"("customer_id");

-- CreateIndex
CREATE INDEX "customer_returns_sales_person_id_idx" ON "customer_returns"("sales_person_id");

-- CreateIndex
CREATE INDEX "customer_returns_product_id_idx" ON "customer_returns"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_recoveries_recovery_number_key" ON "customer_recoveries"("recovery_number");

-- CreateIndex
CREATE INDEX "customer_recoveries_customer_id_idx" ON "customer_recoveries"("customer_id");

-- CreateIndex
CREATE INDEX "customer_recoveries_sales_person_id_idx" ON "customer_recoveries"("sales_person_id");

-- AddForeignKey
ALTER TABLE "customer_deliveries" ADD CONSTRAINT "customer_deliveries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_deliveries" ADD CONSTRAINT "customer_deliveries_sales_person_id_fkey" FOREIGN KEY ("sales_person_id") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_deliveries" ADD CONSTRAINT "customer_deliveries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_returns" ADD CONSTRAINT "customer_returns_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_returns" ADD CONSTRAINT "customer_returns_sales_person_id_fkey" FOREIGN KEY ("sales_person_id") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_returns" ADD CONSTRAINT "customer_returns_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_recoveries" ADD CONSTRAINT "customer_recoveries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_recoveries" ADD CONSTRAINT "customer_recoveries_sales_person_id_fkey" FOREIGN KEY ("sales_person_id") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

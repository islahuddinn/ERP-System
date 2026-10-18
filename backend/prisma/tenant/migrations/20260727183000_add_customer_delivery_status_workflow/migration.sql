-- CreateEnum
CREATE TYPE "CustomerDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'CANCELLED');

-- AlterTable
ALTER TABLE "customer_deliveries"
  ADD COLUMN "status" "CustomerDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "delivered_by_id" UUID,
  ADD COLUMN "delivered_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "customer_deliveries_delivered_by_id_idx" ON "customer_deliveries"("delivered_by_id");

-- CreateIndex
CREATE INDEX "customer_deliveries_status_idx" ON "customer_deliveries"("status");

-- AddForeignKey
ALTER TABLE "customer_deliveries" ADD CONSTRAINT "customer_deliveries_delivered_by_id_fkey" FOREIGN KEY ("delivered_by_id") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

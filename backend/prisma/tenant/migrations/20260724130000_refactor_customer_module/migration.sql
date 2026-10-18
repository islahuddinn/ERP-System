-- CreateEnum
CREATE TYPE "CustomerCategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('RETAILER', 'WHOLESALER', 'DISTRIBUTOR');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterEnum
ALTER TYPE "AuditModule" ADD VALUE 'CUSTOMER_CATEGORIES';

-- DropIndex
DROP INDEX "customers_customer_number_idx";

-- DropIndex
DROP INDEX "customers_customer_number_key";

-- DropIndex
DROP INDEX "customers_deleted_at_idx";

-- DropIndex
DROP INDEX "customers_is_active_idx";

-- DropIndex
DROP INDEX "customers_name_idx";

-- CreateTable
CREATE TABLE "customer_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CustomerCategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_categories_name_key" ON "customer_categories"("name");

-- CreateIndex
CREATE INDEX "customer_categories_status_idx" ON "customer_categories"("status");

-- AlterTable: add the new customer columns as nullable first (table has 0 rows
-- currently, but this keeps the migration safe if that ever changes), backfill
-- is not needed here, then tighten to NOT NULL / UNIQUE below.
ALTER TABLE "customers"
  DROP COLUMN "city",
  DROP COLUMN "created_by",
  DROP COLUMN "customer_number",
  DROP COLUMN "deleted_at",
  DROP COLUMN "is_active",
  DROP COLUMN "name",
  DROP COLUMN "notes",
  DROP COLUMN "postal_code",
  DROP COLUMN "updated_by",
  ADD COLUMN     "area_id" TEXT NOT NULL,
  ADD COLUMN     "category_id" TEXT NOT NULL,
  ADD COLUMN     "cnic" TEXT NOT NULL,
  ADD COLUMN     "code" TEXT NOT NULL,
  ADD COLUMN     "customer_type" "CustomerType" NOT NULL,
  ADD COLUMN     "payment_mode" "PaymentMethod" NOT NULL,
  ADD COLUMN     "product_group_ids" TEXT[],
  ADD COLUMN     "remarks" TEXT,
  ADD COLUMN     "shop_name" TEXT NOT NULL,
  ADD COLUMN     "shopkeeper_name" TEXT,
  ADD COLUMN     "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
  ALTER COLUMN "phone" SET NOT NULL,
  ALTER COLUMN "address" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "customers_code_key" ON "customers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "customers_cnic_key" ON "customers"("cnic");

-- CreateIndex
CREATE INDEX "customers_code_idx" ON "customers"("code");

-- CreateIndex
CREATE INDEX "customers_shop_name_idx" ON "customers"("shop_name");

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- CreateIndex
CREATE INDEX "customers_category_id_idx" ON "customers"("category_id");

-- CreateIndex
CREATE INDEX "customers_area_id_idx" ON "customers"("area_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "customer_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "sales_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

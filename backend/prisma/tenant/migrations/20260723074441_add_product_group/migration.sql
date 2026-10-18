-- CreateEnum
CREATE TYPE "ProductGroupStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterEnum
ALTER TYPE "AuditModule" ADD VALUE 'SALES_MANAGEMENT_PRODUCT_GROUPS';

-- CreateTable
CREATE TABLE "sales_product_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProductGroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_product_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_product_groups_name_key" ON "sales_product_groups"("name");

-- CreateIndex
CREATE INDEX "sales_product_groups_status_idx" ON "sales_product_groups"("status");

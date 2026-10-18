-- CreateEnum
CREATE TYPE "ProductBrandStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ProductCategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditModule" ADD VALUE 'PRODUCT_MANAGEMENT_BRANDS';
ALTER TYPE "AuditModule" ADD VALUE 'PRODUCT_MANAGEMENT_CATEGORIES';

-- CreateTable
CREATE TABLE "product_brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProductBrandStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProductCategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_brands_name_key" ON "product_brands"("name");

-- CreateIndex
CREATE INDEX "product_brands_status_idx" ON "product_brands"("status");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_name_key" ON "product_categories"("name");

-- CreateIndex
CREATE INDEX "product_categories_status_idx" ON "product_categories"("status");

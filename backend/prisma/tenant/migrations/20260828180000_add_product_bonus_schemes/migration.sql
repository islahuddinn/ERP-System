-- CreateEnum
CREATE TYPE "ProductBonusSchemeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ProductBonusSchemeType" AS ENUM ('QTY_BONUS');

-- CreateTable
CREATE TABLE "product_bonus_schemes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "product_bonus_group_id" TEXT NOT NULL,
    "type" "ProductBonusSchemeType" NOT NULL DEFAULT 'QTY_BONUS',
    "min_purchase_qty" DECIMAL(12,3) NOT NULL,
    "bonus_qty" DECIMAL(12,3) NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3),
    "status" "ProductBonusSchemeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_bonus_schemes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_bonus_schemes_code_key" ON "product_bonus_schemes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "product_bonus_schemes_name_key" ON "product_bonus_schemes"("name");

-- CreateIndex
CREATE INDEX "product_bonus_schemes_product_bonus_group_id_idx" ON "product_bonus_schemes"("product_bonus_group_id");

-- CreateIndex
CREATE INDEX "product_bonus_schemes_status_idx" ON "product_bonus_schemes"("status");

-- CreateIndex
CREATE INDEX "product_bonus_schemes_valid_from_idx" ON "product_bonus_schemes"("valid_from");

-- CreateIndex
CREATE INDEX "product_bonus_schemes_valid_to_idx" ON "product_bonus_schemes"("valid_to");

-- AddForeignKey
ALTER TABLE "product_bonus_schemes" ADD CONSTRAINT "product_bonus_schemes_product_bonus_group_id_fkey" FOREIGN KEY ("product_bonus_group_id") REFERENCES "product_bonus_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterEnum
ALTER TYPE "AuditModule" ADD VALUE 'SALES_MANAGEMENT_PRODUCT_BONUS_SCHEMES';

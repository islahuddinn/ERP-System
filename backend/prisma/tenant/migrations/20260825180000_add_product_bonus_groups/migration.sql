-- CreateEnum
CREATE TYPE "ProductBonusGroupStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "product_bonus_groups" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProductBonusGroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_bonus_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_bonus_group_products" (
    "id" TEXT NOT NULL,
    "product_bonus_group_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,

    CONSTRAINT "product_bonus_group_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_bonus_groups_code_key" ON "product_bonus_groups"("code");

-- CreateIndex
CREATE UNIQUE INDEX "product_bonus_groups_name_key" ON "product_bonus_groups"("name");

-- CreateIndex
CREATE INDEX "product_bonus_groups_status_idx" ON "product_bonus_groups"("status");

-- CreateIndex
CREATE INDEX "product_bonus_group_products_product_id_idx" ON "product_bonus_group_products"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_bonus_group_products_product_bonus_group_id_product_id_key" ON "product_bonus_group_products"("product_bonus_group_id", "product_id");

-- AddForeignKey
ALTER TABLE "product_bonus_group_products" ADD CONSTRAINT "product_bonus_group_products_product_bonus_group_id_fkey" FOREIGN KEY ("product_bonus_group_id") REFERENCES "product_bonus_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bonus_group_products" ADD CONSTRAINT "product_bonus_group_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterEnum
ALTER TYPE "AuditModule" ADD VALUE 'SALES_MANAGEMENT_PRODUCT_BONUS_GROUPS';

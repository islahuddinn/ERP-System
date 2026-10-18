-- AlterEnum
-- Product Group moved from the sales-management domain into product-management;
-- renaming (not adding+dropping) preserves any rows already written with the old value.
ALTER TYPE "AuditModule" RENAME VALUE 'SALES_MANAGEMENT_PRODUCT_GROUPS' TO 'PRODUCT_MANAGEMENT_PRODUCT_GROUPS';

-- RenameTable
ALTER TABLE "sales_product_groups" RENAME TO "product_groups";
ALTER TABLE "product_groups" RENAME CONSTRAINT "sales_product_groups_pkey" TO "product_groups_pkey";

-- RenameIndex
ALTER INDEX "sales_product_groups_name_key" RENAME TO "product_groups_name_key";
ALTER INDEX "sales_product_groups_status_idx" RENAME TO "product_groups_status_idx";

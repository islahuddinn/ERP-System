-- AlterTable
-- Dropping "updated_by" — verified zero rows in the table have it set, and no
-- code anywhere (old sales/POS module or the new customer-management modules)
-- ever writes to it.
ALTER TABLE "customer_transactions" DROP COLUMN "updated_by";

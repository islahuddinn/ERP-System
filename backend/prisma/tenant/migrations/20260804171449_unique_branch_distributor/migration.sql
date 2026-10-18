-- DropIndex
DROP INDEX "sales_branches_distributor_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "sales_branches_distributor_id_key" ON "sales_branches"("distributor_id");

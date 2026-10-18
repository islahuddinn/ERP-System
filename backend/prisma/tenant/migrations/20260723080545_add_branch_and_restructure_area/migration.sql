-- AlterEnum
ALTER TYPE "AuditModule" ADD VALUE 'SALES_MANAGEMENT_BRANCHES';

-- DropForeignKey
ALTER TABLE "sales_areas" DROP CONSTRAINT "sales_areas_city_id_fkey";

-- DropIndex
DROP INDEX "sales_areas_city_id_idx";

-- DropIndex
DROP INDEX "sales_areas_name_city_id_key";

-- AlterTable
ALTER TABLE "sales_areas" DROP COLUMN "city_id",
ADD COLUMN     "branch_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "sales_branches" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "distributor_id" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "product_group_ids" TEXT[],
    "status" "TerritoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_branches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_branches_code_key" ON "sales_branches"("code");

-- CreateIndex
CREATE INDEX "sales_branches_city_id_idx" ON "sales_branches"("city_id");

-- CreateIndex
CREATE INDEX "sales_branches_distributor_id_idx" ON "sales_branches"("distributor_id");

-- CreateIndex
CREATE INDEX "sales_branches_status_idx" ON "sales_branches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sales_branches_name_city_id_key" ON "sales_branches"("name", "city_id");

-- CreateIndex
CREATE INDEX "sales_areas_branch_id_idx" ON "sales_areas"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_areas_name_branch_id_key" ON "sales_areas"("name", "branch_id");

-- AddForeignKey
ALTER TABLE "sales_branches" ADD CONSTRAINT "sales_branches_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "sales_cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_branches" ADD CONSTRAINT "sales_branches_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_areas" ADD CONSTRAINT "sales_areas_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "sales_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


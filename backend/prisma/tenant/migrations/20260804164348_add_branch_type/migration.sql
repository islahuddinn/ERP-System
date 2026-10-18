-- CreateEnum
CREATE TYPE "BranchType" AS ENUM ('PRIMARY', 'SECONDARY');

-- AlterTable
ALTER TABLE "sales_branches" ADD COLUMN "type" "BranchType" NOT NULL DEFAULT 'PRIMARY';

-- Backfill: existing branches with a parent become SECONDARY, the rest stay PRIMARY
UPDATE "sales_branches" SET "type" = 'SECONDARY' WHERE "parent_branch_id" IS NOT NULL;

-- CreateIndex
CREATE INDEX "sales_branches_type_idx" ON "sales_branches"("type");

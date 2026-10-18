/*
  Warnings:

  - You are about to drop the column `rating` on the `hr_interviews` table. All the data in the column will be lost.
  - Added the required column `tenant_id` to the `hr_applications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `hr_interviews` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "hr_applications" ADD COLUMN     "tenant_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "hr_deduction_rules" ADD COLUMN     "effective_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "effective_to" TIMESTAMPTZ(6),
ADD COLUMN     "is_statutory" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "hr_interviews" DROP COLUMN "rating",
ADD COLUMN     "result" TEXT,
ADD COLUMN     "tenant_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "hr_job_requisitions" ADD COLUMN     "employment_type" TEXT NOT NULL DEFAULT 'FULL_TIME';

-- CreateIndex
CREATE INDEX "idx_hr_applications_tenant" ON "hr_applications"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_hr_interviews_tenant" ON "hr_interviews"("tenant_id");

-- AddForeignKey
ALTER TABLE "hr_job_requisitions" ADD CONSTRAINT "fk_hr_job_requisitions_department" FOREIGN KEY ("department_id") REFERENCES "hr_departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_job_requisitions" ADD CONSTRAINT "fk_hr_job_requisitions_position" FOREIGN KEY ("position_id") REFERENCES "hr_positions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_applications" ADD CONSTRAINT "fk_hr_applications_candidate" FOREIGN KEY ("candidate_id") REFERENCES "hr_candidates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_applications" ADD CONSTRAINT "fk_hr_applications_requisition" FOREIGN KEY ("requisition_id") REFERENCES "hr_job_requisitions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_interviews" ADD CONSTRAINT "fk_hr_interviews_application" FOREIGN KEY ("application_id") REFERENCES "hr_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_offers" ADD CONSTRAINT "fk_hr_offers_application" FOREIGN KEY ("application_id") REFERENCES "hr_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

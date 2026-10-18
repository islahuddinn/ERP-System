-- AlterEnum
ALTER TYPE "AuditModule" ADD VALUE 'HR_DESIGNATIONS';

-- AlterTable
ALTER TABLE "hr_employee_contracts" ADD COLUMN     "designation_id" UUID;

-- CreateTable
CREATE TABLE "hr_designations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "parent_designation_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_designations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hr_designations_title_key" ON "hr_designations"("title");

-- AddForeignKey
ALTER TABLE "hr_designations" ADD CONSTRAINT "hr_designations_parent_designation_id_fkey" FOREIGN KEY ("parent_designation_id") REFERENCES "hr_designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee_contracts" ADD CONSTRAINT "fk_hr_contracts_designation" FOREIGN KEY ("designation_id") REFERENCES "hr_designations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

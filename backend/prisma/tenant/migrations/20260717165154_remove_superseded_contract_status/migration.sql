-- AlterEnum
BEGIN;
CREATE TYPE "contract_status_new" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');
ALTER TABLE "hr_employee_contracts" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "hr_employee_contracts" ALTER COLUMN "status" TYPE "contract_status_new" USING ("status"::text::"contract_status_new");
ALTER TYPE "contract_status" RENAME TO "contract_status_old";
ALTER TYPE "contract_status_new" RENAME TO "contract_status";
DROP TYPE "contract_status_old";
ALTER TABLE "hr_employee_contracts" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;


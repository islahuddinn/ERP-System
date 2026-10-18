-- CreateEnum
CREATE TYPE "EmployeeCashTransferStatus" AS ENUM ('PENDING', 'RECEIVED', 'REJECTED');

-- AlterTable
ALTER TABLE "employee_cash_transfers" DROP COLUMN "notes",
ADD COLUMN     "receiver_notes" TEXT,
ADD COLUMN     "responded_at" TIMESTAMP(3),
ADD COLUMN     "sender_notes" TEXT,
ADD COLUMN     "status" "EmployeeCashTransferStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "employee_cash_transfers_status_idx" ON "employee_cash_transfers"("status");

-- CreateEnum
CREATE TYPE "CustomerLedgerEntryType" AS ENUM ('DELIVERY', 'RETURN', 'RECOVERY', 'ADJUSTMENT', 'OPENING_BALANCE');

-- AlterTable: customer_ledgers has 0 rows (fresh table), so the column can be
-- dropped and recreated with the new enum type directly, no data to migrate.
ALTER TABLE "customer_ledgers" DROP COLUMN "type";
ALTER TABLE "customer_ledgers" ADD COLUMN "type" "CustomerLedgerEntryType" NOT NULL;

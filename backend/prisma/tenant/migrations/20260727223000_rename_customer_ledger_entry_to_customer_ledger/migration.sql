-- Rename: CustomerLedgerEntry -> CustomerLedger (table had 0 rows, fresh from
-- the previous migration — simple rename, no data to move).
ALTER TABLE "customer_ledger_entries" RENAME TO "customer_ledgers";

ALTER TABLE "customer_ledgers" RENAME CONSTRAINT "customer_ledger_entries_pkey" TO "customer_ledgers_pkey";
ALTER TABLE "customer_ledgers" RENAME CONSTRAINT "customer_ledger_entries_customer_id_fkey" TO "customer_ledgers_customer_id_fkey";

ALTER INDEX "customer_ledger_entries_customer_id_idx" RENAME TO "customer_ledgers_customer_id_idx";
ALTER INDEX "customer_ledger_entries_date_idx" RENAME TO "customer_ledgers_date_idx";
ALTER INDEX "customer_ledger_entries_reference_id_idx" RENAME TO "customer_ledgers_reference_id_idx";

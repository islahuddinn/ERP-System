-- A transfer is now created already-shipped: creating it and dispatching
-- it are the same action, never two separate steps. The dispatched-vs-
-- committed distinction this column tracked no longer applies.
ALTER TABLE "branch_stock_transfer_items" DROP COLUMN "dispatched_quantity";

-- New transfers are created directly as DISPATCHED, not PENDING.
ALTER TABLE "branch_stock_transfers" ALTER COLUMN "status" SET DEFAULT 'DISPATCHED';

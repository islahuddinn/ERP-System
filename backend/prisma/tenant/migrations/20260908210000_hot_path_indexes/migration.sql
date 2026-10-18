-- Phase 4: indexes for login, stock list, POS checkout, and GRN receive hot paths.

CREATE INDEX IF NOT EXISTS "sales_sale_date_idx" ON "sales"("sale_date");
CREATE INDEX IF NOT EXISTS "sales_status_idx" ON "sales"("status");
CREATE INDEX IF NOT EXISTS "sales_customer_id_idx" ON "sales"("customer_id");

CREATE INDEX IF NOT EXISTS "sale_items_sale_id_idx" ON "sale_items"("sale_id");
CREATE INDEX IF NOT EXISTS "sale_items_product_id_idx" ON "sale_items"("product_id");

CREATE INDEX IF NOT EXISTS "payments_sale_id_idx" ON "payments"("sale_id");

CREATE INDEX IF NOT EXISTS "purchase_items_purchase_order_id_raw_material_id_idx"
  ON "purchase_items"("purchase_order_id", "raw_material_id");

CREATE INDEX IF NOT EXISTS "warehouse_stock_balances_warehouse_id_product_id_idx"
  ON "warehouse_stock_balances"("warehouse_id", "product_id");

CREATE INDEX IF NOT EXISTS "raw_material_batches_raw_material_id_status_received_date_idx"
  ON "raw_material_batches"("raw_material_id", "status", "received_date");

CREATE INDEX IF NOT EXISTS "grn_purchase_order_id_idx" ON "grn"("purchase_order_id");

CREATE INDEX IF NOT EXISTS "stock_ledgers_product_id_warehouse_id_created_at_idx"
  ON "stock_ledgers"("product_id", "warehouse_id", "created_at");

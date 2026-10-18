export type GlPostingException = {
  module: string;
  reason: string;
};

/**
 * Operational movements that do not post a journal, with a business reason.
 * Everything not listed here must post through GlPostingService.
 */
export const GL_POSTING_EXCEPTIONS: GlPostingException[] = [
  {
    module: "Internal warehouse / branch stock transfers",
    reason: "Quantity moves between locations at the same inventory value; no P&L or cash event.",
  },
  {
    module: "QC status changes without a write-off quantity",
    reason: "Hold/release does not change inventory value until stock is scrapped or adjusted.",
  },
  {
    module: "Production / work-order finished-goods receipt",
    reason: "Standard costing is not live; FG is tracked on StockLedger until a cost roll-up exists.",
  },
  {
    module: "Stocktake quantity-only counts",
    reason: "Post a journal only when a valued adjustment is recorded; count sheets are not money.",
  },
  {
    module: "Broker commissions",
    reason: "Sales are not stored against brokers, so there is no commission amount to post.",
  },
  {
    module: "POS COGS when sale lines have no costPrice",
    reason: "Cannot invent a cost; revenue still posts. Fill costPrice on items to enable COGS.",
  },
  {
    module: "Cash-in-hand CASH_SALE / REFUND rows sourced from POS",
    reason: "POS already posts cash and revenue; posting the cash drawer row again would double-count.",
  },
  {
    module: "Draft / unpaid documents (draft PO, unpaid expense, unapproved payroll)",
    reason: "No money has moved. Journals post on receive, pay, or finalize.",
  },
  {
    module: "Warehouse / factory quantity adjustments without a unit cost",
    reason: "StockLedger records qty only. A journal needs a value; none is stored on the adjustment.",
  },
  {
    module: "Waste write-offs without a unit cost",
    reason: "Waste qty is tracked operationally; there is no standard cost to value the write-off.",
  },
  {
    module: "Supplier cash / manual ledger rows outside financial AP",
    reason: "Factory supplier ledger is operational. Official AP is VendorBill / VendorPayment.",
  },
  {
    module: "Using both a factory GRN and a financial vendor bill for the same purchase",
    reason: "Each path credits AP independently. Use GRN for factory receipts or a vendor bill for AP — not both for the same goods.",
  },
];

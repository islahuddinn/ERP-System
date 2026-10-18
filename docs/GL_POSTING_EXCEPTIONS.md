# GL posting exceptions

Operational movements that **do not** create a general-ledger journal, and why.

This list is the source of truth in code: `backend/src/financial/gl-posting/utils/exceptions.ts`.
`GET /financial/reports/posting-exceptions` returns the same list.

| Module | Why it does not post |
|---|---|
| Internal warehouse / branch stock transfers | Quantity moves between locations at the same inventory value; no P&L or cash event. |
| QC status changes without a write-off quantity | Hold/release does not change inventory value until stock is scrapped or adjusted. |
| Production / work-order finished-goods receipt | Standard costing is not live; FG is tracked on StockLedger until a cost roll-up exists. |
| Stocktake quantity-only counts | Post a journal only when a valued adjustment is recorded; count sheets are not money. |
| Broker commissions | Sales are not stored against brokers, so there is no commission amount to post. |
| POS COGS when sale lines have no costPrice | Cannot invent a cost; revenue still posts. Fill costPrice on items to enable COGS. |
| Cash-in-hand CASH_SALE / REFUND rows sourced from POS | POS already posts cash and revenue; posting the cash drawer row again would double-count. |
| Draft / unpaid documents | No money has moved. Journals post on receive, pay, or finalize. |
| Warehouse / factory quantity adjustments without a unit cost | StockLedger records qty only. A journal needs a value; none is stored on the adjustment. |
| Waste write-offs without a unit cost | Waste qty is tracked operationally; there is no standard cost to value the write-off. |
| Supplier cash / manual ledger rows outside financial AP | Factory supplier ledger is operational. Official AP is VendorBill / VendorPayment. |
| Using both a factory GRN and a financial vendor bill for the same purchase | Each path credits AP independently. Use GRN for factory receipts or a vendor bill for AP — not both for the same goods. |

Everything else that moves cash, AR, AP, inventory value, payroll, or expense must go through `GlPostingService.postBalancedEntry` (idempotent on sourceType + sourceId + postingKind).

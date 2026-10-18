# Branch Distribution Network — Plan & Status

Branch: `feat/branch-distribution-network-2026-07-30` (off `feat/BE-sales-management-module`)

## The business model

```
Factory (no Branch row — outside the tree)
   ↓ sells to
Primary Distributor (top-level Branch, parentBranchId = null)
   ↓ sells to
Secondary Distributor (Branch, parentBranchId = Primary's id)
   ↓ Sales Person takes the order
Sales Person (Employee, assigned to a Branch — carries NO stock of their own)
   ↓ delivery draws directly from the Branch's own stock
Customer (already fully built: Order → Delivery → Ledger → Recovery)
```

- A Branch can sit under another Branch (tree, via `parentBranchId`). Top-level branches (`parentBranchId = null`) request stock from the Factory, which has no Branch row of its own.
- A Branch is run by one Distributor (`Branch.distributorId`, an Employee — already existed pre-this-work). "My branch" everywhere in the new code = `Branch.distributorId === me`.
- A Branch can have several Sales People (`SalesPersonAssignment`, one row per employee, current assignment only).
- **A Sales Person never holds their own stock.** They visit a shop, take an Order (already auto-creates a linked PENDING Delivery, pre-existing behavior). When that Delivery is marked `DELIVERED`, stock is decremented straight from the Sales Person's *assigned branch* — resolved via `SalesPersonAssignment`, not from any personal balance. There is no "van stock" concept in this system — that was tried and explicitly reverted (see below).

## The one handshake, repeated at every hop

1. **Request** — buyer picks product + quantity. No price.
2. **Approve & price** — seller (parent branch, or Factory) sets the price. Locks here.
3. **Dispatch** — stock leaves the seller's balance.
4. **Confirm receipt** — stock lands in the buyer's balance; a debt is created here, not at dispatch.

## Two pricing modes — one switch, `Settings.distributionPricingMode`

- **`FIXED_PRICE`**: price is decided by **who's buying**, never by who's selling and never typed in by anyone. There are exactly 4 company-wide price lists (`PriceListEntry`, tier = `FACTORY_PRICE → DISTRIBUTOR_PRICE → TRADE_PRICE → MRP`, only Finance/Admin edits them), and every Branch (`Branch.priceTier`) and every Customer (`Customer.priceTier`, defaults to `TRADE_PRICE` since every Customer here is a shop) is tagged with exactly one tier. Whatever tier the buyer is tagged with is the price, full stop. There's still a real markup at each hop (list N+1 minus list N), it's just that nobody chooses it per-transaction — the whole ladder is fixed in advance. Visibility is fully open in this mode — any branch can see every ledger below it, all the way down — since none of the numbers are a branch's own private decision to protect.
- **`FREE_PRICE`** (default): every seller sets their own price at approval time (this is the *only* mode where `BranchProductPrice` — a per-seller price list — is used at all). Because margins are real and private here, ledger visibility is **strictly pairwise** — a branch only ever sees its own two ledgers (what it owes its parent, what's owed to it by its direct children). Not even the Factory can see past its direct child. This is enforced structurally: `BranchLedger` rows only ever connect two adjacent parties, and `BranchLedgerRepository.getVisibleBranchIds()` only expands beyond "just me" in `FIXED_PRICE` mode.

**One function decides which of the two applies, everywhere:** `BranchProductPricesService.resolvePrice(productId, buyerTier, sellerBranchId, requestedPrice)`. It's called from both `BranchStockRequestsService.approveBranchStockRequest` (buyer = the requester branch) and `CustomerOrdersService.createCustomerOrder` (buyer = the customer) — same function, same rule, both hops.

## What's built (both groups complete, migrated, compiling, permissions seeded)

**Group 1 — stock movement:**
- Schema: `Branch.parentBranchId`, `Settings.distributionPricingMode` (+ enum), `BranchProductPrice`, `BranchStockBalance`, `BranchStockRequest`/`Item`, `BranchStockTransfer`/`Item`
- Modules: `branch-product-prices` (seller price lists + `resolvePrice()`), `branch-stock-requests` (create → approve, which auto-creates the linked transfer in the same transaction), `branch-stock-transfers` (dispatch → confirm-receipt), `branch-stock` (balance report)
- Permission umbrella: `branch-stock-operations.view` / `.manage` — accepted as an alternative to every module's own specific permission, so one grant covers the whole day-to-day branch-worker workflow instead of needing ~8 individual permission checkboxes.

**Group 2 — money & people:**
- Schema: `SalesPersonAssignment`, `BranchLedger` (+ enum), `EmployeeCashTransfer.settlesBranchId`
- Modules: `sales-person-assignments` (which branch a Sales Person belongs to — this is what a delivery uses to know whose stock to decrement), `branch-ledger` (visibility-scoped list + profit/loss summary, read-only)
- Integration wired into three transaction points:
  - `BranchStockTransfer.confirmReceipt` → writes a `BranchLedger` `STOCK_RECEIVED` debit
  - `EmployeeCashTransfer.respond` (existing module) → when `settlesBranchId` is set and the receiver confirms `RECEIVED`, writes a `BranchLedger` `PAYMENT` credit
  - `CustomerDeliveriesRepository.markAsDelivered` (existing module) → decrements `BranchStockBalance` for the Sales Person's assigned branch, for every delivered item, in the same transaction as the existing `CustomerLedger` write

**Reverted mid-build, worth knowing about:** a `sales-person-stock` module (van-stock balances + an `issue` action to load a Sales Person up from their branch) was built, committed, and pushed — then removed entirely once it became clear the real model has Sales People carrying **no stock of their own**. `SalesPersonStockBalance` and its module are gone (dropped via migration `20260730111151_remove_sales_person_stock`); `SalesPersonAssignment` survived because it's still needed for exactly one thing — knowing which branch's stock a delivery should draw from.

**Group 3 — price lists (replaces the old "single Factory price" FIXED mode):**
- Schema: `PriceListTier` enum, `PriceListEntry`, `Branch.priceTier`, `Customer.priceTier`
- Module: `price-lists` — `GET /sales-management/price-lists` (view), `POST /sales-management/price-lists` (upsert one tier+product's price, Finance/Admin only via `price-list.manage`)
- `BranchProductPricesService.resolvePrice()` reworked to delegate to `PriceListsService.getPrice(tier, productId)` in `FIXED_PRICE` mode instead of always reading the Factory's own `BranchProductPrice` row (that old approach — one identical price everywhere, zero markup — is gone; the real model always had a markup per hop, decided by Finance/Admin in advance, not by each branch).
- `CustomerOrdersService.createCustomerOrder` now calls `resolvePrice()` too — this closes the gap that was open since Group 1 (a Sales Person could previously type any price regardless of mode).

All schema changes are four real migrations already applied locally:
`20260730092812_add_branch_distribution_network`, `20260730095341_add_branch_ledger_and_sales_person_stock`, `20260730111151_remove_sales_person_stock`, `20260803091246_add_price_list_tiers`.
(The first two were hand-written, not `prisma migrate dev` output — the local DB had 28 pre-existing unrelated pending migrations plus genuine schema drift from dead `brokers`/`categories` tables with no Prisma model. Neither issue is caused by this work; the dead tables were left alone, not dropped. One harmless leftover: the `AuditModule` enum still has an unused `SALES_PERSON_STOCK` value in the DB — removing enum values requires a full type-recreate, and since nothing ever wrote a row with it, it was left in place rather than risk that recreate for zero benefit.)

## What's explicitly NOT done yet — pick up here

1. **`CustomerReturn` doesn't restore stock.** A returned item should presumably credit `BranchStockBalance` back for the Sales Person's branch — nothing does that today.
2. **`BranchStockTransfer` has no cancel path.** `CANCELLED` is a valid schema status but no service/endpoint ever reaches it — a `PENDING` transfer can't currently be called off.
3. **No automated tests** written for any of the modules.
4. **Branch tree depth is assumed to match the 4 tiers exactly** (Factory → Primary → Secondary → Shop). If a branch tree ever goes deeper than that, there's no 5th price list for it — flagged as a known limitation, not yet handled.

## Decided against, on purpose — don't re-propose without a real reason

**Making the Factory a real `Branch` row.** This was seriously considered (would enable multiple factories, real accountability instead of "anyone with the permission," and reuse the existing Branch CRUD for free). Explicitly rejected: every version of it either required a new `Branch.type` field with per-type authorization branching, or a second permission just for root-level branches — both added real complexity for a benefit (multi-factory, per-person factory accountability) nobody has asked for yet. Factory stays exactly as originally built: `fulfillerBranchId` / `fromBranchId` / `counterpartyBranchId` = `null` means Factory, and holding the relevant permission is the only check — no branch ownership check applies, since there's no Branch row to check ownership against. If multi-factory support becomes a real requirement later, that's a deliberate, separate decision — not something to quietly reintroduce.

## Key design decisions worth knowing before touching this code

- Nobody, including the Factory, ever sees two hops away — this is structural (pairwise `BranchLedger` rows), not just a permission check.
- Buyer never sets price; seller always does, at approval, and it locks.
- `distributorIdAtTime` on `BranchLedger` is a snapshot, not a live lookup — a distributor's ledger history survives being replaced.
- **A Sales Person carries no stock of their own — ever.** Every delivery draws directly from their assigned branch's `BranchStockBalance`. Don't reintroduce a per-salesperson stock balance; it was tried and explicitly reverted.
- "My branch" is always resolved server-side from `Branch.distributorId`, never accepted from a request body — prevents any spoofing.
- **In `FIXED_PRICE` mode, price depends only on who's buying, never who's selling.** Don't reintroduce per-seller pricing logic for this mode — that was tried (one flat Factory price everywhere) and replaced with the tier system once the real requirement came out: a real markup per hop, decided centrally by Finance/Admin, applied automatically based on the buyer's tier.
- Job title/Designation is never checked by any of this code to decide what someone can do — that's what Role/Permission is for. Which branch someone acts for comes from the assignment tables (`Branch.distributorId`, `SalesPersonAssignment`), not from HR data.

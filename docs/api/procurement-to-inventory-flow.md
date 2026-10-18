# Procurement → Receiving → Inventory: End-to-End Integration Guide

> **Purpose**: A single walkthrough that ties together the **Purchase Orders**, **GRN**, and **Raw Material Batches** modules — for a frontend developer building the procurement-to-inventory screens.
> **Read this first**, then go to the module-specific docs for full field-by-field detail:
>
> - [`purchase-orders-api.md`](./purchase-orders-api.md)
> - [`grn-api.md`](./grn-api.md)
> - [`raw-material-batches-api.md`](./raw-material-batches-api.md)

---

## Table of Contents

1. [The Big Picture](#1-the-big-picture)
2. [Step-by-Step Flow](#2-step-by-step-flow)
3. [Status Cheat Sheet](#3-status-cheat-sheet)
4. [Where Stock Numbers Live](#4-where-stock-numbers-live)
5. [Common Frontend Mistakes to Avoid](#5-common-frontend-mistakes-to-avoid)
6. [Quick Reference: Endpoint Sequence](#6-quick-reference-endpoint-sequence)

---

## 1. The Big Picture

These three modules form **one continuous chain**. Nothing about them is independent — an action in one module immediately changes data in the next:

```
┌───────────────────┐     ┌──────────────────┐     ┌────────────────────────┐     ┌──────────────────────┐
│  Purchase Order    │────▶│  GRN (Goods       │────▶│  Raw Material Batch    │────▶│  Batch Inspection      │
│  (what we ordered) │     │  Received Note)   │     │  (the physical stock   │     │  (quality control on   │
│                    │     │  (what arrived)   │     │  lot, status QUARANTINE│     │  the lot, sets ACTIVE/ │
│                    │     │                   │     │  on creation)          │     │  BLOCKED)              │
└────────────────────┘     └──────────────────┘     └────────────────────────┘     └──────────────────────┘
       ▲                          │                            │
       │ status auto-updates      │ creates batches            │ once ACTIVE/PARTIAL,
       │ (PARTIAL/RECEIVED)        │ in same transaction        │ batch is usable in:
       └──────────────────────────┘                            ▼
                                                  ┌────────────────────────────┐
                                                  │  Consumption / FIFO / FEFO   │
                                                  │  (Production Orders,         │
                                                  │  Purchase Returns)            │
                                                  └────────────────────────────┘
```

**One-sentence summary of each module:**

| Module                   | What it answers                                                                               | Base path               |
| ------------------------ | --------------------------------------------------------------------------------------------- | ----------------------- |
| **Purchase Orders**      | "What did we order from this supplier, and have we paid for it?"                              | `/purchase-orders`      |
| **GRN**                  | "What physically arrived, and how much of each item?"                                         | `/grn`                  |
| **Raw Material Batches** | "What inventory lots do we have, where are they, are they safe to use, and how much is left?" | `/raw-material-batches` |

---

## 2. Step-by-Step Flow

This is the actual sequence a user goes through, from placing an order to using the material in production.

### Step 1 — Create and confirm a Purchase Order

1. `POST /purchase-orders` → creates a PO in `DRAFT` status with line items (`rawMaterialId`, `quantity`, `unitPrice`, etc.).
2. User reviews/edits via `PATCH /purchase-orders/:purchaseOrderId` while still `DRAFT`.
3. User confirms it: `PATCH /purchase-orders/:purchaseOrderId/status` with `{ "status": "CONFIRMED" }`.
   - **Why this matters**: only a PO that is not `CANCELLED`/`RECEIVED` can be used to create a GRN. In practice, `CONFIRMED` or `PARTIAL` POs are the ones a user should be able to pick when receiving goods.

> See [purchase-orders-api.md → Create Purchase Order](./purchase-orders-api.md#1-create-purchase-order) and [Update Purchase Order Status](./purchase-orders-api.md#6-update-purchase-order-status).

### Step 2 — Goods arrive → create a GRN

1. User opens "Create GRN" and picks a PO via `GET /purchase-orders/dropdown`.
2. The frontend pre-fills `items[]` from the PO's line items (raw material, UOM, expected quantity = remaining quantity to receive).
3. For **each** GRN item, the user must split the received quantity across one or more **batch allocations** (`batches[]`): site, quantity, optional manufacturing/expiry dates, unit cost, notes.
   - **Validation rule**: the sum of `batches[].quantity` for a GRN item must equal that item's `receivedQuantity`.
4. Submit: `POST /grn`.

**What happens on the backend, in a single transaction:**

- The GRN record is created with `status: COMPLETED`.
- For every `batches[]` entry on every item, a `RawMaterialBatch` is created with **status `QUARANTINE`** — i.e., it exists in the system but **cannot yet be used** for FIFO allocation, consumption, or production.
- The raw material's `currentStock` is incremented immediately (the stock "exists" in the warehouse even before QC clears it — but it's not _allocatable_ yet).
- The linked Purchase Order's `PurchaseItem.receivedQty` is incremented, and the PO's `status` becomes `PARTIAL` (some items still short) or `RECEIVED` (everything fully received).
- **Only one GRN is allowed per PO** — there is no "receive in multiple shipments against the same PO" flow currently.

> See [grn-api.md → Create GRN](./grn-api.md#1-create-grn) and [Auto-Created Raw Material Batches](./grn-api.md#auto-created-raw-material-batches).

### Step 3 — Quality inspection clears (or blocks) each batch

Every batch created from a GRN starts in `QUARANTINE` and **must be inspected** before it can be used.

1. User opens the "Pending Inspection" queue: `GET /raw-material-batches?status=QUARANTINE`.
2. For a given batch, user records an inspection: `POST /raw-material-batches/:batchId/inspections` with `inspectionType`, `qualityStatus`, `approvedQuantity`, `rejectedQuantity`, `results`, `observations`, `notes`.
3. **Backend side effects depend on `qualityStatus`:**
   - `PASSED` or `CONDITIONAL` → batch status becomes `ACTIVE` (or `CONSUMED` if `rejectedQuantity` happens to consume the entire batch). The batch is now eligible for FIFO/FEFO and consumption.
   - `FAILED` → batch status becomes `BLOCKED`. It is excluded from FIFO results and consumption is rejected with a 400.
   - If `rejectedQuantity > 0`, the backend automatically creates a `RawMaterialBatchConsumption` record with `referenceType: "QUALITY_REJECTION"`, decrementing `availableQuantity` and `currentStock` accordingly — **even on a batch that ultimately passes** (e.g., `CONDITIONAL` with some rejected portion).
4. To fix a typo in the inspection notes/observations afterward (without changing batch status or quantities), use `PATCH /raw-material-batches/inspections/:inspectionId`.

> See [raw-material-batches-api.md → Create Batch Inspection](./raw-material-batches-api.md#48-create-batch-inspection).

### Step 4 — Use the batch (production consumption or returns)

Once a batch is `ACTIVE` or `PARTIAL`:

1. To find which batches to draw from, call `GET /raw-material-batches/fifo/:rawMaterialId?quantity=X`. This returns batches in FEFO order (earliest expiry first, falling back to earliest received), skipping `QUARANTINE`/`BLOCKED`/expired/zero-availability batches.
2. For each suggested allocation, call `POST /raw-material-batches/:batchId/consume` with the `quantity`, `referenceType` (e.g., `"PRODUCTION_ORDER"`), and `referenceId`.
3. Each consumption:
   - Decrements `availableQuantity`, increments `consumedQuantity` on the batch.
   - Sets batch status to `PARTIAL` (stock remains) or `CONSUMED` (depleted).
   - Decrements `currentStock` on the raw material.
   - Creates a `RawMaterialBatchConsumption` audit record (visible via `GET /raw-material-batches/:batchId/consumptions`).

### Step 5 (optional) — Returning goods to the supplier

If received goods need to go back to the supplier (defective, over-shipped, etc.):

1. `POST /purchase-returns` — references the PO/GRN and selects specific batches with `availableQuantity > 0` to return.
2. Creating a return **immediately reserves/reduces stock** (reduces `availableQuantity` on the chosen batches), even while the return is `DRAFT`.
3. Status transitions via `PATCH /purchase-returns/:returnId/status`:
   - `DRAFT → PENDING → APPROVED → COMPLETED` (normal happy path; `COMPLETED` logs a `RawMaterialBatchConsumption` for the returned quantity).
   - `REJECTED`/`CANCELLED` from `PENDING`/`DRAFT` **reverses** the stock reduction.

> See [purchase-orders-api.md → Purchase Returns API](./purchase-orders-api.md#purchase-returns-api).

---

## 3. Status Cheat Sheet

### Purchase Order (`PurchaseStatus`)

| Status      | Meaning                           | Can still edit items? | Next states                        |
| ----------- | --------------------------------- | --------------------- | ---------------------------------- |
| `DRAFT`     | Being built, not sent to supplier | Yes                   | `CONFIRMED`, `CANCELLED`           |
| `CONFIRMED` | Sent/approved, awaiting goods     | Header only           | `PARTIAL`, `RECEIVED`, `CANCELLED` |
| `PARTIAL`   | Some items received via GRN       | Header only           | `RECEIVED`, `CANCELLED`            |
| `RECEIVED`  | All items fully received          | No                    | — (terminal)                       |
| `CANCELLED` | Order cancelled                   | No                    | — (terminal)                       |

### GRN (`ReceivingStatus`)

| Status                                          | Meaning                                                                                                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `COMPLETED`                                     | The only status the current `POST /grn` flow produces — receiving is final the moment it's recorded                         |
| `PENDING`, `INSPECTING`, `APPROVED`, `REJECTED` | Defined in the enum but **not used** by the current create flow — don't build UI that expects a GRN-level approval workflow |

### Raw Material Batch (`RawMaterialBatchStatus`)

| Status       | Meaning                                                               | Usable in FIFO/consume?                                 |
| ------------ | --------------------------------------------------------------------- | ------------------------------------------------------- |
| `QUARANTINE` | Just created from a GRN, awaiting inspection                          | No                                                      |
| `ACTIVE`     | Inspection passed, full quantity available                            | Yes                                                     |
| `PARTIAL`    | Some quantity consumed/rejected, some remains                         | Yes                                                     |
| `CONSUMED`   | `availableQuantity` reached 0                                         | No                                                      |
| `BLOCKED`    | Inspection failed (`qualityStatus: FAILED`)                           | No                                                      |
| `EXPIRED`    | Past `expiryDate` (not auto-applied by a cron — informational/manual) | No (excluded from FIFO if expired regardless of status) |

### Inspection (`QualityStatus`)

| Status        | Effect on batch                                                          |
| ------------- | ------------------------------------------------------------------------ |
| `PENDING`     | No status change yet (inspection record exists but is incomplete)        |
| `PASSED`      | Batch → `ACTIVE`                                                         |
| `CONDITIONAL` | Batch → `ACTIVE` (but flagged — show `notes`/`observations` prominently) |
| `FAILED`      | Batch → `BLOCKED`                                                        |

---

## 4. Where Stock Numbers Live

A common point of confusion — there are **two stock numbers** in this system:

| Field                                | Where                            | Meaning                                                                                                                                                                                                                                                           |
| ------------------------------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RawMaterial.currentStock`           | `/raw-materials/:id`             | **Total physical stock** across all batches/sites, including `QUARANTINE` batches. Updated immediately on GRN creation and on every consumption/return.                                                                                                           |
| `RawMaterialBatch.availableQuantity` | `/raw-material-batches/:batchId` | **Usable stock for this specific lot.** Only batches in `ACTIVE`/`PARTIAL` status with `availableQuantity > 0` show up in FIFO results — `QUARANTINE`/`BLOCKED` batches don't count toward "available for production" even though they're part of `currentStock`. |

**Frontend implication**: if you show a single "stock on hand" number to warehouse staff, use `currentStock`. If you show "available for production" or build a FIFO/consume picker, you must use the batch-level `availableQuantity` and **filter by status** (`ACTIVE`/`PARTIAL`), not just sum all batches.

---

## 5. Common Frontend Mistakes to Avoid

1. **Don't call `POST /raw-material-batches/bulk`** — it doesn't exist anymore. Batches are created automatically as part of `POST /grn`.
2. **Don't expect a GRN approval/inspection workflow** — `POST /grn` always returns `status: COMPLETED`. All quality control happens afterward, per-batch, via the inspections endpoints.
3. **Don't try to create a second GRN against the same PO** — the backend rejects this. If a PO needs multiple shipments, that's not currently supported; treat each PO as "received once."
4. **Don't show newly-received batches as available stock immediately** — they're `QUARANTINE` until inspected. Surface them in a "Pending Inspection" queue instead.
5. **Don't assume `GET /purchase-orders/dropdown` is pre-filtered to receivable POs** — it currently returns POs of _all_ statuses (the status filter is commented out server-side). Filter client-side to `CONFIRMED`/`PARTIAL` if you only want POs that can still receive a GRN.
6. **Re-fetch the PO after creating a GRN or recording a payment** — `receivedQty`, `status`, `amountPaid`, and `paymentStatus` are updated server-side as side effects and won't be reflected in your stale local copy.
7. **Decimal handling differs slightly between modules**: Purchase Orders module returns numeric fields already as JS `number`. The Raw Materials module returns Prisma `Decimal` fields (e.g., `lastPurchasePrice`) as **strings** — always `parseFloat()` those before doing arithmetic. `RawMaterialBatch.unitCost` is a plain `Float` and is returned as a `number`.
8. **Supplier info is no longer on the GRN directly** — get it via `grn.purchaseOrder.supplier`.

---

## 6. Quick Reference: Endpoint Sequence

A condensed call sequence for the full happy path, useful as a checklist when wiring up the screens:

```
1.  POST   /purchase-orders                          → create PO (DRAFT)
2.  PATCH  /purchase-orders/:id/status                → { status: "CONFIRMED" }
3.  GET    /purchase-orders/dropdown                  → pick PO for GRN
4.  POST   /grn                                       → record receipt + auto-create batches (QUARANTINE)
                                                          ↳ side effects: PO.receivedQty++, PO.status → PARTIAL/RECEIVED
                                                          ↳ side effects: RawMaterial.currentStock++
5.  GET    /raw-material-batches?status=QUARANTINE    → pending inspection queue
6.  POST   /raw-material-batches/:batchId/inspections → record QC result
                                                          ↳ side effects: batch.status → ACTIVE/BLOCKED/CONSUMED
                                                          ↳ side effects: if rejectedQuantity > 0, auto consumption record
7.  GET    /raw-material-batches/fifo/:rawMaterialId?quantity=X  → get allocation plan
8.  POST   /raw-material-batches/:batchId/consume     → consume for production
                                                          ↳ side effects: batch.availableQuantity--, RawMaterial.currentStock--
9.  (optional) POST /purchase-returns                 → return goods to supplier
                                                          ↳ side effects: batch.availableQuantity adjusted immediately
10. (optional) PATCH /purchase-returns/:id/status     → progress through DRAFT→PENDING→APPROVED→COMPLETED
```

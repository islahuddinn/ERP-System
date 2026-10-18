# ERP System — Full QA Test Flow

This document covers the complete end-to-end flow of the ERP system.
Frontend developers and QA testers should follow this guide to validate every feature from setup to sale delivery.

---

## How to Use This Document

- Follow the steps **in order** — each step depends on the previous one.
- Every step has a **What to do**, **What to check**, and **What should NOT work** section.
- IDs from each step (like `supplierId`, `poId`) are needed in later steps — save them as you go.
- Use Swagger at `/api/docs` to run requests and inspect responses.
- All requests require a logged-in user with the correct permissions.

---

## Table of Contents

1. [Setup](#part-1--setup)
2. [Purchase Flow](#part-2--purchase-flow)
3. [Production Flow](#part-3--production-flow)
4. [Sales Flow](#part-4--sales-flow)
5. [Full Flow Summary](#full-flow-summary)

---

## PART 1 — Setup

> Do this once before running any other test. These are the master records the entire system depends on.

---

### 1.1 Create a UOM (Unit of Measure)

**What it is:**
A unit used to measure quantities — e.g. Kilogram, Litre, Piece, Meter.
Every raw material and product must have a UOM.

**What to do:**
- Go to UOM section and create a new UOM
- Example: Name = `Kilogram`, Abbreviation = `kg`

**What to check:**
- UOM appears in the list
- UOM is available in dropdowns when creating a raw material or product

**What should NOT work:**
- Creating two UOMs with the exact same name

---

### 1.2 Create a Site

**What it is:**
A physical location where stock is stored — e.g. Main Warehouse, Factory A, Cold Storage.
Stock batches are always assigned to a specific site.

**What to do:**
- Go to Sites and create a new site
- Example: Name = `Main Warehouse`, Type = `WAREHOUSE`

**What to check:**
- Site appears in the list
- Site is available in dropdowns when creating a GRN or Production Order

**What should NOT work:**
- Creating a site with no name

---

### 1.3 Create a Supplier

**What it is:**
The company or person you buy raw materials from.
Purchase Orders must reference a supplier.

**What to do:**
- Go to Suppliers and create a new supplier
- Example: Name = `ABC Traders`, Email = `abc@test.com`, Phone = `0300-0000000`

**What to check:**
- Supplier appears in the list
- Supplier is available in the Purchase Order dropdown

**What should NOT work:**
- Duplicate supplier names should be rejected

---

### 1.4 Create a Customer

**What it is:**
The company or person you sell finished products to.
Sales must reference a customer.

**What to do:**
- Go to Customers and create a new customer
- Example: Name = `XYZ Retail`, Email = `xyz@test.com`

**What to check:**
- Customer appears in the list and customer dropdown
- Customer ledger is empty (no balance yet)

---

### 1.5 Create a Raw Material

**What it is:**
The input material that gets purchased from a supplier and used in production.
Example: Cotton, Steel Rod, Flour, Chemical X.

**What to do:**
- Go to Raw Materials and create a new one
- Example: Name = `Cotton`, UOM = `Kilogram`

**What to check:**
- Raw material appears in the list
- Raw material is available when creating a Purchase Order or BOM

**What should NOT work:**
- Creating two raw materials with the same name

---

### 1.6 Create a Product

**What it is:**
The finished good that gets produced and sold to customers.
Example: Cotton Shirt, Steel Bolt, Flour Bag.

**What to do:**
- Go to Products and create a new one
- Example: Name = `Cotton Shirt`, UOM = `Piece`

**What to check:**
- Product appears in the list
- Product is available when creating a BOM or Sale

---

## PART 2 — Purchase Flow

> This flow covers buying raw materials from a supplier, getting them approved, and recording their arrival into the warehouse.

---

### Step 1 — Create Purchase Order

**What it is:**
A formal request to buy raw materials from a supplier.
It needs to be approved before goods can be received.

**What to do:**
- Go to Purchase Orders → Create New
- Select a supplier
- Add at least one raw material with quantity and unit price
- Assign one or more approvers (users who must approve before it proceeds)
- Submit the form

**What to check:**
- PO is created with status **DRAFT**
- The assigned approvers are listed in the PO details
- PO number is auto-generated

**What should NOT work:**
- Creating a PO with no items
- Creating a PO with no approvers
- Using a non-existent raw material

---

### Step 2 — Approve the Purchase Order

**What it is:**
Each assigned approver must review and approve the PO.
The system only confirms the PO when ALL approvers have approved.

**What to do:**
- Log in as the assigned approver
- Open the PO and click Approve
- Enter remarks if needed and submit

**What to check:**
- Approver's decision is recorded (Approved / Rejected)
- If all approvers approve → PO status changes automatically to **CONFIRMED**
- If even one approver rejects → PO stays **DRAFT**

**What should NOT work:**
- A user who is not listed as an approver should not be able to approve
- Approving an already confirmed PO should not be allowed

---

### Step 3 — Create GRN (Goods Receipt Note)

**What it is:**
When the physical goods ordered on the PO actually arrive at your warehouse, you record their arrival through a GRN.
You also specify which site (warehouse) each batch of goods will be stored in.

**What to do:**
- Go to GRN → Create New
- Select the confirmed PO
- For each item, enter the quantity received
- Split the received quantity into one or more batches per site
  - Example: 200 kg Cotton received → 150 kg stored in Warehouse A, 50 kg in Warehouse B
- Add manufacturing date and expiry date per batch (optional but recommended)
- Submit the GRN

**What to check:**
- GRN is created successfully
- Raw Material Batches are automatically created in the system (one per batch entry)
- Each batch shows correct site, quantity, cost, and dates
- PO status updates:
  - If all items fully received → PO becomes **RECEIVED**
  - If partially received → PO becomes **PARTIAL**

**What should NOT work:**
- Creating a GRN against a DRAFT PO (must be CONFIRMED first)
- Creating a GRN against a CANCELLED PO
- Creating a GRN against a fully RECEIVED PO
- Batch quantities not adding up to the received quantity
- Expiry date in the past
- Manufacturing date set after expiry date
- Adding items that are not in the original PO

---

### Step 4 — View Raw Material Batches (Auto-Created)

**What it is:**
After the GRN is saved, the system automatically creates stock batches.
These batches are your actual raw material inventory — tracked per site, per expiry, per cost.

**What to do:**
- Go to Raw Material Batches
- Filter by the raw material you just received

**What to check:**
- Batches are created with correct quantity, site, cost, and dates
- Batch status is **AVAILABLE**
- FIFO order is correct (oldest manufacturing date / earliest expiry listed first)

**Optional batch management to test:**
- Block a batch → status changes to BLOCKED (cannot be used in production)
- Put a batch in Quarantine → status changes to QUARANTINE
- Submit a quality inspection on a quarantined batch
- Check expiring batches list

---

## PART 3 — Production Flow

> This flow covers turning raw materials into finished products through a BOM-based production process.

---

### Step 5 — Create BOM (Bill of Materials)

**What it is:**
A BOM is a recipe or formula for producing a product.
It defines which raw materials are needed and in what quantity per unit produced.
Example: To produce 1 Cotton Shirt → need 1.5 kg Cotton + 0.1 m Thread.

**What to do:**
- Go to BOM → Create New
- Select the product this BOM is for (e.g. Cotton Shirt)
- Give the BOM a name (e.g. "Standard Cotton Shirt Formula")
- Add raw material line items with quantity per unit and UOM
- Submit

**What to check:**
- BOM is created with status **DRAFT**
- All items are listed correctly with quantities

**What should NOT work:**
- Creating a BOM with no items
- Using a raw material that doesn't exist

---

### Step 6 — Activate the BOM

**What it is:**
A BOM must be set to ACTIVE before it can be used in a Production Order.
Only one BOM can be active per product at a time.

**What to do:**
- Open the BOM and change status to **ACTIVE**

**What to check:**
- BOM status is now **ACTIVE**
- BOM is available in the Production Order dropdown

**What should NOT work:**
- Activating a second BOM for the same product while the first one is still ACTIVE
- Using a DRAFT or INACTIVE BOM in a Production Order

---

### Step 7 — Create Production Order

**What it is:**
A Production Order tells the system how many units of a product to produce and which BOM to use.
The system automatically calculates how much raw material is needed and reserves it from batches using FIFO.

**What to do:**
- Go to Production Orders → Create New
- Select the product and the active BOM
- Enter planned quantity (e.g. 100 shirts)
- Select a site (where production happens)
- Submit

**What to check:**
- Production Order created with status **DRAFT**
- Raw material allocation is shown (how many kg/units reserved from which batches)
- FIFO is respected — oldest batches reserved first

**What should NOT work:**
- Creating a Production Order if raw material stock is insufficient
- Using an INACTIVE or DRAFT BOM

---

### Step 8 — Confirm the Production Order

**What it is:**
Confirming the order officially starts production.
Raw materials are locked in — reserved for this order.

**What to do:**
- Open the Production Order and confirm it

**What to check:**
- Status changes to **IN_PROGRESS**
- Raw material reservation is locked

**What should NOT work:**
- Confirming an already IN_PROGRESS or COMPLETED order

---

### Step 9 — Complete the Production Order

**What it is:**
Production is done. You enter the actual quantity produced.
The system deducts raw materials from batches and automatically creates a Product Batch.

**What to do:**
- Open the IN_PROGRESS Production Order
- Enter the actual produced quantity (e.g. 98 instead of planned 100)
- Select the output site
- Complete the order

**What to check:**
- Status changes to **COMPLETED**
- Raw material batches are deducted (stock reduced)
- A Product Batch is automatically created for the finished product
- Product batch shows correct quantity and production cost

**What should NOT work:**
- Completing an order that is not IN_PROGRESS
- Entering a produced quantity of 0

---

### Step 10 — Process Product Batch Stages (Optional)

**What it is:**
After production, a batch can go through additional processing stages before being sold.
Common stages: Quality Check (QC), Packing, Labelling, Inspection.

**What to do:**
- Open the Product Batch
- Start a new stage (e.g. QC)
- Complete the stage with approved quantity and rejected quantity
  - Example: 98 produced → 95 approved, 3 rejected

**What to check:**
- Stage is recorded with correct quantities
- Rejected quantity is deducted from usable stock
- Multiple stages can be added one after another

---

### Step 11 — Finalize the Product Batch

**What it is:**
Finalizing makes the batch stock available for sale.
Before finalization, the product cannot be sold.

**What to do:**
- Open the Product Batch
- Set the selling price per unit
- Finalize the batch

**What to check:**
- Batch status changes to **FINALIZED**
- Stock is now visible in product stock summary
- Product is now available when creating a Sale

**What should NOT work:**
- Selling a product from a batch that is not yet finalized

---

## PART 4 — Sales Flow

> This flow covers selling finished products to a customer and dispatching the goods.

---

### Step 12 — Create Sale

**What it is:**
A sale is a record of what you are selling to a customer and at what price.
At this stage nothing is deducted — it is just a draft record.

**What to do:**
- Go to Sales → Create New
- Select a customer
- Add products with quantities and unit prices
- Apply item-level or overall discounts and tax if needed
- Submit

**What to check:**
- Sale is created with status **DRAFT**
- Total amount is calculated correctly (with discounts and tax)
- No stock is deducted yet

**What should NOT work:**
- Creating a sale with no items
- Entering a quantity of 0

---

### Step 13 — Confirm the Sale

**What it is:**
Confirming the sale deducts product stock from the batches using FIFO and records the amount the customer owes in their ledger.

**What to do:**
- Open the DRAFT sale and confirm it

**What to check:**
- Sale status changes to **CONFIRMED**
- Product batch stock is reduced by the sold quantity
- Customer ledger shows the sale amount as outstanding balance
- FIFO is respected — oldest batches deducted first

**What should NOT work:**
- Confirming a sale if there is not enough product stock
- Confirming an already confirmed sale

---

### Step 14 — Record Payment (Optional)

**What it is:**
After a sale is confirmed, the customer can make full or partial payments.

**What to do:**
- Open the confirmed sale
- Add a payment with the amount received

**What to check:**
- Payment is recorded
- Outstanding balance on the customer ledger is reduced
- Payment status updates (UNPAID → PARTIAL → PAID)

---

### Step 15 — Generate Dispatches

**What it is:**
A dispatch represents the physical delivery of goods from your warehouse to the customer.
The system automatically creates dispatch records grouped by site.

**What to do:**
- On the confirmed sale, generate dispatches

**What to check:**
- Dispatch records are created (one per site if items come from multiple sites)
- Each dispatch shows which items, quantities, and batches are being sent
- Dispatch status is **DRAFT**

---

### Step 16 — Approve the Dispatch

**What it is:**
A dispatch officer reviews the dispatch and approves it — meaning goods are packed and ready to leave.

**What to do:**
- Open the dispatch and assign a dispatch officer
- Approve the dispatch

**What to check:**
- Status changes to **APPROVED**
- Notes and officer name are saved

**What should NOT work:**
- Skipping APPROVED and going directly to DELIVERED

---

### Step 17 — Mark Dispatch as Delivered

**What it is:**
Once the goods physically reach the customer, the dispatch is marked as delivered.
This is the final step — no further changes can be made.

**What to do:**
- Open the APPROVED dispatch
- Mark it as DELIVERED

**What to check:**
- Status changes to **DELIVERED**
- No edit or status change is possible after this

**What should NOT work:**
- Editing an already DELIVERED dispatch
- Reverting a DELIVERED dispatch back to APPROVED or DRAFT

---

## FULL FLOW SUMMARY

```
SETUP
  └── UOM → Site → Supplier → Customer → Raw Material → Product

PURCHASE FLOW
  └── Create PO (DRAFT)
        └── Approve PO → Auto CONFIRMED
              └── Create GRN
                    └── Raw Material Batches created automatically (stock in)

PRODUCTION FLOW
  └── Create BOM (DRAFT)
        └── Activate BOM (ACTIVE)
              └── Create Production Order (DRAFT)
                    └── Confirm → IN_PROGRESS
                          └── Complete → COMPLETED
                                └── Product Batch created automatically
                                      └── (Optional) Add Stages
                                            └── Finalize → Stock available for sale

SALES FLOW
  └── Create Sale (DRAFT)
        └── Confirm Sale → CONFIRMED (stock deducted)
              └── (Optional) Record Payments
                    └── Generate Dispatches (DRAFT)
                          └── Approve Dispatch → APPROVED
                                └── Mark Delivered → DELIVERED ✓
```

---

## Status Reference

| Module | Status Flow |
|---|---|
| Purchase Order | DRAFT → CONFIRMED → PARTIAL → RECEIVED |
| Raw Material Batch | AVAILABLE → BLOCKED / QUARANTINE |
| BOM | DRAFT → ACTIVE ↔ INACTIVE |
| Production Order | DRAFT → IN_PROGRESS → COMPLETED |
| Product Batch | (auto-created) → FINALIZED |
| Sale | DRAFT → CONFIRMED |
| Sale Dispatch | DRAFT → APPROVED → DELIVERED |

---

## Common Mistakes to Validate

| Scenario | Expected Result |
|---|---|
| Create GRN against a DRAFT PO | Should fail — PO must be CONFIRMED |
| Create GRN against a fully received PO | Should fail — already fully received |
| GRN batch quantities do not match received quantity | Should fail — sum must match |
| Expiry date set in the past | Should fail |
| Manufacturing date set after expiry date | Should fail |
| Create Production Order with insufficient raw material | Should fail — not enough stock |
| Use a DRAFT or INACTIVE BOM in Production Order | Should fail |
| Activate two BOMs for the same product | Should fail — only one can be active |
| Confirm a Sale with no available product stock | Should fail |
| Edit a DELIVERED dispatch | Should fail — no changes after delivery |
| Create two raw materials with same name | Should fail — duplicate name |
| Create two UOMs with same name | Should fail — duplicate name |

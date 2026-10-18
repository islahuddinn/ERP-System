# Production Order → Product Batch → Stock Flow — Frontend API Reference

> **Purpose**: Complete API reference for the Production Orders, Product Batches, and Raw Material Batches modules, covering the end-to-end flow from creating a production run through to finished goods appearing in sellable stock.
> **Audience**: Frontend developers building the Production Order list/detail, Product Batch stages, and Raw Material Batch screens.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.

---

## Table of Contents

1. [Overview & Complete Flow](#overview--complete-flow)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [How Costs Are Calculated](#how-costs-are-calculated)
5. [Production Orders API](#production-orders-api)
   - [Create Production Order](#1-create-production-order)
   - [List Production Orders (paginated)](#2-list-production-orders-paginated)
   - [Get Single Production Order](#3-get-single-production-order)
   - [Update Production Order (DRAFT)](#4-update-production-order-draft)
   - [Update Production Order Status](#5-update-production-order-status)
   - [Add Cost Line](#6-add-cost-line)
   - [Add Waste Input](#7-add-waste-input)
   - [Get Product Batch from Completed Order](#8-get-product-batch-from-completed-order)
6. [Product Batches API](#product-batches-api)
   - [List Product Batches (paginated)](#1-list-product-batches-paginated)
   - [Get Single Product Batch](#2-get-single-product-batch)
   - [Get Stock Summary by Product](#3-get-stock-summary-by-product)
   - [Update Product Batch](#4-update-product-batch)
   - [Start a Stage](#5-start-a-stage)
   - [Complete a Stage](#6-complete-a-stage)
   - [Cancel a Stage](#7-cancel-a-stage)
   - [Finalize Batch (Push to Stock)](#8-finalize-batch-push-to-stock)
7. [Raw Material Batches API](#raw-material-batches-api)
   - [List Raw Material Batches (paginated)](#1-list-raw-material-batches-paginated)
   - [Get Single Raw Material Batch](#2-get-single-raw-material-batch)
   - [Get Expiring Batches](#3-get-expiring-batches)
   - [Get FIFO Allocation Preview](#4-get-fifo-allocation-preview)
   - [Update Raw Material Batch](#5-update-raw-material-batch)
   - [Consume from Batch](#6-consume-from-batch)
   - [Get Consumption History](#7-get-consumption-history)
8. [Error Responses](#error-responses)
9. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview & Complete Flow

The manufacturing flow has three distinct phases:

```
Phase 1 — Plan & Execute
  ProductionOrder (DRAFT)
    → FIFO-allocate raw material batches (soft reserve)
    → Confirm (IN_PROGRESS) → raw materials consumed
    → Add costs / waste inputs (optional)
    → Complete (COMPLETED) → ProductBatch created (WIP)

Phase 2 — Stage Processing
  ProductBatch (isFinal = false)
    → Stage: "Production" (auto-created, IN_PROGRESS)
    → Complete stage → unlock quantity, update costPerUnit
    → Start next stage → "Packing", "QC", etc.
    → Complete each stage until done

Phase 3 — Stock Push
  ProductBatch.finalize()
    → isFinal = true
    → Product.currentStock += approvedQuantity
    → Product.costPrice updated (AVCO)
    → Batch ready for sales/FIFO allocation
```

### Summary Table

| Step | Action                        | Status Change                          | Key Records Created / Updated                                           |
| ---- | ----------------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| 1    | Create Production Order       | `DRAFT`                                | `ProductionOrder`, `ProductionOrderMaterial[]`, batch allocations       |
| 2    | Confirm Production Order      | `DRAFT → IN_PROGRESS`                  | Raw material batches consumed, `currentStock` decremented               |
| 3    | Add Cost Lines (optional, ×N) | `IN_PROGRESS`                          | `ProductionOrderCost[]`                                                 |
| 4    | Add Waste Inputs (optional, ×N)| `IN_PROGRESS`                         | `ProductionOrderWaste[]`                                                |
| 5    | Complete Production Order     | `IN_PROGRESS → COMPLETED`              | `ProductBatch` created, initial `ProductBatchStage ("Production")` created |
| 6    | Complete "Production" Stage   | Stage `IN_PROGRESS → COMPLETED`        | `ProductBatch.availableQuantity` unlocked                               |
| 7    | Start Next Stage              | New Stage `IN_PROGRESS`                | `ProductBatchStage` created, batch quantity locked again                |
| 8    | Complete Stage (repeat)       | Stage `IN_PROGRESS → COMPLETED`        | `costPerUnit` recomputed                                                |
| 9    | Finalize Batch                | `isFinal = true`                       | `Product.currentStock` incremented, `StockLedger` entry created         |

---

## Permissions

| Permission Key               | What it guards                                             |
| ---------------------------- | ---------------------------------------------------------- |
| `production-orders.create`   | `POST /production-orders`                                  |
| `production-orders.read`     | All `GET /production-orders` endpoints                     |
| `production-orders.update`   | `PATCH` endpoints, status changes, add cost/waste          |
| `stock.read`                 | All `GET /product-batches` and `GET /raw-material-batches` |
| `stock.update`               | Finalize, start/complete/cancel stages, consume batch      |

---

## Enums & Constants

### `ProductionOrderStatus`

```
DRAFT        — Editable; raw materials FIFO-allocated (soft reserved)
IN_PROGRESS  — Confirmed; raw materials consumed from batches
COMPLETED    — Finished; ProductBatch created; order locked
CANCELLED    — Aborted from DRAFT (releases reservations) or IN_PROGRESS (reverses consumption)
```

### `ProductBatchStatus`

```
ACTIVE      — Normal operating batch
PARTIAL     — Some units consumed/reserved
BLOCKED     — On hold (manual admin action)
QUARANTINE  — Awaiting quality inspection
CONSUMED    — All units used up
EXPIRED     — Past expiryDate
```

### `ProductBatchStageStatus`

```
IN_PROGRESS — Stage actively being worked on; batch.availableQuantity = 0
COMPLETED   — Stage finished; approved/rejected quantities recorded; batch unlocked
CANCELLED   — Stage reverted (only the latest non-finalized stage can be cancelled)
```

### `RawMaterialBatchStatus`

```
ACTIVE      — Fully available for production
PARTIAL     — Partially consumed/reserved
BLOCKED     — On hold
QUARANTINE  — Awaiting inspection (new GRN batches start here)
CONSUMED    — Fully used up
EXPIRED     — Past expiryDate
```

### `ProductionCostType`

```
LABOUR     — Worker wages, overtime
OVERHEAD   — Factory/facility overhead
UTILITIES  — Electricity, water, gas
OTHER      — Miscellaneous additional costs
```

### Order & Batch Number Formats

Auto-generated by the backend:

- Production Order: `PROD-XXXXXX` (globally sequential, zero-padded to 6)
- Product Batch: `PB-YYYYMM-XXXX` (monthly-sequential, zero-padded to 4) — e.g. `PB-202606-0001`

---

## How Costs Are Calculated

### At Creation (DRAFT)

```
For each BOM item:
  requiredQuantity = quantityPerUnit × plannedQuantity × (1 + wastagePercent / 100)

FIFO allocation (oldest batches first, by expiryDate then receivedDate):
  allocatedCost  = SUM(allocatedQty × batch.unitCost)

rawMaterialCost = SUM(allocatedCost across all BOM items)
costPerUnit     = rawMaterialCost / plannedQuantity  ← estimated
```

### While IN_PROGRESS

Each cost or waste input call recalculates:

```
additionalCost  = SUM(amount) across all ProductionOrderCost records
wasteInputCost  = SUM(totalCost) across all ProductionOrderWaste records
totalCost       = rawMaterialCost + additionalCost + wasteInputCost
```

### At Completion

```
costPerUnit     = totalCost / producedQuantity  ← final, locked in ProductBatch
```

### At Stage Completion

Each stage can add additional processing costs:

```
newCostPerUnit = (prevCostPerUnit × stage.receivedQuantity + stage.additionalCost) / stage.receivedQuantity
```

### At Finalize

```
Product.costPrice = batch.costPerUnit  (AVCO — updates the product's cost price)
```

---

## Production Orders API

### 1. Create Production Order

```
POST /production-orders
Permission: production-orders.create
```

Creates a production order in `DRAFT` status. BOM items are FIFO-allocated against available raw material batches (soft reserve — `reservedQuantity` incremented, `availableQuantity` and `currentStock` unchanged).

#### Request Body

```json
{
  "productId": "product-uuid",
  "bomId": "bom-uuid",
  "siteId": "site-uuid",
  "plannedQuantity": 100,
  "notes": "June production run"
}
```

| Field             | Type     | Required | Notes                                                                     |
| ----------------- | -------- | -------- | ------------------------------------------------------------------------- |
| `productId`       | `uuid`   | Yes      | The finished product this order produces                                  |
| `bomId`           | `uuid`   | Yes      | Active Bill of Materials to use for material requirements and costing      |
| `siteId`          | `uuid`   | No       | Production site/factory location                                          |
| `plannedQuantity` | `number` | Yes      | Min 0.01 — how many units to produce                                      |
| `notes`           | `string` | No       |                                                                           |

#### Response `201 Created`

```json
{
  "id": "order-uuid",
  "orderNumber": "PROD-000001",
  "status": "DRAFT",
  "productId": "product-uuid",
  "bomId": "bom-uuid",
  "siteId": "site-uuid",
  "plannedQuantity": 100,
  "producedQuantity": 0,
  "rawMaterialCost": 2472,
  "additionalCost": 0,
  "wasteInputCost": 0,
  "totalCost": 2472,
  "costPerUnit": 24.72,
  "notes": "June production run",
  "startedAt": null,
  "completedAt": null,
  "createdById": "user-uuid",
  "updatedById": null,
  "deletedAt": null,
  "createdAt": "2026-06-18T10:00:00.000Z",
  "updatedAt": "2026-06-18T10:00:00.000Z",
  "product": {
    "id": "product-uuid",
    "name": "Wooden Chair",
    "code": "WC-001"
  },
  "bom": {
    "id": "bom-uuid",
    "bomNumber": "BOM-001",
    "name": "Wooden Chair BOM v2"
  },
  "site": {
    "id": "site-uuid",
    "name": "Main Plant",
    "code": "PLANT-001"
  },
  "materials": [
    {
      "id": "mat-uuid",
      "rawMaterialId": "rm-uuid",
      "requiredQuantity": 231,
      "consumedQuantity": 0,
      "estimatedCost": 2472,
      "actualCost": 0,
      "rawMaterial": {
        "id": "rm-uuid",
        "name": "Wood Plank",
        "code": "WP-001"
      },
      "uom": {
        "id": "uom-uuid",
        "name": "Pieces",
        "symbol": "pcs"
      },
      "batchAllocations": [
        {
          "id": "alloc-uuid",
          "allocatedQuantity": 150,
          "unitCost": 10,
          "totalCost": 1500,
          "consumedAt": null,
          "rawMaterialBatch": {
            "id": "rm-batch-uuid",
            "batchNumber": "RM-202606-0001",
            "unitCost": 10
          }
        }
      ]
    }
  ],
  "costs": [],
  "wastes": [],
  "workOrders": [],
  "productBatches": []
}
```

#### Errors

```json
{ "statusCode": 404, "message": "BOM not found", "error": "Not Found" }
{
  "statusCode": 400,
  "message": "Insufficient stock for \"Wood Plank\": required 231 pcs, available 150 pcs (shortfall: 81 pcs)",
  "error": "Bad Request"
}
```

---

### 2. List Production Orders (Paginated)

```
GET /production-orders
Permission: production-orders.read
```

#### Query Parameters

| Param       | Type                      | Default     | Notes                                       |
| ----------- | ------------------------- | ----------- | ------------------------------------------- |
| `page`      | `number`                  | `1`         | Min 1, Max 100                              |
| `limit`     | `number`                  | `10`        | Min 1, Max 100                              |
| `search`    | `string`                  | —           | Searches `orderNumber`                      |
| `status`    | `ProductionOrderStatus`   | —           | `DRAFT`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `productId` | `uuid`                    | —           | Filter by finished product                  |
| `siteId`    | `uuid`                    | —           | Filter by site                              |
| `sortBy`    | `string`                  | `createdAt` |                                             |
| `sortOrder` | `"ASC"` \| `"DESC"`       | `"DESC"`    |                                             |

#### Response `200 OK`

```json
{
  "data": [{ "...": "same shape as Create response" }],
  "meta": {
    "total": 38,
    "page": 1,
    "limit": 10,
    "totalPages": 4
  }
}
```

---

### 3. Get Single Production Order

```
GET /production-orders/:productionOrderId
Permission: production-orders.read
```

#### Path Parameter

| Param                | Type   | Notes               |
| -------------------- | ------ | ------------------- |
| `productionOrderId`  | `uuid` | Production Order ID |

#### Response `200 OK`

Same shape as [Create response](#1-create-production-order) with all nested relations fully populated.

---

### 4. Update Production Order (DRAFT)

```
PATCH /production-orders/:productionOrderId
Permission: production-orders.update
```

Only `DRAFT` orders can be edited. Only `siteId` and `notes` can be changed — BOM, product, and quantities cannot be changed (delete and recreate instead).

#### Path Parameter

| Param                | Type   | Notes               |
| -------------------- | ------ | ------------------- |
| `productionOrderId`  | `uuid` | Production Order ID |

#### Request Body

```json
{
  "siteId": "site-uuid-2",
  "notes": "Changed to Plant B"
}
```

| Field    | Type     | Required | Notes                            |
| -------- | -------- | -------- | -------------------------------- |
| `siteId` | `uuid`   | No       |                                  |
| `notes`  | `string` | No       |                                  |

#### Response `200 OK`

Full updated production order.

---

### 5. Update Production Order Status

```
PATCH /production-orders/:productionOrderId/status
Permission: production-orders.update
```

Transitions the order through its lifecycle. Valid transitions:

| From         | Action    | To           | Side Effects                                                                                                   |
| ------------ | --------- | ------------ | -------------------------------------------------------------------------------------------------------------- |
| `DRAFT`      | `CONFIRM` | `IN_PROGRESS`| Consumes FIFO batch allocations: `reservedQty → consumedQty`, `availableQty` decremented, `currentStock` decremented |
| `IN_PROGRESS`| `COMPLETE`| `COMPLETED`  | Creates `ProductBatch` + initial `ProductBatchStage ("Production")`; `costPerUnit` locked in                    |
| `DRAFT`      | `CANCEL`  | `CANCELLED`  | Releases all batch reservations: `reservedQty` restored, `reservedStock` decremented                           |
| `IN_PROGRESS`| `CANCEL`  | `CANCELLED`  | Reverses all batch consumption: `consumedQty` decremented, `availableQty` restored, `currentStock` incremented  |

#### Path Parameter

| Param                | Type   | Notes               |
| -------------------- | ------ | ------------------- |
| `productionOrderId`  | `uuid` | Production Order ID |

#### Request Body — Confirm

```json
{
  "action": "CONFIRM"
}
```

#### Request Body — Complete

```json
{
  "action": "COMPLETE",
  "producedQuantity": 95,
  "siteId": "site-uuid"
}
```

#### Request Body — Cancel

```json
{
  "action": "CANCEL"
}
```

| Field              | Type     | Required              | Notes                                                         |
| ------------------ | -------- | --------------------- | ------------------------------------------------------------- |
| `action`           | `string` | Yes                   | `"CONFIRM"`, `"COMPLETE"`, or `"CANCEL"`                      |
| `producedQuantity` | `number` | For `COMPLETE` only   | Min 1; must be ≤ `plannedQuantity`; actual units produced      |
| `siteId`           | `uuid`   | For `COMPLETE` (opt.) | Site where the batch will be stored                           |

#### Response `200 OK`

Full updated production order. For `COMPLETE`, the response also includes the newly created `productBatches[]`.

#### Errors

```json
{ "statusCode": 400, "message": "Only DRAFT orders can be confirmed" }
{ "statusCode": 400, "message": "Only IN_PROGRESS orders can be completed" }
{ "statusCode": 400, "message": "producedQuantity is required to complete a production order" }
{ "statusCode": 400, "message": "producedQuantity (110) cannot exceed plannedQuantity (100)" }
{ "statusCode": 400, "message": "Cannot cancel a COMPLETED production order" }
```

---

### 6. Add Cost Line

```
POST /production-orders/:productionOrderId/costs
Permission: production-orders.update
```

Adds an additional cost entry (labour, overhead, etc.) while the order is `IN_PROGRESS`. Can be called multiple times. Recalculates `additionalCost`, `totalCost`, and `costPerUnit` after each call.

#### Path Parameter

| Param                | Type   | Notes               |
| -------------------- | ------ | ------------------- |
| `productionOrderId`  | `uuid` | Production Order ID |

#### Request Body

```json
{
  "costType": "LABOUR",
  "description": "Night shift overtime wages",
  "amount": 2500
}
```

| Field         | Type                  | Required | Notes                                     |
| ------------- | --------------------- | -------- | ----------------------------------------- |
| `costType`    | `ProductionCostType`  | Yes      | `LABOUR`, `OVERHEAD`, `UTILITIES`, `OTHER`|
| `description` | `string`              | No       |                                           |
| `amount`      | `number`              | Yes      | Min 0.01                                  |

#### Response `200 OK`

Full updated production order with recalculated `additionalCost`, `totalCost`, `costPerUnit`.

---

### 7. Add Waste Input

```
POST /production-orders/:productionOrderId/wastes
Permission: production-orders.update
```

Records a waste material reused as input to this production order (e.g., recycled offcuts). Validates against a `WasteManagement` record. Recalculates `wasteInputCost`, `totalCost`, and `costPerUnit`.

#### Path Parameter

| Param                | Type   | Notes               |
| -------------------- | ------ | ------------------- |
| `productionOrderId`  | `uuid` | Production Order ID |

#### Request Body

```json
{
  "wasteManagementId": "waste-uuid",
  "quantity": 10,
  "unitCost": 8,
  "totalCost": 80,
  "notes": "Recycled wood offcuts from previous batch"
}
```

| Field               | Type     | Required | Notes                                                              |
| ------------------- | -------- | -------- | ------------------------------------------------------------------ |
| `wasteManagementId` | `uuid`   | Yes      | Must be a `PENDING` waste record of type `RAW_MATERIAL`            |
| `quantity`          | `number` | Yes      | Min 0.01; must not exceed `waste.quantity`                         |
| `unitCost`          | `number` | Yes      | Min 0                                                              |
| `totalCost`         | `number` | Yes      | Min 0 — should equal `quantity × unitCost`                        |
| `notes`             | `string` | No       |                                                                    |

#### Response `200 OK`

Full updated production order with recalculated `wasteInputCost`, `totalCost`, `costPerUnit`.

---

### 8. Get Product Batch from Completed Order

```
GET /production-orders/:productionOrderId/batch
Permission: production-orders.read
```

Returns the `ProductBatch` linked to a `COMPLETED` production order.

#### Path Parameter

| Param                | Type   | Notes               |
| -------------------- | ------ | ------------------- |
| `productionOrderId`  | `uuid` | Production Order ID |

#### Response `200 OK`

Same shape as [Get Single Product Batch](#2-get-single-product-batch).

---

## Product Batches API

### 1. List Product Batches (Paginated)

```
GET /product-batches
Permission: stock.read
```

#### Query Parameters

| Param          | Type                 | Default     | Notes                                             |
| -------------- | -------------------- | ----------- | ------------------------------------------------- |
| `page`         | `number`             | `1`         | Min 1, Max 100                                    |
| `limit`        | `number`             | `10`        | Min 1, Max 100                                    |
| `search`       | `string`             | —           | Searches `batchNumber`                            |
| `productId`    | `uuid`               | —           | Filter by product                                 |
| `siteId`       | `uuid`               | —           | Filter by site                                    |
| `status`       | `ProductBatchStatus` | —           | `ACTIVE`, `PARTIAL`, `BLOCKED`, `QUARANTINE`, etc.|
| `currentStage` | `string`             | —           | E.g., `"Production"`, `"Packing"`, `"QC"`         |
| `isFinal`      | `boolean`            | —           | `true` = finished goods in stock                  |
| `sortBy`       | `string`             | `createdAt` |                                                   |
| `sortOrder`    | `"ASC"` \| `"DESC"`  | `"DESC"`    |                                                   |

#### Response `200 OK`

```json
{
  "data": [{ "...": "same shape as Get Single response" }],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

---

### 2. Get Single Product Batch

```
GET /product-batches/:productBatchId
Permission: stock.read
```

#### Path Parameter

| Param            | Type   | Notes            |
| ---------------- | ------ | ---------------- |
| `productBatchId` | `uuid` | Product Batch ID |

#### Response `200 OK`

```json
{
  "id": "batch-uuid",
  "batchNumber": "PB-202606-0001",
  "productId": "product-uuid",
  "siteId": "site-uuid",
  "productionOrderId": "order-uuid",
  "currentStage": "Packing",
  "isFinal": false,
  "status": "ACTIVE",
  "quantity": 95,
  "availableQuantity": 0,
  "consumedQuantity": 0,
  "reservedQuantity": 0,
  "returnedQuantity": 0,
  "costPerUnit": 28.97,
  "manufacturingDate": null,
  "expiryDate": null,
  "notes": null,
  "createdById": "user-uuid",
  "updatedById": null,
  "deletedAt": null,
  "createdAt": "2026-06-18T11:00:00.000Z",
  "updatedAt": "2026-06-18T11:30:00.000Z",
  "product": {
    "id": "product-uuid",
    "name": "Wooden Chair",
    "code": "WC-001"
  },
  "site": {
    "id": "site-uuid",
    "name": "Main Plant",
    "code": "PLANT-001"
  },
  "productionOrder": {
    "id": "order-uuid",
    "orderNumber": "PROD-000001",
    "plannedQuantity": 100,
    "producedQuantity": 95,
    "totalCost": 2752
  },
  "stages": [
    {
      "id": "stage-uuid-1",
      "stageName": "Production",
      "status": "COMPLETED",
      "siteId": "site-uuid",
      "receivedQuantity": 95,
      "approvedQuantity": 95,
      "rejectedQuantity": 0,
      "additionalCost": 0,
      "costPerUnit": 28.97,
      "notes": null,
      "startedAt": "2026-06-18T11:00:00.000Z",
      "completedAt": "2026-06-18T11:20:00.000Z",
      "createdById": "user-uuid"
    },
    {
      "id": "stage-uuid-2",
      "stageName": "Packing",
      "status": "IN_PROGRESS",
      "siteId": "site-uuid",
      "receivedQuantity": 95,
      "approvedQuantity": null,
      "rejectedQuantity": null,
      "additionalCost": null,
      "costPerUnit": null,
      "notes": null,
      "startedAt": "2026-06-18T11:30:00.000Z",
      "completedAt": null,
      "createdById": "user-uuid"
    }
  ]
}
```

> `availableQuantity = 0` while any stage is `IN_PROGRESS` (batch is locked). It is restored to `approvedQuantity` when the stage completes.

---

### 3. Get Stock Summary by Product

```
GET /product-batches/stock-summary/:productId
Permission: stock.read
```

Returns a breakdown of all active batches for a given product, grouped by stage.

#### Path Parameter

| Param       | Type   | Notes      |
| ----------- | ------ | ---------- |
| `productId` | `uuid` | Product ID |

#### Response `200 OK`

```json
{
  "productId": "product-uuid",
  "productName": "Wooden Chair",
  "totalAvailable": 93,
  "byStage": [
    {
      "stageName": "Production",
      "quantity": 0,
      "batchCount": 0
    },
    {
      "stageName": "Packing",
      "quantity": 93,
      "batchCount": 1
    },
    {
      "stageName": "Final Stock",
      "quantity": 0,
      "batchCount": 0
    }
  ]
}
```

---

### 4. Update Product Batch

```
PATCH /product-batches/:productBatchId
Permission: stock.update
```

Updates non-structural fields: retail/sale price, status, or notes. Cannot change quantities or stages.

#### Path Parameter

| Param            | Type   | Notes            |
| ---------------- | ------ | ---------------- |
| `productBatchId` | `uuid` | Product Batch ID |

#### Request Body

```json
{
  "status": "QUARANTINE",
  "notes": "Placed on hold pending QC inspection"
}
```

| Field         | Type                 | Required | Notes                                        |
| ------------- | -------------------- | -------- | -------------------------------------------- |
| `retailPrice` | `number`             | No       | Min 0                                        |
| `salePrice`   | `number`             | No       | Min 0                                        |
| `status`      | `ProductBatchStatus` | No       | E.g., `BLOCKED`, `QUARANTINE`                |
| `notes`       | `string`             | No       |                                              |

#### Response `200 OK`

Full updated product batch.

---

### 5. Start a Stage

```
POST /product-batches/:productBatchId/stages/start
Permission: stock.update
```

Begins a new processing stage for the batch. **Locks the batch** (`availableQuantity → 0`) until the stage is completed.

**Pre-conditions:**
- Batch status ∈ `ACTIVE` or `PARTIAL`.
- Batch is not finalized (`isFinal = false`).
- No other stage is currently `IN_PROGRESS`.
- `availableQuantity > 0`.

**The initial "Production" stage is auto-created when a production order completes** — do NOT call this endpoint for the first stage. Call it for all subsequent stages (Packing, QC, etc.).

#### Path Parameter

| Param            | Type   | Notes            |
| ---------------- | ------ | ---------------- |
| `productBatchId` | `uuid` | Product Batch ID |

#### Request Body

```json
{
  "stageName": "Packing",
  "siteId": "site-uuid"
}
```

| Field       | Type     | Required | Notes                               |
| ----------- | -------- | -------- | ----------------------------------- |
| `stageName` | `string` | Yes      | Min 2 chars; e.g., `"Packing"`, `"QC"`, `"Labelling"` |
| `siteId`    | `uuid`   | No       | Defaults to batch's current site    |

#### Response `200 OK`

Full updated product batch with new `IN_PROGRESS` stage appended to `stages[]`.

#### Errors

```json
{ "statusCode": 409, "message": "A stage is already in progress for this batch" }
{ "statusCode": 400, "message": "Cannot start a stage on a finalized batch" }
{ "statusCode": 400, "message": "No available quantity to process in a new stage" }
```

---

### 6. Complete a Stage

```
PATCH /product-batches/:productBatchId/stages/:stageId/complete
Permission: stock.update
```

Marks the current `IN_PROGRESS` stage as completed. Records approved and rejected quantities, and optionally an additional cost for this stage. Unlocks the batch with `approvedQuantity`.

**Validation:** `approvedQuantity + rejectedQuantity` must equal `stage.receivedQuantity`.

#### Path Parameters

| Param            | Type   | Notes            |
| ---------------- | ------ | ---------------- |
| `productBatchId` | `uuid` | Product Batch ID |
| `stageId`        | `uuid` | Stage ID         |

#### Request Body

```json
{
  "approvedQuantity": 93,
  "rejectedQuantity": 2,
  "additionalCost": 500,
  "notes": "2 units failed visual inspection"
}
```

| Field              | Type     | Required | Notes                                                                                       |
| ------------------ | -------- | -------- | ------------------------------------------------------------------------------------------- |
| `approvedQuantity` | `number` | Yes      | Min 1; units that passed this stage                                                         |
| `rejectedQuantity` | `number` | No       | Min 0, default 0; units rejected/scrapped                                                   |
| `additionalCost`   | `number` | No       | Min 0; cost incurred in this stage (packaging, labour, etc.) — added to `costPerUnit`       |
| `notes`            | `string` | No       |                                                                                             |

**Cost recalculation:**
```
newCostPerUnit = (prevCostPerUnit × receivedQuantity + additionalCost) / receivedQuantity
```

#### Response `200 OK`

Full updated product batch. Check:
- `batch.quantity` → now equals `approvedQuantity`
- `batch.availableQuantity` → now equals `approvedQuantity` (unlocked)
- `batch.costPerUnit` → updated if `additionalCost > 0`
- The completed stage's `approvedQuantity`, `rejectedQuantity`, `costPerUnit` are filled in.

#### Errors

```json
{
  "statusCode": 400,
  "message": "approvedQuantity (91) + rejectedQuantity (3) must equal receivedQuantity (95)",
  "error": "Bad Request"
}
{ "statusCode": 404, "message": "Stage not found or does not belong to this batch" }
```

---

### 7. Cancel a Stage

```
PATCH /product-batches/:productBatchId/stages/:stageId/cancel
Permission: stock.update
```

Cancels the latest `IN_PROGRESS` stage, reverting the batch to the previous stage's state.

**Rules:**
- Only the **latest** stage can be cancelled.
- Cannot cancel after the batch is finalized.
- Cannot cancel the initial `"Production"` stage (that would require cancelling the production order instead).

#### Path Parameters

| Param            | Type   | Notes            |
| ---------------- | ------ | ---------------- |
| `productBatchId` | `uuid` | Product Batch ID |
| `stageId`        | `uuid` | Stage ID         |

#### Request Body

No body required.

#### Response `200 OK`

Full updated product batch with the stage marked `CANCELLED` and the batch reverted.

---

### 8. Finalize Batch (Push to Stock)

```
PATCH /product-batches/:productBatchId/finalize
Permission: stock.update
```

Marks the batch as a **finished good** (`isFinal = true`) and pushes the units into sellable stock.

**What happens:**
1. If there is an `IN_PROGRESS` stage, it is auto-completed with full approval (`approvedQty = receivedQty`, `rejectedQty = 0`, `additionalCost = 0`).
2. `batch.isFinal = true`, `manufacturingDate`, `expiryDate` set.
3. `Product.currentStock += batch.availableQuantity`.
4. `Product.costPrice = batch.costPerUnit` (AVCO).
5. A `StockLedger` entry is created.

**Pre-conditions:**
- Batch status ∈ `ACTIVE` or `PARTIAL`.
- Batch not already finalized (`isFinal = false`).

#### Path Parameter

| Param            | Type   | Notes            |
| ---------------- | ------ | ---------------- |
| `productBatchId` | `uuid` | Product Batch ID |

#### Request Body

```json
{
  "manufacturingDate": "2026-06-16",
  "expiryDate": "2027-06-16",
  "notes": "Passed all QC checks — released to stock"
}
```

| Field               | Type              | Required | Notes                                            |
| ------------------- | ----------------- | -------- | ------------------------------------------------ |
| `manufacturingDate` | `ISO date string` | No       |                                                  |
| `expiryDate`        | `ISO date string` | No       |                                                  |
| `notes`             | `string`          | No       |                                                  |

#### Response `200 OK`

Full updated product batch with `isFinal: true` and `availableQuantity` set to the final approved quantity.

#### Errors

```json
{ "statusCode": 400, "message": "Batch is already finalized" }
{ "statusCode": 400, "message": "Cannot finalize a BLOCKED batch" }
```

---

## Raw Material Batches API

Raw material batches are created automatically when a GRN is processed. Use these endpoints to view, monitor, and manually consume batches.

### 1. List Raw Material Batches (Paginated)

```
GET /raw-material-batches
Permission: stock.read
```

#### Query Parameters

| Param            | Type                      | Default     | Notes                                    |
| ---------------- | ------------------------- | ----------- | ---------------------------------------- |
| `page`           | `number`                  | `1`         |                                          |
| `limit`          | `number`                  | `10`        |                                          |
| `search`         | `string`                  | —           | Searches `batchNumber`                   |
| `rawMaterialId`  | `uuid`                    | —           | Filter by raw material                   |
| `siteId`         | `uuid`                    | —           | Filter by storage site                   |
| `grnId`          | `uuid`                    | —           | Filter by GRN                            |
| `status`         | `RawMaterialBatchStatus`  | —           | `ACTIVE`, `PARTIAL`, `QUARANTINE`, etc.  |
| `expiringDays`   | `number`                  | —           | 1–365; show batches expiring within N days |
| `sortBy`         | `string`                  | `createdAt` |                                          |
| `sortOrder`      | `"ASC"` \| `"DESC"`       | `"DESC"`    |                                          |

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "rm-batch-uuid",
      "batchNumber": "RM-202606-0001",
      "rawMaterialId": "rm-uuid",
      "grnItemId": "grn-item-uuid",
      "siteId": "site-uuid",
      "receivedQuantity": 500,
      "consumedQuantity": 231,
      "returnedQuantity": 0,
      "availableQuantity": 269,
      "reservedQuantity": 0,
      "unitCost": 10,
      "manufacturingDate": null,
      "expiryDate": "2027-06-01T00:00:00.000Z",
      "receivedDate": "2026-06-01T00:00:00.000Z",
      "status": "PARTIAL",
      "notes": null,
      "createdAt": "2026-06-01T10:00:00.000Z",
      "rawMaterial": {
        "id": "rm-uuid",
        "name": "Wood Plank",
        "code": "WP-001"
      },
      "site": {
        "id": "site-uuid",
        "name": "Main Warehouse",
        "code": "WH-001"
      }
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

### 2. Get Single Raw Material Batch

```
GET /raw-material-batches/:batchId
Permission: stock.read
```

Returns full batch details including GRN item, quality inspection history, and consumption records.

#### Path Parameter

| Param     | Type   | Notes                   |
| --------- | ------ | ----------------------- |
| `batchId` | `uuid` | Raw Material Batch ID   |

---

### 3. Get Expiring Batches

```
GET /raw-material-batches/expiring?days=30
Permission: stock.read
```

Returns all batches that will expire within the next N days.

#### Query Parameters

| Param  | Type     | Default | Notes    |
| ------ | -------- | ------- | -------- |
| `days` | `number` | `30`    | 1 to 365 |

#### Response `200 OK`

Array of batch objects (same shape as list response items), ordered by `expiryDate ASC`.

---

### 4. Get FIFO Allocation Preview

```
GET /raw-material-batches/fifo/:rawMaterialId?quantity=N
Permission: stock.read
```

Preview which batches would be consumed (and how much from each) if `N` units of this raw material were needed. Useful for showing stock impact before creating a production order.

#### Path & Query Parameters

| Param           | Location | Type     | Notes                                   |
| --------------- | -------- | -------- | --------------------------------------- |
| `rawMaterialId` | path     | `uuid`   | Raw material ID                         |
| `quantity`      | query    | `number` | Quantity to simulate allocation for     |

#### Response `200 OK`

```json
{
  "rawMaterialId": "rm-uuid",
  "requestedQuantity": 231,
  "allocatedQuantity": 231,
  "shortfall": 0,
  "totalCost": 2472,
  "allocations": [
    {
      "batchId": "rm-batch-uuid-1",
      "batchNumber": "RM-202606-0001",
      "allocatedQuantity": 150,
      "unitCost": 10,
      "totalCost": 1500
    },
    {
      "batchId": "rm-batch-uuid-2",
      "batchNumber": "RM-202605-0002",
      "allocatedQuantity": 81,
      "unitCost": 12,
      "totalCost": 972
    }
  ]
}
```

> If `shortfall > 0`, the production order creation will fail with an insufficient stock error.

---

### 5. Update Raw Material Batch

```
PATCH /raw-material-batches/:batchId
Permission: stock.update
```

Manually updates a batch's `status` or `notes` (e.g., to `BLOCKED` or `QUARANTINE`).

#### Path Parameter

| Param     | Type   | Notes                   |
| --------- | ------ | ----------------------- |
| `batchId` | `uuid` | Raw Material Batch ID   |

#### Request Body

```json
{
  "status": "QUARANTINE",
  "notes": "Moisture damage found — awaiting inspection decision"
}
```

| Field    | Type                      | Required | Notes                                  |
| -------- | ------------------------- | -------- | -------------------------------------- |
| `status` | `RawMaterialBatchStatus`  | No       | `ACTIVE`, `BLOCKED`, `QUARANTINE`, etc.|
| `notes`  | `string`                  | No       |                                        |

#### Response `200 OK`

Full updated batch.

---

### 6. Consume from Batch

```
POST /raw-material-batches/:batchId/consume
Permission: stock.update
```

Manually consumes a quantity from a batch (outside of production order flows — e.g., direct issue, samples, testing).

#### Path Parameter

| Param     | Type   | Notes                   |
| --------- | ------ | ----------------------- |
| `batchId` | `uuid` | Raw Material Batch ID   |

#### Request Body

```json
{
  "quantity": 5,
  "referenceType": "SAMPLE",
  "referenceId": "sample-request-uuid",
  "notes": "5 pcs issued for lab testing"
}
```

| Field           | Type     | Required | Notes                                         |
| --------------- | -------- | -------- | --------------------------------------------- |
| `quantity`      | `number` | Yes      | Min 0.001; must not exceed `availableQuantity` |
| `referenceType` | `string` | No       | E.g., `"PRODUCTION_ORDER"`, `"SAMPLE"`, `"QC"` |
| `referenceId`   | `uuid`   | No       | ID of the linked record                        |
| `notes`         | `string` | No       |                                               |

#### Response `200 OK`

Full updated batch with `availableQuantity` and `consumedQuantity` updated.

---

### 7. Get Consumption History

```
GET /raw-material-batches/:batchId/consumptions
Permission: stock.read
```

Returns all consumption events for a batch (production order allocations + manual consumes).

#### Path Parameter

| Param     | Type   | Notes                   |
| --------- | ------ | ----------------------- |
| `batchId` | `uuid` | Raw Material Batch ID   |

#### Response `200 OK`

```json
[
  {
    "id": "consumption-uuid",
    "batchId": "rm-batch-uuid",
    "quantity": 231,
    "referenceType": "PRODUCTION_ORDER",
    "referenceId": "order-uuid",
    "notes": null,
    "createdById": "user-uuid",
    "createdAt": "2026-06-18T11:05:00.000Z"
  }
]
```

---

## Error Responses

All endpoints follow standard NestJS HTTP exception shapes.

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "...",
  "error": "Bad Request"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Production order \"<id>\" not found",
  "error": "Not Found"
}
```

### 409 Conflict

```json
{
  "statusCode": 409,
  "message": "A stage is already in progress for this batch",
  "error": "Conflict"
}
```

---

## Frontend Implementation Notes

### Status Badge Colors (suggested)

**Production Order `status`**

| Status        | Color        |
| ------------- | ------------ |
| `DRAFT`       | Gray         |
| `IN_PROGRESS` | Blue         |
| `COMPLETED`   | Green        |
| `CANCELLED`   | Red          |

**Product Batch `status`**

| Status       | Color        |
| ------------ | ------------ |
| `ACTIVE`     | Green        |
| `PARTIAL`    | Amber/Orange |
| `BLOCKED`    | Red          |
| `QUARANTINE` | Purple       |
| `CONSUMED`   | Gray         |
| `EXPIRED`    | Red/Muted    |

**Stage `status`**

| Status        | Color  |
| ------------- | ------ |
| `IN_PROGRESS` | Blue   |
| `COMPLETED`   | Green  |
| `CANCELLED`   | Gray   |

**Raw Material Batch `status`**

| Status       | Color        |
| ------------ | ------------ |
| `ACTIVE`     | Green        |
| `PARTIAL`    | Amber/Orange |
| `BLOCKED`    | Red          |
| `QUARANTINE` | Purple       |
| `CONSUMED`   | Gray         |
| `EXPIRED`    | Red/Muted    |

### Typical Screen Flows

**Create Production Order**
1. Select a product → fetch available BOMs for that product.
2. Select a BOM → the system will compute material requirements.
3. (Optional) Use `GET /raw-material-batches/fifo/:rawMaterialId?quantity=N` to preview stock impact before submitting.
4. `POST /production-orders`.
5. Review material allocations shown in `materials[].batchAllocations[]`.
6. "Confirm" → `PATCH /production-orders/:id/status` with `{ action: "CONFIRM" }`.

**Production Detail Screen**
- `GET /production-orders/:id` for full detail.
- Show `materials[]` table: `rawMaterial.name`, `requiredQuantity`, `consumedQuantity`, `estimatedCost`.
- Show `costs[]` table (if any). "Add Cost" → `POST /production-orders/:id/costs`.
- Show `wastes[]` table (if any). "Add Waste" → `POST /production-orders/:id/wastes`.
- "Complete" → show a modal asking for `producedQuantity` → `PATCH /production-orders/:id/status` with `{ action: "COMPLETE", producedQuantity: N }`.

**Product Batch Detail Screen**
- `GET /product-batches/:id` for stages timeline.
- Render stages as a vertical timeline: each stage shows `stageName`, `status`, `receivedQuantity`, `approvedQuantity`, `rejectedQuantity`, `additionalCost`, `costPerUnit`.
- For the `IN_PROGRESS` stage:
  - "Complete Stage" → show a form for `approvedQuantity`, `rejectedQuantity`, `additionalCost` → `PATCH /product-batches/:id/stages/:stageId/complete`.
  - "Cancel Stage" → `PATCH /product-batches/:id/stages/:stageId/cancel` (show confirmation).
- After all stages are complete and batch is not yet finalized:
  - "Start Next Stage" → `POST /product-batches/:id/stages/start` with `stageName`.
  - "Finalize & Push to Stock" → show a form for `manufacturingDate`, `expiryDate` → `PATCH /product-batches/:id/finalize`.

**Batch Available Quantity Indicator**
- When a stage is `IN_PROGRESS`, `availableQuantity = 0`. Show a notice: *"Batch is locked — currently in Packing stage."*
- After stage completes, show: *"93 units available."*

**FIFO Allocation Preview Widget**
When creating a production order, show a per-material stock preview using `GET /raw-material-batches/fifo/:rawMaterialId?quantity=N`. Highlight in red if `shortfall > 0` and block form submission until resolved.

**Expiry Monitoring Dashboard**
- `GET /raw-material-batches/expiring?days=30` for a dashboard warning widget.
- Sort by `expiryDate ASC` (already ordered by the backend).
- Colour code: ≤ 7 days → Red, 8–30 days → Amber.

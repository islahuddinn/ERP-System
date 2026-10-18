# Raw Material Batches API

## Table of Contents

1. [Overview](#1-overview)
2. [Permissions](#2-permissions)
3. [Enums & Constants](#3-enums--constants)
4. [Endpoints](#4-endpoints)
   - [4.1 List Batches (Paginated)](#41-list-batches-paginated)
   - [4.2 Get Expiring Batches](#42-get-expiring-batches)
   - [4.3 FIFO/FEFO Allocation](#43-fifofefo-allocation)
   - [4.4 Get Single Batch](#44-get-single-batch)
   - [4.5 Get Batch Consumption History](#45-get-batch-consumption-history)
   - [4.6 Update Batch](#46-update-batch)
   - [4.7 Consume from Batch](#47-consume-from-batch)
   - [4.8 Create Batch Inspection](#48-create-batch-inspection)
   - [4.9 Get Batch Inspection History](#49-get-batch-inspection-history)
   - [4.10 Update Batch Inspection](#410-update-batch-inspection)
5. [Error Responses](#5-error-responses)
6. [Frontend Implementation Notes](#6-frontend-implementation-notes)

---

## 1. Overview

Raw Material Batches represent individual inventory **lots** of a raw material, tracked separately for traceability, FIFO/FEFO consumption, expiry management, and quality control.

Key concepts:

- **Batches are created automatically when a GRN is recorded.** There is **no** standalone "create batch" or "bulk create from GRN" endpoint on this controller anymore. Each `GrnItemBatchDto` entry submitted on `POST /grn` (see `create-grn.dto.ts`) becomes one `RawMaterialBatch` row, created inside the same transaction as the GRN. The sum of a GRN item's batch quantities must equal that item's `receivedQuantity`.
- **New batches start in `QUARANTINE` status.** They are NOT immediately usable for FIFO allocation or consumption until a quality inspection moves them to `ACTIVE` (or `BLOCKED`).
- **Quality inspections are now batch-level**, not GRN-level. The old GRN-level "quality inspection" resource has been removed entirely (see migration `20260610010000_remove_grn_quality_inspection`). Inspections are recorded per `RawMaterialBatch` via the new `RawMaterialBatchInspection` model/endpoints documented below.
- **FIFO/FEFO allocation**: `GET /raw-material-batches/fifo/:rawMaterialId` returns batches ordered by earliest expiry first (FEFO), falling back to earliest received (FIFO). Only `ACTIVE`/`PARTIAL` batches with `availableQuantity > 0` and a non-expired (or null) `expiryDate` are eligible.
- **Consumption tracking**: every deduction from `availableQuantity` (production consumption, quality rejection, purchase return) creates a `RawMaterialBatchConsumption` record for a full audit trail, and updates `currentStock` on the parent `RawMaterial`.
- **GRN no longer carries `site`, `supplier`, or item-level `expiryDate`** at the GRN level — these now live on the batch (`siteId`, `expiryDate`, `manufacturingDate` on `RawMaterialBatch`). The single-batch response no longer includes a supplier (the GRN `purchaseOrder.supplier` relation is the only path to supplier info, and is not included in batch responses).

---

## 2. Permissions

| Permission | Used For |
|---|---|
| `stock.read` | List batches, get expiring batches, FIFO allocation, get single batch, consumption history, get inspections |
| `stock.create` | (none directly on this controller — batch creation happens via `POST /grn`) |
| `stock.update` | Update batch (status/notes), consume from batch, create/update batch inspection |

All routes require `JwtAuthGuard` + `PermissionsGuard` (Bearer token).

---

## 3. Enums & Constants

### `RawMaterialBatchStatus`

```
ACTIVE       // available for FIFO allocation and consumption
PARTIAL      // partially consumed/rejected, still has availableQuantity > 0
CONSUMED     // availableQuantity reached 0
EXPIRED      // past expiryDate (not auto-set by current code; available for manual/cron use)
BLOCKED      // failed inspection (qualityStatus = FAILED) — not consumable
QUARANTINE   // newly created from GRN, pending inspection
```

> Note: there is **no** `REJECTED` status (the older doc referenced this). A batch that fails inspection moves to `BLOCKED`, or to `CONSUMED` if the rejected quantity consumes all remaining stock.

### `InspectionType`

```
VISUAL         — Visual inspection (appearance, color, packaging condition)
DIMENSIONAL    — Measurement-based checks (size, weight, dimensions)
FUNCTIONAL     — Functional/performance testing
LAB_TEST       — Laboratory testing (purity, composition, etc.)
DOCUMENTATION  — Paperwork/certificate verification (e.g., COA, MSDS)
```

### `QualityStatus`

```
PENDING       — Inspection not yet completed
PASSED        — Batch passed inspection, fully usable
FAILED        — Batch failed inspection, batch moves to BLOCKED (or CONSUMED if fully rejected)
CONDITIONAL   — Passed with conditions/notes — usable but flagged
```

### `QualityStatus`

```
PENDING
PASSED
FAILED
CONDITIONAL
```

### Batch status transition on inspection

The repository maps `qualityStatus` → new `RawMaterialBatchStatus` as follows:

| `qualityStatus` | New batch status |
|---|---|
| `PASSED` | `ACTIVE` |
| `CONDITIONAL` | `ACTIVE` |
| `FAILED` | `BLOCKED` |
| `PENDING` | unchanged (stays `QUARANTINE`) |

If `rejectedQuantity` is provided and the resulting `availableQuantity <= 0` (and the status isn't `BLOCKED`), the batch status becomes `CONSUMED` instead.

### Number formats (auto-generated)

| Entity | Format | Example |
|---|---|---|
| `batchNumber` | `RM-YYYYMM-NNNN` (sequential per month) | `RM-202606-0001` |
| `inspectionNumber` | `QC-RM-YYYYMM-NNNN` (sequential per month) | `QC-RM-202606-0001` |

---

## 4. Endpoints

### 4.1 List Batches (Paginated)

```
GET /raw-material-batches
Permission: stock.read
```

#### Query Parameters

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | `number` | `1` | |
| `limit` | `number` | `10` | |
| `search` | `string` | — | Searches by `batchNumber` |
| `sortBy` | `string` | `receivedDate` (desc) | |
| `sortOrder` | `"ASC"` \| `"DESC"` | `"DESC"` | |
| `rawMaterialId` | `uuid` | — | Filter batches for a specific raw material |
| `siteId` | `uuid` | — | Filter batches at a specific site |
| `grnId` | `uuid` | — | Filter batches created from a specific GRN (matches `grnItem.grnId`) |
| `status` | `RawMaterialBatchStatus` | — | `ACTIVE`, `PARTIAL`, `CONSUMED`, `EXPIRED`, `BLOCKED`, `QUARANTINE` |
| `expiringDays` | `number` (1–365) | — | Show only batches with `expiryDate` between today and `today + expiringDays` |

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "batchNumber": "RM-202606-0001",
      "rawMaterialId": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
      "grnItemId": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
      "siteId": "c4d5e6f7-a8b9-0123-cdef-456789012345",
      "receivedQuantity": 500,
      "consumedQuantity": 100,
      "returnedQuantity": 0,
      "availableQuantity": 400,
      "unitCost": 150,
      "manufacturingDate": "2026-01-15T00:00:00.000Z",
      "expiryDate": "2026-12-31T00:00:00.000Z",
      "receivedDate": "2026-06-04T00:00:00.000Z",
      "status": "PARTIAL",
      "notes": "Cold storage lot A",
      "createdById": "user-uuid",
      "updatedById": null,
      "deletedAt": null,
      "createdAt": "2026-06-04T10:00:00.000Z",
      "updatedAt": "2026-06-04T10:05:00.000Z",
      "rawMaterial": {
        "id": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
        "name": "Cotton Yarn",
        "code": "CTN-YARN"
      },
      "site": {
        "id": "c4d5e6f7-a8b9-0123-cdef-456789012345",
        "name": "Main Warehouse",
        "code": "WH-MAIN"
      },
      "grnItem": {
        "id": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
        "receivedQuantity": 700,
        "grn": {
          "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          "receivingNumber": "GRN-2026-001",
          "receivedDate": "2026-06-04T00:00:00.000Z"
        }
      }
    }
  ],
  "meta": {
    "total": 18,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

> Note: `grnItem.grn` no longer includes a `supplier` field in the list view (only `id`, `receivingNumber`, `receivedDate`).

---

### 4.2 Get Expiring Batches

```
GET /raw-material-batches/expiring?days=30
Permission: stock.read
```

Returns batches whose `expiryDate` falls between today (00:00:00) and `today + days` (23:59:59), ordered by earliest expiry first. **Note**: the current implementation does NOT filter by status (the `ACTIVE`/`PARTIAL` status filter is commented out in the repository), so it may include batches in any status that have a matching `expiryDate`.

#### Query Parameters

| Param | Type | Default | Notes |
|---|---|---|---|
| `days` | `number` | `30` | Validated server-side: must be between 0 and 365 (inclusive) |

#### Response `200 OK`

Array (not paginated) of batch objects:

```json
[
  {
    "id": "11111111-1111-1111-1111-111111111111",
    "batchNumber": "RM-202606-0001",
    "rawMaterialId": "...",
    "grnItemId": "...",
    "siteId": "...",
    "receivedQuantity": 500,
    "consumedQuantity": 50,
    "returnedQuantity": 0,
    "availableQuantity": 450,
    "unitCost": 150,
    "manufacturingDate": "2026-01-15T00:00:00.000Z",
    "expiryDate": "2026-06-20T00:00:00.000Z",
    "receivedDate": "2026-06-04T00:00:00.000Z",
    "status": "ACTIVE",
    "notes": null,
    "rawMaterial": {
      "id": "...",
      "name": "Cotton Yarn",
      "code": "CTN-YARN"
    },
    "site": {
      "id": "...",
      "name": "Main Warehouse",
      "code": "WH-MAIN"
    }
  }
]
```

#### Validation Errors `400 Bad Request`

```json
{ "message": "Days cannot be negative" }
{ "message": "Days too large" }
```

---

### 4.3 FIFO/FEFO Allocation

```
GET /raw-material-batches/fifo/:rawMaterialId?quantity=500
Permission: stock.read
```

Returns batches in FEFO order (First-Expired-First-Out, ties broken by `receivedDate` then `createdAt`, ascending). Only includes batches where:
- `status` is `ACTIVE` or `PARTIAL`
- `availableQuantity > 0`
- `expiryDate` is `null` OR `>= now`

#### Path Parameter

| Param | Type | Notes |
|---|---|---|
| `rawMaterialId` | `uuid` | Raw material to allocate |

#### Query Parameter

| Param | Type | Notes |
|---|---|---|
| `quantity` | `number` | Optional. If omitted, returns the available batches summary only |

#### Response — Without `quantity` `200 OK`

```json
{
  "rawMaterialId": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
  "totalAvailable": 950,
  "batches": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "batchNumber": "RM-202606-0001",
      "availableQuantity": 450,
      "expiryDate": "2026-06-20T00:00:00.000Z",
      "receivedDate": "2026-06-04T00:00:00.000Z",
      "status": "PARTIAL",
      "site": { "id": "...", "name": "Main Warehouse", "code": "WH-MAIN" },
      "rawMaterial": { "id": "...", "name": "Cotton Yarn", "code": "CTN-YARN" }
    }
  ]
}
```

#### Response — With `quantity=500` `200 OK`

```json
{
  "rawMaterialId": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
  "requestedQuantity": 500,
  "totalAvailable": 950,
  "totalAllocated": 500,
  "shortfall": 0,
  "isFulfilled": true,
  "allocations": [
    {
      "batchId": "11111111-1111-1111-1111-111111111111",
      "batchNumber": "RM-202606-0001",
      "site": { "id": "...", "name": "Main Warehouse", "code": "WH-MAIN" },
      "expiryDate": "2026-06-20T00:00:00.000Z",
      "receivedDate": "2026-06-04T00:00:00.000Z",
      "totalAvailableQty": 450,
      "allocateQty": 450
    },
    {
      "batchId": "22222222-2222-2222-2222-222222222222",
      "batchNumber": "RM-202606-0002",
      "site": { "id": "...", "name": "Secondary Warehouse", "code": "WH-SEC" },
      "expiryDate": "2026-12-31T00:00:00.000Z",
      "receivedDate": "2026-06-04T00:00:00.000Z",
      "totalAvailableQty": 500,
      "allocateQty": 50
    }
  ]
}
```

| Response Field | Description |
|---|---|
| `totalAvailable` | Total `availableQuantity` summed across all eligible batches |
| `totalAllocated` | `requestedQuantity - shortfall` |
| `shortfall` | `max(0, requestedQuantity - totalAvailable)` |
| `isFulfilled` | `true` if `shortfall === 0` |
| `allocations[].totalAvailableQty` | `availableQuantity` of that batch before allocation |
| `allocations[].allocateQty` | Quantity to take from that batch to meet the request |

---

### 4.4 Get Single Batch

```
GET /raw-material-batches/:batchId
Permission: stock.read
```

#### Path Parameter

| Param | Type | Notes |
|---|---|---|
| `batchId` | `uuid` | Batch ID |

#### Response `200 OK`

Full detail view including UOM and the most recent 20 consumption records:

```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "batchNumber": "RM-202606-0001",
  "rawMaterialId": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
  "grnItemId": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
  "siteId": "c4d5e6f7-a8b9-0123-cdef-456789012345",
  "receivedQuantity": 500,
  "consumedQuantity": 100,
  "returnedQuantity": 0,
  "availableQuantity": 400,
  "unitCost": 150,
  "manufacturingDate": "2026-01-15T00:00:00.000Z",
  "expiryDate": "2026-12-31T00:00:00.000Z",
  "receivedDate": "2026-06-04T00:00:00.000Z",
  "status": "PARTIAL",
  "notes": "Cold storage lot A",
  "createdById": "user-uuid",
  "updatedById": null,
  "deletedAt": null,
  "createdAt": "2026-06-04T10:00:00.000Z",
  "updatedAt": "2026-06-04T10:05:00.000Z",
  "rawMaterial": {
    "id": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
    "name": "Cotton Yarn",
    "code": "CTN-YARN",
    "uom": {
      "name": "Kilogram",
      "symbol": "kg"
    }
  },
  "site": {
    "id": "c4d5e6f7-a8b9-0123-cdef-456789012345",
    "name": "Main Warehouse",
    "code": "WH-MAIN",
    "type": "WAREHOUSE",
    "category": "RAW_MATERIAL"
  },
  "grnItem": {
    "id": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
    "receivedQuantity": 700,
    "grn": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "receivingNumber": "GRN-2026-001",
      "receivedDate": "2026-06-04T00:00:00.000Z",
      "purchaseOrder": {
        "supplier": { "name": "Sunrise Textiles Ltd." }
      }
    }
  },
  "consumptions": [
    {
      "id": "cons-uuid-1",
      "batchId": "11111111-1111-1111-1111-111111111111",
      "consumedQuantity": 100,
      "remainingAfter": 400,
      "consumedDate": "2026-06-04T12:00:00.000Z",
      "referenceType": "PRODUCTION_ORDER",
      "referenceId": "prod-order-uuid",
      "notes": "Used in batch PO-2026-001",
      "createdById": "user-uuid",
      "createdAt": "2026-06-04T10:30:00.000Z"
    }
  ]
}
```

> Note: supplier is now reachable only via `grnItem.grn.purchaseOrder.supplier.name` (and only if the GRN was linked to a purchase order — `purchaseOrder` may be `null` for direct/manual GRNs).

#### Error `404 Not Found`

```json
{ "statusCode": 404, "message": "Raw material batch <batchId> not found", "error": "Not Found" }
```

---

### 4.5 Get Batch Consumption History

```
GET /raw-material-batches/:batchId/consumptions
Permission: stock.read
```

Returns **all** `RawMaterialBatchConsumption` records for a batch, newest first (unlike the single-batch endpoint, which returns only the last 20).

#### Path Parameter

| Param | Type | Notes |
|---|---|---|
| `batchId` | `uuid` | Batch ID |

#### Response `200 OK`

```json
[
  {
    "id": "cons-uuid-1",
    "batchId": "11111111-1111-1111-1111-111111111111",
    "consumedQuantity": 100,
    "remainingAfter": 400,
    "consumedDate": "2026-06-04T12:00:00.000Z",
    "referenceType": "PRODUCTION_ORDER",
    "referenceId": "prod-order-uuid",
    "notes": "Used in batch PO-2026-001",
    "createdById": "user-uuid",
    "createdAt": "2026-06-04T12:00:00.000Z"
  }
]
```

| Field | Description |
|---|---|
| `consumedQuantity` | Quantity removed from `availableQuantity` in this event |
| `remainingAfter` | `availableQuantity` immediately after this event |
| `referenceType` | Free-form source type, e.g. `PRODUCTION_ORDER`, `QUALITY_REJECTION`, `PURCHASE_RETURN` |
| `referenceId` | UUID of the referenced document (e.g. production order, inspection, purchase return) |

#### Error `404 Not Found`

```json
{ "statusCode": 404, "message": "Raw material batch <batchId> not found", "error": "Not Found" }
```

---

### 4.6 Update Batch

```
PATCH /raw-material-batches/:batchId
Permission: stock.update
@Auditable (module: RAW_MATERIAL_BATCHES, entity: RawMaterialBatch)
```

Updates a batch's `status` and/or `notes` directly. Use sparingly — prefer the inspection endpoints to drive status transitions for quality reasons.

#### Path Parameter

| Param | Type | Notes |
|---|---|---|
| `batchId` | `uuid` | Batch ID |

#### Request Body

```json
{
  "status": "BLOCKED",
  "notes": "Manually blocked pending re-inspection"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `status` | `RawMaterialBatchStatus` | No | `ACTIVE`, `PARTIAL`, `CONSUMED`, `EXPIRED`, `BLOCKED`, `QUARANTINE` |
| `notes` | `string` | No | |

> Both fields are passed through as-is from the request body (no DTO validation beyond TypeScript typing on this route) — be careful with the values you send from the frontend.

#### Response `200 OK`

Returns the updated batch with `rawMaterial` and `site` relations:

```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "batchNumber": "RM-202606-0001",
  "status": "BLOCKED",
  "notes": "Manually blocked pending re-inspection",
  "availableQuantity": 400,
  "rawMaterial": {
    "id": "...",
    "name": "Cotton Yarn",
    "code": "CTN-YARN"
  },
  "site": {
    "id": "...",
    "name": "Main Warehouse",
    "code": "WH-MAIN"
  }
}
```

---

### 4.7 Consume from Batch

```
POST /raw-material-batches/:batchId/consume
Permission: stock.update
@Auditable (module: RAW_MATERIAL_BATCHES, entity: RawMaterialBatch)
```

Deducts a quantity from a batch. Automatically (in a single transaction):
- Decrements `availableQuantity` and increments `consumedQuantity` on the batch
- Updates batch `status` to `PARTIAL` (if `availableQuantity > 0` after consumption) or `CONSUMED` (if it reaches `<= 0`)
- Decrements `currentStock` on the parent `RawMaterial`
- Creates a `RawMaterialBatchConsumption` record (`referenceType`/`referenceId`/`notes` from the request)

**Can only consume from `ACTIVE` or `PARTIAL` batches** (not `QUARANTINE`, `BLOCKED`, `CONSUMED`, or `EXPIRED`).

#### Path Parameter

| Param | Type | Notes |
|---|---|---|
| `batchId` | `uuid` | Batch ID to consume from |

#### Request Body

```json
{
  "quantity": 50,
  "referenceType": "PRODUCTION_ORDER",
  "referenceId": "prod-order-uuid",
  "notes": "Used for production run #42"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `quantity` | `number` | Yes | Must be `>= 0.001` and `<= availableQuantity` |
| `referenceType` | `string` | No | Freeform type of the triggering document |
| `referenceId` | `string` | No | ID of the triggering document |
| `notes` | `string` | No | |

#### Response `200 OK`

Updated batch (with `rawMaterial` and `site` relations):

```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "batchNumber": "RM-202606-0001",
  "receivedQuantity": 500,
  "consumedQuantity": 150,
  "availableQuantity": 350,
  "status": "PARTIAL",
  "rawMaterial": {
    "id": "...",
    "name": "Cotton Yarn",
    "code": "CTN-YARN"
  },
  "site": {
    "id": "...",
    "name": "Main Warehouse",
    "code": "WH-MAIN"
  }
}
```

#### Validation Errors `400 Bad Request`

```json
{ "message": "Batch RM-202606-0001 cannot be consumed (status: QUARANTINE)" }
{ "message": "Consume quantity must be greater than 0" }
{ "message": "Cannot consume 600 — only 350 available in batch RM-202606-0001" }
```

---

### 4.8 Create Batch Inspection

```
POST /raw-material-batches/:batchId/inspections
Permission: stock.update
@Auditable (module: RAW_MATERIAL_BATCHES, entity: RawMaterialBatchInspection)
```

Records a quality inspection result for a batch. **The batch must currently be in `QUARANTINE` status** — this is the primary mechanism for moving a freshly-received batch into `ACTIVE` (usable) or `BLOCKED` (failed) state.

The backend auto-generates `inspectionNumber` (format `QC-RM-YYYYMM-NNNN`).

#### Path Parameter

| Param | Type | Notes |
|---|---|---|
| `batchId` | `uuid` | Batch to inspect (must be `QUARANTINE`) |

#### Request Body — `CreateRawMaterialBatchInspectionDto`

```json
{
  "inspectionType": "VISUAL",
  "qualityStatus": "CONDITIONAL",
  "approvedQuantity": 450,
  "rejectedQuantity": 50,
  "results": "All parameters within acceptable range; minor surface staining on 50kg",
  "observations": ["Slight discoloration on outer wrap", "No odor detected"],
  "notes": "Approved for non-visible-surface use only",
  "inspectedDate": "2026-06-10T00:00:00Z"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `inspectionType` | `InspectionType` enum | Yes | `VISUAL`, `DIMENSIONAL`, `FUNCTIONAL`, `LAB_TEST`, `DOCUMENTATION` |
| `qualityStatus` | `QualityStatus` enum | Yes | `PENDING`, `PASSED`, `FAILED`, `CONDITIONAL` |
| `approvedQuantity` | `number` | No | Quantity that passed inspection. Must be `>= 0` |
| `rejectedQuantity` | `number` | No | Quantity rejected. Must be `>= 0` |
| `results` | `string` | Yes | Free-text summary of inspection results |
| `observations` | `string[]` | No | Defaults to `[]` |
| `notes` | `string` | No | |
| `inspectedDate` | `ISO 8601 string` | No | Defaults to `now()` if omitted |

#### Business Rules / Validation (enforced in service layer)

- Batch `status` must be `QUARANTINE`, otherwise:
  ```json
  { "message": "Batch RM-202606-0001 is not pending inspection (status: ACTIVE)" }
  ```
- `rejectedQuantity` cannot exceed the batch's current `availableQuantity`:
  ```json
  { "message": "rejectedQuantity (600) cannot exceed batch available quantity (500)" }
  ```
- If both `approvedQuantity` and `rejectedQuantity` are provided, their sum cannot exceed `receivedQuantity`:
  ```json
  { "message": "approvedQuantity + rejectedQuantity (600) cannot exceed received quantity (500)" }
  ```

#### Side Effects (transactional)

1. Creates a `RawMaterialBatchInspection` record with an auto-generated `inspectionNumber`, `inspectedById` and `createdById` set to the requesting user.
2. Maps `qualityStatus` to a new batch `status`:
   - `PASSED` → `ACTIVE`
   - `CONDITIONAL` → `ACTIVE`
   - `FAILED` → `BLOCKED`
   - `PENDING` → batch status unchanged (stays `QUARANTINE`)
3. If `rejectedQuantity > 0`:
   - `availableQuantity` is decremented by `rejectedQuantity`
   - A `RawMaterialBatchConsumption` record is created with `referenceType: "QUALITY_REJECTION"` and `referenceId` = the inspection's ID
   - `currentStock` on the parent `RawMaterial` is decremented by `rejectedQuantity`
   - If the resulting `availableQuantity <= 0` and the status isn't already `BLOCKED`, the batch status becomes `CONSUMED` (rather than `ACTIVE`)
4. Updates the batch's `status`, `availableQuantity`, and `updatedById`.

#### Response `201 Created`

Returns the created `RawMaterialBatchInspection` record:

```json
{
  "id": "insp-uuid-1",
  "inspectionNumber": "QC-RM-202606-0001",
  "batchId": "11111111-1111-1111-1111-111111111111",
  "inspectionType": "VISUAL",
  "qualityStatus": "CONDITIONAL",
  "approvedQuantity": 450,
  "rejectedQuantity": 50,
  "results": "All parameters within acceptable range; minor surface staining on 50kg",
  "observations": ["Slight discoloration on outer wrap", "No odor detected"],
  "notes": "Approved for non-visible-surface use only",
  "inspectedDate": "2026-06-10T00:00:00.000Z",
  "inspectedById": "user-uuid",
  "createdById": "user-uuid",
  "updatedById": null,
  "createdAt": "2026-06-10T08:00:00.000Z",
  "updatedAt": "2026-06-10T08:00:00.000Z"
}
```

---

### 4.9 Get Batch Inspection History

```
GET /raw-material-batches/:batchId/inspections
Permission: stock.read
```

Returns all inspections for a batch, ordered by `inspectedDate` descending.

#### Path Parameter

| Param | Type | Notes |
|---|---|---|
| `batchId` | `uuid` | Batch ID |

#### Response `200 OK`

```json
[
  {
    "id": "insp-uuid-1",
    "inspectionNumber": "QC-RM-202606-0001",
    "batchId": "11111111-1111-1111-1111-111111111111",
    "inspectionType": "VISUAL",
    "qualityStatus": "CONDITIONAL",
    "approvedQuantity": 450,
    "rejectedQuantity": 50,
    "results": "All parameters within acceptable range; minor surface staining on 50kg",
    "observations": ["Slight discoloration on outer wrap", "No odor detected"],
    "notes": "Approved for non-visible-surface use only",
    "inspectedDate": "2026-06-10T00:00:00.000Z",
    "inspectedById": "user-uuid",
    "createdById": "user-uuid",
    "updatedById": null,
    "createdAt": "2026-06-10T08:00:00.000Z",
    "updatedAt": "2026-06-10T08:00:00.000Z"
  }
]
```

---

### 4.10 Update Batch Inspection

```
PATCH /raw-material-batches/inspections/:inspectionId
Permission: stock.update
@Auditable (module: RAW_MATERIAL_BATCHES, entity: RawMaterialBatchInspection)
```

Updates an existing inspection record. **Note:** unlike `createInspection`, this endpoint does **not** re-run the batch status / `availableQuantity` / `currentStock` side effects — it only patches the `RawMaterialBatchInspection` row itself. If you change `qualityStatus` or `rejectedQuantity` here, the parent batch's `status`/`availableQuantity` will NOT be automatically recalculated.

#### Path Parameter

| Param | Type | Notes |
|---|---|---|
| `inspectionId` | `uuid` | Inspection record ID (not the batch ID) |

#### Request Body — `UpdateRawMaterialBatchInspectionDto` (all fields optional)

```json
{
  "qualityStatus": "PASSED",
  "approvedQuantity": 500,
  "rejectedQuantity": 0,
  "results": "Re-tested and approved in full",
  "observations": ["Re-test confirmed no contamination"],
  "notes": "Superseded earlier rejection after re-test"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `qualityStatus` | `QualityStatus` enum | No | `PENDING`, `PASSED`, `FAILED`, `CONDITIONAL` |
| `approvedQuantity` | `number` | No | `>= 0` |
| `rejectedQuantity` | `number` | No | `>= 0` |
| `results` | `string` | No | |
| `observations` | `string[]` | No | |
| `notes` | `string` | No | |

#### Response `200 OK`

Returns the updated `RawMaterialBatchInspection` record (same shape as 4.8/4.9), with `updatedById` set to the requesting user.

#### Error `404 Not Found`

```json
{ "statusCode": 404, "message": "Inspection <inspectionId> not found", "error": "Not Found" }
```

---

## 5. Error Responses

All endpoints follow standard NestJS HTTP exception shapes.

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "...",
  "error": "Bad Request"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden (missing permission)

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Raw material batch <batchId> not found",
  "error": "Not Found"
}
```

```json
{
  "statusCode": 404,
  "message": "Inspection <inspectionId> not found",
  "error": "Not Found"
}
```

---

## 6. Frontend Implementation Notes

### Batch creation is implicit (via GRN)

There is no dedicated "create batch" screen anymore. When recording a GRN (`POST /grn`), each line item (`CreateGrnItemDto`) requires a `batches: GrnItemBatchDto[]` array whose quantities must sum to `receivedQuantity`. Each entry becomes a `RawMaterialBatch` with status `QUARANTINE`:

```json
{
  "siteId": "uuid-of-site",
  "quantity": 50,
  "manufacturingDate": "2024-01-10",
  "expiryDate": "2024-07-10",
  "notes": "Stored in cold storage"
}
```

`manufacturingDate`/`expiryDate` here use plain `YYYY-MM-DD` format (not full ISO datetimes) per `GrnItemBatchDto` validation.

### Batch Status Colors (suggested)

| Status | Color | Meaning |
|---|---|---|
| `QUARANTINE` | Blue/Gray | Newly received, awaiting inspection — not usable yet |
| `ACTIVE` | Green | Inspected and available for FIFO/FEFO allocation |
| `PARTIAL` | Amber/Orange | Partially consumed/rejected, still has stock |
| `CONSUMED` | Gray | `availableQuantity` reached 0 |
| `BLOCKED` | Red | Failed inspection (`qualityStatus = FAILED`) — do not consume |
| `EXPIRED` | Dark Red | Past `expiryDate` |

### Typical Screen Flows

**Pending Inspection Queue**
- `GET /raw-material-batches?status=QUARANTINE` to list batches awaiting QC
- Click into a batch → `GET /raw-material-batches/:batchId` for full detail (received qty, GRN reference, raw material UOM)
- `GET /raw-material-batches/:batchId/inspections` to show any prior inspection attempts

**Record an Inspection (the new core QC workflow)**
1. From the pending-inspection queue, open a `QUARANTINE` batch
2. User selects `inspectionType`, sets `qualityStatus` (`PASSED` / `CONDITIONAL` / `FAILED` / `PENDING`), enters `approvedQuantity`/`rejectedQuantity`, `results`, `observations`, `notes`
3. `POST /raw-material-batches/:batchId/inspections`
4. On success:
   - If `qualityStatus` was `PASSED`/`CONDITIONAL` → batch becomes `ACTIVE` (or `CONSUMED` if fully rejected) and is now visible in FIFO allocation results
   - If `FAILED` → batch becomes `BLOCKED` and should be visually flagged/excluded from consumption flows
   - If `rejectedQuantity > 0`, refresh the batch detail to show the new `availableQuantity` and the auto-created `QUALITY_REJECTION` consumption record in the consumption history
5. To correct a previously-submitted inspection's text/observations (without altering batch quantities/status), use `PATCH /raw-material-batches/inspections/:inspectionId`

**Blocked Batch Handling**
- `GET /raw-material-batches?status=BLOCKED` to list batches that failed QC
- These are excluded from `GET /raw-material-batches/fifo/:rawMaterialId` and `POST /raw-material-batches/:batchId/consume` will reject with a 400 if attempted
- A supervisor can manually override via `PATCH /raw-material-batches/:batchId` (e.g., set `status: "ACTIVE"` after a documented exception) — but prefer creating a follow-up inspection record for traceability where possible

**Raw Material Detail / Stock Screen**
- Tab or section for batches: `GET /raw-material-batches?rawMaterialId=:id`
- FIFO/FEFO view: `GET /raw-material-batches/fifo/:id?quantity=X`

**Batch Detail Screen**
- `GET /raw-material-batches/:batchId`
- Consumption history tab: `GET /raw-material-batches/:batchId/consumptions`
- Inspection history tab: `GET /raw-material-batches/:batchId/inspections`
- Status/notes edit: `PATCH /raw-material-batches/:batchId`

**Expiry Alert Dashboard Widget**
- `GET /raw-material-batches/expiring?days=30`
- Remember this currently returns batches of ANY status with a matching `expiryDate` — filter client-side by `status` if you only want actionable (`ACTIVE`/`PARTIAL`) batches

**Consume Modal (e.g., from Production Order)**
- Use the FIFO endpoint first (`GET /raw-material-batches/fifo/:rawMaterialId?quantity=X`) to determine which batches/quantities to draw from
- For each allocation, call `POST /raw-material-batches/:batchId/consume` with `quantity: allocateQty`, `referenceType: "PRODUCTION_ORDER"`, `referenceId: <productionOrderId>`

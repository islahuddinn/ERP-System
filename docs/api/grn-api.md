# GRN (Goods Received Note) Module — Frontend API Reference

> **Purpose**: Complete API reference for the GRN module (recently refactored).  
> **Audience**: Frontend developers building the GRN screens.  
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).  
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [GRN API](#grn-api)
   - [Create GRN](#1-create-grn)
   - [Get GRN Stats](#2-get-grn-stats)
   - [List GRNs (paginated)](#3-list-grns-paginated)
   - [Get Single GRN](#4-get-single-grn)
5. [Auto-Created Raw Material Batches](#auto-created-raw-material-batches)
6. [Error Responses](#error-responses)
7. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

The GRN module records **goods physically received against a confirmed Purchase Order** (or other receiving types such as returns). Each GRN has one or more line items (`GRNItem`), and each line item must specify how its received quantity is split across one or more **raw material batches** (with site, optional manufacturing/expiry dates, and notes).

Key relationships:

- **GRN ↔ Purchase Order**: A GRN is normally created against a `purchaseOrderId`. The backend validates that:
  - The PO exists and is not `CANCELLED` or already `RECEIVED`.
  - The set of raw materials on the GRN exactly matches the set of raw materials on the PO (no extras, no missing items).
  - The total received quantity per raw material does not exceed the PO's remaining quantity (`quantity - receivedQty`).
  - **Only one GRN is allowed per purchase order** — attempting to create a second GRN for the same PO is rejected.
- **GRN → Raw Material Batches**: GRN creation **automatically creates raw material batches** (one per `batches[]` entry on each GRN item) inside the same database transaction as the GRN itself. There is no separate "create batches" step for the normal PO-receiving flow.
- **GRN → Purchase Order status sync**: When `purchaseOrderId` is set, creating the GRN automatically increments `receivedQty` on each matching `PurchaseItem` and updates the PO's `status` to `PARTIAL` or `RECEIVED` depending on whether all items are now fully received.
- **Quality inspection** is **no longer part of the GRN module**. Inspections now happen against raw material batches via `/raw-material-batches/:batchId/inspections` (see the Raw Material Batches API doc). The GRN module has no inspection endpoints, DTOs, or fields.
- `site`, expiry-related fields on `GRNItem`, and supplier/material-transfer relations directly on the GRN record have been removed. Supplier information is still available indirectly via `GRN.purchaseOrder.supplier`.

---

## Permissions

| Permission Key | What it guards |
|---|---|
| `grn.create` | Create a GRN |
| `grn.read` | List / view GRNs, view GRN stats |

---

## Enums & Constants

### `ReceivingStatus`

```
PENDING     — GRN created but not yet processed
INSPECTING  — Goods under inspection
APPROVED    — Goods approved
REJECTED    — Goods rejected
COMPLETED   — Receiving fully completed
```

> **Note**: The current `create` flow always sets a new GRN's status to `COMPLETED` directly (there is no separate approval/inspection workflow inside this module anymore).

### `ReceivingType`

```
PURCHASE_ORDER    — Goods received against a purchase order
RETURN            — Goods received as part of a return
PRODUCTION_RETURN — Goods returned from production
OTHER             — Any other receiving scenario
```

### `RawMaterialBatchStatus` (relevant to batches auto-created from a GRN)

```
ACTIVE     — Batch is available
PARTIAL    — Some quantity has been consumed; stock remains
CONSUMED   — Entire batch quantity has been consumed
EXPIRED    — Batch has passed its expiry date
BLOCKED    — Batch is blocked from use
QUARANTINE — Batch is pending quality inspection (DEFAULT status for batches auto-created from a GRN)
```

> Batches created automatically when a GRN is saved are created with status **`QUARANTINE`** — they must go through a batch inspection (`/raw-material-batches/:batchId/inspections`) before being usable, or be manually transitioned via `PATCH /raw-material-batches/:batchId`.

### GRN Number Format

If `receivingNumber` is not provided in the create request, the backend auto-generates one. Pattern: `GRN-YYYYMM-XXXX`  
Example: `GRN-202606-0001`

---

## GRN API

### 1. Create GRN

```
POST /grn
Permission: grn.create
```

Creates a GRN with its line items and, for each line item, the raw material batches its received quantity is split into. This single call:

1. Validates the GRN against the linked purchase order.
2. Creates the `GRN` and `GRNItem` records.
3. Auto-creates a `RawMaterialBatch` (status `QUARANTINE`) for each `batches[]` entry, linked to its `GRNItem`.
4. Increments `currentStock` on each raw material by the batch quantities created.
5. If `purchaseOrderId` is set, increments `receivedQty` on the matching `PurchaseItem`s and updates the PO `status` to `PARTIAL` or `RECEIVED`.

#### Request Body

```json
{
  "receivingNumber": "GRN-2026-001",
  "receivingType": "PURCHASE_ORDER",
  "receivedDate": "2026-06-10T09:00:00Z",
  "purchaseOrderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "notes": "Delivered in good condition",
  "vehicleDetails": "Truck ABC-123",
  "deliveryNoteNumber": "DRN123456",
  "items": [
    {
      "rawMaterialId": "550e8400-e29b-41d4-a716-446655440000",
      "uomId": "8e000b71-e94d-497a-9247-eb170a41e826",
      "expectedQuantity": 100,
      "receivedQuantity": 98,
      "specifications": "Specific requirements",
      "receivingNotes": "Two bags damaged",
      "batches": [
        {
          "siteId": "7bc71201-1b8f-4954-95f0-a277e6ab3ab5",
          "quantity": 70,
          "manufacturingDate": "2026-01-10",
          "expiryDate": "2026-12-10",
          "unitCost": 150.00,
          "notes": "Stored in cold storage"
        },
        {
          "siteId": "c4d5e6f7-a8b9-0123-cdef-456789012345",
          "quantity": 28,
          "manufacturingDate": "2026-01-10",
          "expiryDate": "2026-12-10",
          "unitCost": 150.00
        }
      ]
    }
  ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `receivingNumber` | `string` | No | Auto-generated as `GRN-YYYYMM-XXXX` if omitted |
| `receivingType` | `ReceivingType` | Yes | `PURCHASE_ORDER`, `RETURN`, `PRODUCTION_RETURN`, `OTHER` |
| `receivedDate` | `ISO date or datetime` | Yes | `YYYY-MM-DD` or full ISO datetime |
| `purchaseOrderId` | `uuid` | Yes | The PO this GRN is received against |
| `notes` | `string` | No | Free-text notes on the GRN |
| `vehicleDetails` | `string` | No | Delivery vehicle info |
| `deliveryNoteNumber` | `string` | No | Supplier's delivery note / DRN reference |
| `items` | `CreateGrnItemDto[]` | Yes | Min 1 item |
| `items[].rawMaterialId` | `uuid` | Yes | Must exist, be active, and be present on the linked PO |
| `items[].uomId` | `uuid` | Yes | Must exist |
| `items[].expectedQuantity` | `number` | Yes | Must be > 0 |
| `items[].receivedQuantity` | `number` | Yes | Must be > 0. Sum across items per raw material cannot exceed the PO's remaining quantity for that material |
| `items[].specifications` | `string` | No | Free-text specs |
| `items[].receivingNotes` | `string` | No | Notes for this specific line item |
| `items[].batches` | `GrnItemBatchDto[]` | Yes | Min 1 batch allocation. Sum of `quantity` across batches **must equal** `receivedQuantity` for that item (epsilon-tolerant float comparison) |
| `items[].batches[].siteId` | `uuid` | Yes | Storage site; must exist |
| `items[].batches[].quantity` | `number` | Yes | Must be > 0 |
| `items[].batches[].manufacturingDate` | `string` (`YYYY-MM-DD`) | No | If both `manufacturingDate` and `expiryDate` are given, `manufacturingDate` cannot be after `expiryDate` |
| `items[].batches[].expiryDate` | `string` (`YYYY-MM-DD`) | No | Cannot be in the past, and cannot be earlier than `receivedDate` |
| `items[].batches[].unitCost` | `number` | No | Cost per unit **for this specific batch**. Defaults to `0` if omitted. There is no GRN-item-level or GRN-level cost — each batch carries its own `unitCost` |
| `items[].batches[].notes` | `string` | No | Stored as the `notes` field on the created batch |

> **Note**: `unitCost` is set **per batch**, not per GRN item. Each batch allocation may have a different cost (e.g., if the same item arrives at different per-unit prices across sites/lots).

> **Important — items must exactly match the PO**: The set of `rawMaterialId`s across `items` must be exactly the set of raw materials on the linked PO's items. Extra or missing materials are rejected (see [validation errors](#400-bad-request) below).

#### Response `201 Created`

Returns the full GRN object including items, each item's raw material/UOM, and the raw material batches created for that item:

```json
{
  "id": "g1g2g3g4-e5f6-7890-abcd-ef1234567890",
  "receivingNumber": "GRN-202606-0001",
  "status": "COMPLETED",
  "receivingType": "PURCHASE_ORDER",
  "receivedDate": "2026-06-10T09:00:00.000Z",
  "vehicleDetails": "Truck ABC-123",
  "deliveryNoteNumber": "DRN123456",
  "purchaseOrderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "receivedById": "user-uuid",
  "notes": "Delivered in good condition",
  "createdById": "user-uuid",
  "updatedById": null,
  "createdAt": "2026-06-10T09:05:00.000Z",
  "updatedAt": "2026-06-10T09:05:00.000Z",
  "purchaseOrder": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "orderNumber": "PO-2026-001",
    "orderDate": "2026-06-01T00:00:00.000Z",
    "expectedDate": "2026-06-15T00:00:00.000Z",
    "shippingCost": "50.00",
    "remarks": "Urgent order",
    "supplier": {
      "id": "sup-uuid",
      "name": "Sunrise Textiles Ltd.",
      "phone": "+1-555-1234",
      "address": "123 Mill Road",
      "email": "orders@sunrisetextiles.com"
    }
  },
  "items": [
    {
      "id": "gi1-uuid",
      "grnId": "g1g2g3g4-e5f6-7890-abcd-ef1234567890",
      "rawMaterialId": "550e8400-e29b-41d4-a716-446655440000",
      "uomId": "8e000b71-e94d-497a-9247-eb170a41e826",
      "expectedQuantity": 100,
      "receivedQuantity": 98,
      "rejectedQuantity": 0,
      "specifications": "Specific requirements",
      "receivingNotes": "Two bags damaged",
      "createdAt": "2026-06-10T09:05:00.000Z",
      "updatedAt": "2026-06-10T09:05:00.000Z",
      "rawMaterial": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Cotton Yarn"
      },
      "uom": {
        "id": "8e000b71-e94d-497a-9247-eb170a41e826",
        "name": "Kilogram",
        "symbol": "kg",
        "code": "KG"
      },
      "rawMaterialBatches": [
        {
          "id": "batch-uuid-1",
          "batchNumber": "RM-202606-0001",
          "rawMaterialId": "550e8400-e29b-41d4-a716-446655440000",
          "grnItemId": "gi1-uuid",
          "siteId": "7bc71201-1b8f-4954-95f0-a277e6ab3ab5",
          "receivedQuantity": 70,
          "consumedQuantity": 0,
          "returnedQuantity": 0,
          "availableQuantity": 70,
          "unitCost": 150,
          "manufacturingDate": "2026-01-10T00:00:00.000Z",
          "expiryDate": "2026-12-10T00:00:00.000Z",
          "receivedDate": "2026-06-10T09:00:00.000Z",
          "status": "QUARANTINE",
          "notes": "Stored in cold storage",
          "site": {
            "id": "7bc71201-1b8f-4954-95f0-a277e6ab3ab5",
            "name": "Main Warehouse",
            "code": "WH-MAIN"
          }
        },
        {
          "id": "batch-uuid-2",
          "batchNumber": "RM-202606-0002",
          "rawMaterialId": "550e8400-e29b-41d4-a716-446655440000",
          "grnItemId": "gi1-uuid",
          "siteId": "c4d5e6f7-a8b9-0123-cdef-456789012345",
          "receivedQuantity": 28,
          "consumedQuantity": 0,
          "returnedQuantity": 0,
          "availableQuantity": 28,
          "unitCost": 150,
          "manufacturingDate": "2026-01-10T00:00:00.000Z",
          "expiryDate": "2026-12-10T00:00:00.000Z",
          "receivedDate": "2026-06-10T09:00:00.000Z",
          "status": "QUARANTINE",
          "notes": null,
          "site": {
            "id": "c4d5e6f7-a8b9-0123-cdef-456789012345",
            "name": "Secondary Warehouse",
            "code": "WH-SEC"
          }
        }
      ]
    }
  ]
}
```

#### Validation Errors `400 Bad Request`

```json
{ "message": "Cannot create a GRN for a cancelled purchase order." }
{ "message": "This purchase order has been fully received — no further GRNs needed." }
{
  "message": "PO and GRN items must match exactly",
  "missingInPo": ["raw-material-id-not-on-po"],
  "missingInGrn": ["raw-material-id-on-po-but-missing-from-grn"]
}
{ "message": "Cotton Yarn: received quantity (120) exceeds the remaining purchase order quantity (100)." }
{ "message": "Raw material 550e8400-e29b-41d4-a716-446655440000: sum of batch allocation quantities (90) must equal receivedQuantity (98)." }
{ "message": "Raw material 550e8400-e29b-41d4-a716-446655440000: manufacturingDate (2026-12-10) cannot be after expiryDate (2026-01-10)." }
{ "message": "Raw material 550e8400-e29b-41d4-a716-446655440000: expiryDate (2026-01-01) cannot be in the past." }
{ "message": "Raw material 550e8400-e29b-41d4-a716-446655440000: expiryDate (2026-06-01) cannot be earlier than the received date." }
```

#### Other Errors

```json
{ "statusCode": 404, "message": "Purchase order not found." }
{ "statusCode": 404, "message": "Raw material 550e8400-e29b-41d4-a716-446655440000 not found or inactive." }
{ "statusCode": 404, "message": "UOM 8e000b71-e94d-497a-9247-eb170a41e826 not found." }
{ "statusCode": 404, "message": "Site 7bc71201-1b8f-4954-95f0-a277e6ab3ab5 not found." }
{ "statusCode": 400, "message": "A GRN (GRN-202606-0001) has already been created for this purchase order. Only one GRN is allowed per purchase order." }
```

---

### 2. Get GRN Stats

```
GET /grn/stats
Permission: grn.read
```

Returns dashboard-level counts across all GRNs.

#### Response `200 OK`

```json
{
  "total": 42,
  "completed": 40,
  "completionRate": 95.23809523809524
}
```

| Field | Description |
|---|---|
| `total` | Total number of GRNs |
| `completed` | Number of GRNs with `status = COMPLETED` |
| `completionRate` | `completed / total * 100`, or `0` if `total` is `0` |

---

### 3. List GRNs (Paginated)

```
GET /grn
Permission: grn.read
```

#### Query Parameters

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | `number` | `1` | Inherited from `PaginationDto` |
| `limit` | `number` | `10` | Inherited from `PaginationDto` |
| `search` | `string` | — | Searches across `receivingNumber` and `deliveryNoteNumber` |
| `status` | `ReceivingStatus` | — | `PENDING`, `INSPECTING`, `APPROVED`, `REJECTED`, `COMPLETED` |
| `receivingType` | `ReceivingType` | — | `PURCHASE_ORDER`, `RETURN`, `PRODUCTION_RETURN`, `OTHER` |
| `startDate` | `string` (`YYYY-MM-DD`) | — | Filters `receivedDate >=` this date |
| `endDate` | `string` (`YYYY-MM-DD`) | — | Filters `receivedDate <=` this date |
| `sortBy` | `string` | — | Any field name, e.g. `receivedDate`, `createdAt` |
| `sortOrder` | `"ASC"` \| `"DESC"` | — | Case-insensitive |

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "g1g2g3g4-e5f6-7890-abcd-ef1234567890",
      "receivingNumber": "GRN-202606-0001",
      "status": "COMPLETED",
      "receivingType": "PURCHASE_ORDER",
      "receivedDate": "2026-06-10T09:00:00.000Z",
      "vehicleDetails": "Truck ABC-123",
      "deliveryNoteNumber": "DRN123456",
      "purchaseOrderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "receivedById": "user-uuid",
      "notes": "Delivered in good condition",
      "createdById": "user-uuid",
      "updatedById": null,
      "createdAt": "2026-06-10T09:05:00.000Z",
      "updatedAt": "2026-06-10T09:05:00.000Z",
      "purchaseOrder": {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "orderNumber": "PO-2026-001",
        "orderDate": "2026-06-01T00:00:00.000Z",
        "expectedDate": "2026-06-15T00:00:00.000Z",
        "shippingCost": "50.00",
        "remarks": "Urgent order",
        "supplier": {
          "id": "sup-uuid",
          "name": "Sunrise Textiles Ltd.",
          "phone": "+1-555-1234",
          "address": "123 Mill Road",
          "email": "orders@sunrisetextiles.com"
        }
      },
      "items": [
        { "...": "same shape as in the create response, including rawMaterial, uom, and rawMaterialBatches" }
      ]
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

### 4. Get Single GRN

```
GET /grn/:grnId
Permission: grn.read
```

#### Path Parameter

| Param | Type | Notes |
|---|---|---|
| `grnId` | `uuid` | ID of the GRN |

#### Response `200 OK`

Same shape as a single item in the [list response](#3-list-grns-paginated).

#### Response `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "GRN not found.",
  "error": "Not Found"
}
```

---

## Auto-Created Raw Material Batches

When a GRN is created (`POST /grn`), the backend **automatically creates one `RawMaterialBatch` per `batches[]` entry** on each GRN item, all within the same database transaction as the GRN itself:

- Each created batch is linked to its `GRNItem` via `grnItemId`.
- Each batch's `unitCost` is taken directly from that batch's own `unitCost` field on the request (defaults to `0` if omitted) — there is no GRN-item-level cost to fall back to. Different batches of the same GRN item can have different costs.
- Each batch is created with **`status: QUARANTINE`** (not `ACTIVE`) — it must pass a batch inspection or be manually updated before it can be consumed/allocated via FIFO/FEFO.
- `currentStock` on each raw material is incremented by the total batch quantities created for that material.
- The created batches are returned nested under `items[].rawMaterialBatches` in the GRN response. There is no `POST /raw-material-batches/bulk` endpoint — batch creation only happens as part of `POST /grn`.

There is **no separate "create batches from GRN" step** required in the GRN creation flow — it happens as part of `POST /grn`.

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
  "message": "GRN not found.",
  "error": "Not Found"
}
```

---

## Frontend Implementation Notes

### GRN Status Colors (suggested)

| Status | Color |
|---|---|
| `PENDING` | Gray |
| `INSPECTING` | Blue |
| `APPROVED` | Teal |
| `REJECTED` | Red |
| `COMPLETED` | Green |

> In practice, GRNs created via the current `POST /grn` flow are always saved with `status: COMPLETED` immediately.

### Batch Status Colors (for batches shown under a GRN item)

| Status | Color |
|---|---|
| `QUARANTINE` | Amber/Orange (default for newly received batches — pending inspection) |
| `ACTIVE` | Green |
| `PARTIAL` | Amber |
| `CONSUMED` | Gray |
| `EXPIRED` | Dark Red |
| `BLOCKED` | Red |

### Typical Screen Flows

**Create GRN Screen (against a PO)**
1. User selects a confirmed Purchase Order (`status` not `CANCELLED` or `RECEIVED`).
2. Pre-fill `items[]` from the PO's line items: `rawMaterialId`, `uomId`, `expectedQuantity` (= PO `quantity`, or remaining quantity), and default `receivedQuantity` to the expected/remaining quantity.
3. For each item, the user must define one or more `batches[]` allocations (site + quantity, optional manufacturing/expiry dates). The UI should validate client-side that the sum of batch quantities equals `receivedQuantity` before submit, mirroring the backend check.
4. On submit, `POST /grn`. Show a clear error if the PO/GRN item sets don't match, or if quantities exceed the PO remaining quantity.
5. After success, show the created GRN with its auto-created batches (all in `QUARANTINE` status) — prompt the user to proceed to batch inspection.

**GRN List Screen**
- `GET /grn` with pagination, `search`, `status`, `receivingType`, and date-range filters.
- Dashboard widget: `GET /grn/stats` for total/completed/completion rate.

**GRN Detail Screen**
- `GET /grn/:grnId`.
- Show PO reference (`purchaseOrder.orderNumber`, `supplier.name`).
- Show each line item with its raw material, UOM, expected vs received vs rejected quantities, and unit cost.
- Under each item, list the auto-created raw material batches (`items[].rawMaterialBatches`) with batch number, site, quantity, status, and dates.
- Link each `QUARANTINE` batch to the batch inspection flow: `POST /raw-material-batches/:batchId/inspections` and `GET /raw-material-batches/:batchId/inspections` (see Raw Material Batches API doc — quality inspection now lives there, not on the GRN).

**Purchase Order Status Indicator**
- After a GRN is created, refresh the linked PO — its `status` may have changed to `PARTIAL` or `RECEIVED` depending on whether all PO items are now fully received.

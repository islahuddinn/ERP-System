# Waste Management API

## Table of Contents

1. [Overview](#1-overview)
2. [Permissions](#2-permissions)
3. [Enums & Constants](#3-enums--constants)
4. [Endpoints](#4-endpoints)
   - [4.1 Create Waste Record](#41-create-waste-record)
   - [4.2 List Waste Records (Paginated)](#42-list-waste-records-paginated)
   - [4.3 Get Single Waste Record](#43-get-single-waste-record)
   - [4.4 Update Waste Record](#44-update-waste-record)
   - [4.5 Delete Waste Record](#45-delete-waste-record)
5. [Error Responses](#5-error-responses)
6. [Frontend Implementation Notes](#6-frontend-implementation-notes)

---

## 1. Overview

The Waste Management module records waste/loss events for either a **raw material** or a **product**, tracks the estimated cost of the loss, and lets a supervisor later resolve the record by marking what happened to the wasted item (disposed, recycled, or reused).

Key concepts:

- A waste record is for **either** a raw material **or** a product, never both — `itemType` (`RAW_MATERIAL` | `PRODUCT`) determines which of `rawMaterialId` / `productId` must be set. The other must be left empty.
- **`wasteNumber` is auto-generated** if not provided, in the format `WASTE-YYYYMM-NNNN` (sequential per month).
- **`cost` is auto-calculated** if not provided: `quantity * unitCost`, where `unitCost` is `rawMaterial.lastPurchasePrice` for raw materials, or `product.sellingPrice` (defaults to `0` if null) for products. You can override this by passing `cost` explicitly.
- Every new record starts with `status: PENDING`. It moves to `DISPOSED`, `RECYCLED`, or `REUSED` by passing `status` in the **update** endpoint (4.4) — this is a one-way transition (a resolved record cannot be re-resolved).
- This module **does NOT** adjust `currentStock` on the raw material or product, and does **not** create any `RawMaterialBatchConsumption` records — it is purely a loss-tracking ledger. (If stock needs to be deducted for the wasted quantity, that must be done separately, e.g. via the raw material batch consume endpoint with `referenceType: "QUALITY_REJECTION"` or similar.)
- Soft-delete only: `DELETE` sets `deletedAt`, the row is never physically removed.

---

## 2. Permissions

| Permission | Used For |
|---|---|
| `waste-management.create` | Record a new waste entry |
| `waste-management.read` | List/get waste records |
| `waste-management.update` | Update a waste record's details, resolve disposition |
| `waste-management.delete` | Soft-delete a waste record |

All routes require `JwtAuthGuard` + `PermissionsGuard` (Bearer token).

---

## 3. Enums & Constants

### `WasteType` — why the waste occurred

```
PRODUCTION        // generated during a production process
QUALITY_REJECT    // rejected during quality inspection
EXPIRY            // item expired
DAMAGE            // physically damaged
SPOILAGE          // spoiled (e.g. perishable raw materials)
OTHER             // anything else — use `reason` to explain
```

### `WasteItemType` — what was wasted

```
RAW_MATERIAL   // requires rawMaterialId, forbids productId
PRODUCT        // requires productId, forbids rawMaterialId
```

### `WasteStatus` — disposition

```
PENDING    // default on creation — not yet resolved
DISPOSED   // thrown away / destroyed
RECYCLED   // sent for recycling
REUSED     // reused elsewhere
```

> A record can only move from `PENDING` to one of `DISPOSED` / `RECYCLED` / `REUSED` by passing `status` in the update endpoint (4.4). Setting `status` to `PENDING` is rejected, and resolving an already-resolved record is rejected.

### Number format (auto-generated)

| Entity | Format | Example |
|---|---|---|
| `wasteNumber` | `WASTE-YYYYMM-NNNN` (sequential per month) | `WASTE-202606-0001` |

---

## 4. Endpoints

### 4.1 Create Waste Record

```
POST /waste-management
Permission: waste-management.create
@Auditable (module: WASTE_MANAGEMENT, entity: WasteManagement)
```

#### Request Body — `CreateWasteManagementDto`

```json
{
  "wasteType": "DAMAGE",
  "itemType": "RAW_MATERIAL",
  "rawMaterialId": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
  "quantity": 25,
  "reason": "Roll damaged during forklift handling",
  "remarks": "Found during weekly stock check",
  "siteId": "c4d5e6f7-a8b9-0123-cdef-456789012345"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `wasteNumber` | `string` | No | Auto-generated (`WASTE-YYYYMM-NNNN`) if omitted |
| `wasteType` | `WasteType` enum | Yes | `PRODUCTION`, `QUALITY_REJECT`, `EXPIRY`, `DAMAGE`, `SPOILAGE`, `OTHER` |
| `itemType` | `WasteItemType` enum | Yes | `RAW_MATERIAL` or `PRODUCT` |
| `productId` | `uuid` | Conditional | Required (and validated) when `itemType = PRODUCT`; must NOT be set when `itemType = RAW_MATERIAL` |
| `rawMaterialId` | `uuid` | Conditional | Required (and validated) when `itemType = RAW_MATERIAL`; must NOT be set when `itemType = PRODUCT` |
| `quantity` | `number` | Yes | `>= 0.01` |
| `cost` | `number` | No | `>= 0`. Auto-calculated as `quantity * unitCost` if omitted (see [Overview](#1-overview)) |
| `reason` | `string` | Yes | Free-text explanation |
| `remarks` | `string` | No | |
| `siteId` | `uuid` | No | Site where the waste was recorded/found |

#### Validation Errors `400 Bad Request`

```json
{ "message": "productId is required when itemType is PRODUCT" }
{ "message": "rawMaterialId must not be set when itemType is PRODUCT" }
{ "message": "rawMaterialId is required when itemType is RAW_MATERIAL" }
{ "message": "productId must not be set when itemType is RAW_MATERIAL" }
```

#### Not Found Errors `404 Not Found`

```json
{ "message": "Site <siteId> not found" }
{ "message": "Product <productId> not found" }
{ "message": "Raw material <rawMaterialId> not found" }
```

#### Conflict Error `409 Conflict`

If a manually-supplied `wasteNumber` already exists (handled via `handlePrismaUniqueError`):

```json
{ "statusCode": 409, "message": "Waste number \"WASTE-202606-0001\" already exists", "error": "Conflict" }
```

#### Response `201 Created`

Returns the created record with `product`, `rawMaterial`, and `site` relations:

```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "wasteNumber": "WASTE-202606-0001",
  "wasteType": "DAMAGE",
  "itemType": "RAW_MATERIAL",
  "productId": null,
  "rawMaterialId": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
  "quantity": 25,
  "cost": "3750.00",
  "reason": "Roll damaged during forklift handling",
  "remarks": "Found during weekly stock check",
  "siteId": "c4d5e6f7-a8b9-0123-cdef-456789012345",
  "status": "PENDING",
  "resolvedAt": null,
  "createdById": "user-uuid",
  "createdAt": "2026-06-11T10:00:00.000Z",
  "updatedAt": "2026-06-11T10:00:00.000Z",
  "deletedAt": null,
  "product": null,
  "rawMaterial": {
    "id": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
    "name": "Cotton Yarn",
    "code": "CTN-YARN",
    "uom": { "id": "uom-uuid", "name": "Kilogram", "symbol": "kg" }
  },
  "site": {
    "id": "c4d5e6f7-a8b9-0123-cdef-456789012345",
    "name": "Main Warehouse",
    "code": "WH-MAIN"
  }
}
```

> Note: `cost` is a `Decimal` field and is serialized as a **string** (e.g. `"3750.00"`).

---

### 4.2 List Waste Records (Paginated)

```
GET /waste-management
Permission: waste-management.read
```

#### Query Parameters

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | `number` | `1` | |
| `limit` | `number` | `10` | |
| `search` | `string` | — | Searches `wasteNumber` and `reason` |
| `sortBy` | `string` | `createdAt` (desc) | |
| `sortOrder` | `"ASC"` \| `"DESC"` | `"DESC"` | |
| `wasteType` | `WasteType` | — | `PRODUCTION`, `QUALITY_REJECT`, `EXPIRY`, `DAMAGE`, `SPOILAGE`, `OTHER` |
| `itemType` | `WasteItemType` | — | `RAW_MATERIAL`, `PRODUCT` |
| `status` | `WasteStatus` | — | `PENDING`, `DISPOSED`, `RECYCLED`, `REUSED` |
| `productId` | `uuid` | — | Filter by product |
| `rawMaterialId` | `uuid` | — | Filter by raw material |
| `siteId` | `uuid` | — | Filter by site |
| `startDate` | `ISO date string` | — | Filter records created on/after this date (inclusive) |
| `endDate` | `ISO date string` | — | Filter records created on/before this date (inclusive) |

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "wasteNumber": "WASTE-202606-0001",
      "wasteType": "DAMAGE",
      "itemType": "RAW_MATERIAL",
      "productId": null,
      "rawMaterialId": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
      "quantity": 25,
      "cost": "3750.00",
      "reason": "Roll damaged during forklift handling",
      "remarks": "Found during weekly stock check",
      "siteId": "c4d5e6f7-a8b9-0123-cdef-456789012345",
      "status": "PENDING",
      "resolvedAt": null,
      "createdById": "user-uuid",
      "createdAt": "2026-06-11T10:00:00.000Z",
      "updatedAt": "2026-06-11T10:00:00.000Z",
      "deletedAt": null,
      "product": null,
      "rawMaterial": {
        "id": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
        "name": "Cotton Yarn",
        "code": "CTN-YARN",
        "uom": { "id": "uom-uuid", "name": "Kilogram", "symbol": "kg" }
      },
      "site": {
        "id": "c4d5e6f7-a8b9-0123-cdef-456789012345",
        "name": "Main Warehouse",
        "code": "WH-MAIN"
      }
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

---

### 4.3 Get Single Waste Record

```
GET /waste-management/:wasteId
Permission: waste-management.read
```

#### Path Parameter

| Param | Type | Notes |
|---|---|---|
| `wasteId` | `uuid` | Waste record ID |

#### Response `200 OK`

Same shape as one item from the list response (4.2).

#### Error `404 Not Found`

```json
{ "statusCode": 404, "message": "Waste record <wasteId> not found", "error": "Not Found" }
```

---

### 4.4 Update Waste Record

```
PATCH /waste-management/:wasteId
Permission: waste-management.update
@Auditable (module: WASTE_MANAGEMENT, entity: WasteManagement)
```

Updates descriptive details, and optionally resolves the record by passing `status`. Does **not** allow changing `itemType`, `productId`, `rawMaterialId`, `quantity`, or `cost`.

#### Path Parameter

| Param | Type | Notes |
|---|---|---|
| `wasteId` | `uuid` | Waste record ID |

#### Request Body — `UpdateWasteManagementDto` (all fields optional)

```json
{
  "wasteType": "QUALITY_REJECT",
  "status": "DISPOSED",
  "reason": "Reclassified after review",
  "remarks": "Sent to municipal waste collection on 2026-06-11",
  "siteId": "c4d5e6f7-a8b9-0123-cdef-456789012345"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `wasteType` | `WasteType` enum | No | |
| `status` | `WasteStatus` enum | No | Resolves the record. Must be `DISPOSED`, `RECYCLED`, or `REUSED` (not `PENDING`). Only allowed while the record is currently `PENDING` — stamps `resolvedAt`. **One-way transition** |
| `reason` | `string` | No | |
| `remarks` | `string` | No | |
| `siteId` | `uuid` | No | |

#### Validation Errors `400 Bad Request`

```json
{ "message": "Waste record is already resolved as DISPOSED" }
{ "message": "status must be DISPOSED, RECYCLED or REUSED" }
```

#### Response `200 OK`

Returns the full updated record (same shape as 4.3). When `status` is included, `status` and `resolvedAt` reflect the new disposition:

```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "wasteNumber": "WASTE-202606-0001",
  "status": "DISPOSED",
  "resolvedAt": "2026-06-11T12:00:00.000Z",
  "remarks": "Sent to municipal waste collection on 2026-06-11",
  "...": "...other fields same as 4.3"
}
```

#### Error `404 Not Found`

```json
{ "statusCode": 404, "message": "Waste record <wasteId> not found", "error": "Not Found" }
```

---

### 4.5 Delete Waste Record

```
DELETE /waste-management/:wasteId
Permission: waste-management.delete
@Auditable (module: WASTE_MANAGEMENT, entity: WasteManagement)
```

Soft-delete (sets `deletedAt`); the record is excluded from all subsequent list/get queries.

#### Path Parameter

| Param | Type | Notes |
|---|---|---|
| `wasteId` | `uuid` | Waste record ID |

#### Response `200 OK`

```json
{ "message": "Waste record deleted successfully" }
```

#### Error `404 Not Found`

```json
{ "statusCode": 404, "message": "Waste record <wasteId> not found", "error": "Not Found" }
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
  "message": "Waste record <wasteId> not found",
  "error": "Not Found"
}
```

### 409 Conflict (duplicate `wasteNumber`)

```json
{
  "statusCode": 409,
  "message": "Waste number \"<wasteNumber>\" already exists",
  "error": "Conflict"
}
```

---

## 6. Frontend Implementation Notes

### Create Waste form

- Toggle field set based on `itemType`:
  - `RAW_MATERIAL` → show raw material picker, bind to `rawMaterialId`
  - `PRODUCT` → show product picker, bind to `productId`
- `cost` field can be left blank to let the backend auto-calculate from `quantity * unitCost` (raw material `lastPurchasePrice` or product `sellingPrice`). Show the auto-calculated value as a preview/estimate if you fetch the item's price client-side, but don't require the user to fill it in.
- `wasteNumber` should normally be left blank (auto-generated). Only expose a manual entry field for advanced/admin use cases — duplicates return a `409`.
- `siteId` is optional; useful for multi-site operations to know where the loss occurred.

### Status Colors (suggested)

| Status | Color | Meaning |
|---|---|---|
| `PENDING` | Amber/Orange | Awaiting resolution |
| `DISPOSED` | Gray | Thrown away / destroyed |
| `RECYCLED` | Green | Sent for recycling |
| `REUSED` | Blue | Reused elsewhere |

### Typical Screen Flows

**Waste List / Ledger**
- `GET /waste-management` with filters for `wasteType`, `itemType`, `status`, `siteId`, date range
- Show `cost` as currency (remember it's returned as a string — parse with `Number()`/`parseFloat()` before formatting)

**Record Waste**
1. User selects `itemType` (`RAW_MATERIAL` / `PRODUCT`), then the corresponding item, `wasteType`, `quantity`, `reason`, optional `remarks`/`siteId`
2. `POST /waste-management`
3. New record appears in the ledger with `status: PENDING`

**Resolve Pending Waste**
- `GET /waste-management?status=PENDING` to list records awaiting disposition
- User picks final `status` (`DISPOSED` / `RECYCLED` / `REUSED`) and optional `remarks`
- `PATCH /waste-management/:wasteId` with `status` set
- On success, the record moves out of the pending queue and `resolvedAt` is set — the action cannot be repeated

**Edit Waste Record Details**
- `PATCH /waste-management/:wasteId` — `wasteType`, `status`, `reason`, `remarks`, `siteId` are editable; `quantity`/`cost`/item references are immutable after creation

**Delete**
- `DELETE /waste-management/:wasteId` — soft-delete, confirm with the user before calling (irreversible from the UI, though the row remains in the DB with `deletedAt` set)

### Reporting / Dashboard Widgets

- Sum `cost` grouped by `wasteType` or `itemType` over a date range (`startDate`/`endDate`) for a "cost of waste" widget
- `status=PENDING` count as an action-required badge
</content>

# Audit Logs — Frontend API Reference

> **Purpose**: Complete API reference for the Audit Logs module — both the global "Audit Log" screen and the
> per-record "View History" button that should appear on detail screens (Raw Material, Purchase Order, GRN,
> Product, Supplier, Production Order, etc.).
> **Audience**: Frontend developers.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
   - [AuditAction](#auditaction)
   - [AuditModule → Entity Name Map](#auditmodule--entity-name-map)
4. [Audit Logs API](#audit-logs-api)
   - [List Audit Logs (paginated)](#1-list-audit-logs-paginated)
   - [Dashboard Summary](#2-dashboard-summary)
   - [Entity History (per-record timeline)](#3-entity-history-per-record-timeline)
   - [Get Single Audit Log Entry](#4-get-single-audit-log-entry)
5. [Error Responses](#error-responses)
6. [Frontend Implementation Notes](#frontend-implementation-notes)
   - [Global Audit Log Screen](#global-audit-log-screen)
   - [Per-Record "View History" Button](#per-record-view-history-button)
   - [Rendering the Diff](#rendering-the-diff)
   - [Action Badge Colors (suggested)](#action-badge-colors-suggested)

---

## Overview

Every CREATE / UPDATE / DELETE (and a few special actions like LOGIN, APPROVE, REJECT, EXPORT, IMPORT, RESTORE) on
a tracked entity is automatically recorded by the backend via the `@Auditable` interceptor. The frontend never
writes audit logs directly — it only **reads** them.

Each audit log entry records:

- **Who** did it (`actor` — resolved user `id`, `name`, `email`)
- **What module/entity** it happened on (`module`, `entityName`, `entityId`, `entityLabel`)
- **What action** (`action` — `CREATE`, `UPDATE`, `DELETE`, etc.)
- **What changed** (`oldValue`, `newValue` — JSON snapshots)
- **When** (`createdAt`)
- Optional **`metadata`** — extra context set by the backend for specific flows (e.g. `{ "reason": "..." }`)

There are two consumption patterns for the frontend:

| Pattern | Endpoint | Used for |
|---|---|---|
| Global audit trail | `GET /audit-logs` | A dedicated "Audit Logs" admin screen with filters |
| Dashboard summary | `GET /audit-logs/summary` | Counts/widgets on an admin dashboard |
| Per-record history | `GET /audit-logs/entity/:entityName/:entityId` | "View History" button on any detail screen (Raw Material, PO, GRN, Product, etc.) |
| Single entry detail | `GET /audit-logs/:id` | Drill-down from the global list into one entry |

---

## Permissions

| Permission Key | What it guards |
|---|---|
| `audit.view` | View any audit log endpoint (list, summary, entity history, single entry) |

If the logged-in user does not have `audit.view`, hide the global "Audit Logs" nav item **and** hide/disable the
"View History" button on detail screens (a `403 Forbidden` will be returned if called anyway).

---

## Enums & Constants

### `AuditAction`

```
CREATE   — Record was created
UPDATE   — Record was updated (only entries with at least one real field change are logged)
DELETE   — Record was soft/hard deleted
LOGIN    — User logged in
LOGOUT   — User logged out
EXPORT   — Data was exported (e.g. CSV/PDF export)
IMPORT   — Data was imported (bulk upload)
APPROVE  — Record was approved (e.g. PO approval)
REJECT   — Record was rejected (e.g. PO rejection, QC rejection)
RESTORE  — Soft-deleted record was restored
```

### `AuditModule → Entity Name Map`

The global list (`GET /audit-logs`) can be filtered by `module` (a coarse category). The per-record history
endpoint (`GET /audit-logs/entity/:entityName/:entityId`) needs the exact **`entityName`** string — this is the
Prisma model name, NOT the module enum. Use this table to know which `entityName` to pass for each screen's
"View History" button:

| `AuditModule` (filter value) | `entityName` (for entity-history lookup) | Typical screen |
|---|---|---|
| `PRODUCTS` | `Product` | Product detail |
| `RAW_MATERIALS` | `RawMaterial` | Raw Material detail |
| `RAW_MATERIAL_BATCHES` | `RawMaterialBatch` | Raw Material Batch detail |
| `SITES` | `Site` | Site detail |
| `CATEGORIES` | `Category` | Category detail |
| `WAREHOUSES` | `Warehouse` | Warehouse detail |
| `LOCATIONS` | `Location` | Location detail |
| `SUPPLIERS` | `Supplier` | Supplier detail |
| `CUSTOMERS` | `Customer` | Customer detail |
| `PURCHASE_ORDERS` | `PurchaseOrder` | Purchase Order detail |
| `PURCHASE_RETURNS` | `PurchaseReturn` | Purchase Return detail |
| `INVOICES` | `Invoice` | Invoice detail |
| `EXPENSES` | `Expense` | Expense detail |
| `CASH_IN_HAND` | `CashInHand` | Cash-in-Hand entry detail |
| `PRODUCTION_ORDERS` | `ProductionOrder` | Production Order detail |
| `PRODUCTION_LINES` | `ProductionLine` | Production Line detail |
| `MATERIAL_REQUESTS` | `MaterialRequest` | Material Request detail |
| `MATERIAL_TRANSFERS` | `MaterialTransfer` | Material Transfer detail |
| `GRN` | `GRN` | GRN detail |
| `USERS` | `User` | User detail |
| `AUTH` | `Auth` | — (login/logout events, no single record) |
| `UOM` | `UOM` | UOM detail |
| `BOM` | `BOM` | BOM detail |
| `MACHINES` | `Machine` | Machine detail |
| `PLANTS` | `Plant` | Plant detail |
| `BATCHES` | `Batch` | (legacy — see [[project_raw_material_batch_refactor]]) |
| `WORK_ORDERS` | `WorkOrder` | Work Order detail |
| `QUALITY_CONTROL` | `QualityControl` | Quality Control record detail |
| `STOCK_TRANSACTIONS` | `StockTransaction` | Stock Transaction detail |
| `WASTE_MANAGEMENT` | `WasteManagement` | Waste record detail |
| `SYSTEM` | `System` | — (fallback, generic system events) |

> **Important**: `entityName` is **case-sensitive** and must match exactly (e.g. `RawMaterial`, not `raw_material`
> or `rawMaterial`). `entityId` is the UUID of the record currently open on screen.

---

## Audit Logs API

### 1. List Audit Logs (Paginated)

```
GET /audit-logs
Permission: audit.view
```

Used for the global "Audit Logs" admin screen.

#### Query Parameters

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | `number` | `1` | |
| `limit` | `number` | `50` | Max `500` |
| `module` | `AuditModule` | — | Filter by module, e.g. `PRODUCTION_ORDERS` (case-insensitive on input, normalized to uppercase) |
| `entityName` | `string` | — | Filter by exact entity name, e.g. `RawMaterial` |
| `entityId` | `uuid` | — | Filter to a single record's logs (alternative to the dedicated entity-history endpoint) |
| `actorId` | `uuid` | — | Filter by the user who performed the action |
| `action` | `AuditAction` | — | e.g. `UPDATE`, `DELETE`, `APPROVE` |
| `fromDate` | `ISO 8601 string` | — | Inclusive lower bound on `createdAt` |
| `toDate` | `ISO 8601 string` | — | Inclusive upper bound on `createdAt` |
| `search` | `string` | — | Free-text search across `entityName` and `entityLabel` |

#### Response `200 OK`

```json
{
  "logs": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "actorId": "user-uuid-1",
      "module": "PURCHASE_ORDERS",
      "entityName": "PurchaseOrder",
      "entityId": "po-uuid-1",
      "entityLabel": "PO-2026-0042",
      "action": "UPDATE",
      "oldValue": {
        "status": "DRAFT"
      },
      "newValue": {
        "status": "APPROVED"
      },
      "metadata": null,
      "createdAt": "2026-06-10T09:32:11.000Z",
      "actor": {
        "id": "user-uuid-1",
        "name": "Ayesha Khan",
        "email": "ayesha@example.com"
      }
    }
  ],
  "total": 248,
  "page": 1,
  "limit": 50,
  "totalPages": 5
}
```

> **Note**: The pagination envelope here is `{ logs, total, page, limit, totalPages }` — **not** the
> `{ data, meta }` shape used by other modules. Handle this shape specifically for audit log lists.

---

### 2. Dashboard Summary

```
GET /audit-logs/summary
Permission: audit.view
```

Returns aggregate counts for an admin dashboard widget, plus the 10 most recent log entries.

#### Response `200 OK`

```json
{
  "totalLogs": 1842,
  "recentLogs": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "actorId": "user-uuid-1",
      "module": "PURCHASE_ORDERS",
      "entityName": "PurchaseOrder",
      "entityId": "po-uuid-1",
      "entityLabel": "PO-2026-0042",
      "action": "UPDATE",
      "createdAt": "2026-06-10T09:32:11.000Z",
      "actor": {
        "id": "user-uuid-1",
        "name": "Ayesha Khan",
        "email": "ayesha@example.com"
      }
    }
  ],
  "byAction": {
    "CREATE": 620,
    "UPDATE": 980,
    "DELETE": 142,
    "APPROVE": 80,
    "REJECT": 20
  },
  "byModule": {
    "PRODUCTS": 300,
    "RAW_MATERIALS": 250,
    "PURCHASE_ORDERS": 410,
    "GRN": 180
  }
}
```

> `recentLogs` entries do **not** include `oldValue`/`newValue` (lighter payload for a widget). Link each row to
> `GET /audit-logs/:id` for the full diff, or to the global list filtered by that entity.

---

### 3. Entity History (Per-Record Timeline)

```
GET /audit-logs/entity/:entityName/:entityId
Permission: audit.view
```

**This is the endpoint behind the "View History" / "Audit Log" button on every detail screen** (Raw Material,
Purchase Order, GRN, Product, Supplier, Production Order, etc.). Returns the **full lifecycle** of one record —
every CREATE, UPDATE, DELETE (and APPROVE/REJECT/RESTORE where applicable) — newest first, with no pagination.

#### Path Parameters

| Param | Type | Notes |
|---|---|---|
| `entityName` | `string` | Exact Prisma model name — see the [Module → Entity Name Map](#auditmodule--entity-name-map). E.g. `RawMaterial`, `PurchaseOrder`, `GRN` |
| `entityId` | `uuid` | The ID of the record currently open on screen |

#### Example

```
GET /audit-logs/entity/RawMaterial/b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f
GET /audit-logs/entity/PurchaseOrder/a1b2c3d4-e5f6-7890-abcd-ef1234567890
GET /audit-logs/entity/GRN/c4d5e6f7-a8b9-0123-cdef-456789012345
```

#### Response `200 OK`

```json
[
  {
    "id": "log-uuid-3",
    "actorId": "user-uuid-2",
    "module": "RAW_MATERIALS",
    "entityName": "RawMaterial",
    "entityId": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
    "entityLabel": "Cotton Yarn",
    "action": "UPDATE",
    "oldValue": {
      "reorderLevel": 50
    },
    "newValue": {
      "reorderLevel": 100
    },
    "metadata": null,
    "createdAt": "2026-06-09T14:02:00.000Z",
    "actor": { "id": "user-uuid-2", "name": "Bilal Ahmed", "email": "bilal@example.com" }
  },
  {
    "id": "log-uuid-2",
    "actorId": "user-uuid-1",
    "module": "RAW_MATERIALS",
    "entityName": "RawMaterial",
    "entityId": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
    "entityLabel": "Cotton Yarn",
    "action": "UPDATE",
    "oldValue": {
      "currentStock": 0
    },
    "newValue": {
      "currentStock": 500
    },
    "metadata": null,
    "createdAt": "2026-06-05T11:00:00.000Z",
    "actor": { "id": "user-uuid-1", "name": "Ayesha Khan", "email": "ayesha@example.com" }
  },
  {
    "id": "log-uuid-1",
    "actorId": "user-uuid-1",
    "module": "RAW_MATERIALS",
    "entityName": "RawMaterial",
    "entityId": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
    "entityLabel": "Cotton Yarn",
    "action": "CREATE",
    "oldValue": null,
    "newValue": {
      "name": "Cotton Yarn",
      "code": "CTN-YARN",
      "currentStock": 0,
      "reorderLevel": 50,
      "uomId": "8e000b71-e94d-497a-9247-eb170a41e826",
      "isActive": true
    },
    "metadata": null,
    "createdAt": "2026-06-04T10:00:00.000Z",
    "actor": { "id": "user-uuid-1", "name": "Ayesha Khan", "email": "ayesha@example.com" }
  }
]
```

#### Response — No History `200 OK`

```json
[]
```

> Returns an empty array (not a 404) if no logs exist for that entity yet — e.g. records created before audit
> logging was enabled. Show an empty state ("No history available") rather than an error.

---

### 4. Get Single Audit Log Entry

```
GET /audit-logs/:id
Permission: audit.view
```

Used when drilling into one row from the global list (e.g. a "View Details" expand/modal).

#### Path Parameter

| Param | Type | Notes |
|---|---|---|
| `id` | `uuid` | Audit log entry ID |

#### Response `200 OK`

Same shape as one item in the [entity history response](#3-entity-history-per-record-timeline).

#### Response — Not Found `200 OK`

```json
null
```

> Unlike most "get single record" endpoints, this returns HTTP `200` with body `null` if the ID doesn't exist
> (it does **not** throw a `404`). Handle `null` explicitly on the frontend.

---

## Error Responses

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden (missing `audit.view` permission)

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### 400 Bad Request (invalid filter values)

```json
{
  "statusCode": 400,
  "message": ["fromDate must be a valid ISO 8601 date string"],
  "error": "Bad Request"
}
```

---

## Frontend Implementation Notes

### Global Audit Log Screen

- `GET /audit-logs` with `page`, `limit`, and any combination of `module`, `entityName`, `entityId`, `actorId`,
  `action`, `fromDate`, `toDate`, `search`.
- Suggested columns: **Date/Time** (`createdAt`), **User** (`actor.name` / `actor.email`), **Module** (`module`),
  **Entity** (`entityName` + `entityLabel`), **Action** (`action` badge), **Details** (button → opens a
  diff modal using `oldValue`/`newValue`, or calls `GET /audit-logs/:id` if you only fetched the summary).
- Dashboard widgets (totals, action breakdown, recent activity) come from `GET /audit-logs/summary`.
- Filter dropdowns:
  - **Module** → populate from the `AuditModule` enum values listed [above](#auditmodule--entity-name-map).
  - **Action** → populate from the `AuditAction` enum values listed [above](#auditaction).
  - **User** → populate from your existing users dropdown (pass the selected user's `id` as `actorId`).

### Per-Record "View History" Button

Add a **"View History"** (or "Audit Log") button/icon on every record detail screen — Raw Material, Raw Material
Batch, Product, Supplier, Customer, Purchase Order, Purchase Return, GRN, Invoice, Production Order, Production
Line, Material Request, Material Transfer, BOM, Machine, Plant, Work Order, Quality Control, Waste Management,
etc.

**Wiring it up:**

1. Look up the record's Prisma model name (`entityName`) from the
   [Module → Entity Name Map](#auditmodule--entity-name-map) table — this is a static, hardcoded mapping per
   screen, not something returned by the record's own API.
2. On click, call:
   ```
   GET /audit-logs/entity/{entityName}/{entityId}
   ```
   where `{entityId}` is the `id` of the record currently open.
3. Render the result as a vertical timeline (newest first), one entry per audit log:
   - **Header row**: `actor.name` (fallback to `actor.email`, fallback to `"System"` if `actor` is `null`) +
     `action` badge + relative timestamp (`createdAt`).
   - **Body**: diff of `oldValue` → `newValue` (see [Rendering the Diff](#rendering-the-diff)).
   - For `CREATE`, `oldValue` is `null` — show the `newValue` snapshot as "Record created with these values".
   - For `DELETE`, `newValue` is `null` — show `oldValue` as "Record deleted (last known values)".

**Concrete examples per screen:**

| Screen | Call |
|---|---|
| Raw Material detail | `GET /audit-logs/entity/RawMaterial/{rawMaterialId}` |
| Raw Material Batch detail | `GET /audit-logs/entity/RawMaterialBatch/{batchId}` |
| Purchase Order detail | `GET /audit-logs/entity/PurchaseOrder/{purchaseOrderId}` |
| GRN detail | `GET /audit-logs/entity/GRN/{grnId}` |
| Product detail | `GET /audit-logs/entity/Product/{productId}` |
| Supplier detail | `GET /audit-logs/entity/Supplier/{supplierId}` |
| Production Order detail | `GET /audit-logs/entity/ProductionOrder/{productionOrderId}` |
| BOM detail | `GET /audit-logs/entity/BOM/{bomId}` |

### Rendering the Diff

For `UPDATE` entries, the backend **already trims `oldValue`/`newValue` down to only the fields that changed** —
you do not need to compute a diff yourself, just iterate the keys:

```js
Object.keys(log.newValue).map((field) => ({
  field,
  from: log.oldValue?.[field] ?? null,
  to: log.newValue?.[field] ?? null,
}));
```

Display each as: `"reorderLevel: 50 → 100"`.

Notes:
- If a changed field is itself an object (e.g. a relation like `{ uom: { name: ... } }`), render it as nested
  key/value pairs rather than raw JSON where practical.
- Fields with value `"[REDACTED]"` (password/token/etc.) should be shown as-is — never attempt to unmask.
- For `CREATE` / `DELETE`, `oldValue`/`newValue` is the **full snapshot**, not a diff — render it as a read-only
  key/value list (or reuse the same field labels as the entity's edit form for consistency).

### Action Badge Colors (suggested)

| Action | Color |
|---|---|
| `CREATE` | Green |
| `UPDATE` | Blue |
| `DELETE` | Red |
| `APPROVE` | Green |
| `REJECT` | Red |
| `RESTORE` | Amber/Orange |
| `LOGIN` / `LOGOUT` | Gray |
| `EXPORT` / `IMPORT` | Purple |

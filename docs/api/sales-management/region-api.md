# Region Module — Frontend API Reference

> **Purpose**: Complete API reference for the Sales Management Region module — the top level of the territory hierarchy (Region → Zone → City → Branch → Area, see [README.md](./README.md)).
> **Audience**: Frontend developers building the Region list, tree, create/edit, and detail screens.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. All Prisma `Decimal` values are auto-converted to JS numbers by this interceptor. **All response examples in this document show the inner `data` payload only.**

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Region API](#region-api)
   - [List Regions (paginated)](#1-list-regions-paginated)
   - [Regions Dropdown](#2-regions-dropdown)
   - [Get Single Region](#3-get-single-region)
   - [Get Region Tree](#4-get-region-tree)
   - [Create Region](#5-create-region)
   - [Update Region](#6-update-region)
   - [Delete Region](#7-delete-region)
5. [Error Responses](#error-responses)
6. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

`Region` is the root of the territory hierarchy — it has no parent. Each region has zero or more child `Zone` records (`zones`). There is no `Employee`/`Customer` relation directly on `Region`; those are attached much further down the tree (on `Branch` and `Area`/`Customer` respectively).

| Sub-module | Base Path | Description |
| ---------- | --------- | ------------ |
| Regions | `/sales-management/regions` | CRUD for regions + full territory tree view |

### Region Rules

- `name` is **globally unique** (`@unique` in the Prisma schema) — creating/updating with a duplicate name returns `409 Conflict`.
- `countryName` is a plain required string — there is no `Country` entity/enum backing it; the frontend can freely offer a text input or a client-side country list, but the backend does not validate it against a fixed set.
- A region **cannot be deleted** while it has any `Zone` under it — see [Delete Region](#7-delete-region).
- Every route is guarded by `JwtAuthGuard` + `PermissionsGuard`; there is no separate ownership/creator check — any user holding the permission can manage any region.

---

## Permissions

| Permission Key | What it guards |
| --------------- | ---------------- |
| `sales-region.view` | List regions, region dropdown, view a single region, view the region tree |
| `sales-region.manage` | Create, update, and delete regions |

Region has its own dedicated permission namespace (rule: every module owns its permission namespace) — it is **not** shared with Zone/City/Branch/Area, each of which has its own `sales-<level>.view`/`.manage` pair (see [README.md](./README.md#modules)).

---

## Enums & Constants

### `TerritoryStatus`

Shared by every level of the hierarchy (Region, Zone, City, Branch, Area).

| Value | Meaning |
| ----- | -------- |
| `ACTIVE` | Default on create. Included in `/dropdown` results. |
| `INACTIVE` | Excluded from `/dropdown` results, but still returned by the paginated list/tree/detail endpoints. |

### Audit Behavior

All mutating routes (`POST`, `PATCH`, `DELETE`) carry `@Auditable({ module: AuditModule.SALES_MANAGEMENT_REGIONS })`. `POST`/`PATCH` return the full updated `Region` entity so the audit diff is meaningful; `DELETE` returns only `{ message }` (the interceptor forces `newValue: null` for deletes regardless).

---

## Region API

### 1. List Regions (Paginated)

```
GET /sales-management/regions
Permission: sales-region.view
```

#### Query Parameters

| Param | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| `page` | `number` | `1` | Min 1, Max 100 |
| `limit` | `number` | `10` | Min 1, Max 100 |
| `search` | `string` | — | Case-insensitive `contains` match on `name` OR `countryName` |
| `status` | `"ACTIVE"` \| `"INACTIVE"` | — | Exact match filter |
| `sortBy` | `string` | — | One of `name`, `countryName`, `status`, `createdAt`, `updatedAt`. Any other value (or omitted) falls back to `name` ascending. |
| `sortOrder` | `"ASC"` \| `"DESC"` | `DESC` | Only applied when `sortBy` is one of the whitelisted fields above; otherwise ignored (the fallback is always `name` **ascending**, regardless of `sortOrder`). |

> **Note**: Unlike the shared `PaginationDto`'s documented `sortBy` default of `createdAt`, this repository does not apply that default — if `sortBy` is omitted entirely, the list is sorted by `name` A→Z, not by `createdAt`.

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "b1a2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Punjab",
      "countryName": "Pakistan",
      "status": "ACTIVE",
      "createdAt": "2026-07-01T10:00:00.000Z",
      "updatedAt": "2026-07-01T10:00:00.000Z",
      "_count": { "zones": 3 }
    }
  ],
  "meta": {
    "total": 4,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `uuid` | |
| `name` | `string` | Globally unique |
| `countryName` | `string` | Free text |
| `status` | `TerritoryStatus` | |
| `createdAt`/`updatedAt` | `ISO datetime` | |
| `_count.zones` | `number` | Total zones under this region |

---

### 2. Regions Dropdown

```
GET /sales-management/regions/dropdown
Permission: sales-region.view
```

Returns **all `ACTIVE`** regions (no pagination, no `INACTIVE` regions), ordered by `name` ascending — intended for the region picker when creating a Zone.

#### Response `200 OK`

```json
[
  { "id": "b1a2c3d4-e5f6-7890-abcd-ef1234567890", "name": "Punjab" },
  { "id": "c2b3d4e5-f6a7-8901-bcde-f12345678901", "name": "Sindh" }
]
```

---

### 3. Get Single Region

```
GET /sales-management/regions/:regionId
Permission: sales-region.view
```

#### Path Parameter

| Param | Type | Notes |
| ----- | ---- | ----- |
| `regionId` | `uuid` | Validated with `ParseUUIDPipe` — a non-UUID value returns `400`, not `404` |

#### Response `200 OK`

Same shape as the [list item](#1-list-regions-paginated) — `id`, `name`, `countryName`, `status`, `createdAt`, `updatedAt`, `_count.zones`. There is no additional nested detail (no `zones[]` array) — use [Get Region Tree](#4-get-region-tree) for that.

#### Response `404 Not Found`

```json
{ "statusCode": 404, "message": "Region not found", "error": "Not Found" }
```

---

### 4. Get Region Tree

```
GET /sales-management/regions/:regionId/tree
Permission: sales-region.view
```

Returns the region plus its **entire subtree** — zones, and within each zone its cities, and within each city its branches, and within each branch its areas — all nested and each level pre-sorted by `name` ascending. This is the single call needed to render a full drill-down tree for one region without further requests.

#### Path Parameter

| Param | Type | Notes |
| ----- | ---- | ----- |
| `regionId` | `uuid` | Must exist — `404` otherwise |

#### Response `200 OK`

```json
{
  "id": "b1a2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Punjab",
  "countryName": "Pakistan",
  "status": "ACTIVE",
  "createdAt": "2026-07-01T10:00:00.000Z",
  "updatedAt": "2026-07-01T10:00:00.000Z",
  "zones": [
    {
      "id": "d3c4e5f6-a7b8-9012-cdef-123456789012",
      "name": "Lahore Zone",
      "regionId": "b1a2c3d4-e5f6-7890-abcd-ef1234567890",
      "status": "ACTIVE",
      "createdAt": "2026-07-01T10:05:00.000Z",
      "updatedAt": "2026-07-01T10:05:00.000Z",
      "cities": [
        {
          "id": "e4d5f6a7-b8c9-0123-def1-234567890123",
          "name": "Lahore",
          "zoneId": "d3c4e5f6-a7b8-9012-cdef-123456789012",
          "status": "ACTIVE",
          "createdAt": "2026-07-01T10:10:00.000Z",
          "updatedAt": "2026-07-01T10:10:00.000Z",
          "branches": [
            {
              "id": "f5e6a7b8-c9d0-1234-ef12-345678901234",
              "code": "LHR-DHA-01",
              "name": "DHA Branch",
              "cityId": "e4d5f6a7-b8c9-0123-def1-234567890123",
              "distributorId": "a6b7c8d9-e0f1-2345-6789-abcdef012345",
              "address": "123 Main Blvd, DHA Phase 5, Lahore",
              "productGroupIds": ["11111111-1111-1111-1111-111111111111"],
              "status": "ACTIVE",
              "createdAt": "2026-07-01T10:15:00.000Z",
              "updatedAt": "2026-07-01T10:15:00.000Z",
              "areas": [
                {
                  "id": "07f8e9d0-c1b2-3456-a789-0123456789ab",
                  "name": "DHA Phase 5",
                  "branchId": "f5e6a7b8-c9d0-1234-ef12-345678901234",
                  "status": "ACTIVE",
                  "createdAt": "2026-07-01T10:20:00.000Z",
                  "updatedAt": "2026-07-01T10:20:00.000Z"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

> **Note**: The nested `branches[]` nodes here carry the **raw** `Branch` model fields only (including raw `productGroupIds: string[]`) — `distributor` and `productGroups` are **not** resolved/expanded inside the tree response (unlike the standalone [Branch detail endpoint](./branch-api.md#4-get-single-branch)). If the UI needs distributor names or product group names while browsing the tree, resolve them client-side via the Branch/dropdown/detail endpoints, or fetch full branch details on demand when a tree node is expanded/clicked.

#### Response `404 Not Found`

```json
{ "statusCode": 404, "message": "Region not found", "error": "Not Found" }
```

---

### 5. Create Region

```
POST /sales-management/regions
Permission: sales-region.manage
Audit: @Auditable({ module: AuditModule.SALES_MANAGEMENT_REGIONS })
```

#### Request Body

```json
{
  "name": "Punjab",
  "countryName": "Pakistan",
  "status": "ACTIVE"
}
```

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `name` | `string` | Yes | `@IsString() @IsNotEmpty() @MaxLength(128)`, trimmed server-side. Must be globally unique. |
| `countryName` | `string` | Yes | `@IsString() @IsNotEmpty() @MaxLength(128)`, trimmed server-side. |
| `status` | `TerritoryStatus` | No | Defaults to `ACTIVE` on the DB if omitted. |

#### Response `201 Created`

Same shape as [Get Single Region](#3-get-single-region), with `_count.zones: 0` for a brand-new region.

#### Validation Errors `400 Bad Request`

```json
{ "message": ["name should not be empty", "name must be a string"] }
{ "message": ["countryName should not be empty"] }
```

#### Conflict Error `409 Conflict`

```json
{ "message": "A region with this name already exists" }
```

---

### 6. Update Region

```
PATCH /sales-management/regions/:regionId
Permission: sales-region.manage
Audit: @Auditable({ module: AuditModule.SALES_MANAGEMENT_REGIONS })
```

All fields optional (partial update) — same validators as create, via `PartialType(CreateRegionDto)`.

#### Path Parameter

| Param | Type | Notes |
| ----- | ---- | ----- |
| `regionId` | `uuid` | Region to update |

#### Request Body

```json
{ "name": "Punjab Province", "status": "INACTIVE" }
```

#### Response `200 OK`

Full updated region (same shape as [Get Single Region](#3-get-single-region)).

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Region not found", "error": "Not Found" }
```

#### Conflict Error `409 Conflict`

```json
{ "message": "A region with this name already exists" }
```

---

### 7. Delete Region

```
DELETE /sales-management/regions/:regionId
Permission: sales-region.manage
Audit: @Auditable({ module: AuditModule.SALES_MANAGEMENT_REGIONS })
```

Hard-deletes a region. **Blocked** if it has any zone underneath it.

**Business Rules (checked in this order):**

1. Region must exist, or `404 Not Found`.
2. If any `Zone.regionId` references this region → `400 Bad Request`.
3. Otherwise, hard-deleted.

#### Path Parameter

| Param | Type | Notes |
| ----- | ---- | ----- |
| `regionId` | `uuid` | Region to delete |

#### Response `200 OK`

```json
{ "message": "Region deleted successfully" }
```

#### Validation Error `400 Bad Request`

```json
{ "message": "Cannot delete a region that has zones assigned to it" }
```

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Region not found", "error": "Not Found" }
```

---

## Error Responses

### 400 Bad Request

```json
{ "statusCode": 400, "message": "...", "error": "Bad Request" }
```

### 401 Unauthorized

```json
{ "statusCode": 401, "message": "Unauthorized" }
```

### 403 Forbidden (missing permission)

```json
{ "statusCode": 403, "message": "Forbidden resource", "error": "Forbidden" }
```

### 404 Not Found

```json
{ "statusCode": 404, "message": "Region not found", "error": "Not Found" }
```

### 409 Conflict (duplicate name)

```json
{ "statusCode": 409, "message": "A region with this name already exists", "error": "Conflict" }
```

---

## Frontend Implementation Notes

### Screen Flows

**Region List Screen**

- `GET /sales-management/regions` with pagination + `search` (matches `name` or `countryName`) + `status` filter.
- Sortable columns: `name`, `countryName`, `status`, `createdAt`, `updatedAt`. Default order (no `sortBy`) is `name` A→Z.
- Show `_count.zones` as a "Zones" column badge.

**Region Tree Screen**

- `GET /sales-management/regions/:id/tree` to power a single expandable tree (Region → Zones → Cities → Branches → Areas) for one region. Fetch once per region; there's no live filtering/search on this endpoint.
- Remember: `branches` nodes inside the tree only carry raw fields (`distributorId`, `productGroupIds`) — resolve distributor/product-group names separately if the tree UI needs to display them, rather than assuming they come pre-joined.

**Create / Edit Region Screen**

- `POST /sales-management/regions` to create; `PATCH /sales-management/regions/:id` to edit.
- `countryName` has no backend-enforced enum — if the product wants a fixed country list, enforce it client-side.
- Surface the `409` duplicate-name error inline on the `name` field.

**Delete Action**

- `DELETE /sales-management/regions/:id` — only allow (or attempt) when `_count.zones === 0`; the list/detail response's `_count.zones` is safe to use directly here (unlike some other modules' counts, this one filters on the exact same condition the delete guard checks).

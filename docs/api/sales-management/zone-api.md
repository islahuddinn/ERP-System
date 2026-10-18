# Zone Module — Frontend API Reference

> **Purpose**: Complete API reference for the Sales Management Zone module — the second level of the territory hierarchy (Region → **Zone** → City → Branch → Area, see [README.md](./README.md)).
> **Audience**: Frontend developers building the Zone list, tree, create/edit, and detail screens.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. All Prisma `Decimal` values are auto-converted to JS numbers by this interceptor. **All response examples in this document show the inner `data` payload only.**

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Zone API](#zone-api)
   - [List Zones (paginated)](#1-list-zones-paginated)
   - [Zones Dropdown](#2-zones-dropdown)
   - [Get Single Zone](#3-get-single-zone)
   - [Get Zone Tree](#4-get-zone-tree)
   - [Create Zone](#5-create-zone)
   - [Update Zone](#6-update-zone)
   - [Delete Zone](#7-delete-zone)
5. [Error Responses](#error-responses)
6. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

`Zone` belongs to exactly one `Region` (`Zone.regionId → Region.id`) and has zero or more child `City` records (`cities`). See [region-api.md](./region-api.md) for the parent level.

| Sub-module | Base Path | Description |
| ---------- | --------- | ------------ |
| Zones | `/sales-management/zones` | CRUD for zones (scoped to a region) + territory subtree view |

### Zone Rules

- `name` is unique **within its region** (`@@unique([name, regionId])` — not globally unique like `Region.name`). The same zone name (e.g. "North Zone") can exist under two different regions.
- Creating or updating a zone validates `regionId` against the Region module (`RegionService.checkExistence`) — an unknown `regionId` returns `404 Not Found` with message `"Region not found"` (not a Zone-specific message).
- A zone **cannot be deleted** while it has any `City` under it — see [Delete Zone](#7-delete-zone).
- Updating a zone's `regionId` **moves** it to a different region (re-parents it); it does not clone or validate uniqueness against the old region.

---

## Permissions

| Permission Key | What it guards |
| --------------- | ---------------- |
| `sales-zone.view` | List zones, zone dropdown, view a single zone, view the zone tree |
| `sales-zone.manage` | Create, update, and delete zones |

Zone has its own dedicated permission namespace — independent from `sales-region.*`. Holding `sales-zone.manage` alone is enough to create a zone under **any** region the caller can see; there is no per-region ownership restriction.

---

## Enums & Constants

### `TerritoryStatus`

Shared across the whole hierarchy — see [region-api.md](./region-api.md#enums--constants). `ACTIVE` (default) | `INACTIVE`.

### Audit Behavior

All mutating routes carry `@Auditable({ module: AuditModule.SALES_MANAGEMENT_ZONES })`. `POST`/`PATCH` return the full updated `Zone` entity; `DELETE` returns only `{ message }`.

---

## Zone API

### 1. List Zones (Paginated)

```
GET /sales-management/zones
Permission: sales-zone.view
```

#### Query Parameters

| Param | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| `page` | `number` | `1` | Min 1, Max 100 |
| `limit` | `number` | `10` | Min 1, Max 100 |
| `search` | `string` | — | Case-insensitive `contains` match on `name` only |
| `status` | `"ACTIVE"` \| `"INACTIVE"` | — | Exact match filter |
| `regionId` | `uuid` | — | Restrict the list to zones under one region |
| `sortBy` | `string` | — | One of `name`, `status`, `createdAt`, `updatedAt`, `region.name`. Any other value (or omitted) falls back to `name` ascending. |
| `sortOrder` | `"ASC"` \| `"DESC"` | `DESC` | Only applied when `sortBy` is whitelisted. |

> **Note**: `sortBy=region.name` sorts by the parent region's name — useful for a flat "all zones" table grouped visually by region.

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "d3c4e5f6-a7b8-9012-cdef-123456789012",
      "name": "Lahore Zone",
      "regionId": "b1a2c3d4-e5f6-7890-abcd-ef1234567890",
      "status": "ACTIVE",
      "createdAt": "2026-07-01T10:05:00.000Z",
      "updatedAt": "2026-07-01T10:05:00.000Z",
      "region": { "id": "b1a2c3d4-e5f6-7890-abcd-ef1234567890", "name": "Punjab" },
      "_count": { "cities": 2 }
    }
  ],
  "meta": { "total": 5, "page": 1, "limit": 10, "totalPages": 1, "hasNext": false, "hasPrev": false }
}
```

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `uuid` | |
| `name` | `string` | Unique within `regionId` |
| `regionId` | `uuid` | |
| `status` | `TerritoryStatus` | |
| `createdAt`/`updatedAt` | `ISO datetime` | |
| `region` | `{ id, name }` | Only `id`/`name` selected — no full parent entity |
| `_count.cities` | `number` | Total cities under this zone |

---

### 2. Zones Dropdown

```
GET /sales-management/zones/dropdown
Permission: sales-zone.view
```

Returns **all `ACTIVE`** zones (no pagination), ordered by `name` ascending. Pass `regionId` to scope to one region's zones (e.g. after the user picks a Region in a Create Branch/City wizard).

#### Query Parameters

| Param | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `regionId` | `uuid` | No | Omit to return active zones across **all** regions |

#### Response `200 OK`

```json
[
  { "id": "d3c4e5f6-a7b8-9012-cdef-123456789012", "name": "Lahore Zone", "regionId": "b1a2c3d4-e5f6-7890-abcd-ef1234567890" }
]
```

---

### 3. Get Single Zone

```
GET /sales-management/zones/:zoneId
Permission: sales-zone.view
```

#### Path Parameter

| Param | Type | Notes |
| ----- | ---- | ----- |
| `zoneId` | `uuid` | Validated with `ParseUUIDPipe` |

#### Response `200 OK`

Same shape as the [list item](#1-list-zones-paginated) — includes `region: { id, name }` and `_count.cities`.

#### Response `404 Not Found`

```json
{ "statusCode": 404, "message": "Zone not found", "error": "Not Found" }
```

---

### 4. Get Zone Tree

```
GET /sales-management/zones/:zoneId/tree
Permission: sales-zone.view
```

Returns the zone plus its cities, and within each city its branches, and within each branch its areas — nested, each level sorted by `name` ascending.

#### Response `200 OK`

```json
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
```

> **Note**: Just like the [Region tree](./region-api.md#4-get-region-tree), the nested `branches[]` nodes here are **raw** `Branch` fields only — no resolved `distributor`/`productGroups`. This zone-level tree also does **not** include the parent `region` object — only the zone's own fields plus `cities` downward.

#### Response `404 Not Found`

```json
{ "statusCode": 404, "message": "Zone not found", "error": "Not Found" }
```

---

### 5. Create Zone

```
POST /sales-management/zones
Permission: sales-zone.manage
Audit: @Auditable({ module: AuditModule.SALES_MANAGEMENT_ZONES })
```

#### Request Body

```json
{
  "name": "Lahore Zone",
  "regionId": "b1a2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "ACTIVE"
}
```

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `name` | `string` | Yes | `@IsString() @IsNotEmpty() @MaxLength(128)`, trimmed. Unique within `regionId`. |
| `regionId` | `uuid` | Yes | `@IsUUID()`. Must reference an existing, `sales-region.view`-visible region. |
| `status` | `TerritoryStatus` | No | Defaults to `ACTIVE`. |

#### Response `201 Created`

Same shape as [Get Single Zone](#3-get-single-zone), with `_count.cities: 0`.

#### Validation Errors `400 Bad Request`

```json
{ "message": ["name should not be empty"] }
{ "message": ["regionId must be a UUID"] }
```

#### Not Found `404 Not Found` (parent region doesn't exist)

```json
{ "statusCode": 404, "message": "Region not found", "error": "Not Found" }
```

#### Conflict Error `409 Conflict`

```json
{ "message": "A zone with this name already exists in this region" }
```

---

### 6. Update Zone

```
PATCH /sales-management/zones/:zoneId
Permission: sales-zone.manage
Audit: @Auditable({ module: AuditModule.SALES_MANAGEMENT_ZONES })
```

All fields optional. Sending `regionId` **re-parents** the zone to a different region (the new `regionId` is validated the same way as create).

#### Request Body

```json
{ "name": "Lahore Metro Zone" }
```

#### Response `200 OK`

Full updated zone (same shape as [Get Single Zone](#3-get-single-zone)).

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Zone not found", "error": "Not Found" }
```

or, if an invalid `regionId` was supplied:

```json
{ "statusCode": 404, "message": "Region not found", "error": "Not Found" }
```

#### Conflict Error `409 Conflict`

```json
{ "message": "A zone with this name already exists in this region" }
```

---

### 7. Delete Zone

```
DELETE /sales-management/zones/:zoneId
Permission: sales-zone.manage
Audit: @Auditable({ module: AuditModule.SALES_MANAGEMENT_ZONES })
```

**Business Rules (checked in this order):**

1. Zone must exist, or `404 Not Found`.
2. If any `City.zoneId` references this zone → `400 Bad Request`.
3. Otherwise, hard-deleted.

#### Response `200 OK`

```json
{ "message": "Zone deleted successfully" }
```

#### Validation Error `400 Bad Request`

```json
{ "message": "Cannot delete a zone that has cities assigned to it" }
```

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Zone not found", "error": "Not Found" }
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
{ "statusCode": 404, "message": "Zone not found", "error": "Not Found" }
```

Also returned as `"Region not found"` when create/update references an unknown `regionId`.

### 409 Conflict (duplicate name within region)

```json
{ "statusCode": 409, "message": "A zone with this name already exists in this region", "error": "Conflict" }
```

---

## Frontend Implementation Notes

### Screen Flows

**Zone List Screen**

- `GET /sales-management/zones` with pagination + `search` (name only) + `status` + `regionId` filter.
- If the screen is entered via a Region row ("view zones for this region"), pre-set `regionId` in the query and hide/disable the region column.
- Sortable columns: `name`, `status`, `createdAt`, `updatedAt`, `region.name`.

**Create / Edit Zone Screen**

- Region picker: populate from `GET /sales-management/regions/dropdown`.
- `POST /sales-management/zones` to create; `PATCH /sales-management/zones/:id` to edit. Changing the region picker on edit re-parents the zone — warn the user this moves all of the zone's cities/branches/areas along with it.
- Surface `409` inline on `name`; surface `404` ("Region not found") as a stale-picker error (region list should be refetched).

**Delete Action**

- `DELETE /sales-management/zones/:id` — only allow when `_count.cities === 0`; the count from list/detail is safe to use directly (matches the delete guard's own check).

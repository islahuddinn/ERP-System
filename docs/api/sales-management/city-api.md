# City Module — Frontend API Reference

> **Purpose**: Complete API reference for the Sales Management City module — the third level of the territory hierarchy (Region → Zone → **City** → Branch → Area, see [README.md](./README.md)).
> **Audience**: Frontend developers building the City list, tree, create/edit, and detail screens.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. All Prisma `Decimal` values are auto-converted to JS numbers by this interceptor. **All response examples in this document show the inner `data` payload only.**

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [City API](#city-api)
   - [List Cities (paginated)](#1-list-cities-paginated)
   - [Cities Dropdown](#2-cities-dropdown)
   - [Get Single City](#3-get-single-city)
   - [Get City Tree](#4-get-city-tree)
   - [Create City](#5-create-city)
   - [Update City](#6-update-city)
   - [Delete City](#7-delete-city)
5. [Error Responses](#error-responses)
6. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

`City` belongs to exactly one `Zone` (`City.zoneId → Zone.id`) and has zero or more child `Branch` records (`branches`). See [zone-api.md](./zone-api.md) for the parent level.

| Sub-module | Base Path | Description |
| ---------- | --------- | ------------ |
| Cities | `/sales-management/cities` | CRUD for cities (scoped to a zone) + territory subtree view |

### City Rules

- `name` is unique **within its zone** (`@@unique([name, zoneId])`) — the same city name can exist under two different zones (e.g. two regions each with a "Model Town" area naming quirk), though in practice city names are usually globally distinct.
- Creating or updating a city validates `zoneId` against the Zone module (`ZoneService.checkExistence`) — an unknown `zoneId` returns `404 Not Found` with message `"Zone not found"`.
- A city **cannot be deleted** while it has any `Branch` under it — see [Delete City](#7-delete-city).
- Updating a city's `zoneId` re-parents it to a different zone (and transitively, a different region).

---

## Permissions

| Permission Key | What it guards |
| --------------- | ---------------- |
| `sales-city.view` | List cities, city dropdown, view a single city, view the city tree |
| `sales-city.manage` | Create, update, and delete cities |

---

## Enums & Constants

### `TerritoryStatus`

Shared across the whole hierarchy — see [region-api.md](./region-api.md#enums--constants). `ACTIVE` (default) | `INACTIVE`.

### Audit Behavior

All mutating routes carry `@Auditable({ module: AuditModule.SALES_MANAGEMENT_CITIES })`. `POST`/`PATCH` return the full updated `City` entity; `DELETE` returns only `{ message }`.

---

## City API

### 1. List Cities (Paginated)

```
GET /sales-management/cities
Permission: sales-city.view
```

#### Query Parameters

| Param | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| `page` | `number` | `1` | Min 1, Max 100 |
| `limit` | `number` | `10` | Min 1, Max 100 |
| `search` | `string` | — | Case-insensitive `contains` match on `name` only |
| `status` | `"ACTIVE"` \| `"INACTIVE"` | — | Exact match filter |
| `zoneId` | `uuid` | — | Restrict the list to cities under one zone |
| `sortBy` | `string` | — | One of `name`, `status`, `createdAt`, `updatedAt`, `zone.name`. Any other value (or omitted) falls back to `name` ascending. |
| `sortOrder` | `"ASC"` \| `"DESC"` | `DESC` | Only applied when `sortBy` is whitelisted. |

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "e4d5f6a7-b8c9-0123-def1-234567890123",
      "name": "Lahore",
      "zoneId": "d3c4e5f6-a7b8-9012-cdef-123456789012",
      "status": "ACTIVE",
      "createdAt": "2026-07-01T10:10:00.000Z",
      "updatedAt": "2026-07-01T10:10:00.000Z",
      "zone": {
        "id": "d3c4e5f6-a7b8-9012-cdef-123456789012",
        "name": "Lahore Zone",
        "regionId": "b1a2c3d4-e5f6-7890-abcd-ef1234567890",
        "status": "ACTIVE",
        "createdAt": "2026-07-01T10:05:00.000Z",
        "updatedAt": "2026-07-01T10:05:00.000Z",
        "region": { "id": "b1a2c3d4-e5f6-7890-abcd-ef1234567890", "name": "Punjab" }
      },
      "_count": { "branches": 1 }
    }
  ],
  "meta": { "total": 3, "page": 1, "limit": 10, "totalPages": 1, "hasNext": false, "hasPrev": false }
}
```

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `uuid` | |
| `name` | `string` | Unique within `zoneId` |
| `zoneId` | `uuid` | |
| `status` | `TerritoryStatus` | |
| `createdAt`/`updatedAt` | `ISO datetime` | |
| `zone` | full `Zone` object + nested `region: { id, name }` | **Note**: unlike Zone's own list (which selects only `{ id, name }` for its parent region), City's list/detail includes the **entire** raw `Zone` record (all its scalar fields) plus the zone's `region` narrowed to `{ id, name }`. This is a deeper include than the Region↔Zone pattern — don't assume all levels select their parent identically. |
| `_count.branches` | `number` | Total branches under this city |

---

### 2. Cities Dropdown

```
GET /sales-management/cities/dropdown
Permission: sales-city.view
```

Returns **all `ACTIVE`** cities (no pagination), ordered by `name` ascending. Pass `zoneId` to scope to one zone.

#### Query Parameters

| Param | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `zoneId` | `uuid` | No | Omit to return active cities across **all** zones |

#### Response `200 OK`

```json
[
  { "id": "e4d5f6a7-b8c9-0123-def1-234567890123", "name": "Lahore", "zoneId": "d3c4e5f6-a7b8-9012-cdef-123456789012" }
]
```

---

### 3. Get Single City

```
GET /sales-management/cities/:cityId
Permission: sales-city.view
```

#### Path Parameter

| Param | Type | Notes |
| ----- | ---- | ----- |
| `cityId` | `uuid` | Validated with `ParseUUIDPipe` |

#### Response `200 OK`

Same shape as the [list item](#1-list-cities-paginated) — includes the full `zone` object (with nested `region: { id, name }`) and `_count.branches`.

#### Response `404 Not Found`

```json
{ "statusCode": 404, "message": "City not found", "error": "Not Found" }
```

---

### 4. Get City Tree

```
GET /sales-management/cities/:cityId/tree
Permission: sales-city.view
```

Returns the city plus its branches, and within each branch its areas — nested, each level sorted by `name` ascending.

#### Response `200 OK`

```json
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
```

> **Note**: This tree does **not** include the parent `zone`/`region` — only the city's own fields plus `branches` downward. `branches[]` again carries raw fields only (`distributorId`, `productGroupIds`) — no resolved `distributor`/`productGroups` objects, same caveat as the Region and Zone trees.

#### Response `404 Not Found`

```json
{ "statusCode": 404, "message": "City not found", "error": "Not Found" }
```

---

### 5. Create City

```
POST /sales-management/cities
Permission: sales-city.manage
Audit: @Auditable({ module: AuditModule.SALES_MANAGEMENT_CITIES })
```

#### Request Body

```json
{
  "name": "Lahore",
  "zoneId": "d3c4e5f6-a7b8-9012-cdef-123456789012",
  "status": "ACTIVE"
}
```

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `name` | `string` | Yes | `@IsString() @IsNotEmpty() @MaxLength(128)`, trimmed. Unique within `zoneId`. |
| `zoneId` | `uuid` | Yes | `@IsUUID()`. Must reference an existing zone. |
| `status` | `TerritoryStatus` | No | Defaults to `ACTIVE`. |

#### Response `201 Created`

Same shape as [Get Single City](#3-get-single-city), with `_count.branches: 0`.

#### Validation Errors `400 Bad Request`

```json
{ "message": ["name should not be empty"] }
{ "message": ["zoneId must be a UUID"] }
```

#### Not Found `404 Not Found` (parent zone doesn't exist)

```json
{ "statusCode": 404, "message": "Zone not found", "error": "Not Found" }
```

#### Conflict Error `409 Conflict`

```json
{ "message": "A city with this name already exists in this zone" }
```

---

### 6. Update City

```
PATCH /sales-management/cities/:cityId
Permission: sales-city.manage
Audit: @Auditable({ module: AuditModule.SALES_MANAGEMENT_CITIES })
```

All fields optional. Sending `zoneId` re-parents the city.

#### Request Body

```json
{ "name": "Lahore City" }
```

#### Response `200 OK`

Full updated city (same shape as [Get Single City](#3-get-single-city)).

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "City not found", "error": "Not Found" }
```

or, for an invalid `zoneId`:

```json
{ "statusCode": 404, "message": "Zone not found", "error": "Not Found" }
```

#### Conflict Error `409 Conflict`

```json
{ "message": "A city with this name already exists in this zone" }
```

---

### 7. Delete City

```
DELETE /sales-management/cities/:cityId
Permission: sales-city.manage
Audit: @Auditable({ module: AuditModule.SALES_MANAGEMENT_CITIES })
```

**Business Rules (checked in this order):**

1. City must exist, or `404 Not Found`.
2. If any `Branch.cityId` references this city → `400 Bad Request`.
3. Otherwise, hard-deleted.

#### Response `200 OK`

```json
{ "message": "City deleted successfully" }
```

#### Validation Error `400 Bad Request`

```json
{ "message": "Cannot delete a city that has branches assigned to it" }
```

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "City not found", "error": "Not Found" }
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
{ "statusCode": 404, "message": "City not found", "error": "Not Found" }
```

Also returned as `"Zone not found"` when create/update references an unknown `zoneId`.

### 409 Conflict (duplicate name within zone)

```json
{ "statusCode": 409, "message": "A city with this name already exists in this zone", "error": "Conflict" }
```

---

## Frontend Implementation Notes

### Screen Flows

**City List Screen**

- `GET /sales-management/cities` with pagination + `search` (name only) + `status` + `zoneId` filter.
- If entered from a Zone row, pre-set `zoneId` and hide the zone column.
- Sortable columns: `name`, `status`, `createdAt`, `updatedAt`, `zone.name`.
- The `zone` object on each row already includes `region: { id, name }` — you can render a "Region / Zone" breadcrumb column without an extra request.

**Create / Edit City Screen**

- Zone picker: populate from `GET /sales-management/zones/dropdown` (optionally pre-filtered by a chosen region via `?regionId=`).
- `POST /sales-management/cities` to create; `PATCH /sales-management/cities/:id` to edit. Re-parenting via `zoneId` moves the city's branches/areas along with it — warn the user.
- Surface `409` inline on `name`; surface `404` ("Zone not found") as a stale-picker error.

**Delete Action**

- `DELETE /sales-management/cities/:id` — only allow when `_count.branches === 0`.

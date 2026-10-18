# Area Module — Frontend API Reference

> **Purpose**: Complete API reference for the Sales Management Area module — the leaf level of the territory hierarchy (Region → Zone → City → Branch → **Area**, see [README.md](./README.md)).
> **Audience**: Frontend developers building the Area list, create/edit, and detail screens.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. All Prisma `Decimal` values are auto-converted to JS numbers by this interceptor. **All response examples in this document show the inner `data` payload only.**

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Area API](#area-api)
   - [List Areas (paginated)](#1-list-areas-paginated)
   - [Areas Dropdown](#2-areas-dropdown)
   - [Get Single Area](#3-get-single-area)
   - [Create Area](#4-create-area)
   - [Update Area](#5-update-area)
   - [Delete Area](#6-delete-area)
5. [Error Responses](#error-responses)
6. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

`Area` belongs to exactly one `Branch` (`Area.branchId → Branch.id`) and is the **leaf** of the territory hierarchy — it has no children of its own within Sales Management. It is, however, referenced by `Customer.areaId` (see `customers-api.md`), which is the eventual point of this whole hierarchy: every customer is assigned to an area, which resolves up through Branch → City → Zone → Region.

| Sub-module | Base Path | Description |
| ---------- | --------- | ------------ |
| Areas | `/sales-management/areas` | CRUD for areas (scoped to a branch) |

### Area Rules

- `name` is unique **within its branch** (`@@unique([name, branchId])`).
- Creating/updating validates `branchId` against the Branch module (`BranchService.checkExistence`) — an unknown `branchId` returns `404 "Branch not found"`.
- **No `/tree` endpoint** — Area is the leaf, there's nothing further to nest. Use [Get Branch Tree](./branch-api.md#4-get-branch-tree) (one level up) if you need an area's siblings nested under its branch.
- **No delete guard against `Customer`** — unlike every other level in this hierarchy, deleting an Area does **not** check whether any `Customer.areaId` still points to it. Deleting an area that customers reference is possible and will leave those customers with a dangling `areaId`. See [Delete Area](#6-delete-area) and the Frontend note below — this is a real gap the frontend should defend against until/unless backend adds the guard.

---

## Permissions

| Permission Key | What it guards |
| --------------- | ---------------- |
| `sales-area.view` | List areas, area dropdown, view a single area |
| `sales-area.manage` | Create, update, and delete areas |

---

## Enums & Constants

### `TerritoryStatus`

Shared across the whole hierarchy — see [region-api.md](./region-api.md#enums--constants). `ACTIVE` (default) | `INACTIVE`.

### Audit Behavior

All mutating routes carry `@Auditable({ module: AuditModule.SALES_MANAGEMENT_AREAS })`. `POST`/`PATCH` return the full updated `Area` entity; `DELETE` returns only `{ message }`.

---

## Area API

### 1. List Areas (Paginated)

```
GET /sales-management/areas
Permission: sales-area.view
```

#### Query Parameters

| Param | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| `page` | `number` | `1` | Min 1, Max 100 |
| `limit` | `number` | `10` | Min 1, Max 100 |
| `search` | `string` | — | Case-insensitive `contains` match on `name` only |
| `status` | `"ACTIVE"` \| `"INACTIVE"` | — | Exact match filter |
| `branchId` | `uuid` | — | Restrict the list to areas under one branch |
| `sortBy` | `string` | — | One of `name`, `status`, `createdAt`, `updatedAt`, `branch.name`. Any other value (or omitted) falls back to `name` ascending. |
| `sortOrder` | `"ASC"` \| `"DESC"` | `DESC` | Only applied when `sortBy` is whitelisted. |

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "07f8e9d0-c1b2-3456-a789-0123456789ab",
      "name": "DHA Phase 5",
      "branchId": "f5e6a7b8-c9d0-1234-ef12-345678901234",
      "status": "ACTIVE",
      "createdAt": "2026-07-01T10:20:00.000Z",
      "updatedAt": "2026-07-01T10:20:00.000Z",
      "branch": {
        "id": "f5e6a7b8-c9d0-1234-ef12-345678901234",
        "name": "DHA Branch",
        "city": {
          "id": "e4d5f6a7-b8c9-0123-def1-234567890123",
          "name": "Lahore",
          "zone": {
            "id": "d3c4e5f6-a7b8-9012-cdef-123456789012",
            "name": "Lahore Zone",
            "region": { "id": "b1a2c3d4-e5f6-7890-abcd-ef1234567890", "name": "Punjab" }
          }
        }
      }
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 10, "totalPages": 1, "hasNext": false, "hasPrev": false }
}
```

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `uuid` | |
| `name` | `string` | Unique within `branchId` |
| `branchId` | `uuid` | |
| `status` | `TerritoryStatus` | |
| `createdAt`/`updatedAt` | `ISO datetime` | |
| `branch` | `{ id, name, city: { id, name, zone: { id, name, region: { id, name } } } }` | Full breadcrumb up to Region, all narrowed to `{ id, name }` at each level |

> **Note**: There is **no `_count`** field on Area (no children to count) — this is the only level in the hierarchy without one.

---

### 2. Areas Dropdown

```
GET /sales-management/areas/dropdown
Permission: sales-area.view
```

Returns **all `ACTIVE`** areas (no pagination), ordered by `name` ascending. Pass `branchId` to scope to one branch — this is the dropdown used by the Customer create/edit screen's area picker (see `customers-api.md`).

#### Query Parameters

| Param | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `branchId` | `uuid` | No | Omit to return active areas across **all** branches |

#### Response `200 OK`

```json
[
  { "id": "07f8e9d0-c1b2-3456-a789-0123456789ab", "name": "DHA Phase 5", "branchId": "f5e6a7b8-c9d0-1234-ef12-345678901234" }
]
```

---

### 3. Get Single Area

```
GET /sales-management/areas/:areaId
Permission: sales-area.view
```

#### Path Parameter

| Param | Type | Notes |
| ----- | ---- | ----- |
| `areaId` | `uuid` | Validated with `ParseUUIDPipe` |

#### Response `200 OK`

Same shape as the [list item](#1-list-areas-paginated) — includes the full `branch` breadcrumb up through `city.zone.region`.

#### Response `404 Not Found`

```json
{ "statusCode": 404, "message": "Area not found", "error": "Not Found" }
```

---

### 4. Create Area

```
POST /sales-management/areas
Permission: sales-area.manage
Audit: @Auditable({ module: AuditModule.SALES_MANAGEMENT_AREAS })
```

#### Request Body

```json
{
  "name": "DHA Phase 5",
  "branchId": "f5e6a7b8-c9d0-1234-ef12-345678901234",
  "status": "ACTIVE"
}
```

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `name` | `string` | Yes | `@IsString() @IsNotEmpty() @MaxLength(128)`, trimmed. Unique within `branchId`. |
| `branchId` | `uuid` | Yes | `@IsUUID()`. Must reference an existing branch. |
| `status` | `TerritoryStatus` | No | Defaults to `ACTIVE`. |

#### Response `201 Created`

Same shape as [Get Single Area](#3-get-single-area).

#### Validation Errors `400 Bad Request`

```json
{ "message": ["name should not be empty"] }
{ "message": ["branchId must be a UUID"] }
```

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Branch not found", "error": "Not Found" }
```

#### Conflict Error `409 Conflict`

```json
{ "message": "An area with this name already exists in this branch" }
```

---

### 5. Update Area

```
PATCH /sales-management/areas/:areaId
Permission: sales-area.manage
Audit: @Auditable({ module: AuditModule.SALES_MANAGEMENT_AREAS })
```

All fields optional. Sending `branchId` re-parents the area to a different branch — this also silently changes which region/zone/city any `Customer` assigned to this area now rolls up under, without touching the `Customer` record itself.

#### Request Body

```json
{ "name": "DHA Phase 5 Extension" }
```

#### Response `200 OK`

Full updated area (same shape as [Get Single Area](#3-get-single-area)).

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Area not found", "error": "Not Found" }
```

or, for an invalid `branchId`:

```json
{ "statusCode": 404, "message": "Branch not found", "error": "Not Found" }
```

#### Conflict Error `409 Conflict`

```json
{ "message": "An area with this name already exists in this branch" }
```

---

### 6. Delete Area

```
DELETE /sales-management/areas/:areaId
Permission: sales-area.manage
Audit: @Auditable({ module: AuditModule.SALES_MANAGEMENT_AREAS })
```

Hard-deletes an area. **There is no business-rule guard here** — unlike Region/Zone/City/Branch, which all block deletion while children exist, Area has no children to block on *within this module*, and the service does **not** check whether any `Customer.areaId` still references it before deleting.

**Business Rules (checked in this order):**

1. Area must exist, or `404 Not Found`.
2. Otherwise, hard-deleted — unconditionally.

#### Path Parameter

| Param | Type | Notes |
| ----- | ---- | ----- |
| `areaId` | `uuid` | Area to delete |

#### Response `200 OK`

```json
{ "message": "Area deleted successfully" }
```

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Area not found", "error": "Not Found" }
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
{ "statusCode": 404, "message": "Area not found", "error": "Not Found" }
```

Also returned as `"Branch not found"` when create/update references an unknown `branchId`.

### 409 Conflict (duplicate name within branch)

```json
{ "statusCode": 409, "message": "An area with this name already exists in this branch", "error": "Conflict" }
```

---

## Frontend Implementation Notes

### Screen Flows

**Area List Screen**

- `GET /sales-management/areas` with pagination + `search` (name only) + `status` + `branchId` filter.
- Each row's `branch` field carries the full breadcrumb up to Region — render it directly without extra requests.
- Sortable columns: `name`, `status`, `createdAt`, `updatedAt`, `branch.name`.

**Create / Edit Area Screen**

- Branch picker: `GET /sales-management/branches/dropdown` (optionally pre-filtered by city/zone/region upstream).
- `POST /sales-management/areas` to create; `PATCH /sales-management/areas/:id` to edit.
- Surface `409` inline on `name`.

**Delete Action — important gap to design around**

- `DELETE /sales-management/areas/:id` **always succeeds** if the area exists — there is no "this area still has customers" guard like every other level has for its children. Before wiring a Delete button, check with backend whether a `Customer`-count guard is planned; until then, consider either (a) checking `customers-api.md`'s list/count endpoint for `areaId` before allowing delete client-side, or (b) at minimum warning the user that deleting an area does not reassign or block on customers already assigned to it.

**Customer Assignment**

- The Customer create/edit screen's area picker should use `GET /sales-management/areas/dropdown?branchId=...` scoped to a chosen branch — see `customers-api.md` for how `Customer.areaId` is consumed.

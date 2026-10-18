# Branch Module — Frontend API Reference

> **Purpose**: Complete API reference for the Sales Management Branch module — the fourth level of the territory hierarchy (Region → Zone → City → **Branch** → Area, see [README.md](./README.md)).
> **Audience**: Frontend developers building the Branch list, tree, create/edit, and detail screens.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. All Prisma `Decimal` values are auto-converted to JS numbers by this interceptor. **All response examples in this document show the inner `data` payload only.**

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Branch API](#branch-api)
   - [List Branches (paginated)](#1-list-branches-paginated)
   - [Branches Dropdown](#2-branches-dropdown)
   - [Get Single Branch](#3-get-single-branch)
   - [Get Branch Tree](#4-get-branch-tree)
   - [Create Branch](#5-create-branch)
   - [Update Branch](#6-update-branch)
   - [Delete Branch](#7-delete-branch)
5. [Error Responses](#error-responses)
6. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

`Branch` belongs to exactly one `City` (`Branch.cityId → City.id`) and has zero or more child `Area` records (`areas`). Unlike the levels above it, a Branch also carries two extra relationships that aren't part of the pure territory tree:

- **`distributorId`** — a required `Employee` (from the HR module) responsible for the branch. See `hr/employee-api.md` for the Employee shape.
- **`productGroupIds`** — a **plain UUID array column** (`String[]` in Prisma), **not** a join table/relation. It references `ProductGroup` records, but there is no Prisma-level foreign key — the backend resolves these IDs into full `ProductGroup` summaries manually (users-map pattern) rather than via `include`.

| Sub-module | Base Path                    | Description                                                                                      |
| ---------- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Branches   | `/sales-management/branches` | CRUD for branches (scoped to a city, with distributor + product groups) + territory subtree view |

### Branch Rules

- `code` is **globally unique** (`@unique`) — like `Region.name`, this is not scoped to the city.
- `name` is unique **within its city** (`@@unique([name, cityId])`).
- Creating/updating validates `cityId` (must exist — `404 "City not found"`) and `distributorId` (must be an existing Employee — `404 "Employee not found"`).
- **Product group exclusivity rule** (branch-level business rule, not a DB constraint): within the **same city**, a given `ProductGroup` can only be assigned to **one** branch. If `productGroupIds` on create/update overlaps with another branch's `productGroupIds` in the same city, the request fails with `409 Conflict` naming the conflicting branch. This check is scoped per-city — the same product group _can_ be assigned to one branch in City A and a different branch in City B simultaneously.
- A branch **cannot be deleted** while it has any `Area` under it — see [Delete Branch](#7-delete-branch).
- `address` is a required free-text string (no structured address fields).

---

## Permissions

| Permission Key        | What it guards                                                             |
| --------------------- | -------------------------------------------------------------------------- |
| `sales-branch.view`   | List branches, branch dropdown, view a single branch, view the branch tree |
| `sales-branch.manage` | Create, update, and delete branches                                        |

---

## Enums & Constants

### `TerritoryStatus`

Shared across the whole hierarchy — see [region-api.md](./region-api.md#enums--constants). `ACTIVE` (default) | `INACTIVE`.

### `ProductGroupStatus` (on resolved `productGroups[]` only)

| Value      | Meaning                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ACTIVE`   |                                                                                                                                                                          |
| `INACTIVE` | A product group can be `INACTIVE` while still assigned to a branch — the resolver does not filter by status, it returns whatever status the product group currently has. |

### Audit Behavior

All mutating routes carry `@Auditable({ module: AuditModule.SALES_MANAGEMENT_BRANCHES })`. `POST`/`PATCH` return the full updated `Branch` entity (including resolved `productGroups`); `DELETE` returns only `{ message }`.

---

## Branch API

### 1. List Branches (Paginated)

```
GET /sales-management/branches
Permission: sales-branch.view
```

#### Query Parameters

| Param       | Type                       | Default | Notes                                                                                                                                |
| ----------- | -------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `page`      | `number`                   | `1`     | Min 1, Max 100                                                                                                                       |
| `limit`     | `number`                   | `10`    | Min 1, Max 100                                                                                                                       |
| `search`    | `string`                   | —       | Case-insensitive `contains` match on `name` OR `code`                                                                                |
| `status`    | `"ACTIVE"` \| `"INACTIVE"` | —       | Exact match filter                                                                                                                   |
| `cityId`    | `uuid`                     | —       | Restrict the list to branches under one city                                                                                         |
| `sortBy`    | `string`                   | —       | One of `name`, `code`, `status`, `createdAt`, `updatedAt`, `city.name`. Any other value (or omitted) falls back to `name` ascending. |
| `sortOrder` | `"ASC"` \| `"DESC"`        | `DESC`  | Only applied when `sortBy` is whitelisted.                                                                                           |

#### Response `200 OK`

```json
{
  "data": [
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
      "city": {
        "id": "e4d5f6a7-b8c9-0123-def1-234567890123",
        "name": "Lahore",
        "zone": {
          "id": "d3c4e5f6-a7b8-9012-cdef-123456789012",
          "name": "Lahore Zone",
          "region": { "id": "b1a2c3d4-e5f6-7890-abcd-ef1234567890", "name": "Punjab" }
        }
      },
      "distributor": {
        "id": "a6b7c8d9-e0f1-2345-6789-abcdef012345",
        "employeeCode": "EMP-0042",
        "user": {
          "id": "12345678-90ab-cdef-1234-567890abcdef",
          "firstName": "Ali",
          "lastName": "Raza",
          "phone": "+923001234567"
        }
      },
      "_count": { "areas": 1 },
      "productGroups": [
        { "id": "11111111-1111-1111-1111-111111111111", "name": "Beverages", "status": "ACTIVE" }
      ]
    }
  ],
  "meta": {
    "total": 2,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

| Field                   | Type                                                             | Notes                                                                                                                                                                                                                                                               |
| ----------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                    | `uuid`                                                           |                                                                                                                                                                                                                                                                     |
| `code`                  | `string`                                                         | Globally unique                                                                                                                                                                                                                                                     |
| `name`                  | `string`                                                         | Unique within `cityId`                                                                                                                                                                                                                                              |
| `cityId`                | `uuid`                                                           |                                                                                                                                                                                                                                                                     |
| `distributorId`         | `uuid`                                                           | Employee ID                                                                                                                                                                                                                                                         |
| `address`               | `string`                                                         |                                                                                                                                                                                                                                                                     |
| `productGroupIds`       | `uuid[]`                                                         | Raw stored IDs — always present alongside the resolved `productGroups` below                                                                                                                                                                                        |
| `status`                | `TerritoryStatus`                                                |                                                                                                                                                                                                                                                                     |
| `createdAt`/`updatedAt` | `ISO datetime`                                                   |                                                                                                                                                                                                                                                                     |
| `city`                  | `{ id, name, zone: { id, name, region: { id, name } } }`         | Only `id`/`name` selected at each level — full breadcrumb in one field                                                                                                                                                                                              |
| `distributor`           | `{ id, employeeCode, user: { id, firstName, lastName, phone } }` | Narrow `Employee` select — not the full Employee/Contract shape                                                                                                                                                                                                     |
| `_count.areas`          | `number`                                                         | Total areas under this branch                                                                                                                                                                                                                                       |
| `productGroups`         | `{ id, name, status }[]`                                         | **Resolved** product groups (users-map pattern — `productGroupIds` looked up in a single batched query, not a Prisma `include`, since there's no FK relation). Order follows `productGroupIds`, filtered to drop any ID that no longer resolves to a product group. |

---

### 2. Branches Dropdown

```
GET /sales-management/branches/dropdown
Permission: sales-branch.view
```

Returns **all `ACTIVE`** branches (no pagination), ordered by `name` ascending. Pass `cityId` to scope to one city.

#### Query Parameters

| Param    | Type   | Required | Notes                                                |
| -------- | ------ | -------- | ---------------------------------------------------- |
| `cityId` | `uuid` | No       | Omit to return active branches across **all** cities |

#### Response `200 OK`

```json
[
  {
    "id": "f5e6a7b8-c9d0-1234-ef12-345678901234",
    "name": "DHA Branch",
    "cityId": "e4d5f6a7-b8c9-0123-def1-234567890123"
  }
]
```

---

### 3. Get Single Branch

```
GET /sales-management/branches/:branchId
Permission: sales-branch.view
```

#### Path Parameter

| Param      | Type   | Notes                          |
| ---------- | ------ | ------------------------------ |
| `branchId` | `uuid` | Validated with `ParseUUIDPipe` |

#### Response `200 OK`

Same shape as the [list item](#1-list-branches-paginated) — includes `city` (with nested `zone`/`region`), `distributor`, `_count.areas`, and resolved `productGroups`.

#### Response `404 Not Found`

```json
{ "statusCode": 404, "message": "Branch not found", "error": "Not Found" }
```

---

### 4. Get Branch Tree

```
GET /sales-management/branches/:branchId/tree
Permission: sales-branch.view
```

Returns the branch plus its areas — nested, sorted by `name` ascending. This is the **shallowest** tree in the hierarchy (Area is the leaf, so there's only one level to nest).

#### Response `200 OK`

```json
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
```

> **Note**: Unlike [Get Single Branch](#3-get-single-branch), the tree endpoint does **not** resolve `distributor` or `productGroups` — it returns only raw `distributorId`/`productGroupIds`, and does not include `city`/`zone`/`region` either. Use the detail endpoint if the UI needs those resolved.

#### Response `404 Not Found`

```json
{ "statusCode": 404, "message": "Branch not found", "error": "Not Found" }
```

---

### 5. Create Branch

```
POST /sales-management/branches
Permission: sales-branch.manage
Audit: @Auditable({ module: AuditModule.SALES_MANAGEMENT_BRANCHES })
```

#### Request Body

```json
{
  "code": "LHR-DHA-01",
  "name": "DHA Branch",
  "cityId": "e4d5f6a7-b8c9-0123-def1-234567890123",
  "distributorId": "a6b7c8d9-e0f1-2345-6789-abcdef012345",
  "address": "123 Main Blvd, DHA Phase 5, Lahore",
  "productGroupIds": ["11111111-1111-1111-1111-111111111111"],
  "status": "ACTIVE"
}
```

| Field             | Type              | Required | Notes                                                                                                                                                                                                     |
| ----------------- | ----------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code`            | `string`          | Yes      | `@IsString() @IsNotEmpty() @MaxLength(64)`, trimmed. Globally unique.                                                                                                                                     |
| `name`            | `string`          | Yes      | `@IsString() @IsNotEmpty() @MaxLength(128)`, trimmed. Unique within `cityId`.                                                                                                                             |
| `cityId`          | `uuid`            | Yes      | `@IsUUID()`. Must reference an existing city.                                                                                                                                                             |
| `distributorId`   | `uuid`            | Yes      | `@IsUUID()`. Must reference an existing Employee.                                                                                                                                                         |
| `address`         | `string`          | Yes      | `@IsString() @IsNotEmpty()` — no max length enforced.                                                                                                                                                     |
| `productGroupIds` | `uuid[]`          | Yes      | `@IsArray() @ArrayNotEmpty() @IsUUID(undefined, { each: true })` — **at least one** product group is required; cannot be an empty array. Each must not already belong to another branch in the same city. |
| `status`          | `TerritoryStatus` | No       | Defaults to `ACTIVE`.                                                                                                                                                                                     |

#### Response `201 Created`

Same shape as [Get Single Branch](#3-get-single-branch), with `_count.areas: 0`.

#### Validation Errors `400 Bad Request`

```json
{ "message": ["code should not be empty"] }
{ "message": ["productGroupIds should not be empty"] }
{ "message": ["each value in productGroupIds must be a UUID"] }
```

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "City not found", "error": "Not Found" }
```

```json
{ "statusCode": 404, "message": "Employee not found", "error": "Not Found" }
```

#### Conflict Errors `409 Conflict`

```json
{ "message": "A branch with this code or name already exists" }
```

```json
{
  "message": "One or more product groups are already assigned to branch \"DHA Branch\" in this city"
}
```

---

### 6. Update Branch

```
PATCH /sales-management/branches/:branchId
Permission: sales-branch.manage
Audit: @Auditable({ module: AuditModule.SALES_MANAGEMENT_BRANCHES })
```

All fields optional. Notes on partial updates:

- Sending `cityId` re-parents the branch to a different city.
- Sending `distributorId` re-validates the new employee exists.
- Sending `productGroupIds` re-runs the per-city exclusivity check against **the new `cityId` if also provided, otherwise the branch's current city** — and excludes the branch itself from the conflict search (so re-saving a branch with the same product groups it already holds does not falsely conflict with itself).
- Omitting `productGroupIds` entirely leaves the existing assignment untouched (unlike create, it is not required on update — `UpdateBranchDto` makes it optional via `PartialType`, though if provided it must still be non-empty per `CreateBranchDto`'s validators).

#### Request Body

```json
{
  "productGroupIds": [
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222"
  ]
}
```

#### Response `200 OK`

Full updated branch (same shape as [Get Single Branch](#3-get-single-branch)).

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Branch not found", "error": "Not Found" }
```

(also `"City not found"` / `"Employee not found"` if an invalid `cityId`/`distributorId` is supplied)

#### Conflict Errors `409 Conflict`

Same two shapes as create — duplicate `code`/`name`, or product-group exclusivity violation.

---

### 7. Delete Branch

```
DELETE /sales-management/branches/:branchId
Permission: sales-branch.manage
Audit: @Auditable({ module: AuditModule.SALES_MANAGEMENT_BRANCHES })
```

**Business Rules (checked in this order):**

1. Branch must exist, or `404 Not Found`.
2. If any `Area.branchId` references this branch → `400 Bad Request`.
3. Otherwise, hard-deleted.

#### Response `200 OK`

```json
{ "message": "Branch deleted successfully" }
```

#### Validation Error `400 Bad Request`

```json
{ "message": "Cannot delete a branch that has areas assigned to it" }
```

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Branch not found", "error": "Not Found" }
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
{ "statusCode": 404, "message": "Branch not found", "error": "Not Found" }
```

Also returned as `"City not found"` or `"Employee not found"` when create/update references an unknown `cityId`/`distributorId`.

### 409 Conflict

Duplicate `code`/`name`:

```json
{
  "statusCode": 409,
  "message": "A branch with this code or name already exists",
  "error": "Conflict"
}
```

Product-group exclusivity violation:

```json
{
  "statusCode": 409,
  "message": "One or more product groups are already assigned to branch \"...\" in this city",
  "error": "Conflict"
}
```

---

## Frontend Implementation Notes

### Screen Flows

**Branch List Screen**

- `GET /sales-management/branches` with pagination + `search` (name or code) + `status` + `cityId` filter.
- Sortable columns: `name`, `code`, `status`, `createdAt`, `updatedAt`, `city.name`.
- Each row's `city` field already carries the full Region/Zone/City breadcrumb — no extra requests needed to render it.
- Show `distributor.user.firstName + lastName` and a chip list from `productGroups[].name` directly from the list response.

**Create / Edit Branch Screen**

- City picker: `GET /sales-management/cities/dropdown` (optionally filtered by zone/region upstream).
- Distributor picker: use the HR Employee list/dropdown (see `hr/employee-api.md`) — this module does not expose its own employee dropdown.
- Product Group picker: multi-select against the ProductGroup list (see `products-api.md` / product-group endpoints) — **at least one must be selected**, and the backend will reject the save with a named-branch `409` if a selected group is already taken in that city. Surface that message directly; there's no separate "check availability" endpoint to pre-validate before submit.
- `POST /sales-management/branches` to create; `PATCH /sales-management/branches/:id` to edit.
- Re-parenting via `cityId` moves the branch's areas along with it — warn the user.

**Delete Action**

- `DELETE /sales-management/branches/:id` — only allow when `_count.areas === 0`.

**Branch Detail Screen**

- `GET /sales-management/branches/:id` gives everything needed in one call: full location breadcrumb (`city.zone.region`), distributor contact info, and resolved product group chips — no additional requests required for a read-only detail view.

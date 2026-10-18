# Product Group Module — Frontend API Reference

> **Purpose**: Complete API reference for the Product Group module — a flat lookup entity assigned to `Product.productGroupId`, and separately referenced by `Branch.productGroupIds[]` in the territory hierarchy (see [branch-api.md](./branch-api.md)). See [products-api.md](./products-api.md) for the Product-side usage.
> **Audience**: Frontend developers building the Product Group list/create/edit screens and the group picker used on both the Product form and the Branch form.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. **All response examples in this document show the inner `data` payload only.**

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Product Group API](#product-group-api)
   - [List Product Groups (paginated)](#1-list-product-groups-paginated)
   - [Product Groups Dropdown](#2-product-groups-dropdown)
   - [Get Single Product Group](#3-get-single-product-group)
   - [Create Product Group](#4-create-product-group)
   - [Update Product Group](#5-update-product-group)
   - [Delete Product Group](#6-delete-product-group)
5. [Error Responses](#error-responses)
6. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

`ProductGroup` (`product_groups` table) is a flat, non-hierarchical lookup entity — it has no parent and no children. It is referenced two different ways in the system:

- **`Product.productGroupId`** (nullable, `onDelete: Restrict`) — a single group a product belongs to. This module's own delete guard only checks this relation.
- **`Branch.productGroupIds`** (a plain `String[]` on `Branch`, **not** a Prisma relation) — the set of product groups a distributor branch stocks. Deleting a product group here does **not** check or clean up any branch's `productGroupIds` array — that's a data-integrity gap the frontend should be aware of (see [branch-api.md](./branch-api.md)).

| Sub-module | Base Path | Description |
| ---------- | --------- | ------------ |
| Product Groups | `/product-management/product-groups` | CRUD for product groups |

### Product Group Rules

- `name` is **globally unique** (`@unique` on the model, not scoped to anything).
- A product group **cannot be deleted** while any non-deleted `Product` references it via `productGroupId` — see [Delete Product Group](#6-delete-product-group). This check does **not** consider `Branch.productGroupIds` references.
- `productGroupId` is optional on a `Product` — a product does not need a group.

---

## Permissions

| Permission Key | What it guards |
| --------------- | ---------------- |
| `product-group.view` | List product groups, dropdown, view a single product group |
| `product-group.manage` | Create, update, and delete product groups |

---

## Enums & Constants

### `ProductGroupStatus`

`ACTIVE` (default) | `INACTIVE`.

### Audit Behavior

`POST`/`PATCH`/`DELETE` all carry `@Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_PRODUCT_GROUPS })`. `POST`/`PATCH` return the full updated `ProductGroup` entity; `DELETE` returns only `{ message }`.

---

## Product Group API

### 1. List Product Groups (Paginated)

```
GET /product-management/product-groups
Permission: product-group.view
```

#### Query Parameters

| Param | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| `page` | `number` | `1` | Min 1, Max 100 |
| `limit` | `number` | `10` | Min 1, Max 100 |
| `search` | `string` | — | Case-insensitive `contains` match on `name` only |
| `status` | `"ACTIVE"` \| `"INACTIVE"` | — | Exact match filter |
| `sortBy` | `string` | — | One of `name`, `status`, `createdAt`, `updatedAt`. Any other value (or omitted) falls back to `name` ascending. |
| `sortOrder` | `"ASC"` \| `"DESC"` | `DESC` | Only applied when `sortBy` is whitelisted. |

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "6f5e4d3c-2b1a-4f3e-8d7c-6b5a4938271f",
      "name": "Household Glassware",
      "status": "ACTIVE",
      "createdAt": "2026-07-01T10:00:00.000Z",
      "updatedAt": "2026-07-01T10:00:00.000Z"
    }
  ],
  "meta": { "total": 4, "page": 1, "limit": 10, "totalPages": 1, "hasNext": false, "hasPrev": false }
}
```

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `uuid` | |
| `name` | `string` | Globally unique |
| `status` | `ProductGroupStatus` | |
| `createdAt`/`updatedAt` | `ISO datetime` | |

> There is no `_count` of related products in the list/detail response — to check whether a group is in use, rely on the `400` returned by [Delete Product Group](#6-delete-product-group).

---

### 2. Product Groups Dropdown

```
GET /product-management/product-groups/dropdown
Permission: product-group.view
```

Returns **all `ACTIVE`** product groups (no pagination), ordered by `name` ascending. This is the same endpoint the Branch create/edit screen should use to populate its multi-select `productGroupIds` field.

#### Response `200 OK`

```json
[
  { "id": "6f5e4d3c-2b1a-4f3e-8d7c-6b5a4938271f", "name": "Household Glassware" }
]
```

---

### 3. Get Single Product Group

```
GET /product-management/product-groups/:productGroupId
Permission: product-group.view
```

#### Path Parameter

| Param | Type | Notes |
| ----- | ---- | ----- |
| `productGroupId` | `uuid` | Validated with `ParseUUIDPipe` |

#### Response `200 OK`

Same shape as the [list item](#1-list-product-groups-paginated).

#### Response `404 Not Found`

```json
{ "statusCode": 404, "message": "Product group not found", "error": "Not Found" }
```

---

### 4. Create Product Group

```
POST /product-management/product-groups
Permission: product-group.manage
Audit: @Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_PRODUCT_GROUPS })
```

#### Request Body

```json
{
  "name": "Household Glassware",
  "status": "ACTIVE"
}
```

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `name` | `string` | Yes | `@IsString() @IsNotEmpty() @MaxLength(128)`, trimmed. Globally unique. |
| `status` | `ProductGroupStatus` | No | Defaults to `ACTIVE`. |

#### Response `201 Created`

Same shape as [Get Single Product Group](#3-get-single-product-group).

#### Validation Errors `400 Bad Request`

```json
{ "message": ["name should not be empty"] }
```

#### Conflict Error `409 Conflict`

```json
{ "message": "A product group with this name already exists" }
```

---

### 5. Update Product Group

```
PATCH /product-management/product-groups/:productGroupId
Permission: product-group.manage
Audit: @Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_PRODUCT_GROUPS })
```

All fields optional.

#### Request Body

```json
{ "name": "Household & Commercial Glassware" }
```

#### Response `200 OK`

Full updated product group (same shape as [Get Single Product Group](#3-get-single-product-group)).

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Product group not found", "error": "Not Found" }
```

#### Conflict Error `409 Conflict`

```json
{ "message": "A product group with this name already exists" }
```

---

### 6. Delete Product Group

```
DELETE /product-management/product-groups/:productGroupId
Permission: product-group.manage
Audit: @Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_PRODUCT_GROUPS })
```

**Business Rules (checked in this order):**

1. Product group must exist, or `404 Not Found`.
2. If any non-deleted `Product.productGroupId` references this group → `400 Bad Request`.
3. Otherwise, hard-deleted. **Note**: this does not check `Branch.productGroupIds` — a branch can end up with a dangling ID in that array after a group is deleted. There is currently no backend guard against this; if the frontend resolves `productGroupIds` to names for display, handle an unresolved ID gracefully (e.g. skip it) rather than assuming it always exists.

#### Response `200 OK`

```json
{ "message": "Product group deleted successfully" }
```

#### Validation Error `400 Bad Request`

```json
{ "message": "Cannot delete product group \"Household Glassware\" — it is assigned to one or more products" }
```

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Product group not found", "error": "Not Found" }
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
{ "statusCode": 404, "message": "Product group not found", "error": "Not Found" }
```

### 409 Conflict (duplicate name)

```json
{ "statusCode": 409, "message": "A product group with this name already exists", "error": "Conflict" }
```

---

## Frontend Implementation Notes

### Screen Flows

**Product Group List Screen**

- `GET /product-management/product-groups` with pagination + `search` (name only) + `status` filter.
- Sortable columns: `name`, `status`, `createdAt`, `updatedAt`.

**Create / Edit Product Group Screen**

- Single `name` field + `status` toggle — no parent picker needed (flat entity).
- `POST /product-management/product-groups` to create; `PATCH /product-management/product-groups/:id` to edit.
- Surface `409` inline on `name`.

**Delete Action**

- `DELETE /product-management/product-groups/:id` — the API blocks deletion only when a `Product` references the group; it does **not** check branch stocking assignments (`Branch.productGroupIds`), so warn less confidently here than on Brand/Category deletes, or cross-check branches client-side if that matters for your flow.

**Product Form Integration**

- Populate the group picker from `GET /product-management/product-groups/dropdown`.
- `productGroupId` on the Product form is optional — allow clearing it.

**Branch Form Integration**

- The same dropdown backs the Branch form's `productGroupIds` multi-select (see [branch-api.md](./branch-api.md)) — reuse one cached fetch for both forms rather than calling it twice per page.

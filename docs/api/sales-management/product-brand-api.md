# Product Brand Module — Frontend API Reference

> **Purpose**: Complete API reference for the Product Brand module — a flat lookup entity assigned to `Product.brandId`. See [products-api.md](./products-api.md) for how it's consumed.
> **Audience**: Frontend developers building the Brand list/create/edit screens and the brand picker used on the Product form.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. **All response examples in this document show the inner `data` payload only.**

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Brand API](#brand-api)
   - [List Brands (paginated)](#1-list-brands-paginated)
   - [Brands Dropdown](#2-brands-dropdown)
   - [Get Single Brand](#3-get-single-brand)
   - [Create Brand](#4-create-brand)
   - [Update Brand](#5-update-brand)
   - [Delete Brand](#6-delete-brand)
5. [Error Responses](#error-responses)
6. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

`ProductBrand` (`product_brands` table) is a flat, non-hierarchical lookup entity — it has no parent and no children. It is referenced by `Product.brandId` (nullable, `onDelete: Restrict`).

| Sub-module | Base Path | Description |
| ---------- | --------- | ------------ |
| Brands | `/product-management/brands` | CRUD for product brands |

### Brand Rules

- `name` is **globally unique** (`@unique` on the model, not scoped to anything).
- A brand **cannot be deleted** while any non-deleted `Product` references it via `brandId` — see [Delete Brand](#6-delete-brand).
- `brandId` is optional on a `Product` — a product does not need a brand.

---

## Permissions

| Permission Key | What it guards |
| --------------- | ---------------- |
| `product-brand.view` | List brands, brands dropdown, view a single brand |
| `product-brand.manage` | Create, update, and delete brands |

---

## Enums & Constants

### `ProductBrandStatus`

`ACTIVE` (default) | `INACTIVE`.

### Audit Behavior

`POST`/`PATCH`/`DELETE` all carry `@Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_BRANDS })`. `POST`/`PATCH` return the full updated `ProductBrand` entity; `DELETE` returns only `{ message }`.

---

## Brand API

### 1. List Brands (Paginated)

```
GET /product-management/brands
Permission: product-brand.view
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
      "id": "b1a2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Duralex",
      "status": "ACTIVE",
      "createdAt": "2026-07-01T10:00:00.000Z",
      "updatedAt": "2026-07-01T10:00:00.000Z"
    }
  ],
  "meta": { "total": 3, "page": 1, "limit": 10, "totalPages": 1, "hasNext": false, "hasPrev": false }
}
```

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `uuid` | |
| `name` | `string` | Globally unique |
| `status` | `ProductBrandStatus` | |
| `createdAt`/`updatedAt` | `ISO datetime` | |

> There is no `_count` of related products in the list/detail response — to check whether a brand is in use, rely on the `400` returned by [Delete Brand](#6-delete-brand).

---

### 2. Brands Dropdown

```
GET /product-management/brands/dropdown
Permission: product-brand.view
```

Returns **all `ACTIVE`** brands (no pagination), ordered by `name` ascending.

#### Response `200 OK`

```json
[
  { "id": "b1a2c3d4-e5f6-7890-abcd-ef1234567890", "name": "Duralex" }
]
```

---

### 3. Get Single Brand

```
GET /product-management/brands/:productBrandId
Permission: product-brand.view
```

#### Path Parameter

| Param | Type | Notes |
| ----- | ---- | ----- |
| `productBrandId` | `uuid` | Validated with `ParseUUIDPipe` |

#### Response `200 OK`

Same shape as the [list item](#1-list-brands-paginated).

#### Response `404 Not Found`

```json
{ "statusCode": 404, "message": "Product brand not found", "error": "Not Found" }
```

---

### 4. Create Brand

```
POST /product-management/brands
Permission: product-brand.manage
Audit: @Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_BRANDS })
```

#### Request Body

```json
{
  "name": "Duralex",
  "status": "ACTIVE"
}
```

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `name` | `string` | Yes | `@IsString() @IsNotEmpty() @MaxLength(128)`, trimmed. Globally unique. |
| `status` | `ProductBrandStatus` | No | Defaults to `ACTIVE`. |

#### Response `201 Created`

Same shape as [Get Single Brand](#3-get-single-brand).

#### Validation Errors `400 Bad Request`

```json
{ "message": ["name should not be empty"] }
```

#### Conflict Error `409 Conflict`

```json
{ "message": "A product brand with this name already exists" }
```

---

### 5. Update Brand

```
PATCH /product-management/brands/:productBrandId
Permission: product-brand.manage
Audit: @Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_BRANDS })
```

All fields optional.

#### Request Body

```json
{ "name": "Duralex International" }
```

#### Response `200 OK`

Full updated brand (same shape as [Get Single Brand](#3-get-single-brand)).

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Product brand not found", "error": "Not Found" }
```

#### Conflict Error `409 Conflict`

```json
{ "message": "A product brand with this name already exists" }
```

---

### 6. Delete Brand

```
DELETE /product-management/brands/:productBrandId
Permission: product-brand.manage
Audit: @Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_BRANDS })
```

**Business Rules (checked in this order):**

1. Brand must exist, or `404 Not Found`.
2. If any non-deleted `Product.brandId` references this brand → `400 Bad Request`.
3. Otherwise, hard-deleted.

#### Response `200 OK`

```json
{ "message": "Product brand deleted successfully" }
```

#### Validation Error `400 Bad Request`

```json
{ "message": "Cannot delete product brand \"Duralex\" — it is assigned to one or more products" }
```

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Product brand not found", "error": "Not Found" }
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
{ "statusCode": 404, "message": "Product brand not found", "error": "Not Found" }
```

### 409 Conflict (duplicate name)

```json
{ "statusCode": 409, "message": "A product brand with this name already exists", "error": "Conflict" }
```

---

## Frontend Implementation Notes

### Screen Flows

**Brand List Screen**

- `GET /product-management/brands` with pagination + `search` (name only) + `status` filter.
- Sortable columns: `name`, `status`, `createdAt`, `updatedAt`.

**Create / Edit Brand Screen**

- Single `name` field + `status` toggle — no parent picker needed (flat entity).
- `POST /product-management/brands` to create; `PATCH /product-management/brands/:id` to edit.
- Surface `409` inline on `name`.

**Delete Action**

- `DELETE /product-management/brands/:id` — the API itself blocks deletion when products reference the brand; there's no `_count` to pre-check client-side, so just attempt the delete and surface the `400` message if it comes back.

**Product Form Integration**

- Populate the brand picker from `GET /product-management/brands/dropdown`.
- `brandId` on the Product form is optional — allow clearing it.

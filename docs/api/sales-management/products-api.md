# Products Module — Frontend API Reference

> **Status**: Module consolidated and moved — existing screen needs changes. Supersedes the older [`../products-api.md`](../products-api.md), which documents the **pre-consolidation** module and is now stale (wrong base path, missing brand/category/product-group fields).
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. **All response examples in this document show the inner `data` payload only.**

---

## What Changed (Frontend Action Required)

| Area | Change | Frontend Impact |
|---|---|---|
| **Base path** | Moved from `/products` to `/product-management/products` | Update every API call — this is a breaking route change, not additive |
| **`brandId`** | New optional field, `→` [product-brand-api.md](./product-brand-api.md) | Add brand picker to product form (populate from brand dropdown) |
| **`categoryId`** | New optional field, `→` [product-category-api.md](./product-category-api.md) | Add category picker to product form |
| **`productGroupId`** | New optional field, `→` [product-group-api.md](./product-group-api.md) | Add product group picker to product form |
| **List/detail response** | Now includes resolved `uom`, `category`, `brand`, `productGroup` objects (`{ id, name }` shape, `uom` also has `symbol`) and `attributes[]` | Render these directly — no extra lookup calls needed for these four |
| **`createdById`/`updatedById`** | Present as raw UUID strings only — **not** resolved to user objects | Do not expect a `createdBy`/`updatedBy` object; resolve separately if you need the name |
| **Bulk endpoints** | `BulkCreateProductDto` / `BulkUpdateProductDto` / `BulkDeleteProductDto` exist in the codebase but are **not wired to any controller route** | Do not build against bulk create/update/delete yet — there is no endpoint to call |
| **`sortBy` validation** | Unlike Brand/Category/Product Group, this module does **not** whitelist `sortBy` — it's passed straight into the Prisma `orderBy` | An unrecognized/mistyped `sortBy` (e.g. a relation field without dot notation) can throw a `500`, not a clean `400`. Stick to known scalar columns: `name`, `code`, `sellingPrice`, `currentStock`, `createdAt`. |

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Products API](#products-api)
   - [List Products (paginated)](#1-list-products-paginated)
   - [Products Dropdown](#2-products-dropdown)
   - [Get Single Product](#3-get-single-product)
   - [Create Product](#4-create-product)
   - [Update Product](#5-update-product)
   - [Delete Product](#6-delete-product)
   - [Toggle Active](#7-toggle-active)
5. [Error Responses](#error-responses)
6. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

`Product` optionally belongs to a `ProductCategory` (`categoryId`), a `ProductBrand` (`brandId`), and a `ProductGroup` (`productGroupId`) — all three are separate flat lookup modules, each documented in its own file ([product-brand-api.md](./product-brand-api.md), [product-category-api.md](./product-category-api.md), [product-group-api.md](./product-group-api.md)). It also has a required `UOM` (`uomId`, unit of measure — not covered in this doc).

| Sub-module | Base Path | Description |
| ---------- | --------- | ------------ |
| Products | `/product-management/products` | CRUD for products, including nested `attributes`, stock thresholds, and soft delete |

### Product Rules

- `code` is unique among non-deleted products. `barcode` is optional but also unique among non-deleted products when provided.
- Soft delete: `remove()` sets `deletedAt` (and `isActive: false`) rather than removing the row. Every read query (`findAll`, `findById`, `dropdown`) filters `deletedAt: null` — a deleted product is invisible everywhere except direct DB access.
- A product **cannot be deleted** while referenced by any non-deleted `BOM` (Bill of Materials) — see [Delete Product](#6-delete-product).
- A product **cannot be deactivated** (`isActive: true → false` via toggle) while referenced by a `BOM`, a `ProductionOrder`, or a `SaleItem` — see [Toggle Active](#7-toggle-active). Reactivating (`false → true`) has no such restriction.
- `minStock` cannot exceed `maxStock` when both are provided (either can be `null`/omitted to skip the check). On update, the check runs against the **effective** values — an omitted field keeps the existing value, so partial updates are validated against the full post-update state, not just the fields you sent.
- `reorderLevel` is required and must be `>= 1`. `sellingPrice`, when provided, must be `> 0` (rejects `0`).
- `minStock`/`maxStock`/`sellingPrice` accept explicit `null` to clear a previously-set value — this is intentional so the frontend can distinguish "cleared" from "unset/0".
- Creating/updating validates `uomId` (required), and `categoryId`/`brandId`/`productGroupId` (each optional) all exist — an unknown ID on any of them returns `404 Not Found` with a field-specific message.
- `attributes` (key/value/unit rows) are fully replaced on update — sending `attributes` triggers `deleteMany` + recreate, not a merge. Omit the field entirely to leave existing attributes untouched.

---

## Permissions

| Permission Key | What it guards |
| --------------- | ---------------- |
| `products.read` | List products, dropdown, view a single product |
| `products.create` | Create a product |
| `products.update` | Update a product, toggle active status |
| `products.delete` | Soft-delete a product |
| `products.bulk_import` | Defined in the permission table but **not currently enforced by any route** — no bulk endpoint exists yet |

---

## Enums & Constants

### `ProductType`

```
FINISHED_GOOD   — End product ready for sale
SEMI_FINISHED   — Work-in-progress / intermediate product
CONSUMABLE      — Supplies consumed in production (not sold)
SERVICE         — Service line item
```

Defaults to `FINISHED_GOOD` when omitted on create.

### Audit Behavior

`POST`/`PATCH`/`DELETE`/toggle-active all carry `@Auditable({ module: AuditModule.PRODUCTS })`. `POST`/`PATCH`/toggle-active return the full updated `Product` entity; `DELETE` returns only `{ message }`.

---

## Products API

### 1. List Products (Paginated)

```
GET /product-management/products
Permission: products.read
```

#### Query Parameters

| Param | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| `page` | `number` | `1` | Min 1, Max 100 |
| `limit` | `number` | `10` | Min 1, Max 100 |
| `search` | `string` | — | Case-insensitive `contains` match on `name`, `code`, `description`, `barcode` |
| `type` | `ProductType` | — | Exact match filter |
| `isActive` | `boolean` | — | Exact match filter. Accepts `true`/`false` (string or boolean) |
| `sortBy` | `string` | `createdAt` | **Not whitelisted** — passed straight to Prisma. Use a known scalar column (see [What Changed](#what-changed-frontend-action-required)). |
| `sortOrder` | `"ASC"` \| `"DESC"` | `DESC` | |

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
      "name": "Blue Glass 500ml",
      "code": "BG-500-BLU",
      "barcode": "8901234567890",
      "description": "Borosilicate blue glass, 500ml capacity",
      "type": "FINISHED_GOOD",
      "uomId": "e908e33f-f23a-438f-916d-eded9e8af091",
      "categoryId": "9e56e8c1-2b1a-4b3a-9c1a-1f2b3c4d5e6f",
      "brandId": "b1a2c3d4-e5f6-7890-abcd-ef1234567890",
      "productGroupId": "6f5e4d3c-2b1a-4f3e-8d7c-6b5a4938271f",
      "currentStock": 120,
      "reservedStock": 0,
      "totalRejectedQuantity": 0,
      "minStock": 10,
      "maxStock": 500,
      "reorderLevel": 20,
      "sellingPrice": 250.0,
      "costPrice": 180.0,
      "images": ["https://cdn.example.com/blue-glass.jpg"],
      "isActive": true,
      "createdById": "11111111-1111-1111-1111-111111111111",
      "updatedById": null,
      "createdAt": "2026-07-01T10:00:00.000Z",
      "updatedAt": "2026-07-01T10:00:00.000Z",
      "uom": { "id": "e908e33f-f23a-438f-916d-eded9e8af091", "name": "Piece", "symbol": "pc" },
      "category": { "id": "9e56e8c1-2b1a-4b3a-9c1a-1f2b3c4d5e6f", "name": "Glassware" },
      "brand": { "id": "b1a2c3d4-e5f6-7890-abcd-ef1234567890", "name": "Duralex" },
      "productGroup": { "id": "6f5e4d3c-2b1a-4f3e-8d7c-6b5a4938271f", "name": "Household Glassware" },
      "attributes": [
        { "id": "aa1a1a1a-1a1a-1a1a-1a1a-1a1a1a1a1a1a", "name": "Color", "value": "Blue", "unit": null },
        { "id": "bb2b2b2b-2b2b-2b2b-2b2b-2b2b2b2b2b2b", "name": "Capacity", "value": "500", "unit": "ml" }
      ]
    }
  ],
  "meta": { "total": 42, "page": 1, "limit": 10, "totalPages": 5, "hasNext": true, "hasPrev": false }
}
```

| Field | Type | Notes |
| ----- | ---- | ----- |
| `category`/`brand`/`productGroup` | `{ id, name } \| null` | `null` when the corresponding `*Id` is not set — not omitted from the payload |
| `uom` | `{ id, name, symbol }` | Always present — `uomId` is required |
| `createdById`/`updatedById` | `uuid \| null` | **Raw IDs only** — not resolved to a user object (no users-map pattern applied here yet) |
| `attributes` | array, sorted by `name` ascending | |
| `currentStock`/`reservedStock`/`totalRejectedQuantity`/`minStock`/`maxStock`/`sellingPrice`/`costPrice` | `number \| null` | Prisma `Decimal`/`Float` columns, auto-converted to JS numbers by the response interceptor |

---

### 2. Products Dropdown

```
GET /product-management/products/dropdown
Permission: products.read
```

Returns **all `isActive: true`, non-deleted** products (no pagination), ordered by `name` ascending. Unlike the flat lookup modules, this returns more than just `{ id, name }`.

#### Response `200 OK`

```json
[
  {
    "id": "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
    "name": "Blue Glass 500ml",
    "code": "BG-500-BLU",
    "type": "FINISHED_GOOD",
    "currentStock": 120,
    "sellingPrice": 250.0,
    "uom": { "id": "e908e33f-f23a-438f-916d-eded9e8af091", "name": "Piece", "symbol": "pc" }
  }
]
```

---

### 3. Get Single Product

```
GET /product-management/products/:productId
Permission: products.read
```

#### Path Parameter

| Param | Type | Notes |
| ----- | ---- | ----- |
| `productId` | `uuid` | Validated with `ParseUUIDPipe` |

#### Response `200 OK`

Same shape as the [list item](#1-list-products-paginated).

#### Response `404 Not Found`

```json
{ "statusCode": 404, "message": "Product \"3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f\" not found", "error": "Not Found" }
```

---

### 4. Create Product

```
POST /product-management/products
Permission: products.create
Audit: @Auditable({ module: AuditModule.PRODUCTS })
```

#### Request Body

```json
{
  "name": "Blue Glass 500ml",
  "code": "BG-500-BLU",
  "barcode": "8901234567890",
  "description": "Borosilicate blue glass, 500ml capacity",
  "type": "FINISHED_GOOD",
  "uomId": "e908e33f-f23a-438f-916d-eded9e8af091",
  "categoryId": "9e56e8c1-2b1a-4b3a-9c1a-1f2b3c4d5e6f",
  "brandId": "b1a2c3d4-e5f6-7890-abcd-ef1234567890",
  "productGroupId": "6f5e4d3c-2b1a-4f3e-8d7c-6b5a4938271f",
  "currentStock": 0,
  "minStock": 10,
  "maxStock": 500,
  "reorderLevel": 20,
  "sellingPrice": 250.0,
  "images": ["https://cdn.example.com/blue-glass.jpg"],
  "isActive": true,
  "attributes": [
    { "name": "Color", "value": "Blue" },
    { "name": "Capacity", "value": "500", "unit": "ml" }
  ]
}
```

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `name` | `string` | Yes | Trimmed |
| `code` | `string` | Yes | Trimmed. Unique among non-deleted products |
| `barcode` | `string` | No | Unique among non-deleted products when provided |
| `description` | `string` | No | |
| `type` | `ProductType` | No | Defaults to `FINISHED_GOOD` |
| `uomId` | `string` | Yes | Must reference an existing UOM |
| `categoryId` | `string` | No | Must reference an existing `ProductCategory` if provided |
| `brandId` | `string` | No | Must reference an existing `ProductBrand` if provided |
| `productGroupId` | `string` | No | Must reference an existing `ProductGroup` if provided |
| `currentStock` | `number` | No | `>= 0`, default `0` |
| `minStock` | `number \| null` | No | `>= 0` if not `null` |
| `maxStock` | `number \| null` | No | `>= 0` if not `null`; must be `>= minStock` |
| `reorderLevel` | `number` | Yes | `>= 1` |
| `sellingPrice` | `number \| null` | No | `> 0` if not `null` (0 is rejected) |
| `images` | `string[]` | No | Each entry must be a valid URL |
| `isActive` | `boolean` | No | Default `true` |
| `attributes` | `{ name, value, unit? }[]` | No | Free-form key/value rows |

#### Response `201 Created`

Same shape as [Get Single Product](#3-get-single-product).

#### Validation Errors `400 Bad Request`

```json
{ "message": ["Name is required"] }
{ "message": ["Reorder level must be greater than 0"] }
{ "message": "Min stock cannot be greater than max stock" }
```

#### Not Found `404 Not Found` (unknown reference)

```json
{ "statusCode": 404, "message": "UOM with ID: 'e908e33f-f23a-438f-916d-eded9e8af091' not found", "error": "Not Found" }
```

Same pattern for `Product category with ID: '...' not found`, `Product brand with ID: '...' not found`, `Product group with ID: '...' not found`.

#### Conflict Errors `409 Conflict`

```json
{ "message": "A product with code \"BG-500-BLU\" already exists" }
{ "message": "A product with barcode \"8901234567890\" already exists" }
```

---

### 5. Update Product

```
PATCH /product-management/products/:productId
Permission: products.update
Audit: @Auditable({ module: AuditModule.PRODUCTS })
```

All fields optional. Sending `attributes` replaces the entire set (delete + recreate) — omit it to leave existing attributes as-is.

#### Request Body

```json
{ "sellingPrice": 275.0, "brandId": "b1a2c3d4-e5f6-7890-abcd-ef1234567890" }
```

#### Response `200 OK`

Full updated product (same shape as [Get Single Product](#3-get-single-product)).

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Product with ID: \"3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f\" not found", "error": "Not Found" }
```

Same reference-not-found messages as create apply for `uomId`/`categoryId`/`brandId`/`productGroupId`.

#### Conflict Errors `409 Conflict`

Same as create, for `code`/`barcode` collisions with a **different** product.

---

### 6. Delete Product

```
DELETE /product-management/products/:productId
Permission: products.delete
Audit: @Auditable({ module: AuditModule.PRODUCTS })
```

Soft delete — sets `deletedAt` + `isActive: false`, does not remove the row.

**Business Rules (checked in this order):**

1. Product must exist (and not already deleted), or `404 Not Found`.
2. If any non-deleted `BOM` references this product → `400 Bad Request`.
3. Otherwise, soft-deleted.

#### Response `200 OK`

```json
{ "message": "Product deleted successfully" }
```

#### Validation Error `400 Bad Request`

```json
{ "message": "Cannot delete product \"Blue Glass 500ml\" — it is referenced by one or more Bills of Materials" }
```

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Product with ID: \"3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f\" not found", "error": "Not Found" }
```

---

### 7. Toggle Active

```
PATCH /product-management/products/:productId/toggle-active
Permission: products.update
Audit: @Auditable({ module: AuditModule.PRODUCTS })
```

Flips `isActive`. Deactivation (`true → false`) is blocked if the product is referenced by a `BOM`, a `ProductionOrder`, or a `SaleItem`. Reactivation (`false → true`) is always allowed.

#### Response `200 OK`

Full updated product (same shape as [Get Single Product](#3-get-single-product)) with `isActive` flipped.

#### Validation Error `400 Bad Request` (deactivating a linked product)

```json
{ "message": "Cannot deactivate a product linked to BOM / Production Orders / Sales." }
```

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Product \"3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f\" not found", "error": "Not Found" }
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
{ "statusCode": 404, "message": "Product ... not found", "error": "Not Found" }
```

Also returned (with a field-specific message) when create/update references an unknown `uomId`/`categoryId`/`brandId`/`productGroupId`.

### 409 Conflict (duplicate `code` or `barcode`)

```json
{ "statusCode": 409, "message": "A product with code \"...\" already exists", "error": "Conflict" }
```

---

## Frontend Implementation Notes

### Screen Flows

**Product List Screen**

- `GET /product-management/products` with pagination + `search` (name/code/description/barcode) + `type` + `isActive` filters.
- Only sort by known scalar columns (`name`, `code`, `sellingPrice`, `currentStock`, `createdAt`) — there is no server-side whitelist here unlike the other four modules in this folder, so an unexpected `sortBy` can 500 instead of silently falling back.
- `category`/`brand`/`productGroup` are already resolved `{ id, name }` objects on each row — no extra lookups needed to show them in list columns.

**Create / Edit Product Screen**

- Populate category/brand/product-group pickers from their respective `/dropdown` endpoints ([product-category-api.md](./product-category-api.md), [product-brand-api.md](./product-brand-api.md), [product-group-api.md](./product-group-api.md)) — all three are optional on the form.
- To clear a previously-set `minStock`/`maxStock`/`sellingPrice`, send explicit `null`, not `0` and not an omitted field — omitting a field leaves it unchanged on `PATCH`.
- Sending `attributes` on update replaces the whole list — if you only want to edit one attribute row, resend the complete array with that one row changed, not just the delta.
- Surface `409` inline on `code`/`barcode`; surface `404` reference errors ("UOM/category/brand/product group not found") as a stale-picker error.

**Delete vs. Deactivate**

- `DELETE` is a soft delete blocked only by BOM references — appropriate for "this product should stop existing."
- Toggle-active is the right action for "temporarily stop selling/producing this" — it has a wider block list (BOM, Production Orders, **and** Sales), so a product can be un-deletable-safe but still un-deactivatable-safe, or vice versa. Don't conflate the two actions' error messages in the UI.

**Bulk Operations**

- Do not build bulk import/update/delete UI against this API yet — the DTOs (`BulkCreateProductDto`, `BulkUpdateProductDto`, `BulkDeleteProductDto`) exist in the backend but have no controller route wired up. Confirm with backend before scoping bulk-related frontend work.

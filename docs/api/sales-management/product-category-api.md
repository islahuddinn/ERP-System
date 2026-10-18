# Product Category Module — Frontend API Reference

> **Purpose**: Complete API reference for the Product Category module — a flat lookup entity assigned to `Product.categoryId`. See [products-api.md](./products-api.md) for how it's consumed.
> **Audience**: Frontend developers building the Category list/create/edit screens and the category picker used on the Product form.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. **All response examples in this document show the inner `data` payload only.**

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Category API](#category-api)
   - [List Categories (paginated)](#1-list-categories-paginated)
   - [Categories Dropdown](#2-categories-dropdown)
   - [Get Single Category](#3-get-single-category)
   - [Create Category](#4-create-category)
   - [Update Category](#5-update-category)
   - [Delete Category](#6-delete-category)
5. [Error Responses](#error-responses)
6. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

`ProductCategory` (`product_categories` table) is a flat, non-hierarchical lookup entity — it has no parent and no children (unlike HR's `Designation`, this is a single flat list, not a tree). It is referenced by `Product.categoryId` (nullable, `onDelete: Restrict`).

| Sub-module | Base Path | Description |
| ---------- | --------- | ------------ |
| Categories | `/product-management/categories` | CRUD for product categories |

### Category Rules

- `name` is **globally unique** (`@unique` on the model, not scoped to anything).
- A category **cannot be deleted** while any non-deleted `Product` references it via `categoryId` — see [Delete Category](#6-delete-category).
- `categoryId` is optional on a `Product` — a product does not need a category.

---

## Permissions

| Permission Key | What it guards |
| --------------- | ---------------- |
| `product-category.view` | List categories, categories dropdown, view a single category |
| `product-category.manage` | Create, update, and delete categories |

---

## Enums & Constants

### `ProductCategoryStatus`

`ACTIVE` (default) | `INACTIVE`.

### Audit Behavior

`POST`/`PATCH`/`DELETE` all carry `@Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_CATEGORIES })`. `POST`/`PATCH` return the full updated `ProductCategory` entity; `DELETE` returns only `{ message }`.

---

## Category API

### 1. List Categories (Paginated)

```
GET /product-management/categories
Permission: product-category.view
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
      "id": "9e56e8c1-2b1a-4b3a-9c1a-1f2b3c4d5e6f",
      "name": "Glassware",
      "status": "ACTIVE",
      "createdAt": "2026-07-01T10:00:00.000Z",
      "updatedAt": "2026-07-01T10:00:00.000Z"
    }
  ],
  "meta": { "total": 5, "page": 1, "limit": 10, "totalPages": 1, "hasNext": false, "hasPrev": false }
}
```

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `uuid` | |
| `name` | `string` | Globally unique |
| `status` | `ProductCategoryStatus` | |
| `createdAt`/`updatedAt` | `ISO datetime` | |

> There is no `_count` of related products in the list/detail response — to check whether a category is in use, rely on the `400` returned by [Delete Category](#6-delete-category).

---

### 2. Categories Dropdown

```
GET /product-management/categories/dropdown
Permission: product-category.view
```

Returns **all `ACTIVE`** categories (no pagination), ordered by `name` ascending.

#### Response `200 OK`

```json
[
  { "id": "9e56e8c1-2b1a-4b3a-9c1a-1f2b3c4d5e6f", "name": "Glassware" }
]
```

---

### 3. Get Single Category

```
GET /product-management/categories/:productCategoryId
Permission: product-category.view
```

#### Path Parameter

| Param | Type | Notes |
| ----- | ---- | ----- |
| `productCategoryId` | `uuid` | Validated with `ParseUUIDPipe` |

#### Response `200 OK`

Same shape as the [list item](#1-list-categories-paginated).

#### Response `404 Not Found`

```json
{ "statusCode": 404, "message": "Product category not found", "error": "Not Found" }
```

---

### 4. Create Category

```
POST /product-management/categories
Permission: product-category.manage
Audit: @Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_CATEGORIES })
```

#### Request Body

```json
{
  "name": "Glassware",
  "status": "ACTIVE"
}
```

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `name` | `string` | Yes | `@IsString() @IsNotEmpty() @MaxLength(128)`, trimmed. Globally unique. |
| `status` | `ProductCategoryStatus` | No | Defaults to `ACTIVE`. |

#### Response `201 Created`

Same shape as [Get Single Category](#3-get-single-category).

#### Validation Errors `400 Bad Request`

```json
{ "message": ["name should not be empty"] }
```

#### Conflict Error `409 Conflict`

```json
{ "message": "A product category with this name already exists" }
```

---

### 5. Update Category

```
PATCH /product-management/categories/:productCategoryId
Permission: product-category.manage
Audit: @Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_CATEGORIES })
```

All fields optional.

#### Request Body

```json
{ "name": "Glassware & Tableware" }
```

#### Response `200 OK`

Full updated category (same shape as [Get Single Category](#3-get-single-category)).

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Product category not found", "error": "Not Found" }
```

#### Conflict Error `409 Conflict`

```json
{ "message": "A product category with this name already exists" }
```

---

### 6. Delete Category

```
DELETE /product-management/categories/:productCategoryId
Permission: product-category.manage
Audit: @Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_CATEGORIES })
```

**Business Rules (checked in this order):**

1. Category must exist, or `404 Not Found`.
2. If any non-deleted `Product.categoryId` references this category → `400 Bad Request`.
3. Otherwise, hard-deleted.

#### Response `200 OK`

```json
{ "message": "Product category deleted successfully" }
```

#### Validation Error `400 Bad Request`

```json
{ "message": "Cannot delete product category \"Glassware\" — it is assigned to one or more products" }
```

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Product category not found", "error": "Not Found" }
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
{ "statusCode": 404, "message": "Product category not found", "error": "Not Found" }
```

### 409 Conflict (duplicate name)

```json
{ "statusCode": 409, "message": "A product category with this name already exists", "error": "Conflict" }
```

---

## Frontend Implementation Notes

### Screen Flows

**Category List Screen**

- `GET /product-management/categories` with pagination + `search` (name only) + `status` filter.
- Sortable columns: `name`, `status`, `createdAt`, `updatedAt`.

**Create / Edit Category Screen**

- Single `name` field + `status` toggle — no parent picker needed (flat entity, no sub-categories).
- `POST /product-management/categories` to create; `PATCH /product-management/categories/:id` to edit.
- Surface `409` inline on `name`.

**Delete Action**

- `DELETE /product-management/categories/:id` — the API itself blocks deletion when products reference the category; there's no `_count` to pre-check client-side, so just attempt the delete and surface the `400` message if it comes back.

**Product Form Integration**

- Populate the category picker from `GET /product-management/categories/dropdown`.
- `categoryId` on the Product form is optional — allow clearing it.

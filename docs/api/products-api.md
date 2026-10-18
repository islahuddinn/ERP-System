# Products Module — Frontend API Reference

> **Status**: Updated module — existing screen needs changes.  
> **Base URL**: All paths relative to the API root.  
> **Auth**: Bearer JWT required on all endpoints.

---

## What Changed (Frontend Action Required)

| Area | Change | Frontend Impact |
|---|---|---|
| **`attributes`** | New nested array field — key/value pairs for product specs | Add an attributes section to the product form (dynamic key/value rows) |
| **`barcode`** | New optional field | Add barcode input to product form |
| **`type`** | New enum field: `FINISHED_GOOD`, `SEMI_FINISHED`, `CONSUMABLE`, `SERVICE` | Add type selector to product form; add type filter to list screen |
| **`minStock` / `maxStock`** | New stock threshold fields | Add to product form stock settings section |
| **`images`** | New string array field | Add image URL input(s) to product form |
| **Search** | Now also searches `barcode` | No UI change needed |
| **Dropdown response** | Now includes `type`, `currentStock`, `sellingPrice`, `uom` | Update any dropdown usage that expects only `id`/`name` |
| **Pagination meta** | Now includes `hasNext` and `hasPrev` | Can use for prev/next navigation buttons |
| **Audit** | Update, Delete, Toggle-active are now audited | No UI change needed |

---

## Table of Contents

1. [Permissions](#permissions)
2. [Enums](#enums)
3. [Endpoints](#endpoints)
4. [Error Responses](#error-responses)
5. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Permissions

| Permission Key | What it guards |
|---|---|
| `products.create` | Create a product |
| `products.read` | List, view products, dropdown |
| `products.update` | Update, toggle active |
| `products.delete` | Soft-delete |

---

## Enums

### `ProductType`

```
FINISHED_GOOD   — End product ready for sale
SEMI_FINISHED   — Work-in-progress / intermediate product
CONSUMABLE      — Supplies consumed in production (not sold)
SERVICE         — Service line item
```

---

## Endpoints

### 1. Create Product

```
POST /products
Permission: products.create
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
  "currentStock": 0,
  "minStock": 10,
  "maxStock": 500,
  "reorderLevel": 20,
  "sellingPrice": 250.00,
  "images": ["https://cdn.example.com/blue-glass.jpg"],
  "isActive": true,
  "attributes": [
    { "name": "Color", "value": "Blue" },
    { "name": "Capacity", "value": "500", "unit": "ml" },
    { "name": "Material", "value": "Borosilicate Glass" }
  ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | `string` | Yes | |
| `code` | `string` | Yes | Unique internal product code |
| `barcode` | `string` | No | Must be globally unique if provided |
| `description` | `string` | No | |
| `type` | `ProductType` | No | Default: `FINISHED_GOOD` |
| `uomId` | `uuid` | Yes | Must exist in UOM master |
| `currentStock` | `number` | No | Default: `0`. Must be ≥ 0 |
| `minStock` | `number` | No | Default: `0`. Low-stock threshold |
| `maxStock` | `number` | No | Optional upper limit |
| `reorderLevel` | `number` | No | Default: `0`. Triggers reorder alert |
| `sellingPrice` | `number` | No | Base selling price per UOM unit. Must be ≥ 0 |
| `images` | `string[]` | No | Array of image URLs, each at least 1 character |
| `isActive` | `boolean` | No | Default: `true` |
| `attributes` | `ProductAttributeDto[]` | No | See table below |

#### `ProductAttributeDto`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | `string` | Yes | Attribute key, e.g. `"Color"`, `"Material"`, `"Capacity"` |
| `value` | `string` | Yes | Attribute value, e.g. `"Blue"`, `"500"` |
| `unit` | `string` | No | Unit of the value, e.g. `"ml"`, `"cm"` |

#### Response `201 Created`

```json
{
  "id": "p1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "name": "Blue Glass 500ml",
  "code": "BG-500-BLU",
  "barcode": "8901234567890",
  "description": "Borosilicate blue glass, 500ml capacity",
  "type": "FINISHED_GOOD",
  "uomId": "e908e33f-f23a-438f-916d-eded9e8af091",
  "currentStock": 0,
  "minStock": 10,
  "maxStock": 500,
  "reorderLevel": 20,
  "sellingPrice": "250.00",
  "images": ["https://cdn.example.com/blue-glass.jpg"],
  "isActive": true,
  "deletedAt": null,
  "createdById": "user-uuid",
  "updatedById": "user-uuid",
  "createdAt": "2026-06-04T10:00:00.000Z",
  "updatedAt": "2026-06-04T10:00:00.000Z",
  "uom": {
    "id": "e908e33f-f23a-438f-916d-eded9e8af091",
    "name": "Piece",
    "symbol": "pcs"
  },
  "attributes": [
    { "id": "attr-uuid-1", "name": "Capacity", "value": "500", "unit": "ml" },
    { "id": "attr-uuid-2", "name": "Color", "value": "Blue", "unit": null },
    { "id": "attr-uuid-3", "name": "Material", "value": "Borosilicate Glass", "unit": null }
  ]
}
```

> `sellingPrice` is a Prisma `Decimal` — returned as a string. Parse with `parseFloat()` before arithmetic.  
> `attributes` are always returned **sorted alphabetically by name**.

---

### 2. List Products (Paginated)

```
GET /products
Permission: products.read
```

#### Query Parameters

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | `number` | `1` | |
| `limit` | `number` | `10` | Max: 100 |
| `search` | `string` | — | Searches `name`, `code`, `description`, `barcode` |
| `type` | `ProductType` | — | Filter by product type |
| `isActive` | `boolean` | — | Omit for all, `true`/`false` to filter |
| `sortBy` | `string` | `createdAt` | |
| `sortOrder` | `"ASC"` \| `"DESC"` | `"DESC"` | |

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "p1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "name": "Blue Glass 500ml",
      "code": "BG-500-BLU",
      "barcode": "8901234567890",
      "description": "Borosilicate blue glass, 500ml capacity",
      "type": "FINISHED_GOOD",
      "uomId": "e908e33f-f23a-438f-916d-eded9e8af091",
      "currentStock": 0,
      "minStock": 10,
      "maxStock": 500,
      "reorderLevel": 20,
      "sellingPrice": "250.00",
      "images": ["https://cdn.example.com/blue-glass.jpg"],
      "isActive": true,
      "deletedAt": null,
      "createdById": "user-uuid",
      "updatedById": "user-uuid",
      "createdAt": "2026-06-04T10:00:00.000Z",
      "updatedAt": "2026-06-04T10:00:00.000Z",
      "uom": {
        "id": "e908e33f-f23a-438f-916d-eded9e8af091",
        "name": "Piece",
        "symbol": "pcs"
      },
      "attributes": [
        { "id": "attr-uuid-1", "name": "Capacity", "value": "500", "unit": "ml" },
        { "id": "attr-uuid-2", "name": "Color", "value": "Blue", "unit": null }
      ]
    }
  ],
  "meta": {
    "total": 54,
    "page": 1,
    "limit": 10,
    "totalPages": 6,
    "hasNext": true,
    "hasPrev": false
  }
}
```

> The `meta` object now includes `hasNext` and `hasPrev` booleans — use these for pagination controls.

---

### 3. Products Dropdown

```
GET /products/dropdown
Permission: products.read
```

Returns active (non-deleted) products for select inputs. Sorted alphabetically by name.

#### Response `200 OK`

```json
[
  {
    "id": "p1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "name": "Blue Glass 500ml",
    "code": "BG-500-BLU",
    "type": "FINISHED_GOOD",
    "currentStock": 120,
    "sellingPrice": "250.00",
    "uom": {
      "id": "e908e33f-f23a-438f-916d-eded9e8af091",
      "name": "Piece",
      "symbol": "pcs"
    }
  }
]
```

> More fields are returned than before — `type`, `currentStock`, `sellingPrice`, and `uom` are now included. Update any code that assumes the old minimal shape.

---

### 4. Get Single Product

```
GET /products/:productId
Permission: products.read
```

#### Path Parameter

| Param | Type | Notes |
|---|---|---|
| `productId` | `uuid` | Product ID |

#### Response `200 OK`

Same shape as a single item in the list response — full product object with `uom` and `attributes`.

#### Response `404 Not Found`

```json
{ "statusCode": 404, "message": "Product not found", "error": "Not Found" }
```

---

### 5. Update Product

```
PATCH /products/:productId
Permission: products.update
Audited: Yes
```

All fields optional. Send only what changed.

```json
{
  "name": "Blue Glass 500ml Premium",
  "sellingPrice": 275.00,
  "minStock": 15,
  "attributes": [
    { "name": "Color", "value": "Cobalt Blue" },
    { "name": "Capacity", "value": "500", "unit": "ml" }
  ]
}
```

> **Attributes on update**: The backend **replaces all attributes** on every update — it deletes the old set and creates the new ones from the payload. If you want to keep existing attributes, include them all in the request. Sending `attributes: []` will delete all attributes. Omitting `attributes` entirely leaves them unchanged.

#### Response `200 OK`

Full updated product object.

---

### 6. Delete Product (Soft Delete)

```
DELETE /products/:productId
Permission: products.delete
Audited: Yes
```

Sets `deletedAt` and `isActive = false`. Record is not permanently removed.

#### Response `200 OK`

```json
{ "message": "Product deleted successfully" }
```

---

### 7. Toggle Active Status

```
PATCH /products/:productId/toggle-active
Permission: products.update
Audited: Yes
```

No request body. Flips `isActive`.

#### Response `200 OK`

Full updated product object. Check `isActive` to know the new state.

---

## Error Responses

```json
{ "statusCode": 400, "message": "UOM not found" }
{ "statusCode": 404, "message": "Product not found" }
{ "statusCode": 409, "message": "A product with this code already exists" }
{ "statusCode": 409, "message": "A product with this barcode already exists" }
```

---

## Frontend Implementation Notes

### Product Form — New Fields to Add

| Field | UI Control | Notes |
|---|---|---|
| `barcode` | Text input | Optional, globally unique |
| `type` | Select/Radio | Options: Finished Good, Semi-Finished, Consumable, Service |
| `minStock` | Number input | Show alongside `reorderLevel` and `maxStock` |
| `maxStock` | Number input | Optional |
| `images` | URL input list | Allow adding/removing multiple URL strings |
| `attributes` | Dynamic key-value rows | `name` + `value` + optional `unit`. Allow add/remove rows |

### Attributes — Key Behaviour

- On **create**: send the full array
- On **update**: always send the **complete** desired array — partial updates are not supported for attributes. The backend replaces the whole set
- Display attributes on the product detail card as a table or tag list

### Stock Level Indicators

| Condition | Suggested display |
|---|---|
| `currentStock === 0` | "Out of stock" badge (red) |
| `currentStock <= reorderLevel` | "Low stock" badge (amber) |
| `maxStock && currentStock >= maxStock` | "At capacity" badge (blue) |
| Otherwise | Normal |

### Pagination

The `meta` response now includes `hasNext` and `hasPrev`:

```json
"meta": { "total": 54, "page": 2, "limit": 10, "totalPages": 6, "hasNext": true, "hasPrev": true }
```

Use `hasNext`/`hasPrev` to enable/disable prev/next buttons directly without recalculating from `page`/`totalPages`.

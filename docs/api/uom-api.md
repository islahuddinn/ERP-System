# UOM (Units of Measurement) Module — Frontend API Reference

> **Status**: Updated module — existing screen needs changes.  
> **Base URL**: All paths relative to the API root.  
> **Auth**: Bearer JWT required on all endpoints.

---

## What Changed (Frontend Action Required)

| Area                       | Change                                                             | Frontend Impact                                                                       |
| -------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| **Create endpoint**        | **Disabled** (commented out in backend)                            | Remove or hide "Add UOM" button — creation is not available via API currently         |
| **`GET /uoms`**            | Now returns UOMs **grouped by category** by default                | Change list rendering — response is now an object keyed by category, not a flat array |
| **`GET /uoms?category=X`** | When `category` filter is passed, returns a **flat array** instead | Same endpoint, different response shape depending on whether category is passed       |
| **`GET /uoms/dropdown`**   | New endpoint with optional category filter                         | Use this for all UOM select inputs                                                    |
| **`isSystem` field**       | New field on every UOM object                                      | System UOMs should not show a delete button                                           |
| **Delete protection**      | Delete now blocked if UOM is used by products or raw materials     | Show in-use count or disable delete button for used UOMs                              |

---

## Table of Contents

1. [Permissions](#permissions)
2. [Enums & System UOM Reference](#enums--system-uom-reference)
3. [Endpoints](#endpoints)
4. [Error Responses](#error-responses)
5. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Permissions

| Permission Key | What it guards      |
| -------------- | ------------------- |
| `uoms.read`    | List UOMs, dropdown |
| `uoms.delete`  | Delete a custom UOM |

> `uoms.create` exists in the permission system but the create endpoint is currently **disabled** in the backend.

---

## Enums & System UOM Reference

### `UomCategory`

```
WEIGHT   VOLUME   LENGTH   COUNT
```

### All System UOMs by Category

These are seeded automatically and cannot be deleted (`isSystem: true`).

| Category | Code          | Symbol  | Name        |
| -------- | ------------- | ------- | ----------- |
| WEIGHT   | `GRAM`        | `g`     | Gram        |
| WEIGHT   | `KILOGRAM`    | `kg`    | Kilogram    |
| WEIGHT   | `MILLIGRAM`   | `mg`    | Milligram   |
| WEIGHT   | `TON`         | `t`     | Ton         |
| WEIGHT   | `POUND`       | `lb`    | Pound       |
| WEIGHT   | `OUNCE`       | `oz`    | Ounce       |
| WEIGHT   | `QUINTAL`     | `q`     | Quintal     |
| VOLUME   | `MILLILITER`  | `ml`    | Milliliter  |
| VOLUME   | `LITER`       | `L`     | Liter       |
| VOLUME   | `FLUID_OUNCE` | `fl oz` | Fluid Ounce |
| VOLUME   | `GALLON`      | `gal`   | Gallon      |
| LENGTH   | `MILLIMETER`  | `mm`    | Millimeter  |
| LENGTH   | `CENTIMETER`  | `cm`    | Centimeter  |
| LENGTH   | `METER`       | `m`     | Meter       |
| LENGTH   | `INCH`        | `in`    | Inch        |
| LENGTH   | `FOOT`        | `ft`    | Foot        |
| COUNT    | `PIECE`       | `pcs`   | Piece       |
| COUNT    | `PACKET`      | `pkt`   | Packet      |
| COUNT    | `BOX`         | `box`   | Box         |
| COUNT    | `CARTON`      | `ctn`   | Carton      |
| COUNT    | `BAG`         | `bag`   | Bag         |
| COUNT    | `SACK`        | `sck`   | Sack        |
| COUNT    | `ROLL`        | `roll`  | Roll        |
| COUNT    | `STRIP`       | `strip` | Strip       |
| COUNT    | `DOZEN`       | `dz`    | Dozen       |
| COUNT    | `PALLET`      | `plt`   | Pallet      |

---

## Endpoints

### 1. List All UOMs (Grouped by Category)

```
GET /uoms
Permission: uoms.read
```

Returns all active UOMs. **Without a `category` filter**, the response is an object keyed by category — each key maps to an array of UOMs in that category.

#### Response `200 OK` — No filter

```json
{
  "WEIGHT": [
    {
      "id": "uuid-1",
      "name": "Kilogram",
      "symbol": "kg",
      "code": "KILOGRAM",
      "category": "WEIGHT",
      "isSystem": true,
      "description": null,
      "isActive": true
    },
    {
      "id": "uuid-2",
      "name": "Gram",
      "symbol": "g",
      "code": "GRAM",
      "category": "WEIGHT",
      "isSystem": true,
      "description": null,
      "isActive": true
    }
  ],
  "VOLUME": [
    /* ... */
  ],
  "LENGTH": [
    /* ... */
  ],
  "COUNT": [
    /* ... */
  ]
}
```

> All four category keys (`WEIGHT`, `VOLUME`, `LENGTH`, `COUNT`) are always present, even if empty.

---

### 2. List UOMs Filtered by Category (Flat Array)

```
GET /uoms?category=WEIGHT
Permission: uoms.read
```

When `category` is passed, the response is a **flat array** (not grouped).

#### Query Parameters

| Param      | Type          | Notes                                    |
| ---------- | ------------- | ---------------------------------------- |
| `category` | `UomCategory` | `WEIGHT`, `VOLUME`, `LENGTH`, or `COUNT` |

#### Response `200 OK` — With category filter

```json
[
  {
    "id": "uuid-1",
    "name": "Kilogram",
    "symbol": "kg",
    "code": "KILOGRAM",
    "category": "WEIGHT",
    "isSystem": true,
    "description": null
  },
  {
    "id": "uuid-2",
    "name": "Gram",
    "symbol": "g",
    "code": "GRAM",
    "category": "WEIGHT",
    "isSystem": true,
    "description": null
  }
]
```

> Note: `isActive` is not returned when category filter is applied (omitted by the select).

---

### 3. UOM Dropdown

```
GET /uoms/dropdown
Permission: uoms.read
```

Minimal UOM data for select inputs. Optional category filter. Sorted by category then name.

#### Query Parameters

| Param      | Type          | Notes                             |
| ---------- | ------------- | --------------------------------- |
| `category` | `UomCategory` | Optional. Filters to one category |

#### Response `200 OK`

```json
[
  {
    "id": "uuid-1",
    "name": "Kilogram",
    "symbol": "kg",
    "code": "KILOGRAM",
    "category": "WEIGHT"
  },
  {
    "id": "uuid-2",
    "name": "Liter",
    "symbol": "L",
    "code": "LITER",
    "category": "VOLUME"
  }
]
```

Use `GET /uoms/dropdown?category=WEIGHT` to get only weight UOMs for a weight-specific picker.

---

### 4. Delete UOM

```
DELETE /uoms/:uomId
Permission: uoms.delete
```

Permanently deletes a custom UOM. Cannot delete system UOMs or UOMs currently in use.

#### Path Parameter

| Param   | Type   | Notes                   |
| ------- | ------ | ----------------------- |
| `uomId` | `uuid` | ID of the UOM to delete |

#### Response `200 OK`

```json
{ "message": "UOM deleted successfully" }
```

#### Error Responses

```json
{ "statusCode": 403, "message": "System UOMs cannot be deleted", "error": "Forbidden" }
{ "statusCode": 409, "message": "Cannot delete UOM that is in use by products or raw materials", "error": "Conflict" }
{ "statusCode": 404, "message": "UOM not found", "error": "Not Found" }
```

---

## Error Responses

```json
{ "statusCode": 403, "message": "System UOMs cannot be deleted" }
{ "statusCode": 409, "message": "Cannot delete UOM that is in use by products or raw materials" }
{ "statusCode": 409, "message": "UOM with code \"CUSTOM_CODE\" already exists" }
{ "statusCode": 404, "message": "UOM not found" }
```

---

## Frontend Implementation Notes

### UOM List Screen

- Response from `GET /uoms` is an **object**, not an array. Render it as tabs or accordion sections per category (`WEIGHT`, `VOLUME`, `LENGTH`, `COUNT`)
- Each UOM row should show: `name`, `symbol` (in brackets), `code`, `category`
- Hide the **Delete** button for UOMs where `isSystem === true`
- **Create button should be hidden** — the create endpoint is disabled in the backend

### UOM Selector (in product/raw material forms)

- Use `GET /uoms/dropdown` — optionally pass `?category=WEIGHT` if the context constrains the category
- Display as: `name (symbol)` — e.g. `"Kilogram (kg)"`
- Store `uomId` (the UUID) in the form

### Response Shape Difference — Important

```
GET /uoms             → object { WEIGHT: [...], VOLUME: [...], LENGTH: [...], COUNT: [...] }
GET /uoms?category=X  → flat array [...]
GET /uoms/dropdown    → flat array [...] (fewer fields)
```

Do not assume a single shape for `GET /uoms`.

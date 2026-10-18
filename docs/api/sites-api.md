# Sites API

## Table of Contents

1. [Overview](#1-overview)
2. [Permissions](#2-permissions)
3. [Enums & Constants](#3-enums--constants)
4. [Endpoints](#4-endpoints)
   - [4.1 Create Site](#41-create-site)
   - [4.2 Dropdown List](#42-dropdown-list)
   - [4.3 Hierarchy Tree](#43-hierarchy-tree)
   - [4.4 List Sites (Paginated)](#44-list-sites-paginated)
   - [4.5 Get Single Site](#45-get-single-site)
   - [4.6 Get Children](#46-get-children)
   - [4.7 Get Ancestors](#47-get-ancestors)
   - [4.8 Update Site Status](#48-update-site-status)
   - [4.9 Update Site](#49-update-site)
   - [4.10 Delete (Deactivate) Site](#410-delete-deactivate-site)
5. [Error Responses](#5-error-responses)
6. [Frontend Implementation Notes](#6-frontend-implementation-notes)

---

## 1. Overview

The Sites module manages the **physical/logical location hierarchy** used throughout the ERP — warehouses, zones, plants, workshops, rooms, storage areas, etc. Sites can be nested arbitrarily deep via `parentId` (self-referencing tree), and are referenced by other modules (e.g. `RawMaterialBatch.siteId`, `WasteManagement.siteId`).

Key concepts:

- **`name` and `code` are globally unique.** `code` is automatically uppercased and trimmed on input.
- **Hierarchy**: a site can have one `parentId` and many `children`. Circular hierarchies are rejected — a site cannot be its own ancestor or descendant of itself.
- **`category`** describes what kind of inventory the site holds (e.g. `RAW_MATERIAL`, `FINISHED_GOODS`, `QUARANTINE`, `HAZARDOUS`) — defaults to `GENERAL`.
- **`status`** is the operational state (`ACTIVE`, `INACTIVE`, `QUARANTINE`, `UNDER_MAINTENANCE`, `FULL`) — defaults to `ACTIVE`. Status is changed either via the dedicated `PATCH /sites/:siteId/status` endpoint or implicitly via "delete" (which sets it to `INACTIVE`).
- **No hard delete** — `DELETE /sites/:siteId` just sets `status = INACTIVE`. Inactive sites are excluded from `tree`, `children`, and `dropdown` results, but still appear in `findAll`/`findOne` (filterable by `status`).
- A site can optionally link to a `Location` (physical address: city, state, country, lat/lng, etc.) via `locationId`, and to a manager via `managerId` (a user ID, stored as a plain string — not validated against the `User` table).
- `metadata` is a free-form JSON object for any extra attributes (e.g. `{ "zone": "A", "capacity": 5000 }`).

---

## 2. Permissions

| Permission     | Used For                                            |
| -------------- | --------------------------------------------------- |
| `sites.create` | Create a site                                       |
| `sites.read`   | List/get sites, dropdown, tree, children, ancestors |
| `sites.update` | Update site fields, change status                   |
| `sites.delete` | Deactivate (soft-delete) a site                     |

All routes require `JwtAuthGuard` + `PermissionsGuard` (Bearer token).

---

## 3. Enums & Constants

### `SiteType`

```
WAREHOUSE
ZONE
UNIT
PLANT
WORKSHOP
ROOM
STORAGE
AREA
```

### `SiteCategory` (default: `GENERAL`)

```
RAW_MATERIAL
WORK_IN_PROGRESS
FINISHED_GOODS
PACKAGING
SPARE_PARTS
CONSUMABLES
REJECTED
QUARANTINE
HAZARDOUS
GENERAL
```

### `SiteStatus` (default: `ACTIVE`)

```
ACTIVE              // operational
INACTIVE            // deactivated (set via DELETE endpoint or manually)
QUARANTINE          // site itself under quarantine (distinct from SiteCategory.QUARANTINE)
UNDER_MAINTENANCE   // temporarily unavailable
FULL                // at capacity
```

### `CapacityUnit`

```
CUBIC_METER
SQUARE_METER
PALLET
TON
KG
UNIT
```

---

## 4. Endpoints

> **Note on route ordering**: static routes (`/dropdown`, `/tree`) are declared before the parameterised `/:siteId` routes, so `GET /sites/dropdown` and `GET /sites/tree` will NOT be interpreted as `siteId = "dropdown"` / `"tree"`.

### 4.1 Create Site

```
POST /sites
Permission: sites.create
@Auditable (module: SITES)
```

#### Request Body — `CreateSiteDto`

```json
{
  "name": "Main Warehouse",
  "code": "wh-001",
  "type": "WAREHOUSE",
  "category": "RAW_MATERIAL",
  "parentId": "8afe8928-e559-4b39-b966-f33b721dbe3c",
  "locationId": "8afe8928-e559-4b39-b966-f33b721dbe3c",
  "managerId": "user-uuid",
  "totalCapacity": 5000,
  "capacityUnit": "CUBIC_METER",
  "temperature": 4,
  "humidity": 65,
  "description": "Cold storage unit for perishables",
  "status": "ACTIVE",
  "metadata": { "zone": "A", "capacity": 5000 }
}
```

| Field           | Type                | Required | Notes                                                                                        |
| --------------- | ------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `name`          | `string`            | Yes      | Trimmed. Must be globally unique                                                             |
| `code`          | `string`            | Yes      | Trimmed and **uppercased** automatically (e.g. `wh-001` → `WH-001`). Must be globally unique |
| `type`          | `SiteType` enum     | Yes      |                                                                                              |
| `category`      | `SiteCategory` enum | No       | Defaults to `GENERAL`                                                                        |
| `parentId`      | `uuid`              | No       | Must reference an existing site                                                              |
| `locationId`    | `uuid`              | No       | FK to `Location`                                                                             |
| `managerId`     | `string`            | No       | User ID — not FK-validated                                                                   |
| `totalCapacity` | `number`            | No       | `>= 0`                                                                                       |
| `capacityUnit`  | `CapacityUnit` enum | No       |                                                                                              |
| `temperature`   | `number`            | No       | °C, can be negative (e.g. cold storage)                                                      |
| `humidity`      | `number`            | No       | `0`–`100`                                                                                    |
| `description`   | `string`            | No       | Trimmed; empty string becomes `undefined`                                                    |
| `status`        | `SiteStatus` enum   | No       | Defaults to `ACTIVE`                                                                         |
| `metadata`      | `object`            | No       | Free-form JSON                                                                               |

#### Validation/Conflict Errors

```json
{ "statusCode": 404, "message": "Site with ID \"<parentId>\" not found", "error": "Not Found" }
```

```json
{ "statusCode": 409, "message": "Duplicate value for: name", "error": "Conflict" }
{ "statusCode": 409, "message": "Duplicate value for: code", "error": "Conflict" }
```

#### Response `201 Created`

Returns the created site (with `location` relation):

```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "name": "Main Warehouse",
  "code": "WH-001",
  "type": "WAREHOUSE",
  "category": "RAW_MATERIAL",
  "status": "ACTIVE",
  "parentId": null,
  "locationId": "8afe8928-e559-4b39-b966-f33b721dbe3c",
  "managerId": "user-uuid",
  "totalCapacity": 5000,
  "capacityUnit": "CUBIC_METER",
  "temperature": 4,
  "humidity": 65,
  "description": "Cold storage unit for perishables",
  "metadata": { "zone": "A", "capacity": 5000 },
  "createdAt": "2026-06-11T10:00:00.000Z",
  "updatedAt": "2026-06-11T10:00:00.000Z",
  "createdById": "user-uuid",
  "location": {
    "id": "8afe8928-e559-4b39-b966-f33b721dbe3c",
    "name": "Karachi Industrial Zone",
    "address": "Plot 12, Sector 5",
    "city": "Karachi",
    "state": "Sindh",
    "country": "Pakistan",
    "lat": 24.8607,
    "lng": 67.0011,
    "phone": "+92-21-1234567",
    "email": "kiz@example.com"
  }
}
```

---

### 4.2 Dropdown List

```
GET /sites/dropdown
Permission: sites.read
```

Lightweight list of `ACTIVE` sites only — for select/dropdown inputs.

#### Response `200 OK`

```json
[
  {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "Main Warehouse",
    "code": "WH-001",
    "type": "WAREHOUSE",
    "status": "ACTIVE",
    "parentId": null
  }
]
```

---

### 4.3 Hierarchy Tree

```
GET /sites/tree
Permission: sites.read
```

Returns the **full nested hierarchy** of all sites with `status != INACTIVE`, as a tree of root sites with `children` arrays (recursive).

#### Response `200 OK`

```json
[
  {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "Main Plant",
    "code": "PLANT-001",
    "type": "PLANT",
    "category": "GENERAL",
    "status": "ACTIVE",
    "parentId": null,
    "locationId": null,
    "managerId": null,
    "totalCapacity": null,
    "capacityUnit": null,
    "temperature": null,
    "humidity": null,
    "description": null,
    "metadata": null,
    "createdAt": "2026-06-01T00:00:00.000Z",
    "updatedAt": "2026-06-01T00:00:00.000Z",
    "createdById": "user-uuid",
    "location": null,
    "children": [
      {
        "id": "22222222-2222-2222-2222-222222222222",
        "name": "Cutting Workshop",
        "code": "WS-CUT-01",
        "type": "WORKSHOP",
        "...": "...same fields as parent",
        "children": []
      }
    ]
  }
]
```

---

### 4.4 List Sites (Paginated)

```
GET /sites
Permission: sites.read
```

#### Query Parameters

| Param       | Type                | Default            | Notes                                       |
| ----------- | ------------------- | ------------------ | ------------------------------------------- |
| `page`      | `number`            | `1`                |                                             |
| `limit`     | `number`            | `10`               |                                             |
| `search`    | `string`            | —                  | Searches `name`, `code`, `description`      |
| `sortBy`    | `string`            | `createdAt` (desc) |                                             |
| `sortOrder` | `"ASC"` \| `"DESC"` | `"DESC"`           |                                             |
| `type`      | `SiteType`          | —                  |                                             |
| `category`  | `SiteCategory`      | —                  |                                             |
| `status`    | `SiteStatus`        | —                  | Includes `INACTIVE` if explicitly requested |

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "Main Warehouse",
      "code": "WH-001",
      "type": "WAREHOUSE",
      "category": "RAW_MATERIAL",
      "status": "ACTIVE",
      "parentId": null,
      "locationId": "8afe8928-e559-4b39-b966-f33b721dbe3c",
      "managerId": "user-uuid",
      "totalCapacity": 5000,
      "capacityUnit": "CUBIC_METER",
      "temperature": 4,
      "humidity": 65,
      "description": "Cold storage unit for perishables",
      "metadata": { "zone": "A", "capacity": 5000 },
      "createdAt": "2026-06-11T10:00:00.000Z",
      "updatedAt": "2026-06-11T10:00:00.000Z",
      "createdById": "user-uuid",
      "location": { "...": "LOCATION_SELECT fields, or null" }
    }
  ],
  "meta": {
    "total": 8,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 4.5 Get Single Site

```
GET /sites/:siteId
Permission: sites.read
```

Returns full site detail including `parent` (with its own `location`) and a list of non-inactive `children`.

#### Path Parameter

| Param    | Type   | Notes   |
| -------- | ------ | ------- |
| `siteId` | `uuid` | Site ID |

#### Response `200 OK`

```json
{
  "id": "22222222-2222-2222-2222-222222222222",
  "name": "Cutting Workshop",
  "code": "WS-CUT-01",
  "type": "WORKSHOP",
  "category": "GENERAL",
  "status": "ACTIVE",
  "parentId": "11111111-1111-1111-1111-111111111111",
  "locationId": null,
  "managerId": null,
  "totalCapacity": null,
  "capacityUnit": null,
  "temperature": null,
  "humidity": null,
  "description": null,
  "metadata": null,
  "createdAt": "2026-06-01T00:00:00.000Z",
  "updatedAt": "2026-06-01T00:00:00.000Z",
  "createdById": "user-uuid",
  "location": null,
  "parent": {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "Main Plant",
    "code": "PLANT-001",
    "type": "PLANT",
    "category": "GENERAL",
    "location": null
  },
  "children": [
    {
      "id": "33333333-3333-3333-3333-333333333333",
      "name": "Cutting Table A",
      "code": "WS-CUT-01-A",
      "type": "AREA",
      "category": "GENERAL",
      "status": "ACTIVE"
    }
  ]
}
```

#### Error `404 Not Found`

```json
{ "statusCode": 404, "message": "Site with ID: \"<siteId>\" not found", "error": "Not Found" }
```

---

### 4.6 Get Children

```
GET /sites/:siteId/children
Permission: sites.read
```

Returns direct (one level) non-`INACTIVE` children, ordered by `name` ascending.

#### Path Parameter

| Param    | Type   | Notes   |
| -------- | ------ | ------- |
| `siteId` | `uuid` | Site ID |

#### Response `200 OK`

```json
[
  {
    "id": "33333333-3333-3333-3333-333333333333",
    "name": "Cutting Table A",
    "code": "WS-CUT-01-A",
    "type": "AREA",
    "category": "GENERAL",
    "status": "ACTIVE",
    "parentId": "22222222-2222-2222-2222-222222222222",
    "locationId": null,
    "managerId": null,
    "totalCapacity": null,
    "capacityUnit": null,
    "temperature": null,
    "humidity": null,
    "description": null,
    "metadata": null,
    "createdAt": "2026-06-01T00:00:00.000Z",
    "updatedAt": "2026-06-01T00:00:00.000Z",
    "createdById": "user-uuid",
    "location": null
  }
]
```

#### Error `404 Not Found`

```json
{ "statusCode": 404, "message": "Site with ID \"<siteId>\" not found", "error": "Not Found" }
```

---

### 4.7 Get Ancestors

```
GET /sites/:siteId/ancestors
Permission: sites.read
```

Returns the full ancestor chain, **ordered from root down to the site's immediate parent** (the site itself is NOT included).

#### Path Parameter

| Param    | Type   | Notes   |
| -------- | ------ | ------- |
| `siteId` | `uuid` | Site ID |

#### Response `200 OK`

```json
[
  {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "Main Plant",
    "code": "PLANT-001",
    "type": "PLANT",
    "parentId": null,
    "location": null
  }
]
```

> If the site has no parent, returns `[]`.

#### Error `404 Not Found`

```json
{ "statusCode": 404, "message": "Site with ID \"<siteId>\" not found", "error": "Not Found" }
```

---

### 4.8 Update Site Status

```
PATCH /sites/:siteId/status
Permission: sites.update
@Auditable (module: SITES)
```

#### Path Parameter

| Param    | Type   | Notes   |
| -------- | ------ | ------- |
| `siteId` | `uuid` | Site ID |

#### Request Body

```json
{ "status": "UNDER_MAINTENANCE" }
```

| Field    | Type              | Required | Notes                                                           |
| -------- | ----------------- | -------- | --------------------------------------------------------------- |
| `status` | `SiteStatus` enum | Yes      | `ACTIVE`, `INACTIVE`, `QUARANTINE`, `UNDER_MAINTENANCE`, `FULL` |

#### Validation Error `400 Bad Request`

```json
{ "message": "status must be one of: ACTIVE, INACTIVE, QUARANTINE, UNDER_MAINTENANCE, FULL" }
```

#### Response `200 OK`

Returns the updated site (`SITE_SELECT` shape — same fields as 4.4 list item, with `location`).

#### Error `404 Not Found`

```json
{ "statusCode": 404, "message": "Site with ID: \"<siteId>\" not found", "error": "Not Found" }
```

---

### 4.9 Update Site

```
PATCH /sites/:siteId
Permission: sites.update
@Auditable (module: SITES)
```

#### Path Parameter

| Param    | Type   | Notes   |
| -------- | ------ | ------- |
| `siteId` | `uuid` | Site ID |

#### Request Body — `UpdateSiteDto` (all `CreateSiteDto` fields, optional)

```json
{
  "name": "Main Warehouse - North Wing",
  "totalCapacity": 6000,
  "parentId": "44444444-4444-4444-4444-444444444444"
}
```

#### Business Rules / Validation

- `parentId === siteId` → rejected:
  ```json
  { "statusCode": 400, "message": "A site cannot be its own parent", "error": "Bad Request" }
  ```
- New `parentId` must exist:
  ```json
  { "statusCode": 404, "message": "Site with ID \"<parentId>\" not found", "error": "Not Found" }
  ```
- Setting `parentId` to one of the site's own descendants is rejected (circular hierarchy check):
  ```json
  {
    "statusCode": 400,
    "message": "Cannot set a descendant as parent — circular hierarchy detected",
    "error": "Bad Request"
  }
  ```
- Duplicate `name`/`code`:
  ```json
  { "statusCode": 409, "message": "Duplicate value for: name", "error": "Conflict" }
  ```

#### Response `200 OK`

Returns the updated site (`SITE_SELECT` shape, with `location`).

#### Error `404 Not Found`

```json
{ "statusCode": 404, "message": "Site with ID: \"<siteId>\" not found", "error": "Not Found" }
```

---

### 4.10 Delete (Deactivate) Site

```
DELETE /sites/:siteId
Permission: sites.delete
@Auditable (module: SITES)
```

**Soft-delete only** — sets `status = INACTIVE`. The row remains and is still returned by `findAll`/`findOne` (filter by `status=INACTIVE` to find deactivated sites), but is excluded from `tree`, `children`, and `dropdown`.

#### Path Parameter

| Param    | Type   | Notes   |
| -------- | ------ | ------- |
| `siteId` | `uuid` | Site ID |

#### Response `200 OK`

```json
{ "message": "Site marked as inactive" }
```

> Note: this route returns `HttpStatus.OK` (200), not the default `204` for `DELETE`.

#### Error `404 Not Found`

```json
{ "statusCode": 404, "message": "Site with ID: \"<siteId>\" not found", "error": "Not Found" }
```

---

## 5. Error Responses

All endpoints follow standard NestJS HTTP exception shapes.

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "...",
  "error": "Bad Request"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden (missing permission)

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Site with ID: \"<siteId>\" not found",
  "error": "Not Found"
}
```

### 409 Conflict (duplicate `name`/`code`)

```json
{
  "statusCode": 409,
  "message": "Duplicate value for: <field>",
  "error": "Conflict"
}
```

---

## 6. Frontend Implementation Notes

### Site picker / dropdown

- Use `GET /sites/dropdown` for any "select a site" input — it's pre-filtered to `ACTIVE` only and returns minimal fields (`id`, `name`, `code`, `type`, `status`, `parentId`).
- For a hierarchical picker (e.g. nested select / tree-select), use `GET /sites/tree` instead and render `children` recursively.

### Site Management Screen

- `GET /sites` for the main paginated table — filter by `type`, `category`, `status`, search by name/code/description.
- "Create Site" form:
  - `code` is auto-uppercased server-side — you can show it uppercased live in the UI for clarity, but don't need to enforce it client-side.
  - `parentId` should be populated from `GET /sites/tree` or `/sites/dropdown` (exclude the site being edited and its descendants when editing — though the backend also enforces this via the circular-hierarchy check).
  - `locationId` should come from a separate Locations picker (not covered by this module).
  - Show `category`/`type`/`capacityUnit`/`status` as enum dropdowns using the values in [Section 3](#3-enums--constants).

### Status Colors (suggested)

| Status              | Color        | Meaning                                          |
| ------------------- | ------------ | ------------------------------------------------ |
| `ACTIVE`            | Green        | Normal operation                                 |
| `INACTIVE`          | Gray         | Deactivated — hidden from tree/children/dropdown |
| `QUARANTINE`        | Amber/Orange | Site itself restricted (e.g. pending audit)      |
| `UNDER_MAINTENANCE` | Blue         | Temporarily unavailable                          |
| `FULL`              | Red          | At capacity, avoid routing new stock here        |

### Typical Screen Flows

**Site Hierarchy / Org Chart View**

- `GET /sites/tree` → render as an expandable tree (warehouses → zones → units → ...)
- Clicking a node → `GET /sites/:siteId` for full detail (parent + children)

**Breadcrumb Navigation**

- `GET /sites/:siteId/ancestors` to render `Root > ... > Parent` breadcrumb above the current site's detail view

**Site Detail Screen**

- `GET /sites/:siteId` for header info + `parent` link + `children` list
- `GET /sites/:siteId/children` if you need a paginated/separate children view (same data, standalone)
- Status change dropdown → `PATCH /sites/:siteId/status`
- Edit form → `PATCH /sites/:siteId`
- Deactivate button → `DELETE /sites/:siteId` (confirm first — this affects any module that filters by `status: ACTIVE`, e.g. dropdowns elsewhere in the app)

**Capacity / Environment Monitoring Widget**

- `totalCapacity` + `capacityUnit`, `temperature`, `humidity` are available on every site response — useful for cold-storage dashboards (e.g. flag sites where `temperature` is outside an expected range)

### Cross-module references

Sites are referenced by:

- `RawMaterialBatch.siteId` — see [raw-material-batches-api.md](./raw-material-batches-api.md)
- `WasteManagement.siteId` — see [waste-management-api.md](./waste-management-api.md)

When building forms in those modules, use `GET /sites/dropdown` (optionally filtered client-side by `category`, e.g. only show `RAW_MATERIAL`/`QUARANTINE` sites for raw material batch placement).
</content>

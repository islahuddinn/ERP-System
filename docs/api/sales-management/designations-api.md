# Designations Module — Frontend API Reference

> **Purpose**: Complete API reference for the Designations module (`hr_designations` table) — a self-referencing hierarchy of job titles (e.g. "Area Sales Manager" → "Sales Officer") assigned to employees via `EmployeeContract.designationId`.
> **Audience**: Frontend developers building the Designation list/tree/create/edit screens and the designation picker used on employee contract forms (including sales-force employees like Sales Officers / Distributors' staff).
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. **All response examples in this document show the inner `data` payload only.**

> **Note on module ownership**: this module physically lives under the HR domain (`src/hr/designation`, base path `hr/designations`, permission namespace `hr-designations.*`) — it is documented here because Designation is the shared job-title hierarchy used across the org, including sales-force roles. It is **not** a sales-management-specific module and does not have its own `sales-*` permission namespace.

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Designation API](#designation-api)
   - [List Designations (paginated)](#1-list-designations-paginated)
   - [Designations Dropdown](#2-designations-dropdown)
   - [Get Designation Tree](#3-get-designation-tree)
   - [Get Single Designation](#4-get-single-designation)
   - [Create Designation](#5-create-designation)
   - [Update Designation](#6-update-designation)
   - [Delete Designation](#7-delete-designation)
5. [Error Responses](#error-responses)
6. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

`Designation` is self-referencing: `parentDesignationId → Designation.id`, with `childDesignations` as the reverse relation. Any designation can be a root (no parent) or nested under another, to any depth.

| Sub-module | Base Path | Description |
| ---------- | --------- | ------------ |
| Designations | `/hr/designations` | CRUD for designations + hierarchy tree + employee-count rollups |

### Designation Rules

- `title` is unique — attempting to create/update with a duplicate `title` returns `409 Conflict`.
- A designation **cannot be its own parent** (`parentDesignationId === designationId` on update) → `400 Bad Request`.
- Setting `parentDesignationId` (create or update) validates the referenced parent exists → `404 Not Found` ("Designation not found") if not.
- On update, sending `parentDesignationId: null` **disconnects** the parent (promotes the designation to root level). Sending `""` (empty string, e.g. a cleared select) is treated as "field not provided" and leaves the parent unchanged — it does **not** disconnect. Use explicit `null` to clear it.
- A designation **cannot be deleted** while:
  1. It has any employee with an `ACTIVE` or `DRAFT` contract assigned to it, or
  2. It has any child designation.
  Both checks run before delete — see [Delete Designation](#7-delete-designation).
- **`employeeCount`** is not raw contract rows — it's the count of **distinct employees** with a currently `ACTIVE` contract at that designation (an employee can have multiple historical contracts, only one `ACTIVE`).

---

## Permissions

| Permission Key | What it guards |
| --------------- | ---------------- |
| `hr-designations.view` | List designations, dropdown, hierarchy tree, view a single designation |
| `hr-designations.manage` | Create, update, and delete designations |

---

## Enums & Constants

This module has no dedicated enum — `parentDesignationId` is a plain nullable UUID string.

### Audit Behavior

`POST`/`PATCH`/`DELETE` all carry `@Auditable({ module: AuditModule.HR_DESIGNATIONS })`. `POST`/`PATCH` return the full updated `Designation` entity (including `employeeCount`); `DELETE` returns only `{ message }`.

---

## Designation API

### 1. List Designations (Paginated)

```
GET /hr/designations
Permission: hr-designations.view
```

#### Query Parameters

| Param | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| `page` | `number` | `1` | Min 1, Max 100 |
| `limit` | `number` | `10` | Min 1, Max 100 |
| `search` | `string` | — | Case-insensitive `contains` match on `title` **and** `description` |
| `sortBy` | `string` | — | One of `title`, `createdAt`, `updatedAt`, `parent.title`, `contracts._count`. Any other value (or omitted) falls back to `title` ascending. |
| `sortOrder` | `"ASC"` \| `"DESC"` | `DESC` | Only applied when `sortBy` is whitelisted. |

> There is no `status` filter — designations have no active/inactive concept.

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
      "title": "Sales Officer",
      "description": "Frontline order-booking role reporting to an Area Sales Manager",
      "parentDesignationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "createdAt": "2026-07-01T10:00:00.000Z",
      "updatedAt": "2026-07-01T10:00:00.000Z",
      "parent": { "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "title": "Area Sales Manager" },
      "_count": { "contracts": 6 },
      "employeeCount": 5
    }
  ],
  "meta": { "total": 12, "page": 1, "limit": 10, "totalPages": 2, "hasNext": true, "hasPrev": false }
}
```

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `uuid` | |
| `title` | `string` | Unique |
| `description` | `string \| null` | |
| `parentDesignationId` | `uuid \| null` | |
| `createdAt`/`updatedAt` | `ISO datetime` | |
| `parent` | `{ id, title } \| null` | Narrowed parent object, not the full record |
| `_count.contracts` | `number` | **Raw** contract row count (all statuses, historical included) — not the same as `employeeCount` |
| `employeeCount` | `number` | Distinct employees with an `ACTIVE` contract — use this for headcount display, not `_count.contracts` |

---

### 2. Designations Dropdown

```
GET /hr/designations/dropdown
Permission: hr-designations.view
```

Returns **all** designations (no `status` filter — none exists — and no pagination), ordered by `title` ascending.

#### Response `200 OK`

```json
[
  {
    "id": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
    "title": "Sales Officer",
    "parentDesignationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
]
```

> Unlike the territory-hierarchy dropdowns, this one is **not** filterable by parent — it always returns the full flat list. Build parent/child grouping client-side using `parentDesignationId`, or use the [tree endpoint](#3-get-designation-tree) instead.

---

### 3. Get Designation Tree

```
GET /hr/designations/tree
Permission: hr-designations.view
```

Returns the **entire** hierarchy as a nested array of root designations (no `designationId` path param — this returns the whole forest in one call, not a single subtree).

#### Response `200 OK`

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Area Sales Manager",
    "description": null,
    "parentDesignationId": null,
    "createdAt": "2026-07-01T10:00:00.000Z",
    "updatedAt": "2026-07-01T10:00:00.000Z",
    "_count": { "contracts": 2 },
    "employeeCount": 2,
    "children": [
      {
        "id": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
        "title": "Sales Officer",
        "description": "Frontline order-booking role reporting to an Area Sales Manager",
        "parentDesignationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "createdAt": "2026-07-01T10:00:00.000Z",
        "updatedAt": "2026-07-01T10:00:00.000Z",
        "_count": { "contracts": 6 },
        "employeeCount": 5,
        "children": []
      }
    ]
  }
]
```

> Nodes are **not** sorted by `title` within the tree the way the territory-hierarchy `/tree` endpoints are — they come back in whatever order `findMany` with `orderBy: { title: "asc" }` on the flat query produces, then get re-nested. In practice this means root nodes and each sibling group are alphabetical by `title`, since the flat list itself is ordered that way before the parent/child grouping pass runs.

---

### 4. Get Single Designation

```
GET /hr/designations/:designationId
Permission: hr-designations.view
```

#### Path Parameter

| Param | Type | Notes |
| ----- | ---- | ----- |
| `designationId` | `uuid` | Validated with `ParseUUIDPipe` |

#### Response `200 OK`

```json
{
  "id": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
  "title": "Sales Officer",
  "description": "Frontline order-booking role reporting to an Area Sales Manager",
  "parentDesignationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "createdAt": "2026-07-01T10:00:00.000Z",
  "updatedAt": "2026-07-01T10:00:00.000Z",
  "parent": { "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "title": "Area Sales Manager" },
  "childDesignations": [],
  "employeeCount": 5
}
```

Note the detail shape differs slightly from the list shape: it includes `childDesignations: { id, title }[]` (direct children only, not recursive) instead of `_count.contracts`.

#### Response `404 Not Found`

```json
{ "statusCode": 404, "message": "Designation not found", "error": "Not Found" }
```

---

### 5. Create Designation

```
POST /hr/designations
Permission: hr-designations.manage
Audit: @Auditable({ module: AuditModule.HR_DESIGNATIONS })
```

#### Request Body

```json
{
  "title": "Sales Officer",
  "description": "Frontline order-booking role reporting to an Area Sales Manager",
  "parentDesignationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `title` | `string` | Yes | `@IsString() @IsNotEmpty() @MaxLength(128)`, trimmed. Unique. |
| `description` | `string` | No | `@MaxLength(256)`, trimmed. |
| `parentDesignationId` | `uuid \| null` | No | Must reference an existing designation if provided. Omit for a root-level designation. |

#### Response `201 Created`

Same shape as [Get Single Designation](#4-get-single-designation), with `employeeCount: 0`.

#### Validation Errors `400 Bad Request`

```json
{ "message": ["title should not be empty"] }
{ "message": ["parentDesignationId must be a UUID"] }
```

#### Not Found `404 Not Found` (parent doesn't exist)

```json
{ "statusCode": 404, "message": "Designation not found", "error": "Not Found" }
```

#### Conflict Error `409 Conflict`

```json
{ "message": "A designation with this title already exists" }
```

---

### 6. Update Designation

```
PATCH /hr/designations/:designationId
Permission: hr-designations.manage
Audit: @Auditable({ module: AuditModule.HR_DESIGNATIONS })
```

All fields optional. Sending `parentDesignationId: null` re-parents the designation to root; omitting it leaves the parent unchanged.

#### Request Body

```json
{ "title": "Senior Sales Officer" }
```

#### Response `200 OK`

Full updated designation (same shape as [Get Single Designation](#4-get-single-designation)).

#### Validation Error `400 Bad Request` (self-parenting)

```json
{ "message": "Designation cannot be its own parent" }
```

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Designation not found", "error": "Not Found" }
```

or, for an invalid `parentDesignationId`:

```json
{ "statusCode": 404, "message": "Designation not found", "error": "Not Found" }
```

> Both the "designation itself not found" and "parent designation not found" cases share the exact same message — the frontend cannot distinguish them from the response body alone. If you need to tell them apart, check which ID in your request matches the resource path vs. the body before showing an error.

#### Conflict Error `409 Conflict`

```json
{ "message": "A designation with this title already exists" }
```

---

### 7. Delete Designation

```
DELETE /hr/designations/:designationId
Permission: hr-designations.manage
Audit: @Auditable({ module: AuditModule.HR_DESIGNATIONS })
```

**Business Rules (checked in this order):**

1. Designation must exist, or `404 Not Found`.
2. If any `EmployeeContract` with status `ACTIVE` or `DRAFT` references this designation → `400 Bad Request` ("employees assigned").
3. If any other `Designation` has `parentDesignationId` pointing to this one → `400 Bad Request` ("sub-designations").
4. Otherwise, hard-deleted.

#### Response `200 OK`

```json
{ "message": "Designation deleted successfully" }
```

#### Validation Errors `400 Bad Request`

```json
{ "message": "Cannot delete a designation that has employees assigned to it" }
```

```json
{ "message": "Cannot delete a designation that has sub-designations. Reassign or delete them first" }
```

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Designation not found", "error": "Not Found" }
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
{ "statusCode": 404, "message": "Designation not found", "error": "Not Found" }
```

### 409 Conflict (duplicate title)

```json
{ "statusCode": 409, "message": "A designation with this title already exists", "error": "Conflict" }
```

---

## Frontend Implementation Notes

### Screen Flows

**Designation List Screen**

- `GET /hr/designations` with pagination + `search` (title + description) — no `status` filter exists for this module.
- Sortable columns: `title`, `createdAt`, `updatedAt`, and the relation-backed `parent.title` / `contracts._count`.
- Display `employeeCount`, not `_count.contracts`, if showing a headcount column — the latter includes historical/draft contracts and can overstate current staffing.

**Hierarchy / Org-Chart Screen**

- `GET /hr/designations/tree` returns the whole forest in one call — use it to render an expandable tree, same pattern as the sales territory hierarchy tree views.
- Each node already carries `employeeCount`, so no extra per-node request is needed.

**Create / Edit Designation Screen**

- Parent picker: populate from `GET /hr/designations/dropdown` (flat list — group by `parentDesignationId` client-side if you want an indented select, or reuse the tree endpoint for a nested picker).
- To promote a designation to root on edit, explicitly send `parentDesignationId: null` — leaving the field out of the PATCH body keeps the existing parent.
- Guard client-side against selecting the designation itself as its own parent (the API also rejects it, but catching it before the request avoids a round-trip).
- Surface `409` inline on `title`.

**Delete Action**

- `DELETE /hr/designations/:id` — block the button (or let the `400` surface) when `employeeCount > 0` or the node has `children`/`childDesignations` — both are already visible from the list/detail/tree responses without an extra request.

**Employee Contract Form Integration**

- The designation picker on an employee/sales-force contract form should use the same `GET /hr/designations/dropdown` (or tree, for a nested picker) — `EmployeeContract.designationId` is what this module's delete guard checks against.

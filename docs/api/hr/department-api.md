# Department Module — Frontend API Reference

> **Purpose**: Complete API reference for the HR Department module (organizational hierarchy of departments).
> **Audience**: Frontend developers building the Department list, tree, create/edit, and detail screens.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. All Prisma `Decimal` values are auto-converted to JS numbers by this interceptor. **All response examples in this document show the inner `data` payload only.**

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Department API](#department-api)
   - [List Departments (paginated)](#1-list-departments-paginated)
   - [Departments Dropdown](#2-departments-dropdown)
   - [Get Department Tree](#3-get-department-tree)
   - [Get Single Department](#4-get-single-department)
   - [Create Department](#5-create-department)
   - [Update Department](#6-update-department)
   - [Delete Department](#7-delete-department)
5. [Error Responses](#error-responses)
6. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

The Department module manages a self-referencing hierarchy of organizational departments (`Department.parentDepartmentId → Department.id`, relation name `DeptHierarchy` in the Prisma schema). Each department can have:

- One optional **parent** department (`parent`).
- Zero or more **child** departments (`childDepartments`).
- Zero or more linked `EmployeeContract` records (`contracts`) — this is how a department is "assigned" to employees. There is no direct `Employee` relation on `Department`; the link is through the employee's **contract**.

| Sub-module | Base Path            | Description                                              |
| ---------- | --------------------- | --------------------------------------------------------- |
| Departments | `/hr/departments`     | CRUD for departments + hierarchy tree view                |

> **Note**: This doc covers only the `Department` entity itself. `EmployeeContract`/`Employee` and `Position` have their own dedicated API docs — reference department/position by `id`/`name` only from those screens, do not duplicate their full shapes here.

### Department Hierarchy Rules

- A department may optionally have a `parentDepartmentId` pointing to another department, forming a tree.
- A department **cannot be its own parent** (`parentDepartmentId === departmentId` is rejected on update).
- A department **cannot be deleted** if it has employees assigned (via `EmployeeContract` with status `ACTIVE` or `DRAFT`) or if it has sub-departments — see [Delete Department](#7-delete-department).
- `name` is **globally unique** (`@unique` in the Prisma schema) — creating/updating with a duplicate name returns `409 Conflict`.

---

## Permissions

| Permission Key        | What it guards                                                         |
| ---------------------- | ------------------------------------------------------------------------ |
| `hr.view`              | List departments, view the department tree, view a single department  |
| `hr.manage_employees`  | Create, update, and delete departments                                  |

> **Note**: There is no dedicated `departments.*` permission namespace — the Department module currently reuses the shared `hr.view` / `hr.manage_employees` keys from `hr.permissions.ts`. This is an existing exception to the "each module owns its permission namespace" convention; verify with backend before assuming a future dedicated `departments.*` permission will be introduced.

---

## Enums & Constants

The `Department` entity itself has **no enum fields**. There is no `DepartmentStatus` or similar — a department is either present or deleted (hard delete, no soft-delete flag on the model).

### Audit Behavior

> **Note**: Only the **Update Department** route carries the `@Auditable({ module: AuditModule.HR_DEPARTMENTS })` decorator in the current controller code. **Create** and **Delete** routes do **not** have `@Auditable` applied, so creating or deleting a department is not currently written to the audit log. This is the actual state of the code as of this writing — flag to backend if audit coverage for create/delete is expected.

---

## Department API

### 1. List Departments (Paginated)

```
GET /hr/departments
Permission: hr.view
```

Returns a flat (non-hierarchical), paginated, alphabetically-sorted list of departments. For the nested hierarchy, use [Get Department Tree](#3-get-department-tree) instead.

#### Query Parameters

| Param       | Type                | Default | Notes                                                                                                    |
| ----------- | ------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| `page`      | `number`            | `1`     | Min 1, Max 100                                                                                            |
| `limit`     | `number`            | `10`    | Min 1, Max 100                                                                                            |
| `search`    | `string`            | —       | Case-insensitive `contains` match on `name` only                                                          |
| `sortBy`    | `string`            | `name` (asc) | One of `name`, `createdAt`, `updatedAt`. Any other value falls back to the default `name` ascending (no error). |
| `sortOrder` | `"ASC"` \| `"DESC"` | `DESC` when `sortBy` is set | Applied only when `sortBy` is a valid sortable field. |

> **Note**: `sortBy` is whitelisted server-side (`name`, `createdAt`, `updatedAt`). An unrecognized value silently falls back to the default `name` A→Z rather than erroring.

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
      "name": "Engineering",
      "description": "Product engineering and R&D",
      "parentDepartmentId": null,
      "createdAt": "2026-06-01T10:00:00.000Z",
      "updatedAt": "2026-06-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "limit": 10,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

> **Note**: The list endpoint returns the **raw `Department` model fields only** — no `parent`, `childDepartments`, or `_count` (those are only included on the single-department detail shape; see [Get Single Department](#4-get-single-department)).

---

### 2. Departments Dropdown

```
GET /hr/departments/dropdown
Permission: hr.view
```

Returns **all** departments as a minimal, non-paginated list ordered by `name` ascending — intended for populating pickers (e.g. the parent-department selector, or the department picker in the Employee Contract form). `parentDepartmentId` is included so the frontend can render an indented/grouped hierarchy if desired. Departments have no active/deleted concept, so no filtering is applied.

#### Response `200 OK`

```json
[
  {
    "id": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
    "name": "Engineering",
    "parentDepartmentId": null
  },
  {
    "id": "a2b3c4d5-e6f7-8901-bcde-f12345678901",
    "name": "Backend",
    "parentDepartmentId": "d1e2f3a4-b5c6-7890-abcd-ef1234567890"
  }
]
```

| Field                | Type           | Notes                                        |
| -------------------- | -------------- | -------------------------------------------- |
| `id`                 | `uuid`         |                                              |
| `name`               | `string`       | Unique                                       |
| `parentDepartmentId` | `uuid \| null` | `null` for root-level departments            |

---

### 3. Get Department Tree

```
GET /hr/departments/tree
Permission: hr.view
```

Returns **all** departments (no pagination) assembled into a nested tree structure based on `parentDepartmentId`. Root-level departments (no parent, or a parent that doesn't exist in the result set) appear at the top level of the array; each node has a `children` array of its direct sub-departments.

#### Response `200 OK`

```json
[
  {
    "id": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
    "name": "Engineering",
    "description": "Product engineering and R&D",
    "parentDepartmentId": null,
    "createdAt": "2026-06-01T10:00:00.000Z",
    "updatedAt": "2026-06-01T10:00:00.000Z",
    "children": [
      {
        "id": "a2b3c4d5-e6f7-8901-bcde-f12345678901",
        "name": "Backend",
        "description": "Backend services team",
        "parentDepartmentId": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
        "createdAt": "2026-06-02T10:00:00.000Z",
        "updatedAt": "2026-06-02T10:00:00.000Z",
        "children": []
      }
    ]
  }
]
```

> **Note**: Every node — including root nodes — carries all raw `Department` fields plus a `children` array. There is no depth limit; the tree can be arbitrarily deep. The endpoint fetches **all** departments unfiltered (no `search`/pagination), so for very large department counts, consider caching this client-side rather than re-fetching on every screen.

---

### 4. Get Single Department

```
GET /hr/departments/:departmentId
Permission: hr.view
```

Returns a single department with its parent (name only), direct child departments (name only), and a count of linked employee contracts.

#### Path Parameter

| Param          | Type   | Notes         |
| -------------- | ------ | ------------- |
| `departmentId` | `uuid` | Department ID |

#### Response `200 OK`

```json
{
  "id": "a2b3c4d5-e6f7-8901-bcde-f12345678901",
  "name": "Backend",
  "description": "Backend services team",
  "parentDepartmentId": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
  "createdAt": "2026-06-02T10:00:00.000Z",
  "updatedAt": "2026-06-02T10:00:00.000Z",
  "parent": {
    "id": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
    "name": "Engineering"
  },
  "childDepartments": [
    {
      "id": "b3c4d5e6-f7a8-9012-cdef-123456789012",
      "name": "Platform Team"
    }
  ],
  "_count": {
    "contracts": 8
  }
}
```

| Field                  | Type              | Notes                                                                                       |
| ----------------------- | ----------------- | --------------------------------------------------------------------------------------------- |
| `id`                    | `uuid`            |                                                                                               |
| `name`                  | `string`          | Unique                                                                                       |
| `description`           | `string \| null`  |                                                                                               |
| `parentDepartmentId`    | `uuid \| null`    |                                                                                               |
| `createdAt`/`updatedAt` | `ISO datetime`    |                                                                                               |
| `parent`                | `{ id, name } \| null` | Only `id`/`name` selected — no full parent entity                                       |
| `childDepartments`      | `{ id, name }[]`  | Direct children only (one level down) — only `id`/`name` selected                           |
| `_count.contracts`      | `number`          | Total `EmployeeContract` rows linked to this department (**not** filtered by contract status — includes all statuses, unlike the delete-blocking check which only counts `ACTIVE`/`DRAFT`) |

#### Response `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Department not found",
  "error": "Not Found"
}
```

---

### 5. Create Department

```
POST /hr/departments
Permission: hr.manage_employees
```

Creates a new department. Not decorated with `@Auditable` — see [Audit Behavior](#audit-behavior) note above.

#### Request Body

```json
{
  "name": "Backend",
  "description": "Backend services team",
  "parentDepartmentId": "d1e2f3a4-b5c6-7890-abcd-ef1234567890"
}
```

| Field                 | Type     | Required | Notes                                                                 |
| ---------------------- | -------- | -------- | ------------------------------------------------------------------------ |
| `name`                 | `string` | Yes      | `@IsString() @IsNotEmpty() @MaxLength(128)` — must be unique             |
| `description`          | `string` | No       | `@IsString() @MaxLength(256)`                                           |
| `parentDepartmentId`   | `uuid`   | No       | `@IsUUID()` — must reference an existing department; omit for a root-level department |

#### Response `201 Created`

Same shape as [Get Single Department](#4-get-single-department) (includes `parent`, `childDepartments`, `_count.contracts`) — for a brand-new department, `childDepartments` will be `[]` and `_count.contracts` will be `0`.

```json
{
  "id": "a2b3c4d5-e6f7-8901-bcde-f12345678901",
  "name": "Backend",
  "description": "Backend services team",
  "parentDepartmentId": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
  "createdAt": "2026-06-02T10:00:00.000Z",
  "updatedAt": "2026-06-02T10:00:00.000Z",
  "parent": {
    "id": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
    "name": "Engineering"
  },
  "childDepartments": [],
  "_count": {
    "contracts": 0
  }
}
```

#### Validation Errors `400 Bad Request`

```json
{ "message": ["name should not be empty", "name must be a string"] }
{ "message": ["parentDepartmentId must be a UUID"] }
```

#### Conflict Error `409 Conflict`

```json
{ "message": "A department with this name already exists" }
```

> This comes from `handlePrismaUniqueError(error, "A department with this name already exists")`, triggered on a Prisma `P2002` unique-constraint violation on `name`.

---

### 6. Update Department

```
PATCH /hr/departments/:departmentId
Permission: hr.manage_employees
Audit: @Auditable({ module: AuditModule.HR_DEPARTMENTS })
```

Updates `name`, `description`, and/or `parentDepartmentId`. All fields optional (partial update).

**Business Rules:**

- A department cannot be set as its own parent — `parentDepartmentId === departmentId` is rejected.
- Passing `parentDepartmentId: null` explicitly **disconnects** the parent (department becomes root-level). Omitting the field leaves the existing parent unchanged.
- `name` uniqueness is enforced the same way as create.

#### Path Parameter

| Param          | Type   | Notes                    |
| -------------- | ------ | ------------------------ |
| `departmentId` | `uuid` | Department ID to update  |

#### Request Body

```json
{
  "name": "Backend Engineering",
  "description": "Backend services and platform team",
  "parentDepartmentId": null
}
```

| Field                 | Type            | Required | Notes                                                                             |
| ---------------------- | --------------- | -------- | -------------------------------------------------------------------------------------- |
| `name`                 | `string`        | No       | `@IsString() @IsNotEmpty() @MaxLength(128)` (all `CreateDepartmentDto` validators still apply via `PartialType`, just optional) |
| `description`          | `string`        | No       | `@IsString() @MaxLength(256)`                                                     |
| `parentDepartmentId`   | `uuid \| null`  | No       | `@IsUUID()`; send `null` to detach from parent, omit to leave unchanged            |

#### Response `200 OK`

Full updated department (same shape as [Get Single Department](#4-get-single-department)).

#### Validation Errors `400 Bad Request`

```json
{ "message": "Department cannot be its own parent" }
```

#### Not Found `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Department not found",
  "error": "Not Found"
}
```

#### Conflict Error `409 Conflict`

```json
{ "message": "A department with this name already exists" }
```

---

### 7. Delete Department

```
DELETE /hr/departments/:departmentId
Permission: hr.manage_employees
```

Hard-deletes a department. **Blocked** if the department has employees assigned or has sub-departments.

**Business Rules (checked in this order):**

1. Department must exist, or `404 Not Found`.
2. If any `EmployeeContract` with `status` in `ACTIVE` or `DRAFT` references this `departmentId` → `400 Bad Request`.
3. If any other department has this department as `parentDepartmentId` (i.e. it has sub-departments) → `400 Bad Request`.
4. Otherwise, hard-deleted.

#### Path Parameter

| Param          | Type   | Notes                    |
| -------------- | ------ | ------------------------ |
| `departmentId` | `uuid` | Department ID to delete  |

#### Response `200 OK`

```json
{
  "message": "Department deleted successfully"
}
```

#### Validation Errors `400 Bad Request`

```json
{ "message": "Cannot delete a department that has employees assigned to it" }
{ "message": "Cannot delete a department that has sub-departments. Reassign or delete them first" }
```

#### Not Found `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Department not found",
  "error": "Not Found"
}
```

---

## Error Responses

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
  "message": "Department not found",
  "error": "Not Found"
}
```

### 409 Conflict (duplicate name)

```json
{
  "statusCode": 409,
  "message": "A department with this name already exists",
  "error": "Conflict"
}
```

---

## Frontend Implementation Notes

### Screen Flows

**Department List Screen**

- `GET /hr/departments` with pagination + `search` (name-only search).
- Sortable columns: `name`, `createdAt`, `updatedAt` (whitelisted server-side; unrecognized values fall back to `name` A→Z). Default order without `sortBy` is `name` ascending.

**Department Tree / Org Chart Screen**

- `GET /hr/departments/tree` — use this (not the paginated list) to render an expandable tree or org chart. No pagination, no search — fetch once and filter/search client-side if needed.
- Each node already contains its `children` array pre-nested — no further client-side tree-building required.

**Department Detail Screen**

- `GET /hr/departments/:id` — show `name`, `description`, parent breadcrumb (`parent.name`), a list of direct sub-departments (`childDepartments`), and an employee count badge (`_count.contracts`).
- Remember `_count.contracts` counts **all** contract statuses, so it may be non-zero even though the delete-guard (which only counts `ACTIVE`/`DRAFT`) would still allow deletion — don't rely on this count alone to disable the Delete button; call delete and surface the real error message instead, or replicate the same status filter if a pre-emptive disabled state is desired.

**Create / Edit Department Screen**

- `POST /hr/departments` to create; `PATCH /hr/departments/:id` to edit.
- Parent department picker: populate from `GET /hr/departments/dropdown` (flat, includes `parentDepartmentId` for indenting) or `GET /hr/departments/tree` (pre-nested hierarchical picker). Exclude the department itself (and ideally its own descendants, though the backend only rejects the exact self-parent case — choosing a descendant as parent is **not** blocked server-side and would create a cycle that the tree-builder does not detect/guard against).
- To detach a department from its parent during edit, send `parentDepartmentId: null` explicitly (omitting the field leaves the existing parent as-is).
- Surface the `409` duplicate-name error inline on the `name` field.

**Delete Action**

- `DELETE /hr/departments/:id` — only allow (or attempt) when the department has no assigned employees and no sub-departments; surface the specific `400` message returned if the guard fails, since the UI can't reliably pre-compute the `ACTIVE`/`DRAFT`-filtered employee count from the detail response alone.

> **Note**: Could not verify whether a separate `departments.*` permission set is planned to replace `hr.view`/`hr.manage_employees` — check with backend if the shared HR namespace is intentional long-term or a placeholder.

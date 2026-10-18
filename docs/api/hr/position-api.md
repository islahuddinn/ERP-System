# Position Module — Frontend API Reference

> **Purpose**: Complete API reference for the HR Position module — a simple lookup/master-data entity representing job titles that get assigned to employee contracts.
> **Audience**: Frontend developers building the Position list/create/edit screens (typically a settings/master-data section under HR).
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`). All routes are prefixed with `hr/positions`.
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. All Prisma `Decimal` values are auto-converted to JS numbers by this interceptor. **All response examples in this document show the inner `data` payload only.**

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Position API](#position-api)
   - [List Positions (paginated)](#1-list-positions-paginated)
   - [Positions Dropdown](#2-positions-dropdown)
   - [Get Single Position](#3-get-single-position)
   - [Create Position](#4-create-position)
   - [Update Position](#5-update-position)
   - [Delete Position](#6-delete-position)
5. [Error Responses](#error-responses)
6. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

A `Position` is a simple master-data record (job title + optional description) that is assigned to an `EmployeeContract` via `positionId`. The module is intentionally minimal — there is no status, no hierarchy, and no direct relation to `Department` on the `Position` model itself. The link to `Department`/`Employee` only exists indirectly, through `EmployeeContract` (which stores its own `positionId` and `departmentId`).

> **Note**: Do not assume a `Position` has a direct `departmentId` or salary-grade field — it does not exist in the schema. If a screen needs "positions in department X", that filter must go through the Employee/Contract module, not this one.

Key behaviors:

- `title` is **globally unique** (enforced at the DB level) — attempting to create/update to a title that already exists returns `409 Conflict`.
- A position **cannot be deleted** while it has any `EmployeeContract` in `ACTIVE` or `DRAFT` status referencing it (contracts in `EXPIRED`, `TERMINATED`, or `SUPERSEDED` status do not block deletion).
- The list endpoint (`GET /hr/positions`) does **not** return the employee/contract count — only the single-record endpoint (`GET /hr/positions/:positionId`) includes it, as `_count.contracts`.
- Deletes are hard deletes (no soft-delete flag on this model).

---

## Permissions

| Permission Key         | What it guards                                                                 |
| ----------------------- | ------------------------------------------------------------------------------ |
| `hr.view`               | List positions, get a single position                                         |
| `hr.manage_employees`   | Create, update, and delete positions                                          |

> Both keys are defined in `HR_PERMISSIONS` (`src/users/permissions/modules/hr.permissions.ts`) and are shared across other HR master-data endpoints (employees, departments) — the Position module does not define its own dedicated permission namespace.

---

## Enums & Constants

The `Position` model has no enum fields. There is no status field, no type field, and no dedicated constants beyond the standard pagination defaults below.

### Pagination Defaults (`PaginationDto`)

| Field       | Default   | Notes                                                                 |
| ----------- | --------- | ---------------------------------------------------------------------- |
| `page`      | `1`       | Min 1, Max 100                                                        |
| `limit`     | `10`      | Min 1, Max 100                                                        |
| `sortBy`    | `title` (asc) | Whitelisted: `title`, `createdAt`, `updatedAt` — see [List Positions](#1-list-positions-paginated). |
| `sortOrder` | `DESC`    | Applied only with a valid `sortBy`.                                   |

---

## Position API

### 1. List Positions (Paginated)

```
GET /hr/positions
Permission: hr.view
```

Lists all positions, always ordered by `title` ascending.

#### Query Parameters

| Param       | Type                | Default | Notes                                                                                     |
| ----------- | ------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `page`      | `number`            | `1`     | Min 1, Max 100                                                                             |
| `limit`     | `number`            | `10`    | Min 1, Max 100                                                                             |
| `search`    | `string`            | —       | Case-insensitive `contains` match on `title` only                                          |
| `sortBy`    | `string`            | `title` (asc) | One of `title`, `createdAt`, `updatedAt`. Any other value falls back to the default `title` ascending (no error). |
| `sortOrder` | `"ASC"` \| `"DESC"` | `DESC` when `sortBy` is set | Applied only when `sortBy` is a valid sortable field. |

> **Note**: `sortBy`/`sortOrder` are inherited from the shared `PaginationDto` and will be accepted by validation, but `PositionRepository.findAll` does not call `buildOrderBy` — results are always sorted by `title` ascending. Do not build a sortable column header for this list unless the backend is updated to honor these params.

#### Response `200 OK`

List items do **not** include `_count.contracts` (only the single-record endpoint does):

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "Software Engineer",
      "description": "Builds and maintains backend services",
      "createdAt": "2026-06-10T10:00:00.000Z",
      "updatedAt": "2026-06-10T10:00:00.000Z"
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

| Field         | Type                | Notes                                  |
| ------------- | ------------------- | ---------------------------------------- |
| `id`          | `uuid`               |                                         |
| `title`       | `string`             | Unique                                 |
| `description` | `string \| null`     |                                         |
| `createdAt`   | `ISO datetime string`|                                         |
| `updatedAt`   | `ISO datetime string`|                                         |
| `meta.total`      | `number`  | Total matching records                            |
| `meta.page`       | `number`  |                                                    |
| `meta.limit`      | `number`  |                                                    |
| `meta.totalPages` | `number`  | `Math.ceil(total / limit)`                        |
| `meta.hasNext`    | `boolean` | `page < totalPages`                               |
| `meta.hasPrev`    | `boolean` | `page > 1`                                        |

---

### 2. Positions Dropdown

```
GET /hr/positions/dropdown
Permission: hr.view
```

Returns **all** positions as a minimal, non-paginated list ordered by `title` ascending — intended for populating pickers (e.g. the position selector in the Employee Contract form). Positions have no active/deleted concept, so no filtering is applied.

#### Response `200 OK`

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Software Engineer"
  }
]
```

| Field   | Type     | Notes  |
| ------- | -------- | ------ |
| `id`    | `uuid`   |        |
| `title` | `string` | Unique |

---

### 3. Get Single Position

```
GET /hr/positions/:positionId
Permission: hr.view
```

Returns the position along with its assigned-employee count.

> Because `dropdown` is matched before `:positionId`, the literal path `/hr/positions/dropdown` never reaches this route.

#### Path Parameter

| Param        | Type   | Notes       |
| ------------ | ------ | ----------- |
| `positionId` | `uuid` | Position ID |

#### Response `200 OK`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Software Engineer",
  "description": "Builds and maintains backend services",
  "createdAt": "2026-06-10T10:00:00.000Z",
  "updatedAt": "2026-06-10T10:00:00.000Z",
  "_count": {
    "contracts": 4
  }
}
```

| Field               | Type                  | Notes                                                                                          |
| ------------------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| `id`                | `uuid`                |                                                                                                  |
| `title`             | `string`               | Unique                                                                                          |
| `description`       | `string \| null`       |                                                                                                  |
| `createdAt`         | `ISO datetime string` |                                                                                                  |
| `updatedAt`         | `ISO datetime string` |                                                                                                  |
| `_count.contracts`  | `number`               | Total `EmployeeContract` rows referencing this position (all statuses, not just active/draft) |

#### Response `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Position not found",
  "error": "Not Found"
}
```

---

### 4. Create Position

```
POST /hr/positions
Permission: hr.manage_employees
```

Creates a new position. Not audited (no `@Auditable` decorator on this route).

#### Request Body

```json
{
  "title": "Senior Software Engineer",
  "description": "Leads feature delivery and mentors junior engineers"
}
```

| Field         | Type     | Required | Notes                                                          |
| ------------- | -------- | -------- | ----------------------------------------------------------------- |
| `title`       | `string` | Yes      | `@IsString() @IsNotEmpty() @MaxLength(128)`. Must be globally unique. |
| `description` | `string` | No       | `@IsOptional() @IsString() @MaxLength(256)`                       |

#### Response `201 Created`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Senior Software Engineer",
  "description": "Leads feature delivery and mentors junior engineers",
  "createdAt": "2026-06-10T10:00:00.000Z",
  "updatedAt": "2026-06-10T10:00:00.000Z",
  "_count": {
    "contracts": 0
  }
}
```

#### Validation Errors `400 Bad Request` / `409 Conflict`

```json
{ "message": ["title should not be empty", "title must be shorter than or equal to 128 characters"] }
```

```json
{
  "statusCode": 409,
  "message": "A position with this title already exists",
  "error": "Conflict"
}
```

---

### 5. Update Position

```
PATCH /hr/positions/:positionId
Permission: hr.manage_employees
```

Updates `title` and/or `description`. This is the only route in the module decorated with `@Auditable({ module: AuditModule.HR_POSITIONS })` — it returns the full updated entity as required for the audit diff.

**Business Rules:**

- Position must exist, or `404 Not Found`.
- `title` must remain globally unique, or `409 Conflict`.
- Both fields are optional — only fields present in the body are updated (partial update).

#### Path Parameter

| Param        | Type   | Notes                  |
| ------------ | ------ | ------------------------ |
| `positionId` | `uuid` | Position ID to update |

#### Request Body

All fields optional (extends `CreatePositionDto` via `PartialType`, so the same validation rules apply per-field when present).

```json
{
  "title": "Staff Software Engineer",
  "description": "Updated description"
}
```

| Field         | Type     | Required | Notes                                                     |
| ------------- | -------- | -------- | ------------------------------------------------------------ |
| `title`       | `string` | No       | `@IsString() @MaxLength(128)` when present. Must stay unique. |
| `description` | `string` | No       | `@IsString() @MaxLength(256)` when present.                  |

#### Response `200 OK`

Full updated position, same shape as [Get Single Position](#3-get-single-position) (includes `_count.contracts`).

#### Errors `404 Not Found` / `409 Conflict`

```json
{ "statusCode": 404, "message": "Position not found", "error": "Not Found" }
```

```json
{ "statusCode": 409, "message": "A position with this title already exists", "error": "Conflict" }
```

---

### 6. Delete Position

```
DELETE /hr/positions/:positionId
Permission: hr.manage_employees
```

Hard-deletes a position. **Blocked if the position has any `EmployeeContract` with status `ACTIVE` or `DRAFT`.**

**Business Rules:**

- Position must exist, or `404 Not Found`.
- If any linked contract has status `ACTIVE` or `DRAFT`, deletion is rejected with `400 Bad Request`. Contracts in `EXPIRED`, `TERMINATED`, or `SUPERSEDED` status do **not** block deletion.

#### Path Parameter

| Param        | Type   | Notes                  |
| ------------ | ------ | ------------------------ |
| `positionId` | `uuid` | Position ID to delete |

#### Response `200 OK`

```json
{
  "message": "Position deleted successfully"
}
```

#### Errors `400 Bad Request` / `404 Not Found`

```json
{ "message": "Cannot delete a position that has employees assigned to it" }
```

```json
{ "statusCode": 404, "message": "Position not found", "error": "Not Found" }
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
  "message": "Position not found",
  "error": "Not Found"
}
```

### 409 Conflict (duplicate title)

```json
{
  "statusCode": 409,
  "message": "A position with this title already exists",
  "error": "Conflict"
}
```

---

## Frontend Implementation Notes

### List vs. Detail Shape

- The list endpoint (`GET /hr/positions`) returns **bare** position records — no `_count.contracts`. If a list screen needs to show "X employees" per row, either call the detail endpoint per row (not recommended for a list) or request a backend change; do not assume the field is present on list rows.
- The detail endpoint (`GET /hr/positions/:positionId`), and the `Create`/`Update` responses, all include `_count.contracts` — this is a **total** count across all contract statuses, not just active ones. It is not the same number used for the delete-block check (which filters to `ACTIVE`/`DRAFT` only).

### Delete Button Guard

- Before showing/enabling a "Delete" action, you can pre-check by inspecting whether the position is referenced by any `ACTIVE`/`DRAFT` contract — but there's no dedicated endpoint that exposes this breakdown, only `_count.contracts` (all statuses combined). The safest UX is to attempt the delete and surface the `400` error message ("Cannot delete a position that has employees assigned to it") if it fails, rather than trying to precompute eligibility client-side.

### Sorting

- Sortable columns: `title`, `createdAt`, `updatedAt` (whitelisted server-side). An unrecognized `sortBy` silently falls back to the default `title` A→Z rather than erroring. Without `sortBy`, the list is always `title` ascending.

### Uniqueness / Typeahead

- Because `title` is globally unique, consider debounced client-side validation (e.g., searching `GET /hr/positions?search=<title>` before submit) to give earlier feedback than waiting for the `409` on submit — but always still handle the `409` response, since a race is possible.

### Typical Screen Flows

**Position List / Master-Data Screen**

- `GET /hr/positions` with pagination + `search` (title only).
- "Add Position" → `POST /hr/positions`.
- Row click / "Edit" → `GET /hr/positions/:positionId` to load full detail (with count), then `PATCH /hr/positions/:positionId` to save.
- "Delete" → `DELETE /hr/positions/:positionId`; on `400`, surface the exact message returned (do not reword it) so the user understands it's blocked by assigned employees.

**Position Picker (e.g., inside Employee Contract form)**

- Use `GET /hr/positions/dropdown` — a dedicated, non-paginated endpoint returning `{ id, title }` for every position, sorted by title. For very large datasets or as-you-type filtering, the paginated `GET /hr/positions` with `search` is still available.

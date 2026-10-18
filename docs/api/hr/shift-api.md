# Shift Module — Frontend API Reference

> **Purpose**: Complete API reference for the HR Shift module — defining, listing, and assigning work shifts.
> **Audience**: Frontend developers building the Shift list/detail/create/edit screens (and the shift dropdown used elsewhere, e.g. Employee create/edit).
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. All Prisma `Decimal` values are auto-converted to JS numbers by this interceptor. **All response examples in this document show the inner `data` payload only.**

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Shifts API](#shifts-api)
   - [List Shifts (paginated)](#1-list-shifts-paginated)
   - [Shifts Dropdown](#2-shifts-dropdown)
   - [Get Single Shift](#3-get-single-shift)
   - [Create Shift](#4-create-shift)
   - [Update Shift](#5-update-shift)
   - [Delete Shift](#6-delete-shift)
5. [Error Responses](#error-responses)
6. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

The Shift module manages the master list of work shifts that `Employee` records and `Roster`/`Attendance` records reference by `shiftId`.

| Sub-module | Base Path    | Description                                                  |
| ---------- | ------------ | -------------------------------------------------------------- |
| Shifts     | `/hr/shifts` | Create and manage shift definitions (name, times, grace period) |

A `Shift` is a simple, standalone entity — it does **not** have its own status flow or lifecycle. Its only side-effects are guard rails on deletion (see [Delete Shift](#6-delete-shift)).

> This doc references `Employee` only by ID/name (via the `employees` count and the `Employee.shiftId` relation) — see the Employee module's own API reference for the full Employee API.

### Shift Types

- **`FIXED`** — has a strict clock-in/clock-out window. Late arrivals are tracked using `graceMinutes` (minutes of tolerance after `startTime` before the employee is marked late).
- **`FLEXIBLE`** — only total hours worked matter; there is no late/early concept, and `graceMinutes` has no effect.

> **Note**: could not verify — the exact logic that *uses* `graceMinutes`/`type` to compute lateness lives in the Attendance module, not in the Shift module itself. Check the Attendance API reference for how these fields are consumed.

### Crossing Midnight

- `crossesMidnight` (boolean, default `false`) should be set `true` for shifts like `22:00–06:00` where `endTime` is numerically earlier than `startTime`. The Shift module itself does not validate that `startTime`/`endTime` are consistent with this flag — it is a plain boolean flag stored as-is.

---

## Permissions

| Permission Key   | What it guards                                      |
| ---------------- | ---------------------------------------------------- |
| `shifts.view`    | List/view shifts (list, dropdown, get single shift)  |
| `shifts.manage`  | Create, update, and delete shifts                    |

Defined in `src/users/permissions/modules/shifts.permissions.ts` and spread into `PERMISSIONS` in `permission.definitions.ts`.

---

## Enums & Constants

### `ShiftType`

```
FIXED     — fixed clock-in/out window; late tracking via graceMinutes
FLEXIBLE  — only total hours worked matter; no late/early concept
```

### Time Format

- `startTime` / `endTime` are plain strings in `"HH:MM"` 24-hour format (e.g. `"10:00"`, `"19:00"`), validated server-side against the regex `^([01]\d|2[0-3]):[0-5]\d$`.
- They are **not** `DateTime` values — no timezone or date component is stored.

### Grace Minutes

- `graceMinutes` is an integer, `0`–`120`, defaulting to `0`. Relevant only for `FIXED` shifts (per the field's intent — not enforced server-side that `FLEXIBLE` shifts have `graceMinutes = 0`).

---

## Shifts API

### 1. List Shifts (Paginated)

```
GET /hr/shifts
Permission: shifts.view
```

#### Query Parameters

| Param       | Type                | Default     | Notes                                                                                                   |
| ----------- | ------------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| `page`      | `number`            | `1`         | Min 1, Max 100                                                                                             |
| `limit`     | `number`            | `10`        | Min 1, Max 100                                                                                             |
| `search`    | `string`            | —           | Searches `name` only (case-insensitive, partial match)                                                    |
| `type`      | `ShiftType`         | —           | Filter by `FIXED` or `FLEXIBLE`                                                                            |
| `sortBy`    | `string`            | `name` (asc) | One of `name`, `type`, `startTime`, `endTime`, `createdAt`, `updatedAt`. Any other value falls back to the default `name` ascending (no error). |
| `sortOrder` | `"ASC"` \| `"DESC"` | `DESC` when `sortBy` is set | Applied only when `sortBy` is a valid sortable field. |

> **Note**: `sortBy` is whitelisted server-side against the fields above. An unrecognized value silently falls back to `name` A→Z rather than erroring.

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "3f9c1a2e-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
      "name": "Morning Shift",
      "description": "Standard day shift",
      "type": "FIXED",
      "startTime": "09:00",
      "endTime": "17:00",
      "crossesMidnight": false,
      "graceMinutes": 15,
      "createdAt": "2026-06-10T10:00:00.000Z",
      "updatedAt": "2026-06-10T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 4,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

> **Note**: List items do **not** include the `_count.employees` field (no `include` is used for `findAll` — see repository). Only [Get Single Shift](#3-get-single-shift) includes the assigned employee count.

---

### 2. Shifts Dropdown

```
GET /hr/shifts/dropdown
Permission: shifts.view
```

Returns all shifts (no pagination), `id`/`name`/`type` only, ordered by `name` ascending. Intended for select/dropdown inputs (e.g. Employee create/edit, Roster assignment).

#### Response `200 OK`

```json
[
  {
    "id": "3f9c1a2e-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
    "name": "Morning Shift",
    "type": "FIXED"
  },
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Night Shift",
    "type": "FIXED"
  }
]
```

---

### 3. Get Single Shift

```
GET /hr/shifts/:shiftId
Permission: shifts.view
```

Returns the full shift record plus a count of employees currently assigned to it.

#### Path Parameter

| Param     | Type   | Notes    |
| --------- | ------ | -------- |
| `shiftId` | `uuid` | Shift ID |

#### Response `200 OK`

```json
{
  "id": "3f9c1a2e-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
  "name": "Morning Shift",
  "description": "Standard day shift",
  "type": "FIXED",
  "startTime": "09:00",
  "endTime": "17:00",
  "crossesMidnight": false,
  "graceMinutes": 15,
  "createdAt": "2026-06-10T10:00:00.000Z",
  "updatedAt": "2026-06-10T10:00:00.000Z",
  "_count": {
    "employees": 12
  }
}
```

#### Response `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Shift not found",
  "error": "Not Found"
}
```

---

### 4. Create Shift

```
POST /hr/shifts
Permission: shifts.manage
```

Creates a new shift. `name` must be unique across all shifts.

#### Request Body

```json
{
  "name": "Morning Shift",
  "description": "Standard day shift",
  "type": "FIXED",
  "startTime": "09:00",
  "endTime": "17:00",
  "crossesMidnight": false,
  "graceMinutes": 15
}
```

| Field             | Type        | Required | Notes                                                                                       |
| ----------------- | ----------- | -------- | --------------------------------------------------------------------------------------------- |
| `name`            | `string`    | Yes      | `@IsString() @IsNotEmpty() @MaxLength(64)` — must be unique                                    |
| `description`     | `string`    | No       | `@IsString() @MaxLength(256)`                                                                  |
| `type`             | `ShiftType` | Yes      | `@IsEnum(ShiftType)` — `FIXED` or `FLEXIBLE`                                                    |
| `startTime`        | `string`    | Yes      | `@IsString() @Matches(/^([01]\d\|2[0-3]):[0-5]\d$/)` — error message: `"startTime must be HH:MM in 24-hour format"` |
| `endTime`          | `string`    | Yes      | `@IsString() @Matches(/^([01]\d\|2[0-3]):[0-5]\d$/)` — error message: `"endTime must be HH:MM in 24-hour format"`   |
| `crossesMidnight` | `boolean`   | No       | `@IsBoolean()` — default `false` if omitted                                                    |
| `graceMinutes`    | `number`    | No       | `@IsInt() @Min(0) @Max(120)` — default `0` if omitted                                          |

#### Response `201 Created`

```json
{
  "id": "3f9c1a2e-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
  "name": "Morning Shift",
  "description": "Standard day shift",
  "type": "FIXED",
  "startTime": "09:00",
  "endTime": "17:00",
  "crossesMidnight": false,
  "graceMinutes": 15,
  "createdAt": "2026-06-10T10:00:00.000Z",
  "updatedAt": "2026-06-10T10:00:00.000Z",
  "_count": {
    "employees": 0
  }
}
```

#### Validation Errors `400 Bad Request`

```json
{ "message": ["name should not be empty", "type must be a valid enum value"] }
{ "message": ["startTime must be HH:MM in 24-hour format"] }
{ "message": ["endTime must be HH:MM in 24-hour format"] }
{ "message": ["graceMinutes must not be greater than 120"] }
```

#### Duplicate Name Error `409 Conflict`

```json
{
  "statusCode": 409,
  "message": "A shift with this name already exists",
  "error": "Conflict"
}
```

---

### 5. Update Shift

```
PATCH /hr/shifts/:shiftId
Permission: shifts.manage
```

Updates any subset of shift fields. All fields optional (`UpdateShiftDto` is `PartialType(CreateShiftDto)` — same validation rules as create, applied only to fields present in the body).

#### Path Parameter

| Param     | Type   | Notes             |
| --------- | ------ | ----------------- |
| `shiftId` | `uuid` | Shift ID to update |

#### Request Body

```json
{
  "name": "Morning Shift (Updated)",
  "graceMinutes": 10
}
```

| Field             | Type        | Required | Notes                                                    |
| ----------------- | ----------- | -------- | ----------------------------------------------------------- |
| `name`            | `string`    | No       | Same constraints as create; must remain unique               |
| `description`     | `string`    | No       | Same constraints as create                                   |
| `type`             | `ShiftType` | No       | `FIXED` or `FLEXIBLE`                                          |
| `startTime`        | `string`    | No       | `HH:MM` 24-hour format                                        |
| `endTime`          | `string`    | No       | `HH:MM` 24-hour format                                        |
| `crossesMidnight` | `boolean`   | No       |                                                              |
| `graceMinutes`    | `number`    | No       | `0`–`120`                                                    |

#### Response `200 OK`

Full updated shift (same shape as [Get Single Shift](#3-get-single-shift), including `_count.employees`).

#### Response `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Shift not found",
  "error": "Not Found"
}
```

#### Duplicate Name Error `409 Conflict`

```json
{
  "statusCode": 409,
  "message": "A shift with this name already exists",
  "error": "Conflict"
}
```

---

### 6. Delete Shift

```
DELETE /hr/shifts/:shiftId
Permission: shifts.manage
```

Hard-deletes a shift. **Blocked** if the shift is still referenced by any employee or attendance record.

**Business Rules (checked in this order):**

1. Shift must exist (`404` otherwise).
2. If any `Employee` has `shiftId` pointing to this shift → blocked.
3. If any `Attendance` record has `shiftId` pointing to this shift → blocked.

#### Path Parameter

| Param     | Type   | Notes             |
| --------- | ------ | ----------------- |
| `shiftId` | `uuid` | Shift ID to delete |

#### Response `200 OK`

```json
{
  "message": "Shift deleted successfully"
}
```

#### Response `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Shift not found",
  "error": "Not Found"
}
```

#### Validation Errors `400 Bad Request`

```json
{ "message": "Cannot delete a shift that has employees assigned to it. Reassign employees first." }
{ "message": "Cannot delete a shift that is linked to existing attendance records." }
```

---

## Error Responses

All endpoints follow standard NestJS HTTP exception shapes. The global `ValidationPipe` (`whitelist: true`, `transform: true`) flattens `class-validator` errors into a `message` array of strings.

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
  "message": "Shift not found",
  "error": "Not Found"
}
```

### 409 Conflict (duplicate shift name)

```json
{
  "statusCode": 409,
  "message": "A shift with this name already exists",
  "error": "Conflict"
}
```

---

## Frontend Implementation Notes

### Shift Type Colors (suggested)

| Type       | Color |
| ---------- | ----- |
| `FIXED`    | Blue  |
| `FLEXIBLE` | Amber |

### Typical Screen Flows

**Shifts List Screen**

- `GET /hr/shifts` with pagination, `search` (by name), `type` filter.
- Sortable columns: `name`, `type`, `startTime`, `endTime`, `createdAt`, `updatedAt` (whitelisted server-side; unrecognized values fall back to `name` A→Z). Default order without `sortBy` is `name` ascending.

**Create / Edit Shift Screen**

- `POST /hr/shifts` to create.
- `PATCH /hr/shifts/:shiftId` to edit any subset of fields.
- Enforce the same client-side validation as the server for fast feedback: `name` (required, ≤64 chars), `description` (≤256 chars), `startTime`/`endTime` (`HH:MM`, 24-hour), `graceMinutes` (0–120 integer).
- Show a toggle/checkbox for `crossesMidnight` when `endTime` < `startTime` numerically (the backend does not auto-derive or validate this — it is purely a display/logic flag consumed elsewhere, e.g. Attendance).
- Handle `409 Conflict` on duplicate `name` with an inline field error, not a toast — the message ("A shift with this name already exists") maps directly to the `name` field.

**Shift Detail Screen**

- `GET /hr/shifts/:shiftId` — show header fields plus `_count.employees` (e.g. "12 employees assigned").
- "Delete" button: if `_count.employees > 0`, consider disabling client-side with a tooltip explaining employees must be reassigned first, since the backend will otherwise return a `400` (`"Cannot delete a shift that has employees assigned to it. Reassign employees first."`). The backend also independently blocks deletion if attendance records reference the shift (`"Cannot delete a shift that is linked to existing attendance records."`) — this cannot be pre-checked client-side from data exposed by this module alone, so the delete action must still handle this `400` gracefully.

**Shift Dropdown (used by other modules)**

- `GET /hr/shifts/dropdown` — use for Employee create/edit "Shift" select and any Roster/Attendance screens that need to assign a shift. Returns `id`/`name`/`type` only, all shifts, no pagination.

### Fields NOT present in this module

- No `isActive`/`isDeleted` soft-delete flag — deletion is a hard delete (blocked by the guard rails above).
- No status/lifecycle field — a `Shift` is either fully present or deleted.
- No `siteId`/location field on `Shift` itself.

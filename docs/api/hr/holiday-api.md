# Holiday Module — Frontend API Reference

> **Purpose**: Complete API reference for the HR Holiday module — company-wide holiday calendar (single-day, half-day, and multi-day holidays).
> **Audience**: Frontend developers building the Holiday Calendar / Holiday Management screens.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. All Prisma `Decimal` values are auto-converted to JS numbers by this interceptor. **All response examples in this document show the inner `data` payload only.**

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Holiday API](#holiday-api)
   - [List Holidays (paginated)](#1-list-holidays-paginated)
   - [Get Single Holiday](#2-get-single-holiday)
   - [Create Holiday](#3-create-holiday)
   - [Update Holiday](#4-update-holiday)
   - [Delete Holiday](#5-delete-holiday)
5. [Error Responses](#error-responses)
6. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

The Holiday module manages a single standalone table (`hr_holidays`) of company holidays. There is **no per-date expansion** of multi-day holidays — a holiday is stored as one row with a `startDate` and `endDate`, and the frontend is responsible for expanding that range visually (e.g., on a calendar) if needed.

| Sub-module | Base Path      | Description                                    |
| ---------- | -------------- | ----------------------------------------------- |
| Holidays   | `/hr/holidays` | Create, list, view, update, and delete holidays |

### Holiday Types

- **`FULL_DAY`** (default): A holiday spanning one or more calendar days. `endDate` is required and must be on or after `startDate`.
- **`HALF_DAY`**: Always applies to a **single date**. The backend **forces `endDate` to equal `startDate`** regardless of what the client sends for `endDate` — any client-supplied `endDate` is discarded when `type = HALF_DAY`.

### Overlap Rule

The backend rejects creating or updating a holiday whose `[startDate, endDate]` range overlaps with **any other existing holiday's** range (inclusive on both ends). This is checked on every create, and on every update where `type`, `startDate`, or `endDate` is being changed.

### Past-Date Protection

- A holiday whose `startDate` is **today or in the past** cannot have its `type`, `startDate`, or `endDate` changed via update.
- A holiday whose `startDate` is **today or in the past** cannot be deleted.
- `name` and `description` can still be updated on a past/current holiday — only date/type changes are blocked.

### Uniqueness

A holiday's `(name, startDate)` pair must be unique — the database enforces this with a unique constraint (`uniq_hr_holidays_name_start_date`). Attempting to create/update into a duplicate `(name, startDate)` pair returns `409 Conflict`.

---

## Permissions

| Permission Key    | What it guards                                          |
| ----------------- | -------------------------------------------------------- |
| `holidays.view`   | List all holidays (paginated) and view a single holiday |
| `holidays.manage` | Create, update, and delete holidays                      |

---

## Enums & Constants

### `HolidayType`

```
FULL_DAY — Default. Spans startDate..endDate (endDate required, must be >= startDate)
HALF_DAY — Single-day only. endDate is always forced to equal startDate
```

### Date Fields

`startDate` and `endDate` are Prisma `@db.Date` columns — in JSON responses they are serialized as full ISO 8601 datetime strings with a `T00:00:00.000Z` time component (e.g., `"2026-08-14T00:00:00.000Z"`), even though only the date portion is meaningful.

---

## Holiday API

### 1. List Holidays (Paginated)

```
GET /hr/holidays
Permission: holidays.view
```

Returns holidays following the standard pagination pattern (`PaginationDto` + `buildPaginatedResponse`).

#### Query Parameters

| Param       | Type                | Default     | Notes                                                          |
| ----------- | ------------------- | ----------- | ---------------------------------------------------------------- |
| `page`      | `number`            | `1`         | Min 1, Max 100                                                 |
| `limit`     | `number`            | `10`        | Min 1, Max 100                                                 |
| `search`    | `string`             | —           | Case-insensitive search on `name` only                         |
| `sortBy`    | `string`             | `createdAt` |                                                                 |
| `sortOrder` | `"ASC"` \| `"DESC"` | `"DESC"`    |                                                                 |
| `type`      | `HolidayType`        | —           | `FULL_DAY` or `HALF_DAY`                                       |
| `year`      | `number`             | —           | Integer, 1970–9999. Filters `startDate` within `<year>-01-01`–`<year>-12-31` (inclusive) |

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "3c1e9f2a-6b4d-4a1e-9f0c-1a2b3c4d5e6f",
      "name": "Independence Day",
      "description": "National holiday",
      "type": "FULL_DAY",
      "startDate": "2026-08-14T00:00:00.000Z",
      "endDate": "2026-08-14T00:00:00.000Z",
      "createdAt": "2026-01-05T10:00:00.000Z",
      "updatedAt": "2026-01-05T10:00:00.000Z"
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

> **Note**: `data` items are the raw `Holiday` Prisma model — no relations, no user resolution (`createdById`/`updatedById` do not exist on this model).

---

### 2. Get Single Holiday

```
GET /hr/holidays/:holidayId
Permission: holidays.view
```

#### Path Parameter

| Param       | Type   | Notes      |
| ----------- | ------ | ---------- |
| `holidayId` | `uuid` | Holiday ID |

#### Response `200 OK`

```json
{
  "id": "3c1e9f2a-6b4d-4a1e-9f0c-1a2b3c4d5e6f",
  "name": "Independence Day",
  "description": "National holiday",
  "type": "FULL_DAY",
  "startDate": "2026-08-14T00:00:00.000Z",
  "endDate": "2026-08-14T00:00:00.000Z",
  "createdAt": "2026-01-05T10:00:00.000Z",
  "updatedAt": "2026-01-05T10:00:00.000Z"
}
```

#### Response `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Holiday not found",
  "error": "Not Found"
}
```

---

### 3. Create Holiday

```
POST /hr/holidays
Permission: holidays.manage
```

Creates a new holiday. This route is `@Auditable` (`AuditModule.HR_HOLIDAYS`) and returns the full created entity for the audit log diff.

**Business Rules:**

- If `type` is omitted, it defaults to `FULL_DAY`.
- If `type = HALF_DAY`: `endDate` is **always** set to equal `startDate` server-side — any `endDate` sent by the client for a half-day holiday is ignored.
- If `type` is `FULL_DAY` (or omitted): `endDate` is required and must not be before `startDate`.
- The new `[startDate, endDate]` range must not overlap with any existing holiday's range, or the request is rejected.
- The `(name, startDate)` pair must be unique.

#### Request Body

```json
{
  "name": "Independence Day",
  "description": "National holiday",
  "type": "FULL_DAY",
  "startDate": "2026-08-14",
  "endDate": "2026-08-14"
}
```

| Field         | Type          | Required    | Notes                                                                                                    |
| ------------- | ------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| `name`        | `string`      | Yes         | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(128)`                                                        |
| `description` | `string`      | No          | `@IsString()`, `@MaxLength(256)`                                                                         |
| `type`        | `HolidayType` | No          | `@IsEnum(HolidayType)`. Defaults to `FULL_DAY` if omitted                                                |
| `startDate`   | `string`      | Yes         | `@IsDateString()` — ISO date string (`YYYY-MM-DD`)                                                       |
| `endDate`     | `string`      | Conditional | `@ValidateIf(type !== HALF_DAY)` + `@IsDateString()` — **required** unless `type = HALF_DAY`, in which case it is ignored/overridden |

#### Response `201 Created`

```json
{
  "id": "3c1e9f2a-6b4d-4a1e-9f0c-1a2b3c4d5e6f",
  "name": "Independence Day",
  "description": "National holiday",
  "type": "FULL_DAY",
  "startDate": "2026-08-14T00:00:00.000Z",
  "endDate": "2026-08-14T00:00:00.000Z",
  "createdAt": "2026-07-07T10:00:00.000Z",
  "updatedAt": "2026-07-07T10:00:00.000Z"
}
```

#### Validation Errors `400 Bad Request`

```json
{ "message": "endDate is required for full-day holidays" }
{ "message": "endDate cannot be before startDate" }
{ "message": "Holiday dates overlap with an existing holiday: \"Independence Day\"" }
{ "message": ["name should not be empty", "startDate must be a valid ISO 8601 date string"] }
```

#### Conflict Error `409 Conflict`

```json
{
  "statusCode": 409,
  "message": "A holiday with this name already exists on this start date",
  "error": "Conflict"
}
```

---

### 4. Update Holiday

```
PATCH /hr/holidays/:holidayId
Permission: holidays.manage
```

Updates any combination of `name`, `description`, `type`, `startDate`, `endDate`. This route is `@Auditable` (`AuditModule.HR_HOLIDAYS`) and returns the full updated entity.

**Business Rules:**

- All fields are optional (`PartialType(CreateHolidayDto)`).
- If `type`, `startDate`, or `endDate` is being changed (any one of the three provided in the body), the backend treats this as a **date field change** and applies the checks below. Changing only `name`/`description` skips these checks entirely.
- **Date field change is blocked** if the holiday's **current** `startDate` is today or in the past, OR if the **resulting/effective** `startDate` would be today or in the past → `400 Bad Request`.
- Same `HALF_DAY` → `endDate = startDate` collapse rule as create applies to the effective type/dates.
- Same full-day `endDate` required / `endDate >= startDate` rule applies to the effective type/dates.
- Same overlap check as create applies (excluding the holiday's own row) — only run when a date field change was requested.
- Same `(name, startDate)` uniqueness constraint applies.

#### Path Parameter

| Param       | Type   | Notes                |
| ----------- | ------ | --------------------- |
| `holidayId` | `uuid` | Holiday ID to update |

#### Request Body

All fields optional.

```json
{
  "name": "Independence Day (Updated)",
  "description": "Updated description",
  "type": "FULL_DAY",
  "startDate": "2026-08-15",
  "endDate": "2026-08-16"
}
```

| Field         | Type          | Required | Notes                                                                                     |
| ------------- | ------------- | -------- | ------------------------------------------------------------------------------------------- |
| `name`        | `string`      | No       | `@IsString()`, `@MaxLength(128)` (when provided)                                          |
| `description` | `string`      | No       | `@IsString()`, `@MaxLength(256)` (when provided)                                           |
| `type`        | `HolidayType` | No       | `@IsEnum(HolidayType)` (when provided)                                                     |
| `startDate`   | `string`      | No       | `@IsDateString()` (when provided)                                                          |
| `endDate`     | `string`      | No       | `@IsDateString()` (when provided); ignored/overridden if effective `type = HALF_DAY`       |

#### Response `200 OK`

```json
{
  "id": "3c1e9f2a-6b4d-4a1e-9f0c-1a2b3c4d5e6f",
  "name": "Independence Day (Updated)",
  "description": "Updated description",
  "type": "FULL_DAY",
  "startDate": "2026-08-15T00:00:00.000Z",
  "endDate": "2026-08-16T00:00:00.000Z",
  "createdAt": "2026-01-05T10:00:00.000Z",
  "updatedAt": "2026-07-07T11:00:00.000Z"
}
```

#### Response `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Holiday not found",
  "error": "Not Found"
}
```

#### Validation Errors `400 Bad Request`

```json
{ "message": "Cannot change the date or type of a holiday that has already started, or move it to today or the past" }
{ "message": "endDate is required for full-day holidays" }
{ "message": "endDate cannot be before startDate" }
{ "message": "Holiday dates overlap with an existing holiday: \"Independence Day\"" }
```

#### Conflict Error `409 Conflict`

```json
{
  "statusCode": 409,
  "message": "A holiday with this name already exists on this start date",
  "error": "Conflict"
}
```

---

### 5. Delete Holiday

```
DELETE /hr/holidays/:holidayId
Permission: holidays.manage
```

Hard-deletes a holiday. **Only holidays whose `startDate` is strictly in the future can be deleted** — a holiday that has already started (today or earlier) cannot be deleted.

#### Path Parameter

| Param       | Type   | Notes                |
| ----------- | ------ | --------------------- |
| `holidayId` | `uuid` | Holiday ID to delete |

#### Response `200 OK`

```json
{
  "message": "Holiday deleted successfully"
}
```

#### Response `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Holiday not found",
  "error": "Not Found"
}
```

#### Validation Error `400 Bad Request`

```json
{ "message": "Cannot delete a holiday that has already started or passed" }
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
  "message": "Holiday not found",
  "error": "Not Found"
}
```

### 409 Conflict (duplicate name + startDate)

```json
{
  "statusCode": 409,
  "message": "A holiday with this name already exists on this start date",
  "error": "Conflict"
}
```

---

## Frontend Implementation Notes

### Status/Type Colors (suggested)

| Type       | Color |
| ---------- | ----- |
| `FULL_DAY` | Blue  |
| `HALF_DAY` | Amber |

### Date Handling

- Send `startDate`/`endDate` in the request body as plain `YYYY-MM-DD` strings (matches `@IsDateString()`); the backend stores them as SQL `DATE` columns.
- Responses come back as full ISO datetime strings with a `T00:00:00.000Z` suffix — when rendering, format using only the date portion (e.g. `toISOString().slice(0, 10)` or a date-only formatter) to avoid timezone-shift bugs when converting to a local timezone.
- No per-date expansion is done by the backend: a multi-day `FULL_DAY` holiday is one row with `startDate`/`endDate`. If the calendar UI needs to render every individual day (e.g., a 3-day holiday shown on 3 separate calendar cells), the frontend must expand the `[startDate, endDate]` range itself.

### Create/Edit Form Behavior

- When the user selects `type = HALF_DAY` in the form, hide/disable the `endDate` field entirely (or auto-set and gray it out to match `startDate`) — whatever the client sends for `endDate` in this case is discarded by the backend anyway.
- When `type = FULL_DAY` (or the type field is left at its default), `endDate` is a required field in the form and must not be before `startDate` client-side (to fail fast before the API round-trip).
- Client-side, warn the user before attempting to edit the date/type of a holiday whose `startDate` is today or earlier — the API will reject it with `400` and the specific message above.
- Client-side, disable/hide the "Delete" action for holidays whose `startDate` is today or earlier, to avoid a guaranteed `400`.

### Typical Screen Flows

**Holiday List / Calendar Screen**

- `GET /hr/holidays` with pagination, optional `search`, `type`, `year` filters (e.g., a year-picker for the holiday calendar view).
- Render `FULL_DAY` holidays as a date range, `HALF_DAY` holidays as a single-day badge.

**Create / Edit Holiday Modal**

- `POST /hr/holidays` to create; `PATCH /hr/holidays/:holidayId` to update.
- Show the overlap error and the duplicate `(name, startDate)` conflict error inline near the date/name fields, since both are common validation failures when holidays are entered in bulk at the start of a year.

**Delete Confirmation**

- `DELETE /hr/holidays/:holidayId` — only offer this action for future-dated holidays (see above).

### Internal-Only Usage (not exposed to frontend)

`HolidayService.countInPeriod(periodStart, periodEnd)` exists in the backend but is **not exposed via any controller route** — it is used internally (e.g., by payroll/leave calculations to count holidays in a pay period). No corresponding endpoint exists for this; do not attempt to call it directly.

# Attendance Module — Frontend API Reference

> **Purpose**: Complete API reference for the HR Attendance module.
> **Audience**: Frontend developers building the Attendance list, record detail, check-in/check-out, and manual-correction screens.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. All Prisma `Decimal` values are auto-converted to JS numbers by this interceptor. **All response examples in this document show the inner `data` payload only.**

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Attendance API](#attendance-api)
   - [List Attendance Records](#1-list-attendance-records-paginated)
   - [Get Single Attendance Record](#2-get-single-attendance-record)
   - [Check In](#3-check-in)
   - [Check Out](#4-check-out)
   - [Update Attendance Record](#5-update-attendance-record)
   - [Delete Attendance Record](#6-delete-attendance-record)
5. [Error Responses](#error-responses)
6. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

This module is a **manual attendance CRUD API** — it is **not** a biometric-device ingestion endpoint, and there is **no bulk/CSV import**. Every record is created one at a time via `POST /hr/attendance/check-in`, corrected via `PATCH`, and closed out via the check-out endpoint.

> **Note**: The Prisma schema (`prisma/tenant/schema.prisma`) also defines a separate `AttendanceLog` model (table `hr_attendance_logs`, with `checkInTime`/`checkOutTime` as `DateTime`) that looks like it was intended for biometric-device ingestion. It is **not referenced anywhere in the current backend source** (no repository, service, or controller uses it). Treat it as **not implemented** — do not build a screen against it. > **Note**: could not verify whether/when this will be wired up — check with backend.

Base path: `/hr/attendance`

Each attendance record is keyed by `(employeeId, date)` — the database enforces a **unique constraint** on this pair (`uniq_hr_attendance_employee_date`), so there can only ever be one attendance record per employee per calendar day.

### Record Lifecycle

```
POST /check-in  ──►  record created (checkOut = null, workedMinutes/lateMinutes not yet finalized)
                          │
                          ▼
PATCH /:id/check-out  ──►  checkOut set, workedMinutes/earlyExitMinutes/overtimeMinutes computed
                          │
                          ▼
PATCH /:id  ──►  correct checkIn/checkOut/workMode/source/notes at any time (metrics recomputed
                  only when both checkIn and checkOut are present after the update — see note below)
                          │
                          ▼
DELETE /:id  ──►  record permanently removed
```

- **Check-in requires the employee to already have a `Shift` assigned.** There is no attendance-without-a-shift path.
- **Check-in does not "upsert"** — despite the endpoint's summary text, if a record already exists for that employee+date, the call fails with `400 Bad Request` (`Employee already has an attendance record for this date`). To correct an existing record, use `PATCH /:attendanceId` or `PATCH /:attendanceId/check-out` instead.
- **Late-arrival detection** happens only at check-in time (`lateMinutes` computed then). **Full metrics** (`workedMinutes`, `earlyExitMinutes`, `overtimeMinutes`, and a recalculated `lateMinutes`) are computed only once **both** `checkIn` and `checkOut` are known — i.e., at check-out time, or on a `PATCH /:attendanceId` call where the resulting record has both times set.
  > **Important edge case**: If you `PATCH /:attendanceId` to change only `checkIn` on a record that has **no `checkOut` yet**, the stored `lateMinutes` is **not** recalculated — it keeps whatever value was set at the original check-in, until check-out (or a later PATCH where both times are present) triggers a full recompute.
- **`status`** on the `Attendance` record is a `AttendanceStatus` enum (`PRESENT`, `ABSENT`, `LATE`, `HALF_DAY`, `LEAVE`), but **this module's code only ever writes `PRESENT`** — there is no code path in check-in/check-out/update that sets `ABSENT`, `LATE`, `HALF_DAY`, or `LEAVE`. Lateness is represented via the separate `lateMinutes` numeric field, not via `status`. The `status` query filter still works against the DB column, but filtering by anything other than `PRESENT` will currently return no rows from this module (no other module writes to `Attendance` either — `shift` and `payroll` modules only *read* it).
- **Ownership scoping**: `GET` list and `GET :attendanceId` are available to *any* authenticated user, but a user without `attendance.view_all` only ever sees/can fetch **their own** attendance (resolved via the `Employee` record linked to their `userId`). Accessing another employee's record without the permission returns a **404** (not 403) — the API intentionally does not reveal that the record exists.

---

## Permissions

| Permission Key | What it guards |
| --- | --- |
| `attendance.view_all` | View **all** employees' attendance records (list + single). Without it, a user can still call the same endpoints but is silently scoped to their own records only. |
| `attendance.manage` | Create (check-in), check-out, update/correct, and delete attendance records. |

> Permission keys are defined in `src/users/permissions/modules/attendance.permissions.ts` and registered in `permission.definitions.ts`.

---

## Enums & Constants

### `AttendanceStatus`

```
PRESENT   — the only value ever written by this module
ABSENT    — defined in schema; not set by any current code path
LATE      — defined in schema; not set by any current code path (lateness tracked via lateMinutes instead)
HALF_DAY  — defined in schema; reserved for future leave-based deductions (not yet implemented)
LEAVE     — defined in schema; not set by any current code path
```

### `WorkMode`

```
ON_SITE          — default
WORK_FROM_HOME
FIELD_VISIT
```

### `AttendanceSource`

```
MANUAL     — default
BIOMETRIC  — accepted as an enum value but no biometric ingestion pipeline currently populates it
API
```

### `ShiftType` (referenced via the employee's assigned `Shift`, affects late/metric calculation)

```
FIXED     — fixed clock-in/out window; late tracking via shift.graceMinutes
FLEXIBLE  — only total hours worked matter; lateMinutes is always 0
```

### Time & Date Formats

- `date` — plain `YYYY-MM-DD` string (validated with a regex on check-in, `@IsDateString()` elsewhere). Stored as a string, not a `DateTime`.
- `checkIn` / `checkOut` — plain `HH:MM` 24-hour string (regex `^\d{2}:\d{2}$`, message: `"Time must be in HH:MM format (24-hour)"`). If a client sends `HH:MM:SS`, the backend silently truncates to `HH:MM` before storing/comparing.
- All metric fields (`workedMinutes`, `lateMinutes`, `earlyExitMinutes`, `overtimeMinutes`) are **integers in minutes**, not durations or timestamps.

### Metric Calculation Rules (for reference — computed server-side, read-only to the frontend)

- **Late minutes**: `FLEXIBLE` shifts → always `0`. `FIXED` shifts → `0` if `checkIn <= shiftStart + graceMinutes`, otherwise `checkIn − shiftStart` (counted from the shift's actual start time, not from the end of the grace period).
- **Worked minutes**: `checkOut − checkIn`, with midnight-crossing shifts normalized (if `checkOut < checkIn`, add 24h before subtracting).
- **Required leave time**: `checkIn + shiftDuration` — an employee who checks in late must still complete the full shift duration to avoid an early-exit deduction.
- **Early exit minutes**: `max(0, requiredLeaveTime − checkOut)`.
- **Overtime minutes**: `max(0, checkOut − requiredLeaveTime)`.

---

## Attendance API

### 1. List Attendance Records (Paginated)

```
GET /hr/attendance
No @RequirePermission — own records only unless caller has attendance.view_all
```

#### Query Parameters

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `page` | `number` | `1` | Min 1, Max 100 |
| `limit` | `number` | `10` | Min 1, Max 100 |
| `search` | `string` | — | Matches employee first/last name, `employeeCode` (contains, case-insensitive), or shift `name`/`description` |
| `employeeId` | `string` | — | Filter by employee. Ignored/overridden server-side for callers without `attendance.view_all` (forced to their own employee ID) |
| `date` | `ISO date string` (`YYYY-MM-DD`) | — | Exact-date filter. Validated with `@IsDateString()`. Takes priority over `month`/`year` if provided |
| `month` | `number` | — | 1–12. Must be combined with `year` to take effect |
| `year` | `number` | — | Min `2000`. Used alone for a full-year range, or with `month` for a single-month range |
| `status` | `AttendanceStatus` | — | `PRESENT`, `ABSENT`, `LATE`, `HALF_DAY`, `LEAVE` (see note above — only `PRESENT` rows currently exist) |
| `sortBy` | `string` | `date desc, checkIn asc` | One of `date`, `checkIn`, `checkOut`, `status`, `createdAt`. Any other value falls back to the default compound order `date desc, checkIn asc` (no error). |
| `sortOrder` | `"ASC"` \| `"DESC"` | `DESC` when `sortBy` is set | Applied only when `sortBy` is a valid sortable field. |

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "9b1e2c3d-4f5a-6b7c-8d9e-0f1a2b3c4d5e",
      "employeeId": "e1e2e3e4-e5e6-e7e8-e9ea-ebecedeeeff0",
      "shiftId": "s1s2s3s4-s5s6-s7s8-s9sa-sbscsdseseff",
      "date": "2026-07-01",
      "checkIn": "09:05",
      "checkOut": "18:10",
      "workedMinutes": 545,
      "lateMinutes": 5,
      "earlyExitMinutes": 0,
      "overtimeMinutes": 10,
      "status": "PRESENT",
      "workMode": "ON_SITE",
      "source": "MANUAL",
      "notes": null,
      "createdById": "user-uuid",
      "updatedById": "user-uuid",
      "createdAt": "2026-07-01T09:05:00.000Z",
      "updatedAt": "2026-07-01T18:10:00.000Z",
      "employee": {
        "id": "e1e2e3e4-e5e6-e7e8-e9ea-ebecedeeeff0",
        "employeeCode": "EMP-0042",
        "user": { "firstName": "Jane", "lastName": "Doe" }
      },
      "shift": {
        "id": "s1s2s3s4-s5s6-s7s8-s9sa-sbscsdseseff",
        "name": "Morning Shift",
        "type": "FIXED",
        "startTime": "09:00",
        "endTime": "18:00",
        "crossesMidnight": false,
        "graceMinutes": 10
      }
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

> **Note**: List items do **not** include `createdBy`/`updatedBy` resolved user objects (only `createdById`/`updatedById` raw IDs) — that enrichment only happens on the single-record endpoints (Get Single, Check In, Check Out, Update). See [Get Single Attendance Record](#2-get-single-attendance-record) for the enriched shape.

---

### 2. Get Single Attendance Record

```
GET /hr/attendance/:attendanceId
No @RequirePermission — own record only unless caller has attendance.view_all
```

#### Path Parameter

| Param | Type | Notes |
| --- | --- | --- |
| `attendanceId` | `uuid` | Validated with `ParseUUIDPipe` |

#### Response `200 OK`

Same fields as a list item, **plus** resolved `createdBy`/`updatedBy` user objects:

```json
{
  "id": "9b1e2c3d-4f5a-6b7c-8d9e-0f1a2b3c4d5e",
  "employeeId": "e1e2e3e4-e5e6-e7e8-e9ea-ebecedeeeff0",
  "shiftId": "s1s2s3s4-s5s6-s7s8-s9sa-sbscsdseseff",
  "date": "2026-07-01",
  "checkIn": "09:05",
  "checkOut": "18:10",
  "workedMinutes": 545,
  "lateMinutes": 5,
  "earlyExitMinutes": 0,
  "overtimeMinutes": 10,
  "status": "PRESENT",
  "workMode": "ON_SITE",
  "source": "MANUAL",
  "notes": null,
  "createdById": "user-uuid",
  "updatedById": "user-uuid",
  "createdAt": "2026-07-01T09:05:00.000Z",
  "updatedAt": "2026-07-01T18:10:00.000Z",
  "employee": {
    "id": "e1e2e3e4-e5e6-e7e8-e9ea-ebecedeeeff0",
    "employeeCode": "EMP-0042",
    "user": { "firstName": "Jane", "lastName": "Doe" }
  },
  "shift": {
    "id": "s1s2s3s4-s5s6-s7s8-s9sa-sbscsdseseff",
    "name": "Morning Shift",
    "type": "FIXED",
    "startTime": "09:00",
    "endTime": "18:00",
    "crossesMidnight": false,
    "graceMinutes": 10
  },
  "createdBy": { "id": "user-uuid", "firstName": "Jane", "lastName": "Doe" },
  "updatedBy": { "id": "user-uuid", "firstName": "Jane", "lastName": "Doe" }
}
```

#### Response `404 Not Found`

```json
{ "statusCode": 404, "message": "Attendance record not found", "error": "Not Found" }
```

> Returned both when the ID genuinely doesn't exist **and** when it exists but belongs to a different employee and the caller lacks `attendance.view_all` — the API does not distinguish the two cases.

---

### 3. Check In

```
POST /hr/attendance/check-in
Permission: attendance.manage
```

Creates a new attendance record for the given employee and date. **Does not update an existing record** — see [Record Lifecycle](#record-lifecycle) note above.

#### Request Body

```json
{
  "employeeId": "e1e2e3e4-e5e6-e7e8-e9ea-ebecedeeeff0",
  "date": "2026-07-07",
  "checkIn": "09:05",
  "workMode": "ON_SITE",
  "source": "MANUAL",
  "notes": "Arrived slightly late due to traffic"
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `employeeId` | `string` | Yes | `@IsString() @IsNotEmpty()`. Must reference an existing employee |
| `date` | `string` | Yes | `@Matches(/^\d{4}-\d{2}-\d{2}$/)` — error message: `"date must be in YYYY-MM-DD format"` |
| `checkIn` | `string` | Yes | `@IsNotEmpty() @Matches(/^\d{2}:\d{2}$/)` — error message: `"Time must be in HH:MM format (24-hour)"` |
| `workMode` | `WorkMode` | No | `@IsEnum(WorkMode)`. Defaults to `ON_SITE` if omitted |
| `source` | `AttendanceSource` | No | `@IsEnum(AttendanceSource)`. Defaults to `MANUAL` if omitted |
| `notes` | `string` | No | `@IsString()` |

#### Response `201 Created`

Same enriched shape as [Get Single Attendance Record](#2-get-single-attendance-record). Notable computed values on creation:

- `lateMinutes` is computed immediately from `checkIn` vs. the employee's shift (`0` for `FLEXIBLE` shifts).
- `checkOut`, `workedMinutes`, `earlyExitMinutes`, `overtimeMinutes` are all `null`/`0` until check-out.
- `status` is not set explicitly on create — defaults to `PRESENT` (Prisma column default).

#### Errors

```json
{ "statusCode": 404, "message": "Employee not found", "error": "Not Found" }
```
```json
{ "statusCode": 400, "message": "Employee has no shift assigned. Assign a shift before recording attendance.", "error": "Bad Request" }
```
```json
{ "statusCode": 400, "message": "Employee already has an attendance record for this date", "error": "Bad Request" }
```

---

### 4. Check Out

```
PATCH /hr/attendance/:attendanceId/check-out
Permission: attendance.manage
```

Records the check-out time on an existing record and computes `workedMinutes`, `earlyExitMinutes`, `overtimeMinutes`, and a recalculated `lateMinutes` (see [Metric Calculation Rules](#metric-calculation-rules-for-reference--computed-server-side-read-only-to-the-frontend)).

#### Path Parameter

| Param | Type | Notes |
| --- | --- | --- |
| `attendanceId` | `uuid` | Validated with `ParseUUIDPipe` |

#### Request Body

```json
{
  "checkOut": "18:10"
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `checkOut` | `string` | Yes | `@IsNotEmpty() @Matches(/^\d{2}:\d{2}$/)` — error message: `"Time must be in HH:MM format (24-hour)"` |

#### Response `200 OK`

Full updated record, same enriched shape as [Get Single Attendance Record](#2-get-single-attendance-record), with `checkOut` and all metric fields populated.

> This endpoint is decorated with `@Auditable({ module: AuditModule.HR_ATTENDANCE })` — it returns the full updated entity as required for the audit log.

#### Errors

```json
{ "statusCode": 404, "message": "Attendance record not found", "error": "Not Found" }
```
```json
{ "statusCode": 400, "message": "Employee has already checked out for this date", "error": "Bad Request" }
```
```json
{ "statusCode": 400, "message": "Check-out time cannot be the same as check-in time", "error": "Bad Request" }
```

---

### 5. Update Attendance Record

```
PATCH /hr/attendance/:attendanceId
Permission: attendance.manage
```

Corrects any combination of `checkIn`, `checkOut`, `workMode`, `source`, `notes` on an existing record. Metrics are recomputed **only if, after applying the update, both `checkIn` and `checkOut` are present** (see the edge-case note in [Overview](#overview)).

#### Path Parameter

| Param | Type | Notes |
| --- | --- | --- |
| `attendanceId` | `uuid` | Validated with `ParseUUIDPipe` |

#### Request Body

All fields optional.

```json
{
  "checkIn": "09:00",
  "checkOut": "18:00",
  "workMode": "WORK_FROM_HOME",
  "source": "MANUAL",
  "notes": "Corrected after payroll review"
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `checkIn` | `string` | No | `@Matches(/^\d{2}:\d{2}$/)` — error message: `"Time must be in HH:MM format (24-hour)"` |
| `checkOut` | `string` | No | Same format/validation as `checkIn` |
| `workMode` | `WorkMode` | No | `@IsEnum(WorkMode)` |
| `source` | `AttendanceSource` | No | `@IsEnum(AttendanceSource)` |
| `notes` | `string` | No | `@IsString()`. Sending an empty string clears it; omitting the field leaves it unchanged |

#### Response `200 OK`

Full updated record, same enriched shape as [Get Single Attendance Record](#2-get-single-attendance-record).

> This endpoint is decorated with `@Auditable({ module: AuditModule.HR_ATTENDANCE })` — it returns the full updated entity as required for the audit log.

#### Errors

```json
{ "statusCode": 404, "message": "Attendance record not found", "error": "Not Found" }
```
```json
{ "statusCode": 400, "message": "Check-out time cannot be the same as check-in time", "error": "Bad Request" }
```

---

### 6. Delete Attendance Record

```
DELETE /hr/attendance/:attendanceId
Permission: attendance.manage
```

Hard-deletes the attendance record.

#### Path Parameter

| Param | Type | Notes |
| --- | --- | --- |
| `attendanceId` | `uuid` | Validated with `ParseUUIDPipe` |

#### Response `200 OK`

```json
{ "message": "Attendance record deleted successfully" }
```

> This endpoint is decorated with `@Auditable({ module: AuditModule.HR_ATTENDANCE })`. Per this module's convention, DELETE routes are allowed to return only a message — the audit interceptor forces `newValue = null` for DELETE regardless of the response body.

#### Errors

```json
{ "statusCode": 404, "message": "Attendance record not found", "error": "Not Found" }
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

Validation errors from class-validator return an array in `message` instead of a string, e.g.:

```json
{
  "statusCode": 400,
  "message": ["date must be in YYYY-MM-DD format", "Time must be in HH:MM format (24-hour)"],
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
  "message": "Attendance record not found",
  "error": "Not Found"
}
```

---

## Frontend Implementation Notes

### Status / Badge Colors (suggested)

| `status` | Color |
| --- | --- |
| `PRESENT` | Green |
| `ABSENT` | Red |
| `LATE` | Amber/Orange |
| `HALF_DAY` | Amber/Orange |
| `LEAVE` | Blue |

> Only `PRESENT` is currently ever produced by the backend — design the badge component to handle all five values for forward-compatibility, but do not expect to see `ABSENT`/`LATE`/`HALF_DAY`/`LEAVE` in real data yet. Use `lateMinutes > 0` client-side to visually flag a late arrival instead of relying on `status`.

### Time Fields Are Plain Strings, Not Dates

`date`, `checkIn`, and `checkOut` are plain strings (`YYYY-MM-DD` / `HH:MM`) — not ISO timestamps. Do not run them through `new Date(...)` parsing directly for display; format/compare them as strings or explicitly compose a `Date` by combining `date` + the time string yourself if you need timezone-aware arithmetic.

### Typical Screen Flows

**Attendance List Screen**

- `GET /hr/attendance` with pagination + `search`/`employeeId`/`date`/`month`+`year`/`year`/`status` filters.
- If the logged-in user lacks `attendance.view_all`, hide the "employee" filter/column entirely — the backend silently scopes results to their own record regardless of what's sent.
- Sortable columns: `date`, `checkIn`, `checkOut`, `status`, `createdAt` (whitelisted server-side; unrecognized values fall back to the default `date desc, checkIn asc` compound order).

**Attendance Detail / Correction Screen**

- `GET /hr/attendance/:id` for the full record (includes resolved `createdBy`/`updatedBy` names, unlike the list endpoint).
- "Check Out" action button (only enabled while `checkOut` is `null`) → `PATCH /:id/check-out`.
- "Correct" / edit action → `PATCH /:id` for any field; show a warning if the user edits `checkIn` on a record with no `checkOut` yet, since `lateMinutes` won't be recalculated until check-out happens.
- "Delete" action → `DELETE /:id`.

**Check-In Screen / Action**

- `POST /hr/attendance/check-in` with `employeeId` + `date` + `checkIn` (+ optional `workMode`/`source`/`notes`).
- Before submitting, confirm the target employee has a shift assigned in the Employee/Shift screens — otherwise this call fails with a 400.
- If the call fails with `"Employee already has an attendance record for this date"`, redirect the user to the existing record's detail/correction screen instead of retrying create.

**Cross-Module References**

- `employee` on each response is `{ id, employeeCode, user: { firstName, lastName } }` — enough to render a name/code; fetch the full Employee profile from the Employee module if more detail is needed.
- `shift` on each response is `{ id, name, type, startTime, endTime, crossesMidnight, graceMinutes }` — enough to render shift context inline; fetch the full Shift record from the Shift module if more detail is needed.

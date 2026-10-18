# Leave Request Module — Frontend API Reference

> **Purpose**: Complete API reference for the HR Leave Request module.
> **Audience**: Frontend developers building the Leave Request list, create, detail, and approval screens.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. All Prisma `Decimal` values are auto-converted to JS numbers by this interceptor. **All response examples in this document show the inner `data` payload only.**

> **Note**: This is a dedicated module, separate from Loan Requests (`hr/loan-requests`). The two modules have different ownership/approval rules — do not assume they behave the same way. See [Ownership & Approval Rules](#ownership--approval-rules) below.

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Ownership & Approval Rules](#ownership--approval-rules)
5. [Leave Request API](#leave-request-api)
   - [Create Leave Request](#1-create-leave-request)
   - [List Leave Requests (paginated)](#2-list-leave-requests-paginated)
   - [Get Single Leave Request](#3-get-single-leave-request)
   - [Delete Leave Request](#4-delete-leave-request)
   - [Decide Approval](#5-decide-approval)
6. [Error Responses](#error-responses)
7. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

The Leave Request module lets an employee (or an HR user acting on their behalf) submit a leave request against one or more assigned approvers. Every approver must approve before the request is confirmed; a single rejection rejects the whole request. Paid leave is deducted from the employee's **active contract** leave balance only once the request reaches `APPROVED`.

| Sub-module     | Base Path             | Description                                                          |
| -------------- | ---------------------- | --------------------------------------------------------------------- |
| Leave Requests | `/hr/leave-requests`   | Create, list, view, delete leave requests; record approver decisions |

There is **no update/edit endpoint** for a leave request in this module. The only way to change a submitted request's dates/duration/reason/approvers is to delete it (while still pending and undecided) and create a new one.

### Leave Request Lifecycle

```
PENDING ──► APPROVED   (every assigned approver has APPROVED)
   │
   └────► REJECTED     (any one assigned approver has REJECTED)
```

- **PENDING**: Initial state. All approvals start `PENDING`. Can be deleted while no approver has decided yet.
- **APPROVED**: Set automatically once every `LeaveRequestApproval` row for this request is `APPROVED`. If the request `isPaid`, `totalDays` is deducted from the employee's active contract's `consumedLeaves` in the same transaction. Once `APPROVED`, decisions are locked — no approver can change their vote anymore.
- **REJECTED**: Set automatically as soon as **any** approver's decision is `REJECTED`. Approvers can still change their individual decision afterwards (including back to `PENDING`), which will re-run the overall status computation.
- **CANCELLED**: Defined in the `LeaveRequestStatus` enum in the schema, but **no code path in this module ever sets it** — there is no cancel endpoint/action. Treat it as reserved for future use; do not build UI around it today.

### Recalculation on Every Decision

Every call to `POST /:leaveRequestId/approve` recomputes the **overall** request status from **all** approvers' current decisions (not just the one being changed):

- If any approval is `REJECTED` → overall status = `REJECTED`.
- Else if every approval is `APPROVED` → overall status = `APPROVED` (triggers paid-leave deduction if applicable).
- Otherwise → overall status = `PENDING`.

---

## Permissions

| Permission Key          | What it guards                                                             |
| ------------------------ | --------------------------------------------------------------------------- |
| `leave-requests.view`    | List and view leave requests                                               |
| `leave-requests.manage`  | Create and delete leave requests                                          |
| `leave-requests.approve` | Record an approval/rejection decision **as an assigned approver**         |

> Defined in `src/users/permissions/modules/leave-requests.permissions.ts` and spread into `PERMISSIONS` via `permission.definitions.ts`.

---

## Enums & Constants

### `LeaveRequestStatus` (overall request status)

```
PENDING    — Default on creation; at least one approver has not decided (or none have)
APPROVED   — Every assigned approver has approved; paid leave already deducted if isPaid
REJECTED   — At least one assigned approver has rejected
CANCELLED  — Exists in the schema; never set by any code path in this module (unused)
```

### `LeaveApprovalStatus` (per-approver decision)

```
PENDING   — Default; approver has not decided yet
APPROVED  — This approver has approved
REJECTED  — This approver has rejected
```

### `LeaveDurationType`

```
FULL_DAY — Default. endDate is required and must be >= startDate.
HALF_DAY — endDate is forced to equal startDate (any client-supplied endDate is ignored). Counts as 0.5 day.
```

> **Note**: There is no separate "leave type" enum (e.g. SICK/CASUAL/ANNUAL) in this module. The only leave-category dimensions are `durationType` (`FULL_DAY`/`HALF_DAY`) and the `isPaid` boolean.

### `isPaid`

```
true  (default) — totalDays is validated against, and deducted from, the employee's active
                   EmployeeContract.totalLeaves - consumedLeaves balance on approval.
false            — No balance check, no deduction.
```

### Weekly Off Days

`totalDays` excludes the tenant's configured weekly off days (`HrSettings.weeklyOffDays`, an array of `WeekDay`: `SUNDAY`…`SATURDAY`) fetched via `HrSettingsService.getSettings()`. This is tenant-wide HR configuration, not part of this module — see the HR Settings API doc for how it's managed.

### Decimal Fields

`totalDays` is a Prisma `Decimal(5,1)` field, **converted to a JS `number`** by the repository's serializer before being returned.

---

## Ownership & Approval Rules

Verified directly from `leave-request.service.ts` and `leave-request.controller.ts`:

- **Create** (`POST /hr/leave-requests`) and **Delete** (`DELETE /hr/leave-requests/:leaveRequestId`) are gated purely by the blanket `leave-requests.manage` permission — there is **no "only the creator can delete" check** in this module (unlike Loan Requests). Any user holding `leave-requests.manage` can delete any leave request, subject only to the status rule below.
- **Delete** is only allowed while:
  - `status === PENDING`, **and**
  - no approval row has moved off `PENDING` (`approvals.some(a => a.status !== PENDING)` must be `false`).
  - Violation → `400 Bad Request`: `"Can only delete a leave request while it is pending and no approver has decided yet"`.
- **Approve/Reject** (`POST /:leaveRequestId/approve`) requires both:
  1. The `leave-requests.approve` permission, **and**
  2. The logged-in user must be one of the leave request's **assigned approvers** (i.e. have a `LeaveRequestApproval` row for this request) — a blanket `leave-requests.approve` permission alone is **not** sufficient.
  - Violation (not an assigned approver) → `403 Forbidden`: `"You are not an approver for this leave request"`.
  - Once the overall request is `APPROVED`, no further decision changes are accepted from anyone → `400 Bad Request`: `"Cannot change an approval decision once the leave request has been fully approved"`.
- **Self-approval guard on create**: if the leave request's employee **is** the logged-in user (`employee.userId === userId`), that same user cannot also be listed in `approverIds` → `400 Bad Request`: `"You cannot set yourself as an approver for your own leave request"`.

---

## Leave Request API

### 1. Create Leave Request

```
POST /hr/leave-requests
Permission: leave-requests.manage
```

Creates a leave request in `PENDING` status with one `LeaveRequestApproval` row per approver (all starting `PENDING`). `totalDays` is computed server-side (excluding weekly off days). If `isPaid` (default `true`), the employee's active contract balance is checked (but not yet deducted — deduction happens only on final approval).

**Business Rules:**

- `employeeId` must reference an existing employee → else `404`.
- `approverIds` must all reference existing, login-enabled users → else `400`.
- The employee's own user cannot be included in `approverIds` if they are requesting leave for themselves → `400`.
- `HALF_DAY`: `endDate` is ignored and forced to `startDate`; counts as `0.5` day; requesting on a configured weekly off day → `400`.
- `FULL_DAY`: `endDate` is required and must not be before `startDate`; if the whole range falls on weekly off days → `400`.
- If `isPaid`, the employee must have an `ACTIVE` `EmployeeContract`, and `totalLeaves - consumedLeaves` must be `>= totalDays` → else `400`.
- Duplicate approver IDs are deduplicated server-side before creating approval rows.

#### Request Body

```json
{
  "employeeId": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
  "startDate": "2026-07-10",
  "endDate": "2026-07-12",
  "durationType": "FULL_DAY",
  "isPaid": true,
  "reason": "Family event",
  "approverIds": ["5939c357-3904-489e-8016-cc8e30eb89a5"]
}
```

| Field          | Type              | Required | Notes                                                                                                          |
| -------------- | ----------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `employeeId`   | `uuid`            | Yes      | `@IsUUID()`. Employee this leave request is for.                                                              |
| `startDate`    | `ISO date string` | Yes      | `@IsDateString()`. Leave start date (`YYYY-MM-DD`).                                                            |
| `endDate`      | `ISO date string` | Conditional | `@IsDateString()`, only validated/required when `durationType !== HALF_DAY` (`@ValidateIf`). Ignored for `HALF_DAY`. |
| `durationType` | `LeaveDurationType` | No    | `@IsOptional() @IsEnum(LeaveDurationType)`. Default `FULL_DAY`.                                                |
| `isPaid`       | `boolean`         | No       | `@IsOptional() @IsBoolean()`. Default `true`.                                                                  |
| `reason`       | `string`          | No       | `@IsOptional() @IsString() @MaxLength(512)`.                                                                   |
| `approverIds`  | `string[]` (uuid) | Yes      | `@IsArray() @ArrayMinSize(1) @ArrayUnique() @IsUUID(undefined, { each: true })`. At least one required.       |

#### Response `201 Created`

```json
{
  "id": "leave-request-uuid",
  "employeeId": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
  "startDate": "2026-07-10T00:00:00.000Z",
  "endDate": "2026-07-12T00:00:00.000Z",
  "durationType": "FULL_DAY",
  "isPaid": true,
  "totalDays": 3,
  "reason": "Family event",
  "status": "PENDING",
  "createdById": "user-uuid",
  "createdAt": "2026-07-07T10:00:00.000Z",
  "updatedAt": "2026-07-07T10:00:00.000Z",
  "employee": {
    "id": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
    "employeeCode": "EMP-0012",
    "user": {
      "id": "employee-user-uuid",
      "firstName": "Aisha",
      "lastName": "Khan"
    }
  },
  "approvals": [
    {
      "id": "approval-uuid",
      "leaveRequestId": "leave-request-uuid",
      "approverId": "5939c357-3904-489e-8016-cc8e30eb89a5",
      "status": "PENDING",
      "remarks": null,
      "decidedAt": null,
      "createdAt": "2026-07-07T10:00:00.000Z",
      "updatedAt": "2026-07-07T10:00:00.000Z",
      "approver": {
        "id": "5939c357-3904-489e-8016-cc8e30eb89a5",
        "firstName": "Bilal",
        "lastName": "Ahmed",
        "email": "bilal@example.com"
      }
    }
  ],
  "createdBy": {
    "id": "user-uuid",
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com"
  }
}
```

> **Note**: `totalDays` is returned as a **number** (already converted from Prisma `Decimal`). `employee` is not re-serialized (nested `user` keeps only `id`/`firstName`/`lastName`, no `email`), whereas `createdBy` and each approval's `approver` are resolved via a users-map with `id`/`firstName`/`lastName`/`email`.

#### Validation Errors `400 Bad Request` / `404 Not Found`

```json
{ "statusCode": 404, "message": "Employee not found", "error": "Not Found" }
{ "message": "You cannot set yourself as an approver for your own leave request" }
{ "message": "The following approver user ID(s) are invalid: <id>, <id>" }
{ "message": "endDate is required for full-day leave requests" }
{ "message": "endDate cannot be before startDate" }
{ "message": "Cannot request leave on a weekly off day" }
{ "message": "Leave date range contains no working days" }
{ "message": "Employee has no active contract to request paid leave against" }
{ "message": "Insufficient leave balance: 2 day(s) remaining, 3 requested" }
```

---

### 2. List Leave Requests (Paginated)

```
GET /hr/leave-requests
Permission: leave-requests.view
```

#### Query Parameters

| Param        | Type                | Default     | Notes                                                                                     |
| ------------ | ------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| `page`       | `number`            | `1`         | Min 1, Max 100 (`PaginationDto`)                                                             |
| `limit`      | `number`            | `10`        | Min 1, Max 100 (`PaginationDto`)                                                              |
| `search`     | `string`            | —           | Inherited from `PaginationDto`, **accepted but currently has no effect** — the repository's `findAll` does not apply any search filter. Do not rely on it. |
| `employeeId` | `uuid`              | —           | `@IsOptional() @IsUUID()`. Filter by employee.                                                |
| `status`     | `LeaveRequestStatus`| —           | `@IsOptional() @IsEnum(LeaveRequestStatus)`. `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`. |
| `sortBy`     | `string`            | `createdAt` | Inherited from `PaginationDto`.                                                               |
| `sortOrder`  | `"ASC"` \| `"DESC"` | `"DESC"`    | Inherited from `PaginationDto`.                                                               |

#### Response `200 OK`

```json
{
  "data": [{ "...": "same shape as Create response" }],
  "meta": {
    "total": 14,
    "page": 1,
    "limit": 10,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

> Built via `buildPaginatedResponse` from `src/common/dto/pagination.dto.ts` — `meta` includes `hasNext`/`hasPrev` in addition to `totalPages`.

---

### 3. Get Single Leave Request

```
GET /hr/leave-requests/:leaveRequestId
Permission: leave-requests.view
```

#### Path Parameter

| Param            | Type   | Notes                                    |
| ---------------- | ------ | ------------------------------------------- |
| `leaveRequestId` | `uuid` | `ParseUUIDPipe`. Leave request ID.        |

#### Response `200 OK`

Same shape as the [Create response](#1-create-leave-request).

#### Response `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Leave request not found",
  "error": "Not Found"
}
```

---

### 4. Delete Leave Request

```
DELETE /hr/leave-requests/:leaveRequestId
Permission: leave-requests.manage
```

Hard-deletes a leave request (cascades to its `LeaveRequestApproval` rows via `onDelete: Cascade`). **Only allowed while the request is `PENDING` and no approver has decided yet** — see [Ownership & Approval Rules](#ownership--approval-rules). There is no creator-only restriction beyond this status check.

#### Path Parameter

| Param            | Type   | Notes                                     |
| ---------------- | ------ | ------------------------------------------- |
| `leaveRequestId` | `uuid` | `ParseUUIDPipe`. Leave request ID to delete. |

#### Response `200 OK`

```json
{
  "message": "Leave request deleted successfully"
}
```

#### Validation Error `400 Bad Request`

```json
{ "message": "Can only delete a leave request while it is pending and no approver has decided yet" }
```

#### Response `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Leave request not found",
  "error": "Not Found"
}
```

---

### 5. Decide Approval

```
POST /hr/leave-requests/:leaveRequestId/approve
Permission: leave-requests.approve
```

Records the **logged-in user's own** approval/rejection decision for this leave request. The logged-in user must be one of the assigned approvers (have a `LeaveRequestApproval` row) — see [Ownership & Approval Rules](#ownership--approval-rules). After recording the decision, the overall request `status` is recomputed from every approver's current decision. If the recomputed status becomes `APPROVED` and the request `isPaid`, `totalDays` is deducted from the employee's active contract's `consumedLeaves` in the same transaction.

**Business Rules:**

- Cannot submit any decision once the request is already `APPROVED` → `400`.
- The decision can be resubmitted/changed at any time before the request reaches `APPROVED` — including changing it back to `PENDING`.
- On final approval, if the employee's active contract balance is insufficient at the moment of deduction (race condition — e.g. balance consumed by another approval in between), the whole transaction fails and no status change is persisted.

#### Path Parameter

| Param            | Type   | Notes                                |
| ---------------- | ------ | ---------------------------------------- |
| `leaveRequestId` | `uuid` | `ParseUUIDPipe`. Leave request ID.     |

#### Request Body

```json
{
  "decision": "APPROVED",
  "remarks": "Approved, enjoy your leave."
}
```

| Field      | Type                  | Required | Notes                                                                                                          |
| ---------- | --------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `decision` | `LeaveApprovalStatus` | Yes      | `@IsIn([PENDING, APPROVED, REJECTED])`. The approver's decision.                                              |
| `remarks`  | `string`              | No       | `@IsOptional() @IsString()`. Sent as `null` if omitted.                                                       |

#### Response `200 OK`

Full updated leave request (same shape as [Create response](#1-create-leave-request)) — the matching entry in `approvals[]` reflects the new `status`, `remarks`, and `decidedAt` (set to the current timestamp, or `null` if `decision = PENDING`); top-level `status` reflects the recomputed overall status.

#### Validation Errors `400 Bad Request` / `403 Forbidden` / `404 Not Found`

```json
{ "statusCode": 404, "message": "Leave request not found", "error": "Not Found" }
{ "message": "Cannot change an approval decision once the leave request has been fully approved" }
{ "statusCode": 403, "message": "You are not an approver for this leave request", "error": "Forbidden" }
```

> The following errors are also thrown by the repository's `deductFromActiveContract` step at the moment of final approval, but under normal use they should not occur (the same conditions are already checked at create time — these guard against a contract being deactivated or its balance changing between create and final approval):
```json
{ "message": "Employee has no active contract to deduct leave from" }
{ "message": "Insufficient leave balance on the employee's active contract" }
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

### 403 Forbidden (missing permission, or not an assigned approver)

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

> Note: the "not an assigned approver" case (`POST /:leaveRequestId/approve`) uses the same `403` shape but with `message: "You are not an approver for this leave request"` instead of the generic `"Forbidden resource"`.

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Leave request not found",
  "error": "Not Found"
}
```

> **Note**: No `409 Conflict` scenario was found in this module's code (no unique-constraint violation path is reachable from these endpoints — `approverIds` are deduplicated before insert, and there is no unique constraint on employee + date range).

---

## Frontend Implementation Notes

### Status Colors (suggested)

**Leave Request `status`**

| Status      | Color        |
| ----------- | ------------ |
| `PENDING`   | Amber/Orange |
| `APPROVED`  | Green        |
| `REJECTED`  | Red          |
| `CANCELLED` | Gray (unused by current backend logic — no UI action produces it) |

**Approval `status` (per-approver, shown in an approvals list/timeline)**

| Status     | Color        |
| ---------- | ------------ |
| `PENDING`  | Gray         |
| `APPROVED` | Green        |
| `REJECTED` | Red          |

### Typical Screen Flows

**Leave Requests List Screen**

- `GET /hr/leave-requests` with pagination, `employeeId`, `status` filters. Do not wire up a `search` box against this endpoint — the query param is accepted but the backend does not currently filter by it.
- Status badge driven by `status`; consider showing an approvals-progress indicator (e.g. "1 of 2 approved") derived from `approvals[]`.

**Create Leave Request Screen**

- Employee picker → `employeeId`.
- Duration type toggle (`FULL_DAY` / `HALF_DAY`): when `HALF_DAY` is selected, hide/disable the end-date picker client-side (it is ignored server-side and forced to `startDate`).
- Paid/unpaid toggle (`isPaid`) — consider showing the employee's remaining leave balance client-side before submit if available, since the backend will reject with `"Insufficient leave balance: X day(s) remaining, Y requested"` otherwise.
- Approver multi-select → `approverIds` (at least one). If the requester is requesting for themselves, exclude their own user from the approver options to avoid the self-approval error.
- `POST /hr/leave-requests` → navigate to the detail screen on success.

**Leave Request Detail Screen**

- `GET /hr/leave-requests/:leaveRequestId` — show header (dates, duration, `totalDays`, `isPaid`, `reason`, requester via `createdBy`, employee via `employee`).
- Approvals section: list each `approvals[]` entry with `approver` name, `status`, `remarks`, `decidedAt`.
- "Delete" action — only show/enable when `status === "PENDING"` **and** every approval is still `PENDING` (client-side mirror of the server check) → `DELETE /:leaveRequestId`.
- "Approve" / "Reject" action — only show/enable for the logged-in user if their own user ID appears among `approvals[].approverId` **and** overall `status !== "APPROVED"` → `POST /:leaveRequestId/approve` with `{ "decision": "APPROVED" | "REJECTED", "remarks": "..." }`. Prompt for `remarks` on reject (not required by the API, but recommended UX).
- After a decision that flips the overall status to `APPROVED`, consider showing a toast/note that paid leave (if `isPaid`) has now been deducted from the employee's contract balance.

**Permissions-driven UI**

- Hide the "Create" button and form unless the user has `leave-requests.manage`.
- Hide "Approve"/"Reject" controls unless the user has `leave-requests.approve` **and** is an assigned approver for that specific request (permission alone is not sufficient — the backend will still 403 with a specific message if they're not on the approvals list).

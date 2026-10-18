# Employee Module — Frontend API Reference

> **Purpose**: Complete API reference for the HR Employee module — hiring, profile management, and document attachments.
> **Audience**: Frontend developers building the Employee List, Employee Profile, Hire/Edit Employee, and Employee Documents screens.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. All Prisma `Decimal` values are auto-converted to JS numbers by this interceptor. **All response examples in this document show the inner `data` payload only.**

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Employee API](#employee-api)
   - [List Employees (paginated)](#1-list-employees-paginated)
   - [Employees Dropdown](#2-employees-dropdown)
   - [Get Single Employee](#3-get-single-employee)
   - [Create Employee (Hire)](#4-create-employee-hire)
   - [Update Employee](#5-update-employee)
   - [Attach Employee Document](#6-attach-employee-document)
5. [Error Responses](#error-responses)
6. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

The Employee module is the core HR identity record. Every employee is either:

- **A system user** (`loginAccess: ENABLED`) — has a linked `User` record (email, password, role) and can log in, or
- **A laborer/worker with no system access** (`loginAccess: DISABLED`) — no email/password required, `userId` is `null`.

Creating an employee optionally creates a `User` in the **same transaction** (see [Create Employee](#4-create-employee-hire)).

The Employee record links to several other modules — this doc covers **only** the Employee module's own endpoints. For their full CRUD APIs, see the respective module docs (written separately):

| Related entity    | Linked via         | Notes                                                             |
| ------------------ | ------------------ | ------------------------------------------------------------------ |
| `User`              | `userId` (nullable) | Login credentials, name, email, phone, role — see Users module docs |
| `Shift`              | `shiftId` (nullable) | Work schedule — see Shifts module docs                             |
| `EmployeeContract`   | `employee.contracts` | Position/department/salary — see Contracts module docs             |
| `EmployeeDocument`   | `employee.documents` | Uploaded files — managed via this module (see endpoint 5 below)   |
| Attendance, Leave, Loan, Roster, Overtime, Payslip, Payroll | `employeeId` on each | Each has its own dedicated module/doc |

---

## Permissions

| Permission Key        | What it guards                                                              |
| ---------------------- | ---------------------------------------------------------------------------- |
| `hr.view`               | List employees, get single employee                                          |
| `hr.manage_employees`   | Create employees (hire), update employees, attach employee documents         |

> **Note**: `hr.view` and `hr.manage_employees` are part of the broader `HR_PERMISSIONS` set (`src/users/permissions/modules/hr.permissions.ts`), which also defines permissions for other HR sub-modules (`hr.manage_attendance`, `hr.manage_payroll`, `hr.manage_contracts`, etc.) that are **not** used by any Employee endpoint.

---

## Enums & Constants

### `EmployeeStatus`

```
ACTIVE       — Currently employed and working
INACTIVE     — Not currently active (e.g. on long leave) — login access auto-disabled
TERMINATED   — Employment ended — login access auto-disabled
ONBOARDING   — New hire, not yet fully active — login access auto-disabled
```

### `LoginAccess`

```
ENABLED    — Can log in (requires linked User with email + password)
DISABLED   — Cannot log in
SUSPENDED  — Defined in schema but never set by any Employee module code path (reserved for future use)
```

### Status → Login Access auto-mapping

When `PATCH /hr/employees/:employeeId` is called with a `status` field, the employee's linked user's `loginAccess` is **automatically derived and overrides any `loginAccess` also sent in the same request**:

```
ACTIVE     → ENABLED
INACTIVE   → DISABLED
TERMINATED → DISABLED
ONBOARDING → DISABLED
```

> **Note**: This derived value always wins over an explicit `loginAccess` sent in the same PATCH body — see [Update Employee](#5-update-employee) business rules.

### `ShiftType` (read-only reference, used in the `shift` sub-object)

```
FIXED     — Fixed clock-in/out window; late tracking via graceMinutes
FLEXIBLE  — Only total hours worked matter; no late/early concept
```

---

## Employee API

### 1. List Employees (Paginated)

```
GET /hr/employees
Permission: hr.view
```

#### Query Parameters

| Param       | Type                | Default     | Notes                                                                                       |
| ----------- | ------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| `page`      | `number`             | `1`         | Min 1, Max 100                                                                               |
| `limit`     | `number`             | `10`        | Min 1, Max 100                                                                               |
| `search`    | `string`             | —           | Matches `employeeCode` **OR** the linked user's `firstName`/`lastName`/`email` (case-insensitive, partial match) |
| `status`    | `EmployeeStatus`     | —           | `ACTIVE`, `INACTIVE`, `TERMINATED`, `ONBOARDING`                                              |
| `sortBy`    | `string`             | `createdAt` (desc) | One of `employeeCode`, `dateOfJoining`, `status`, `createdAt`, `updatedAt`. Any other value falls back to the default `createdAt` descending (no error). |
| `sortOrder` | `"ASC"` \| `"DESC"`  | `DESC` when `sortBy` is set | Applied only when `sortBy` is a valid sortable field. |

> **Note**: `sortBy` is whitelisted server-side against the fields above (all direct `Employee` columns — sorting by the linked user's name is not supported). An unrecognized value silently falls back to `createdAt` newest-first rather than erroring.

#### Response `200 OK`

Each item omits `shift` and `documents` (list view is intentionally lean — use [Get Single Employee](#3-get-single-employee) for the full profile).

```json
{
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "employeeCode": "EMP-0001",
      "dateOfJoining": "2026-01-15T00:00:00.000Z",
      "status": "ACTIVE",
      "shiftId": "11111111-1111-1111-1111-111111111111",
      "createdById": "user-uuid",
      "createdAt": "2026-01-15T09:00:00.000Z",
      "updatedAt": "2026-01-15T09:00:00.000Z",
      "user": {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "phone": "+923001234567",
        "role": {
          "id": "role-uuid",
          "name": "Staff",
          "description": "Default staff role",
          "isSystem": false,
          "isActive": true,
          "createdAt": "2025-12-01T00:00:00.000Z",
          "updatedAt": "2025-12-01T00:00:00.000Z"
        },
        "loginAccess": "ENABLED"
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

> For a laborer with no login access, `userId` is `null` and `user` is `null`.

---

### 2. Employees Dropdown

```
GET /hr/employees/dropdown
Permission: hr.view
```

Returns all **`ACTIVE`** employees as a minimal, non-paginated list ordered by `employeeCode` ascending — intended for populating employee pickers (leave request, loan request, payroll, contract forms, etc.). Employees in `INACTIVE`, `TERMINATED`, or `ONBOARDING` status are excluded.

#### Response `200 OK`

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "employeeCode": "EMP-0001",
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
]
```

| Field          | Type                                      | Notes                                                            |
| -------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| `id`           | `uuid`                                    | Employee ID — this is the value to submit as `employeeId`        |
| `employeeCode` | `string`                                  | Unique                                                           |
| `user`         | `{ id, firstName, lastName } \| null`     | `null` for laborers with no linked user — display `employeeCode` alone in that case |

---

### 3. Get Single Employee

```
GET /hr/employees/:employeeId
Permission: hr.view
```

Returns the full employee profile, including `shift` and `documents`.

#### Path Parameter

| Param        | Type   | Notes       |
| ------------ | ------ | ----------- |
| `employeeId` | `uuid` | Employee ID |

#### Response `200 OK`

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "employeeCode": "EMP-0001",
  "dateOfJoining": "2026-01-15T00:00:00.000Z",
  "status": "ACTIVE",
  "shiftId": "11111111-1111-1111-1111-111111111111",
  "createdById": "user-uuid",
  "createdAt": "2026-01-15T09:00:00.000Z",
  "updatedAt": "2026-01-15T09:00:00.000Z",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+923001234567",
    "role": {
      "id": "role-uuid",
      "name": "Staff",
      "description": "Default staff role",
      "isSystem": false,
      "isActive": true,
      "createdAt": "2025-12-01T00:00:00.000Z",
      "updatedAt": "2025-12-01T00:00:00.000Z"
    },
    "loginAccess": "ENABLED"
  },
  "shift": {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "Morning Shift",
    "type": "FIXED",
    "startTime": "09:00",
    "endTime": "18:00"
  },
  "documents": [
    {
      "id": "doc-uuid-1",
      "employeeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "documentType": "CNIC",
      "fileUrl": "https://storage.example.com/docs/cnic-0001.pdf",
      "uploadedAt": "2026-01-16T10:00:00.000Z",
      "createdAt": "2026-01-16T10:00:00.000Z",
      "updatedAt": "2026-01-16T10:00:00.000Z",
      "createdById": "user-uuid"
    }
  ]
}
```

`documents` is ordered by `uploadedAt` descending (newest first). `shift` is `null` if no shift is assigned.

#### Response `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Employee not found",
  "error": "Not Found"
}
```

---

### 4. Create Employee (Hire)

```
POST /hr/employees
Permission: hr.manage_employees
```

Creates a `User` (optional) + `Employee` **atomically in one transaction**. Audited via `@Auditable` (`AuditModule.HR_EMPLOYEES`) — the full created entity is returned as the audit `newValue`.

#### Request Body

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+923001234567",
  "loginAccess": "ENABLED",
  "roleId": "role-uuid",
  "shiftId": "11111111-1111-1111-1111-111111111111",
  "password": "SecurePass1",
  "employeeCode": "EMP-0001",
  "dateOfJoining": "2026-01-15",
  "status": "ACTIVE"
}
```

| Field           | Type                | Required    | Notes                                                                                                    |
| --------------- | ------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `firstName`      | `string`             | Yes         | `@IsNotEmpty`, max length 64                                                                                |
| `lastName`       | `string`             | Yes         | `@IsNotEmpty`, max length 64                                                                                |
| `email`          | `string`             | Conditional | `@IsEmail`, max length 128. **Required if `loginAccess = ENABLED`**; omit for laborers with no system access |
| `phone`          | `string`             | No          | Max length 32                                                                                              |
| `loginAccess`    | `LoginAccess`        | Yes         | `@IsNotEmpty`, `@IsEnum`. `ENABLED` for staff who log in, `DISABLED` for laborers. No default in the DTO — must always be sent |
| `roleId`         | `string`             | Conditional | **Required whenever `email` is provided** (a user account is created for any employee with an email), and therefore always required when `loginAccess = ENABLED`. Nullable in the DB — omit entirely when no `email` is sent |
| `shiftId`        | `uuid`               | **Yes**     | `@IsNotEmpty`, `@IsUUID`. **Always required, regardless of `loginAccess`** — unlike `roleId`/`email`/`password`, shift assignment applies to every employee including laborers with no login. Must be an existing `Shift` id (pick from the Shifts module dropdown) |
| `password`       | `string`             | Conditional | Min length 6. **Required if `loginAccess = ENABLED`**                                                       |
| `employeeCode`    | `string`             | Yes         | `@IsNotEmpty`, max length 32. Must be unique                                                                |
| `dateOfJoining`   | `ISO date string`    | Yes         | `@IsDateString`                                                                                            |
| `status`          | `EmployeeStatus`     | No          | Defaults to `ACTIVE` if omitted                                                                            |

> **Note — no default role**: There is deliberately no "default to Staff" fallback. Whenever `email` is present in the payload, `roleId` must be sent too — omitting it returns a clean `400` with the message below. This applies even when `loginAccess = DISABLED` (an email always triggers user-account creation).

> **Note — `shiftId` is not existence-checked**: the backend does not verify the shift exists before creating the employee; an invalid `shiftId` fails on the underlying foreign-key constraint rather than returning a clean `400`. Always populate the shift picker from `GET /hr/shifts` (or its dropdown, see Shifts module docs) rather than allowing free-text entry, so this can't happen from the UI.

**Business Rules (validated in this order):**

1. If `loginAccess = ENABLED` and `email` is missing → `400`.
2. If `loginAccess = ENABLED` and `password` is missing → `400`.
3. If `loginAccess = ENABLED` and `roleId` is missing → `400`.
4. If `email` is provided (any `loginAccess`) and `roleId` is missing → `400`.
5. `shiftId` is required on every hire — missing/empty/non-UUID → `400` from the DTO validator, before any business-rule checks run.
6. `employeeCode` must not already be in use → `400` (checked via a dedicated lookup, not a DB unique-constraint catch).
7. If `email` is provided, a `User` is created in the same transaction with a bcrypt-hashed password (if provided) and the given `roleId`/`loginAccess`.
8. If `email` is omitted, no `User` is created — `Employee.userId` is `null`.
9. Duplicate `email` on the underlying `User` unique constraint is caught and converted to a clean `409`.

#### Response `201 Created`

Same shape as [Get Single Employee](#3-get-single-employee) (includes `user`, the assigned `shift`, and `documents: []` for a brand-new hire). Unlike before, `shift` is no longer `null` on a fresh hire — the submitted `shiftId` is now persisted and populated on the create response.

#### Validation Errors `400 Bad Request`

```json
{ "message": "Email is required when loginAccess is ENABLED" }
{ "message": "Password is required when loginAccess is ENABLED" }
{ "message": "Role ID is required when loginAccess is ENABLED" }
{ "message": "Role ID is required when an email is provided — a user account is created for any employee with an email" }
{ "message": "Employee code EMP-0001 is already in use" }
{ "message": ["firstName should not be empty", "dateOfJoining must be a valid ISO 8601 date string", "shiftId should not be empty", "shiftId must be a UUID"] }
```

#### Conflict Error `409 Conflict`

```json
{ "statusCode": 409, "message": "A user with this email already exists", "error": "Conflict" }
```

---

### 5. Update Employee

```
PATCH /hr/employees/:employeeId
Permission: hr.manage_employees
```

Updates the employee's HR profile (`employeeCode`, `dateOfJoining`, `status`, `shiftId`) and/or the linked user's personal info (`firstName`, `lastName`, `email`, `phone`, `roleId`, `password`, `loginAccess`) in one call. Audited via `@Auditable` (`AuditModule.HR_EMPLOYEES`) — the full updated entity is returned as the audit `newValue`.

**Business Rules:**

- **A user cannot update their own employee profile** — if `employee.userId === req.user.id`, the request is rejected with `403`.
- If the DTO explicitly sets `loginAccess: ENABLED` (and no `status` is sent to override it) but no `password` is provided → `400`. Note: this check only fires for an **explicit** `loginAccess` in the body — it is not re-checked against the status-derived value.
- If `status` is sent, the linked user's `loginAccess` is **auto-derived** from `STATUS_LOGIN_ACCESS_MAP` (see [Enums & Constants](#status--login-access-auto-mapping)) and **overrides** any explicit `loginAccess` also sent in the same request.
- User fields (`firstName`/`lastName`/`email`/`phone`/`roleId`/`loginAccess`/`password`) are only applied if the employee has a linked `userId`. If the employee has no linked user (`userId` is `null`, e.g. a laborer), any user fields sent are **silently ignored** — no error is thrown.
- `phone` supports being explicitly cleared: sending `phone: null` (or `""`) updates it; the check is `phone !== undefined`, so omitting the field entirely leaves it unchanged.
- `shiftId` supports explicit unassignment: send `shiftId: null` to remove the shift; omit the field entirely to leave it unchanged (the check is `shiftId !== undefined`).
- Duplicate `email` on the underlying `User` unique constraint is caught and converted to a clean `409` with message `"A user with this email already exists"`.
- Duplicate `employeeCode` on the `Employee` unique constraint is caught and converted to a clean `409` with message `"Employee code is already in use"`.

#### Path Parameter

| Param        | Type   | Notes                 |
| ------------ | ------ | ----------------------- |
| `employeeId` | `uuid` | Employee ID to update |

#### Request Body

All fields optional (partial update). Same field set/validation as [Create Employee](#4-create-employee-hire) — including `shiftId`, which is required on create but optional/nullable here (send `null` to unassign, omit to leave unchanged).

```json
{
  "phone": "+923009876543",
  "status": "INACTIVE",
  "shiftId": null
}
```

| Field           | Type                     | Required | Notes                                                                                  |
| --------------- | ------------------------ | -------- | ----------------------------------------------------------------------------------------- |
| `firstName`      | `string`                  | No       | Same constraints as create                                                                |
| `lastName`       | `string`                  | No       | Same constraints as create                                                                |
| `email`          | `string`                  | No       | `@IsEmail`, max length 128                                                                |
| `phone`          | `string`                  | No       | Max length 32; only applied if employee has a linked user                                |
| `loginAccess`    | `LoginAccess`             | No       | Overridden by the `status`-derived value if `status` is also sent in the same request     |
| `roleId`         | `string`                  | No       |                                                                                            |
| `password`       | `string`                  | No       | Min length 6; required if explicit `loginAccess: ENABLED` is sent with no `status`         |
| `employeeCode`    | `string`                  | No       | Max length 32; must remain unique                                                          |
| `dateOfJoining`   | `ISO date string`         | No       |                                                                                            |
| `status`          | `EmployeeStatus`          | No       | Auto-derives the linked user's `loginAccess` (see above)                                   |
| `shiftId`         | `uuid` \| `null`          | No       | `@IsUUID`. Pass `null` to unassign; omit to leave unchanged                                |

#### Response `200 OK`

Full updated employee (same shape as [Get Single Employee](#3-get-single-employee)).

#### Validation Errors `400 Bad Request` / `403 Forbidden`

```json
{ "message": "Password is required when enabling login access" }
{ "statusCode": 403, "message": "You cannot update your own employee profile", "error": "Forbidden" }
```

#### Conflict Errors `409 Conflict`

```json
{ "statusCode": 409, "message": "A user with this email already exists", "error": "Conflict" }
{ "statusCode": 409, "message": "Employee code is already in use", "error": "Conflict" }
```

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Employee not found", "error": "Not Found" }
```

---

### 6. Attach Employee Document

```
POST /hr/employees/:employeeId/documents
Permission: hr.manage_employees
```

Attaches a document record to an employee. The file itself must already be uploaded elsewhere (e.g. object storage) — this endpoint only stores the resulting URL and metadata.

> **Note**: Unlike Create/Update Employee, this route is **not** decorated with `@Auditable` — attaching a document is not written to the audit log.

#### Path Parameter

| Param        | Type   | Notes       |
| ------------ | ------ | ----------- |
| `employeeId` | `uuid` | Employee ID |

#### Request Body

```json
{
  "documentType": "CNIC",
  "fileUrl": "https://storage.example.com/docs/cnic-0001.pdf"
}
```

| Field           | Type     | Required | Notes                                                                                                    |
| --------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `documentType`   | `string`  | Yes      | `@IsNotEmpty`, max length 64. **Free text, not a restricted enum** — example values given in Swagger docs: `CNIC`, `CONTRACT`, `OFFER_LETTER` |
| `fileUrl`        | `string`  | Yes      | `@IsUrl`, `@IsNotEmpty` — must be a valid URL                                                                |

#### Response `201 Created`

Returns the created `EmployeeDocument` record only (not the full employee):

```json
{
  "id": "doc-uuid-1",
  "employeeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "documentType": "CNIC",
  "fileUrl": "https://storage.example.com/docs/cnic-0001.pdf",
  "uploadedAt": "2026-01-16T10:00:00.000Z",
  "createdAt": "2026-01-16T10:00:00.000Z",
  "updatedAt": "2026-01-16T10:00:00.000Z",
  "createdById": "user-uuid"
}
```

> To see the document reflected in the employee's `documents[]` array, re-fetch via `GET /hr/employees/:employeeId`.

#### Not Found `404 Not Found`

```json
{ "statusCode": 404, "message": "Employee not found", "error": "Not Found" }
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

### 403 Forbidden (missing permission, or self-update)

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
  "message": "Employee not found",
  "error": "Not Found"
}
```

### 409 Conflict (duplicate email / employee code)

```json
{
  "statusCode": 409,
  "message": "A user with this email already exists",
  "error": "Conflict"
}
```

---

## Frontend Implementation Notes

### Status Colors (suggested)

**Employee `status`**

| Status        | Color        |
| ------------- | ------------ |
| `ONBOARDING`   | Blue         |
| `ACTIVE`       | Green        |
| `INACTIVE`     | Amber/Orange |
| `TERMINATED`   | Red          |

**`loginAccess` (on `user`)**

| Status       | Color |
| ------------ | ----- |
| `ENABLED`     | Green |
| `DISABLED`    | Gray  |
| `SUSPENDED`   | Red   |

### Two Distinct Hire Flows

The Hire screen should branch on a "Has system login?" toggle mapped to `loginAccess`:

- **Staff (`loginAccess: ENABLED`)** — show `email`, `password`, and a role picker (`roleId`); all three become required.
- **Laborer (`loginAccess: DISABLED`)** — hide `email`/`password`/`roleId` entirely (omit from the payload); only `firstName`, `lastName`, `employeeCode`, `dateOfJoining` are needed. Always still send `loginAccess: "DISABLED"` explicitly since the DTO requires it.
- **Both flows** — a shift picker (`shiftId`) is always shown and always required, regardless of the login-access toggle. This is unconditional, unlike `email`/`password`/`roleId` which only apply to the staff flow.

> If a laborer screen still needs to capture an email (e.g. for contact purposes) without granting login, a `roleId` must be collected too — an email always creates a user account, and the backend returns a `400` if `roleId` is missing.

### Editing Your Own Profile

Disable the Edit action entirely (or show a clear "cannot edit own profile" message) when the logged-in user is viewing their own employee record — the backend rejects this with a 403 regardless of what UI controls exist.

### Status Change Side-Effects

When building a "Change Status" action (e.g. terminate/deactivate/reactivate an employee), warn the user that changing `status` will automatically flip the linked user's login access per the mapping table above — e.g. setting `status: TERMINATED` immediately locks that user out, even if the form also happened to submit `loginAccess: ENABLED`.

### Shift Assignment

- **On hire**: `shiftId` is a required field in the Hire form — include the shift picker unconditionally (not gated behind the login-access toggle) and validate it client-side the same as any other required field, since the backend now rejects a create request with a missing/empty `shiftId`.
- **On edit**: use a dedicated "Assign Shift" control that PATCHes `shiftId` (a UUID from the Shifts module) or `null` to unassign. Omitting the field in a PATCH that only changes other fields (e.g. just `phone`) leaves the current shift untouched — no need to always resend `shiftId`.

### Document Uploads

This endpoint does not handle file upload itself — the frontend must first upload the file to wherever the org's file storage lives and obtain a public `fileUrl`, then call `POST /hr/employees/:employeeId/documents` with that URL and a `documentType` label. Since `documentType` is free text, use a fixed dropdown of conventional values (`CNIC`, `CONTRACT`, `OFFER_LETTER`, etc.) client-side to keep data consistent, rather than a free-text input.

### Typical Screen Flows

**Employee List Screen**

- `GET /hr/employees` with pagination, `search`, `status`.
- Sortable columns: `employeeCode`, `dateOfJoining`, `status`, `createdAt`, `updatedAt` (whitelisted server-side; unrecognized values fall back to `createdAt` newest-first). Sorting by the linked user's name is not supported.
- Status badge driven by `status`; show a small login-access icon/badge from `user.loginAccess` when `user` is present.

**Hire Employee Screen**

- `POST /hr/employees` — branch the form based on the login-access toggle as described above.
- On `409` (duplicate email) or `400` (duplicate employee code), surface the exact backend message inline on the relevant field.

**Employee Profile Screen**

- `GET /hr/employees/:employeeId` — show personal info (`user`), HR info (`employeeCode`, `dateOfJoining`, `status`), shift assignment, and a documents list/table.
- "Edit" action → `PATCH /hr/employees/:employeeId` (disabled for the current user's own profile).
- "Attach Document" action → `POST /hr/employees/:employeeId/documents`, then re-fetch the profile to refresh `documents[]`.
- **"View Contracts" tab/button** → `GET /hr/contracts?employeeId=:employeeId` (Contracts module) — lists this employee's full contract history; add `&status=ACTIVE` to show only the current contract. There is no contracts array on the employee response itself, and no contract dropdown exists (a contract belongs to exactly one employee, so contracts are always reached *through* an employee, never picked from a global list).

**Employee Pickers (other modules' forms)**

- Leave request, loan request, payroll, and contract forms should populate their employee selector from `GET /hr/employees/dropdown` — it returns only `ACTIVE` employees with just `id`, `employeeCode`, and the linked user's name. Display as `firstName lastName (employeeCode)`, falling back to `employeeCode` alone when `user` is `null`.

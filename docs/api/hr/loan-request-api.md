# Loan Request Module — Frontend API Reference

> **Purpose**: Complete API reference for the HR Loan Request module — employee loan requests, multi-approver sign-off, and installment repayment tracking.
> **Audience**: Frontend developers building the Loan Request list/detail, approval, and installment screens.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. All Prisma `Decimal` values are auto-converted to JS numbers by this interceptor. **All response examples in this document show the inner `data` payload only.**

> **Note**: This is a **dedicated, standalone module** (`src/hr/loan-request/`). It is separate from the Leave Request module — the two are unrelated and do not share endpoints, DTOs, or permissions.

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Loan Request API](#loan-request-api)
   - [List Loan Requests (paginated)](#1-list-loan-requests-paginated)
   - [Get Single Loan Request](#2-get-single-loan-request)
   - [Create Loan Request](#3-create-loan-request)
   - [Update Loan Request](#4-update-loan-request)
   - [Delete Loan Request](#5-delete-loan-request)
   - [Decide Approval](#6-decide-approval)
   - [Pay Installment](#7-pay-installment)
5. [Error Responses](#error-responses)
6. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

The Loan Request module lets an employee (or HR on their behalf) request a salary-advance-style loan that is repaid via fixed monthly installments, subject to approval by one or more designated approvers.

| Concern              | Base Path                                                      | Description                                                    |
| --------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------- |
| Loan Requests         | `/hr/loan-requests`                                             | Create/list/update/delete loan requests                        |
| Approvals             | `/hr/loan-requests/:loanRequestId/approve`                      | Record an assigned approver's decision                         |
| Installments          | `/hr/loan-requests/:loanRequestId/installments/:loanInstallmentId/pay` | Manually mark a single installment as paid                      |

### Lifecycle

```
PENDING ──► APPROVED ──► COMPLETED
   │
   └──► REJECTED
```

- **PENDING**: Initial state. Every assigned approver's decision (`LoanRequestApproval.status`) starts as `PENDING`. The request can still be freely updated/deleted by its creator as long as **no approver has decided yet**.
- **APPROVED**: Set automatically the moment **every** assigned approver has individually approved. At that same moment, repayment installments are generated (see [Installment Generation](#installment-generation)). Once `APPROVED`, the request is locked — approval decisions can no longer be changed, and update/delete are blocked.
- **REJECTED**: Set automatically the moment **any** assigned approver rejects. A rejected request's approvals can still be revised (e.g. an approver changes their mind back to `PENDING`/`APPROVED`), which will recompute the overall status again.
- **COMPLETED**: Set automatically once `paidAmount >= totalAmount` (i.e. every installment has been paid).
- **CANCELLED**: Defined in the `LoanRequestStatus` enum in the database schema, but **no current endpoint in this module ever sets it** — there is no "cancel" action exposed today.
  > **Note**: could not verify a cancel flow exists anywhere — the enum value appears unused by this module's code as of this writing.

### Approval Model

- A loan request has one or more approvers, recorded as `LoanRequestApproval` rows (one per `approverId`), all starting at `PENDING`.
- Being listed as an approver **never grants the permission by itself** — at creation/update time, every proposed `approverId` is validated to already hold `loan-requests.approve` through their role. If not, the request is rejected with a `400` (see error list below).
- An employee requesting a loan for **themselves** cannot list themselves as one of their own approvers.
- Only the **user recorded on the matching `LoanRequestApproval` row** (`approverId === userId`) may call the approve endpoint for that row — holding `loan-requests.approve` in general is necessary to pass the route guard, but the service additionally checks that the caller has an actual approval row assigned to them for that specific loan request.

### Ownership Model (Update / Delete)

- **Only the creator** (`createdById`) of a loan request may update or delete it. Holding `loan-requests.manage` (or `loan-requests.update`/`loan-requests.delete`) only unlocks the *route* — it never grants authority over a request created by someone else. Violating this throws:
  ```json
  { "message": "Only the creator of a loan request can update it" }
  { "message": "Only the creator of a loan request can delete it" }
  ```
- Additionally, update/delete are only allowed while the request is still `PENDING` **and** no approver has recorded a decision yet:
  ```json
  { "message": "Can only update a loan request while it is pending and no approver has decided yet" }
  { "message": "Can only delete a loan request while it is pending and no approver has decided yet" }
  ```

### Installment Generation

- Triggered automatically inside the same DB transaction as the approval decision that causes the request to become fully `APPROVED`.
- `totalAmount` is split evenly across `totalInstallments`; the **last** installment absorbs any rounding remainder so every cent of `totalAmount` is accounted for.
- Each installment is scheduled to a `returnMonth` (`"YYYY-MM"` string) starting the month **after** approval — installment 1 = next month, installment 2 = month after that, etc.
- Installments are only ever generated once (the service blocks re-deciding an already-`APPROVED`/`COMPLETED` request).

### Installment Payment

- `POST /:loanRequestId/installments/:loanInstallmentId/pay` marks one installment `PAID`, adds its amount to the loan's running `paidAmount`, and flips the loan request to `COMPLETED` once `paidAmount >= totalAmount`.
- **The Payroll module already calls this automatically** when a payroll run containing a matching loan-deduction line is marked `PAID` — this endpoint exists mainly as a **manual correction** tool for HR (e.g. fixing a payroll that was processed outside the normal payroll flow).
- The underlying update is done as a conditional `updateMany` (`status: PENDING` in the `WHERE`), so double-processing the same installment concurrently cannot double-count `paidAmount`.

### Affordability Check

- On both create and update (when `totalAmount`/`totalInstallments` change), the largest single installment is checked against a cap: `tenant HR settings.maxLoanInstallmentPercent` (default `70`) percent of the employee's **current monthly salary** (`SalaryRevisionService.getCurrentSalaryForEmployee`).
- Non-monthly salary frequencies are normalized to a monthly-equivalent before comparison: `WEEKLY × 52/12`, `BIWEEKLY × 26/12`; `DAILY`/`HOURLY` are compared as-is (best effort, since days/hours worked aren't tracked on the salary revision).
- If the employee has no active salary revision on record, the request is rejected outright.

---

## Permissions

Defined in `src/users/permissions/modules/loan-requests.permissions.ts`.

| Permission Key           | Description                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `loan-requests.view`      | View loan requests (list + single)                                                       |
| `loan-requests.create`    | Create loan requests                                                                     |
| `loan-requests.update`    | Update loan requests you created                                                          |
| `loan-requests.delete`    | Delete loan requests you created                                                          |
| `loan-requests.manage`    | Bundles create, update, delete and installment-payment actions into one permission        |
| `loan-requests.approve`   | Approve or reject loan requests as an assigned approver                                  |

> **Route-level OR logic**: Where a route lists two permissions (e.g. `create` + `manage`), the guard grants access if the caller holds **either one** (`Array.some`) — it is not an AND. A user with only `loan-requests.manage` can create/update/delete without also having the narrower `loan-requests.create`/`update`/`delete` permissions.

| Route                                                                | Required Permission(s) (any one)              |
| ---------------------------------------------------------------------- | ------------------------------------------------ |
| `GET /hr/loan-requests`                                              | `loan-requests.view`                            |
| `GET /hr/loan-requests/:loanRequestId`                               | `loan-requests.view`                            |
| `POST /hr/loan-requests`                                             | `loan-requests.create`, `loan-requests.manage`  |
| `PATCH /hr/loan-requests/:loanRequestId`                             | `loan-requests.update`, `loan-requests.manage`  |
| `DELETE /hr/loan-requests/:loanRequestId`                            | `loan-requests.delete`, `loan-requests.manage`  |
| `POST /hr/loan-requests/:loanRequestId/approve`                      | `loan-requests.approve`                         |
| `POST /hr/loan-requests/:loanRequestId/installments/:id/pay`         | `loan-requests.manage`                          |

---

## Enums & Constants

### `LoanRequestStatus`

```
PENDING    — Awaiting approver decisions
APPROVED   — All approvers approved; installments generated
REJECTED   — At least one approver rejected
CANCELLED  — Defined in schema, but not reachable via any current endpoint in this module
COMPLETED  — paidAmount >= totalAmount (all installments paid)
```

### `LoanApprovalStatus` (per-approver decision, on `LoanRequestApproval.status`)

```
PENDING
APPROVED
REJECTED
```

### `LoanInstallmentStatus`

```
PENDING
PAID
```

### `repaymentStatus` (computed, not stored — added by the repository serializer)

```
UNPAID          — paidAmount <= 0
PARTIALLY_PAID  — 0 < paidAmount < totalAmount
FULLY_PAID      — paidAmount >= totalAmount
```

### `SalaryFrequency` (relevant to the affordability check; not part of this module's own schema)

```
MONTHLY
WEEKLY
BIWEEKLY
DAILY
HOURLY
```

### Decimal Fields

`totalAmount`, `paidAmount`, `remainingAmount`, and each installment's `amount` are Prisma `Decimal` fields **converted to JS `number`** by the repository's serializer — they come back as numbers (not strings) in JSON responses.

---

## Loan Request API

### 1. List Loan Requests (Paginated)

```
GET /hr/loan-requests
Permission: loan-requests.view
```

#### Query Parameters

| Param       | Type                | Default     | Notes                                                                                       |
| ----------- | ------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| `page`      | `number`             | `1`         | Min 1, Max 100                                                                               |
| `limit`     | `number`             | `10`        | Min 1, Max 100                                                                               |
| `employeeId`| `uuid`               | —           | Filter by employee                                                                           |
| `status`    | `LoanRequestStatus`  | —           | `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `COMPLETED`                                  |
| `sortBy`    | `string`             | `createdAt` |                                                                                               |
| `sortOrder` | `"ASC"` \| `"DESC"`  | `"DESC"`    |                                                                                               |
| `search`    | `string`             | —           | Inherited from `PaginationDto`, **accepted but not used** — the repository never applies a search filter for this module. |

> **Note**: `search` is present on `LoanRequestFiltersDto` (via `PaginationDto`) but the repository's `findAll` only builds a `where` clause from `employeeId` and `status` — passing `search` has no effect on results. Confirmed by reading `loan-request.repository.ts`.

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "b1c2d3e4-f5a6-7890-abcd-ef1234567890",
      "employeeId": "emp-uuid-1",
      "description": "Medical emergency",
      "totalAmount": 12000,
      "totalInstallments": 4,
      "paidAmount": 3000,
      "status": "APPROVED",
      "createdAt": "2026-06-01T10:00:00.000Z",
      "updatedAt": "2026-06-05T09:00:00.000Z",
      "createdById": "user-uuid-1",
      "remainingAmount": 9000,
      "repaymentStatus": "PARTIALLY_PAID",
      "employee": {
        "id": "emp-uuid-1",
        "employeeCode": "EMP-0042",
        "user": { "id": "user-uuid-emp", "firstName": "Ali", "lastName": "Raza" }
      },
      "createdBy": { "id": "user-uuid-1", "firstName": "Jane", "lastName": "Doe", "email": "jane@example.com" },
      "approvals": [
        {
          "id": "approval-uuid-1",
          "loanRequestId": "b1c2d3e4-f5a6-7890-abcd-ef1234567890",
          "approverId": "user-uuid-2",
          "status": "APPROVED",
          "remarks": "Approved, will be disbursed shortly.",
          "decidedAt": "2026-06-05T09:00:00.000Z",
          "createdAt": "2026-06-01T10:00:00.000Z",
          "updatedAt": "2026-06-05T09:00:00.000Z",
          "approver": { "id": "user-uuid-2", "firstName": "Sam", "lastName": "Khan", "email": "sam@example.com" }
        }
      ],
      "installments": [
        {
          "id": "installment-uuid-1",
          "loanRequestId": "b1c2d3e4-f5a6-7890-abcd-ef1234567890",
          "installmentNumber": 1,
          "amount": 3000,
          "returnMonth": "2026-07",
          "status": "PAID",
          "paidAt": "2026-07-02T08:00:00.000Z",
          "createdAt": "2026-06-05T09:00:00.000Z",
          "updatedAt": "2026-07-02T08:00:00.000Z"
        },
        {
          "id": "installment-uuid-2",
          "loanRequestId": "b1c2d3e4-f5a6-7890-abcd-ef1234567890",
          "installmentNumber": 2,
          "amount": 3000,
          "returnMonth": "2026-08",
          "status": "PENDING",
          "paidAt": null,
          "createdAt": "2026-06-05T09:00:00.000Z",
          "updatedAt": "2026-06-05T09:00:00.000Z"
        }
      ]
    }
  ],
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

> **Note**: `meta` includes `hasNext`/`hasPrev` (from `buildPaginatedResponse`), matching this repo's standard pagination shape.

---

### 2. Get Single Loan Request

```
GET /hr/loan-requests/:loanRequestId
Permission: loan-requests.view
```

#### Path Parameter

| Param             | Type   | Notes            |
| ------------------ | ------ | ------------------ |
| `loanRequestId`    | `uuid` | Loan request ID   |

#### Response `200 OK`

Same shape as a single item in the [List response](#1-list-loan-requests-paginated).

#### Response `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Loan request not found",
  "error": "Not Found"
}
```

---

### 3. Create Loan Request

```
POST /hr/loan-requests
Permission: loan-requests.create OR loan-requests.manage
```

Creates a loan request in `PENDING` status with all listed approvers starting at `PENDING`. Runs the affordability check (see [Overview](#affordability-check)) before creating.

#### Request Body

```json
{
  "employeeId": "emp-uuid-1",
  "description": "Medical emergency",
  "totalAmount": 12000,
  "totalInstallments": 4,
  "approverIds": ["user-uuid-2", "user-uuid-3"]
}
```

| Field               | Type       | Required | Notes                                                                                                          |
| -------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `employeeId`         | `uuid`     | Yes      | `@IsUUID()` — the employee the loan is for                                                                    |
| `description`        | `string`   | No       | `@IsString() @MaxLength(512)`                                                                                 |
| `totalAmount`        | `number`   | Yes      | `@IsNumber({ maxDecimalPlaces: 2 })` `@IsPositive()`                                                          |
| `totalInstallments`  | `number`   | Yes      | `@IsInt()` `@Min(1)` `@Max(60)`                                                                               |
| `approverIds`        | `string[]` | Yes      | `@IsArray()` `@ArrayMinSize(1)` `@ArrayUnique()` `@IsUUID(undefined, { each: true })` — at least one required |

#### Response `201 Created`

Full loan request (same shape as [List item](#1-list-loan-requests-paginated)), with `status: "PENDING"`, `paidAmount: 0`, `remainingAmount` = `totalAmount`, `repaymentStatus: "UNPAID"`, and `installments: []` (installments don't exist until the request is fully approved).

#### Validation Errors `400 Bad Request`

```json
{ "message": "You cannot set yourself as an approver for your own loan request" }
{ "message": "The following approver user ID(s) are invalid: <id>" }
{ "message": "The following user(s) do not have the \"loan-requests.approve\" permission and cannot be set as approvers: <id>" }
{ "message": "Employee has no active salary on record — cannot validate loan affordability" }
{ "message": "Installment amount of 4000 exceeds the maximum allowed 3500 (70% of monthly salary). Increase totalInstallments or reduce totalAmount." }
```

#### Not Found `404 Not Found`

```json
{ "message": "Employee not found" }
```

---

### 4. Update Loan Request

```
PATCH /hr/loan-requests/:loanRequestId
Permission: loan-requests.update OR loan-requests.manage
```

**Only the creator can update, and only while `status = PENDING` and no approver has decided yet.** `employeeId` can never be changed (a loan request cannot be reassigned to a different employee — it's omitted entirely from the update DTO). If `approverIds` is provided, it fully replaces the existing approver set (all reset to `PENDING`). If `totalAmount`/`totalInstallments` change, the affordability check re-runs.

#### Path Parameter

| Param            | Type   | Notes                     |
| ----------------- | ------ | --------------------------- |
| `loanRequestId`   | `uuid` | Loan request ID to update  |

#### Request Body

All fields optional (everything from `CreateLoanRequestDto` except `employeeId`).

```json
{
  "description": "Medical emergency — updated amount",
  "totalAmount": 15000,
  "totalInstallments": 5,
  "approverIds": ["user-uuid-2"]
}
```

| Field               | Type       | Required | Notes                                                                     |
| -------------------- | ---------- | -------- | -------------------------------------------------------------------------- |
| `description`        | `string`   | No       | `@IsString() @MaxLength(512)`                                             |
| `totalAmount`        | `number`   | No       | `@IsNumber({ maxDecimalPlaces: 2 })` `@IsPositive()`                      |
| `totalInstallments`  | `number`   | No       | `@IsInt()` `@Min(1)` `@Max(60)`                                           |
| `approverIds`        | `string[]` | No       | `@IsArray()` `@ArrayMinSize(1)` `@ArrayUnique()` `@IsUUID(each)` — replaces the entire approver list if provided |

#### Response `200 OK`

Full updated loan request (same shape as [Create response](#3-create-loan-request)).

#### Validation Errors `400 Bad Request` / `403 Forbidden`

```json
{ "message": "Can only update a loan request while it is pending and no approver has decided yet" }
{ "message": "Only the creator of a loan request can update it" }
{ "message": "You cannot set yourself as an approver for your own loan request" }
{ "message": "The following approver user ID(s) are invalid: <id>" }
{ "message": "The following user(s) do not have the \"loan-requests.approve\" permission and cannot be set as approvers: <id>" }
{ "message": "Installment amount of 4000 exceeds the maximum allowed 3500 (70% of monthly salary). Increase totalInstallments or reduce totalAmount." }
```

---

### 5. Delete Loan Request

```
DELETE /hr/loan-requests/:loanRequestId
Permission: loan-requests.delete OR loan-requests.manage
```

**Only the creator can delete, and only while `status = PENDING` and no approver has decided yet.** Hard-deletes the request (cascades to approvals and installments via `onDelete: Cascade`).

#### Path Parameter

| Param            | Type   | Notes                     |
| ----------------- | ------ | --------------------------- |
| `loanRequestId`   | `uuid` | Loan request ID to delete  |

#### Response `200 OK`

```json
{
  "message": "Loan request deleted successfully"
}
```

#### Validation Errors `400 Bad Request` / `403 Forbidden`

```json
{ "message": "Can only delete a loan request while it is pending and no approver has decided yet" }
{ "message": "Only the creator of a loan request can delete it" }
```

---

### 6. Decide Approval

```
POST /hr/loan-requests/:loanRequestId/approve
Permission: loan-requests.approve
```

Records the **logged-in user's own** approval/rejection decision for a loan request. **Only the user who has an assigned `LoanRequestApproval` row for this request** (i.e. `approverId === caller's userId`) may call this — holding `loan-requests.approve` is necessary to pass the guard but not sufficient on its own.

**Business Rules:**

- Once the overall request has reached `APPROVED` or `COMPLETED`, no approver's decision can be changed anymore.
- Before full approval (`PENDING` or `REJECTED` overall status), any assigned approver may freely change their own decision, including reverting it back to `PENDING`.
- The overall request status is recomputed after every individual decision: any single `REJECTED` → whole request `REJECTED`; every approver `APPROVED` → whole request `APPROVED` (installments generated at that moment); otherwise → `PENDING`.

#### Path Parameter

| Param            | Type   | Notes            |
| ----------------- | ------ | ------------------ |
| `loanRequestId`   | `uuid` | Loan request ID  |

#### Request Body

```json
{
  "decision": "APPROVED",
  "remarks": "Approved, will be disbursed shortly."
}
```

| Field       | Type                 | Required | Notes                                                                                                      |
| ------------ | -------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `decision`   | `LoanApprovalStatus`  | Yes      | `@IsIn([PENDING, APPROVED, REJECTED])` — can be changed later (including back to `PENDING`) until fully approved |
| `remarks`    | `string`             | No       | `@IsString()`                                                                                              |

#### Response `200 OK`

Full updated loan request (same shape as [Create response](#3-create-loan-request)) — reflects the updated `approvals[]`, the recomputed `status`, and (if this decision triggered full approval) a freshly-generated `installments[]`.

#### Validation Errors `400 Bad Request` / `403 Forbidden`

```json
{ "message": "Cannot change an approval decision once the loan request has been fully approved" }
{ "message": "You are not an approver for this loan request" }
```

#### Not Found `404 Not Found`

```json
{ "message": "Loan request not found" }
```

---

### 7. Pay Installment

```
POST /hr/loan-requests/:loanRequestId/installments/:loanInstallmentId/pay
Permission: loan-requests.manage
```

Marks a single installment as `PAID`, adds its amount to the loan's running `paidAmount`, and closes the loan (`status → COMPLETED`) once every installment is paid.

> **The payroll module already calls this automatically** when a payroll run containing a matching loan deduction is marked `PAID` — use this route only for **manual correction** (e.g. an installment paid outside the normal payroll cycle).

**Business Rules:**

- Only callable while the loan request's overall `status = APPROVED` (i.e. installments exist and the loan isn't already `COMPLETED`).
- The installment must belong to this loan request.
- The installment must currently be `PENDING` — cannot re-pay an already-paid installment.
- The underlying DB update is conditioned on `status: PENDING` in the `WHERE` clause, making it safe against a race where two concurrent calls try to pay the same installment (only one succeeds).

#### Path Parameters

| Param                | Type   | Notes                    |
| --------------------- | ------ | -------------------------- |
| `loanRequestId`       | `uuid` | Loan request ID           |
| `loanInstallmentId`   | `uuid` | Installment ID to mark paid |

#### Response `200 OK`

Full updated loan request (same shape as [Create response](#3-create-loan-request)) — the target installment's `status` is now `PAID` with `paidAt` set, `paidAmount`/`remainingAmount`/`repaymentStatus` recalculated, and `status` flipped to `COMPLETED` if this was the last unpaid installment.

#### Validation Errors `400 Bad Request`

```json
{ "message": "Installments can only be paid on a loan request that is fully approved" }
{ "message": "Installment has already been paid" }
{ "message": "Installment does not belong to this loan request or is not pending" }
```

#### Not Found `404 Not Found`

```json
{ "message": "Loan request not found" }
{ "message": "Installment not found for this loan request" }
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

### 403 Forbidden

Two distinct sources produce a 403:

**Missing permission (route guard)** — thrown by `PermissionsGuard` when the caller holds none of the route's required permissions:

```json
{
  "statusCode": 403,
  "message": "Access denied. Required permissions: loan-requests.create, loan-requests.manage",
  "error": "Forbidden"
}
```

**Business-rule ownership check (service layer)** — thrown when the caller *does* hold a required permission but isn't the specific creator/approver the action requires:

```json
{ "statusCode": 403, "message": "Only the creator of a loan request can update it", "error": "Forbidden" }
{ "statusCode": 403, "message": "Only the creator of a loan request can delete it", "error": "Forbidden" }
{ "statusCode": 403, "message": "You are not an approver for this loan request", "error": "Forbidden" }
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Loan request not found",
  "error": "Not Found"
}
```

Also used (with a different `message`) for:

```json
{ "statusCode": 404, "message": "Employee not found", "error": "Not Found" }
{ "statusCode": 404, "message": "Installment not found for this loan request", "error": "Not Found" }
```

---

## Frontend Implementation Notes

### Status Colors (suggested)

**Loan Request `status`**

| Status      | Color        |
| ----------- | ------------ |
| `PENDING`   | Amber/Orange |
| `APPROVED`  | Blue         |
| `REJECTED`  | Red          |
| `CANCELLED` | Red (dim)    |
| `COMPLETED` | Green        |

**`repaymentStatus`**

| Status            | Color        |
| ------------------ | ------------ |
| `UNPAID`           | Gray         |
| `PARTIALLY_PAID`   | Amber/Orange |
| `FULLY_PAID`       | Green        |

**Per-approver `LoanRequestApproval.status`**

| Status      | Color        |
| ----------- | ------------ |
| `PENDING`   | Gray         |
| `APPROVED`  | Green        |
| `REJECTED`  | Red          |

**`LoanInstallment.status`**

| Status    | Color |
| --------- | ----- |
| `PENDING` | Gray  |
| `PAID`    | Green |

### Decimal/Number Handling

The repository already converts all `Decimal` fields (`totalAmount`, `paidAmount`, `remainingAmount`, installment `amount`) to JS `number` — no `parseFloat()` needed client-side, but be aware of standard floating-point precision when doing further arithmetic.

### Typical Screen Flows

**Loan Requests List Screen**

- `GET /hr/loan-requests` with pagination, `employeeId`, `status` filters. (`search` is accepted by the DTO but currently has no server-side effect — do not rely on it; filter/search client-side if needed until the backend implements it.)
- Status badge driven by `status`; a secondary repayment progress indicator driven by `repaymentStatus` / `paidAmount` vs `totalAmount`.

**Create Loan Request Screen**

- Employee picker → `employeeId`.
- Amount + installment count inputs → client can preview per-installment amount using the same even-split-with-remainder-on-last logic as the backend (`splitAmountIntoInstallments`), but treat the server's `400` on affordability as authoritative.
- Approver picker: multi-select of users who hold `loan-requests.approve`. Exclude the requesting employee's own linked user from the list if the request is self-service (self-approval is rejected server-side).
- Submit → `POST /hr/loan-requests`. Show validation errors (ineligible approvers, affordability cap, no active salary) inline.

**Loan Request Detail Screen**

- `GET /hr/loan-requests/:id` — show header (`status`, `repaymentStatus`, amounts), approver list with individual decision badges, and an installment schedule table (`installmentNumber`, `returnMonth`, `amount`, `status`, `paidAt`).
- "Edit" / "Delete" buttons only enabled when the current user is `createdById` **and** `status === "PENDING"` **and** every approval is still `PENDING` — mirror the server's ownership + no-decision-yet checks client-side to avoid a round-trip 400/403, but still handle the error responses since state can change between page load and submit.
- "Approve" / "Reject" action buttons only shown to the current user if they appear in `approvals[]` with `approverId === currentUserId` — call `POST /:id/approve` with `{ decision, remarks }`.
- Once `status === "APPROVED"`, show the installment schedule with a "Mark Paid" action per `PENDING` installment (manual correction only — note in the UI that payroll normally handles this automatically) → `POST /:id/installments/:installmentId/pay`.
- Once `status === "COMPLETED"`, treat the loan as closed — no further actions.

**Approvals Queue / "My Approvals" Screen**

- No dedicated list-by-approver endpoint exists.
  > **Note**: could not verify a "pending approvals for me" endpoint — none exists in this module's controller. To build a personal approval queue, fetch `GET /hr/loan-requests` (optionally filtered by `status=PENDING`) and filter client-side for requests where `approvals` contains an entry with `approverId === currentUserId && status === "PENDING"`, or request a dedicated backend endpoint if this is a common screen.

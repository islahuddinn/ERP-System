# Payroll Module — Frontend API Reference

> **Purpose**: Complete API reference for the HR Payroll module — payroll run generation/calculation, ad-hoc bonuses, and the DRAFT → APPROVED → PAID approval workflow.
> **Audience**: Frontend developers building the Payroll list/detail, "Run Payroll", bonus, and approval screens.
> **Base URL**: All paths are relative to the API root, which is served under the global prefix `/api` (e.g. `https://api.example.com/api/hr/payroll`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global `ResponseInterceptor` as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": {...} }`. This same interceptor also **recursively converts every Prisma `Decimal` value to a JS `number`** before the response is sent — see [Decimal / Money Fields](#decimal--money-fields). **All response examples in this document show the inner `data` payload only** — mentally wrap it in the envelope above for the real HTTP response.

> **Note**: Live payroll is `src/hr/payroll/` (`PayrollModule` in `app.module.ts`). The unused `src/payroll/` tree was removed in Phase 0.

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Related Modules (Not Part of This API)](#related-modules-not-part-of-this-api)
5. [Payroll Calculation Engine (Business Rules)](#payroll-calculation-engine-business-rules)
6. [Payroll API](#payroll-api)
   - [List Payroll Records (paginated)](#1-list-payroll-records-paginated)
   - [Preview Payroll Calculation](#2-preview-payroll-calculation)
   - [Get Single Payroll Record](#3-get-single-payroll-record)
   - [Create Payroll Record(s)](#4-create-payroll-records)
   - [Add / Update Bonus](#5-add--update-bonus)
   - [Approve Payroll](#6-approve-payroll)
   - [Mark Payroll as Paid](#7-mark-payroll-as-paid)
7. [Error Responses](#error-responses)
8. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

The Payroll module generates a payroll record for an employee over a given period by combining their active contract's salary/allowances with attendance, leave, and loan data, then carries that record through a simple three-status approval workflow.

| Concern | Base Path | Description |
| --- | --- | --- |
| Payroll Records | `/hr/payroll` | List/view/create payroll records, preview a calculation, add a bonus, approve, mark paid |

### Lifecycle

```
DRAFT ──► APPROVED ──► PAID
```

- **DRAFT**: Initial state, set on creation. The only status in which a bonus can be added/changed (`PATCH /:payrollId/bonus`).
- **APPROVED**: Set via `POST /:payrollId/approve`. Records `approvedById`/`approvedAt`. Bonuses can no longer be modified.
- **PAID**: Set via `POST /:payrollId/pay`. Records `paidAt`. Also triggers payment of the employee's outstanding loan installment for that `paidMonth` (see [Loan Deduction](#6-loan-deduction) below).
- There is **no reject/cancel/reversal path** exposed by this module — once `PAID`, a record cannot be transitioned further, and there is no endpoint to move a record backwards (e.g. `APPROVED` → `DRAFT`).

### Module Dependencies

The payroll calculation pulls data from several other HR modules at calculation time (not stored redundantly, only snapshotted onto the `Payroll` row):

- **Contract module** (`src/hr/contract/`) — active `EmployeeContract`, its `CURRENT` `SalaryRevision` (base salary), and its `ContractAllowance` rows.
- **Holiday module** — count of holidays in the period.
- **HR Settings module** — `weeklyOffDays` (which days count as weekends).
- **Leave Request module** — approved paid/unpaid leave days and exact leave dates in the period.
- **Loan Request module** — the employee's pending loan installment(s) due in the payroll's `paidMonth`.
- **Attendance module** (read directly via `Attendance` table, not a service call) — absence and late/early ("timing") minutes.

> **Note**: Creating a payroll record is **not** decorated with `@Auditable` on the controller (`POST /hr/payroll` has no `@Auditable(...)` decorator, unlike `addBonus`, `approve`, and `pay`, which are all decorated with `@Auditable({ module: AuditModule.HR_PAYROLL, action: AuditAction.UPDATE })`). This means payroll **creation** is not currently captured in the audit log — only bonus changes, approval, and payment are.

---

## Permissions

Defined in `src/users/permissions/modules/payroll.permissions.ts`.

| Permission Key | Description |
| --- | --- |
| `payroll.view` | View payroll records for **any** employee |
| `payroll.view-own` | View **only your own** payroll records |
| `payroll.create` | Create and preview payroll records; add/update the bonus on a DRAFT record |
| `payroll.approve` | Approve payroll records and mark them as paid |

> **Route-level OR logic**: Where a route lists two permissions (`payroll.view` + `payroll.view-own`), `PermissionsGuard` grants access if the caller holds **either one** (`Array.some`), not both. However, for the payroll routes specifically, holding only `payroll.view-own` does **not** just pass the guard — the **service layer** additionally restricts the query/result to the caller's own employee record (see below). A user's Role of `"Admin"` bypasses all permission checks entirely (`PermissionsGuard.isAdmin`).

| Route | Required Permission(s) (any one) | Additional Service-Layer Restriction |
| --- | --- | --- |
| `GET /hr/payroll` | `payroll.view`, `payroll.view-own` | If caller lacks `payroll.view`, `employeeId` filter is forced to the caller's own employee record |
| `GET /hr/payroll/preview` | `payroll.view` | — |
| `GET /hr/payroll/:payrollId` | `payroll.view`, `payroll.view-own` | If caller lacks `payroll.view`, throws `403` unless the record belongs to the caller's own employee record |
| `POST /hr/payroll` | `payroll.create` | — |
| `PATCH /hr/payroll/:payrollId/bonus` | `payroll.create` | — |
| `POST /hr/payroll/:payrollId/approve` | `payroll.approve` | — |
| `POST /hr/payroll/:payrollId/pay` | `payroll.approve` | — |

---

## Enums & Constants

### `PayrollStatus` (on the `Payroll` model, `hr_payroll` table)

```
DRAFT      — Editable draft; bonus can be added/changed
APPROVED   — Approved, awaiting payment; bonus locked
PAID       — Finalized; loan installment for paidMonth (if any) marked paid
```

### `PayrollStatusFilter` (query DTO enum — `PayrollQueryDto.status`)

```
DRAFT
APPROVED
PAID
```
> This is a **separate enum declared in the DTO file** (`payroll-query.dto.ts`) with the exact same three values as `PayrollStatus`. They are kept in sync manually; there is no shared reference between them in code.

### Referenced enums (owned by other modules — see [Related Modules](#related-modules-not-part-of-this-api))

`SalaryRevisionStatus`: `DRAFT`, `CURRENT`, `SUPERSEDED`, `SUSPENDED` — payroll calculation requires a `CURRENT` revision.

`AllowanceType`: `HOUSE_RENT`, `MEDICAL`, `TRANSPORT`, `FUEL`, `GYM`, `MOBILE`, `OTHER` — payroll only reads the aggregate `amount`, not the type breakdown.

### `paidMonth` / `returnMonth` Format

Both `Payroll.paidMonth` and `LoanInstallment.returnMonth` use a zero-padded `"YYYY-MM"` string (e.g. `"2026-07"`), so they can be matched and sorted lexicographically without a full date.

---

## Related Modules (Not Part of This API)

The payroll calculation depends on data owned and managed by **other** modules' own controllers — they are **not** part of `PayrollController` and are documented in their own reference docs. They're summarized here only so the frontend understands where the underlying data is managed:

| Data | Owning Controller | Notes |
| --- | --- | --- |
| Salary revisions (`baseSalary`, `effectiveDate`, `status`) | `hr/contracts/:contractId/salary-revisions` (`contract.controller.ts`, permission `hr.manage_contracts`/`hr.view`) | Payroll requires exactly one revision with `status = CURRENT` and `effectiveDate <= periodStart` on the employee's active contract, or payroll creation/preview fails — see [Business Rules](#payroll-calculation-engine-business-rules). |
| Contract allowances (`allowanceType`, `amount`) | `hr/contracts/:contractId/allowances` (same controller, same permissions) | Summed into `allowancesTotal` and snapshotted onto the `Payroll` row at creation time; editing an allowance afterward does **not** retroactively change an already-created payroll record. |
| Active contract lookup | `hr/contracts` | Payroll looks up the contract where `startDate <= periodStart` and (`endDate IS NULL` or `endDate >= periodStart`). |
| Loan installments | `hr/loan-requests` | See [Loan Deduction](#6-loan-deduction). `POST /:payrollId/pay` calls `LoanRequestService.payInstallment` internally. |
| Leave metrics | `hr/leave-requests` | See [Leave Deductions](#3-leave-based-deductions). |
| Holidays | `hr/holidays` | Counted, not listed, in the payroll calculation. |
| Weekly off days | `hr/settings` | `HrSettings.weeklyOffDays` (default `[SUNDAY, SATURDAY]` if unset). |

If a screen needs to *manage* (create/edit) salary revisions, allowances, or loans, it must call those modules' own endpoints — this payroll API is **read-only** with respect to that data.

---

## Payroll Calculation Engine (Business Rules)

This is the core logic in `PayrollService.calculatePayroll`, used by both `POST /hr/payroll` (persisted) and `GET /hr/payroll/preview` (not persisted). All monetary intermediate values use Prisma `Decimal` arithmetic server-side (converted to JS numbers in the JSON response — see [Decimal / Money Fields](#decimal--money-fields)).

### 1. Active Contract & Salary Revision

- Looks up the employee's `EmployeeContract` active on `periodStart` (`startDate <= periodStart` and `endDate` null or `>= periodStart`).
- Requires a `SalaryRevision` on that contract with `status = CURRENT` and `effectiveDate <= periodStart`.
- Errors:
  - No contract found → `"No active contract found for this employee in the given period"`
  - Contract found but no salary revisions at all → same error as above (`!contract?.salaryRevisions?.length`)
  - Contract has revisions, but none is `CURRENT` → `"No active salary revision found for this employee"`

### 2. Gross Salary & Allowances

- `allowancesTotal` = sum of **all** `ContractAllowance.amount` rows on the contract (all types combined — no per-type breakdown returned).
- `grossSalary` = `baseSalary + allowancesTotal` (at creation time — before any bonus; the bonus is added later via a separate call, see below).

### 3. Working Days Calculation

- `totalCalendarDays` = inclusive day count between `periodStart` and `periodEnd` (`Math.ceil` day diff `+ 1`).
- `holidays` = count of holiday-calendar days in the period (Holiday module).
- `weekends` = count of days in the period matching the tenant's `weeklyOffDays` setting (default Saturday + Sunday).
- `unpaidLeaveDays`/`paidLeaveDays` = from approved `LeaveRequest`s overlapping the period (`FULL_DAY` = 1 day, other duration types = 0.5 day; `isPaid` determines which bucket).
- `workingDays = max(totalCalendarDays - holidays - weekends - unpaidLeaveDays, 0)` — this is an **informational metric only** (persisted for reporting); it does not feed into `salaryPerDay` below.

### 4. Per-Day / Per-Hour / Per-Minute Rate

- `salaryPerDay = grossSalary / totalCalendarDays` (`0` if `totalCalendarDays` is `0` — no divide-by-zero error, just a `0` rate).
- `salaryPerHour = salaryPerDay / 8`
- `salaryPerMinute = salaryPerHour / 60`
- The divisor is always the **full number of calendar days in the period** (e.g. 31 for July) — it is never reduced by holidays, weekends, or leave, so the per-day rate stays stable across months regardless of how many holidays/leaves fall in a given period. The numerator is `grossSalary` (`baseSalary + allowancesTotal`), so allowances are included in the per-day rate and do proportionally affect attendance-based deductions below.

### 5. Attendance-Based Deductions

Attendance dates that fall on an approved leave (paid or unpaid) are **excluded** from this query, so a day is never double-counted as both "on leave" and "absent".

| Deduction | Formula | Source |
| --- | --- | --- |
| `absentDaysDeduction` | `absentDays × salaryPerDay` | `Attendance` rows with `workedMinutes` null/`0` in the period |
| `timingDeduction` | `timingMinutes × salaryPerMinute` | Sum of `lateMinutes` across present-day `Attendance` rows |
| `unpaidLeaveDeduction` | `unpaidLeaveDays × salaryPerDay` | Leave Request module |

### 6. Loan Deduction

- Fetches the employee's **PENDING** loan installments where `returnMonth = paidMonth` and the parent `LoanRequest.status = APPROVED`.
- **Business rule: at most one pending installment per employee per calendar month is allowed.** If more than one is found → `"Multiple loan installments found for {paidMonth}. Only one deduction per month is allowed."` (`400`).
- If exactly one is found, `loanDeduction` = that installment's `amount`; if none, `loanDeduction = 0`.
- When the payroll is later marked `PAID` (`POST /:payrollId/pay`), that same installment is automatically marked paid via `LoanRequestService.payInstallment` (see the Loan Request module's own doc for that flow — it is idempotent per-installment via a conditional `updateMany` gated on `status = PENDING`).

### 7. Totals

```
totalDeductions = absentDaysDeduction + timingDeduction + unpaidLeaveDeduction + loanDeduction
netPay          = grossSalary - totalDeductions
```

> Note: the ad-hoc **bonus** (see [Add / Update Bonus](#5-add--update-bonus)) is applied by a *separate* endpoint, **after** creation — it is not part of `calculatePayroll` and is not reflected in the `preview` response.

### Duplicate Prevention

- A payroll record is unique per `(employeeId, periodStart)` (DB constraint `uniq_hr_payroll_employee_period`). Before inserting, the service explicitly checks for an existing record and throws `"Payroll already exists for this employee and period"` (`409 Conflict`) if found.
- This check-then-insert is **not wrapped in a transaction or a `handlePrismaUniqueError` catch** — under true concurrent requests for the same employee+period, the pre-check could pass for both and the second `insert` would then throw a raw, unhandled Prisma `P2002` error (surfaced via the global `PrismaExceptionFilter`, see [Error Responses](#error-responses)), rather than the friendly `409` message above.

---

## Payroll API

### 1. List Payroll Records (Paginated)

```
GET /hr/payroll
Permission: payroll.view OR payroll.view-own
```

If the caller does not hold `payroll.view`, the `employeeId` filter is silently forced to their own employee record (any `employeeId` passed in the query is overwritten).

#### Query Parameters

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `page` | `number` | `1` | Min 1, Max 100 |
| `limit` | `number` | `10` | Min 1, Max 100 |
| `employeeId` | `uuid` | — | Ignored/overwritten for callers without `payroll.view` |
| `status` | `PayrollStatusFilter` | — | `DRAFT`, `APPROVED`, `PAID` |
| `paidMonth` | `string` | — | Exact match, `"YYYY-MM"` |
| `search` | `string` | — | Searches `employee.employeeCode` and the linked user's `firstName`/`lastName` |
| `sortBy` | `string` | `createdAt` (desc) | One of `paidMonth`, `periodStart`, `periodEnd`, `grossSalary`, `netPay`, `status`, `createdAt`. Any other value falls back to the default `createdAt` descending (no error). |
| `sortOrder` | `"ASC"` \| `"DESC"` | `DESC` when `sortBy` is set | Applied only when `sortBy` is a valid sortable field. |

> **Note**: `sortBy` is whitelisted server-side against the fields above. An unrecognized value silently falls back to `createdAt` newest-first rather than erroring.

#### Response `200 OK` (inside `data`, with `meta` alongside it in the envelope)

```json
{
  "data": [
    {
      "id": "b7e1a2c3-1234-4a1b-9c3e-1a2b3c4d5e6f",
      "employeeId": "3f9c1a2e-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
      "periodStart": "2026-07-01T00:00:00.000Z",
      "periodEnd": "2026-07-31T00:00:00.000Z",
      "paidMonth": "2026-07",
      "grossSalary": 55000,
      "allowancesTotal": 5000,
      "bonusAmount": 0,
      "bonusReason": null,
      "salaryPerDay": 1774.1935,
      "salaryPerHour": 221.7742,
      "salaryPerMinute": 3.6962,
      "totalCalendarDays": 31,
      "holidays": 1,
      "weekends": 8,
      "paidLeaveDays": 1,
      "unpaidLeaveDays": 0,
      "workingDays": 22,
      "presentDays": 21,
      "absentDays": 1,
      "timingMinutes": 15,
      "absentDaysDeduction": 1774.19,
      "timingDeduction": 55.44,
      "unpaidLeaveDeduction": 0,
      "loanDeduction": 2000,
      "totalDeductions": 3829.63,
      "netPay": 51170.37,
      "status": "DRAFT",
      "approvedById": null,
      "approvedAt": null,
      "paidAt": null,
      "createdById": "user-uuid-1",
      "createdAt": "2026-07-05T10:00:00.000Z",
      "updatedById": "user-uuid-1",
      "updatedAt": "2026-07-05T10:00:00.000Z",
      "employee": {
        "id": "3f9c1a2e-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
        "employeeCode": "EMP-0042",
        "user": {
          "id": "user-uuid-2",
          "firstName": "Ayesha",
          "lastName": "Khan",
          "email": "ayesha.khan@example.com"
        }
      }
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

> **Note**: `createdById`, `updatedById`, and `approvedById` are returned as **raw UUID strings**, not resolved user objects — the repository's `PAYROLL_INCLUDE` only includes `employee` (with its `user`), not the creator/updater/approver. If a screen needs to display "Approved by <name>", the frontend must separately resolve those IDs against the Users API (this module does **not** apply the users-map pattern to these three fields, unlike some other HR modules).

---

### 2. Preview Payroll Calculation

```
GET /hr/payroll/preview
Permission: payroll.view
```

Runs the full [calculation engine](#payroll-calculation-engine-business-rules) **without creating** a `Payroll` row — useful for showing a "what would this payroll look like" preview before committing.

**Important**: if `employeeIds` contains more than one ID, **only the first one (`employeeIds[0]`) is calculated and returned** — this endpoint does not support a bulk preview.

#### Query Parameters (same fields/validation as [`CreatePayrollDto`](#4-create-payroll-records) below, sent as query params)

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `employeeIds` | `uuid[]` | Yes | Only `employeeIds[0]` is used |
| `periodStart` | ISO date string | Yes | |
| `periodEnd` | ISO date string | Yes | |
| `paidMonth` | `"YYYY-MM"` string | Yes | |

> **Note**: could not verify the exact query-string array encoding Express/Nest expects for `employeeIds` on a `GET` request (e.g. repeated `employeeIds=uuid1&employeeIds=uuid2` vs. `employeeIds[]=uuid1`) — `class-validator`'s `@IsArray()` requires the parsed value to already be an array before validation runs, and a single `employeeIds=<uuid>` occurence may parse as a bare string and fail validation. Verify against a running instance before wiring up this call with a single employee ID.

#### Response `200 OK`

Returns the raw calculation object — **not** a `Payroll` entity (no `id`, `employeeId`, `status`, etc.):

```json
{
  "grossSalary": 55000,
  "allowancesTotal": 5000,
  "salaryPerDay": 1774.1935,
  "salaryPerHour": 221.7742,
  "salaryPerMinute": 3.6962,
  "totalCalendarDays": 31,
  "holidays": 1,
  "weekends": 8,
  "paidLeaveDays": 1,
  "unpaidLeaveDays": 0,
  "workingDays": 22,
  "presentDays": 21,
  "absentDays": 1,
  "timingMinutes": 15,
  "absentDaysDeduction": 1774.19,
  "timingDeduction": 55.44,
  "unpaidLeaveDeduction": 0,
  "loanDeduction": 2000,
  "totalDeductions": 3829.63,
  "netPay": 51170.37
}
```

#### Validation Errors `400 Bad Request`

```json
{ "message": "No active contract found for this employee in the given period" }
{ "message": "No active salary revision found for this employee" }
{ "message": "Multiple loan installments found for 2026-07. Only one deduction per month is allowed." }
```

---

### 3. Get Single Payroll Record

```
GET /hr/payroll/:payrollId
Permission: payroll.view OR payroll.view-own
```

If the caller lacks `payroll.view`, the record's `employeeId` is checked against the caller's own employee record — mismatch throws `403`.

#### Path Parameter

| Param | Type | Notes |
| --- | --- | --- |
| `payrollId` | `uuid` | Payroll record ID |

#### Response `200 OK`

Same shape as an item in the [list response](#1-list-payroll-records-paginated) `data` array.

#### Error Responses

```json
{ "message": "Payroll not found: <payrollId>" }               // 404
{ "message": "You can only view your own payroll records" }    // 403
```

---

### 4. Create Payroll Record(s)

```
POST /hr/payroll
Permission: payroll.create
```

Accepts **one or many** employee IDs. Behavior branches based on `employeeIds.length`:

- **`employeeIds.length === 1`** → creates a single record and returns the full `Payroll` entity directly (same shape as the [list item](#1-list-payroll-records-paginated)).
- **`employeeIds.length > 1`** → runs one independent `createSingle` per employee **in parallel** (`Promise.all`, each wrapped so one failure doesn't abort the others) and returns a **bulk result summary** instead of a single entity.

#### Request Body

```json
{
  "employeeIds": ["3f9c1a2e-4e2d-4a1b-9c3e-1a2b3c4d5e6f"],
  "periodStart": "2026-07-01",
  "periodEnd": "2026-07-31",
  "paidMonth": "2026-07"
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `employeeIds` | `string[]` (uuid v4 each) | Yes | `@IsArray()` + `@IsUUID("4", { each: true })` — array of employee IDs (not user IDs) |
| `periodStart` | ISO date string | Yes | `@IsDateString()` — payroll period start (`YYYY-MM-DD`) |
| `periodEnd` | ISO date string | Yes | `@IsDateString()` — payroll period end (`YYYY-MM-DD`) |
| `paidMonth` | string | Yes | `@IsDateString()` — despite the decorator name, this is documented/used as a `"YYYY-MM"` month string (e.g. `"2026-07"`), matched against `LoanInstallment.returnMonth` |

#### Response `201 Created` — Single Employee

Full `Payroll` entity (same shape as [list item](#1-list-payroll-records-paginated)), `status: "DRAFT"`.

#### Response `201 Created` — Multiple Employees (Bulk)

```json
{
  "created": [
    { "payrollId": "b7e1a2c3-1234-4a1b-9c3e-1a2b3c4d5e6f", "employeeId": "3f9c1a2e-...-1a2b3c4d5e6f" }
  ],
  "failed": [
    { "employeeId": "9c3e1a2b-...-4d5e6f3f9c1a", "reason": "Payroll already exists for this employee and period" }
  ]
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `created` | `{ payrollId: string; employeeId: string }[]` | One entry per employee whose payroll was successfully created |
| `failed` | `{ employeeId: string; reason: string }[]` | One entry per employee whose creation failed; `reason` is the raw error message that would otherwise have been the `400`/`404`/`409` response for that single employee (see [Business Rules](#payroll-calculation-engine-business-rules) and errors below) |

> **Important**: In bulk mode, the endpoint always responds `201` even if **every** employee failed — the frontend must inspect `failed[]` to detect partial/total failure; a `201` status alone does not mean success.

#### Validation / Business-Rule Errors (Single-Employee Mode → HTTP error; Bulk Mode → `failed[].reason` string)

```json
{ "message": "Payroll already exists for this employee and period" }
{ "message": "No active contract found for this employee in the given period" }
{ "message": "No active salary revision found for this employee" }
{ "message": "Multiple loan installments found for 2026-07. Only one deduction per month is allowed." }
```

---

### 5. Add / Update Bonus

```
PATCH /hr/payroll/:payrollId/bonus
Permission: payroll.create
Audited: AuditModule.HR_PAYROLL / AuditAction.UPDATE
```

Sets (or replaces) the ad-hoc bonus on a **DRAFT** payroll only. Calling this twice **never compounds** — the gross salary is recomputed from the pre-bonus base (`grossSalary - existing bonusAmount`) each time, then the new bonus is added on top.

```
newGrossSalary = (grossSalary - currentBonusAmount) + newBonusAmount
newNetPay      = newGrossSalary - totalDeductions
```

**Concurrency guard**: the underlying update only applies while `status = DRAFT` at the DB level (conditional `updateMany`). If the record was approved by a concurrent request between the read and the write, the write matches zero rows and this call fails with a `409` instead of silently mutating an approved payroll.

#### Path Parameter

| Param | Type | Notes |
| --- | --- | --- |
| `payrollId` | `uuid` | Payroll record ID — must currently be `DRAFT` |

#### Request Body

```json
{
  "bonusAmount": 500,
  "bonusReason": "Q2 performance bonus"
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `bonusAmount` | `number` | Yes | `@IsNumber({ maxDecimalPlaces: 2 })` + `@IsPositive()` — must be a positive number with at most 2 decimal places |
| `bonusReason` | `string` | No | `@IsString()` + `@MaxLength(255)` — stored as `null` if omitted |

#### Response `200 OK`

Full updated `Payroll` entity (same shape as [list item](#1-list-payroll-records-paginated)), with `bonusAmount`, `bonusReason`, `grossSalary`, and `netPay` reflecting the new bonus.

#### Validation / Conflict Errors

```json
{ "message": "Payroll not found: <payrollId>" }                                                              // 404
{ "message": "Bonus can only be added to a DRAFT payroll" }                                                   // 400
{ "message": "Payroll was approved before the bonus could be applied — please refresh and try again" }        // 409
```

---

### 6. Approve Payroll

```
POST /hr/payroll/:payrollId/approve
Permission: payroll.approve
Audited: AuditModule.HR_PAYROLL / AuditAction.UPDATE
```

Transitions a `DRAFT` payroll to `APPROVED`. Sets `approvedById` to the calling user.

**Concurrency guard**: the transition is a conditional `updateMany` (`WHERE status = DRAFT`) — if the status already changed by the time this runs, `0` rows match and a `409` is returned rather than silently re-approving.

#### Path Parameter

| Param | Type | Notes |
| --- | --- | --- |
| `payrollId` | `uuid` | Payroll record ID — must currently be `DRAFT` |

#### Response `200 OK`

Full updated `Payroll` entity, `status: "APPROVED"`, `approvedById` and `approvedAt` populated.

#### Errors

```json
{ "message": "Payroll not found: <payrollId>" }                                                     // 404
{ "message": "Only DRAFT payroll can be approved" }                                                  // 400
{ "message": "Payroll status changed before it could be approved — please refresh and try again" }    // 409
```

---

### 7. Mark Payroll as Paid

```
POST /hr/payroll/:payrollId/pay
Permission: payroll.approve
Audited: AuditModule.HR_PAYROLL / AuditAction.UPDATE
```

Transitions an `APPROVED` payroll to `PAID`. Sets `paidAt` to the current server time. **Side effect**: also marks the employee's outstanding loan installment for this payroll's `paidMonth` (if any) as paid, via `LoanRequestService.getInstallmentsForMonth` + `payInstallment` — this is a no-op if there is no matching installment (the calculation engine already guarantees at most one).

**Concurrency guard**: same conditional `updateMany` pattern as approve — `0` rows updated surfaces a `409`.

#### Path Parameter

| Param | Type | Notes |
| --- | --- | --- |
| `payrollId` | `uuid` | Payroll record ID — must currently be `APPROVED` |

#### Response `200 OK`

Full updated `Payroll` entity, `status: "PAID"`, `paidAt` populated.

#### Errors

```json
{ "message": "Payroll not found: <payrollId>" }                                                        // 404
{ "message": "Only APPROVED payroll can be paid" }                                                      // 400
{ "message": "Payroll status changed before it could be marked as paid — please refresh and try again" } // 409
```

---

## Error Responses

> **This backend does not use NestJS's plain default exception body.** Every thrown exception passes through one of **three custom global filters** (registered in `main.ts`, evaluated in this order per exception type), each of which rewrites the JSON body differently. Frontend error handling for this module must account for **all three shapes** below — they are not interchangeable.

### A. `BadRequestException` (any — both DTO validation failures *and* manually-thrown business-rule errors) → `ValidationExceptionFilter`

All `400`s in this module (`"Only DRAFT payroll can be approved"`, `"No active contract found..."`, DTO validation, etc.) are `BadRequestException`s and are caught here, **not** by the generic filter below.

**A1. Manually-thrown, single string message** (e.g. every `400` listed in the endpoint sections above):

```json
{
  "statusCode": 400,
  "timestamp": "2026-07-07T10:00:00.000Z",
  "path": "/api/hr/payroll/<payrollId>/approve",
  "message": "Only DRAFT payroll can be approved",
  "details": { "statusCode": 400, "message": "Only DRAFT payroll can be approved", "error": "Bad Request" },
  "validationErrors": { "statusCode": 400, "message": "Only DRAFT payroll can be approved", "error": "Bad Request" }
}
```
Here the top-level `message` **is** the useful string — safe to display directly.

**A2. `class-validator` DTO failures** (e.g. missing `periodStart`, invalid `bonusAmount`) — the global `ValidationPipe`'s `exceptionFactory` flattens all field errors into a `string[]` and passes that array into `BadRequestException`, which makes Nest set the **top-level `message` to the generic string `"Bad Request Exception"`** — the actual per-field messages only appear inside `details.message` / `validationErrors`:

```json
{
  "statusCode": 400,
  "timestamp": "2026-07-07T10:00:00.000Z",
  "path": "/api/hr/payroll",
  "message": "Bad Request Exception",
  "details": {
    "message": ["periodStart must be a valid ISO 8601 date string", "bonusAmount must be a positive number"],
    "error": "Bad Request",
    "statusCode": 400
  },
  "validationErrors": ["periodStart must be a valid ISO 8601 date string", "bonusAmount must be a positive number"]
}
```
> **For DTO validation errors, read the field-level messages from `validationErrors` (or `details.message`), not the top-level `message`.**

### B. `NotFoundException` / `ForbiddenException` / `ConflictException` → `AllExceptionsFilter` (catch-all)

Anything that is **not** a `BadRequestException` and **not** a raw Prisma error falls through to the generic catch-all filter, which uses a **different envelope** — no `statusCode` field in the body at all (the HTTP status code is only set on the response, not echoed in JSON):

```json
{
  "success": false,
  "message": "Payroll not found: <payrollId>",
  "errorCode": "Not Found",
  "timestamp": "2026-07-07T10:00:00.000Z",
  "path": "/api/hr/payroll/<payrollId>"
}
```

Applies to (HTTP status in parentheses):
- `"Payroll not found: <id>"` (`404`)
- `"No employee record linked to this user"` (`404`)
- `"You can only view your own payroll records"` (`403`)
- `"Payroll already exists for this employee and period"` (`409`)
- `"Payroll was approved before the bonus could be applied — please refresh and try again"` (`409`)
- `"Payroll status changed before it could be approved — please refresh and try again"` (`409`)
- `"Payroll status changed before it could be marked as paid — please refresh and try again"` (`409`)
- `"Access denied. Required permissions: payroll.approve"` (`403`, thrown by `PermissionsGuard` for any missing-permission case)
- `"User not authenticated"` (`403`, thrown by `PermissionsGuard` if no user on the request — normally pre-empted by `401` from `JwtAuthGuard` first)

### C. Prisma errors → `PrismaExceptionFilter`

Only relevant if a race condition slips past the service's own duplicate check (see [Duplicate Prevention](#duplicate-prevention)). Body shape:

```json
{
  "statusCode": 409,
  "message": "A record with this employeeId already exists",
  "error": "Conflict",
  "timestamp": "2026-07-07T10:00:00.000Z",
  "path": "/api/hr/payroll"
}
```
> **Note**: could not verify the exact `field` name Prisma reports in `meta.target` for this table's compound unique constraint (`uniq_hr_payroll_employee_period` on `employeeId, periodStart`) — it may report the constraint name or a different column depending on the Postgres error format. Treat the exact wording as best-effort; the `409` status code is reliable.

### 401 Unauthorized (no/invalid JWT — `JwtAuthGuard`, before any of the above filters see the request)

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## Frontend Implementation Notes

### Decimal / Money Fields

Every `Decimal` column on the `Payroll` model — `grossSalary`, `allowancesTotal`, `bonusAmount`, `salaryPerDay`, `salaryPerHour`, `salaryPerMinute`, `paidLeaveDays`, `unpaidLeaveDays`, `workingDays`, `presentDays`, `absentDaysDeduction`, `timingDeduction`, `unpaidLeaveDeduction`, `loanDeduction`, `totalDeductions`, `netPay` — is auto-converted from Prisma `Decimal` to a JS `number` by the **global `ResponseInterceptor`** (`serializeDecimals`, in `src/common/interceptors/response.interceptor.ts`), not by this module's own repository code. This is a blanket, app-wide behavior — the payroll repository/service never calls `.toNumber()` itself. In requests, the one money-shaped field the frontend sends (`bonusAmount` on `AddBonusDto`) is a plain JSON `number`, not a decimal string.

`salaryPerDay`/`salaryPerHour` are stored at 4 decimal places and `salaryPerMinute` at 6 in the DB (`@db.Decimal(15, 4)` / `@db.Decimal(15, 6)`) — expect fractional-cent precision on these three fields specifically; do not round them before using them in further client-side math (e.g. re-deriving a deduction), since the backend does not round them internally either.

### Status Colors (suggested)

| `status` | Color |
| --- | --- |
| `DRAFT` | Gray |
| `APPROVED` | Blue |
| `PAID` | Green |

### Typical Screen Flows

**Payroll List Screen**
- `GET /hr/payroll` with pagination, `status`, `paidMonth`, `search`, optionally `employeeId` (ignored server-side for `payroll.view-own`-only callers).
- Sortable columns: `paidMonth`, `periodStart`, `periodEnd`, `grossSalary`, `netPay`, `status`, `createdAt` (whitelisted server-side; unrecognized values fall back to `createdAt` newest-first).

**Run Payroll Screen**
- Employee picker (single or multi-select) → date range (`periodStart`/`periodEnd`) → `paidMonth` picker.
- Before submitting, call `GET /hr/payroll/preview?employeeIds=<id>&periodStart=...&periodEnd=...&paidMonth=...` for the **first selected employee** to show an estimated breakdown (gross/deductions/net) — remember this only ever previews one employee even if multiple are selected for the actual run.
- Submit via `POST /hr/payroll`. If a single `employeeId` was selected, handle the single-entity `201` response directly. If multiple were selected, handle the `{ created: [...], failed: [...] }` bulk shape — show a per-employee success/failure summary (e.g. a toast listing which employees failed and why, from `failed[].reason`).
- Common preflight failures to surface proactively (so the user isn't surprised after submit): employee has no active contract/salary revision for the period, or a payroll already exists for that employee+period.

**Payroll Detail Screen**
- `GET /hr/payroll/:id` for the full breakdown.
- "Add/Edit Bonus" (visible only while `status === "DRAFT"`) → `PATCH /:id/bonus` with `{ bonusAmount, bonusReason }`; re-render using the returned entity (`grossSalary`/`netPay` already recomputed).
- "Approve" button (visible only while `status === "DRAFT"`, requires `payroll.approve`) → `POST /:id/approve`.
- "Mark as Paid" button (visible only while `status === "APPROVED"`, requires `payroll.approve`) → `POST /:id/pay`. After this call, if the employee has a loan, its installment list (Loan Request module) should also be re-fetched, since this call pays off one installment as a side effect.
- On any `409` from approve/pay/bonus (the "...status changed before it could be..." messages), refetch the record and re-render the current state rather than retrying blindly — it's a genuine concurrent-modification signal, not a transient failure.

**Employee Self-Service View** (caller holding only `payroll.view-own`)
- Same `GET /hr/payroll` / `GET /hr/payroll/:id` calls — no special client-side filtering needed, the backend already scopes results to the caller's own employee record and any attempt to view someone else's record by ID returns `403`.

# Contract Module — Frontend API Reference

> **Purpose**: Complete API reference for the HR Contract module — employee contracts, salary revisions, and contract allowances.
> **Audience**: Frontend developers building the Employee Contract screens (contract list/detail, salary history, allowances).
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`). This module's controller base path is `/hr/contracts`.
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header (`JwtAuthGuard` + `PermissionsGuard`).

---

## Table of Contents

1. [Overview](#overview)
2. [Response Envelope (applies to every endpoint)](#response-envelope-applies-to-every-endpoint)
3. [Permissions](#permissions)
4. [Enums & Constants](#enums--constants)
5. [Contract API](#contract-api)
   - [1. List Contracts (paginated)](#1-list-contracts-paginated)
   - [2. Get Single Contract](#2-get-single-contract)
   - [3. Create Contract](#3-create-contract)
   - [4. Update Contract](#4-update-contract)
   - [5. Activate Contract](#5-activate-contract)
   - [6. Terminate Contract](#6-terminate-contract)
6. [Salary Revisions API](#salary-revisions-api)
   - [7. List Salary Revisions](#7-list-salary-revisions)
   - [8. Create Salary Revision](#8-create-salary-revision)
   - [9. Activate Salary Revision](#9-activate-salary-revision)
7. [Contract Allowances API](#contract-allowances-api)
   - [10. List Contract Allowances](#10-list-contract-allowances)
   - [11. Create Contract Allowance](#11-create-contract-allowance)
   - [12. Update Contract Allowance](#12-update-contract-allowance)
   - [13. Delete Contract Allowance](#13-delete-contract-allowance)
8. [Error Responses](#error-responses)
9. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

The Contract module manages three related entities, all nested under a single controller (`/hr/contracts`):

| Sub-resource      | Base Path                                             | Description                                                        |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------- |
| Contracts          | `/hr/contracts`                                        | The employment contract itself (dates, type, position, department) |
| Salary Revisions   | `/hr/contracts/:contractId/salary-revisions`           | Versioned pay history for a contract                               |
| Contract Allowances | `/hr/contracts/:contractId/allowances`                | Fixed recurring allowances (house rent, medical, etc.) on a contract |

### Contract Lifecycle

```
DRAFT ──(activate)──► ACTIVE ──(terminate)──► TERMINATED
                         │
                         └─(a newer contract for the same employee is activated)─►
                                       SUPERSEDED   (old contract's endDate has not passed)
                                       EXPIRED      (old contract's endDate has already passed)
```

- **DRAFT**: Created by `POST /hr/contracts`. Not yet in effect. Can be freely updated.
- **ACTIVE**: Set only via `PATCH /:contractId/activate`. Exactly one contract per employee is expected to be `ACTIVE` at a time (enforced by business logic, not a DB constraint).
- **SUPERSEDED** / **EXPIRED**: Set automatically as a **side effect** of activating a different contract for the same employee (see [Activate Contract](#5-activate-contract)) — there is no direct endpoint to set these statuses, and no cron/scheduled job in this module auto-expires contracts by date.
- **TERMINATED**: Set only via `PATCH /:contractId/terminate`, and only from `ACTIVE`. Terminal.
- `updateContract` is blocked once a contract is `TERMINATED` or `EXPIRED` (see [Update Contract](#4-update-contract)) — `DRAFT`, `ACTIVE`, and `SUPERSEDED` contracts can still be updated.

### Salary Revision Lifecycle

Every contract carries one or more `SalaryRevision` rows — this is how pay history/versioning works. Creating a contract always creates its **first** salary revision (status `DRAFT`) in the same transaction.

```
DRAFT ──(activate)──► CURRENT ──(a newer revision on the same contract is activated)──► SUPERSEDED
                         │
                         └─(contract is terminated)──► SUSPENDED
```

- **DRAFT**: A pending revision, not yet in effect. Only one `DRAFT` revision is allowed per contract at a time.
- **CURRENT**: The active salary for the contract right now.
- **SUPERSEDED**: A revision that was `CURRENT` and got replaced by a newer one being activated. Kept for history, never deleted.
- **SUSPENDED**: Set on all `DRAFT`/`CURRENT` revisions of a contract when that contract is terminated.

**Activation flow in detail** (`PATCH /:contractId/salary-revisions/:revisionId/activate`):
1. The target `revisionId` must currently be `DRAFT` and must belong to `contractId`, or a `404` is thrown.
2. Any revision on the same contract currently `CURRENT` is flipped to `SUPERSEDED`.
3. The target revision is flipped to `CURRENT`.

**Contract activation also drives salary revision activation** (`PATCH /:contractId/activate`): when a `DRAFT` contract is activated, the service looks for **one** `DRAFT` salary revision on that same contract (`findFirst`) and promotes it straight to `CURRENT` — the separate salary-revision activate endpoint is not required for the contract's *initial* salary. It is needed for subsequent raises/revisions added later via `POST /:contractId/salary-revisions`.

> **Note**: `createSalaryRevision` blocks creating a new `DRAFT` revision if one already exists for the contract, with the message *"Activate or delete it before creating a new one."* However, **no delete endpoint exists for salary revisions** in this controller or service — only create and activate. Treat the "delete it" wording as aspirational/inaccurate; in practice the only way to clear a stuck `DRAFT` revision today is to activate it. > **Note**: could not verify — check with backend whether a delete path is planned.

### Contract Allowances

- Simple fixed-amount recurring line items attached to a contract (e.g. House Rent, Medical, Transport).
- One allowance **per type per contract** — enforced by a DB unique constraint (`contractId` + `allowanceType`); attempting to add a duplicate type returns `409 Conflict`.
- No status/lifecycle — just create, update the amount, or delete.

### Auditing

`@Auditable({ module: HR_CONTRACTS })` is applied to: create/update/activate/terminate contract, and create/update/delete contract allowance. **It is NOT applied to the two salary-revision endpoints** (`createSalaryRevision`, `activateSalaryRevision`) — those calls are not written to the audit log. This is a direct read of the controller and not a guess.

---

## Response Envelope (applies to every endpoint)

This backend applies a **global** `ResponseInterceptor` (`app.useGlobalInterceptors` in `main.ts`) to every HTTP response, including all endpoints in this module. Two things happen to every response before it reaches the client:

1. **All Prisma `Decimal` fields are recursively converted to plain JS `number`** (`baseSalary`, `totalLeaves`, `consumedLeaves`, allowance `amount`, etc.) — the frontend never needs `parseFloat()`.
2. **The payload is wrapped** in an envelope:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { "...": "the actual resource shown in the examples below" }
}
```

- For **paginated** responses (`data` + `meta` already present), the envelope instead spreads them alongside `success`/`message`: `{ "success": true, "message": "...", "data": [...], "meta": {...} }`.
- For **delete** endpoints that return `{ "message": "..." }`, the envelope becomes `{ "success": true, "message": "<that message>", "data": null }`.

**To keep the examples below readable, every JSON example in this document shows only the inner resource payload (what ends up in `data`) — mentally wrap it in the envelope above for the real HTTP response.**

---

## Permissions

| Permission Key         | What it guards                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| `hr.view`               | List/view contracts, salary revisions, and allowances (all `GET` endpoints in this module)          |
| `hr.manage_contracts`   | Create, update, activate, terminate contracts; create/activate salary revisions; create/update/delete allowances (all mutating endpoints in this module) |

Defined in `src/users/permissions/modules/hr.permissions.ts`. No dedicated `contracts.*` namespace exists — this module reuses the shared `hr.*` permission keys.

---

## Enums & Constants

### `ContractType`

```
PERMANENT
FIXED_TERM
PROBATION
INTERNSHIP
PART_TIME
CONTRACTOR
```

### `ContractStatus`

```
DRAFT       — Created, not yet in effect
ACTIVE      — Currently in effect
EXPIRED     — Superseded by a new contract AND old endDate had already passed
TERMINATED  — Manually ended via the terminate endpoint
SUPERSEDED  — Superseded by a new contract, old endDate had NOT yet passed
```

### `SalaryFrequency`

```
MONTHLY
WEEKLY
BIWEEKLY
DAILY
HOURLY
```

### `SalaryRevisionStatus`

```
DRAFT       — Created but not yet in effect
CURRENT     — The active salary right now
SUPERSEDED  — Replaced by a newer revision (kept for history)
SUSPENDED   — Contract was terminated; revision frozen
```

### `AllowanceType`

```
HOUSE_RENT
MEDICAL
TRANSPORT
FUEL
GYM
MOBILE
OTHER
```

### Decimal Fields

`totalLeaves`, `consumedLeaves` (contract), `baseSalary` (salary revision), and `amount` (allowance) are Prisma `Decimal` columns — converted to JS `number` globally by the `ResponseInterceptor` (see [Response Envelope](#response-envelope-applies-to-every-endpoint)). In **requests**, `baseSalary` and allowance `amount` must still be sent as **decimal strings** (validated with `@IsDecimal({ decimal_digits: "0,2" })`), e.g. `"50000.00"` — not JSON numbers.

---

## Contract API

### 1. List Contracts (Paginated)

```
GET /hr/contracts
Permission: hr.view
```

#### Query Parameters

| Param          | Type                | Default     | Notes                                                                                  |
| -------------- | ------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| `page`         | `number`            | `1`         | Min 1, Max 100                                                                          |
| `limit`        | `number`            | `10`        | Min 1, Max 100                                                                          |
| `search`       | `string`            | —           | Inherited from `PaginationDto` but **not used** by this repository's `where` clause — sending it has no effect. |
| `sortBy`       | `string`            | `createdAt` |                                                                                          |
| `sortOrder`    | `"ASC"` \| `"DESC"` | `"DESC"`    |                                                                                          |
| `employeeId`   | `uuid`              | —           | Filter by employee                                                                       |
| `status`       | `ContractStatus`    | —           | `DRAFT`, `ACTIVE`, `EXPIRED`, `TERMINATED`, `SUPERSEDED`                                 |
| `contractType` | `ContractType`      | —           | `PERMANENT`, `FIXED_TERM`, `PROBATION`, `INTERNSHIP`, `PART_TIME`, `CONTRACTOR`         |
| `departmentId` | `uuid`              | —           | Filter by department                                                                     |

> **Note**: `search` is inherited from the shared `PaginationDto` (per repo convention, all filter DTOs extend it) but this repository never builds a search filter from it — verified by reading `contract.repository.ts`'s `findAll`. Do not build a search box against this endpoint expecting it to work server-side.

#### Response `200 OK`

Each list item only includes the employee's **current** salary revision (`salaryRevisions` filtered to `status = CURRENT`, `take: 1`) — no `allowances` at all (only the detail endpoint includes allowances).

```json
{
  "data": [
    {
      "id": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "employeeId": "e1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "positionId": "p1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "departmentId": "d1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "contractType": "PERMANENT",
      "status": "ACTIVE",
      "startDate": "2026-01-01T00:00:00.000Z",
      "endDate": "2027-01-01T00:00:00.000Z",
      "probationEndDate": "2026-04-01T00:00:00.000Z",
      "totalLeaves": 15,
      "consumedLeaves": 2.5,
      "notes": null,
      "createdById": "user-uuid",
      "createdAt": "2026-01-01T09:00:00.000Z",
      "updatedAt": "2026-01-01T09:00:00.000Z",
      "employee": {
        "id": "e1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "userId": "user-uuid-employee",
        "employeeCode": "EMP-0001",
        "dateOfJoining": "2025-12-01T00:00:00.000Z",
        "status": "ACTIVE",
        "shiftId": null,
        "createdById": "user-uuid",
        "createdAt": "2025-12-01T09:00:00.000Z",
        "updatedAt": "2025-12-01T09:00:00.000Z",
        "user": {
          "id": "user-uuid-employee",
          "firstName": "Ayesha",
          "lastName": "Khan",
          "email": "ayesha.khan@example.com"
        }
      },
      "position": { "id": "p1a2b3c4-d5e6-7890-abcd-ef1234567890", "title": "Software Engineer" },
      "department": { "id": "d1a2b3c4-d5e6-7890-abcd-ef1234567890", "name": "Engineering" },
      "salaryRevisions": [
        {
          "id": "sr1a2b3c4-d5e6-7890-abcd-ef1234567890",
          "contractId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
          "effectiveDate": "2026-01-01T00:00:00.000Z",
          "baseSalary": 150000,
          "currency": "PKR",
          "salaryFrequency": "MONTHLY",
          "status": "CURRENT",
          "reason": null,
          "createdById": "user-uuid",
          "createdAt": "2026-01-01T09:00:00.000Z"
        }
      ]
    }
  ],
  "meta": {
    "total": 24,
    "page": 1,
    "limit": 10,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### 2. Get Single Contract

```
GET /hr/contracts/:contractId
Permission: hr.view
```

Returns the full contract with **all** salary revisions (not just `CURRENT`) and **all** allowances.

#### Path Parameter

| Param        | Type   | Notes       |
| ------------ | ------ | ----------- |
| `contractId` | `uuid` | Contract ID |

#### Response `200 OK`

Same shape as the list item's fields, plus:
- `salaryRevisions`: **all** revisions for the contract, `orderBy: createdAt desc`, each including a `createdBy: { id, firstName, lastName }` object.
- `allowances`: **all** `ContractAllowance` rows for the contract, `orderBy: createdAt asc` (no `createdBy` resolution — just the raw `createdById` string).

```json
{
  "id": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "employeeId": "e1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "positionId": "p1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "departmentId": "d1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "contractType": "PERMANENT",
  "status": "ACTIVE",
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": "2027-01-01T00:00:00.000Z",
  "probationEndDate": "2026-04-01T00:00:00.000Z",
  "totalLeaves": 15,
  "consumedLeaves": 2.5,
  "notes": null,
  "createdById": "user-uuid",
  "createdAt": "2026-01-01T09:00:00.000Z",
  "updatedAt": "2026-01-01T09:00:00.000Z",
  "employee": {
    "id": "e1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "userId": "user-uuid-employee",
    "employeeCode": "EMP-0001",
    "dateOfJoining": "2025-12-01T00:00:00.000Z",
    "status": "ACTIVE",
    "shiftId": null,
    "createdById": "user-uuid",
    "createdAt": "2025-12-01T09:00:00.000Z",
    "updatedAt": "2025-12-01T09:00:00.000Z",
    "user": {
      "id": "user-uuid-employee",
      "firstName": "Ayesha",
      "lastName": "Khan",
      "email": "ayesha.khan@example.com",
      "phone": "+923001234567"
    }
  },
  "position": { "id": "p1a2b3c4-d5e6-7890-abcd-ef1234567890", "title": "Software Engineer" },
  "department": { "id": "d1a2b3c4-d5e6-7890-abcd-ef1234567890", "name": "Engineering" },
  "salaryRevisions": [
    {
      "id": "sr2a2b3c4-d5e6-7890-abcd-ef1234567890",
      "contractId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "effectiveDate": "2026-07-01T00:00:00.000Z",
      "baseSalary": 165000,
      "currency": "PKR",
      "salaryFrequency": "MONTHLY",
      "status": "DRAFT",
      "reason": "Annual increment",
      "createdById": "user-uuid",
      "createdAt": "2026-06-15T09:00:00.000Z",
      "createdBy": { "id": "user-uuid", "firstName": "Jane", "lastName": "Doe" }
    },
    {
      "id": "sr1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "contractId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "effectiveDate": "2026-01-01T00:00:00.000Z",
      "baseSalary": 150000,
      "currency": "PKR",
      "salaryFrequency": "MONTHLY",
      "status": "CURRENT",
      "reason": null,
      "createdById": "user-uuid",
      "createdAt": "2026-01-01T09:00:00.000Z",
      "createdBy": { "id": "user-uuid", "firstName": "Jane", "lastName": "Doe" }
    }
  ],
  "allowances": [
    {
      "id": "al1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "contractId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "allowanceType": "HOUSE_RENT",
      "amount": 20000,
      "createdById": "user-uuid",
      "createdAt": "2026-01-01T09:00:00.000Z",
      "updatedAt": "2026-01-01T09:00:00.000Z"
    }
  ]
}
```

#### Response `404 Not Found`

```json
{ "message": "Contract not found" }
```

---

### 3. Create Contract

```
POST /hr/contracts
Permission: hr.manage_contracts
```

Creates a contract in `DRAFT` status **and** its first `SalaryRevision` (also `DRAFT`) in a single transaction. Use [Activate Contract](#5-activate-contract) to bring both to `ACTIVE`/`CURRENT`.

#### Request Body

```json
{
  "employeeId": "e1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "positionId": "p1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "departmentId": "d1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "contractType": "PERMANENT",
  "startDate": "2026-01-01",
  "endDate": "2027-01-01",
  "probationEndDate": "2026-04-01",
  "totalLeaves": 15,
  "notes": "Initial hire contract",
  "salary": {
    "baseSalary": "150000.00",
    "currency": "PKR",
    "salaryFrequency": "MONTHLY",
    "effectiveDate": "2026-01-01",
    "reason": "Initial hire"
  }
}
```

| Field                    | Type                      | Required | Notes                                                                                                   |
| ------------------------ | ------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `employeeId`             | `uuid`                    | Yes      | `@IsUUID()`                                                                                                 |
| `positionId`             | `uuid`                    | No       | `@IsUUID()`                                                                                                  |
| `departmentId`           | `uuid`                    | No       | `@IsUUID()`                                                                                                  |
| `contractType`           | `ContractType`            | Yes      | `@IsEnum(ContractType)`                                                                                      |
| `startDate`              | `ISO date string`         | Yes      | `@IsDateString()`                                                                                            |
| `endDate`                | `ISO date string`         | Yes      | `@IsDateString()`. Must not be before `startDate` (`endDate cannot be before startDate`)                    |
| `probationEndDate`       | `ISO date string`         | No       | `@IsDateString()`. Must be strictly before `endDate` (`probationEndDate must be before endDate`)             |
| `totalLeaves`            | `number`                  | Yes      | `@IsNotEmpty() @IsNumber({ maxDecimalPlaces: 1 }) @Min(0)` — half-day increments allowed (e.g. `15.5`)      |
| `notes`                  | `string`                  | No       | `@IsString()`                                                                                                |
| `salary`                 | `CreateSalaryRevisionDto` | Yes      | `@ValidateNested()` — nested object, becomes the contract's first `SalaryRevision`                          |
| `salary.baseSalary`      | `string`                  | Yes      | `@IsDecimal({ decimal_digits: "0,2" })` — a **decimal string**, e.g. `"150000.00"`, not a JSON number       |
| `salary.currency`        | `string`                  | No       | `@IsString() @MaxLength(3)`. Defaults to `"PKR"`                                                             |
| `salary.salaryFrequency` | `SalaryFrequency`         | No       | `@IsEnum(SalaryFrequency)`. Defaults to `MONTHLY`                                                            |
| `salary.effectiveDate`   | `ISO date string`         | No       | `@IsDateString()`. Defaults to the contract's `startDate` when omitted (only in this nested/create-contract flow) |
| `salary.reason`          | `string`                  | No       | `@IsString()`                                                                                                |

#### Response `201 Created`

Same shape as [Get Single Contract](#2-get-single-contract) — `status: "DRAFT"`, one `salaryRevisions` entry with `status: "DRAFT"`, `allowances: []`.

#### Validation Errors `400 Bad Request`

```json
{ "message": "endDate cannot be before startDate" }
{ "message": "probationEndDate must be before endDate" }
{ "message": ["employeeId must be a UUID", "contractType must be a valid enum value"] }
```

---

### 4. Update Contract

```
PATCH /hr/contracts/:contractId
Permission: hr.manage_contracts
```

Updates header/assignment/duration fields only. **Does not touch salary** — use the Salary Revisions API for pay changes.

**Business Rules:**

- Blocked when contract `status` is `TERMINATED` or `EXPIRED` (message uses the raw lower-cased status, see below — note the minor grammar quirk from the source, quoted verbatim).
- If `startDate`/`endDate` are provided, the **resolved** dates (new value if provided, otherwise the existing contract's date) must not have `endDate < startDate`.
- If `probationEndDate` is provided, it must be strictly before the resolved `endDate`.

#### Path Parameter

| Param        | Type   | Notes                |
| ------------ | ------ | --------------------- |
| `contractId` | `uuid` | Contract ID to update |

#### Request Body

All fields optional.

```json
{
  "positionId": "p2a2b3c4-d5e6-7890-abcd-ef1234567890",
  "departmentId": "d2a2b3c4-d5e6-7890-abcd-ef1234567890",
  "startDate": "2026-01-01",
  "endDate": "2027-06-01",
  "probationEndDate": "2026-04-15",
  "totalLeaves": 18,
  "notes": "Extended contract end date"
}
```

| Field              | Type              | Required | Notes                                                                 |
| ------------------ | ----------------- | -------- | ------------------------------------------------------------------------ |
| `positionId`       | `uuid`            | No       | `@IsUUID()`                                                              |
| `departmentId`     | `uuid`            | No       | `@IsUUID()`                                                              |
| `startDate`        | `ISO date string` | No       | `@IsDateString()`                                                        |
| `endDate`          | `ISO date string` | No       | `@IsDateString()`                                                        |
| `probationEndDate` | `ISO date string` | No       | `@IsDateString()`                                                        |
| `totalLeaves`      | `number`          | No       | `@IsNumber({ maxDecimalPlaces: 1 }) @Min(0)`                             |
| `notes`            | `string`          | No       | `@IsString()`                                                            |

> Note: `employeeId`, `contractType`, and `salary` are **not** part of this DTO — they cannot be changed after creation via this endpoint.

#### Response `200 OK`

Full updated contract (same shape as [Get Single Contract](#2-get-single-contract)).

#### Validation Errors `400 Bad Request`

```json
{ "message": "Cannot update a terminated contract" }
{ "message": "Cannot update a expired contract" }
{ "message": "endDate cannot be before startDate" }
{ "message": "probationEndDate must be before endDate" }
```

#### Response `404 Not Found`

```json
{ "message": "Contract not found" }
```

---

### 5. Activate Contract

```
PATCH /hr/contracts/:contractId/activate
Permission: hr.manage_contracts
```

Activates a `DRAFT` contract. If the employee already has a currently `ACTIVE` contract, that contract is superseded as part of the same transaction.

**Business Rules / Side Effects (verified in `contract.repository.ts#activateContract`):**

1. Contract must currently be `status: DRAFT`, else `400`.
2. The employee's current `ACTIVE` contract (if any) is looked up.
3. If found, that old contract's status is set to:
   - `EXPIRED` if its `endDate` is before today (midnight, local server time), or
   - `SUPERSEDED` otherwise.
4. That old contract's `CURRENT` salary revision (if any) is flipped to `SUPERSEDED`.
5. The **new** contract's single `DRAFT` salary revision (`findFirst`) — normally the one created alongside the contract — is flipped to `CURRENT`. If no `DRAFT` revision exists on the new contract, this step silently does nothing (the contract still activates with no `CURRENT` salary revision).
6. The new contract's status is set to `ACTIVE`.

#### Path Parameter

| Param        | Type   | Notes                  |
| ------------ | ------ | ------------------------ |
| `contractId` | `uuid` | Contract ID to activate |

#### Request Body

None.

#### Response `200 OK`

Full updated (now `ACTIVE`) contract, same shape as [Get Single Contract](#2-get-single-contract).

#### Validation Error `400 Bad Request`

```json
{ "message": "Only a DRAFT contract can be activated" }
```

#### Response `404 Not Found`

```json
{ "message": "Contract not found" }
```

---

### 6. Terminate Contract

```
PATCH /hr/contracts/:contractId/terminate
Permission: hr.manage_contracts
```

Terminates an `ACTIVE` contract. **Note**: the request body is read via `@Body("notes") notes?: string` directly (not a class-validated DTO) — there is no `class-validator` constraint on `notes`; any JSON value under the `notes` key is accepted as-is.

**Business Rules:**

- Contract must currently be `status: ACTIVE`, else `400`.
- All of the contract's salary revisions with `status` in `[DRAFT, CURRENT]` are set to `SUSPENDED`.
- Contract `status` is set to `TERMINATED`; `notes` is updated only if provided in the request body.

#### Path Parameter

| Param        | Type   | Notes                   |
| ------------ | ------ | ------------------------- |
| `contractId` | `uuid` | Contract ID to terminate |

#### Request Body

```json
{
  "notes": "Resigned — last working day 2026-07-15"
}
```

| Field   | Type     | Required | Notes                                                              |
| ------- | -------- | -------- | --------------------------------------------------------------------- |
| `notes` | `string` | No       | Not validated by a DTO — read directly from the body via `@Body("notes")` |

#### Response `200 OK`

Full updated (now `TERMINATED`) contract, same shape as [Get Single Contract](#2-get-single-contract). All of its `salaryRevisions` with prior status `DRAFT`/`CURRENT` will now show `SUSPENDED`.

#### Validation Error `400 Bad Request`

```json
{ "message": "Only an ACTIVE contract can be terminated" }
```

#### Response `404 Not Found`

```json
{ "message": "Contract not found" }
```

---

## Salary Revisions API

### 7. List Salary Revisions

```
GET /hr/contracts/:contractId/salary-revisions
Permission: hr.view
```

Returns all revisions for the contract, newest first, each with a resolved `createdBy`.

#### Path Parameter

| Param        | Type   | Notes       |
| ------------ | ------ | ----------- |
| `contractId` | `uuid` | Contract ID |

#### Response `200 OK`

```json
[
  {
    "id": "sr2a2b3c4-d5e6-7890-abcd-ef1234567890",
    "contractId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "effectiveDate": "2026-07-01T00:00:00.000Z",
    "baseSalary": 165000,
    "currency": "PKR",
    "salaryFrequency": "MONTHLY",
    "status": "DRAFT",
    "reason": "Annual increment",
    "createdById": "user-uuid",
    "createdAt": "2026-06-15T09:00:00.000Z",
    "createdBy": { "id": "user-uuid", "firstName": "Jane", "lastName": "Doe" }
  },
  {
    "id": "sr1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "contractId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "effectiveDate": "2026-01-01T00:00:00.000Z",
    "baseSalary": 150000,
    "currency": "PKR",
    "salaryFrequency": "MONTHLY",
    "status": "CURRENT",
    "reason": null,
    "createdById": "user-uuid",
    "createdAt": "2026-01-01T09:00:00.000Z",
    "createdBy": { "id": "user-uuid", "firstName": "Jane", "lastName": "Doe" }
  }
]
```

#### Response `404 Not Found`

```json
{ "message": "Contract not found" }
```

---

### 8. Create Salary Revision

```
POST /hr/contracts/:contractId/salary-revisions
Permission: hr.manage_contracts
```

Adds a new `DRAFT` revision. Not `@Auditable` (see [Auditing](#auditing) note above). Not wrapped by the `createdBy` include — the raw `SalaryRevision` row is returned (no nested `createdBy` object, unlike the list endpoint).

**Business Rules:**

- Contract must be `status: ACTIVE`, else `400`.
- Only one `DRAFT` revision is allowed per contract at a time — if one already exists, `400`.
- `effectiveDate` is **required** on this endpoint (unlike the nested `salary` object inside `POST /hr/contracts`, which defaults it to the contract's `startDate`).

#### Path Parameter

| Param        | Type   | Notes       |
| ------------ | ------ | ----------- |
| `contractId` | `uuid` | Contract ID |

#### Request Body

```json
{
  "baseSalary": "165000.00",
  "currency": "PKR",
  "salaryFrequency": "MONTHLY",
  "effectiveDate": "2026-07-01",
  "reason": "Annual increment"
}
```

| Field             | Type              | Required | Notes                                                                 |
| ------------------ | ----------------- | -------- | ------------------------------------------------------------------------ |
| `baseSalary`       | `string`          | Yes      | `@IsDecimal({ decimal_digits: "0,2" })` — decimal string, e.g. `"165000.00"` |
| `currency`         | `string`          | No       | `@IsString() @MaxLength(3)`. Defaults to `"PKR"`                          |
| `salaryFrequency`  | `SalaryFrequency` | No       | `@IsEnum(SalaryFrequency)`. Defaults to `MONTHLY`                         |
| `effectiveDate`    | `ISO date string` | Yes*     | `@IsDateString()` at the DTO level is optional, but the **service** requires it on this endpoint (`400` if missing) |
| `reason`           | `string`          | No       | `@IsString()`                                                              |

#### Response `201 Created`

```json
{
  "id": "sr3a2b3c4-d5e6-7890-abcd-ef1234567890",
  "contractId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "effectiveDate": "2026-07-01T00:00:00.000Z",
  "baseSalary": 165000,
  "currency": "PKR",
  "salaryFrequency": "MONTHLY",
  "status": "DRAFT",
  "reason": "Annual increment",
  "createdById": "user-uuid",
  "createdAt": "2026-06-15T09:00:00.000Z"
}
```

#### Validation Errors `400 Bad Request`

```json
{ "message": "Salary revisions can only be added to an ACTIVE contract" }
{ "message": "A pending salary revision already exists. Activate or delete it before creating a new one." }
{ "message": "effectiveDate is required when creating a salary revision" }
```

#### Response `404 Not Found`

```json
{ "message": "Contract not found" }
```

---

### 9. Activate Salary Revision

```
PATCH /hr/contracts/:contractId/salary-revisions/:revisionId/activate
Permission: hr.manage_contracts
```

Activates a `DRAFT` salary revision, making it `CURRENT` and superseding whatever was previously `CURRENT` on the same contract. Not `@Auditable`.

**Business Rules (verified in `salary-revision.repository.ts#activateRevision`):**

1. `revisionId` must currently be `status: DRAFT` **and** belong to `contractId`, otherwise `404`.
2. Any revision on the same contract with `status: CURRENT` is set to `SUPERSEDED`.
3. The target revision is set to `CURRENT`.

> This endpoint does **not** re-check the contract's own `status` (e.g. it does not require the contract to still be `ACTIVE`) — only that the revision itself is `DRAFT` and belongs to the contract.

#### Path Parameters

| Param        | Type   | Notes                          |
| ------------ | ------ | -------------------------------- |
| `contractId` | `uuid` | Contract ID                     |
| `revisionId` | `uuid` | Salary revision ID to activate  |

#### Request Body

None.

#### Response `200 OK`

```json
{
  "id": "sr2a2b3c4-d5e6-7890-abcd-ef1234567890",
  "contractId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "effectiveDate": "2026-07-01T00:00:00.000Z",
  "baseSalary": 165000,
  "currency": "PKR",
  "salaryFrequency": "MONTHLY",
  "status": "CURRENT",
  "reason": "Annual increment",
  "createdById": "user-uuid",
  "createdAt": "2026-06-15T09:00:00.000Z"
}
```

#### Response `404 Not Found`

```json
{ "message": "Contract not found" }
{ "message": "Pending salary revision not found for this contract" }
```

---

## Contract Allowances API

### 10. List Contract Allowances

```
GET /hr/contracts/:contractId/allowances
Permission: hr.view
```

#### Path Parameter

| Param        | Type   | Notes       |
| ------------ | ------ | ----------- |
| `contractId` | `uuid` | Contract ID |

#### Response `200 OK`

Ordered by `createdAt` ascending. No `createdBy` resolution — only the raw `createdById` string.

```json
[
  {
    "id": "al1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "contractId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "allowanceType": "HOUSE_RENT",
    "amount": 20000,
    "createdById": "user-uuid",
    "createdAt": "2026-01-01T09:00:00.000Z",
    "updatedAt": "2026-01-01T09:00:00.000Z"
  }
]
```

#### Response `404 Not Found`

```json
{ "message": "Contract not found" }
```

---

### 11. Create Contract Allowance

```
POST /hr/contracts/:contractId/allowances
Permission: hr.manage_contracts
```

**Business Rule:** Only one allowance per `allowanceType` per contract (DB unique constraint `[contractId, allowanceType]`) — duplicates return `409 Conflict`.

#### Path Parameter

| Param        | Type   | Notes       |
| ------------ | ------ | ----------- |
| `contractId` | `uuid` | Contract ID |

#### Request Body

```json
{
  "allowanceType": "HOUSE_RENT",
  "amount": "20000.00"
}
```

| Field           | Type            | Required | Notes                                                        |
| ---------------- | --------------- | -------- | ---------------------------------------------------------------- |
| `allowanceType`  | `AllowanceType` | Yes      | `@IsEnum(AllowanceType)`                                          |
| `amount`         | `string`        | Yes      | `@IsDecimal({ decimal_digits: "0,2" })` — decimal string, e.g. `"20000.00"` |

#### Response `201 Created`

```json
{
  "id": "al1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "contractId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "allowanceType": "HOUSE_RENT",
  "amount": 20000,
  "createdById": "user-uuid",
  "createdAt": "2026-01-01T09:00:00.000Z",
  "updatedAt": "2026-01-01T09:00:00.000Z"
}
```

#### Errors

```json
{ "message": "Contract not found" }
```
```json
{ "statusCode": 409, "message": "This allowance type already exists on the contract", "error": "Conflict" }
```

---

### 12. Update Contract Allowance

```
PATCH /hr/contracts/:contractId/allowances/:allowanceId
Permission: hr.manage_contracts
```

Updates only the `amount` — `allowanceType` cannot be changed after creation (delete and recreate instead).

#### Path Parameters

| Param         | Type   | Notes                        |
| ------------- | ------ | ------------------------------ |
| `contractId`  | `uuid` | Contract ID                   |
| `allowanceId` | `uuid` | Allowance ID to update         |

#### Request Body

```json
{
  "amount": "22000.00"
}
```

| Field    | Type     | Required | Notes                                                        |
| -------- | -------- | -------- | ---------------------------------------------------------------- |
| `amount` | `string` | Yes      | `@IsDecimal({ decimal_digits: "0,2" })` — decimal string          |

#### Response `200 OK`

```json
{
  "id": "al1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "contractId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "allowanceType": "HOUSE_RENT",
  "amount": 22000,
  "createdById": "user-uuid",
  "createdAt": "2026-01-01T09:00:00.000Z",
  "updatedAt": "2026-07-01T10:00:00.000Z"
}
```

#### Response `404 Not Found`

```json
{ "message": "Contract not found" }
{ "message": "Allowance not found for this contract" }
```

---

### 13. Delete Contract Allowance

```
DELETE /hr/contracts/:contractId/allowances/:allowanceId
Permission: hr.manage_contracts
```

Hard-deletes the allowance.

#### Path Parameters

| Param         | Type   | Notes                        |
| ------------- | ------ | ------------------------------ |
| `contractId`  | `uuid` | Contract ID                   |
| `allowanceId` | `uuid` | Allowance ID to delete         |

#### Response `200 OK`

```json
{
  "message": "Allowance removed from contract"
}
```

#### Response `404 Not Found`

```json
{ "message": "Contract not found" }
{ "message": "Allowance not found for this contract" }
```

---

## Error Responses

All endpoints follow standard NestJS HTTP exception shapes (before the `ResponseInterceptor` envelope described above wraps them further for the success path — these are the raw NestJS error bodies, which are **not** run through that envelope, since Nest's default exception filter handles thrown exceptions before interceptors' `map()` operators would apply on the error path).

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
  "message": "Contract not found",
  "error": "Not Found"
}
```

### 409 Conflict (duplicate allowance type)

```json
{
  "statusCode": 409,
  "message": "This allowance type already exists on the contract",
  "error": "Conflict"
}
```

---

## Frontend Implementation Notes

### Status Colors (suggested)

**Contract `status`**

| Status       | Color        |
| ------------ | ------------ |
| `DRAFT`      | Gray         |
| `ACTIVE`     | Green        |
| `SUPERSEDED` | Blue         |
| `EXPIRED`    | Amber/Orange |
| `TERMINATED` | Red          |

**Salary Revision `status`**

| Status       | Color        |
| ------------ | ------------ |
| `DRAFT`      | Gray         |
| `CURRENT`    | Green        |
| `SUPERSEDED` | Blue         |
| `SUSPENDED`  | Red          |

### Related Modules (not duplicated here)

- **Employee**: `employee` object on a contract only exposes `{ id, userId, employeeCode, dateOfJoining, status, shiftId, createdById, createdAt, updatedAt, user: { id, firstName, lastName, email[, phone] } }` — for the full Employee CRUD API, see the Employee module's own reference doc.
- **Payroll**: Payroll consumes a contract's `CURRENT` salary revision and allowances at run time, but this module exposes no payroll endpoints itself — see the Payroll module's own reference doc.
- **Position / Department**: Only `{ id, title }` / `{ id, name }` are exposed here for dropdown display — see their own reference docs for full CRUD.

### Typical Screen Flows

**Contract List Screen**

- `GET /hr/contracts` with pagination, `employeeId`, `status`, `contractType`, `departmentId` filters. Do not wire up a search box against `search` — it has no server-side effect on this endpoint today.
- Status badge driven by `status`; show the employee's current base salary from `salaryRevisions[0]` (already filtered to `CURRENT`, or empty if none is active yet).

**Create Contract Screen**

- Single form posts both contract fields and the nested `salary` object in one `POST /hr/contracts` call — there's no separate "create salary" step for the very first revision.
- New contract always starts `DRAFT`; show an explicit "Activate" action to move it to `ACTIVE` (disabled until ready, since activating supersedes/expires any other active contract for the same employee).

**Contract Detail Screen**

- `GET /hr/contracts/:id` — header (status, dates, position, department), a Salary History tab (`salaryRevisions`, newest first) and an Allowances tab (`allowances`).
- "Activate" button — only enabled while `status === "DRAFT"` → `PATCH /:id/activate`.
- "Terminate" button — only enabled while `status === "ACTIVE"` → `PATCH /:id/terminate`, optionally with a `notes` field (free text, not validated).
- "Edit" button — disabled once `status` is `TERMINATED` or `EXPIRED`.

**Salary History Tab**

- List via the contract detail's `salaryRevisions` (no separate list call needed, though `GET /:id/salary-revisions` is available if you want to refresh just this section).
- "Add Revision" button — only enabled while contract `status === "ACTIVE"` **and** there is no existing `DRAFT` revision in the list already (surface the existing draft instead of letting the user submit and hit the 400).
- Once a revision is `DRAFT`, show an "Activate" action → `PATCH /:contractId/salary-revisions/:revisionId/activate`. This immediately makes it `CURRENT` and flips the previous `CURRENT` row to `SUPERSEDED` — refresh the whole list after this call.

**Allowances Tab**

- List via the contract detail's `allowances` (or `GET /:id/allowances`).
- "Add Allowance" — a type dropdown (`AllowanceType`) + amount field; disable/hide types already present on the contract to avoid triggering the `409` duplicate-type error.
- "Edit" — amount-only inline edit → `PATCH /:contractId/allowances/:allowanceId`.
- "Delete" — `DELETE /:contractId/allowances/:allowanceId`, no confirmation side-effects beyond the row disappearing (no stock/reservation semantics like the Purchase Returns module).

### Decimal/Number Handling

Every `Decimal` field in this module (`totalLeaves`, `consumedLeaves`, `baseSalary`, allowance `amount`) is auto-converted to a JS `number` in responses by the global `ResponseInterceptor`. However, when **sending** `baseSalary` or allowance `amount` in a request body, they must be **decimal strings** (e.g. `"150000.00"`), not JSON numbers — `class-validator`'s `@IsDecimal` will reject a bare JSON number.

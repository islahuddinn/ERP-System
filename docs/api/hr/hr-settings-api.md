# HR Settings Module — Frontend API Reference

> **Purpose**: Complete API reference for the HR Settings module — a tenant-wide singleton configuration resource that drives weekly-off calculations, timezone-aware HR logic, payroll currency, and loan-installment affordability limits across other HR modules.
> **Audience**: Frontend developers building the HR Settings screen (a single settings/config form, not a list/CRUD screen).
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. All Prisma `Decimal` values are auto-converted to JS numbers by this interceptor. **All response examples in this document show the inner `data` payload only.**

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [HR Settings API](#hr-settings-api)
   - [Get HR Settings](#1-get-hr-settings)
   - [Update HR Settings](#2-update-hr-settings)
5. [Error Responses](#error-responses)
6. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

The HR Settings module is a **singleton** resource — there is exactly one `HrSettings` row per tenant. There is no create, list, delete, or pagination for this resource; only **get** and **update**.

| Sub-module  | Base Path      | Description                                                        |
| ----------- | -------------- | -------------------------------------------------------------------- |
| HR Settings | `/hr/settings` | Get and update the tenant's single HR configuration record          |

### Get-or-create behavior

- On `GET /hr/settings`, if no `HrSettings` row exists yet for the tenant, the service **automatically creates one** with schema defaults (`this.hrSettingsRepository.create()` → `prisma.hrSettings.create({ data: {} })`) and returns it. The frontend will therefore **never** receive a `404` from this endpoint — the first call effectively initializes the settings.
- `PATCH /hr/settings` uses the same get-or-create logic internally before applying the update, so it works correctly even if called before any `GET` has happened.

### What these settings actually drive (cross-module side-effects)

These fields are consumed by other HR modules — useful context for explaining the settings screen to users:

- **`weeklyOffDays`** — used by the **Leave Request** module (`leave-request.service.ts`) and the **Payroll** module (`payroll.service.ts`, via `calculateWeekends`) to determine which days of the week are excluded from working-day calculations.
- **`maxLoanInstallmentPercent`** — used by the **Loan Request** module (`loan-request.service.ts`, `checkInstallmentAffordability`) to cap the largest single installment of an employee loan at this percentage of their monthly salary. If a requested loan's largest installment exceeds this cap, loan creation fails with a `400 Bad Request` (see note below — this error is thrown by the Loan Request module, not HR Settings itself, but is included here since it is directly driven by this setting).
- **`timezone`** and **`currency`** are stored for use by HR calculations (e.g. attendance) and payroll display, respectively.
- **`settings`** is an open-ended JSON catch-all for ad-hoc HR configuration that doesn't yet warrant a dedicated column.

> **Note**: could not verify — check with backend: which specific screens/features currently read `timezone` and `currency` at runtime. No call sites were found in the codebase at the time of writing beyond the DTO description; they may be reserved for near-future use.

---

## Permissions

| Permission Key       | What it guards                          |
| -------------------- | ---------------------------------------- |
| `hr-settings.view`   | View HR settings (`GET /hr/settings`)   |
| `hr-settings.manage` | Update HR settings (`PATCH /hr/settings`) |

Defined in `src/users/permissions/modules/hr-settings.permissions.ts`:

```ts
export const HR_SETTINGS_PERMISSIONS = {
  "hr-settings.view": {
    module: "hr-settings",
    action: "view",
    description: "View HR settings",
  },
  "hr-settings.manage": {
    module: "hr-settings",
    action: "manage",
    description: "Update HR settings",
  },
} as const;
```

---

## Enums & Constants

### `WeekDay`

```
SUNDAY
MONDAY
TUESDAY
WEDNESDAY
THURSDAY
FRIDAY
SATURDAY
```

Used only for `weeklyOffDays` (an array of these values). Schema default: `[SUNDAY, SATURDAY]`.

### Field Defaults (from Prisma schema, applied only when the settings row is first auto-created)

| Field                       | Default                |
| --------------------------- | ----------------------- |
| `weeklyOffDays`             | `[SUNDAY, SATURDAY]`   |
| `timezone`                  | `null`                 |
| `currency`                  | `null`                 |
| `settings`                  | `{}`                   |
| `maxLoanInstallmentPercent` | `70`                    |

### Decimal / JSON Fields

- `maxLoanInstallmentPercent` is a Prisma `Int` — returned as a plain JS number, no conversion needed.
- `settings` is a Prisma `Json` field — returned as-is (a plain JS object), whatever shape the last successful `PATCH` stored.
- There are no `Decimal` fields on this model.

---

## HR Settings API

### 1. Get HR Settings

```
GET /hr/settings
Permission: hr-settings.view
```

Returns the tenant's single HR settings record. If none exists yet, one is created transparently with defaults (see [Get-or-create behavior](#get-or-create-behavior)) and returned — this endpoint never 404s.

Not decorated with `@Auditable` (read-only, no audit log entry is created for `GET`).

#### Request Body

None.

#### Response `200 OK`

```json
{
  "id": "3f9c1a2e-4d2b-4a1b-9c3e-1a2b3c4d5e6f",
  "weeklyOffDays": ["SUNDAY", "SATURDAY"],
  "timezone": null,
  "currency": null,
  "settings": {},
  "maxLoanInstallmentPercent": 70,
  "createdAt": "2026-06-01T10:00:00.000Z",
  "updatedAt": "2026-06-01T10:00:00.000Z"
}
```

| Field                       | Type              | Notes                                                                 |
| --------------------------- | ------------------ | ----------------------------------------------------------------------- |
| `id`                        | `uuid`             | Settings row ID (there is only ever one row per tenant)                |
| `weeklyOffDays`             | `WeekDay[]`        | Days of week treated as weekly off                                    |
| `timezone`                  | `string \| null`   | IANA timezone string, e.g. `"Asia/Karachi"`                            |
| `currency`                  | `string \| null`   | Currency code/label used for payroll, e.g. `"PKR"`, `"USD"`            |
| `settings`                  | `object`           | Free-form JSON catch-all for ad-hoc HR settings                        |
| `maxLoanInstallmentPercent` | `number`           | Integer 1–100; percentage of monthly salary a single loan installment may consume |
| `createdAt`                 | `ISO datetime`     |                                                                        |
| `updatedAt`                 | `ISO datetime`     |                                                                        |

#### Error Responses

No endpoint-specific errors are thrown by this route (see [Error Responses](#error-responses) for the generic 401/403 shapes that apply to every endpoint).

---

### 2. Update HR Settings

```
PATCH /hr/settings
Permission: hr-settings.manage
```

Partially updates the tenant's HR settings. All fields are optional — only fields present in the request body are changed (each field is conditionally spread with `!== undefined` checks in the service, so omitted fields are left untouched; there is no way to explicitly "unset" a field back to `null` other than sending `null` if the field's type allows it).

Decorated with `@Auditable({ module: AuditModule.HR_SETTINGS })` — the interceptor logs this update automatically; the response **must** return the full updated entity for the audit diff to be meaningful (and it does — see response below).

#### Request Body

All fields optional. Send only the fields you want to change.

```json
{
  "weeklyOffDays": ["SUNDAY", "SATURDAY"],
  "timezone": "Asia/Karachi",
  "currency": "PKR",
  "settings": { "probationPeriodMonths": 3 },
  "maxLoanInstallmentPercent": 60
}
```

| Field                       | Type            | Required | Validation / Notes                                                                                                     |
| --------------------------- | ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `weeklyOffDays`             | `WeekDay[]`       | No       | `@IsArray()`, `@IsEnum(WeekDay, { each: true })` — each element must be one of `SUNDAY`…`SATURDAY`                      |
| `timezone`                  | `string`          | No       | `@IsString()` — no format/IANA validity check is performed server-side                                                  |
| `currency`                  | `string`          | No       | `@IsString()` — no currency-code validation is performed server-side (e.g. ISO 4217 is not enforced)                    |
| `settings`                  | `Record<string, unknown>` | No | `@IsObject()` — any JSON object is accepted; no shape validation. Entire object is replaced, not deep-merged            |
| `maxLoanInstallmentPercent` | `number`          | No       | `@IsInt()`, `@Min(1)`, `@Max(100)`                                                                                       |

> Global `ValidationPipe` config: `whitelist: true` (unknown fields are stripped, not rejected) and `transform: true`. Validation failures return `400 Bad Request` with a flattened message array — see [Error Responses](#error-responses).

> **Note**: `settings` is **replaced wholesale**, not merged — if you send `{ "settings": { "a": 1 } }` when the stored value is `{ "a": 1, "b": 2 } `, the result is `{ "a": 1 }` (i.e. `b` is lost). The frontend should send the full desired `settings` object, not a partial patch of it.

#### Response `200 OK`

Full updated HR settings record (same shape as the [Get response](#1-get-hr-settings)):

```json
{
  "id": "3f9c1a2e-4d2b-4a1b-9c3e-1a2b3c4d5e6f",
  "weeklyOffDays": ["SUNDAY", "SATURDAY"],
  "timezone": "Asia/Karachi",
  "currency": "PKR",
  "settings": { "probationPeriodMonths": 3 },
  "maxLoanInstallmentPercent": 60,
  "createdAt": "2026-06-01T10:00:00.000Z",
  "updatedAt": "2026-07-07T09:15:00.000Z"
}
```

#### Validation Errors `400 Bad Request`

These come from the global `ValidationPipe`'s flattened error formatter (`src/main.ts`), not from custom `throw new` statements in the HR Settings service/repository (there are none — grepped `throw new` in `src/hr/hr-settings/` returns no results):

```json
{ "message": ["'weeklyOffDays.1': Received: 'FUNDAY'. Allowed values: SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY."] }
{ "message": ["maxLoanInstallmentPercent must not be greater than 100"] }
{ "message": ["maxLoanInstallmentPercent must not be less than 1"] }
{ "message": ["maxLoanInstallmentPercent must be an integer number"] }
{ "message": ["settings must be an object"] }
{ "message": ["timezone must be a string"] }
{ "message": ["currency must be a string"] }
```

> **Note**: could not verify exact production wording for every possible `class-validator` constraint combination — the examples above are derived directly from the decorators in `update-hr-settings.dto.ts` and the generic `class-validator` default messages / the custom enum-message formatter in `main.ts`, but were not observed from a live request/response in this exercise.

---

## Error Responses

All endpoints follow standard NestJS HTTP exception shapes (`src/common/filters/*.ts`).

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "...",
  "error": "Bad Request"
}
```

For DTO validation failures, `message` is an **array of strings** (see examples above), one per failing field.

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

Returned when the caller lacks `hr-settings.view` (on `GET`) or `hr-settings.manage` (on `PATCH`).

### 404 Not Found

Not applicable to this module — `GET /hr/settings` always returns (or creates) a record, so no `404` path exists for either endpoint.

### 409 Conflict

Not applicable — there is no unique-constraint-bearing field on `HrSettings` that a client can trigger a conflict on.

---

## Frontend Implementation Notes

### Screen shape

This is a **single settings form**, not a list/table screen:

- On mount: `GET /hr/settings` — populate the form directly from the response (no pagination, no row selection).
- On save: `PATCH /hr/settings` with only the changed fields (or the full object — both work since the service does an `!== undefined` merge per field).
- There is no delete action and no "create new settings" action to expose in the UI — the record is managed implicitly.

### Suggested form fields

| Field                       | Suggested control                                              |
| --------------------------- | ----------------------------------------------------------------- |
| `weeklyOffDays`             | Multi-select checkboxes/chips for the 7 `WeekDay` values          |
| `timezone`                  | Free-text or an IANA timezone picker (not validated server-side — validate client-side if a picker component is available) |
| `currency`                  | Free-text or a currency-code dropdown (not validated server-side) |
| `maxLoanInstallmentPercent` | Numeric input/slider, clamp UI to 1–100 to match server validation |
| `settings`                  | Advanced/JSON editor — since this replaces the whole object, always load the current value first and merge client-side before submitting |

### Cross-module awareness

- Changing `weeklyOffDays` affects **Leave Request** and **Payroll** weekend calculations going forward — consider warning the user this is a tenant-wide change, not scoped to a single employee.
- Changing `maxLoanInstallmentPercent` affects future **Loan Request** affordability checks (`checkInstallmentAffordability` in `loan-request.service.ts`). Lowering it does **not** retroactively invalidate already-approved loans; it only affects new loan-request validation. If you lower this value below what an in-flight loan already requires, existing installment schedules are unaffected — only new/edited loan requests are checked against the new cap.
- No audit trail is created for `GET`. Every successful `PATCH` produces one audit log entry (`AuditModule.HR_SETTINGS` → displayed as `"HrSettings"` in the audit log UI, per `src/audit/interceptors/audit.interceptor.ts`) showing the before/after diff of the full settings object.

### Numbers vs. strings

Unlike modules with `Decimal` fields (e.g. Purchase Orders), `HrSettings` has no `Decimal` columns — `maxLoanInstallmentPercent` is a plain integer and requires no `parseFloat()`/conversion handling.

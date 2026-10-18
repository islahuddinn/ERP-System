# HR Config Module — Frontend API Reference

> **Purpose**: Complete API reference for the HR Config module — tax rules, deduction rules, working calendars, and salary components.
> **Audience**: Frontend developers building the HR Configuration screens.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`). All endpoints live under **`/hr/config`**.
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. All Prisma `Decimal` values are auto-converted to JS numbers by this interceptor. **All response examples in this document show the inner `data` payload only.**

> ### ⚠️ Changes vs. the `feat/hr-integration` build (2026-07-13)
>
> 1. **Working Calendars have a new contract.** The old fields (`code`, `timezone`, `weeklyOffDays`, `holidaysJson`, `effectiveFrom`, `effectiveTo`) are **gone**. A calendar is now `name` + `year` + `countryCode` + `weekendDays`, and the response carries **computed** day counts (see below). Holidays are sourced from the standalone Holiday module (`/hr/holidays`) — they are not stored on the calendar.
> 2. **Deduction Rules now work** (the model gained `isStatutory`, `effectiveFrom`, `effectiveTo`). Note that `calculationType` must be one of the enum values below — arbitrary strings are rejected by the database.
>
> This callout can be removed once the frontend is aligned.

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Tax Rules API](#tax-rules-api)
5. [Deduction Rules API](#deduction-rules-api)
6. [Working Calendars API](#working-calendars-api)
7. [Salary Components API](#salary-components-api)
8. [Error Responses](#error-responses)
9. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

| Sub-module        | Base Path                     | Description                                          |
| ----------------- | ----------------------------- | ---------------------------------------------------- |
| Tax Rules         | `/hr/config/tax-rules`        | Country-specific tax slabs                           |
| Deduction Rules   | `/hr/config/deduction-rules`  | Reusable deduction definitions (fixed/percent/formula) |
| Working Calendars | `/hr/config/working-calendars`| Per-year weekend config + derived working-day counts |
| Salary Components | `/hr/config/salary-components`| Earning/deduction building blocks for salary structures |

All four sub-modules follow the same CRUD pattern: `GET` (list), `POST` (create), `PATCH /:id` (partial update), `DELETE /:id`.

**Deletes are soft** in this module: `DELETE` sets `isActive: false` and returns the updated entity — rows are never removed.

---

## Permissions

| Permission  | Grants                                     |
| ----------- | ------------------------------------------ |
| `hr.manage` | **Every** endpoint in this module, including the `GET`s |

---

## Enums & Constants

| Field / Enum                          | Values                                             |
| ------------------------------------- | -------------------------------------------------- |
| Deduction `calculationType` (DB enum) | `FIXED_AMOUNT`, `PERCENTAGE`, `FORMULA_BASED`      |
| Salary component `type`               | `EARNING`, `DEDUCTION` (by convention)             |
| Salary component `calculationType`    | `FIXED_AMOUNT`, `PERCENTAGE` (by convention)       |
| `weekendDays` integers                | `0` = Sunday … `6` = Saturday                      |

> **Decimal request fields** (`slabMin`, `ratePercent`, `amount`, `percentage`, `salaryBand*`, …) are validated with `@IsDecimal` — **send them as strings** (e.g. `"5000.00"`). Responses return them as numbers (interceptor conversion).

---

## Tax Rules API

### List — `GET /hr/config/tax-rules`

Returns all tax rules ordered by `effectiveFrom` descending (no pagination).

### Create — `POST /hr/config/tax-rules`

```json
{
  "countryCode": "PK",
  "name": "Slab 1",
  "slabMin": "0.00",
  "slabMax": "600000.00",
  "ratePercent": "5.00",
  "isActive": true,
  "effectiveFrom": "2026-07-01",
  "effectiveTo": null
}
```

`countryCode` (max 4 chars), `name`, `slabMin`, `ratePercent`, `effectiveFrom` are required. `slabMax: null` means "no upper bound".

### Update — `PATCH /hr/config/tax-rules/:id` · Delete — `DELETE /hr/config/tax-rules/:id` (soft)

---

## Deduction Rules API

### List — `GET /hr/config/deduction-rules`

Ordered by `effectiveFrom` descending.

### Create — `POST /hr/config/deduction-rules`

```json
{
  "code": "EOBI",
  "name": "EOBI Contribution",
  "description": "optional",
  "calculationType": "FIXED_AMOUNT",
  "amount": "370.00",
  "ratePercent": null,
  "formula": null,
  "isStatutory": true,
  "isActive": true,
  "effectiveFrom": "2026-07-01",
  "effectiveTo": null
}
```

- `code` is **unique** (max 32 chars) — duplicates return a conflict error.
- `calculationType` **must** be `FIXED_AMOUNT`, `PERCENTAGE`, or `FORMULA_BASED`; pair it with `amount`, `ratePercent`, or `formula` respectively.
- `isStatutory` marks government-mandated deductions (default `false`).

### Update — `PATCH /hr/config/deduction-rules/:id` · Delete — `DELETE /hr/config/deduction-rules/:id` (soft)

---

## Working Calendars API

A working calendar defines, **per year**, which weekdays are weekends. Everything else (total days, holiday days, working days) is **computed at read time** — nothing derived is stored, and holidays always come live from the Holiday module.

### List — `GET /hr/config/working-calendars`

Ordered by `year` descending, then `name`. Every calendar in every response carries the computed fields:

```json
[
  {
    "id": "uuid",
    "name": "Pakistan 2026",
    "year": 2026,
    "countryCode": "PK",
    "weekendDays": [6, 0],
    "holidays": null,
    "isActive": true,
    "createdAt": "2026-07-13T08:00:00.000Z",
    "updatedAt": "2026-07-13T08:00:00.000Z",
    "createdById": "uuid",

    "totalDays": 365,
    "weekendDayCount": 104,
    "holidayDayCount": 9.5,
    "workingDays": 251.5
  }
]
```

Computation rules:
- `weekendDayCount` — days of the year whose weekday is in `weekendDays`.
- `holidayDayCount` — holiday dates (from `/hr/holidays`) inside the year that do **not** fall on a weekend. `HALF_DAY` holidays count as `0.5`, so this (and `workingDays`) can be fractional. Overlapping holidays are not double-counted.
- `workingDays = totalDays − weekendDayCount − holidayDayCount`.

### Create — `POST /hr/config/working-calendars`

```json
{
  "name": "Pakistan 2026",
  "year": 2026,
  "countryCode": "PK",
  "weekendDays": [6, 0],
  "isActive": true
}
```

All fields except `isActive` are required. `year` must be 2000–2100; `weekendDays` is an array of integers 0–6.

### Update — `PATCH /hr/config/working-calendars/:id`

Any subset of the create fields. Returns the updated calendar **with recomputed** day counts.

### Delete — `DELETE /hr/config/working-calendars/:id` (soft)

---

## Salary Components API

### List — `GET /hr/config/salary-components`

Ordered by `effectiveFrom` descending.

### Create — `POST /hr/config/salary-components`

```json
{
  "code": "HRA",
  "name": "House Rent Allowance",
  "type": "EARNING",
  "category": "allowance",
  "calculationType": "PERCENTAGE",
  "amount": null,
  "percentage": "40.00",
  "formula": null,
  "isTaxable": true,
  "isDefault": false,
  "isActive": true,
  "effectiveFrom": "2026-07-01",
  "effectiveTo": null
}
```

`code` (unique, max 32), `name`, `type`, `calculationType`, `effectiveFrom` are required.

### Update — `PATCH /hr/config/salary-components/:id` · Delete — `DELETE /hr/config/salary-components/:id` (soft)

---

## Error Responses

| Status | Cause                                                        |
| ------ | ------------------------------------------------------------ |
| `400`  | Validation failure (missing fields, bad `weekendDays`, non-string decimals, invalid `calculationType` enum value) |
| `401`  | Missing/invalid JWT                                           |
| `403`  | Missing `hr.manage` permission                                |
| `409`  | Duplicate unique `code` (deduction rules / salary components) |

---

## Frontend Implementation Notes

1. **"Deleted" rows still exist** — filter on `isActive` client-side if the UI should hide deactivated entries; the list endpoints return everything.
2. **Working-day numbers are always fresh**: creating/editing a holiday in `/hr/holidays` changes `holidayDayCount` / `workingDays` on the next calendar fetch — no calendar update needed.
3. **Send decimals as strings, read them back as numbers** (see Enums & Constants).
4. There are no `GET /:id` detail endpoints in this module — drive edit forms from the list response.

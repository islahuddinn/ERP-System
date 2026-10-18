# Recruitment Module — Frontend API Reference

> **Purpose**: Complete API reference for the HR Recruitment module — job requisitions, candidates, applications, interviews, offers, and the recruitment dashboard.
> **Audience**: Frontend developers building the Recruitment screens.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. All Prisma `Decimal` values are auto-converted to JS numbers by this interceptor. **All response examples in this document show the inner `data` payload only.**

> ### ⚠️ Changes vs. the `feat/hr-integration` build (2026-07-13)
>
> The recruitment backend was reworked to fix the runtime failures reported by the frontend. Deltas the frontend must adopt:
>
> 1. **`creator` / `interviewer` user objects are `{ id, firstName, lastName, email }`** — there is no `name` field on users, so any UI expecting `creator.name` must compose `firstName + " " + lastName`.
> 2. **List endpoints return `{ items, total, page, limit }`** inside `data` — *not* the `data`/`meta` pagination envelope used by the other HR modules.
> 3. `?page=` / `?limit=` query params now coerce correctly (previously any paginated call failed validation).
> 4. Candidate `DELETE` now works and requires the `hr.manage_recruitment` permission (previously it always returned 404).
>
> This callout can be removed once the frontend is aligned.

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Common Shapes](#common-shapes)
5. [Job Requisitions API](#job-requisitions-api)
6. [Candidates API](#candidates-api)
7. [Applications API](#applications-api)
8. [Interviews API](#interviews-api)
9. [Offers API](#offers-api)
10. [Dashboard Stats](#dashboard-stats)
11. [Error Responses](#error-responses)
12. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

| Sub-module       | Base Path                        | Description                                        |
| ---------------- | -------------------------------- | -------------------------------------------------- |
| Job Requisitions | `/hr/recruitment/job-requisitions` | Open positions to hire for                        |
| Candidates       | `/hr/recruitment/candidates`     | People applying (unique per email per tenant)      |
| Applications     | `/hr/recruitment/applications`   | A candidate applied to a requisition; carries the pipeline stage |
| Interviews       | `/hr/recruitment/interviews`     | Scheduled interviews for an application            |
| Offers           | `/hr/recruitment/offers`         | Offers made against an application                 |
| Dashboard        | `/hr/recruitment/stats`          | Aggregate counters for the recruitment dashboard   |

The pipeline flow: **Requisition → Candidate → Application → Interview(s) → Offer → Hired (employee record auto-created)**.

---

## Permissions

| Permission              | Grants                                                       |
| ----------------------- | ------------------------------------------------------------ |
| `hr.view_recruitment`   | All `GET` endpoints (lists, details, stats)                  |
| `hr.manage_recruitment` | All `POST` / `PUT` / `DELETE` endpoints                      |

---

## Enums & Constants

| Enum                   | Values                                                            |
| ---------------------- | ----------------------------------------------------------------- |
| `JobRequisitionStatus` | `OPEN` (default), `CLOSED`, `HOLD`                                |
| `EmploymentType`       | `FULL_TIME` (default), `PART_TIME`, `CONTRACT`, `INTERNSHIP`      |
| `ApplicationStage`     | `APPLIED` (default), `SCREENING`, `INTERVIEW`, `OFFERED`, `REJECTED`, `HIRED` |
| `OfferStatus`          | `PENDING` (default), `ACCEPTED`, `DECLINED`                       |

### Stage transition rules (enforced by `PUT /applications/:id/stage`)

- Stages advance **one step at a time**: `APPLIED → SCREENING → INTERVIEW → OFFERED → HIRED`. Skipping ahead returns `400 Cannot skip from X to Y`.
- Moving **backwards** is rejected (`400 Cannot move backwards from X to Y`).
- `REJECTED` is allowed **from any stage**.
- `OFFERED` and `HIRED` are normally set **automatically** by the Offers API (see below), not by hand.

---

## Common Shapes

### User summary (`creator`, `interviewer`)

Resolved server-side from `createdById` / `interviewerId`. `null` when the ID is missing or the user no longer exists.

```json
{ "id": "uuid", "firstName": "Ada", "lastName": "Lovelace", "email": "ada@acme.com" }
```

### Paginated list shape

Every list endpoint accepts `?page=` (default 1) and `?limit=` (default 20) and returns:

```json
{ "items": [ ... ], "total": 42, "page": 1, "limit": 20 }
```

---

## Job Requisitions API

### 1. List — `GET /hr/recruitment/job-requisitions`

Query params: `page`, `limit`, `search` (matches title/description), `departmentId`, `positionId`, `status`, `employmentType`.

Each item includes `department`, `position` (full objects or `null`), `creator`, and `_count.applications`.

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Senior Backend Engineer",
      "description": "…",
      "departmentId": "uuid",
      "positionId": "uuid",
      "grade": null,
      "openings": 2,
      "employmentType": "FULL_TIME",
      "status": "OPEN",
      "priority": "MEDIUM",
      "closing_date": null,
      "createdAt": "2026-07-13T08:00:00.000Z",
      "updatedAt": "2026-07-13T08:00:00.000Z",
      "createdById": "uuid",
      "department": { "id": "uuid", "name": "Engineering", "...": "…" },
      "position": { "id": "uuid", "title": "Backend Engineer", "...": "…" },
      "creator": { "id": "uuid", "firstName": "Ada", "lastName": "Lovelace", "email": "ada@acme.com" },
      "_count": { "applications": 5 }
    }
  ],
  "total": 1, "page": 1, "limit": 20
}
```

### 2. Get one — `GET /hr/recruitment/job-requisitions/:id`

Same shape as a list item, plus `applications` (each with its `candidate`) instead of `_count`.

### 3. Create — `POST /hr/recruitment/job-requisitions`

```json
{
  "title": "Senior Backend Engineer",
  "departmentId": "uuid",
  "positionId": "uuid",
  "employmentType": "FULL_TIME",
  "openings": 2,
  "status": "OPEN",
  "description": "optional"
}
```

`title`, `departmentId`, `positionId`, `employmentType`, `openings` (int ≥ 1) are required. Returns the created requisition with `creator`.

### 4. Update — `PUT /hr/recruitment/job-requisitions/:id`

All create fields optional. Returns the updated requisition with `department`, `position`, `creator`.

### 5. Delete — `DELETE /hr/recruitment/job-requisitions/:id`

**Cascades**: deleting a requisition deletes its applications (and their interviews/offers).

---

## Candidates API

### 1. List — `GET /hr/recruitment/candidates`

Query params: `page`, `limit`, `search` (firstName/lastName/email/phone), `source`.
Items include `creator` and `_count.applications`.

### 2. Get one — `GET /hr/recruitment/candidates/:id`

Includes `creator` and `applications` (each with `requisition` → `department`, `position`).

### 3. Create — `POST /hr/recruitment/candidates`

```json
{
  "firstName": "Grace",
  "lastName": "Hopper",
  "email": "grace@example.com",
  "phone": "optional",
  "resumeUrl": "optional",
  "source": "optional"
}
```

**Email must be unique per tenant** — duplicates return `400 Candidate with this email already exists`. Response fields also include `skills` (string[]), `experience_years`, `expected_salary`, `status` (`ACTIVE` default).

### 4. Update — `PUT /hr/recruitment/candidates/:id`

All fields optional; changing `email` re-runs the duplicate check.

### 5. Delete — `DELETE /hr/recruitment/candidates/:id`

`id` must be a valid UUID (`400` otherwise). **Cascades** to the candidate's applications, interviews, and offers.

---

## Applications API

### 1. List — `GET /hr/recruitment/applications`

Query params: `page`, `limit`, `search` (candidate first/last name, email, requisition title, notes), `candidateId`, `requisitionId`, `stage`.
Items include `candidate`, `requisition` (→ `department`, `position`), `creator`, `_count` (`interviews`, `offers`).

### 2. Get one — `GET /hr/recruitment/applications/:id`

Adds `interviews` (each with its `interviewer` user summary, newest first) and `offers` (newest first).

### 3. Create — `POST /hr/recruitment/applications`

```json
{ "candidateId": "uuid", "requisitionId": "uuid", "notes": "optional" }
```

Always created with `stage: "APPLIED"`. One application per candidate+requisition pair — duplicates return `400`.

### 4. Update — `PUT /hr/recruitment/applications/:id`

Body: `stage?`, `status?`, `notes?`. **Prefer the dedicated stage endpoint below** — this route does not validate stage transitions.

### 5. Change stage — `PUT /hr/recruitment/applications/:id/stage`

```json
{ "stage": "SCREENING", "notes": "optional" }
```

Enforces the [stage transition rules](#stage-transition-rules-enforced-by-put-applicationsidstage).

### 6. Delete — `DELETE /hr/recruitment/applications/:id`

Cascades to the application's interviews and offers.

---

## Interviews API

### 1. List — `GET /hr/recruitment/interviews`

Query params: `page`, `limit`, `applicationId`, `interviewerId`, `dateFrom`, `dateTo` (ISO dates). Ordered by `interviewDate` ascending.
Items include `application` (→ `candidate`, `requisition` → `department`/`position`), `interviewer`, `creator`.

### 2. Get one — `GET /hr/recruitment/interviews/:id`

### 3. Create — `POST /hr/recruitment/interviews`

```json
{
  "applicationId": "uuid",
  "interviewerId": "uuid",
  "interviewDate": "2026-07-20T10:00:00.000Z",
  "interviewType": "TECHNICAL"
}
```

Rules:
- The application must be in stage `INTERVIEW` — otherwise `400`.
- The interviewer cannot have another interview **on the same calendar day** — otherwise `400 Interviewer already has an interview scheduled at this time`.
- `interviewerId` is a **User** id.

Response fields also include `duration_minutes`, `location`, `meeting_link`, `feedback`, `result` (string, e.g. `"PASS"` — `null` until recorded), `status` (`SCHEDULED` default).

### 4. Update — `PUT /hr/recruitment/interviews/:id`

Body: `interviewDate?`, `interviewType?`, `result?` (string), `feedback?`.

### 5. Delete — `DELETE /hr/recruitment/interviews/:id`

---

## Offers API

### 1. List — `GET /hr/recruitment/offers`

Query params: `page`, `limit`, `applicationId`, `status`. Items include `application` (→ `candidate`, `requisition` → `department`/`position`) and `creator`.

### 2. Get one — `GET /hr/recruitment/offers/:id`

### 3. Create — `POST /hr/recruitment/offers`

```json
{
  "applicationId": "uuid",
  "offeredSalary": 90000,
  "joiningDate": "2026-08-01T00:00:00.000Z"
}
```

Rules & side-effects:
- The application must be in stage `INTERVIEW` — otherwise `400`.
- Created with `status: "PENDING"` and the application is **automatically moved to `OFFERED`**.

Response fields also include `offer_date` (defaults to now), `expiry_date`, `terms`.

### 4. Update — `PUT /hr/recruitment/offers/:id`

Body: `offeredSalary?`, `joiningDate?`, `status?`.

**Accepting an offer** (`status: "ACCEPTED"`) automatically:
1. Moves the application to `HIRED`.
2. **Creates an employee record** (auto-generated `employeeCode`, `status: ACTIVE`, `dateOfJoining: now`). The new employee is not yet linked to a user account.

### 5. Delete — `DELETE /hr/recruitment/offers/:id`

---

## Dashboard Stats

### `GET /hr/recruitment/stats`

```json
{
  "totalRequisitions": 12,
  "openRequisitions": 5,
  "totalCandidates": 87,
  "totalApplications": 64,
  "applicationsByStage": { "APPLIED": 20, "SCREENING": 10, "INTERVIEW": 8, "OFFERED": 3, "HIRED": 15, "REJECTED": 8 },
  "upcomingInterviews": 4,
  "pendingOffers": 3
}
```

`applicationsByStage` only contains keys for stages that have at least one application.

---

## Error Responses

| Status | Cause                                                                 |
| ------ | --------------------------------------------------------------------- |
| `400`  | Validation failure; duplicate candidate email; duplicate application; invalid stage transition; wrong application stage for interview/offer; interviewer double-booked; non-UUID candidate id on delete |
| `401`  | Missing/invalid JWT                                                    |
| `403`  | Missing `hr.view_recruitment` / `hr.manage_recruitment` permission     |
| `404`  | Entity not found (or belongs to another tenant)                        |

---

## Frontend Implementation Notes

1. **Compose display names**: `creator` / `interviewer` have `firstName` + `lastName`, never `name`.
2. **Drive the pipeline through the dedicated endpoints**: use `PUT /applications/:id/stage` for stage moves and `PUT /offers/:id` with `status: "ACCEPTED"` to hire — don't set `OFFERED`/`HIRED` manually.
3. **Deletes cascade downward** (requisition → applications → interviews/offers; candidate → applications → …). Warn the user accordingly.
4. Some legacy columns are snake_case in responses (`closing_date`, `applied_date`, `offer_date`, `expiry_date`, `duration_minutes`, `meeting_link`, `experience_years`, `expected_salary`). Everything the create/update DTOs accept is camelCase.
5. List responses are `{ items, total, page, limit }` — this module does **not** use the `data`/`meta` envelope of the other HR modules.

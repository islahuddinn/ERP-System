# HR Backend Blockers — for Sir Nasir

**Context:** The HR frontend has been fully integrated (branch `feat/hr-integration`, ~75 pages, all 147 endpoints) against the merged HR backend. Most modules work end-to-end. However, a set of **backend endpoints fail at runtime** and block the corresponding frontend pages.

> **These are backend issues, not frontend.** The frontend calls each endpoint with exactly the payload its backend **DTO** declares. The failures (`400 "Invalid data provided"`, `404`) originate **server-side** from Prisma, because the **Prisma models are missing the columns/relations** the DTOs/services/repositories reference. Proof: where a model matches its DTO (all of Waves 1–5, plus Tax Rules and Salary Components), the *same* frontend patterns work perfectly. The frontend is already built to the intended contract and will work as soon as the backend model matches it.
>
> All findings below were verified against `backend/prisma/tenant/schema.prisma` and the live tenant DB (`inventory_8549`).

---

## 1. Recruitment suite — largely non-functional (`backend/src/recruitment/`)

**Primary root cause:** the 5 recruitment models have **no Prisma `@relation` definitions** (only bare scalar `*Id` columns, so the tables have **0 foreign keys**). The repositories `include` relations (`department`, `position`, `candidate`, `requisition`, `interviewer`, `applications`, `interviews`, `offers`) → every such query throws `PrismaClientValidationError` → **400** on list, detail, and any create that returns an include.

| Model | Confirmed problem |
|---|---|
| `JobRequisition` | column is **`vacancies`**, not `openings`; **no `employmentType`** column; `departmentId`/`positionId` are scalar (no relation) |
| `Application` | **missing `tenantId`** → `stats` (`count`/`groupBy` filtered by tenantId) throws, and create (spreads `tenantId`) throws; `candidateId`/`requisitionId` scalar (no relation) |
| `Interview` | column is **`rating`**, not `result`; **missing `tenantId`**; `applicationId`/`interviewerId` scalar (no relation) |
| `Offer` | columns are **`salary_offered`** / **`start_date`**, not `offeredSalary`/`joiningDate`; `applicationId` scalar (no relation) |
| `Candidate` | OK — the only recruitment op that works live (POST has no include) |

**Also:**
- **Pagination DTOs lack `@Type(() => Number)`** → any `?page` / `?limit` query fails `@Min(1)` validation (`"page must not be less than 1"`).
- **Candidate DELETE controller hard-codes a mock tenant** (`temp-tenant`) → always `404 "Tenant not found"`.

**Fix direction:** add `@relation` definitions (+ migrate FKs) to the recruitment models, reconcile the column names (`vacancies`↔`openings`, `salary_offered`↔`offeredSalary`, `start_date`↔`joiningDate`, `rating`↔`result`), add `employmentType` to `JobRequisition`, add `tenantId` to `Application` and `Interview`, add `@Type(() => Number)` to the pagination query DTOs, and fix the candidate DELETE tenant resolution.

---

## 2. HR Config — 2 of 4 sub-modules broken (`backend/src/hr-config/`)

| Sub-module | Confirmed problem |
|---|---|
| **Deduction Rules** | service/DTO write `isStatutory` / `effectiveFrom` / `effectiveTo`; the `DeductionRule` model has **none** of these columns → 400 on list + create + all ops |
| **Working Calendars** | model has `year` / `country` / `weekend` / `holidays`; service writes `code` / `timezone` / `weeklyOffDays` / `holidaysJson` / `effectiveFrom` → 400 on list + create + all ops |
| Tax Rules | ✅ works (POST/GET/PATCH/DELETE verified) |
| Salary Components | ✅ works (POST/GET/PATCH/DELETE verified) |

**Fix direction:** align each service to its Prisma model — either add the missing columns to `DeductionRule` / `WorkingCalendar` (+ migrate) or map the service/DTO fields to the existing column names.

---

## 3. Grades & Org Units — by-id + delete only (`backend/src/hr-core/`)

| Endpoint | Confirmed problem |
|---|---|
| `Grade` `GET /{id}`, `DELETE /{id}` | service `include: { employees }` — no `employees` relation on the `Grade` model → 400 |
| `OrgUnit` `GET /{id}`, `DELETE /{id}`, `/org-chart` | service includes `children` / `employees` — not defined on the `OrgUnit` model → 400 |
| Grade/OrgUnit list + create, OrgUnit `/tree` | ✅ work |

**Fix direction:** add the `employees` (and `children` for OrgUnit) relations to the models, or drop those includes from the by-id/delete services.

> Frontend note: the Grade/OrgUnit detail & edit pages already fall back to the list-cache so viewing/editing works today despite the broken by-id endpoint; DELETE will surface the backend error until fixed.

---

## What works end-to-end today (no backend changes needed)

Departments, Positions, Shifts, Grades (list/create), Org Units (list/create/tree), Employees, Contracts, Attendance, Holidays, Leave, Payroll, Loans, Roles, Users, Permissions, HR Settings, Tax Rules, Salary Components.

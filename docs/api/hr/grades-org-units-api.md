# Grades & Org Units Module — Frontend API Reference

> **Purpose**: API reference for HR Core — job grades and organizational units (org tree / org chart).
> **Audience**: Frontend developers building the Grades and Org Structure screens.
> **Auth**: Bearer JWT required on all endpoints.
> **Response envelope**: Responses are wrapped as `{ "success": true, "message": "...", "data": <payload> }`; Decimals become numbers. Examples below show the inner `data` only.

> ### ⚠️ Changes vs. the `feat/hr-integration` build (2026-07-13)
>
> 1. `GET /:id`, `DELETE /:id`, and `/org-chart` now work (previously 400).
> 2. **`employees` is always `[]`** on grade/org-unit detail and org-chart nodes — employees are not linked to grades/org-units in the schema yet. Build the UI to tolerate the empty list; real data will appear once the linkage is modeled.
> 3. Deleting an org unit that has children now returns **409** (was a 500).

---

## Permissions

| Permission            | Grants                          |
| --------------------- | ------------------------------- |
| `hr.view`             | All `GET` endpoints             |
| `hr.manage_employees` | `POST` / `PATCH` / `DELETE`     |

---

## Grades API — `/hr/core/grades`

### List — `GET /hr/core/grades`

All grades, ordered by `level` asc then `name`. No pagination.

### Get one — `GET /hr/core/grades/:id`

```json
{
  "id": "uuid",
  "name": "G7",
  "level": 7,
  "salaryBandMin": 90000,
  "salaryBandMax": 140000,
  "createdAt": "…", "updatedAt": "…", "createdById": "uuid",
  "employees": []
}
```

### Create — `POST /hr/core/grades`

```json
{ "name": "G7", "level": 7, "salaryBandMin": "90000.00", "salaryBandMax": "140000.00" }
```

- `level`: int 1–1000. Salary bands: **decimal strings** in requests, numbers in responses.
- `description` is accepted by validation but **not persisted** (no column) — don't build UI on it.

### Update — `PATCH /hr/core/grades/:id` (any subset of create fields)

### Delete — `DELETE /hr/core/grades/:id`

Hard delete, no guard (nothing references grades yet). `404` if not found.

---

## Org Units API — `/hr/core/org-units`

`type` enum: `COMPANY`, `DIVISION`, `DEPARTMENT`, `TEAM`, `UNIT`.

### List — `GET /hr/core/org-units`

Flat list, ordered by `type` then `name`.

### Tree — `GET /hr/core/org-units/tree`

Full rows nested via `children[]`; roots are units with no (or dangling) `parentId`.

### Org chart — `GET /hr/core/org-units/org-chart`

Slim recursive nodes:

```json
[
  { "id": "uuid", "name": "Acme", "type": "COMPANY", "children": [ … ], "employees": [] }
]
```

`employees` nodes will later carry `{ id, employeeCode, fullName, positionTitle }` — empty for now (see callout).

### Get one — `GET /hr/core/org-units/:id`

The unit plus `children` (direct children, sorted) and `employees: []`.

### Create — `POST /hr/core/org-units`

```json
{ "name": "Platform Team", "type": "TEAM", "parentId": "uuid | omit for root" }
```

### Update — `PATCH /hr/core/org-units/:id`

`name?`, `type?`, `parentId?` (send `null` to detach to root).

### Delete — `DELETE /hr/core/org-units/:id`

- `409 Conflict` if the unit has child units — reassign/delete children first.
- `404` if not found.

---

## Errors

`400` validation · `401` no JWT · `403` missing permission · `404` not found · `409` org unit has children.

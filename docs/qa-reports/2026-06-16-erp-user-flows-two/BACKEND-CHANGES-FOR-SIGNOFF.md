# Backend Changes — QA Round 2 (for @Sir Nasir sign-off)

Branch: `dev` · Commit: `abcc4e6` · Date: 2026-06-16

These are the **backend-side** changes made while fixing the 31 QA bugs from
*ERP User Flow Issues Two.docx*. Everything else in the round was frontend-only.
Flagging these so they can be reviewed/signed off before they reach `main`.

---

## 1. Raw Materials — restore soft-deleted row on re-create (Bug #3)

**Files:** `backend/src/raw-materials/raw-materials.{service,repository}.ts`

**Problem:** Creating a raw material whose `code` matched a previously
soft-deleted row threw a P2002 unique-constraint conflict (the soft-deleted row
still held the unique `code`).

**Change:** On create, if a soft-deleted row with the same `code` exists,
**restore and update it** (clear `deletedAt`, apply the new payload) instead of
inserting a new row. Added `findSoftDeletedByCode(code)` to the repository and a
restore path in the service.

**Behavior now:** re-creating a previously deleted code returns `201` with the
restored entity (verified live on prod).

---

## 2. Raw Materials — reorderLevel minimum (Bug #7)

**File:** `backend/src/raw-materials/dto/create-raw-material.dto.ts`

**Change:** `reorderLevel` validation tightened from `@Min(0)` → `@Min(1)`.
A reorder level of `0` is meaningless (it can never trigger a reorder alert).

**Behavior now:** `POST/PATCH` with `reorderLevel: 0` returns `400` before any DB
write (verified live on prod).

---

## 3. BOM — soft-delete tombstoning + scoped uniqueness (Bug #22)

**Files:** `backend/src/bom/bom.{repository,service}.ts`

**Problem:** Same class of issue as #3 — soft-deleted BOMs kept their unique
`name` / `bomNumber`, so re-creating with the same name threw P2002, and the
uniqueness check did not account for soft-deleted rows.

**Change:**
- `softDelete` now **tombstones** the unique columns: `name` and `bomNumber` are
  rewritten to `<value>__deleted__<id>` so the live value is freed.
- The create/update uniqueness check is **scoped to non-deleted rows**
  (`deletedAt: null`) and throws a clear `ConflictException` on a real collision.

**Behavior now:** re-creating a BOM with the name of a deleted BOM returns `201`;
a genuine duplicate against a live BOM returns `409` (verified locally).

---

## Notes
- No destructive schema changes were introduced by these fixes.
- Nasir's `product-batches` module + `total_rejected_quantity` column (commit
  `0750135`) were merged and deployed; schema synced to both prod tenant DBs
  (`inventory`, `tenant_2391`) via `prisma db push` (additive, no data loss).

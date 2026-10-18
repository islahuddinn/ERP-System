# Backend Changes — ERP User-Flows QA Round

**For:** Sir Nasir (Backend)
**Date:** 2026-06-14 / 15
**Branch:** `dev`
**Scope:** This QA round was mostly frontend. On the backend we made **two small fixes** plus implemented a **new per-PO PDF endpoint**. Details below, plus the remaining items the backend owner should pick up.

---

## 1. `src/suppliers/suppliers.module.ts` — fix supplier ledger route shadowing

**Bug:** "Supplier Ledger screen not loading" — `GET /api/suppliers/ledger-overview` returned `404 "Supplier not found"`.

**Root cause:** `SupplierLedgerController` (which owns `@Get("ledger-overview")`) was registered **after** `SuppliersController` (which owns `@Get(":id")`). NestJS/Express registers routes in module-array order, so `/suppliers/ledger-overview` was matched by `/suppliers/:id` and `"ledger-overview"` was treated as a supplier id → not found.

**Change:** register the ledger controller first so the static route wins.

```diff
- controllers: [SuppliersController, SupplierTransactionsController, SupplierLedgerController],
+ // SupplierLedgerController MUST be registered before SuppliersController so that
+ // the static route GET /suppliers/ledger-overview is matched before the param
+ // route GET /suppliers/:id (otherwise "ledger-overview" is treated as a supplier id).
+ controllers: [SupplierLedgerController, SuppliersController, SupplierTransactionsController],
```

**Verified:** `GET /api/suppliers/ledger-overview` now returns `200` (empty list when no suppliers, real data otherwise) on both local and production.

**General rule:** any static route living in a *separate* controller from `@Get(":id")` on the same base path must be registered first.

---

## 2. `src/sites/sites.repository.ts` — include `parent` in `SITE_SELECT`

**Bug:** "Parent column empty on Site list."

**Root cause:** `SITE_SELECT` selected `location` but not `parent`, so the API never returned the parent object.

**Change:** add the `parent` relation to the select.

```diff
  location: { select: LOCATION_SELECT },
+ parent: {
+   select: {
+     id: true,
+     name: true,
+     code: true,
+   },
+ },
} as const;
```

**Verified:** site list now returns `parent: { id, name, code }` for child sites; the column renders.

---

## 3. `purchase-orders` — new per-PO PDF endpoint (implemented by us)

**Bug #9:** "Purchase Order PDF download not working." There was **no PO PDF endpoint at all** (neither per-PO nor bulk) — the frontend button had nothing to call.

**What we added** (follows the existing PDFKit pattern from `factory-reports` / payroll payslips, using `PrismaService`/repository — not `@TenantClient()`, per the module's convention):

- **`purchase-order.service.ts`** — `generatePdf(purchaseOrderId): Promise<Buffer>`. Loads the PO via `findOne` (404-safe) and renders a PDF: header + order number, supplier block, order/status/payment/date meta, an items table (raw material, qty, unit price, line total), totals (subtotal / shipping / total / amount paid), and remarks. Uses a null-safe money formatter so missing amounts never throw.
- **`purchase-order.controller.ts`** — `GET /purchase-orders/:purchaseOrderId/pdf` (permission `purchases.read`, `@ApiOperation` present). Streams the buffer with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename=<orderNumber>.pdf`.
- **Frontend** — the "Print PDF" button now downloads the file (`responseType: 'blob'`) instead of showing a "not available" toast.

**Verified:** `GET /api/purchase-orders/<id>/pdf` → `200`, `application/pdf`, `filename=PO-000001.pdf`, valid `%PDF` body.

> Note: this reuses the existing `pdfkit` dependency (`@types/pdfkit` already present) — no new packages.

### 3b. Stale local seed scripts
- `scripts/seed-phase1-localhost.js` and `scripts/create-tenant-and-user.js` reference columns that no longer exist on the current schema (`passwordHash`, `emailVerified`, `databaseUrl`, `subscriptionType`) and use the tenant client for the master DB — they fail on a fresh database.
- Stopgap added: `scripts/local-bootstrap.ts` (schema-current: seeds tenant `8549`, admin, 26 system UOMs, categories, companies). A maintained official seed would be ideal.

### 3c. Migration ordering bug on fresh installs
- `prisma/tenant/migrations/20260608_remove_quarantine_from_receiving_status` runs `UPDATE "grn" SET ...` **before** the `grn` table is created on a clean database, so `prisma migrate deploy` fails (`relation "grn" does not exist`) on a brand-new DB.
- Existing environments are unaffected (incremental apply). But a fresh setup needs `prisma db push` to work around it. Worth reordering so a clean `migrate deploy` succeeds.

---

## Summary

| File | Bug | Status |
|---|---|---|
| `suppliers.module.ts` | Supplier ledger 404 (route shadow) | ✅ Fixed + deployed |
| `sites.repository.ts` | Site parent column empty | ✅ Fixed + deployed |
| `purchase-order.service.ts` + `.controller.ts` | #9 PO PDF (new endpoint) | ✅ Implemented + tested locally |

**Remaining for the backend owner:**
- **3b. Stale seed scripts** — replace/repair the old ones (stopgap `scripts/local-bootstrap.ts` added).
- **3c. Migration ordering bug** — `20260608_remove_quarantine...` breaks `migrate deploy` on a fresh DB. We deliberately did **not** edit it: Prisma checksums applied migrations, so editing it would make a future `migrate deploy` fail on environments where it's already applied (incl. prod). This needs a proper corrective migration, which the backend owner should author.

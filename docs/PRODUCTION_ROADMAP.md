# Production roadmap

Source of truth for going from this ERP to production-grade. Tick items as they land. Do not start a later phase until the previous phase exit gate is met.

**Scores (Sep 2026):** ops features ~70% · production-ready ~65% · not production-grade until Phase 5–6 land.

---

## Phase 0 — Lock the doors

**Status:** complete  
**Exit gate:** an unauthenticated client cannot read or write money; JWT/session lasts 24 hours; deploy scripts point at the real Prisma schemas; dummy data cannot run in production.

### Security
- [x] JWT + `PermissionsGuard` on all financial routes (COA, journal, reports, AP, AR, cash, assets, budgets)
- [x] Super-admin payments API live and guarded (`SuperAdminJwtAuthGuard`)
- [x] Access tokens expire in **24 hours** (tenant users, super admin, NextAuth session)
- [x] Seed/bootstrap scripts read passwords from `SEED_ADMIN_PASSWORD` (no hardcoded secrets)

### Deploy and dead code
- [x] Railway / Docker Prisma generate + migrate use `prisma/tenant/schema.prisma` (not the missing `prisma/schema.prisma`)
- [x] `railway.toml` pre-deploy calls `tenant:deploy` (script `prisma:deploy` does not exist)
- [x] Dead `backend/src/payroll/` removed (live payroll is `backend/src/hr/payroll/`)
- [x] POS / finance `console.log` of sale and report payloads removed

### Dummy data
- [x] Production builds never use dummy data or `localStorage.authBypass`
- [x] Hardcoded `USE_DUMMY_DATA = true` on warehouse detail removed

**After pulling this work:** restart backend and frontend, then log in again so the new 24-hour token is issued. Add `SEED_ADMIN_PASSWORD` to `backend/.env` before re-running any seed/bootstrap script. Run `npm run seed:permissions` once so the new `finance.manage` permission exists in each tenant DB (Admin / Super Admin already bypass permission checks).

---

## Phase 1 — One-factory golden path UAT

**Status:** complete  
**Exit gate:** golden-path screens resolve to live APIs; leftover HR, nav, POS export, and broker stub breaks from this phase are fixed. A live factory-week close (no Excel) is still the ops confirmation in Phase 6.

- [x] Master data → PO → GRN → QC → stock → production → FG → branch transfer → shop order → delivery → recovery → POS (screens and APIs for this path exist; dead HR routes redirected; ops screens in nav)
- [x] Fix `/dashboard/hr/managers` (uses `/hr/employees`; leftover leave/roster stubs redirect to live HR pages)
- [x] Expenses / cash-in-hand / reorder in nav (permissions mapped)
- [x] POS report export (daily summary CSV from the API; tab CSVs from loaded data)
- [x] Broker commissions/performance: honest UI from live broker rates/targets (sales are not stored against brokers, so no fake approve/pay)

**After this work:** Expenses, Cash in Hand, and Reorder Alerts appear in the sidebar for users with `expenses.*`, `cash.view`, and `stock.read`. Managers is under HR. POS Reports → Export All downloads the daily summary CSV (`reports.export`). Broker commission posting is not live until a later phase stores `brokerId` on sales.

---

## Phase 2 — Money integrity

**Status:** complete  
**Exit gate:** ops ledgers and GL agree; tenant A never reads tenant B.

- [x] Every stock / cash / payroll movement posts a balanced journal (or an explicit exception list)
- [x] Trial balance, P&L, cash, AR/AP match operational ledgers
- [x] Tenant isolation test: tenant A never reads tenant B

**After this work:** POS (sale, refund, return), payroll pay, expenses, cash-in-hand, GRN, customer recovery, shop credit/debit notes, and financial AP/AR/bank/assets post **idempotent balanced journals** via `GlPostingService` (unique on sourceType + sourceId + postingKind). `GET /financial/reports/reconciliation` compares operational totals to those journals; `GET /financial/reports/posting-exceptions` and `docs/GL_POSTING_EXCEPTIONS.md` list movements that do not post. A Bearer JWT’s `tenantId` always wins over `X-Tenant-Id`. Apply tenant migration `20260908180000_journal_source_posting`. Rows created **before** this phase will not have journals until they are re-posted or lived through a new movement.

---

## Phase 3 — Test pyramid

**Status:** complete  
**Exit gate:** unit + golden-rule + smoke e2e are required to merge.

- [x] Unit tests on costing, stock-ledger, payroll, PO, GRN, customer ledger, bonus schemes, loans
- [x] Golden-rule suite (tenant isolation, stock conservation, journals balance, permissions, audit, idempotent pay)
- [x] API e2e per workflow (401 / 403 / 400 / happy path / 409)
- [x] Playwright on 10 critical screens
- [x] CI fails the build on red

**After this work:** `cd backend && npm test` runs unit + golden-rule specs and must stay green. `npm run test:e2e:smoke` covers 401/403/400/200/409 on reports, GRN, and payroll pay. Frontend `npm run test:e2e` is Playwright: login form plus nine dashboard screens that must bounce unauthenticated users to `/auth/login`. GitHub Actions now runs those three layers on PRs to `dev` and `main` and fails the merge gate on red. Legacy Nest specs that targeted deleted APIs are excluded from the default Jest run (see `testPathIgnorePatterns` in `backend/package.json`).

---

## Phase 4 — Load and soak

**Status:** complete  
**Exit gate:** p95 targets met; error rate &lt; 0.1% on a 30-minute soak.

- [x] k6 on login, stock read, POS checkout, GRN post, tenant switch
- [x] Fix N+1 and missing indexes before adding hardware

**After this work:** Apply tenant migration `20260908210000_hot_path_indexes`. POS checkout now batches product + stock lookups; stock availability filters by `productId`; FIFO consume filters by `rawMaterialId`; tenant metadata is cached (~30s) so middleware no longer hits master 2–5 times per request; role permissions are cached on login and `GET /users/me/permissions`. Tenant Prisma URLs include `connection_limit` (`TENANT_PRISMA_CONNECTION_LIMIT`, default 5). Load scripts are in `load/k6/` — `k6 run load/k6/gate.js` (≈2 min) and `k6 run load/k6/soak.js` (30 min). Credentials come from `K6_EMAIL` / `K6_PASSWORD` (never hardcoded). On the API process used for load only, set `LOAD_TEST_BYPASS_THROTTLE=true` or login stays at 5/min and 50 RPS login will 429. Write scenarios (`K6_ENABLE_WRITES=true`) need a disposable tenant. Nightly Actions runs `gate.js` when `K6_BASE_URL` is set; it is not a PR merge gate. A full 30-minute soak against a live factory DB is an ops run, not CI.

---

## Phase 5 — Operate it

**Status:** not started  
**Exit gate:** backups restored in a drill; structured logs; per-tenant rate limits.

- [ ] Structured logs, error tracking
- [ ] DB backups + restore drill, migration runbook, uptime checks
- [ ] Rate-limit per tenant (not only a global 100/min)

---

## Phase 6 — First production tenant

**Status:** not started  
**Exit gate:** Islahuddin closed one period in parallel with Excel, then Excel is retired.

- [ ] Freeze window, shadow-parallel close, then enable other tenants

---

## Phase 7 — Optional modules (only if a paying workflow needs them)

**Status:** not started — do not start before Phase 3 is green.

- [ ] FBR e-invoice / WHT
- [ ] Notifications (in-app, SMS, email beyond receipts)
- [ ] Real broker commissions

---

## Phase 8 — AI copilot

**Status:** not started — do not start before Phase 3 is green.

- [ ] 8a Read-only copilot (tools wrapping GET stock, sales, ledger)
- [ ] 8b Draft writes with human Confirm → real POST
- [ ] 8c Document extract (invoice/GRN PDF → DTO)
- [ ] 8d Forecasts (classical ML, not an LLM)

---

## Login flows (after Phase 0)

Sessions last **24 hours**. After that, log in again. Existing users in the database are unchanged — only *new* seed runs read `SEED_ADMIN_PASSWORD`.

### Tenant ERP (factory / sales / HR / finance)

1. Open `/auth/login`.
2. Enter **email**, **password**, and **tenant ID** (short id, e.g. `3991`).
3. Submit. NextAuth calls `POST /api/auth/login` with header `X-Tenant-Id`.
4. Backend issues a JWT signed with `JWT_SECRET`, expiry `JWT_EXPIRES_IN` (`24h`).
5. You land on `/dashboard`. The token is sent as `Authorization: Bearer …` on API calls.
6. **Admin** and **Super Admin** (tenant roles) bypass permission checks and can use finance.
7. Other roles need the matching `finance.*` permission or they get **403** on financial APIs.
8. Unauthenticated calls to `/api/financial/*` now return **401** (this was open before Phase 0).

Demo tenant `3991` users (passwords already in the DB — not stored in git):

| Role | Email | Tenant ID |
|---|---|---|
| Super Admin | `islahuddin.malindtech@gmail.com` | `3991` |
| Factory Stock Manager | `factory.manager@malindtech.com` | `3991` |

Factory Stock Manager cannot open Chart of Accounts / journals unless you grant `finance.view` (and write perms as needed). Use the Super Admin user for finance.

### Platform super admin (tenants, subscriptions, payments)

This is **not** the tenant Super Admin role. It is the Malind control plane.

1. Open `/super-admin/auth/login` (no tenant ID).
2. Enter the super-admin email and password stored in the **master** database.
3. Backend issues a JWT with `type: SUPER_ADMIN`, same 24-hour expiry.
4. Token is stored as `superAdminToken` in localStorage.
5. You land on `/super-admin/dashboard`. Payments, tenants, and subscriptions require this token (`SuperAdminJwtAuthGuard`).
6. Do not use this login for factory POS / HR / stock — those need the tenant login above.

If the super-admin token expires, you are sent back to `/super-admin/auth/login`.

### After a password change

Tenant JWTs issued before `passwordChangedAt` are rejected. Log in again.

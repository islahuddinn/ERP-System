# Role-Based UAT Guide

> **Full end-to-end guide:** See **[ERP_FULL_UAT_GUIDE.md](./ERP_FULL_UAT_GUIDE.md)** for complete module testing from environment setup through sign-off.

Step-by-step instructions to create test users, assign roles, and verify that each role sees only the modules they should access.

For permission concepts and troubleshooting, see [USER_ROLES_AND_PERMISSIONS_GUIDE.md](./USER_ROLES_AND_PERMISSIONS_GUIDE.md).

---

## 1. Before you start

### Frontend error: `Cannot read properties of undefined (reading 'call')`

This is a stale Next.js cache issue. Stop the dev server, then:

```bash
cd frontend
rm -rf .next node_modules/.cache
npm run dev
```

Hard-refresh the browser. Full troubleshooting: [ERP_FULL_UAT_GUIDE.md §1](./ERP_FULL_UAT_GUIDE.md#1-fix-common-frontend-error-first).

Run these once after pulling the latest code (or after any release that adds permissions):

```bash
cd backend
npx prisma migrate deploy --schema=prisma/tenant/schema.prisma
npx prisma generate --schema=prisma/tenant/schema.prisma
npm run seed:permissions
npm run seed:default-roles
```

**If you see `Environment variable not found: DATABASE_URL`:** Prisma 6+ uses `prisma.config.js`, which no longer auto-loads `.env`. This is fixed in the repo — pull latest, or run from `backend/` where `.env` exists. You can also use the npm script: `npm run tenant:deploy`.

**Tenant 3991 demo DB:** `.env` points at database `inventory`. Migrations apply to that DB. For tenant **`3991`**, run migrations against that database too:

```bash
cd backend
DATABASE_URL="postgresql://waseem:waseem@localhost:5432/3991?schema=public" npx prisma migrate deploy --schema=prisma/tenant/schema.prisma
```

(Use your real user/password from `.env` — only change the database name to `3991`.)

Restart the backend, then continue.

**Important:** After changing a user’s role, that user must **log out and log back in** before the sidebar and API reflect the new permissions.

---

## 2. Recommended test accounts

Create four dedicated UAT logins — one per role template. Use separate browsers or incognito windows so you can switch quickly.

| Test user | Suggested email | Role | Password (your choice) |
|-----------|-----------------|------|------------------------|
| Admin UAT | `admin.uat@yourcompany.com` | Admin | (set during creation) |
| Sales Employee UAT | `sales.employee@yourcompany.com` | Sales Employee | |
| Sales Manager UAT | `sales.manager@yourcompany.com` | Sales Manager | |
| Factory Stock Manager UAT | `factory.manager@yourcompany.com` | Factory Stock Manager | |

**Tenant 3991 demo:** If you use the bootstrap script, you already have:

- `islahuddin.malindtech@gmail.com` — Super Admin
- `factory.manager@malindtech.com` — Factory Stock Manager

```bash
cd backend
npx ts-node scripts/ensure-tenant-3991-demo-ready.ts
```

You still need to create **Sales Employee** and **Sales Manager** test users manually (steps below).

---

## 3. Role → permission reference

Source of truth: `backend/scripts/seed-default-roles.ts`. Re-sync with `npm run seed:default-roles`.

### Admin / Super Admin

| Role | Permissions |
|------|-------------|
| **Admin** | **All** permissions (via `npm run seed:permissions`) |
| **Super Admin** | **All** permissions (demo bootstrap on tenant 3991) |

Use for: setup, master data, user/role management, full module demo.

### Sales Employee (field sales)

| Permission | Purpose |
|------------|---------|
| `dashboard.view` | Dashboard |
| `customers.read` | View shops |
| `customer-order.view` / `.create` | Shop orders |
| `customer-delivery.view` / `.deliver` | Deliveries |
| `customer-ledger.view` | Shop ledger |
| `customer-return.view` / `.create` | Returns (create only — no approve) |
| `customer-recovery.view` / `.create` | Cash recovery |
| `employee-cash-ledger.view` | Own cash ledger |
| `employee-cash-transfer.view` / `.create` / `.respond` | Cash transfers |
| `branch-stock.view` | View branch stock only |

**Cannot:** territory, assignments, bonus schemes, transporters, credit notes, product adjustments, approvals, settings.

### Sales Manager (branch distributor)

Everything **Sales Employee** has, plus:

| Permission | Purpose |
|------------|---------|
| `sales-region.view` | Territory setup |
| `sales-person-assignment.view` / `.manage` | Assign sales people (must be branch **distributor**) |
| `customer-category.view` / `.manage` | Customer categories |
| `product-bonus-group.view` / `.manage` | Bonus groups |
| `product-bonus-scheme.view` / `.manage` | Bonus schemes |
| `transporter.view` / `.manage` | Transporters |
| `customer-return.approve` | Approve returns |
| `customer-ledger-adjustment.view` / `.create` | Credit/debit notes |
| `product-adjustment.view` / `.create` | Product adjustments (audit) |
| `branch-stock-request.*` | Request + approve at branch |
| `branch-stock-transfer.view` / `.confirm-receipt` | Transfers |
| `branch-stock-return.*` | Returns at branch |
| `branch-ledger.view` | Branch ledger |
| `branch-product-price.view` / `.manage` | Branch pricing |
| `price-list.view` | Trade price lists |
| `employee-cash-ledger.view-all` | All staff cash |

### Factory Stock Manager

| Permission | Purpose |
|------------|---------|
| `dashboard.view` | Dashboard |
| `reports.view` | Factory / reports dashboard |
| `factory-stock.view` / `.manage` | Factory stock in + adjust |
| `branch-stock-request.view` / `.approve-factory` | Approve factory-bound requests |
| `branch-stock-transfer.view` | View transfers |
| `branch-stock-return.view` / `.approve-factory` | Factory-side returns |
| `warehouses.view` | Warehouses |
| `stock.read` / `.transfer` | Stock read / transfer |
| `grn.read` | GRN / receiving read |

**Cannot:** shop orders, territory, HR, settings (unless given Admin).

### HR Manager

| Permission | Purpose |
|------------|---------|
| `dashboard.view` | Dashboard |
| `hr.view` / `.manage_employees` / `.manage_attendance` / `.manage_payroll` / `.approve_payroll` | HR core |
| `attendance.view_all` | All attendance |
| `shifts.view` | Shifts |
| `payroll.view` | Payroll |
| `leave-requests.view` / `.approve` | Leave |
| `loan-requests.view` / `.approve` | Loans |
| `holidays.view` | Holidays |
| `hr.view_recruitment` | Recruitment |

**Cannot:** sales, factory stock, distribution modules.

---

## 4. How to create a user (HR → role assignment)

User accounts are **not** created from Settings → Users directly. They are provisioned through HR.

### Step A — Create the employee (Admin login)

1. Log in as **Admin**.
2. Go to **HR → Employees**.
3. Click **Add Employee** and fill in:
   - First / last name
   - Employee code (e.g. `EMP-SALES-01`)
   - Department, position (any valid values)
   - **Email** — this becomes the login username
   - **Grant login access** — enabled
   - **Temporary password** — set a known password for UAT
4. Save.

The user now appears under **Settings → Users** (or **HR → Employees** with login enabled).

### Step B — Assign the role

1. Go to **Settings → Users**.
2. Open the user → assign **Sales Employee**, **Sales Manager**, **Factory Stock Manager**, or **Admin**.
3. Save.
4. Ask the test user to **log out and log back in**.

### Step C — Verify permissions (optional)

1. Go to **Settings → Roles & Permissions**.
2. Open a role (e.g. **Sales Manager**) and confirm permissions match **§3** above.
3. Re-run `npm run seed:default-roles` if you want to reset template roles to the latest codebase defaults.

---

## 5. Sidebar visibility matrix

After login, each role should see **only** the sections below under **Sales** (plus Dashboard). Empty parent menus are hidden automatically.

| Sidebar item | Admin | Sales Employee | Sales Manager | Factory Stock Manager |
|--------------|:-----:|:--------------:|:-------------:|:---------------------:|
| Shop orders / deliveries / returns / recovery | ✅ | ✅ | ✅ | ❌ |
| Shop ledger | ✅ | ✅ | ✅ | ❌ |
| Credit/debit notes | ✅ | ❌ | ✅ | ❌ |
| Product adjustments | ✅ | ❌ | ✅ | ❌ |
| Branch stock (view / requests / transfers) | ✅ | view only | ✅ | factory approve only |
| Territory setup | ✅ | ❌ | ✅ | ❌ |
| Sales person assignments | ✅ | ❌ | ✅ | ❌ |
| Customer categories | ✅ | ❌ | ✅ | ❌ |
| Product bonus groups | ✅ | ❌ | ✅ | ❌ |
| Product bonus schemes | ✅ | ❌ | ✅ | ❌ |
| Transporters | ✅ | ❌ | ✅ | ❌ |
| Employee cash (own) | ✅ | ✅ | ✅ | limited |
| Employee cash (all staff) | ✅ | ❌ | ✅ | ❌ |
| Factory stock | ✅ | ❌ | ❌ | ✅ |
| HR modules | ✅ | ❌ | ❌ | ❌ |
| Settings / Users / Roles | ✅ | ❌ | ❌ | ❌ |

If a user sees a module they should not, or nothing at all:

1. Confirm `dashboard.view` is on their role (included in all templates).
2. Log out / log in again.
3. Run `npm run seed:permissions` and re-assign the role if a new module was just deployed.

---

## 6. Test scripts by role

### 6.1 Admin

**Goal:** Full access; can set up master data for other roles.

1. Log in → sidebar shows Sales, Factory, HR, Settings.
2. **Settings → Roles & Permissions** — open **Sales Manager**; confirm `product-bonus-scheme.view` and `.manage` are ticked.
3. **Sales → Product Bonus Groups** — create a group with at least two products.
4. **Sales → Product Bonus Schemes** — create a scheme on that group (e.g. buy 10 / get 1, valid from today).
5. Try deleting the bonus **group** while a scheme exists → expect error (“one or more bonus schemes reference it”).
6. Delete the scheme first, then group delete should succeed.
7. **Settings → Users** — assign roles to UAT users.

### 6.2 Sales Employee

**Goal:** Field sales only — no master-data or approval screens.

1. Log in → confirm **no** Territory, Bonus Groups/Schemes, Transporters, Credit Notes, Product Adjustments, or Settings.
2. **Sales → Shop Orders** — create a draft order (existing flow unchanged).
3. **Sales → Deliveries** — open list (should load; no 403).
4. Direct URL test: open `/dashboard/sales/product-bonus-schemes` → page should block (ProtectedRoute) or redirect; API calls return 403.
5. **Employee Cash** — view own ledger only (not “all staff”).

### 6.3 Sales Manager

**Goal:** Branch distributor — master data + approvals.

1. Log in → confirm **Product Bonus Groups**, **Product Bonus Schemes**, **Transporters**, **Customer Categories**, **Territory**, **Credit/Debit Notes**, **Product Adjustments** are visible.
2. Create / edit / delete a **bonus scheme** (requires an existing bonus group).
3. **Branch stock request** — create request as manager (or use Sales Employee in another browser).
4. **Approve** branch stock return / request at branch level (not factory).
5. **Product adjustments** — record an addition/deduction (audit only; stock/orders unchanged).
6. **Employee cash** — open “all staff” view if exposed in your branch menu.

### 6.4 Factory Stock Manager

**Goal:** Factory warehouse — no shop-order screens.

1. Log in → confirm **Factory Stock** and branch-stock factory approval items; **no** Shop Orders, Bonus Schemes, or HR.
2. **Two-user branch stock flow** (critical):
   - Browser A: **Sales Manager** (or employee with request permission) — submit branch stock request to factory.
   - Browser B: **Factory Stock Manager** — approve factory-bound request.
   - Same user cannot approve their own request (by design).
3. Confirm factory stock quantities update per existing flow.

---

## 7. Product bonus hierarchy (Phase E4)

Design order — master data only until order booking is wired:

```
Product Bonus Group (E1)  →  products in the group
        ↓
Product Bonus Scheme (E4) →  qty rules (min purchase / bonus qty, dates)
```

**UAT checklist:**

| Step | Action | Expected |
|------|--------|----------|
| 1 | Create bonus group with products | Group saved; orders unaffected |
| 2 | Create scheme on that group | Scheme listed with group name, buy/get qty, dates |
| 3 | Edit scheme dates / qty | Updates saved; audit log entry |
| 4 | Delete group while scheme exists | 400 with clear message |
| 5 | Delete scheme, then group | Both removed |
| 6 | Sales Employee login | No bonus menu items; direct URL blocked |

---

## 8. Demo prep — seed commands & “Out of Stock” products

### Correct seed commands (tenant 3991)

**Do not** copy the placeholder `postgresql://...@localhost:5432/3991` — that is not a real URL.

Your `backend/.env` already has credentials (`waseem:waseem@localhost:5432/inventory`). Scripts derive the tenant DB **`3991`** from that automatically.

```bash
cd backend

# Step 1 — admin + factory manager users (reads .env automatically)
npx ts-node scripts/ensure-tenant-3991-demo-ready.ts

# Step 2 — territory, products, customers, warehouse test data (reads .env automatically)
npx ts-node scripts/seed-module-test-data.ts

# Optional: different tenant short id
TENANT_SHORT_ID=3991 npx ts-node scripts/seed-module-test-data.ts
```

If UOM seed fails, run once: `npx ts-node prisma/tenant/seed/seed-uoms.ts`

You do **not** need to change `DATABASE_URL` in `.env` for tenant 3991 — only the bootstrap scripts swap the database name from `inventory` → `3991`.

### Why new products show “Out of Stock”

The products list badge uses **`Product.currentStock`** on the master record. New products are created with **stock = 0** until stock is added through inventory flows. This is expected — not a bug.

For your demo today:

| Goal | Action |
|------|--------|
| Quick sample data | Run `seed-module-test-data.ts` (sets test product stock to 500) |
| Live factory stock | **Sales → Factory Stock** — stock in / adjust (Factory Stock Manager) |
| Distribution orders | Branch/factory stock flows — product master stock alone does not drive shop orders |

The add-product form does not set opening stock; use factory stock or the seed script before presenting the catalog.

### Module presentation order (Planning not built yet)

| Order | Module | Demo as | Status |
|-------|--------|---------|--------|
| 1 | Platform / roles | Admin | ✅ |
| 2 | Territory + customers | Admin / Sales Manager | ✅ |
| 3 | Products + pricing | Admin / Sales Manager | ✅ |
| 4 | Shop order → delivery → ledger | Sales Employee → Manager | ✅ |
| 5 | Returns / recovery / adjustments | Employee + Manager | ✅ |
| 6 | Branch stock (2 users) | Manager + Factory Manager | ✅ |
| 7 | Bonus groups → schemes | Sales Manager | ✅ |
| 8 | Transporters | Sales Manager | ✅ |
| 9 | HR | HR Manager | ✅ |
| 10 | **Planning** (targets, route planning) | — | ⬜ **Not started** |

---

## 9. Quick API smoke test (optional)

With a Sales Manager token:

```http
GET  /sales-management/product-bonus-schemes
POST /sales-management/product-bonus-schemes
```

With a Sales Employee token, the same `GET` should return **403**.

---

## 10. Sign-off checklist

- [ ] All four role test users created and roles assigned
- [ ] Each user logged out/in after role assignment
- [ ] Sidebar matches matrix in §4
- [ ] Sales Employee cannot access bonus schemes (UI + API)
- [ ] Sales Manager can CRUD bonus groups and schemes
- [ ] Group delete blocked when schemes exist
- [ ] Branch stock factory approval uses **two different** logins
- [ ] Legacy POS / orders / deliveries / stock / ledger flows still work (no regression)

---

*Permission reference: [USER_ROLES_AND_PERMISSIONS_GUIDE.md](./USER_ROLES_AND_PERMISSIONS_GUIDE.md)*

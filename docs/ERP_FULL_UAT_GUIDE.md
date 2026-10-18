# ERP Full UAT Guide — From Zero to Sign-Off

Production-grade, step-by-step testing for **Scalable ERP** (distribution sales + factory + HR).  
Covers environment setup, roles, master data order, module flows, known blockers, and troubleshooting.

**Related docs:** [USER_ROLES_AND_PERMISSIONS_GUIDE.md](./USER_ROLES_AND_PERMISSIONS_GUIDE.md) · [ROLE_BASED_UAT_GUIDE.md](./ROLE_BASED_UAT_GUIDE.md)

---

## Table of contents

1. [Fix common frontend error first](#1-fix-common-frontend-error-first)
2. [Phase 0 — Environment & database](#2-phase-0--environment--database)
3. [Phase 1 — Roles & test users](#3-phase-1--roles--test-users)
4. [Phase 2 — Master data (Admin)](#4-phase-2--master-data-admin)
5. [Phase 3 — Warehouse & inventory setup](#5-phase-3--warehouse--inventory-setup)
6. [Phase 4 — Procurement & receiving](#6-phase-4--procurement--receiving)
7. [Phase 5 — Material management](#7-phase-5--material-management)
8. [Phase 6 — Production loop](#8-phase-6--production-loop)
9. [Phase 7 — Distribution sales loop](#9-phase-7--distribution-sales-loop)
10. [Phase 8 — Branch stock (multi-role)](#10-phase-8--branch-stock-multi-role)
11. [Phase 9 — HR module (HR Manager)](#11-phase-9--hr-module-hr-manager)
12. [Phase 10 — Financial & reporting smoke test](#12-phase-10--financial--reporting-smoke-test)
13. [Phase 11 — Master-data modules (E1–E4)](#13-phase-11--master-data-modules-e1e4)
14. [Known blockers & how to avoid them](#14-known-blockers--how-to-avoid-them)
15. [Sign-off checklist](#15-sign-off-checklist)
16. [Appendix — Module index (every sidebar item)](#16-appendix--module-index-every-sidebar-item)

---

## 1. Fix common frontend error first

### Symptom

```
TypeError: Cannot read properties of undefined (reading 'call')
```

This is a **Next.js webpack chunk / cache** error (not a business-logic bug). It often appears after pulling new pages or when the dev cache is stale.

### Fix (do in order)

**Step 0 — kill duplicate dev servers (most common cause)**

If you see `Port 3000 is in use, trying 3001` in the terminal, your browser may still be hitting a **stale** server on 3000 with broken webpack chunks → exactly this `reading 'call'` error.

```bash
# macOS — stop every Next.js dev server
lsof -ti :3000,:3001 | xargs kill -9 2>/dev/null
pkill -f "next dev" 2>/dev/null
```

Then start **one** frontend only: `cd frontend && npm run dev` — confirm it says `Local: http://localhost:3000` (not 3001).

```bash
# Terminal 1 — frontend
cd frontend
# Stop dev server (Ctrl+C) first, then:
rm -rf .next node_modules/.cache
npm run dev
```

In the browser: **hard refresh** (Cmd+Shift+R / Ctrl+Shift+R) or use a new incognito window.

If it still fails:

```bash
cd frontend
rm -rf node_modules .next
npm install
npm run dev
```

### Also verify

| Check | Action |
|-------|--------|
| Backend running | `cd backend && npm run start:dev` — API at `http://localhost:5000` |
| Frontend env | `frontend/.env` → `NEXT_PUBLIC_API_URL=http://localhost:5000/api` |
| Migrations applied | See Phase 0 below — missing tables cause **API** errors (different from webpack `.call`) |
| Tenant ID on login | Use short code (e.g. `3991`), subdomain, or tenant UUID — not a random number |

---

## 2. Phase 0 — Environment & database

### 2.1 Start services

```bash
# Terminal 1 — backend
cd backend
npm install
npm run start:dev

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000/auth/login**.

### 2.2 Apply migrations & seed permissions

```bash
cd backend
npm run tenant:deploy
npm run generate:all
npm run seed:permissions
npm run seed:default-roles
```

Restart backend after migrate.

**Tenant 3991 (demo DB):** If `migrate deploy` fails with “database is not empty”, sync schema instead:

```bash
cd backend
TENANT_SHORT_ID=3991 npm run tenant:schema-sync
```

### 2.3 Demo bootstrap (tenant 3991) — Super Admin + Factory Manager

```bash
cd backend
npx ts-node scripts/ensure-tenant-3991-demo-ready.ts
```

Creates:

| Login | Role |
|-------|------|
| `islahuddin.malindtech@gmail.com` | Super Admin (all permissions) |
| `factory.manager@malindtech.com` | Factory Stock Manager |

Password (demo): `Me@malind123` — change in production.

Still create **Sales Employee** and **Sales Manager** manually (Phase 1).

### 2.4 Module test data + interactive demo workflows

Speeds up UAT if your tenant is empty:

```bash
cd backend
TENANT_SHORT_ID=3991 npm run seed:module-test-data
TENANT_SHORT_ID=3991 npm run seed:demo-workflows
```

**`seed:module-test-data`** — company, location, products, raw materials, site, plant, warehouse, suppliers, territory, customers, BOM.

**`seed:demo-workflows`** — purchase orders (all statuses), GRN + batches, production orders, product batches, credit/debit notes, product adjustments, branch stock request (pending approval), purchase return (pending approval), **warehouse/factory/branch stock balances** for every active product.

Log out and back in after seeding.

### 2.5 Recommended sidebar order (business flow)

The sidebar follows this operational sequence:

1. **Overview** → Dashboard
2. **Master Data** → Products, raw materials, locations, sites, suppliers
3. **Warehouse Management** → Warehouses, zones, warehouse stock
4. **Purchases** → PO → returns
5. **Material Management** → GRN → material requests → material transfers
6. **Production** → BOM → production orders → work orders → product batches
7. **Quality & Control** → Inspections, waste
8. **Sales** → Territory → customers → orders → deliveries → branch stock
9. **Costing & Reports** / **Profit** / **HR** / **Financial** / **System**

---

## 3. Phase 1 — Roles & test users

### 3.1 Roles created by `seed:default-roles`

| Role | Purpose |
|------|---------|
| **Admin** | Full access (via `seed:permissions`) |
| **Super Admin** | Same as Admin on tenant (demo bootstrap) |
| **Sales Employee** | Field sales — orders, deliveries, returns |
| **Sales Manager** | Branch distributor ops — approvals, master data |
| **Factory Stock Manager** | Factory stock + factory-side branch approvals |
| **HR Manager** | HR, attendance, payroll, leave |

### 3.2 Create five UAT logins

Use **separate browsers or incognito windows** — one per role.

| # | Email (example) | Role | Used for |
|---|-----------------|------|----------|
| 1 | `admin.uat@company.com` | Admin | Setup, master data, user management |
| 2 | `sales.manager@company.com` | Sales Manager | Must be **branch distributor** (see §10) |
| 3 | `sales.employee@company.com` | Sales Employee | Shop orders, deliveries |
| 4 | `factory.manager@company.com` | Factory Stock Manager | Factory approve branch requests |
| 5 | `hr.manager@company.com` | HR Manager | HR-only modules |

### 3.3 Create each user (Admin login)

Users are created through **HR**, not Settings → Create User.

1. **HR → Employees → Add Employee**
2. Fill: name, employee code, department, position, **email**, **password**, enable **Grant login access**
3. Save
4. **Settings → Users** → open user → assign role
5. User **logs out and logs back in**

### 3.4 Critical — link Sales Manager to branch

The Sales Manager employee **must** be set as **Distributor** on the branch (Territory → edit branch → Distributor field).  
Without this, sales person assignment and several branch approvals return **403/404**.

**Steps:**

1. Admin: note Sales Manager’s **employee** record (HR → Employees)
2. **Sales → Territory Setup** → drill Region → Zone → City → Branch
3. Edit branch → set **Distributor** = Sales Manager employee
4. Save

### 3.5 Assign sales person to branch

1. Log in as **Sales Manager** (the distributor)
2. **Sales → Sales Person Assignments**
3. Assign **Sales Employee** to the branch
4. Log in as Sales Employee — confirm they can create shop orders for customers in that branch’s areas

---

## 4. Phase 2 — Master data (Admin)

Complete **in this order** — later steps depend on earlier ones.

| Step | Module | Path | What to create | Expected |
|------|--------|------|----------------|----------|
| 2.1 | UOMs | `/dashboard/products/uoms` | Piece, Kilogram, etc. | Dropdowns work in product/RM forms |
| 2.2 | Product categories / brands / groups | Product management | At least one of each | Product form fields populate |
| 2.3 | Products | `/dashboard/products` → Add | Finished goods with price + UOM | List shows stock column |
| 2.4 | Raw materials | `/dashboard/raw-materials/add` | At least one RM with UOM | BOM can reference it |
| 2.5 | Locations | `/dashboard/locations` | Factory address | Sites/plants can link |
| 2.6 | Sites | `/dashboard/sites/create` | Production site | Production orders can select site |
| 2.7 | Plants | `/dashboard/factory/plants/create` | Manufacturing plant | Material requests can target plant |
| 2.8 | Suppliers | `/dashboard/suppliers/create` | At least one supplier | PO creation works |
| 2.9 | Customer category | `/dashboard/sales/customer-categories` | e.g. Retail Shops | Customer form works |
| 2.10 | Territory | `/dashboard/sales/territory` | Region → Zone → City → **Branch** → Area | Hierarchy visible |
| 2.11 | Branch distributor | Edit branch in territory | Set **Distributor** = Sales Manager employee | Required for sales assignments |
| 2.12 | Customers (shops) | `/dashboard/customers` | Assign to **Area** | Shop appears in order dropdown |
| 2.13 | Sales person assignment | `/dashboard/sales/sales-person-assignments` | **Sales Manager** assigns employee | Employee can book orders |
| 2.14 | Price lists | `/dashboard/sales/price-lists` | FIXED_PRICE mode | Order lines get prices |
| 2.15 | Branch product prices | `/dashboard/sales/branch-product-prices` | FREE_PRICE mode | Branch-specific pricing |
| 2.16 | Transporters | `/dashboard/sales/transporters` | At least one | Dispatch forms work |
| 2.17 | Product bonus group + scheme | `/dashboard/sales/product-bonus-groups` | Optional E1/E4 test | See Phase 11 |

**Expected:** Each screen loads without 403; lists may be empty until you create records.

---

## 5. Phase 3 — Warehouse & inventory setup

| Step | Module | Path | Action | Expected |
|------|--------|------|--------|----------|
| 3.1 | Warehouses | `/dashboard/factory/warehouses` | Create STORAGE + DISPATCH warehouses | Both appear in list |
| 3.2 | Zones | `/dashboard/factory/zones` | Add zone per warehouse | Zone linked to warehouse |
| 3.3 | Warehouse stock overview | `/dashboard/warehouse-stock` | Open overview | Shows balances (or run `seed:demo-workflows`) |
| 3.4 | Stock by warehouse | `/dashboard/warehouse-stock/warehouses` | Drill into each warehouse | Products with qty > 0 |
| 3.5 | Factory stock | `/dashboard/sales/factory-stock` | View / adjust opening stock | Factory Stock Manager can edit |
| 3.6 | Branch stock | `/dashboard/sales/branch-stock` | View branch balances | Matches branch after transfers |
| 3.7 | Raw material batches | `/dashboard/raw-materials/batches` | View batches (after GRN) | Batch numbers visible |

**Tip:** Run `npm run seed:demo-workflows` to pre-fill warehouse, factory, and branch stock for all active products.

---

## 6. Phase 4 — Procurement & receiving

| Step | Module | Path | Action | Expected |
|------|--------|------|--------|----------|
| 4.1 | Create PO | `/dashboard/purchases/create` | Draft PO with RM lines | Status = DRAFT |
| 4.2 | Confirm PO | PO detail → Confirm | Move to CONFIRMED (Sent tab) | Appears under Sent |
| 4.3 | Partial receive | Receive modal | Receive part of qty | Status = PARTIAL |
| 4.4 | Create GRN | `/dashboard/factory/receiving/create` | Link to PO, receive goods | GRN PENDING → COMPLETED |
| 4.5 | Complete PO | Receive remaining qty | Full receive | PO status = RECEIVED (Completed tab) |
| 4.6 | Purchase return | `/dashboard/purchases/returns/list` | Create return from received PO | DRAFT + approval flow |
| 4.7 | Approve return | Factory manager login | Approve `PR-DEMO-001` if seeded | Status advances |

Use **status tabs** on the Purchase Orders and GRN list pages (Draft / Sent / Partial / Completed / Cancelled).

---

## 7. Phase 5 — Material management

Both **Material Requests** and **Material Transfers** use **status tabs** on the list page (same pattern as Purchase Orders and GRN). Sidebar links sync via `?status=`.

### 7.1 Material requests

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/dashboard/factory/material-requests` → **Create Request** | Form opens |
| 2 | Select STORAGE warehouse, add products/qty | Lines saved |
| 3 | Submit as DRAFT | Appears on **Draft** tab |
| 4 | Submit for approval → **Pending** tab | Approver can open detail |
| 5 | Approve / Reject / Fulfill / Cancel | Each tab filters correctly |

**Status tabs:** All Requests · Draft · Pending · Approved · Rejected · Fulfilled · Cancelled

### 7.2 Material transfers

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/dashboard/factory/material-transfers` → **Create Transfer** | Form opens |
| 2 | From warehouse → To warehouse, add items | Transfer saved |
| 3 | Progress through Pending → Approved → In Transit → Received | Each tab shows correct rows |
| 4 | Cancel a draft/pending transfer | Appears on **Cancelled** tab |

**Status tabs:** All Transfers · Pending · Approved · In Transit · Received · Cancelled

### 7.3 GRN (receiving) — recap

| Tab | Status |
|-----|--------|
| Pending | Awaiting receipt |
| Inspecting | QC in progress |
| Approved | Passed inspection |
| Completed | Stock posted |
| Rejected | Failed inspection |

---

## 8. Phase 6 — Production loop

| Step | Module | Path | Action | Expected |
|------|--------|------|--------|----------|
| 6.1 | BOM | `/dashboard/bom/create` | Create recipe (DRAFT → ACTIVE) | Active BOM on product |
| 6.2 | Production order | `/dashboard/production-orders/create` | Plan qty against BOM | DRAFT order |
| 6.3 | Start production | PO detail → Start | Status IN_PROGRESS | Materials allocated |
| 6.4 | Complete production | PO detail → Complete | Status COMPLETED | Product batches created |
| 6.5 | Product batches | `/dashboard/product-batches` | Filter Active / Partial / Consumed | Lifecycle tabs work |
| 6.6 | Work orders | `/dashboard/work-orders` | Optional — schedule/complete | Status tabs work |

---

## 9. Phase 7 — Distribution sales loop

This is the **core business flow**. Roles hand off to each other.

```
Customer (shop) → Order → Delivery → Ledger → Return / Recovery → Adjustments
```

### 9.1 Shop order — Sales Employee

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/dashboard/sales/customer-orders` → Create | Order saved with lines + prices |
| 2 | Open order detail | Status, customer, amounts correct |
| 3 | Sales Manager login | Can view same order |

**Blocker if fails:** Missing sales person assignment, customer not in assigned area, or no branch pricing.

### 9.2 Delivery — Sales Employee

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/dashboard/sales/customer-deliveries` | Delivery linked to order |
| 2 | Mark delivered (full or partial qty) | Status updated; ledger will reflect on post |

### 9.3 Customer ledger — Sales Employee / Manager

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/dashboard/sales/customer-ledger` | Running balance after delivery |
| 2 | Export CSV | File downloads |

### 9.4 Return — Sales Employee → Sales Manager

| Step | Role | Action | Expected |
|------|------|--------|----------|
| 1 | Employee | Create return `/dashboard/sales/customer-returns` | Pending approval |
| 2 | Manager | Approve or reject | Ledger updated on approve |

### 9.5 Recovery — Sales Employee

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/dashboard/sales/customer-recovery` → Create | Cash recovery recorded |

### 9.6 Credit / debit notes — Sales Manager

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/dashboard/sales/customer-adjustments` | ADJUSTMENT ledger entry posted |

### 9.7 Product adjustments — Sales Manager

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/dashboard/sales/product-adjustments` | Audit record only — **no stock/order side effect** |

### 9.8 Employee cash — Employee vs Manager

| Step | Role | Expected |
|------|------|----------|
| 1 | Sales Employee | Own ledger at `/dashboard/sales/employee-cash` |
| 2 | Sales Manager | Can view all staff (view-all permission) |
| 3 | Transfer request | Create → respond flow works between two employees |

---

## 10. Phase 8 — Branch stock (multi-role)

**Requires two different logins** — self-approval is blocked.

### Flow diagram

```
Sales Manager/Employee          Factory Stock Manager
        │                                │
        ├─ Create branch stock request ──┤
        ├─ Branch approve (Manager)      │
        │                                ├─ Factory approve
        ├─ Ship transfer                 │
        ├─ Confirm receipt (Manager)     │
        └─ Branch ledger updated         └─ Factory stock updated
```

### Test steps

| Step | Browser | Role | Action |
|------|---------|------|--------|
| 1 | A | Sales Manager | Create request `/dashboard/sales/branch-stock-requests` |
| 2 | A | Sales Manager | Approve at branch level |
| 3 | B | Factory Stock Manager | Approve factory-bound request |
| 4 | A | Sales Manager | Ship transfer `/dashboard/sales/branch-stock-transfers` |
| 5 | A | Sales Manager | Confirm receipt on transfer detail |
| 6 | A | Sales Manager | Check `/dashboard/sales/branch-ledger` |
| 7 | B | Factory Stock Manager | Check `/dashboard/sales/factory-stock` |

### Branch stock return (optional)

Same two-user pattern: employee/manager creates return → manager approves branch → factory manager approves factory side.

---

## 11. Phase 9 — HR module (HR Manager)

Log in as **HR Manager** only.

| Module | Path | Test |
|--------|------|------|
| Employees | `/dashboard/hr/employees` | List, open record |
| Departments | `/dashboard/hr/departments` | CRUD |
| Attendance | `/dashboard/hr/attendance` | List loads |
| Leave | `/dashboard/hr/leave` | List loads |
| Payroll | `/dashboard/hr/payroll` | List loads |

HR Manager should **not** see Sales or Factory stock menus.

---

## 12. Phase 10 — Financial & reporting smoke test

Log in as **Admin**.

| Module | Path | Minimum test |
|--------|------|--------------|
| Financial dashboard | `/dashboard/financial` | Loads |
| Chart of accounts | `/dashboard/financial/coa` | List + create |
| Journal entries | `/dashboard/financial/journal` | List + create |
| Factory reports | `/dashboard/factory/reports` | Dashboard loads |
| Costing | `/dashboard/factory/costing` | Dashboard loads |
| Profit overview | `/dashboard/profit` | Loads |
| Audit logs | `/dashboard/audit` | Recent actions visible |

---

## 13. Phase 11 — Master-data modules (E1–E4)

### Hierarchy (non-breaking — orders unaffected)

```
Product Bonus Group (E1) → products in group
        ↓
Product Bonus Scheme (E4) → buy X / get Y, date range
```

| Step | Role | Action | Expected |
|------|------|--------|----------|
| 1 | Sales Manager | Create bonus group with 2+ products | Saved |
| 2 | Sales Manager | Create scheme on group | Listed with buy/get qty |
| 3 | Sales Manager | Try delete group while scheme exists | **Blocked** with clear error |
| 4 | Sales Manager | Delete scheme, then group | Both removed |
| 5 | Sales Employee | Open `/dashboard/sales/product-bonus-schemes` | **Access denied** |
| 6 | Sales Manager | CRUD transporter | Saved; legacy material transfers unchanged |

---

## 14. Known blockers & how to avoid them

| Symptom | Cause | Fix |
|---------|-------|-----|
| `TypeError: … reading 'call'` | Stale Next.js cache | §1 — delete `.next`, restart dev |
| Empty sidebar | No permissions / still loading | Assign `dashboard.view` + role permissions; re-login |
| 403 on sales person assign | User is not branch **distributor** | Set distributor on branch (§3.4) |
| Cannot create shop order | No sales person assignment | Assign employee to branch (§3.5) |
| Cannot create shop order | Customer not in branch area | Assign customer to correct area |
| Order prices missing | No price list / branch price | Configure pricing (§4 steps 2.7–2.8) |
| Factory approve fails | Same user created request | Use **two browsers**, two logins |
| New module missing in menu | Permissions not seeded | `npm run seed:permissions` + re-login |
| API 403 but menu visible | Page guard mismatch | Report to dev — should not happen |
| Credit/debit notes 500 | Table `customer_ledger_adjustments` missing | `TENANT_SHORT_ID=3991 npm run tenant:schema-sync` |
| Product adjustments 500 | Table `product_adjustments` missing | Same schema sync |
| Warehouse stock all zero | No `warehouse_stock_balances` rows | `npm run seed:demo-workflows` or receive stock via GRN |
| Bonus group delete fails | Schemes still reference group | Delete schemes first (by design) |

| User create in Settings | No standalone POST /users | Create via **HR → Employees** (§3.3) |

---

## 15. Sign-off checklist

### Environment
- [ ] Migrations deployed
- [ ] `seed:permissions` + `seed:default-roles` run
- [ ] Backend + frontend running without console errors

### Users & roles
- [ ] Admin, Sales Manager, Sales Employee, Factory Stock Manager, HR Manager created
- [ ] Sales Manager linked as branch distributor
- [ ] Sales Employee assigned as sales person on branch
- [ ] Each user re-logged in after role assignment

### Factory & material management
- [ ] PO → GRN → warehouse stock updated
- [ ] Material request status tabs (Draft → Pending → Approved)
- [ ] Material transfer status tabs (Pending → Received)
- [ ] Production order → product batch created

### Distribution sales (happy path)
- [ ] Order → delivery → ledger
- [ ] Return approved by manager
- [ ] Recovery recorded
- [ ] Credit/debit note posted (manager)

### Branch stock (two-user)
- [ ] Request → branch approve → factory approve → ship → confirm receipt

### Permissions
- [ ] Sales Employee cannot access bonus schemes / territory / settings
- [ ] Factory manager cannot access shop orders
- [ ] HR manager cannot access sales modules

### Master data (E1–E4)
- [ ] Bonus group + scheme CRUD
- [ ] Group delete blocked when schemes exist
- [ ] Transporters CRUD

### Regression
- [ ] Legacy POS / sales routes still load (no breaking change)
- [ ] Product adjustments do not alter stock/orders

- [ ] Product adjustments do not alter stock/orders

---

## 16. Appendix — Module index (every sidebar item)

Quick reference for “did we test this module?”

| Sidebar section | Module | List URL | Key test |
|-----------------|--------|----------|----------|
| Overview | Dashboard | `/dashboard` | Loads KPIs |
| Master Data | Products | `/dashboard/products` | CRUD + stock column |
| Master Data | Raw Materials | `/dashboard/raw-materials` | CRUD + batches |
| Master Data | Locations / Sites | `/dashboard/locations`, `/dashboard/sites` | CRUD |
| Master Data | Suppliers | `/dashboard/suppliers` | CRUD + ledger |
| Warehouse Mgmt | Warehouses | `/dashboard/factory/warehouses` | CRUD + zones |
| Warehouse Mgmt | Warehouse Stock | `/dashboard/warehouse-stock` | Balances per warehouse |
| Purchases | Purchase Orders | `/dashboard/purchases` | Status tabs + receive |
| Purchases | Purchase Returns | `/dashboard/purchases/returns/list` | Approve return |
| Material Mgmt | GRN | `/dashboard/factory/receiving` | Status tabs |
| Material Mgmt | Material Requests | `/dashboard/factory/material-requests` | Status tabs + approve |
| Material Mgmt | Material Transfers | `/dashboard/factory/material-transfers` | Status tabs + receive |
| Production | Production Orders | `/dashboard/production-orders` | Status tabs |
| Production | BOM | `/dashboard/bom` | Draft / Active tabs |
| Production | Product Batches | `/dashboard/product-batches` | Lifecycle tabs |
| Production | Work Orders | `/dashboard/work-orders` | Status tabs |
| Production | Plants | `/dashboard/plants` | CRUD |
| Quality | Inspections | `/dashboard/quality-control/inspections` | Status tabs |
| Quality | Waste | `/dashboard/waste-management` | Record waste |
| Sales | Shop Orders | `/dashboard/sales/customer-orders` | Book → deliver |
| Sales | Deliveries | `/dashboard/sales/customer-deliveries` | Status tabs |
| Sales | Returns / Recovery | `/dashboard/sales/customer-returns`, `customer-recovery` | Approve flows |
| Sales | Credit/Debit Notes | `/dashboard/sales/customer-adjustments` | Type tabs |
| Sales | Product Adjustments | `/dashboard/sales/product-adjustments` | Type tabs |
| Sales | Branch Stock Requests | `/dashboard/sales/branch-stock-requests` | Two-user approve |
| Sales | Branch Stock Transfers | `/dashboard/sales/branch-stock-transfers` | Ship → receive |
| Sales | Factory Stock | `/dashboard/sales/factory-stock` | View balances |
| Sales | Territory | `/dashboard/sales/territory` | Region → area hierarchy |
| HR | Employees / Payroll / Leave | `/dashboard/hr/*` | CRUD per submodule |
| Financial | COA / Journal / Reports | `/dashboard/financial/*` | Smoke test |
| System | Users / Roles / Audit | `/dashboard/users`, `settings/roles-permissions`, `audit` | Admin only |

---

*Last updated: September 2026 — aligns with sidebar reorder, material status tabs, and demo seed scripts.*

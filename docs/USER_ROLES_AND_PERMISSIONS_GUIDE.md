# User Roles & Permissions Guide

This guide explains how access control works in Scalable ERP, which roles are intended for which users, and how administrators assign permissions.

---

## 1. How access control works

### Backend (API)

Every protected API route uses:

1. **JWT authentication** — user must be logged in.
2. **Permission guard** — user’s role must include the permission string required by the route (e.g. `customer-order.create`).

If the user lacks permission, the API returns **403 Forbidden**.

### Frontend (sidebar & pages)

1. **Sidebar** — each menu link is mapped to a permission in `frontend/lib/nav-permissions.ts`. Users only see modules they can access. Unmapped routes are **hidden by default** (secure by default).
2. **Pages** — sensitive screens wrap content in `<ProtectedRoute requiredPermission="...">` so direct URL access is also blocked.

Permissions are loaded at **login** and stored in the auth context. After changing a user’s role, they must **log out and log back in** to refresh the sidebar.

---

## 2. Standard roles (recommended)

Run these after deploying new permissions:

```bash
cd backend
npm run seed:permissions      # creates missing permissions + syncs Admin role
npm run seed:default-roles     # creates/updates template roles below
```

| Role | Typical user | What they see / do |
|------|----------------|-------------------|
| **Admin** | IT / company admin | Full system access (all permissions). Manages users, roles, master data. |
| **Super Admin** | Platform owner (tenant provisioning) | Same as Admin on tenant DB; used in demo bootstrap. |
| **Sales Employee** | Field sales person / order booker | Shop orders, deliveries, returns, recoveries, own employee cash, branch stock view. **No** territory setup, approvals, or master-data admin. |
| **Sales Manager** | Branch distributor / sales lead | Everything Sales Employee has, plus: territory assignments, branch stock requests/returns approvals, credit/debit notes, product adjustments, price lists, employee cash (all staff). |
| **Factory Stock Manager** | Factory warehouse lead | Factory stock, approve factory-bound branch stock requests, GRN/warehouse read access. **No** shop order screens. |
| **HR Manager** | HR department | Employees, attendance, shifts, leave, loans, payroll, recruitment. **No** sales or factory modules. |

These templates are defined in `backend/scripts/seed-default-roles.ts`. You can adjust permission lists there and re-run `npm run seed:default-roles`.

---

## 3. Assigning roles to users

1. Log in as **Admin**.
2. Go to **Settings → Roles & Permissions**.
3. Open a role (or create a custom role) and tick the permissions that role should have.
4. Go to **Users** and assign the role to each user.
5. Ask the user to **log out and log in again**.

### Custom roles

You can create roles such as “Procurement Officer” or “Finance Viewer” by selecting only the relevant permission groups:

- **Procurement:** `purchases.read`, `suppliers.read`, `grn.read`, …
- **Finance:** `finance.view`, `finance.view_reports`, …
- **Factory production:** `production-orders.read`, `bom.read`, `plants.read`, …

Use the permission **module** column in the roles UI to find related permissions quickly.

---

## 4. Distribution sales permission map (quick reference)

| Module | View permission | Manage / create permission |
|--------|-----------------|----------------------------|
| Territory (regions, branches) | `sales-region.view` | via branch/zone/city modules |
| Sales person assignments | `sales-person-assignment.view` | `sales-person-assignment.manage` |
| Customer categories | `customer-category.view` | `customer-category.manage` |
| Customers (shops) | `customers.read` | `customers.create` |
| Shop orders | `customer-order.view` | `customer-order.create` |
| Shop deliveries | `customer-delivery.view` | `customer-delivery.deliver` |
| Shop returns | `customer-return.view` | `customer-return.create` / `.approve` |
| Shop recovery | `customer-recovery.view` | `customer-recovery.create` |
| Shop ledger | `customer-ledger.view` | — |
| Credit/debit notes | `customer-ledger-adjustment.view` | `customer-ledger-adjustment.create` |
| Product adjustments | `product-adjustment.view` | `product-adjustment.create` |
| Branch stock | `branch-stock.view` | requests/transfers/returns permissions |
| Factory stock | `factory-stock.view` | `factory-stock.manage` |
| Employee cash | `employee-cash-ledger.view` (own) | `employee-cash-ledger.view-all` (managers) |
| Product bonus groups | `product-bonus-group.view` | `product-bonus-group.manage` |
| Product bonus schemes | `product-bonus-scheme.view` | `product-bonus-scheme.manage` |
| Transporters | `transporter.view` | `transporter.manage` |

---

## 5. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| User sees empty sidebar | Role has no permissions, or permissions still loading | Assign `dashboard.view` + module permissions; refresh login |
| User sees modules they shouldn’t | Old session before role change | Log out / log in |
| API 403 but menu visible | Page missing `ProtectedRoute` | Report to dev — menu map and page guard should match |
| New module not in sidebar | Permission not seeded or not assigned to role | `npm run seed:permissions`, assign to role, re-login |
| Admin missing new feature | Admin role not synced | `npm run seed:permissions` (re-syncs Admin with all permissions) |

---

## 6. Production checklist

After each release that adds permissions or modules:

1. `npx prisma migrate deploy --schema=prisma/tenant/schema.prisma`
2. `npx prisma generate --schema=prisma/tenant/schema.prisma`
3. `npm run seed:permissions`
4. `npm run seed:default-roles` (optional — refreshes template roles)
5. Restart backend
6. UAT with **Sales Employee**, **Sales Manager**, and **Factory Stock Manager** test users — confirm each sees only expected sidebar sections

See **[ROLE_BASED_UAT_GUIDE.md](./ROLE_BASED_UAT_GUIDE.md)** for step-by-step user creation and test scripts per role.

---

## 7. Demo users (tenant 3991 bootstrap)

If you run `npx ts-node scripts/ensure-tenant-3991-demo-ready.ts`:

| User | Role | Purpose |
|------|------|---------|
| Admin email (see script) | Super Admin | Full access |
| `factory.manager@malindtech.com` | Factory Stock Manager | Approve factory branch stock requests (must differ from requester) |

Always use **separate logins** for requester vs approver in branch stock UAT — self-approval is blocked by design.

---

*For module implementation status, see `docs/PROJECT_OVERVIEW_AND_ROADMAP.md` (local-only if gitignored).*

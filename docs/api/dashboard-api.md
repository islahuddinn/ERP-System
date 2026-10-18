# Dashboard Module — Frontend API Reference

> **Status**: New chart-stats endpoints added alongside two legacy endpoints.
> **Base URL**: All paths relative to the API root (`/dashboard/...`).
> **Auth**: Bearer JWT required on all endpoints (`@UseGuards(JwtAuthGuard)`). No extra permission key is required — any authenticated user of the tenant can call these.
> **Audit**: None of these routes are audited (`@Auditable` is not used) — they are read-only stats.

---

## What Changed (Frontend Action Required)

| Area | Change | Frontend Impact |
|---|---|---|
| **8 new endpoints** | `products/stats`, `raw-materials/stats`, `purchase-orders/stats`, `production-orders/stats`, `bom/stats`, `grn/stats`, `suppliers/spend-stats`, `customers/stats` | Build new chart widgets per domain (see [Endpoints](#endpoints) below) |
| **`GET /dashboard/factory`** | Query param is **`siteId`**, not `plantId` | `hooks/useDashboard.ts` currently calls `useFactoryDashboard(plantId?: string)` and sends `{ plantId }` as the query param — **this is a bug**. The backend never reads it, so the filter silently does nothing. Rename the param to `siteId` when wiring this up. |
| **`GET /dashboard`** and **`GET /dashboard/factory`** | Marked `OLD` in the backend source (still functional, not deprecated/removed) | Safe to keep using, but prefer the new per-domain `*/stats` endpoints for anything new — they're cheaper (no full-tenant metric rollup) and map 1:1 to a single chart each |

---

## Table of Contents

1. [How These Endpoints Are Meant to Be Used](#how-these-endpoints-are-meant-to-be-used)
2. [Endpoints — New (per-domain stats)](#endpoints--new-per-domain-stats)
3. [Endpoints — Old (aggregate metrics)](#endpoints--old-aggregate-metrics)
4. [Error Responses](#error-responses)
5. [Frontend Implementation Guide](#frontend-implementation-guide)

---

## How These Endpoints Are Meant to Be Used

Each new `*/stats` endpoint returns a small, purpose-built payload for **one dashboard card or chart** — not a general-purpose entity list. There's no pagination, no filtering, no sorting on any of them (except `factory`'s `siteId`). Call them independently; they don't depend on each other and can all be fetched in parallel when a dashboard page mounts.

None of them accept a request body. All are `GET`, all return `200 OK` with a plain JSON object (or array, for `suppliers/spend-stats`).

---

## Endpoints — New (per-domain stats)

### 1. Product Dashboard Stats

```
GET /dashboard/products/stats
```

#### Response `200 OK`

```json
{
  "totalActiveProducts": 128,
  "totalStockValue": 452300.50,
  "lowStockCount": 7,
  "outOfStockCount": 2
}
```

| Field | Type | Meaning |
|---|---|---|
| `totalActiveProducts` | `number` | Count of products where `isActive = true` and not soft-deleted |
| `totalStockValue` | `number` | `Σ (currentStock × costPrice)` across active products |
| `lowStockCount` | `number` | Active products where `0 < currentStock ≤ minStock` |
| `outOfStockCount` | `number` | Active products where `currentStock ≤ 0` |

**Suggested chart**: 4 stat tiles, or a single donut of `lowStockCount` / `outOfStockCount` / (rest healthy).

---

### 2. Raw Material Dashboard Stats

```
GET /dashboard/raw-materials/stats
```

#### Response `200 OK`

```json
{
  "totalRawMaterials": 64,
  "totalStockValue": 118250.00,
  "lowStockCount": 5,
  "outOfStockCount": 1,
  "expiringBatchesCount": 3
}
```

| Field | Type | Meaning |
|---|---|---|
| `totalRawMaterials` | `number` | Total raw material count (all, not filtered by active status) |
| `totalStockValue` | `number` | `Σ (currentStock × lastPurchasePrice)` across all raw materials |
| `lowStockCount` | `number` | Raw materials where `0 < currentStock ≤ reorderLevel` |
| `outOfStockCount` | `number` | Raw materials where `currentStock ≤ 0` |
| `expiringBatchesCount` | `number` | **Batches** (not raw materials) with `status = ACTIVE`, `availableQuantity > 0`, and `expiryDate` within the next **30 days** from now |

> `expiringBatchesCount` counts `RawMaterialBatch` rows, so one raw material with 3 expiring batches contributes 3 to this count — it's a batch alert count, not a distinct-material count.

**Suggested chart**: 5 stat tiles, with `expiringBatchesCount` styled as a warning badge (amber/red) since it needs action.

---

### 3. Purchase Order & Supplier Dashboard Stats

```
GET /dashboard/purchase-orders/stats
```

Combines two internal stat sets (purchase order + supplier) into one flat object.

#### Response `200 OK`

```json
{
  "totalPurchaseOrders": 340,
  "draftPurchaseOrders": 12,
  "confirmedPurchaseOrders": 45,
  "partialPurchaseOrders": 8,
  "receivedPurchaseOrders": 260,
  "cancelledPurchaseOrders": 15,
  "pendingApprovalCount": 6,
  "totalPurchaseValue": 1875400.00,
  "totalOutstandingAmount": 92500.00,
  "totalSuppliers": 40,
  "activeSuppliers": 36,
  "inactiveSuppliers": 4
}
```

| Field | Type | Meaning |
|---|---|---|
| `totalPurchaseOrders` | `number` | Count of all purchase orders (every status) |
| `draftPurchaseOrders` / `confirmedPurchaseOrders` / `partialPurchaseOrders` / `receivedPurchaseOrders` / `cancelledPurchaseOrders` | `number` | Count per `PurchaseStatus` |
| `pendingApprovalCount` | `number` | Count of `PurchaseOrderApproval` rows with `status = PENDING` (approval workflow, not PO status) |
| `totalPurchaseValue` | `number` | `Σ totalAmount` across **all** purchase orders, any status |
| `totalOutstandingAmount` | `number` | `Σ totalAmount − Σ amountPaid`, computed **only** over POs with `paymentStatus IN (PENDING, PARTIAL)` |
| `totalSuppliers` | `number` | All non-deleted suppliers |
| `activeSuppliers` / `inactiveSuppliers` | `number` | Split by `isActive` |

**Suggested chart**: status breakdown donut (`draft`/`confirmed`/`partial`/`received`/`cancelled`) + 2 stat tiles for `totalPurchaseValue` and `totalOutstandingAmount` + a small supplier active/inactive donut.

---

### 4. Production Order Dashboard Stats

```
GET /dashboard/production-orders/stats
```

#### Response `200 OK`

```json
{
  "totalProductionOrders": 210,
  "draftProductionOrders": 10,
  "inProgressProductionOrders": 22,
  "completedProductionOrders": 170,
  "cancelledProductionOrders": 8,
  "totalProductionCost": 356200.00,
  "totalWasteCost": 4300.00
}
```

| Field | Type | Meaning |
|---|---|---|
| `totalProductionOrders` | `number` | All non-deleted production orders, any status |
| `draftProductionOrders` / `inProgressProductionOrders` / `completedProductionOrders` / `cancelledProductionOrders` | `number` | Count per `ProductionOrderStatus` |
| `totalProductionCost` | `number` | `Σ totalCost`, but **only** over orders with `status = COMPLETED` — in-progress/draft cost is not included |
| `totalWasteCost` | `number` | `Σ totalCost` across **all** `ProductionOrderWaste` rows (not filtered by order status) |

**Suggested chart**: status breakdown donut + 2 stat tiles (`totalProductionCost`, `totalWasteCost`).

---

### 5. BOM Dashboard Stats

```
GET /dashboard/bom/stats
```

#### Response `200 OK`

```json
{
  "totalBoms": 58,
  "draftBoms": 6,
  "activeBoms": 48,
  "inactiveBoms": 4
}
```

| Field | Type | Meaning |
|---|---|---|
| `totalBoms` | `number` | All non-deleted BOMs |
| `draftBoms` / `activeBoms` / `inactiveBoms` | `number` | Count per `BOMStatus` |

**Suggested chart**: single status donut.

---

### 6. GRN Dashboard Stats

```
GET /dashboard/grn/stats
```

#### Response `200 OK`

```json
{
  "totalGrns": 190,
  "pendingGrns": 5,
  "inspectingGrns": 3,
  "approvedGrns": 8,
  "rejectedGrns": 2,
  "completedGrns": 172,
  "totalReceivedQuantity": 45200,
  "totalRejectedQuantity": 380
}
```

| Field | Type | Meaning |
|---|---|---|
| `totalGrns` | `number` | Count of all GRNs, any status (no soft-delete filter — GRN has no `deletedAt`) |
| `pendingGrns` / `inspectingGrns` / `approvedGrns` / `rejectedGrns` / `completedGrns` | `number` | Count per `ReceivingStatus` |
| `totalReceivedQuantity` | `number` | `Σ receivedQuantity` across **every** `GRNItem` row, across all GRNs regardless of status |
| `totalRejectedQuantity` | `number` | `Σ rejectedQuantity` across every `GRNItem` row |

**Suggested chart**: status breakdown donut + a received-vs-rejected quantity bar (quality ratio).

---

### 7. Top Suppliers by Spend

```
GET /dashboard/suppliers/spend-stats
```

Returns an **array**, not an object — top 5 suppliers by total debit across `SupplierTransaction`. The limit of 5 is fixed on the backend; there is no query param to change it.

#### Response `200 OK`

```json
[
  { "supplierId": "sup-uuid-1", "supplierName": "Acme Chemicals", "totalSpend": 245000.00 },
  { "supplierId": "sup-uuid-2", "supplierName": "Prime Packaging", "totalSpend": 198500.00 },
  { "supplierId": "sup-uuid-3", "supplierName": "Delta Traders", "totalSpend": 152300.00 }
]
```

| Field | Type | Meaning |
|---|---|---|
| `supplierId` | `uuid` | |
| `supplierName` | `string` | `"Unknown"` if the supplier record was deleted after the transaction was recorded |
| `totalSpend` | `number` | `Σ debit` on that supplier's transactions, all-time (no date filter) |

**Suggested chart**: horizontal top-N bar chart, sorted descending (already sorted by the API).

---

### 8. Customer Dashboard Stats

```
GET /dashboard/customers/stats
```

#### Response `200 OK`

```json
{
  "totalCustomers": 85,
  "activeCustomers": 78,
  "inactiveCustomers": 7,
  "topCustomersByBalance": [
    { "customerId": "cust-uuid-1", "customerName": "Zenith Retail", "balance": 42500.00 },
    { "customerId": "cust-uuid-2", "customerName": "Blue Horizon Traders", "balance": 31200.00 }
  ]
}
```

| Field | Type | Meaning |
|---|---|---|
| `totalCustomers` / `activeCustomers` / `inactiveCustomers` | `number` | Non-deleted customers split by `isActive` |
| `topCustomersByBalance` | `TopCustomerByBalance[]` | Top 5 customers by `balance` descending, fixed limit, no query param |

> `balance` can be negative in some ledger conventions (credit balance) — don't assume it's always ≥ 0 when formatting.

**Suggested chart**: active/inactive donut + top-N bar chart for `topCustomersByBalance`.

---

## Endpoints — Old (aggregate metrics)

These two predate the per-domain stats above. Still live and cached — keep using them where already wired up, but new dashboard work should prefer the endpoints above.

### 9. Overall Dashboard Metrics

```
GET /dashboard
```

Server-side cached for **5 minutes** per tenant (`CacheService`, key `dashboard:<tenantId>`). If the underlying queries throw, the backend swallows the error and returns a zeroed-out default object instead of a 500 — so a payload of all zeros can mean "no data" **or** "an internal query failed silently." There's no error signal to distinguish the two from the frontend.

#### Response `200 OK`

```json
{
  "totalRevenue": 512300.00,
  "totalCost": 388100.00,
  "netProfit": 124200.00,
  "profitMargin": 24.24,
  "totalProducts": 128,
  "totalStockQuantity": 9400,
  "totalStockValue": 452300.50,
  "pendingPurchases": 12,
  "completedPurchases": 260,
  "totalSuppliers": 40,
  "lowStockAlerts": 7
}
```

| Field | Type | Meaning |
|---|---|---|
| `totalRevenue` | `number` | From sales |
| `totalCost` | `number` | `purchaseCost + productionCost + wasteCost` |
| `netProfit` | `number` | `totalRevenue − totalCost` |
| `profitMargin` | `number` | Percentage; `0` when `totalRevenue = 0` (avoids divide-by-zero, not a real 0% margin) |
| `totalProducts` | `number` | Active product count |
| `totalStockQuantity` | `number` | |
| `totalStockValue` | `number` | Computed from stock valuation ledger × `sellingPrice` — **note**: this uses `sellingPrice`, not `costPrice` like the new `products/stats` endpoint does. The two `totalStockValue` figures will not match — don't display both on the same screen without labeling which basis each uses. |
| `pendingPurchases` / `completedPurchases` | `number` | |
| `totalSuppliers` | `number` | Active suppliers only |
| `lowStockAlerts` | `number` | Products where `0 < totalStock ≤ minStock`, `totalStock` summed from `stockBalances` (a different source than `currentStock` used elsewhere) |

### 10. Factory Dashboard Metrics

```
GET /dashboard/factory
```

#### Query Parameters

| Param | Type | Required | Notes |
|---|---|---|---|
| `siteId` | `uuid` | No | Filters production order and quality inspection counts to one site. **Not cached.** |

> See [What Changed](#what-changed-frontend-action-required) — the existing `useFactoryDashboard` hook sends `plantId`, which the backend ignores. Fix the param name to `siteId` to make the filter actually work.

#### Response `200 OK`

```json
{
  "totalProductionOrders": 210,
  "inProgressOrders": 22,
  "completedOrders": 170,
  "totalProductionQuantity": 58400,
  "totalWaste": 1200,
  "totalQualityInspections": 95,
  "passedInspections": 88,
  "failedInspections": 7,
  "qualityPassRate": 92.63
}
```

| Field | Type | Meaning |
|---|---|---|
| `totalProductionOrders` / `inProgressOrders` / `completedOrders` | `number` | Filtered by `siteId` if provided |
| `totalProductionQuantity` | `number` | Produced quantity, filtered by `siteId` if provided |
| `totalWaste` | `number` | **Not** filtered by `siteId` — always tenant-wide, even when `siteId` is passed. Don't expect this number to change when switching sites. |
| `totalQualityInspections` / `passedInspections` / `failedInspections` | `number` | Filtered by `siteId` if provided |
| `qualityPassRate` | `number` | Percentage; `0` when `totalQualityInspections = 0` |

---

## Error Responses

All endpoints require a valid Bearer token:

```json
{ "statusCode": 401, "message": "Unauthorized" }
```

None of these routes throw domain-specific 4xx errors (no body, no path params to validate other than `factory`'s optional `siteId`, which is a plain query string — an invalid UUID there is just ignored by Prisma's filter rather than rejected, since it isn't run through `ParseUUIDPipe`).

---

## Frontend Implementation Guide

### Fetching pattern

The codebase already uses `@tanstack/react-query` + the shared `apiClient` (see `hooks/useDashboard.ts`, `lib/api-client.ts`) — the token and tenant headers are attached automatically by the axios interceptor. Follow the same pattern for the new endpoints; a good place for these is a new `hooks/useDashboardStats.ts`.

```ts
// hooks/useDashboardStats.ts
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface ProductDashboardStats {
  totalActiveProducts: number
  totalStockValue: number
  lowStockCount: number
  outOfStockCount: number
}

export function useProductDashboardStats() {
  return useQuery<ProductDashboardStats>({
    queryKey: ['dashboard', 'products', 'stats'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/products/stats')
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — these are stats, not live data
  })
}
```

```ts
export interface RawMaterialDashboardStats {
  totalRawMaterials: number
  totalStockValue: number
  lowStockCount: number
  outOfStockCount: number
  expiringBatchesCount: number
}

export function useRawMaterialDashboardStats() {
  return useQuery<RawMaterialDashboardStats>({
    queryKey: ['dashboard', 'raw-materials', 'stats'],
    queryFn: async () => (await apiClient.get('/dashboard/raw-materials/stats')).data,
    staleTime: 5 * 60 * 1000,
  })
}
```

```ts
export interface PurchaseDashboardStats {
  totalPurchaseOrders: number
  draftPurchaseOrders: number
  confirmedPurchaseOrders: number
  partialPurchaseOrders: number
  receivedPurchaseOrders: number
  cancelledPurchaseOrders: number
  pendingApprovalCount: number
  totalPurchaseValue: number
  totalOutstandingAmount: number
  totalSuppliers: number
  activeSuppliers: number
  inactiveSuppliers: number
}

export function usePurchaseOrderDashboardStats() {
  return useQuery<PurchaseDashboardStats>({
    queryKey: ['dashboard', 'purchase-orders', 'stats'],
    queryFn: async () => (await apiClient.get('/dashboard/purchase-orders/stats')).data,
    staleTime: 5 * 60 * 1000,
  })
}
```

```ts
export interface ProductionOrderDashboardStats {
  totalProductionOrders: number
  draftProductionOrders: number
  inProgressProductionOrders: number
  completedProductionOrders: number
  cancelledProductionOrders: number
  totalProductionCost: number
  totalWasteCost: number
}

export function useProductionOrderDashboardStats() {
  return useQuery<ProductionOrderDashboardStats>({
    queryKey: ['dashboard', 'production-orders', 'stats'],
    queryFn: async () => (await apiClient.get('/dashboard/production-orders/stats')).data,
    staleTime: 5 * 60 * 1000,
  })
}
```

```ts
export interface BomDashboardStats {
  totalBoms: number
  draftBoms: number
  activeBoms: number
  inactiveBoms: number
}

export function useBomDashboardStats() {
  return useQuery<BomDashboardStats>({
    queryKey: ['dashboard', 'bom', 'stats'],
    queryFn: async () => (await apiClient.get('/dashboard/bom/stats')).data,
    staleTime: 5 * 60 * 1000,
  })
}
```

```ts
export interface GrnDashboardStats {
  totalGrns: number
  pendingGrns: number
  inspectingGrns: number
  approvedGrns: number
  rejectedGrns: number
  completedGrns: number
  totalReceivedQuantity: number
  totalRejectedQuantity: number
}

export function useGrnDashboardStats() {
  return useQuery<GrnDashboardStats>({
    queryKey: ['dashboard', 'grn', 'stats'],
    queryFn: async () => (await apiClient.get('/dashboard/grn/stats')).data,
    staleTime: 5 * 60 * 1000,
  })
}
```

```ts
export interface TopSupplierBySpend {
  supplierId: string
  supplierName: string
  totalSpend: number
}

export function useTopSuppliersBySpend() {
  return useQuery<TopSupplierBySpend[]>({
    queryKey: ['dashboard', 'suppliers', 'spend-stats'],
    queryFn: async () => (await apiClient.get('/dashboard/suppliers/spend-stats')).data,
    staleTime: 5 * 60 * 1000,
  })
}
```

```ts
export interface TopCustomerByBalance {
  customerId: string
  customerName: string
  balance: number
}

export interface CustomerDashboardStats {
  totalCustomers: number
  activeCustomers: number
  inactiveCustomers: number
  topCustomersByBalance: TopCustomerByBalance[]
}

export function useCustomerDashboardStats() {
  return useQuery<CustomerDashboardStats>({
    queryKey: ['dashboard', 'customers', 'stats'],
    queryFn: async () => (await apiClient.get('/dashboard/customers/stats')).data,
    staleTime: 5 * 60 * 1000,
  })
}
```

**Fixing the factory hook** (`hooks/useDashboard.ts`) — rename the param to match the backend:

```ts
export function useFactoryDashboard(siteId?: string) {
  return useQuery<FactoryDashboardMetrics>({
    queryKey: ['dashboard', 'factory', siteId],
    queryFn: async () => {
      const params = siteId ? { siteId } : {}
      const response = await apiClient.get('/dashboard/factory', { params })
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })
}
```

### Charting with Recharts

The codebase already uses `recharts` for dashboard charts (see `app/dashboard/brokers/performance/page.tsx`, `app/dashboard/profit/monthly/page.tsx`). Two patterns cover every endpoint above:

**Status breakdown → donut chart** (GRN, BOM, purchase orders, production orders):

```tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useGrnDashboardStats } from '@/hooks/useDashboardStats'

const STATUS_COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#ef4444', '#22c55e']

function GrnStatusChart() {
  const { data, isLoading } = useGrnDashboardStats()
  if (isLoading || !data) return <ChartSkeleton />

  const chartData = [
    { name: 'Pending', value: data.pendingGrns },
    { name: 'Inspecting', value: data.inspectingGrns },
    { name: 'Approved', value: data.approvedGrns },
    { name: 'Rejected', value: data.rejectedGrns },
    { name: 'Completed', value: data.completedGrns },
  ]

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
          {chartData.map((_, index) => (
            <Cell key={index} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

**Top-N ranking → horizontal bar chart** (top suppliers, top customers):

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useTopSuppliersBySpend } from '@/hooks/useDashboardStats'

function TopSuppliersChart() {
  const { data, isLoading } = useTopSuppliersBySpend()
  if (isLoading || !data) return <ChartSkeleton />

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
        <XAxis type="number" />
        <YAxis type="category" dataKey="supplierName" width={100} />
        <Tooltip formatter={(value: number) => value.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} />
        <Bar dataKey="totalSpend" fill="#3b82f6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

**Simple counts → stat tiles** (products, raw materials): just render the numbers in `Card` components (as `app/dashboard/page.tsx` already does for the old `/dashboard` metrics) — no chart needed for single-value cards.

### Parallel fetching on a dashboard page

Since every endpoint is independent, fire them together rather than sequentially — React Query does this automatically as long as each `useQuery` call is unconditional:

```tsx
function ManufacturingDashboardPage() {
  const products = useProductDashboardStats()
  const rawMaterials = useRawMaterialDashboardStats()
  const bom = useBomDashboardStats()
  const productionOrders = useProductionOrderDashboardStats()
  const grn = useGrnDashboardStats()
  // Each fires its own request in parallel; React Query dedupes by queryKey automatically.
}
```

### Things to get right

- **Don't mix `totalStockValue` from `/dashboard` (sellingPrice basis) with `/dashboard/products/stats` (costPrice basis)** on the same screen without labeling — they measure different things and will never match.
- **`expiringBatchesCount`** on raw materials counts batches, not materials — a single material can contribute more than 1.
- **`totalWaste`** on `/dashboard/factory` ignores `siteId` even when passed — don't wire a site filter UI control to a chart using this field expecting it to update.
- All monetary/quantity fields are already `number` (not Prisma `Decimal` strings) on these dashboard endpoints — no `parseFloat()` needed, unlike some other modules (e.g. Products' `sellingPrice`).
- 5-minute `staleTime` is reasonable for all of these — they're stats, not something that needs to be live. Add a manual refresh button (`queryClient.invalidateQueries(['dashboard', ...])`) if the page needs a "refresh" action rather than lowering `staleTime`.

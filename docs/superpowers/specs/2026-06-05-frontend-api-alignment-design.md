# Frontend API Alignment — Design Spec

**Date:** 2026-06-05  
**Scope:** Align frontend with updated backend APIs across four modules.  
**Reference docs:** `docs/api/products-api.md`, `docs/api/raw-materials-api.md`, `docs/api/suppliers-api.md`, `docs/api/uom-api.md`

---

## Overview

The backend has been refactored. Four modules require frontend changes:

| Module | Work type | Effort |
|--------|-----------|--------|
| Products | Update existing hooks, types, and pages | Medium |
| Raw Materials | Build from scratch — new standalone module | Large |
| Suppliers | Fix interface + add opening balance UI | Small–Medium |
| UOMs | Fix broken response parsing, re-render list | Small |

**Architectural note — Raw Materials vs Products:**  
Previously raw materials were filtered products (same table, same hooks, same routes). Going forward they are a completely separate master resource (`/raw-materials`). The two domains sync at the workflow level only: BOM references raw materials as ingredients; production orders consume raw material batches; GRNs create raw material batches. Neither master holds a direct FK to the other.

---

## Module 1: Products

### What changed on the backend

| Area | Old | New |
|------|-----|-----|
| Product code field | `sku` | `code` |
| Cost field | `costPrice` | **Removed** |
| Category field | `categoryId` | **Removed** (`20260525_remove_category_from_products` migration) |
| Type field | — | `type`: `FINISHED_GOOD \| SEMI_FINISHED \| CONSUMABLE \| SERVICE` |
| Barcode | — | `barcode` (optional, globally unique) |
| Stock thresholds | — | `minStock`, `maxStock` |
| Images | — | `images: string[]` |
| Attributes | — | `attributes: { name, value, unit? }[]` — **full replace on update** |
| `sellingPrice` type | `number` | Prisma Decimal → returned as **string** in JSON |
| List filter: status | `status: 'active'\|'inactive'` | `isActive: boolean` |
| List filter: category | `category: string` | `type: ProductType` enum |
| Pagination meta | `{ total, page, limit, totalPages }` | adds `hasNext` and `hasPrev` |
| Dropdown | id + name only | also includes `type`, `currentStock`, `sellingPrice`, `uom` |

### Changes required

#### `types/common.ts` — `Product` interface
Replace entirely:
```typescript
interface Product {
  id: string
  name: string
  code: string
  barcode?: string
  description?: string
  type: 'FINISHED_GOOD' | 'SEMI_FINISHED' | 'CONSUMABLE' | 'SERVICE'
  uomId: string
  uom?: { id: string; name: string; symbol: string }
  currentStock: number
  minStock: number
  maxStock?: number
  reorderLevel: number
  sellingPrice?: string        // Decimal — parse with parseFloat() before arithmetic
  images: string[]
  isActive: boolean
  deletedAt?: string
  createdById?: string
  updatedById?: string
  createdAt: string
  updatedAt: string
  attributes?: { id: string; name: string; value: string; unit?: string }[]
}
```

Also update `PaginationMeta` to add `hasNext: boolean` and `hasPrev: boolean`.

#### `hooks/useProducts.ts` — `ProductFilters`
```typescript
interface ProductFilters {
  search?: string
  type?: 'FINISHED_GOOD' | 'SEMI_FINISHED' | 'CONSUMABLE' | 'SERVICE'
  isActive?: boolean
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}
```
Remove `category` and `status` params. Map `isActive` as a boolean query param.

#### `hooks/useProducts.ts` — mutations
- `useCreateProduct`: remove `sku`, `categoryId`, `costPrice`, `supplierId`/`supplierName`; add `code`, `type`, `barcode`, `minStock`, `maxStock`, `images`, `attributes`
- `useUpdateProduct`: same field alignment
- Add `useProductsDropdown()` → `GET /products/dropdown`
- Add `useToggleProductActive(id)` → `PATCH /products/:productId/toggle-active`
- Remove `useDeletedProducts` and `useRestoreProduct` (endpoints not in the new API)

#### `app/dashboard/products/add/page.tsx`
- **Remove**: Category selector, Cost Price field, Preferred Supplier selector (all removed from API)
- **Add — Basic Info section**: Barcode input (optional), Type selector (4 options)
- **Add — Stock Settings section**: Min Stock, Max Stock inputs (alongside existing Reorder Level)
- **Add — Images section**: dynamic list of URL string inputs (add/remove rows)
- **Add — Attributes section**: dynamic rows of `name` + `value` + optional `unit` (add/remove rows)
- Fix payload: `code` not `sku`, `sellingPrice` not `unitPrice`

#### `app/dashboard/products/page.tsx` (list)
- Replace category filter with Type filter (dropdown: All / Finished Good / Semi-Finished / Consumable / Service)
- Replace `status` string filter with `isActive` boolean toggle
- Add stock level badges: Out of Stock (red), Low Stock (amber, when `currentStock ≤ reorderLevel`), At Capacity (blue, when `currentStock ≥ maxStock`)
- Use `meta.hasNext`/`meta.hasPrev` for pagination controls

#### `app/dashboard/products/[id]/page.tsx` (detail/edit)
- Show all new fields: type badge, barcode, min/max stock, images, attributes table
- Attributes edit: always send the **full** array on save (partial updates not supported)

---

## Module 2: Raw Materials (Build from Scratch)

### Architecture

Two sub-modules under `/raw-materials` and `/raw-material-batches`.

**Route:** `app/dashboard/raw-materials/` (top-level, not under products)

**Raw Material** = master catalogue entry (name, code, UOM, stock thresholds, last purchase price).  
**Raw Material Batch** = a physical lot received via GRN, tracked with FIFO/FEFO.

### Types (`types/common.ts` — additions)

```typescript
interface RawMaterial {
  id: string
  name: string
  code: string                   // 2–12 chars, auto-formatted (uppercase, spaces→hyphens)
  description?: string
  uomId: string
  uom?: { id: string; name: string; symbol: string; code: string }
  currentStock: number
  reorderLevel: number
  lastPurchasePrice: string      // Decimal → string; parse with parseFloat()
  isActive: boolean
  deletedAt?: string
  createdById?: string
  updatedById?: string
  createdAt: string
  updatedAt: string
}

type RawMaterialBatchStatus = 'ACTIVE' | 'PARTIAL' | 'CONSUMED' | 'REJECTED'

interface RawMaterialBatch {
  id: string
  batchNumber: string            // auto-generated: RM-YYYYMM-XXXX
  rawMaterialId: string
  grnItemId: string
  siteId: string
  receivedQuantity: number
  consumedQuantity: number
  availableQuantity: number
  unitCost: number
  manufacturingDate?: string
  expiryDate?: string
  receivedDate: string
  status: RawMaterialBatchStatus
  notes?: string
  rawMaterial?: { id: string; name: string; code: string }
  site?: { id: string; name: string; code: string }
  grnItem?: { id: string; receivedQuantity: number; grn?: { id: string; receivingNumber: string; receivedDate: string; supplier?: { name: string } } }
  consumptions?: RawMaterialBatchConsumption[]
  createdAt: string
  updatedAt: string
}

interface RawMaterialBatchConsumption {
  id: string
  batchId: string
  consumedQuantity: number
  remainingAfter: number
  consumedDate: string
  referenceType?: string
  referenceId?: string
  notes?: string
  createdById?: string
  createdAt: string
}
```

### Hooks

#### `hooks/useRawMaterials.ts` (new file)

```
useRawMaterials(filters)          GET /raw-materials
useRawMaterial(id)                GET /raw-materials/:rawMaterialId
useRawMaterialsDropdown()         GET /raw-materials/dropdown
useCreateRawMaterial()            POST /raw-materials
useUpdateRawMaterial()            PATCH /raw-materials/:rawMaterialId
useDeleteRawMaterial()            DELETE /raw-materials/:rawMaterialId
useToggleRawMaterialActive()      PATCH /raw-materials/:rawMaterialId/toggle-active
```

Filters: `search`, `isActive`, `page`, `limit`, `sortBy`, `sortOrder`  
`lastPurchasePrice` — treat as string from API; `parseFloat()` before display.

#### `hooks/useRawMaterialBatches.ts` (new file)

```
useRawMaterialBatches(filters)    GET /raw-material-batches
useRawMaterialBatch(id)           GET /raw-material-batches/:batchId
useExpiringBatches(days?)         GET /raw-material-batches/expiring?days=N
useFIFOAllocation(rmId, qty?)     GET /raw-material-batches/fifo/:rawMaterialId?quantity=N
useBatchConsumptions(batchId)     GET /raw-material-batches/:batchId/consumptions
useBulkCreateBatches()            POST /raw-material-batches/bulk
useUpdateBatch()                  PATCH /raw-material-batches/:batchId
useConsumeFromBatch()             POST /raw-material-batches/:batchId/consume
```

Batch list filters: `rawMaterialId`, `siteId`, `grnId`, `status`, `expiringDays`, `search`, `page`, `limit`, `sortBy`, `sortOrder`

### Pages

#### List — `app/dashboard/raw-materials/page.tsx`
- Table: Name, Code, UOM (symbol), Current Stock, Reorder Level, Last Purchase Price, Status, Actions
- Low-stock indicator: `currentStock ≤ reorderLevel`
- Filters: search, `isActive` toggle
- Actions per row: Edit, Toggle Active, Delete (with confirm)
- Link to detail page

#### Add/Edit — `app/dashboard/raw-materials/add/page.tsx` and `[id]/edit/page.tsx`
Fields:
- Name (required)
- Code (required) — show helper: "Auto-formatted to uppercase, spaces become hyphens (e.g. SUNFLOWER-OIL)"
- Description
- UOM (required) — use `useUOMsDropdown()`, display as "Name (symbol)"
- Reorder Level
- Last Purchase Price
- Is Active toggle

#### Detail — `app/dashboard/raw-materials/[id]/page.tsx`
Three tabs:
1. **Info** — all fields, stock level, edit button
2. **Batches** — paginated table of batches for this material; batch status badges; link to batch detail
3. **FIFO View** — quantity input → calls FIFO allocation endpoint → shows allocation breakdown across batches

#### Batch Detail — `app/dashboard/raw-materials/batches/[batchId]/page.tsx`
- Header: batch number, status badge, site, GRN reference, received/consumed/available quantities
- Update form: status (REJECTED), notes
- Consumption History table: all consumption records, newest first
- Consume modal: quantity input + optional referenceType/referenceId/notes

#### Expiry Alert — dashboard widget component
- Calls `GET /raw-material-batches/expiring?days=30`
- Shows count badge and expandable list of batches expiring soon

### Business rules to enforce in UI
- Batch can only be consumed if status is `ACTIVE` or `PARTIAL`
- Consume quantity must be ≤ `availableQuantity`
- Batch status progression: `ACTIVE → PARTIAL → CONSUMED` (auto, driven by backend)
- `REJECTED` is set manually via the Update Batch form
- `lastPurchasePrice` is a string from backend — always `parseFloat()` before arithmetic or display

---

## Module 3: Suppliers

### What changed on the backend

| Area | Old | New |
|------|-----|-----|
| `code` field | present | **Removed** |
| `contactPerson` field | present | **Removed** |
| `balance` field | top-level on Supplier | Lives in ledger overview only |
| `currency` field | present | **Removed** |
| `status` enum | `'ACTIVE'\|'INACTIVE'\|'BLOCKED'` | **Replaced** by `isActive: boolean` |
| Opening balance | absent | New nested object in create/update |
| `notes` field | absent | Added |

**New fields returned on every Supplier:**
- `openingBalanceAmount: string` (Decimal)
- `openingBalanceDate?: string`
- `openingBalanceNote?: string`
- `openingBalanceSetById?: string`

**Opening balance rule:** Cannot be modified once the supplier has any purchase orders. Backend returns `400` if attempted.

**New endpoints:**
- `GET /suppliers/dropdown` — minimal list for select inputs
- `PATCH /suppliers/:id/toggle-active`

### Changes required

#### `hooks/useSuppliers.ts` — `Supplier` interface
```typescript
interface Supplier {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  isActive: boolean
  openingBalanceAmount?: string   // Decimal string — parseFloat() before arithmetic
  openingBalanceDate?: string
  openingBalanceNote?: string
  openingBalanceSetById?: string
  deletedAt?: string
  createdById?: string
  updatedById?: string
  createdAt: string
  updatedAt: string
}
```

Remove: `code`, `contactPerson`, `balance`, `currency`, `status`.

#### `hooks/useSuppliers.ts` — `SupplierFilters`
```typescript
interface SupplierFilters {
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}
```

#### `hooks/useSuppliers.ts` — add hooks
- `useSuppliersDropdown()` → `GET /suppliers/dropdown`
- `useToggleSupplierActive()` → `PATCH /suppliers/:id/toggle-active`

#### `hooks/useSupplierLedgerOverview.ts` — `SupplierLedgerSummary` interface
Fix field names to match API:
```typescript
interface SupplierLedgerSummary {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  balance: number
  totalPurchases: number
  totalPayments: number          // was: totalPaid
  totalReturns: number
  lastPaymentDate?: string       // was: lastTransactionDate
  // Remove: contactPerson, transactionCount, openingBalanceType
}
```

#### `hooks/useSupplierTransactions.ts` — fix Decimal fields
`debit` and `credit` are returned as strings from backend. Update interface to `string` and `parseFloat()` before arithmetic.

#### `app/dashboard/suppliers/create/page.tsx`
- **Remove** `contactPerson` field
- **Add** Opening Balance section (collapsible):
  ```
  Amount (number, ≥ 0)
  Date (date picker, YYYY-MM-DD format)
  Note (text, optional)
  ```
  Payload shape: `openingBalance: { amount, date?, note? }`

#### `app/dashboard/suppliers/[id]/page.tsx` (detail)
- Add tabs: **Overview** | **Ledger** | **Transactions**
- Overview tab: show `openingBalanceAmount`, `openingBalanceDate`, `openingBalanceNote`
- Show warning if trying to edit opening balance and supplier has POs

#### Supplier list page — status display
- Replace `status` badge logic with `isActive` boolean → Active (green) / Inactive (gray)

---

## Module 4: UOMs

### What changed on the backend

| Area | Old | New |
|------|-----|-----|
| `GET /uoms` response | Paginated flat array `{ data: [...], meta: {...} }` | **Grouped object** `{ WEIGHT: [...], VOLUME: [...], LENGTH: [...], COUNT: [...] }` |
| `GET /uoms?category=X` | — | Flat array (only when category param is passed) |
| `POST /uoms` | Worked | **Disabled** — returns error |
| `isSystem` field | absent | Added — `true` for the 25 seeded system UOMs |
| `category` field | absent | Added — `'WEIGHT'\|'VOLUME'\|'LENGTH'\|'COUNT'` |
| `symbol` field | mapped to `code` | **Separate from `code`** — `symbol` = display ("kg"), `code` = enum key ("KILOGRAM") |
| Delete protection | none | Returns `409` if UOM in use; `403` if system UOM |
| New endpoint | — | `GET /uoms/dropdown` (flat array, optional `?category=X`) |

### Changes required

#### `hooks/useMasterData.ts` — `UOM` interface
```typescript
interface UOM {
  id: string
  name: string
  symbol: string      // display symbol: "kg", "L", "pcs"
  code: string        // enum key: "KILOGRAM", "LITER", "PIECE"
  category: 'WEIGHT' | 'VOLUME' | 'LENGTH' | 'COUNT'
  isSystem: boolean
  description?: string
  isActive?: boolean  // not returned when category filter applied
}
```

#### `hooks/useMasterData.ts` — `useUOMs()`
- Change URL from `GET /uoms?limit=100&page=1` to `GET /uoms`
- Handle grouped object response — flatten into a single array for backward compatibility with existing consumers (forms that use `useUOMs()` as a flat list)
- Remove the multi-page fetch loop (response is no longer paginated)

#### `hooks/useMasterData.ts` — `useCreateUOM()`
- Remove the mutation (endpoint disabled) or convert to a no-op with a toast warning
- Remove all call sites from UI

#### `hooks/useMasterData.ts` — add `useUOMsDropdown(category?)`
```
GET /uoms/dropdown?category=X
Returns: { id, name, symbol, code, category }[]
```
Use this in all product and raw material form UOM selectors (replaces direct `useUOMs()` usage in forms).

#### `app/dashboard/products/uoms/page.tsx`
- **Remove** the "Add UOM" button and the create dialog entirely
- **Re-render list** as grouped by category:
  - Tabs or accordion sections: WEIGHT | VOLUME | LENGTH | COUNT
  - Each section shows a table: Code | Name | Symbol | System
  - `isSystem: true` rows → no delete button (show lock icon instead)
  - Delete for non-system UOMs: call `DELETE /uoms/:uomId`; handle `409` with "Cannot delete — in use by products or raw materials"
- **Search** still works client-side across the flattened list

#### Product and Raw Material forms — UOM selector
- Replace `useUOMs()` with `useUOMsDropdown()`
- Display as: `Name (symbol)` → e.g. `"Kilogram (kg)"`
- Store `uomId` (UUID) in form state

---

## Shared Type Change

`PaginationMeta` in `types/common.ts`:
```typescript
interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean    // added
  hasPrev: boolean    // added
}
```

---

## File Change Summary

### Modify existing
| File | Changes |
|------|---------|
| `types/common.ts` | Rewrite `Product`, add `RawMaterial`, `RawMaterialBatch`, `RawMaterialBatchConsumption`; update `PaginationMeta` |
| `hooks/useProducts.ts` | Fix filters, fix create/update payload, add dropdown + toggle-active hooks, remove deleted/restore hooks |
| `hooks/useMasterData.ts` | Fix `UOM` interface, fix `useUOMs` response parsing, remove `useCreateUOM`, add `useUOMsDropdown` |
| `hooks/useSuppliers.ts` | Fix `Supplier` interface, fix filters, add dropdown + toggle-active hooks |
| `hooks/useSupplierLedgerOverview.ts` | Fix `SupplierLedgerSummary` interface field names |
| `hooks/useSupplierTransactions.ts` | Change `debit`/`credit` to `string` |
| `app/dashboard/products/add/page.tsx` | Remove category/cost/supplier; add type, barcode, minStock, maxStock, images, attributes |
| `app/dashboard/products/page.tsx` | Fix filters (type + isActive); add stock badges; fix pagination |
| `app/dashboard/products/[id]/page.tsx` | Show all new fields; fix attributes update (full replace) |
| `app/dashboard/products/uoms/page.tsx` | Remove create button; grouped-by-category render; isSystem delete guard |
| `app/dashboard/suppliers/create/page.tsx` | Remove contactPerson; add opening balance section |
| `app/dashboard/suppliers/[id]/page.tsx` | Add tabs; show opening balance fields |
| `app/dashboard/suppliers/page.tsx` | Fix status display (isActive boolean) |

### Create new
| File | Purpose |
|------|---------|
| `hooks/useRawMaterials.ts` | Full CRUD + dropdown + toggle-active |
| `hooks/useRawMaterialBatches.ts` | Batch CRUD + FIFO + consume + expiring |
| `app/dashboard/raw-materials/page.tsx` | Raw materials list |
| `app/dashboard/raw-materials/add/page.tsx` | Create form |
| `app/dashboard/raw-materials/[id]/page.tsx` | Detail with Info / Batches / FIFO tabs |
| `app/dashboard/raw-materials/[id]/edit/page.tsx` | Edit form |
| `app/dashboard/raw-materials/batches/[batchId]/page.tsx` | Batch detail + consume modal |

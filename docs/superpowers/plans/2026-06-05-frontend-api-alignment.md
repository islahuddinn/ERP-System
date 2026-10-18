# Frontend API Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the frontend with the updated backend APIs across four modules: Products, Raw Materials, Suppliers, and UOMs — fixing stale interfaces, broken response parsing, missing features, and building the Raw Materials module from scratch.

**Architecture:** Each phase is independently shippable. Phase 1 (foundation types + UOM fix) must complete first as downstream phases depend on the corrected `PaginationMeta` and `UOM` types. Phases 2–4 (Suppliers, Products, Raw Materials) can then proceed in any order, but Raw Materials is the largest and should follow Products since both share UOM selector patterns.

**Tech Stack:** Next.js 14 App Router, TanStack Query v5, Radix UI + shadcn/ui, Tailwind CSS, react-hook-form, axios (`apiClient`).

**Spec:** `docs/superpowers/specs/2026-06-05-frontend-api-alignment-design.md`

---

## File Structure

### Modify existing
| File | What changes |
|------|-------------|
| `frontend/types/common.ts` | Rewrite `Product`, add `RawMaterial`/`RawMaterialBatch`/`RawMaterialBatchConsumption`, update `PaginationMeta` |
| `frontend/hooks/useProducts.ts` | Fix filters + mutations, add dropdown/toggle-active hooks, remove deleted/restore hooks |
| `frontend/hooks/useMasterData.ts` | Fix `UOM` interface, fix `useUOMs()` grouped response, remove `useCreateUOM`, add `useUOMsDropdown` |
| `frontend/hooks/useSuppliers.ts` | Fix `Supplier` interface + filters, add dropdown/toggle-active hooks |
| `frontend/hooks/useSupplierLedgerOverview.ts` | Fix `SupplierLedgerSummary` field names |
| `frontend/hooks/useSupplierTransactions.ts` | `debit`/`credit` from `number` to `string` |
| `frontend/app/dashboard/products/add/page.tsx` | Remove category/cost/supplier; add type, barcode, minStock, maxStock, images, attributes |
| `frontend/app/dashboard/products/page.tsx` | Fix filters (type + isActive), add stock badges, fix pagination |
| `frontend/app/dashboard/products/[id]/page.tsx` | Full implementation replacing stub |
| `frontend/app/dashboard/products/uoms/page.tsx` | Remove create button; group by category; isSystem delete guard |
| `frontend/app/dashboard/suppliers/create/page.tsx` | Remove contactPerson; add opening balance section |
| `frontend/app/dashboard/suppliers/[id]/page.tsx` | Add tabs (Overview / Ledger / Transactions), show opening balance |
| `frontend/app/dashboard/suppliers/page.tsx` | Fix `isActive` boolean filter/display |

### Create new
| File | Purpose |
|------|---------|
| `frontend/hooks/useRawMaterials.ts` | Full CRUD + dropdown + toggle-active for raw materials |
| `frontend/hooks/useRawMaterialBatches.ts` | Batch CRUD, FIFO, consume, expiring |
| `frontend/app/dashboard/raw-materials/page.tsx` | List with low-stock indicator |
| `frontend/app/dashboard/raw-materials/add/page.tsx` | Create form |
| `frontend/app/dashboard/raw-materials/[id]/page.tsx` | Detail: Info / Batches / FIFO tabs |
| `frontend/app/dashboard/raw-materials/[id]/edit/page.tsx` | Edit form |
| `frontend/app/dashboard/raw-materials/batches/[batchId]/page.tsx` | Batch detail + consume modal |

---

## Phase 1: Foundation — Shared Types + UOMs

### Task 1: Update `types/common.ts`

**Files:**
- Modify: `frontend/types/common.ts`

- [ ] **Step 1: Replace the `Product` interface and update `PaginationMeta`**

Open `frontend/types/common.ts` and make the following changes:

Replace the existing `PaginationMeta` (add `hasNext`/`hasPrev`):
```typescript
export interface PaginationMeta {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
}
```

Replace the existing `Product` interface entirely:
```typescript
export type ProductType = 'FINISHED_GOOD' | 'SEMI_FINISHED' | 'CONSUMABLE' | 'SERVICE'

export interface Product {
    id: string
    name: string
    code: string
    barcode?: string
    description?: string
    type: ProductType
    uomId: string
    uom?: { id: string; name: string; symbol: string }
    currentStock: number
    minStock: number
    maxStock?: number
    reorderLevel: number
    sellingPrice?: string        // Prisma Decimal — parseFloat() before arithmetic
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

Also remove these now-unused product response aliases from the file (they referenced stale `Product` shape):
```typescript
// DELETE these lines:
export type ProductsResponse = ApiResponse<Product>
```

- [ ] **Step 2: Add Raw Material types**

Append to `frontend/types/common.ts` after the existing `Product` block:
```typescript
// Raw Materials
export interface RawMaterial {
    id: string
    name: string
    code: string
    description?: string
    uomId: string
    uom?: { id: string; name: string; symbol: string; code: string }
    currentStock: number
    reorderLevel: number
    lastPurchasePrice: string   // Prisma Decimal — parseFloat() before arithmetic
    isActive: boolean
    deletedAt?: string
    createdById?: string
    updatedById?: string
    createdAt: string
    updatedAt: string
}

export type RawMaterialBatchStatus = 'ACTIVE' | 'PARTIAL' | 'CONSUMED' | 'REJECTED'

export interface RawMaterialBatchConsumption {
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

export interface RawMaterialBatch {
    id: string
    batchNumber: string          // auto-generated: RM-YYYYMM-XXXX
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
    grnItem?: {
        id: string
        receivedQuantity: number
        grn?: {
            id: string
            receivingNumber: string
            receivedDate: string
            supplier?: { name: string }
        }
    }
    consumptions?: RawMaterialBatchConsumption[]
    createdAt: string
    updatedAt: string
}
```

- [ ] **Step 3: Verify TypeScript still compiles**

```powershell
cd frontend; npx tsc --noEmit 2>&1 | Select-Object -First 30
```

Expected: errors only about hooks that still use the old `Product` shape — that is expected and will be fixed in later tasks. No errors inside `types/common.ts` itself.

- [ ] **Step 4: Commit**

```powershell
git add frontend/types/common.ts
git commit -m "feat(types): update Product interface, add RawMaterial/Batch types, extend PaginationMeta"
```

---

### Task 2: Fix UOM hook in `useMasterData.ts`

**Files:**
- Modify: `frontend/hooks/useMasterData.ts`

- [ ] **Step 1: Update the `UOM` interface**

In `frontend/hooks/useMasterData.ts`, replace the existing `UOM` interface:
```typescript
export interface UOM {
    id: string
    name: string
    symbol: string      // display: "kg", "L", "pcs"
    code: string        // enum key: "KILOGRAM", "LITER", "PIECE"
    category: 'WEIGHT' | 'VOLUME' | 'LENGTH' | 'COUNT'
    isSystem: boolean
    description?: string
    isActive?: boolean
}
```

- [ ] **Step 2: Fix `useUOMs()` to handle the grouped response**

The backend now returns `{ WEIGHT: [...], VOLUME: [...], LENGTH: [...], COUNT: [...] }` (no pagination). Replace the `useUOMs()` function:

```typescript
export function useUOMs() {
    return useQuery({
        queryKey: ['uoms'],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/uoms')
            const responseData = response?.data || response
            // Backend returns grouped object: { WEIGHT: [], VOLUME: [], LENGTH: [], COUNT: [] }
            // Flatten to a single array for backward compatibility with form selectors
            if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
                const grouped = responseData as Record<string, UOM[]>
                return Object.values(grouped).flat() as UOM[]
            }
            return (Array.isArray(responseData) ? responseData : []) as UOM[]
        }
    })
}
```

- [ ] **Step 3: Add `useUOMsDropdown()`**

Add this new hook after `useUOMs()`:
```typescript
export function useUOMsDropdown(category?: 'WEIGHT' | 'VOLUME' | 'LENGTH' | 'COUNT') {
    return useQuery({
        queryKey: ['uoms', 'dropdown', category],
        queryFn: async () => {
            const params = category ? { category } : {}
            const { data: response } = await apiClient.get('/uoms/dropdown', { params })
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as UOM[]
        }
    })
}
```

- [ ] **Step 4: Remove `useCreateUOM()`**

Delete the entire `useCreateUOM()` function. The `POST /uoms` endpoint is disabled on the backend. Any call sites that import it will become compile errors — those are addressed in Task 3.

Also remove the `useDeleteUOM` dummy data path that calls the create endpoint if present (leave the delete function itself, just remove `useCreateUOM`).

- [ ] **Step 5: Verify removal**

```powershell
cd frontend; npx tsc --noEmit 2>&1 | Select-String "useCreateUOM"
```

Expected: errors pointing to `app/dashboard/products/uoms/page.tsx` — that is addressed in Task 3.

- [ ] **Step 6: Commit**

```powershell
git add frontend/hooks/useMasterData.ts
git commit -m "feat(uoms): fix grouped response parsing, add dropdown hook, remove disabled create"
```

---

### Task 3: Fix UOM list page (`products/uoms/page.tsx`)

**Files:**
- Modify: `frontend/app/dashboard/products/uoms/page.tsx`

- [ ] **Step 1: Rewrite the UOMs page**

Replace the entire content of `frontend/app/dashboard/products/uoms/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Search, Lock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUOMs, useDeleteUOM } from '@/hooks/useMasterData'
import type { UOM } from '@/hooks/useMasterData'
import { toast } from 'react-hot-toast'

const CATEGORIES = ['WEIGHT', 'VOLUME', 'LENGTH', 'COUNT'] as const

export default function UOMsPage() {
  const [search, setSearch] = useState('')
  const { data: uoms = [], isLoading } = useUOMs()
  const deleteMutation = useDeleteUOM()

  const filtered = uoms.filter((u: UOM) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.symbol.toLowerCase().includes(search.toLowerCase()) ||
    u.code.toLowerCase().includes(search.toLowerCase())
  )

  const byCategory = (cat: string) => filtered.filter((u: UOM) => u.category === cat)

  const handleDelete = async (uom: UOM) => {
    if (uom.isSystem) {
      toast.error('System UOMs cannot be deleted')
      return
    }
    if (!confirm(`Delete "${uom.name}"? This cannot be undone.`)) return
    try {
      await deleteMutation.mutateAsync(uom.id)
      toast.success(`${uom.name} deleted`)
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to delete UOM'
      // 409 = in use, 403 = system UOM
      toast.error(msg)
    }
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading UOMs…</div>

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Units of Measure</h2>
          <p className="text-muted-foreground">System-seeded UOMs. Custom UOMs can be deleted if not in use.</p>
        </div>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, symbol, code…"
          className="pl-8"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Tabs defaultValue="WEIGHT">
        <TabsList>
          {CATEGORIES.map(cat => (
            <TabsTrigger key={cat} value={cat}>
              {cat.charAt(0) + cat.slice(1).toLowerCase()} ({byCategory(cat).length})
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map(cat => (
          <TabsContent key={cat} value={cat}>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byCategory(cat).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No UOMs found
                        </TableCell>
                      </TableRow>
                    ) : byCategory(cat).map((uom: UOM) => (
                      <TableRow key={uom.id}>
                        <TableCell className="font-mono text-xs">{uom.code}</TableCell>
                        <TableCell className="font-medium">{uom.name}</TableCell>
                        <TableCell>{uom.symbol}</TableCell>
                        <TableCell>
                          {uom.isSystem ? (
                            <Badge variant="secondary">System</Badge>
                          ) : (
                            <Badge variant="outline">Custom</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {uom.isSystem ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(uom)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 2: Verify compile**

```powershell
cd frontend; npx tsc --noEmit 2>&1 | Select-String "uoms"
```

Expected: no errors referencing the UOMs page.

- [ ] **Step 3: Commit**

```powershell
git add frontend/app/dashboard/products/uoms/page.tsx
git commit -m "feat(uoms): grouped-by-category view, remove create button, isSystem lock guard"
```

---

## Phase 2: Suppliers

### Task 4: Fix Supplier hooks

**Files:**
- Modify: `frontend/hooks/useSuppliers.ts`
- Modify: `frontend/hooks/useSupplierLedgerOverview.ts`
- Modify: `frontend/hooks/useSupplierTransactions.ts`

- [ ] **Step 1: Replace `Supplier` interface in `useSuppliers.ts`**

Replace the existing `Supplier` export:
```typescript
export interface Supplier {
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

- [ ] **Step 2: Replace `SupplierFilters` interface**

```typescript
export interface SupplierFilters {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
}
```

- [ ] **Step 3: Fix `useSuppliers()` query function**

The query function must pass `isActive` as a proper boolean query param. Update the `queryFn`:
```typescript
queryFn: async () => {
    const { data: response } = await apiClient.get('/suppliers', { params: filters })
    const responseData = response?.data || response
    return responseData
}
```

(Remove the dummy data path if still present — it uses the stale `code`/`contactPerson` fields.)

- [ ] **Step 4: Fix `useCreateSupplier` mutation type**

Update the mutation type to reflect the new `Supplier` shape (no `code`, `contactPerson`, `balance`, `currency`, `status`). The create DTO accepts:
```typescript
mutationFn: async (data: {
    name: string
    email?: string
    phone?: string
    address?: string
    notes?: string
    isActive?: boolean
    openingBalance?: { amount: number; date?: string; note?: string }
}) => {
    const { data: response } = await apiClient.post('/suppliers', data)
    return response?.data || response
}
```

- [ ] **Step 5: Add `useSuppliersDropdown()` and `useToggleSupplierActive()`**

Append to `frontend/hooks/useSuppliers.ts`:
```typescript
export function useSuppliersDropdown() {
    return useQuery({
        queryKey: ['suppliers', 'dropdown'],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/suppliers/dropdown')
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as { id: string; name: string }[]
        }
    })
}

export function useToggleSupplierActive() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { data: response } = await apiClient.patch(`/suppliers/${id}/toggle-active`)
            return response?.data || response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
            toast.success('Supplier status updated')
        }
    })
}
```

- [ ] **Step 6: Fix `useSupplierLedgerOverview.ts` — interface field names**

In `frontend/hooks/useSupplierLedgerOverview.ts`, replace the `SupplierLedgerSummary` interface:
```typescript
export interface SupplierLedgerSummary {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  balance: number
  totalPurchases: number
  totalPayments: number       // was: totalPaid
  totalReturns: number
  lastPaymentDate?: string    // was: lastTransactionDate
}
```

Remove the `dummySupplierLedgerData` array (it uses the stale shape and references `contactPerson`, `transactionCount`, etc.).

Update the `queryFn` to return the real API data only:
```typescript
queryFn: async () => {
  const { data: response } = await apiClient.get('/suppliers/ledger-overview', {
    params: { search: searchTerm }
  })
  const responseData = response?.data || response
  return (Array.isArray(responseData) ? responseData : (responseData?.data || [])) as SupplierLedgerSummary[]
}
```

- [ ] **Step 7: Fix `useSupplierTransactions.ts` — Decimal fields**

In `frontend/hooks/useSupplierTransactions.ts`, find the `SupplierTransaction` interface and change:
```typescript
debit: string    // was: number — Prisma Decimal returns as string
credit: string   // was: number — Prisma Decimal returns as string
```

Any display code that does arithmetic on these must use `parseFloat(transaction.debit)`.

- [ ] **Step 8: Compile check**

```powershell
cd frontend; npx tsc --noEmit 2>&1 | Select-String "supplier" -i
```

Expected: errors only from page files that still reference stale fields (fixed in Task 5–6).

- [ ] **Step 9: Commit**

```powershell
git add frontend/hooks/useSuppliers.ts frontend/hooks/useSupplierLedgerOverview.ts frontend/hooks/useSupplierTransactions.ts
git commit -m "feat(suppliers): align interfaces to new API, add dropdown/toggle hooks, fix Decimal types"
```

---

### Task 5: Fix Supplier list page

**Files:**
- Modify: `frontend/app/dashboard/suppliers/page.tsx`

- [ ] **Step 1: Replace status filter with `isActive` boolean**

In `frontend/app/dashboard/suppliers/page.tsx`:

Find the `statusFilter` state and change its type from `'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'all'` to `boolean | undefined`.

Replace the filter state and filter bar:
```typescript
const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined)

// In filters passed to useSuppliers:
const { data, isLoading } = useSuppliers({
  search: searchTerm,
  isActive: isActiveFilter,
  page: currentPage,
  limit: 10
})
```

Replace the status filter UI dropdown with:
```tsx
<Select
  value={isActiveFilter === undefined ? 'all' : isActiveFilter ? 'active' : 'inactive'}
  onValueChange={val => setIsActiveFilter(val === 'all' ? undefined : val === 'active')}
>
  <SelectTrigger className="w-36">
    <SelectValue placeholder="Status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All</SelectItem>
    <SelectItem value="active">Active</SelectItem>
    <SelectItem value="inactive">Inactive</SelectItem>
  </SelectContent>
</Select>
```

- [ ] **Step 2: Fix status badge and remove stale columns**

Replace `getStatusBadge()` or equivalent status display logic:
```typescript
const getStatusBadge = (supplier: Supplier) => (
  <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
    {supplier.isActive ? 'Active' : 'Inactive'}
  </Badge>
)
```

Remove the "Code" column from the table header and rows (`supplier.code` no longer exists).

Remove the "Balance" column (balance is not returned on the list endpoint — it lives in ledger overview only).

- [ ] **Step 3: Compile and commit**

```powershell
cd frontend; npx tsc --noEmit 2>&1 | Select-String "suppliers/page"
git add frontend/app/dashboard/suppliers/page.tsx
git commit -m "feat(suppliers): fix status filter to isActive boolean, remove stale Code/Balance columns"
```

---

### Task 6: Fix Supplier create page

**Files:**
- Modify: `frontend/app/dashboard/suppliers/create/page.tsx`

- [ ] **Step 1: Remove `contactPerson` field from form**

In `frontend/app/dashboard/suppliers/create/page.tsx`:
- Remove the `contactPerson` field from the form interface/state
- Remove the `contactPerson` input JSX element
- Remove `contactPerson` from the submit payload

- [ ] **Step 2: Add Opening Balance section**

Add an opening balance form section. After the main fields (name, email, phone, address, notes), add a collapsible section:

```tsx
// State
const [showOpeningBalance, setShowOpeningBalance] = useState(false)
const [obAmount, setObAmount] = useState<number>(0)
const [obDate, setObDate] = useState<string>('')
const [obNote, setObNote] = useState<string>('')
```

JSX section:
```tsx
<Card>
  <CardHeader className="cursor-pointer" onClick={() => setShowOpeningBalance(v => !v)}>
    <CardTitle className="text-base flex items-center justify-between">
      Opening Balance (optional)
      <span className="text-muted-foreground text-sm font-normal">
        {showOpeningBalance ? '▲ Hide' : '▼ Show'}
      </span>
    </CardTitle>
  </CardHeader>
  {showOpeningBalance && (
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Set the outstanding balance at the time this supplier is added to the system.
        This cannot be changed once the supplier has purchase orders.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Amount</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={obAmount}
            onChange={e => setObAmount(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label>Date</Label>
          <Input
            type="date"
            value={obDate}
            onChange={e => setObDate(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label>Note (optional)</Label>
        <Textarea value={obNote} onChange={e => setObNote(e.target.value)} />
      </div>
    </CardContent>
  )}
</Card>
```

- [ ] **Step 3: Update submit payload**

In `onSubmit`, include the opening balance:
```typescript
const payload: any = {
  name: data.name,
  email: data.email || undefined,
  phone: data.phone || undefined,
  address: data.address || undefined,
  notes: data.notes || undefined,
  isActive: true,
}
if (showOpeningBalance && obAmount > 0) {
  payload.openingBalance = {
    amount: obAmount,
    date: obDate || undefined,
    note: obNote || undefined,
  }
}
await createMutation.mutateAsync(payload)
```

- [ ] **Step 4: Compile and commit**

```powershell
cd frontend; npx tsc --noEmit 2>&1 | Select-String "suppliers/create"
git add frontend/app/dashboard/suppliers/create/page.tsx
git commit -m "feat(suppliers): remove contactPerson, add opening balance section to create form"
```

---

### Task 7: Rebuild Supplier detail page with tabs

**Files:**
- Modify: `frontend/app/dashboard/suppliers/[id]/page.tsx`

- [ ] **Step 1: Add tabs structure and Opening Balance display**

The existing `[id]/page.tsx` has transaction CRUD working but lacks tabs and opening balance. Add a tabbed layout — the existing transaction content moves into the "Transactions" tab.

```tsx
// At the top of the component, after fetching supplier data:
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="ledger">Ledger</TabsTrigger>
    <TabsTrigger value="transactions">Transactions</TabsTrigger>
  </TabsList>

  <TabsContent value="overview">
    {/* Supplier info fields: name, email, phone, address, notes, isActive */}
    {/* Opening balance section */}
    {supplier?.openingBalanceAmount && (
      <Card>
        <CardHeader><CardTitle>Opening Balance</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="font-medium">
              {parseFloat(supplier.openingBalanceAmount).toLocaleString('en-US', { style: 'currency', currency: 'PKR' })}
            </p>
          </div>
          {supplier.openingBalanceDate && (
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{new Date(supplier.openingBalanceDate).toLocaleDateString()}</p>
            </div>
          )}
          {supplier.openingBalanceNote && (
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">Note</p>
              <p className="font-medium">{supplier.openingBalanceNote}</p>
            </div>
          )}
        </CardContent>
      </Card>
    )}
  </TabsContent>

  <TabsContent value="ledger">
    {/* Existing ledger content — useSupplierLedger hook */}
  </TabsContent>

  <TabsContent value="transactions">
    {/* Move existing transaction table + add transaction form here */}
  </TabsContent>
</Tabs>
```

- [ ] **Step 2: Fix any `debit`/`credit` arithmetic in the transaction table**

The transaction hook now types `debit` and `credit` as `string`. Find any places in this page that do math on them:
```typescript
// Before:
transaction.debit + transaction.credit
// After:
parseFloat(transaction.debit) + parseFloat(transaction.credit)
```

- [ ] **Step 3: Compile and commit**

```powershell
cd frontend; npx tsc --noEmit 2>&1 | Select-String "suppliers/\[id\]"
git add "frontend/app/dashboard/suppliers/[id]/page.tsx"
git commit -m "feat(suppliers): add Overview/Ledger/Transactions tabs, show opening balance"
```

---

## Phase 3: Products

### Task 8: Fix Product hooks (`useProducts.ts`)

**Files:**
- Modify: `frontend/hooks/useProducts.ts`

- [ ] **Step 1: Update `ProductFilters`**

Replace existing `ProductFilters`:
```typescript
export interface ProductFilters {
    search?: string
    type?: 'FINISHED_GOOD' | 'SEMI_FINISHED' | 'CONSUMABLE' | 'SERVICE'
    isActive?: boolean
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
}
```

- [ ] **Step 2: Remove stale dummy data**

The dummy products array references stale fields (`sku`, `categoryId`, `categoryName`, `uomName`, `cost`, `price`). Either delete the dummy data block entirely, or update it to match the new `Product` interface. Recommended: delete it and use the real API unconditionally. Remove the `getUseDummyData()` function from this file.

- [ ] **Step 3: Fix `useProducts()` — remove `category`/`status` params, add paginated return handling**

The API now returns `{ data: Product[], meta: PaginationMeta }`. The `queryFn` should extract this correctly:
```typescript
queryFn: async () => {
    const { data: response } = await apiClient.get('/products', { params: filters })
    return (response?.data || response) as { data: Product[]; meta: PaginationMeta } | Product[]
}
```

- [ ] **Step 4: Fix `useCreateProduct` mutation**

Replace the mutationFn payload type:
```typescript
mutationFn: async (data: {
    name: string
    code: string
    type: 'FINISHED_GOOD' | 'SEMI_FINISHED' | 'CONSUMABLE' | 'SERVICE'
    uomId: string
    barcode?: string
    description?: string
    sellingPrice?: number
    minStock?: number
    maxStock?: number
    reorderLevel?: number
    images?: string[]
    attributes?: { name: string; value: string; unit?: string }[]
    isActive?: boolean
}) => {
    const { data: response } = await apiClient.post('/products', data)
    return response?.data || response
}
```

- [ ] **Step 5: Fix `useUpdateProduct` mutation**

Same payload shape as create. Ensure `attributes` sends the **full array** on every update (backend does a full replace).

- [ ] **Step 6: Add `useProductsDropdown()` and `useToggleProductActive()`**

```typescript
export function useProductsDropdown() {
    return useQuery({
        queryKey: ['products', 'dropdown'],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/products/dropdown')
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as {
                id: string; name: string; code: string; type: string;
                currentStock: number; sellingPrice?: string;
                uom?: { id: string; name: string; symbol: string }
            }[]
        }
    })
}

export function useToggleProductActive() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { data: response } = await apiClient.patch(`/products/${id}/toggle-active`)
            return response?.data || response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success('Product status updated')
        }
    })
}
```

- [ ] **Step 7: Remove `useDeletedProducts` and `useRestoreProduct`**

Delete both hooks entirely. These hit `/products/deleted` and `/products/:id/restore` which do not exist in the new API.

- [ ] **Step 8: Compile check**

```powershell
cd frontend; npx tsc --noEmit 2>&1 | Select-String "useProducts|useDeletedProducts|useRestoreProduct" -i
```

Expected: errors only from page files that import the removed hooks — fixed in Task 9.

- [ ] **Step 9: Commit**

```powershell
git add frontend/hooks/useProducts.ts
git commit -m "feat(products): align hook to new API, add dropdown/toggle hooks, remove deleted/restore"
```

---

### Task 9: Fix Product list page (`products/page.tsx`)

**Files:**
- Modify: `frontend/app/dashboard/products/page.tsx`

- [ ] **Step 1: Replace category filter with Type filter**

Find the category filter state and UI. Replace with:
```typescript
const [typeFilter, setTypeFilter] = useState<string>('all')

// In filters:
const { data: productsData, isLoading } = useProducts({
  search: searchTerm,
  type: typeFilter !== 'all' ? typeFilter as any : undefined,
  isActive: isActiveFilter,
  page: currentPage,
  limit: 10
})
```

Type filter dropdown:
```tsx
<Select value={typeFilter} onValueChange={setTypeFilter}>
  <SelectTrigger className="w-40">
    <SelectValue placeholder="Type" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Types</SelectItem>
    <SelectItem value="FINISHED_GOOD">Finished Good</SelectItem>
    <SelectItem value="SEMI_FINISHED">Semi-Finished</SelectItem>
    <SelectItem value="CONSUMABLE">Consumable</SelectItem>
    <SelectItem value="SERVICE">Service</SelectItem>
  </SelectContent>
</Select>
```

- [ ] **Step 2: Fix status filter to `isActive` boolean**

Same pattern as Supplier list (Task 5, Step 1). State: `isActiveFilter: boolean | undefined`.

- [ ] **Step 3: Remove Category column, fix code column**

- Remove the "Category" `<TableHead>` and `<TableCell>` from the table
- Fix code column: use `product.code` (not `product.sku || product.code`)

- [ ] **Step 4: Add stock level badges**

Add a "Stock" column that shows a colored badge:
```typescript
const getStockBadge = (product: Product) => {
  if (product.currentStock <= 0) {
    return <Badge variant="destructive">Out of Stock</Badge>
  }
  if (product.currentStock <= product.reorderLevel) {
    return <Badge className="bg-amber-100 text-amber-800">Low Stock</Badge>
  }
  if (product.maxStock && product.currentStock >= product.maxStock) {
    return <Badge className="bg-blue-100 text-blue-800">At Capacity</Badge>
  }
  return <Badge variant="outline">{product.currentStock}</Badge>
}
```

- [ ] **Step 5: Use `meta.hasNext`/`meta.hasPrev` for pagination**

Extract `products` array and `meta` from the API response:
```typescript
const products = Array.isArray(productsData) ? productsData : productsData?.data ?? []
const meta = Array.isArray(productsData) ? null : productsData?.meta
```

Update pagination controls:
```tsx
<Button
  onClick={() => setCurrentPage(p => p - 1)}
  disabled={!meta?.hasPrev || isLoading}
>
  Previous
</Button>
<span className="text-sm text-muted-foreground">
  Page {meta?.page ?? 1} of {meta?.totalPages ?? 1}
</span>
<Button
  onClick={() => setCurrentPage(p => p + 1)}
  disabled={!meta?.hasNext || isLoading}
>
  Next
</Button>
```

- [ ] **Step 6: Compile and commit**

```powershell
cd frontend; npx tsc --noEmit 2>&1 | Select-String "products/page"
git add frontend/app/dashboard/products/page.tsx
git commit -m "feat(products): fix list page — type filter, isActive toggle, stock badges, pagination"
```

---

### Task 10: Rebuild Product add page (`products/add/page.tsx`)

**Files:**
- Modify: `frontend/app/dashboard/products/add/page.tsx`

- [ ] **Step 1: Update form interface and imports**

Replace `ProductFormData`:
```typescript
interface ProductFormData {
  name: string
  code: string
  type: 'FINISHED_GOOD' | 'SEMI_FINISHED' | 'CONSUMABLE' | 'SERVICE'
  uomId: string
  barcode?: string
  description?: string
  sellingPrice?: number
  minStock?: number
  maxStock?: number
  reorderLevel?: number
}
```

Replace imports:
```typescript
import { useCreateProduct } from '@/hooks/useProducts'
import { useUOMsDropdown } from '@/hooks/useMasterData'
// Remove: useCategories, useUOMs (old)
```

Add state for dynamic lists:
```typescript
const [images, setImages] = useState<string[]>([''])
const [attributes, setAttributes] = useState<{ name: string; value: string; unit?: string }[]>([])
const { data: uoms = [] } = useUOMsDropdown()
```

- [ ] **Step 2: Remove Category, Cost Price, and Preferred Supplier fields**

Delete:
- Category selector JSX + `categoryId` in form
- "Cost Price" / "Unit Cost" input + `costPrice`/`unitCost` in form
- Preferred Supplier selector + `supplierId` in form
- `dummySuppliers` constant at the top of the file

- [ ] **Step 3: Add Type selector**

```tsx
<div>
  <Label>Type <span className="text-destructive">*</span></Label>
  <Select
    value={watch('type')}
    onValueChange={val => setValue('type', val as any)}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select product type" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="FINISHED_GOOD">Finished Good</SelectItem>
      <SelectItem value="SEMI_FINISHED">Semi-Finished</SelectItem>
      <SelectItem value="CONSUMABLE">Consumable</SelectItem>
      <SelectItem value="SERVICE">Service</SelectItem>
    </SelectContent>
  </Select>
  {errors.type && <p className="text-sm text-destructive">Type is required</p>}
</div>
```

- [ ] **Step 4: Add Barcode input, Min/Max Stock inputs**

In the Basic Info card, after the Code field:
```tsx
<div>
  <Label>Barcode (optional)</Label>
  <Input {...register('barcode')} placeholder="Scan or enter barcode" />
</div>
```

In a new "Stock Settings" card:
```tsx
<Card>
  <CardHeader><CardTitle>Stock Settings</CardTitle></CardHeader>
  <CardContent className="grid grid-cols-3 gap-4">
    <div>
      <Label>Reorder Level</Label>
      <Input type="number" min={0} {...register('reorderLevel', { valueAsNumber: true })} />
    </div>
    <div>
      <Label>Min Stock</Label>
      <Input type="number" min={0} {...register('minStock', { valueAsNumber: true })} />
    </div>
    <div>
      <Label>Max Stock (optional)</Label>
      <Input type="number" min={0} {...register('maxStock', { valueAsNumber: true })} />
    </div>
  </CardContent>
</Card>
```

- [ ] **Step 5: Add dynamic Images section**

```tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>Images</CardTitle>
      <Button type="button" variant="outline" size="sm" onClick={() => setImages(imgs => [...imgs, ''])}>
        Add Image URL
      </Button>
    </div>
  </CardHeader>
  <CardContent className="space-y-2">
    {images.map((url, i) => (
      <div key={i} className="flex gap-2">
        <Input
          placeholder="https://example.com/image.jpg"
          value={url}
          onChange={e => setImages(imgs => imgs.map((v, j) => j === i ? e.target.value : v))}
        />
        <Button type="button" variant="ghost" size="sm" onClick={() => setImages(imgs => imgs.filter((_, j) => j !== i))}>
          Remove
        </Button>
      </div>
    ))}
    {images.length === 0 && <p className="text-sm text-muted-foreground">No images added</p>}
  </CardContent>
</Card>
```

- [ ] **Step 6: Add dynamic Attributes section**

```tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>Attributes</CardTitle>
      <Button type="button" variant="outline" size="sm"
        onClick={() => setAttributes(attrs => [...attrs, { name: '', value: '', unit: '' }])}>
        Add Attribute
      </Button>
    </div>
  </CardHeader>
  <CardContent className="space-y-2">
    {attributes.map((attr, i) => (
      <div key={i} className="grid grid-cols-3 gap-2 items-end">
        <div>
          <Label className="text-xs">Name</Label>
          <Input
            placeholder="e.g. Color"
            value={attr.name}
            onChange={e => setAttributes(attrs => attrs.map((a, j) => j === i ? { ...a, name: e.target.value } : a))}
          />
        </div>
        <div>
          <Label className="text-xs">Value</Label>
          <Input
            placeholder="e.g. Red"
            value={attr.value}
            onChange={e => setAttributes(attrs => attrs.map((a, j) => j === i ? { ...a, value: e.target.value } : a))}
          />
        </div>
        <div className="flex gap-1">
          <div className="flex-1">
            <Label className="text-xs">Unit (opt.)</Label>
            <Input
              placeholder="e.g. mm"
              value={attr.unit}
              onChange={e => setAttributes(attrs => attrs.map((a, j) => j === i ? { ...a, unit: e.target.value } : a))}
            />
          </div>
          <Button type="button" variant="ghost" size="sm" className="self-end"
            onClick={() => setAttributes(attrs => attrs.filter((_, j) => j !== i))}>
            ✕
          </Button>
        </div>
      </div>
    ))}
  </CardContent>
</Card>
```

- [ ] **Step 7: Fix submit payload**

```typescript
const onSubmit = async (data: ProductFormData) => {
  const payload = {
    name: data.name,
    code: data.code,
    type: data.type,
    uomId: data.uomId,
    barcode: data.barcode || undefined,
    description: data.description || undefined,
    sellingPrice: data.sellingPrice || undefined,
    reorderLevel: data.reorderLevel || 0,
    minStock: data.minStock || 0,
    maxStock: data.maxStock || undefined,
    images: images.filter(url => url.trim() !== ''),
    attributes: attributes.filter(a => a.name && a.value).map(a => ({
      name: a.name,
      value: a.value,
      unit: a.unit || undefined,
    })),
    isActive: true,
  }
  await createMutation.mutateAsync(payload)
  router.push('/dashboard/products')
}
```

- [ ] **Step 8: Fix UOM selector to use `useUOMsDropdown`**

```tsx
<Select value={watch('uomId')} onValueChange={val => setValue('uomId', val)}>
  <SelectTrigger>
    <SelectValue placeholder="Select unit of measure" />
  </SelectTrigger>
  <SelectContent>
    {uoms.map(u => (
      <SelectItem key={u.id} value={u.id}>{u.name} ({u.symbol})</SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 9: Compile and commit**

```powershell
cd frontend; npx tsc --noEmit 2>&1 | Select-String "products/add"
git add frontend/app/dashboard/products/add/page.tsx
git commit -m "feat(products): rebuild add form — type/barcode/stock/images/attributes, fix payload"
```

---

### Task 11: Build Product detail page (`products/[id]/page.tsx`)

**Files:**
- Modify: `frontend/app/dashboard/products/[id]/page.tsx` (currently a stub)

- [ ] **Step 1: Write the detail page**

Replace the entire stub with:

```tsx
'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Package, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useProduct, useToggleProductActive } from '@/hooks/useProducts'
import type { Product } from '@/types/common'

const TYPE_LABELS: Record<string, string> = {
  FINISHED_GOOD: 'Finished Good',
  SEMI_FINISHED: 'Semi-Finished',
  CONSUMABLE: 'Consumable',
  SERVICE: 'Service',
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: product, isLoading } = useProduct(id)
  const toggleMutation = useToggleProductActive()

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!product) return <div className="p-8 text-muted-foreground">Product not found</div>

  const currentStock = product.currentStock ?? 0
  const stockBadge = () => {
    if (currentStock <= 0) return <Badge variant="destructive">Out of Stock</Badge>
    if (currentStock <= product.reorderLevel) return <Badge className="bg-amber-100 text-amber-800">Low Stock</Badge>
    if (product.maxStock && currentStock >= product.maxStock) return <Badge className="bg-blue-100 text-blue-800">At Capacity</Badge>
    return <Badge variant="outline">{currentStock} in stock</Badge>
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight">{product.name}</h2>
          <p className="text-muted-foreground font-mono text-sm">{product.code}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => toggleMutation.mutate(product.id)}
          disabled={toggleMutation.isPending}
        >
          {product.isActive ? <ToggleRight className="h-4 w-4 mr-2 text-green-600" /> : <ToggleLeft className="h-4 w-4 mr-2 text-gray-400" />}
          {product.isActive ? 'Active' : 'Inactive'}
        </Button>
        <Button onClick={() => router.push(`/dashboard/products/${id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" /> Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-muted-foreground">Type</p><Badge variant="outline">{TYPE_LABELS[product.type] ?? product.type}</Badge></div>
            <div><p className="text-muted-foreground">UOM</p><p className="font-medium">{product.uom?.name} ({product.uom?.symbol})</p></div>
            {product.barcode && <div><p className="text-muted-foreground">Barcode</p><p className="font-mono">{product.barcode}</p></div>}
            {product.sellingPrice && <div><p className="text-muted-foreground">Selling Price</p><p className="font-medium">{parseFloat(product.sellingPrice).toLocaleString()}</p></div>}
            {product.description && <div className="col-span-2"><p className="text-muted-foreground">Description</p><p>{product.description}</p></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Stock</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current</span>
              {stockBadge()}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Reorder at</span>
              <span>{product.reorderLevel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Min</span>
              <span>{product.minStock}</span>
            </div>
            {product.maxStock && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Max</span>
                <span>{product.maxStock}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {product.images && product.images.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Images</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {product.images.map((url, i) => (
              <img key={i} src={url} alt={`${product.name} ${i + 1}`}
                className="h-24 w-24 rounded object-cover border" />
            ))}
          </CardContent>
        </Card>
      )}

      {product.attributes && product.attributes.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Attributes</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.attributes.map(attr => (
                  <TableRow key={attr.id}>
                    <TableCell className="font-medium">{attr.name}</TableCell>
                    <TableCell>{attr.value}</TableCell>
                    <TableCell className="text-muted-foreground">{attr.unit ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

Note: This page links to a `/dashboard/products/${id}/edit` route — that can be a future task. For now the Edit button navigates there; if the route doesn't exist yet it will 404, which is acceptable.

- [ ] **Step 2: Compile and commit**

```powershell
cd frontend; npx tsc --noEmit 2>&1 | Select-String "products/\[id\]"
git add "frontend/app/dashboard/products/[id]/page.tsx"
git commit -m "feat(products): implement detail page — type badge, stock levels, images, attributes"
```

---

## Phase 4: Raw Materials (Build from Scratch)

### Task 12: Create Raw Material hooks (`useRawMaterials.ts`)

**Files:**
- Create: `frontend/hooks/useRawMaterials.ts`

- [ ] **Step 1: Write the file**

Create `frontend/hooks/useRawMaterials.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import type { RawMaterial } from '@/types/common'

export type { RawMaterial }

export interface RawMaterialFilters {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
}

export function useRawMaterials(filters: RawMaterialFilters = {}) {
    return useQuery({
        queryKey: ['raw-materials', filters],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/raw-materials', { params: filters })
            return response?.data || response
        }
    })
}

export function useRawMaterial(id: string) {
    return useQuery({
        queryKey: ['raw-materials', id],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/raw-materials/${id}`)
            return (response?.data || response) as RawMaterial
        },
        enabled: !!id
    })
}

export function useRawMaterialsDropdown() {
    return useQuery({
        queryKey: ['raw-materials', 'dropdown'],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/raw-materials/dropdown')
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as {
                id: string; name: string; code: string;
                uom?: { id: string; name: string; symbol: string }
            }[]
        }
    })
}

export function useCreateRawMaterial() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: {
            name: string
            code: string
            uomId: string
            description?: string
            reorderLevel?: number
            lastPurchasePrice?: number
            isActive?: boolean
        }) => {
            const { data: response } = await apiClient.post('/raw-materials', data)
            return response?.data || response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['raw-materials'] })
            toast.success('Raw material created')
        }
    })
}

export function useUpdateRawMaterial() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: {
            id: string
            data: Partial<{
                name: string; code: string; uomId: string; description: string;
                reorderLevel: number; lastPurchasePrice: number; isActive: boolean
            }>
        }) => {
            const { data: response } = await apiClient.patch(`/raw-materials/${id}`, data)
            return response?.data || response
        },
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['raw-materials'] })
            queryClient.invalidateQueries({ queryKey: ['raw-materials', id] })
            toast.success('Raw material updated')
        }
    })
}

export function useDeleteRawMaterial() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/raw-materials/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['raw-materials'] })
            toast.success('Raw material deleted')
        }
    })
}

export function useToggleRawMaterialActive() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { data: response } = await apiClient.patch(`/raw-materials/${id}/toggle-active`)
            return response?.data || response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['raw-materials'] })
            toast.success('Raw material status updated')
        }
    })
}
```

- [ ] **Step 2: Compile check**

```powershell
cd frontend; npx tsc --noEmit 2>&1 | Select-String "useRawMaterials"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git add frontend/hooks/useRawMaterials.ts
git commit -m "feat(raw-materials): add useRawMaterials hook — full CRUD, dropdown, toggle-active"
```

---

### Task 13: Create Raw Material Batch hooks (`useRawMaterialBatches.ts`)

**Files:**
- Create: `frontend/hooks/useRawMaterialBatches.ts`

- [ ] **Step 1: Write the file**

Create `frontend/hooks/useRawMaterialBatches.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import type { RawMaterialBatch, RawMaterialBatchConsumption } from '@/types/common'

export type { RawMaterialBatch, RawMaterialBatchConsumption }

export interface BatchFilters {
    rawMaterialId?: string
    siteId?: string
    grnId?: string
    status?: 'ACTIVE' | 'PARTIAL' | 'CONSUMED' | 'REJECTED'
    expiringDays?: number
    search?: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
}

export function useRawMaterialBatches(filters: BatchFilters = {}) {
    return useQuery({
        queryKey: ['raw-material-batches', filters],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/raw-material-batches', { params: filters })
            return response?.data || response
        }
    })
}

export function useRawMaterialBatch(id: string) {
    return useQuery({
        queryKey: ['raw-material-batches', id],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/raw-material-batches/${id}`)
            return (response?.data || response) as RawMaterialBatch
        },
        enabled: !!id
    })
}

export function useExpiringBatches(days: number = 30) {
    return useQuery({
        queryKey: ['raw-material-batches', 'expiring', days],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/raw-material-batches/expiring', { params: { days } })
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as RawMaterialBatch[]
        }
    })
}

export function useFIFOAllocation(rawMaterialId: string, quantity?: number) {
    return useQuery({
        queryKey: ['raw-material-batches', 'fifo', rawMaterialId, quantity],
        queryFn: async () => {
            const params = quantity !== undefined ? { quantity } : {}
            const { data: response } = await apiClient.get(
                `/raw-material-batches/fifo/${rawMaterialId}`,
                { params }
            )
            return response?.data || response
        },
        enabled: !!rawMaterialId
    })
}

export function useBatchConsumptions(batchId: string) {
    return useQuery({
        queryKey: ['raw-material-batches', batchId, 'consumptions'],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/raw-material-batches/${batchId}/consumptions`)
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as RawMaterialBatchConsumption[]
        },
        enabled: !!batchId
    })
}

export function useBulkCreateBatches() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (batches: Array<{
            rawMaterialId: string; grnItemId: string; siteId: string;
            receivedQuantity: number; unitCost: number; receivedDate: string;
            manufacturingDate?: string; expiryDate?: string; notes?: string
        }>) => {
            const { data: response } = await apiClient.post('/raw-material-batches/bulk', { batches })
            return response?.data || response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['raw-material-batches'] })
            toast.success('Batches created')
        }
    })
}

export function useUpdateBatch() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: {
            id: string
            data: { status?: 'REJECTED'; notes?: string }
        }) => {
            const { data: response } = await apiClient.patch(`/raw-material-batches/${id}`, data)
            return response?.data || response
        },
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['raw-material-batches'] })
            queryClient.invalidateQueries({ queryKey: ['raw-material-batches', id] })
            toast.success('Batch updated')
        }
    })
}

export function useConsumeFromBatch() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ batchId, data }: {
            batchId: string
            data: {
                consumedQuantity: number
                referenceType?: string
                referenceId?: string
                notes?: string
            }
        }) => {
            const { data: response } = await apiClient.post(`/raw-material-batches/${batchId}/consume`, data)
            return response?.data || response
        },
        onSuccess: (_, { batchId }) => {
            queryClient.invalidateQueries({ queryKey: ['raw-material-batches'] })
            queryClient.invalidateQueries({ queryKey: ['raw-material-batches', batchId] })
            toast.success('Consumption recorded')
        }
    })
}
```

- [ ] **Step 2: Compile and commit**

```powershell
cd frontend; npx tsc --noEmit 2>&1 | Select-String "useRawMaterialBatches"
git add frontend/hooks/useRawMaterialBatches.ts
git commit -m "feat(raw-materials): add useRawMaterialBatches hook — FIFO, consume, expiring"
```

---

### Task 14: Create Raw Materials pages directory structure

**Files:**
- Create: `frontend/app/dashboard/raw-materials/page.tsx`
- Create: `frontend/app/dashboard/raw-materials/add/page.tsx`

- [ ] **Step 1: Create the directory structure**

```powershell
New-Item -ItemType Directory -Force "frontend/app/dashboard/raw-materials"
New-Item -ItemType Directory -Force "frontend/app/dashboard/raw-materials/add"
New-Item -ItemType Directory -Force "frontend/app/dashboard/raw-materials/[id]"
New-Item -ItemType Directory -Force "frontend/app/dashboard/raw-materials/[id]/edit"
New-Item -ItemType Directory -Force "frontend/app/dashboard/raw-materials/batches/[batchId]"
```

- [ ] **Step 2: Write the Raw Materials list page**

Create `frontend/app/dashboard/raw-materials/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRawMaterials, useDeleteRawMaterial, useToggleRawMaterialActive } from '@/hooks/useRawMaterials'
import type { RawMaterial } from '@/types/common'
import { toast } from 'react-hot-toast'

export default function RawMaterialsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined)
  const [page, setPage] = useState(1)

  const { data: responseData, isLoading } = useRawMaterials({
    search: search || undefined,
    isActive: isActiveFilter,
    page,
    limit: 10
  })

  const deleteMutation = useDeleteRawMaterial()
  const toggleMutation = useToggleRawMaterialActive()

  const materials: RawMaterial[] = Array.isArray(responseData) ? responseData : responseData?.data ?? []
  const meta = Array.isArray(responseData) ? null : responseData?.meta

  const handleDelete = async (rm: RawMaterial) => {
    if (!confirm(`Delete "${rm.name}"? This cannot be undone.`)) return
    try {
      await deleteMutation.mutateAsync(rm.id)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete')
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Raw Materials</h2>
          <p className="text-muted-foreground">Manage raw material master catalogue</p>
        </div>
        <Button onClick={() => router.push('/dashboard/raw-materials/add')}>
          <Plus className="h-4 w-4 mr-2" /> Add Raw Material
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, code…"
            className="pl-8"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select
          value={isActiveFilter === undefined ? 'all' : isActiveFilter ? 'active' : 'inactive'}
          onValueChange={val => { setIsActiveFilter(val === 'all' ? undefined : val === 'active'); setPage(1) }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Reorder</TableHead>
                <TableHead>Last Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : materials.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No raw materials found</TableCell></TableRow>
              ) : materials.map((rm: RawMaterial) => (
                <TableRow
                  key={rm.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/dashboard/raw-materials/${rm.id}`)}
                >
                  <TableCell className="font-medium">
                    {rm.currentStock <= rm.reorderLevel && (
                      <AlertTriangle className="h-3 w-3 text-amber-500 inline mr-1" />
                    )}
                    {rm.name}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{rm.code}</TableCell>
                  <TableCell>{rm.uom?.symbol ?? '—'}</TableCell>
                  <TableCell>
                    {rm.currentStock <= 0
                      ? <Badge variant="destructive">0</Badge>
                      : rm.currentStock <= rm.reorderLevel
                        ? <Badge className="bg-amber-100 text-amber-800">{rm.currentStock}</Badge>
                        : <span>{rm.currentStock}</span>
                    }
                  </TableCell>
                  <TableCell>{rm.reorderLevel}</TableCell>
                  <TableCell>
                    {rm.lastPurchasePrice ? parseFloat(rm.lastPurchasePrice).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={rm.isActive ? 'default' : 'secondary'}>
                      {rm.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm"
                        onClick={() => router.push(`/dashboard/raw-materials/${rm.id}/edit`)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm"
                        onClick={() => toggleMutation.mutate(rm.id)}
                        disabled={toggleMutation.isPending}>
                        {rm.isActive
                          ? <ToggleRight className="h-4 w-4 text-green-600" />
                          : <ToggleLeft className="h-4 w-4 text-gray-400" />
                        }
                      </Button>
                      <Button variant="ghost" size="sm"
                        onClick={() => handleDelete(rm)}
                        disabled={deleteMutation.isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {meta && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {meta.total} total · page {meta.page} of {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={!meta.hasPrev}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!meta.hasNext}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Compile and commit**

```powershell
cd frontend; npx tsc --noEmit 2>&1 | Select-String "raw-materials/page"
git add frontend/app/dashboard/raw-materials/page.tsx
git commit -m "feat(raw-materials): add list page — stock badges, low-stock indicator, toggle/delete"
```

---

### Task 15: Create Raw Material add and edit forms

**Files:**
- Create: `frontend/app/dashboard/raw-materials/add/page.tsx`
- Create: `frontend/app/dashboard/raw-materials/[id]/edit/page.tsx`

- [ ] **Step 1: Write the add form**

Create `frontend/app/dashboard/raw-materials/add/page.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateRawMaterial } from '@/hooks/useRawMaterials'
import { useUOMsDropdown } from '@/hooks/useMasterData'

interface RawMaterialFormData {
  name: string
  code: string
  uomId: string
  description?: string
  reorderLevel?: number
  lastPurchasePrice?: number
  isActive: boolean
}

export default function AddRawMaterialPage() {
  const router = useRouter()
  const createMutation = useCreateRawMaterial()
  const { data: uoms = [] } = useUOMsDropdown()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RawMaterialFormData>({
    defaultValues: { isActive: true, reorderLevel: 0 }
  })

  const onSubmit = async (data: RawMaterialFormData) => {
    await createMutation.mutateAsync({
      name: data.name,
      code: data.code,
      uomId: data.uomId,
      description: data.description || undefined,
      reorderLevel: data.reorderLevel || 0,
      lastPurchasePrice: data.lastPurchasePrice || undefined,
      isActive: data.isActive,
    })
    router.push('/dashboard/raw-materials')
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Add Raw Material</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
        <Card>
          <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input {...register('name', { required: 'Name is required' })} placeholder="e.g. Sunflower Oil" />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label>Code <span className="text-destructive">*</span></Label>
              <Input {...register('code', { required: 'Code is required' })}
                placeholder="e.g. SUNFLOWER-OIL"
                onChange={e => setValue('code', e.target.value.toUpperCase().replace(/\s+/g, '-'))} />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-formatted: uppercase, spaces become hyphens (e.g. SUNFLOWER-OIL)
              </p>
              {errors.code && <p className="text-sm text-destructive mt-1">{errors.code.message}</p>}
            </div>

            <div>
              <Label>Unit of Measure <span className="text-destructive">*</span></Label>
              <Select value={watch('uomId')} onValueChange={val => setValue('uomId', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select UOM" />
                </SelectTrigger>
                <SelectContent>
                  {uoms.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.symbol})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.uomId && <p className="text-sm text-destructive mt-1">UOM is required</p>}
            </div>

            <div>
              <Label>Description</Label>
              <Textarea {...register('description')} placeholder="Optional description" rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Stock &amp; Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Reorder Level</Label>
                <Input type="number" min={0} {...register('reorderLevel', { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Last Purchase Price</Label>
                <Input type="number" min={0} step="0.01" {...register('lastPurchasePrice', { valueAsNumber: true })} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Active</p>
                <p className="text-sm text-muted-foreground">Material is available for use in production</p>
              </div>
              <Switch
                checked={watch('isActive')}
                onCheckedChange={val => setValue('isActive', val)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Raw Material
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Write the edit form**

Create `frontend/app/dashboard/raw-materials/[id]/edit/page.tsx`:

```tsx
'use client'

import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRawMaterial, useUpdateRawMaterial } from '@/hooks/useRawMaterials'
import { useUOMsDropdown } from '@/hooks/useMasterData'

interface RawMaterialFormData {
  name: string
  code: string
  uomId: string
  description?: string
  reorderLevel?: number
  lastPurchasePrice?: number
  isActive: boolean
}

export default function EditRawMaterialPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: rm, isLoading } = useRawMaterial(id)
  const updateMutation = useUpdateRawMaterial()
  const { data: uoms = [] } = useUOMsDropdown()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<RawMaterialFormData>()

  useEffect(() => {
    if (rm) {
      reset({
        name: rm.name,
        code: rm.code,
        uomId: rm.uomId,
        description: rm.description,
        reorderLevel: rm.reorderLevel,
        lastPurchasePrice: rm.lastPurchasePrice ? parseFloat(rm.lastPurchasePrice) : undefined,
        isActive: rm.isActive,
      })
    }
  }, [rm, reset])

  const onSubmit = async (data: RawMaterialFormData) => {
    await updateMutation.mutateAsync({
      id,
      data: {
        name: data.name,
        code: data.code,
        uomId: data.uomId,
        description: data.description || undefined,
        reorderLevel: data.reorderLevel || 0,
        lastPurchasePrice: data.lastPurchasePrice || undefined,
        isActive: data.isActive,
      }
    })
    router.push(`/dashboard/raw-materials/${id}`)
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Edit Raw Material</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
        <Card>
          <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input {...register('name', { required: 'Name is required' })} />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label>Code <span className="text-destructive">*</span></Label>
              <Input {...register('code', { required: 'Code is required' })}
                onChange={e => setValue('code', e.target.value.toUpperCase().replace(/\s+/g, '-'))} />
              <p className="text-xs text-muted-foreground mt-1">Uppercase, spaces become hyphens</p>
              {errors.code && <p className="text-sm text-destructive mt-1">{errors.code.message}</p>}
            </div>

            <div>
              <Label>Unit of Measure <span className="text-destructive">*</span></Label>
              <Select value={watch('uomId')} onValueChange={val => setValue('uomId', val)}>
                <SelectTrigger><SelectValue placeholder="Select UOM" /></SelectTrigger>
                <SelectContent>
                  {uoms.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.symbol})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea {...register('description')} rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Stock &amp; Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Reorder Level</Label>
                <Input type="number" min={0} {...register('reorderLevel', { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Last Purchase Price</Label>
                <Input type="number" min={0} step="0.01" {...register('lastPurchasePrice', { valueAsNumber: true })} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Active</p>
                <p className="text-sm text-muted-foreground">Material is available for use in production</p>
              </div>
              <Switch
                checked={watch('isActive')}
                onCheckedChange={val => setValue('isActive', val)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Compile and commit**

```powershell
cd frontend; npx tsc --noEmit 2>&1 | Select-String "raw-materials/add|raw-materials/\[id\]/edit"
git add frontend/app/dashboard/raw-materials/add/page.tsx "frontend/app/dashboard/raw-materials/[id]/edit/page.tsx"
git commit -m "feat(raw-materials): add create and edit forms with UOM dropdown"
```

---

### Task 16: Create Raw Material detail page with tabs

**Files:**
- Create: `frontend/app/dashboard/raw-materials/[id]/page.tsx`

- [ ] **Step 1: Write the detail page**

Create `frontend/app/dashboard/raw-materials/[id]/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRawMaterial } from '@/hooks/useRawMaterials'
import { useRawMaterialBatches, useFIFOAllocation } from '@/hooks/useRawMaterialBatches'
import type { RawMaterial, RawMaterialBatch } from '@/types/common'

const STATUS_VARIANTS: Record<string, string> = {
  ACTIVE: 'default',
  PARTIAL: 'secondary',
  CONSUMED: 'outline',
  REJECTED: 'destructive',
}

function BatchesTab({ rawMaterialId }: { rawMaterialId: string }) {
  const [page, setPage] = useState(1)
  const { data: responseData, isLoading } = useRawMaterialBatches({ rawMaterialId, page, limit: 10 })
  const router = useRouter()

  const batches: RawMaterialBatch[] = Array.isArray(responseData) ? responseData : responseData?.data ?? []
  const meta = Array.isArray(responseData) ? null : responseData?.meta

  if (isLoading) return <p className="text-muted-foreground p-4">Loading batches…</p>

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Batch #</TableHead>
            <TableHead>Received</TableHead>
            <TableHead>Consumed</TableHead>
            <TableHead>Available</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No batches found</TableCell></TableRow>
          ) : batches.map(batch => (
            <TableRow key={batch.id} className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/dashboard/raw-materials/batches/${batch.id}`)}>
              <TableCell className="font-mono text-xs">{batch.batchNumber}</TableCell>
              <TableCell>{batch.receivedQuantity}</TableCell>
              <TableCell>{batch.consumedQuantity}</TableCell>
              <TableCell>
                {batch.availableQuantity <= 0
                  ? <Badge variant="outline" className="text-muted-foreground">0</Badge>
                  : batch.availableQuantity
                }
              </TableCell>
              <TableCell>
                {batch.expiryDate
                  ? new Date(batch.expiryDate).toLocaleDateString()
                  : <span className="text-muted-foreground">—</span>
                }
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[batch.status] as any ?? 'outline'}>
                  {batch.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {meta && (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={!meta.hasPrev}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!meta.hasNext}>Next</Button>
        </div>
      )}
    </div>
  )
}

function FIFOTab({ rawMaterialId, uomSymbol }: { rawMaterialId: string; uomSymbol?: string }) {
  const [qty, setQty] = useState<number>(0)
  const [queryQty, setQueryQty] = useState<number | undefined>(undefined)
  const { data: allocation, isLoading } = useFIFOAllocation(rawMaterialId, queryQty)

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div>
          <Label>Quantity to Allocate ({uomSymbol})</Label>
          <Input type="number" min={0} step="0.01" value={qty}
            onChange={e => setQty(parseFloat(e.target.value) || 0)} className="w-40" />
        </div>
        <Button onClick={() => setQueryQty(qty)} disabled={qty <= 0}>Calculate FIFO</Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Calculating…</p>}
      {allocation && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Allocation Plan:</p>
          <pre className="text-xs bg-muted rounded p-3 overflow-auto">
            {JSON.stringify(allocation, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function RawMaterialDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: rm, isLoading } = useRawMaterial(id)

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!rm) return <div className="p-8 text-muted-foreground">Raw material not found</div>

  const isLowStock = rm.currentStock <= rm.reorderLevel

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">{rm.name}</h2>
            {isLowStock && <AlertTriangle className="h-5 w-5 text-amber-500" />}
          </div>
          <p className="text-muted-foreground font-mono text-sm">{rm.code}</p>
        </div>
        <Badge variant={rm.isActive ? 'default' : 'secondary'}>
          {rm.isActive ? 'Active' : 'Inactive'}
        </Badge>
        <Button onClick={() => router.push(`/dashboard/raw-materials/${id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" /> Edit
        </Button>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
          <TabsTrigger value="fifo">FIFO View</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div><p className="text-muted-foreground">UOM</p><p className="font-medium">{rm.uom?.name} ({rm.uom?.symbol})</p></div>
                {rm.description && <div><p className="text-muted-foreground">Description</p><p>{rm.description}</p></div>}
                <div><p className="text-muted-foreground">Last Purchase Price</p>
                  <p className="font-medium">
                    {rm.lastPurchasePrice ? parseFloat(rm.lastPurchasePrice).toLocaleString() : '—'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Stock</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Stock</span>
                  <span className={isLowStock ? 'text-amber-600 font-semibold' : 'font-medium'}>
                    {rm.currentStock} {rm.uom?.symbol}
                    {isLowStock && ' ⚠'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reorder Level</span>
                  <span>{rm.reorderLevel} {rm.uom?.symbol}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="batches">
          <Card>
            <CardContent className="p-0">
              <BatchesTab rawMaterialId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fifo">
          <Card>
            <CardHeader><CardTitle>FIFO Allocation Calculator</CardTitle></CardHeader>
            <CardContent>
              <FIFOTab rawMaterialId={id} uomSymbol={rm.uom?.symbol} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 2: Compile and commit**

```powershell
cd frontend; npx tsc --noEmit 2>&1 | Select-String "raw-materials/\[id\]/page"
git add "frontend/app/dashboard/raw-materials/[id]/page.tsx"
git commit -m "feat(raw-materials): add detail page — Info/Batches/FIFO tabs"
```

---

### Task 17: Create Batch detail page

**Files:**
- Create: `frontend/app/dashboard/raw-materials/batches/[batchId]/page.tsx`

- [ ] **Step 1: Create directory and write the page**

```powershell
New-Item -ItemType Directory -Force "frontend/app/dashboard/raw-materials/batches/[batchId]"
```

Create `frontend/app/dashboard/raw-materials/batches/[batchId]/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { useRawMaterialBatch, useBatchConsumptions, useConsumeFromBatch, useUpdateBatch } from '@/hooks/useRawMaterialBatches'
import type { RawMaterialBatch } from '@/types/common'

const STATUS_VARIANTS: Record<string, string> = {
  ACTIVE: 'default',
  PARTIAL: 'secondary',
  CONSUMED: 'outline',
  REJECTED: 'destructive',
}

export default function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>()
  const router = useRouter()
  const { data: batch, isLoading } = useRawMaterialBatch(batchId)
  const { data: consumptions = [] } = useBatchConsumptions(batchId)
  const consumeMutation = useConsumeFromBatch()
  const updateMutation = useUpdateBatch()

  const [showConsumeModal, setShowConsumeModal] = useState(false)
  const [consumeQty, setConsumeQty] = useState<number>(0)
  const [consumeRef, setConsumeRef] = useState('')
  const [consumeNotes, setConsumeNotes] = useState('')

  const canConsume = batch?.status === 'ACTIVE' || batch?.status === 'PARTIAL'

  const handleConsume = async () => {
    if (!consumeQty || consumeQty <= 0) return
    await consumeMutation.mutateAsync({
      batchId,
      data: {
        consumedQuantity: consumeQty,
        referenceId: consumeRef || undefined,
        notes: consumeNotes || undefined,
      }
    })
    setShowConsumeModal(false)
    setConsumeQty(0)
    setConsumeRef('')
    setConsumeNotes('')
  }

  const handleReject = async () => {
    if (!confirm('Mark this batch as REJECTED? This cannot be undone.')) return
    await updateMutation.mutateAsync({ id: batchId, data: { status: 'REJECTED' } })
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!batch) return <div className="p-8 text-muted-foreground">Batch not found</div>

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight font-mono">{batch.batchNumber}</h2>
          <p className="text-muted-foreground">{batch.rawMaterial?.name} · {batch.site?.name}</p>
        </div>
        <Badge variant={STATUS_VARIANTS[batch.status] as any ?? 'outline'}>{batch.status}</Badge>
        {canConsume && (
          <Button onClick={() => setShowConsumeModal(true)}>Record Consumption</Button>
        )}
        {batch.status !== 'REJECTED' && batch.status !== 'CONSUMED' && (
          <Button variant="destructive" onClick={handleReject} disabled={updateMutation.isPending}>
            Mark Rejected
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Batch Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-muted-foreground">Received Date</p><p className="font-medium">{new Date(batch.receivedDate).toLocaleDateString()}</p></div>
            <div><p className="text-muted-foreground">Unit Cost</p><p className="font-medium">{batch.unitCost.toLocaleString()}</p></div>
            {batch.manufacturingDate && <div><p className="text-muted-foreground">Manufacture Date</p><p className="font-medium">{new Date(batch.manufacturingDate).toLocaleDateString()}</p></div>}
            {batch.expiryDate && <div><p className="text-muted-foreground">Expiry Date</p><p className="font-medium">{new Date(batch.expiryDate).toLocaleDateString()}</p></div>}
            {batch.grnItem?.grn && (
              <div className="col-span-2">
                <p className="text-muted-foreground">GRN Reference</p>
                <p className="font-medium">{batch.grnItem.grn.receivingNumber} · {batch.grnItem.grn.supplier?.name}</p>
              </div>
            )}
            {batch.notes && <div className="col-span-2"><p className="text-muted-foreground">Notes</p><p>{batch.notes}</p></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quantities</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Received</span><span>{batch.receivedQuantity}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Consumed</span><span>{batch.consumedQuantity}</span></div>
            <div className="flex justify-between border-t pt-2"><span className="font-medium">Available</span><span className="font-bold">{batch.availableQuantity}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Consumption History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Remaining After</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consumptions.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No consumptions recorded</TableCell></TableRow>
              ) : [...consumptions].sort((a, b) => new Date(b.consumedDate).getTime() - new Date(a.consumedDate).getTime()).map(c => (
                <TableRow key={c.id}>
                  <TableCell>{new Date(c.consumedDate).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{c.consumedQuantity}</TableCell>
                  <TableCell>{c.remainingAfter}</TableCell>
                  <TableCell className="text-muted-foreground">{c.referenceId ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.notes ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showConsumeModal} onOpenChange={setShowConsumeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Consumption</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Quantity (max: {batch.availableQuantity})</Label>
              <Input type="number" min={0.01} max={batch.availableQuantity} step="0.01"
                value={consumeQty} onChange={e => setConsumeQty(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Reference ID (optional)</Label>
              <Input placeholder="e.g. Production Order PO-001" value={consumeRef}
                onChange={e => setConsumeRef(e.target.value)} />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={consumeNotes} onChange={e => setConsumeNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConsumeModal(false)}>Cancel</Button>
            <Button
              onClick={handleConsume}
              disabled={consumeMutation.isPending || consumeQty <= 0 || consumeQty > batch.availableQuantity}
            >
              {consumeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Compile and commit**

```powershell
cd frontend; npx tsc --noEmit 2>&1 | Select-String "batches/\[batchId\]"
git add "frontend/app/dashboard/raw-materials/batches/[batchId]/page.tsx"
git commit -m "feat(raw-materials): add batch detail page — status, quantities, consumption history, consume modal"
```

---

### Task 18: Final compile pass and smoke test

- [ ] **Step 1: Run full TypeScript check**

```powershell
cd frontend; npx tsc --noEmit 2>&1
```

Expected: 0 errors. If there are remaining errors, fix them inline before moving on.

- [ ] **Step 2: Run lint**

```powershell
cd frontend; npm run lint
```

Fix any lint errors (unused imports are the most common after this refactor).

- [ ] **Step 3: Test the critical paths in the browser**

Start the dev server:
```powershell
# From repo root
npm run dev
```

Check these routes in order:
1. `/dashboard/products/uoms` — grouped tabs, no Add button, lock icon on system UOMs
2. `/dashboard/suppliers` — isActive filter, no Code/Balance columns
3. `/dashboard/suppliers/create` — no contactPerson field, opening balance section visible when expanded
4. `/dashboard/products` — Type filter dropdown, isActive toggle, stock badges visible
5. `/dashboard/products/add` — Type selector, no Category/Cost/Supplier fields, Images/Attributes sections
6. `/dashboard/raw-materials` — lists raw materials with low-stock indicator
7. `/dashboard/raw-materials/add` — form submits without error
8. `/dashboard/raw-materials/{id}` — Info/Batches/FIFO tabs

- [ ] **Step 4: Final commit**

```powershell
git add -A
git commit -m "feat: frontend API alignment complete — Products, Suppliers, UOMs, Raw Materials"
```

---

## Self-Review

**Spec coverage:**
- Products: `Product` interface ✓, `ProductFilters` ✓, mutations ✓, dropdown/toggle hooks ✓, remove deleted/restore ✓, add page ✓, list page ✓, detail page ✓
- Raw Materials: types ✓, `useRawMaterials` ✓, `useRawMaterialBatches` ✓, list ✓, add ✓, edit ✓, detail (3 tabs) ✓, batch detail ✓
- Suppliers: interface ✓, filters ✓, dropdown/toggle hooks ✓, ledger summary fields ✓, debit/credit string ✓, list page ✓, create page ✓, detail tabs ✓
- UOMs: grouped response ✓, `useUOMsDropdown` ✓, remove `useCreateUOM` ✓, UOMs page rewrite ✓

**Decimal handling:** `sellingPrice` (Product), `lastPurchasePrice` (RawMaterial), `openingBalanceAmount` (Supplier), `debit`/`credit` (SupplierTransaction) — all typed as `string` with `parseFloat()` at display/arithmetic sites.

**`hasNext`/`hasPrev`:** Used in Product list (Task 9), Raw Materials list (Task 14), Batches tab (Task 16).

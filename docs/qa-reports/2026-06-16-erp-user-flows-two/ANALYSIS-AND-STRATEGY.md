# QA Round 2 — Analysis & Fix Strategy (ERP User Flow Issues Two)

**Source:** `ERP-User-Flow-Issues-Two.docx` · **31 bugs** · screenshots in `./screenshots/`
**Status:** analyzed, awaiting go-ahead to implement.

Legend: **FE** = frontend-only · **BE** = needs backend · **FE+BE** = both.

---

## A. Count/stat cards ignore the active search/filter (FE)

- **#1 UOM count not updating after search** — tab counts (`Weight (5)…`) come from the *unfiltered* list. Round‑1 we deliberately made them totals (so they don't go to 0); QA now wants them to reflect the search. **Strategy:** add a "showing X of Y" line OR make the tab badge show the filtered count for the active search. *(Confirm desired behavior — it reverses the round‑1 ask.)* File: `app/dashboard/products/uoms/page.tsx`.
- **#17 PO "Total Orders" shows 0** (image10) — `total = data?.meta?.total || data.data.length`; when the hook returns the array directly both are undefined → 0, even though the list renders. **Strategy:** fix the total extraction in `usePurchases`/`purchases/page.tsx` to read meta robustly; also "Pending Delivery" should use the server total, not the current page. File: `app/dashboard/purchases/page.tsx`, `hooks/usePurchases.ts`.
- **#25 Audit Logs count not updating after filters** (image11) — summary cards (Total/UPDATE/DELETE/CREATE) come from `/audit-logs/summary` (global), independent of the list filters. **Strategy:** when a filter is active, show the **filtered list total** (`data.total`) instead of the global summary, or add a "filtered: N" indicator. File: `app/dashboard/audit/page.tsx`.

---

## B. Edit-screen dropdowns not showing data (FE, maybe data)

- **#14 Product edit: Type + UOM empty** (image20) — text fields prefill but Type/UOM don't. Likely `useUOMsDropdown` returns empty OR the Controller value doesn't match an option. **Strategy:** verify UOM dropdown data loads on the edit screen and the `type`/`uomId` Controller values bind; ensure options render before reset. File: `app/dashboard/products/[id]/edit/page.tsx`, `hooks/useMasterData.ts`.
- **#15 Site edit: Location/Manager/Capacity empty** (image7) — Type/Category/Status DO prefill now; Location & Manager show "—" because their option lists are empty (Locations list and/or `/users` not returning data — note `/users` list endpoint currently 400s; the Manager dropdown must use `/users/dropdown`). **Strategy:** confirm `/locations` and `/users/dropdown` return data; bind the Controller values. File: `app/dashboard/sites/[id]/edit/page.tsx`.
- **#19 PO edit: Supplier dropdown empty** — `useSuppliersDropdown` not populating on edit. **Strategy:** verify the suppliers dropdown loads + the supplier value prefills (Controller). File: `app/dashboard/purchases/[id]/edit/page.tsx`.
- **#24 Production Order edit: Site dropdown empty** (image3 shows "— No site —") — `useSitesDropdown` empty OR no sites for tenant. **Strategy:** verify sites dropdown loads; bind value. File: `app/dashboard/production-orders/[id]/edit/page.tsx`.

> Common thread: these edit dropdowns depend on dropdown-data endpoints. First action in implementation = hit each dropdown endpoint live on prod and confirm it returns data; many of these are "data not fetching," not prefill.

---

## C. Soft-deleted records still block re-create (BE)

- **#3 Duplicate Raw Material code after delete+re-add** — unique check counts soft-deleted rows; API returns duplicates. **Strategy (BE):** scope the uniqueness check + list query to `deletedAt: null`. File: `backend/src/raw-materials/*`.
- **#22 "BOM already exists" after delete+re-add** (image8) — same pattern for BOM name. **Strategy (BE):** exclude soft-deleted BOMs from the name-uniqueness check. File: `backend/src/bom/*`.

---

## D. Double-submit on create (FE)

- **#3 + #8** — image2 shows **two** `POST /raw-materials` returning 409. The create button fires twice → duplicate attempt + **success toast shown twice (#8 supplier)**. **Strategy:** disable the submit button while the mutation is pending / guard against double submit across create forms (raw-materials, suppliers, etc.). Files: the create/edit pages' submit handlers.

---

## E. Validation (FE+BE)

- **#7 Raw Material allows Preorder (reorder) Level = 0** — no min validation. **Strategy:** FE add `min > 0` validation + message; (optional BE `@Min(1)` on the DTO if it should be enforced server-side). File: `app/dashboard/raw-materials/add/page.tsx`.
- **#30 Backend validation messages not shown on FE** — e.g. "Duplicate code already exists" returned by BE but FE shows generic/no message. **Strategy:** standardize error toasts to surface `err.response.data.message` everywhere (centralize). Affects multiple create/edit forms.

---

## F. UI / CSS polish (FE)

- **#2 UOM table bottom corners cut on last-row hover** — row hover overflows the rounded card. CSS `overflow-hidden`/`rounded` on the table container.
- **#6 FIFO View card text blurred** — likely a `backdrop-blur`/opacity/transform layer. Remove the blur/transform on those cards.
- **#10 Supplier Ledger "Clear" button misaligned** — flex/spacing fix on the ledger toolbar.
- **#16 Site Add/Edit dropdowns show "—" with invisible label** (image7) — the placeholder "—" + low-contrast label; set a real placeholder + visible label text.
- **#23 Blur overlay on the three-dots action menu** (image1, Waste Management) — dropdown menu has a blur/opacity layer behind the items; remove it.
- **#29 Raw Material name not visible on details screen** — name text missing/low-contrast on RM detail header.
- **#31 "Out of Stock" section alignment breaks after marking product inactive** — layout shifts when status changes. CSS/layout fix on products list.

---

## G. Navigation / redirect (FE)

- **#4 After editing a Raw Material, redirect goes to details instead of list** — change the post-save `router.push` to the list. File: `app/dashboard/raw-materials/[id]/edit/page.tsx`.
- **#21 Purchase Return module not visible** — pages exist (`purchases/returns/list`, `purchases/returns`) and are deployed, but there's **no sidebar link**. **Strategy:** add a "Purchase Returns" item under the Purchases section; verify the page aligns with Nasir's new purchase-return (approvals) backend. File: `components/layout/sidebar.tsx` (+ returns pages).

---

## H. Stale form state (FE)

- **#5 Removed optional Raw Material field reappears on re-edit** — the form `reset()` re-fills from a stale cached value, or empties aren't persisted/sent. **Strategy:** send cleared optional fields as `null` on update and reset from fresh data. File: `raw-materials/[id]/edit`.
- **#26 BOM "Add Raw Material" modal retains data after close+reopen** (image4) — modal state not reset on close. **Strategy:** reset the modal form on open/close.

---

## I. Supplier Ledger (FE)

- **#9 Incorrect total supplier count** — count source mismatched with records. Use the API's count. File: `app/dashboard/suppliers/ledger/page.tsx`.
- **#11 Blank page + loader on every typed letter** — search refetch replaces the whole view with a loader. **Strategy:** keep the list mounted during refetch (use `isFetching`/`keepPreviousData`), debounce the search.
- **#12 White blank screen on invalid search** (image6 shows the proper "No Active Suppliers" empty state) — ensure the empty/`No records` state renders instead of blank on no-results.
- **#13 Export CSV / PDF not downloading** — export handlers not wired/endpoint missing. **Strategy:** verify the export endpoints exist; wire blob download (like the PO PDF). May be FE+BE.

---

## J. Misc (FE / FE+BE)

- **#18 "Add Order Item" does nothing on Add PO** — the old `/dashboard/purchases/add` page (vs the rewritten `/create`). The add-item button on `/add` is broken; the sidebar/links may still point to `/add`. **Strategy:** route "Create PO" to the working `/create` page (already searchable + working), retire/fix `/add`. Files: `purchases/add/page.tsx`, sidebar links.
- **#20 GRN Details Items tab shows `NaN` quantity** — a quantity field is `undefined`/string math. **Strategy:** null-safe `Number(x) || 0` on the GRN item quantity render. File: GRN details page.
- **#27 "Cannot PATCH" on Site status change** — backend `@Patch(":siteId/status")` is **commented out**; FE calls it. **Strategy (FE):** change `useSites` status update to `PATCH /sites/:siteId` with `{ status }` (route exists). File: `hooks/useSites.ts`.
- **#28 PO "Created By: Unknown"** — `userResolver.getUserName(createdById)` can't resolve. **Strategy:** include the `createdBy` user (name) in the PO `findById` payload (BE) OR resolve via the users list on the FE. File: `purchases/[id]/page.tsx` (+ maybe `backend/src/purchase-orders/*`).

---

## Summary by area

| Bucket | Bugs | Side |
|---|---|---|
| Count/filter reflection | 1, 17, 25 | FE |
| Edit dropdowns | 14, 15, 19, 24 | FE (verify data) |
| Soft-delete uniqueness | 3, 22 | BE |
| Double-submit | 3, 8 | FE |
| Validation | 7, 30 | FE (+opt BE) |
| UI/CSS | 2, 6, 10, 16, 23, 29, 31 | FE |
| Nav/redirect | 4, 21 | FE |
| Form state | 5, 26 | FE |
| Supplier Ledger | 9, 11, 12, 13 | FE (13 maybe BE) |
| Misc | 18, 20, 27, 28 | FE (28 maybe BE) |

**~24 frontend-only, ~4 need backend** (3, 22 soft-delete; 28 created-by include; 13 export if endpoint missing). First implementation step will be a quick live probe of the dropdown/export endpoints + the PO total parsing to confirm the data-side hypotheses before coding.

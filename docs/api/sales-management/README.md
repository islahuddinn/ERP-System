# Sales Management — Territory Hierarchy — Frontend API Reference

> **Purpose**: Index for the Sales Management territory hierarchy modules (Region → Zone → City → Branch → Area).
> **Audience**: Frontend developers building territory setup screens (list/tree/create/edit) and any picker that needs to resolve a region/zone/city/branch/area.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. All Prisma `Decimal` values are auto-converted to JS numbers by this interceptor. **All response examples in the module docs show the inner `data` payload only.**

---

## The Hierarchy

```
Region  (e.g. "Punjab")
  └── Zone       (e.g. "Lahore Zone")     — belongs to a Region
        └── City       (e.g. "Lahore")    — belongs to a Zone
              └── Branch    (e.g. "DHA Branch")  — belongs to a City, has a Distributor (Employee) + stocked Product Groups
                    └── Area     (e.g. "DHA Phase 5")  — belongs to a Branch, referenced by Customer
```

- Every level is a **strict parent → children** tree — a Zone belongs to exactly one Region, a City to exactly one Zone, a Branch to exactly one City, an Area to exactly one Branch. There is no cross-linking or many-to-many at any level.
- Every level shares the same `TerritoryStatus` enum (`ACTIVE` | `INACTIVE`, default `ACTIVE`) and the same shape of CRUD endpoints.
- **Delete is blocked bottom-up**: a level cannot be deleted while it still has children (Region blocked by Zones, Zone by Cities, City by Branches, Branch by Areas). Area is the leaf — nothing blocks deleting an Area itself, but `Customer` records reference `areaId` (see `customers-api.md`), so deleting an Area that customers still point to is a backend concern the frontend should be aware of even though this hierarchy's delete guard doesn't check it.
- **Uniqueness scopes narrow as you go down**: `Region.name` is globally unique; `Zone.name`, `City.name`, `Area.name` are unique *within their immediate parent* (`@@unique([name, parentId])`); `Branch.code` is globally unique and `Branch.name` is unique *within its City*.
- Each level exposes a **`/tree` endpoint** (except Area, the leaf) that returns the full nested subtree below it in one call — use this instead of separately paginating every level to build a picker or org-chart-style view.
- Each level also exposes a **`/dropdown` endpoint** — a flat, non-paginated, `ACTIVE`-only `{ id, name, <parentId> }[]` list for populating "pick a region/zone/city/branch" selects, optionally filtered by the immediate parent's ID.

## Modules

| Module | Base Path | Doc | Permission namespace |
| --- | --- | --- | --- |
| Region | `/sales-management/regions` | [region-api.md](./region-api.md) | `sales-region.*` |
| Zone | `/sales-management/zones` | [zone-api.md](./zone-api.md) | `sales-zone.*` |
| City | `/sales-management/cities` | [city-api.md](./city-api.md) | `sales-city.*` |
| Branch | `/sales-management/branches` | [branch-api.md](./branch-api.md) | `sales-branch.*` |
| Area | `/sales-management/areas` | [area-api.md](./area-api.md) | `sales-area.*` |

> Each module owns its own permission namespace (`sales-region.view`/`.manage`, `sales-zone.view`/`.manage`, etc.) — there is no shared `sales-management.*` permission covering all five.

## Product Catalog Modules

These aren't part of the territory hierarchy tree above, but are documented in this folder because they're referenced by it (`Branch.productGroupIds`) and by the sales order/delivery flow (`SaleItem.productId`, etc.). Each is its own module living outside `src/sales-management/` in the backend.

| Module | Base Path | Doc | Permission namespace |
| --- | --- | --- | --- |
| Products | `/product-management/products` | [products-api.md](./products-api.md) | `products.*` |
| Product Brand | `/product-management/brands` | [product-brand-api.md](./product-brand-api.md) | `product-brand.*` |
| Product Category | `/product-management/categories` | [product-category-api.md](./product-category-api.md) | `product-category.*` |
| Product Group | `/product-management/product-groups` | [product-group-api.md](./product-group-api.md) | `product-group.*` |
| Designations | `/hr/designations` | [designations-api.md](./designations-api.md) | `hr-designations.*` (HR module, documented here for the sales-force job-title hierarchy) |

> Product Brand, Product Category, and Product Group are flat, non-hierarchical lookups (no parent/child). Designations is the exception — a self-referencing tree, structurally similar to the Region→Zone→City hierarchy above but with unbounded depth and no `status` field.

## Recommended Setup Screen Flow

Since each level requires its parent to exist first, a "Territory Setup" screen should generally work top-down:

1. Create/select a **Region**.
2. Create a **Zone** under it (`regionId` required).
3. Create a **City** under that zone (`zoneId` required).
4. Create a **Branch** under that city (`cityId`, `distributorId`, `productGroupIds` required).
5. Create an **Area** under that branch (`branchId` required).

A tabbed or drill-down UI (Region tab → Zones table → click a region row to filter Zones by `regionId`, etc.) maps directly onto the `dropdown`/list `?<parent>Id=` filters described in each module doc. Alternatively, `GET /sales-management/regions/:regionId/tree` returns the entire subtree in one call if a single expandable tree view is preferred over drill-down tabs.

## Shared Error Responses

All five modules follow the same standard NestJS HTTP exception shapes — see the **Error Responses** section in each module doc for the specific `404`/`409`/`400` messages that module returns.

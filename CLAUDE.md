# Claude Rules — Scalable ERP

## General

- This is a NestJS + Prisma + PostgreSQL backend with a frontend (monorepo).
- Always follow existing patterns in the codebase before introducing new ones.

## Workflow

- **Create a new branch off `dev`** for every change — never commit directly to `dev`. Follow the existing naming convention: `feat/<short-name>` or `fix/<short-name>`.
- **Do all the work on that branch**, then **open a PR into `dev`** (`gh pr create --base dev`).
- **Do not merge the PR automatically — ask per-PR** whether to merge it or leave it open for review (the user/Nasir reviews and decides).
- `main` is never touched directly.

## Git — never do these automatically

- **Never fetch, pull, or merge** — not `git fetch`, not `git pull`, not `git merge origin/dev` (or any other branch), and don't regenerate Prisma clients / sync the local DB "because dev moved on". Only do this in the exact turn the user explicitly says to (e.g. "sync with dev", "merge dev in", "pull latest") — never proactively, even if the current branch is far behind `dev` or a task is just starting.
- **Never create a branch** unless explicitly told to (`"create a branch"`, `"start a new branch"`).
- **Never delete a branch** (local or remote) unless explicitly told to (`"delete branch X"`).
- **Never open a PR** unless explicitly told to (`"open a PR"`, `"create a PR"`).
- **Never push to remote** unless explicitly told to (`"push"`, `"push the branch"`).
- These actions are irreversible or affect shared state — always wait for the explicit command, every time, even if it was already given earlier in the same conversation.

## Rules

### 1. Audit Logs — always use the `@Auditable` interceptor

- Never call `auditService.log(...)` directly inside a service or controller.
- Always use the `@Auditable({ module: AuditModule.MODULE_NAME })` decorator on the controller route, exactly as done in `products.controller.ts`.
- The interceptor handles logging automatically by reading the request and response.

### 2. `@Auditable` routes must return the full entity

- CREATE routes → return the created entity (the DB result).
- UPDATE routes → return the full updated entity (the DB result).
- DELETE routes → safe to return `{ message: "..." }` only (interceptor forces `newValue = null` for DELETE regardless).
- Never return just `{ message: "..." }` from a CREATE or UPDATE route decorated with `@Auditable` — the interceptor reads `newValue` from the response body, so returning only a message produces a garbage diff and corrupts the audit log.

### 3. Named route parameters — never use bare `:id`

- Always use a descriptive param name that matches the entity: `:grnId`, `:purchaseOrderId`, `:rawMaterialId`, etc.
- Apply this in both the controller `@Get(':grnId')` decorator and the corresponding service/repository method parameter names.

### 4. Every endpoint must have `@ApiOperation`

- Every controller route (new or modified) must have at least one `@ApiOperation({ summary: "..." })` decorator.
- Example: `@ApiOperation({ summary: "Get all purchase orders with pagination and filters" })`

### 5. Pagination — always follow the PO/GRN pattern

- Query DTOs must extend `PaginationDto` (from `src/common/dto/pagination.dto.ts`) — do not define `page`/`limit` as raw strings.
- Repository `findAll` must: destructure with defaults (`page = 1`, `limit = 10`), compute `skip = (page - 1) * limit`, build `where` imperatively, use `buildSearchFilter` and `buildOrderBy` from `src/common/utils/pagination.helper.ts`, run `findMany` + `count` in `Promise.all`, and return the result via `buildPaginatedResponse(data, total, page, limit)` from `src/common/dto/pagination.dto.ts`.
- Never hand-build the `{ data, meta: {...} } ` object or call `getTotalPages` directly in a repository — `buildPaginatedResponse` already computes `totalPages`, `hasNext`, and `hasPrev`.

### 6. Duplicate/unique constraint errors — always use `handlePrismaUniqueError`

- In every `catch` block where a Prisma unique constraint violation (`P2002`) could occur, call `handlePrismaUniqueError(error, "optional custom message")` from `src/common/reuseable-functions/handlePrismaUniqueError.ts`.
- Never inline a manual `P2002` check or throw `ConflictException` directly — use the shared helper.

### 7. Database access — never use `@TenantClient()` or pass `PrismaClient` as a parameter

- Never inject `@TenantClient() tenantClient: PrismaClient` in controllers or pass `tenantClient` as a parameter to service methods.
- Always inject `PrismaService` directly into the service constructor: `constructor(private readonly prisma: PrismaService) {}`.
- `PrismaService` is a global proxy that automatically routes to the correct tenant client via `AsyncLocalStorage` — no manual client passing needed.
- Controllers get the user via `@Req() req: RequestWithUser`, never via `@CurrentUser() user: any`.
- Module imports: `AuditModule` and `UsersModule` — do not import `MasterPrismaModule` or `CommonServicesModule` for new modules; `PrismaModule` is global.

### 8. Repository layer — every module must have a dedicated repository

- Every module must have a `<module>.repository.ts` file alongside the service.
- The service **must never call `this.prisma.*` directly** — all DB queries (`findMany`, `findUnique`, `create`, `update`, `delete`, `count`, `$transaction`) live exclusively in the repository.
- The service injects the repository and delegates to it; the service only contains business logic (validation, orchestration, error throwing).
- This applies to every module without exception — HR, PO, GRN, inventory, users, etc.

Example structure:
```
hr-core/
  repositories/
    employee.repository.ts   ← all prisma calls here
  services/
    employee.service.ts      ← injects EmployeeRepository, no prisma calls
```

### 9. Explicit return types — always on repository methods, and on service methods where meaningful

**Repositories** — every `async` method must declare its return type explicitly:

| Return shape | Type to use |
|---|---|
| Single entity (with includes) | `Promise<Prisma.XGetPayload<typeof X_INCLUDE>>` |
| Single entity (no includes) | `Promise<X>` (Prisma model type, e.g. `Promise<PurchaseOrder>`) |
| Paginated list | `Promise<PaginatedResponse<Prisma.XGetPayload<typeof X_INCLUDE>>>` |
| String/number helper | `Promise<string>`, `Promise<number>` |
| Boolean check | `Promise<boolean>` |
| Side-effect / delete | `Promise<void>` |

- Use `Prisma.XGetPayload<typeof X_INCLUDE>` (derived from the `satisfies Prisma.XInclude` constant) — this keeps the type automatically in sync with the include shape; do not write the shape manually.
- Import `PaginatedResponse` from `src/common/dto/pagination.dto.ts`.

**Services** — annotate return types when the type is concrete and meaningful (i.e. not `any`):
- Methods that delegate to a repository method should carry the same return type.
- Side-effect-only methods (e.g. status sync helpers) should be `Promise<void>`.
- Skip the annotation only when the inferred type is already precise and obvious (e.g. a one-liner that calls a fully-typed repository method).

Example:
```ts
// repository
async findById(purchaseOrderId: string): Promise<Prisma.PurchaseOrderGetPayload<typeof PURCHASE_ORDER_INCLUDE>> { ... }
async findAll(dto: PurchaseQueryDto): Promise<PaginatedResponse<Prisma.PurchaseOrderGetPayload<typeof PURCHASE_ORDER_INCLUDE>>> { ... }
async generateOrderNumber(): Promise<string> { ... }
async delete(purchaseOrderId: string): Promise<void> { ... }

// service
async findOne(purchaseOrderId: string): Promise<Prisma.PurchaseOrderGetPayload<typeof PURCHASE_ORDER_INCLUDE>> { ... }
```

### 10. DTO parameter naming — always use descriptive names

- Never name a DTO parameter `dto` — always use the full descriptive name matching the type: `createPositionDto: CreatePositionDto`, `updateDepartmentDto: UpdateDepartmentDto`, `positionFiltersDto: PositionFiltersDto`, etc.
- This applies in both controllers (`@Body() createPositionDto: CreatePositionDto`) and services.
- Destructure DTO fields at the top of the method body when multiple fields are accessed:
  ```ts
  const { title, description } = updatePositionDto;
  ```
- Skip destructuring only when the whole DTO is forwarded directly (e.g. `this.repository.findAll(positionFiltersDto)`).

### 12. Permissions — always define before using

**Every new module MUST have its own dedicated permission file.** Never reuse another module's permissions (e.g. do not use `hr.view` for a shifts endpoint — create `shifts.view`). Each module owns its permission namespace.

When creating a new module or adding a new route that requires a permission:

1. **Create the module's permission file** at `src/users/permissions/modules/<module>.permissions.ts`.
   ```ts
   // src/users/permissions/modules/shifts.permissions.ts
   export const SHIFTS_PERMISSIONS = {
     "shifts.view":   { module: "shifts", action: "view",   description: "View shifts" },
     "shifts.manage": { module: "shifts", action: "manage", description: "Create, update and delete shifts" },
   } as const;
   ```

2. **Import and spread it in `permission.definitions.ts`** so it becomes part of `PERMISSIONS` and `PermissionName`.
   ```ts
   import { SHIFTS_PERMISSIONS } from "./modules/shifts.permissions";
   export const PERMISSIONS = { ...SHIFTS_PERMISSIONS, /* other modules */ } as const;
   ```

3. **After adding new permissions, run the seeder** to create them in the DB without touching existing ones:
   ```bash
   npm run seed:permissions
   ```
   The script (`scripts/seed-permissions.ts`) only creates missing permissions — it never updates or deletes existing ones, so roles already assigned those permissions are never affected.

4. **Permissions are also auto-seeded on tenant provision** — `PermissionsSeedService.seedPermissions()` upserts all permissions from `PERMISSIONS`. No manual migration needed.

5. **Never use `@RequirePermission("some.permission")` if that string is not defined in `permission.definitions.ts`** — it will silently never match anything at runtime.

### 11. Existence checks — always use `checkExistence` in services

- Never inline `const x = await repo.findById(id); if (!x) throw new NotFoundException(...)` in every method.
- Every service that needs an existence check must have a `checkExistence(entityId: string): Promise<EntityDetail>` method that encapsulates the check and throw.
- All other service methods (get, update, delete) call `await this.checkExistence(entityId)` instead of repeating the pattern.
- The `get` method can simply `return this.checkExistence(entityId)`.

Example:
```ts
async checkExistence(positionId: string): Promise<PositionDetail> {
  const position = await this.positionRepository.findById(positionId);
  if (!position) throw new NotFoundException("Position not found");
  return position;
}
```

### 13. Write code for others — readability is non-negotiable

- Code is written once but read many times. Every method, variable, and file must be immediately understandable by a developer who has never seen it before.
- **Names must be self-explanatory** — `employeeShiftAssignments` not `esa`, `calculateOvertimeHours` not `calcOT`.
- **No clever one-liners** that sacrifice clarity. If a reader would pause to decode it, rewrite it as two clear lines.
- **Flat is better than nested** — extract early-return guards and named helpers rather than deeply nesting conditions.
- **Keep functions small and focused** — one function does one thing. If you need a comment to explain what a block does, extract it into a named function instead.
- **Consistent structure** — every controller, service, and repository follows the same section order so any developer can navigate the file without reading it top-to-bottom.

### 14. Simple and fast — no unnecessary complexity

- **Default to the simplest approach that is correct and performant.** Do not introduce abstractions, layers, or generics unless they are immediately needed by two or more concrete use-cases.
- **Queries must be lean** — only `select` / `include` the fields and relations actually used by the caller. Never fetch an entire entity when only one or two fields are needed.
- **Batch DB calls with `Promise.all`** — never `await` independent queries sequentially when they can run in parallel.
- **No premature optimization** — do not add caching, indexes, or complex logic before there is a measured need. But do apply obvious, zero-cost wins: `select` only needed columns, use indexed `where` fields, avoid N+1 includes.
- **No over-engineering** — if the task needs a CRUD endpoint, write a CRUD endpoint. Do not design a plugin system, strategy pattern, or event bus unless the requirement explicitly calls for it.
- **Complexity must justify itself** — every extra file, class, or abstraction must earn its place. When in doubt, keep it in one place and split only when the single place becomes genuinely hard to reason about.

### 15. Fetching users without a Prisma relation — always use the users-map pattern

When an entity stores user IDs (e.g. `createdById`, `updatedById`, `approverId`, `paidById`) but there is no reverse Prisma `include` available (cross-schema, no relation defined, or including would be too expensive), **never do N+1 user lookups**. Use the users-map pattern instead:

1. **Collect all user IDs** from the query result (deduplicate with `Set`).
2. **Fetch all users in one batch** query using `findMany({ where: { id: { in: uniqueIds } } })`.
3. **Build a `Record<id, user>` map** with `Object.fromEntries(users.map(u => [u.id, u]))`.
4. **Serialize** the result by replacing `*ById` fields with the corresponding user objects from the map.

Always extract these into named private helpers in the repository — `fetchUsersMap(ids)` and `serialize<Entity>(entity, usersMap)` — so every method (`findById`, `findAll`, `create`, `update`, etc.) reuses the same helpers.

```ts
// In the repository
private async fetchUsersMap(ids: (string | null | undefined)[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))] as string[];
  if (!uniqueIds.length) return {} as Record<string, UserSelect>;
  const users = await this.prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: USER_SELECT,
  });
  return Object.fromEntries(users.map((u) => [u.id, u]));
}

private serializeEntity(entity: any, usersMap: Record<string, UserSelect>) {
  return {
    ...entity,
    createdBy: entity.createdById ? (usersMap[entity.createdById] ?? null) : null,
    updatedBy: entity.updatedById ? (usersMap[entity.updatedById] ?? null) : null,
  };
}
```

- See `purchase-order.repository.ts` as the canonical reference for this pattern.

### 16. UUID route params — always validate with `ParseUUIDPipe`

- Every `@Param()` that holds a UUID (matches rule 3's descriptive naming — `:grnId`, `:purchaseOrderId`, `:employeeId`, etc.) must be validated with `ParseUUIDPipe`: `@Param("employeeId", ParseUUIDPipe) employeeId: string`.
- Without it, an invalid ID string reaches Prisma and throws an unhandled `PrismaClientValidationError` (500) instead of a clean `400 Bad Request`.
- Apply this to every param in the route, not just the first — including secondary params like `:revisionId` in `:contractId/salary-revisions/:revisionId/activate`.

Example:
```ts
@Get(":employeeId")
getEmployee(@Param("employeeId", ParseUUIDPipe) employeeId: string) {
  return this.employeeService.getEmployee(employeeId);
}
```

### 17. Creating a new module — always scaffold the complete structure, unprompted

When told to "create a module" for a new entity (whether standalone or inside an umbrella folder like `hr/` or `sales-management/`), scaffold everything below in one pass. Never ask which pieces to include, never do a partial version, never wait to be reminded about permissions or the seeder — do it as part of the same task. Mirror `hr/department` as the reference implementation.

**Files:**
```
<parent>/<module>/
  <module>.controller.ts
  <module>.module.ts
  <module>.repository.ts
  <module>.service.ts
  dto/
    create-<module>.dto.ts
    update-<module>.dto.ts
    <module>-filters.dto.ts     ← extends PaginationDto, only if the module lists/searches
  utils/
    constants.ts                 ← Prisma *_INCLUDE objects, each `satisfies Prisma.XInclude`
    enums.ts                     ← module-local enums; `export {};` if there are none yet
    interfaces.ts                ← module-local interfaces; `export {};` if there are none yet
    types.ts                     ← `Prisma.XGetPayload<typeof X_INCLUDE>` derived types
```

**Wiring:**
- `<module>.module.ts` imports `AuditModule` and `UsersModule` (never `MasterPrismaModule` / `CommonServicesModule`), provides the repository + service, exports the service.
- Register `<Module>Module` as its own import in `app.module.ts`, next to its sibling modules — there is no umbrella `HrModule`/`SalesManagementModule` that re-exports children; each submodule is registered individually.

**Permissions — always, without being asked:**
1. Create `src/users/permissions/modules/<module>.permissions.ts` with its own namespace (rule 12 — never reuse another module's permission, e.g. don't put a shops endpoint behind `sales.view`).
2. Import it and spread it into `PERMISSIONS` in `permission.definitions.ts`.
3. Run `npm run seed:permissions` after that edit so the new permissions exist in every tenant DB.

**Audit enum — if any route uses `@Auditable`:**
- `AuditModule` (the enum passed to `@Auditable({ module: AuditModule.X })`) is a **Prisma enum** defined in `backend/prisma/tenant/schema.prisma`, not a plain TS enum. Add the new value(s) there (e.g. `SALES_MANAGEMENT_CITY`) and generate/apply the migration — the controller won't compile against an enum member that doesn't exist yet.

**Everything else is already covered by rules 1–16** (pagination pattern, `handlePrismaUniqueError`, `checkExistence`, `ParseUUIDPipe` on every UUID param, explicit return types, descriptive DTO param names, named route params, `@ApiOperation` on every route) — apply them automatically as part of the same scaffold, not as a follow-up pass.

### 18. Logged-in user — always pass the full `req`, never `req.user.id` alone

- Controllers must pass `@Req() req: RequestWithUser` straight through to the service — never extract `req.user.id` in the controller and pass a bare `userId: string` parameter.
- Every service method that needs the logged-in user takes `req: RequestWithUser` and, as its first line, destructures:
  ```ts
  const { id: loggedInUserId } = req.user;
  ```
- Never name it `userId` — always `loggedInUserId`, so it reads unambiguously next to any other `*Id` (e.g. `customerId`, `salesPersonId`) destructured from the DTO on the next line.
- This keeps the full `PayloadUser` (role, tenantId, etc.) available to the service if a later check needs more than the ID, without changing the method signature.

Example:
```ts
// controller
createCustomerOrder(@Body() createCustomerOrderDto: CreateCustomerOrderDto, @Req() req: RequestWithUser) {
  return this.customerOrdersService.createCustomerOrder(createCustomerOrderDto, req);
}

// service
async createCustomerOrder(
  createCustomerOrderDto: CreateCustomerOrderDto,
  req: RequestWithUser,
): Promise<CustomerOrderDetail> {
  const { id: loggedInUserId } = req.user;
  const { customerId, items, notes } = createCustomerOrderDto;
  ...
}
```

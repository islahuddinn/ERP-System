# Roles & Permissions Module — Frontend API Reference

> **Purpose**: Complete API reference for the Roles & Permissions module — role CRUD, the role↔permission assignment matrix, and the permissions catalog.
> **Audience**: Frontend developers building the Roles list/create/edit/delete screens and the permission assignment matrix UI.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. All Prisma `Decimal` values are auto-converted to JS numbers by this interceptor. **All response examples in this document show the inner `data` payload only.**

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Roles API](#roles-api)
   - [List Roles (paginated)](#1-list-roles-paginated)
   - [Roles Dropdown](#2-roles-dropdown)
   - [Get Single Role](#3-get-single-role)
   - [Create Role](#4-create-role)
   - [Update Role](#5-update-role)
   - [Delete Role](#6-delete-role)
   - [Assign Permissions (full replace)](#7-assign-permissions-full-replace)
5. [Permissions Catalog API](#permissions-catalog-api)
   - [Get All Permissions (grouped by module)](#1-get-all-permissions-grouped-by-module)
   - [Get Permission Modules](#2-get-permission-modules)
6. [Error Responses](#error-responses)
7. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

| Sub-module          | Base Path      | Description                                                          |
| ------------------- | -------------- | -------------------------------------------------------------------- |
| Roles               | `/roles`       | Create, list, update, delete roles; replace a role's permission set   |
| Permissions Catalog | `/permissions` | Read-only catalog of all seeded permissions, grouped by module        |

### Data Model

Three tables back this module (Prisma tenant schema):

- **`Role`** — `id` (uuid), `name` (**unique**), `description` (nullable), `isSystem` (default `false`), `isActive` (default `true`), `createdAt`, `updatedAt`.
- **`Permission`** — `id` (uuid), `name` (**unique**, format `<module>.<action>`, e.g. `roles.read`), `description` (nullable), `module`, `action`, `createdAt`.
- **`RolePermission`** — join table: `id`, `roleId`, `permissionId`, `createdAt`. **Unique on `(roleId, permissionId)`**; both foreign keys are `onDelete: Cascade` (deleting a role or a permission removes its join rows automatically).

### How the permission registry works

Permissions are **defined in code**, not created via API. Each backend module ships a file under `src/users/permissions/modules/<module>.permissions.ts` exporting a map like `{ "roles.read": { module: "roles", action: "read", description: "..." } }`. All of these are spread into a single `PERMISSIONS` registry in `permission.definitions.ts` (~185 keys across ~43 modules). The registry is seeded into each tenant's `permissions` table on tenant provisioning (and via `npm run seed:permissions`) — the seeder only creates missing rows, never deletes.

**Consequence for the frontend**: there is no "create permission" endpoint. The permission matrix is always built from `GET /permissions`, and the only write operation is replacing a role's permission set via `PUT /roles/:roleId/permissions`.

### The Admin role and system roles

- **Admin bypass**: the backend `PermissionsGuard` grants a user **every** permission if their role's `name` is exactly `"Admin"` — no `RolePermission` rows are consulted at all. (This check is cached for 5 minutes per role.)
- Because of this, the **Admin role cannot be renamed/edited** (`PATCH` rejects it) and its **permissions cannot be assigned** (`PUT .../permissions` rejects it) — its access is implicit and automatic.
- **System roles** (`isSystem: true`, seeded at tenant provisioning) **cannot be deleted**. Note: `PATCH` only blocks the role named `Admin` — other system roles *can* currently be renamed and have their permissions changed via the API.
- A role that has users assigned cannot be deleted (reassign users first).

### Permission caching

The guard caches each role's permission list for **5 minutes**. `PUT /roles/:roleId/permissions` explicitly invalidates the cache for the edited role, so permission changes made through this API take effect immediately.

---

## Permissions

Permission keys guarding this module (defined in `src/users/permissions/modules/roles.permissions.ts`):

| Permission Key | Description (verbatim)                  | Guards                                                            |
| -------------- | --------------------------------------- | ----------------------------------------------------------------- |
| `roles.create` | Create roles                            | `POST /roles`                                                     |
| `roles.read`   | View roles and their permissions        | `GET /roles`, `GET /roles/:roleId`, `GET /permissions`, `GET /permissions/modules` |
| `roles.update` | Update roles and assign permissions     | `PATCH /roles/:roleId`, `PUT /roles/:roleId/permissions`          |
| `roles.delete` | Delete roles                            | `DELETE /roles/:roleId`                                           |

> Users whose role is named `Admin` bypass all of these checks automatically.

---

## Enums & Constants

This module has no Prisma enums. Relevant constants:

### Permission name format

```
<module>.<action>     e.g. roles.read, purchases.create, hr.employees.view
```

### Permission modules

The registry currently spans these `module` values (each becomes a group key in `GET /permissions` and a row in `GET /permissions/modules`):

```
attendance, audit, bom, brokers, cash, categories, companies, customers,
dashboard, dispatch, expenses, finance, grn, holidays, hr, hr-settings,
leave-requests, loan-requests, locations, machines, payroll, plants, pos,
production, production-orders, production_lines, products, purchases,
raw-materials, reports, roles, sale-dispatches, sales, settings, shifts,
sites, stock, suppliers, uoms, users, warehouses, waste-management, zones
```

> **Note**: treat this list as data, not a hardcoded frontend constant — always render the matrix from the `GET /permissions` response so new modules appear automatically.

### Role flags

```
isSystem  — true for roles seeded by the platform (e.g. Admin). Cannot be deleted.
isActive  — soft-active flag. The list endpoint ONLY returns isActive: true roles.
```

### `RoleDetail` shape (returned by every role endpoint)

Every role endpoint (`GET`, `POST`, `PATCH`, `PUT .../permissions`) returns the role with the same include:

```json
{
  "id": "0f4d3a1e-7b2c-4d5e-9f8a-1b2c3d4e5f6a",
  "name": "HR Manager",
  "description": "Manages HR operations",
  "isSystem": false,
  "isActive": true,
  "createdAt": "2026-07-01T10:00:00.000Z",
  "updatedAt": "2026-07-07T09:30:00.000Z",
  "rolePermissions": [
    {
      "id": "9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
      "roleId": "0f4d3a1e-7b2c-4d5e-9f8a-1b2c3d4e5f6a",
      "permissionId": "3c2b1a0d-9e8f-7a6b-5c4d-3e2f1a0b9c8d",
      "createdAt": "2026-07-07T09:30:00.000Z",
      "permission": {
        "id": "3c2b1a0d-9e8f-7a6b-5c4d-3e2f1a0b9c8d",
        "name": "hr.employees.view",
        "module": "hr",
        "action": "view",
        "description": "View employees"
      }
    }
  ],
  "_count": { "users": 3 }
}
```

- `rolePermissions` is ordered by `permission.module` ascending.
- `_count.users` is the number of users currently assigned this role — use it to disable the delete button.

---

## Roles API

### 1. List Roles (Paginated)

```
GET /roles
Permission: roles.read
```

Lists roles with pagination and search. **Only `isActive: true` roles are returned** (the filter is always applied server-side; there is currently no endpoint to deactivate/reactivate a role). Results are ordered **system roles first, then by name ascending** — this ordering is fixed.

#### Query Parameters

| Param       | Type                | Default | Notes                                                                                       |
| ----------- | ------------------- | ------- | -------------------------------------------------------------------------------------------- |
| `page`      | `number`            | `1`     | `@IsNumber() @Min(1) @Max(100)`                                                             |
| `limit`     | `number`            | `10`    | `@IsNumber() @Min(1) @Max(100)`                                                             |
| `search`    | `string`            | —       | `@IsString()` — case-insensitive `contains` on `name` and `description`                     |
| `isSystem`  | `boolean`           | —       | `@IsBoolean()` — send the literal string `"true"` or `"false"`; the transform is `value === "true"`, so **any other value (including `"false"`) is coerced to `false`**. Omit the param entirely to get both |
| `sortBy`    | `string`            | —       | **Accepted but ignored** — see note below                                                   |
| `sortOrder` | `"ASC"` \| `"DESC"` | —       | **Accepted but ignored** — see note below                                                   |

> **Flag**: `sortBy` / `sortOrder` are inherited from the shared `PaginationDto` and pass validation, but the repository **never uses them** — the order is hardcoded to `[{ isSystem: "desc" }, { name: "asc" }]`. Do not build sortable column headers against this endpoint.

#### Response `200 OK` (paginated — `data` + `meta` at the top level of the envelope)

```json
{
  "data": [
    {
      "id": "0f4d3a1e-7b2c-4d5e-9f8a-1b2c3d4e5f6a",
      "name": "Admin",
      "description": "Full system access",
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z",
      "rolePermissions": [],
      "_count": { "users": 1 }
    },
    {
      "id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
      "name": "HR Manager",
      "description": "Manages HR operations",
      "isSystem": false,
      "isActive": true,
      "createdAt": "2026-07-01T10:00:00.000Z",
      "updatedAt": "2026-07-07T09:30:00.000Z",
      "rolePermissions": [
        {
          "id": "9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
          "roleId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
          "permissionId": "3c2b1a0d-9e8f-7a6b-5c4d-3e2f1a0b9c8d",
          "createdAt": "2026-07-07T09:30:00.000Z",
          "permission": {
            "id": "3c2b1a0d-9e8f-7a6b-5c4d-3e2f1a0b9c8d",
            "name": "hr.employees.view",
            "module": "hr",
            "action": "view",
            "description": "View employees"
          }
        }
      ],
      "_count": { "users": 3 }
    }
  ],
  "meta": {
    "total": 6,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

> The Admin role typically shows `"rolePermissions": []` — its access is implicit via the guard bypass, not via `RolePermission` rows.

---

### 2. Roles Dropdown

```
GET /roles/dropdown
Permission: roles.read
```

Returns all **active** roles as a minimal, non-paginated list ordered by `name` ascending — intended for role pickers (e.g. the `roleId` selector on the Hire Employee / Edit User screens). Inactive roles (`isActive: false`) are excluded. `isSystem` is included so the UI can badge system roles.

#### Response `200 OK`

```json
[
  {
    "id": "role-uuid-1",
    "name": "Admin",
    "isSystem": true
  },
  {
    "id": "role-uuid-2",
    "name": "HR Officer",
    "isSystem": true
  },
  {
    "id": "role-uuid-3",
    "name": "Warehouse Lead",
    "isSystem": false
  }
]
```

| Field      | Type      | Notes                              |
| ---------- | --------- | ---------------------------------- |
| `id`       | `uuid`    | Value to submit as `roleId`        |
| `name`     | `string`  | Unique                             |
| `isSystem` | `boolean` | `true` for seeded system roles     |

> Because `dropdown` is matched before `:roleId`, the literal path `/roles/dropdown` never reaches the single-role route.

---

### 3. Get Single Role

```
GET /roles/:roleId
Permission: roles.read
```

Returns one role with its full permission list (the [`RoleDetail` shape](#roledetail-shape-returned-by-every-role-endpoint)).

#### Path Parameter

| Param    | Type   | Notes   |
| -------- | ------ | ------- |
| `roleId` | `uuid` | Role ID |

> **Flag**: the roles controller does **not** apply `ParseUUIDPipe` to `:roleId`. A malformed (non-UUID) ID reaches Prisma and produces a `500 Internal Server Error` instead of a clean `400` — always send well-formed UUIDs from the frontend.

#### Response `200 OK`

Full [`RoleDetail`](#roledetail-shape-returned-by-every-role-endpoint).

#### Response `404 Not Found`

```json
{ "statusCode": 404, "message": "Role not found", "error": "Not Found" }
```

---

### 4. Create Role

```
POST /roles
Permission: roles.create
```

Creates a role (`isSystem: false`, `isActive: true` by default), optionally with an initial permission set in the same call. All supplied `permissionIds` are validated for existence before creation; duplicate IDs in the array are silently de-duplicated (`skipDuplicates`).

#### Request Body

```json
{
  "name": "HR Manager",
  "description": "Manages HR operations",
  "permissionIds": [
    "3c2b1a0d-9e8f-7a6b-5c4d-3e2f1a0b9c8d",
    "4d3c2b1a-0e9f-8a7b-6c5d-4e3f2a1b0c9d"
  ]
}
```

| Field           | Type       | Required | Notes                                                              |
| --------------- | ---------- | -------- | ------------------------------------------------------------------ |
| `name`          | `string`   | Yes      | `@IsString() @IsNotEmpty() @MaxLength(100)` — must be unique (DB unique constraint) |
| `description`   | `string`   | No       | `@IsOptional() @IsString() @MaxLength(255)` — stored as `null` if omitted |
| `permissionIds` | `string[]` | No       | `@IsOptional() @IsArray() @IsUUID("all", { each: true })` — every ID must exist in the `permissions` table |

#### Response `201 Created`

Full [`RoleDetail`](#roledetail-shape-returned-by-every-role-endpoint) including the created `rolePermissions` (with nested `permission` objects) and `_count.users: 0`.

#### Errors

`404 Not Found` — one or more `permissionIds` do not exist:

```json
{ "statusCode": 404, "message": "One or more permission IDs not found", "error": "Not Found" }
```

`409 Conflict` — duplicate role name:

```json
{ "statusCode": 409, "message": "A role with this name already exists", "error": "Conflict" }
```

---

### 5. Update Role

```
PATCH /roles/:roleId
Permission: roles.update
Audited: yes (ROLES module)
```

Updates the role's `name` and/or `description` only. **Does not touch permissions** — use [Assign Permissions](#7-assign-permissions-full-replace) for that.

**Business Rules:**

- The role named `Admin` cannot be updated at all → `400`.
- Only fields present in the body are updated (fields omitted are left unchanged).

> **Flag**: only the role *named* `Admin` is blocked here — other `isSystem: true` roles can currently be renamed via this endpoint. If your UI should treat all system roles as read-only, enforce that client-side using the `isSystem` flag.

#### Path Parameter

| Param    | Type   | Notes             |
| -------- | ------ | ----------------- |
| `roleId` | `uuid` | Role ID to update |

#### Request Body

All fields optional.

```json
{
  "name": "HR Lead",
  "description": "Leads the HR department"
}
```

| Field         | Type     | Required | Notes                                              |
| ------------- | -------- | -------- | -------------------------------------------------- |
| `name`        | `string` | No       | `@IsOptional() @IsString() @MaxLength(100)` — must remain unique |
| `description` | `string` | No       | `@IsOptional() @IsString() @MaxLength(255)`        |

#### Response `200 OK`

Full updated [`RoleDetail`](#roledetail-shape-returned-by-every-role-endpoint).

#### Errors

```json
{ "statusCode": 400, "message": "Admin role cannot be modified", "error": "Bad Request" }
{ "statusCode": 404, "message": "Role not found", "error": "Not Found" }
{ "statusCode": 409, "message": "A role with this name already exists", "error": "Conflict" }
```

---

### 6. Delete Role

```
DELETE /roles/:roleId
Permission: roles.delete
```

Hard-deletes a role. Its `RolePermission` rows are removed automatically via `onDelete: Cascade`.

**Business Rules:**

- `isSystem: true` roles can never be deleted → `400`.
- A role with **any** users assigned cannot be deleted → `400`. Reassign those users to another role first (use `_count.users` from the list/detail response to pre-empt this in the UI).

#### Path Parameter

| Param    | Type   | Notes             |
| -------- | ------ | ----------------- |
| `roleId` | `uuid` | Role ID to delete |

#### Response `200 OK`

The handler returns only a message, so the envelope carries it with `data: null`:

```json
null
```

(Full wrapper: `{ "success": true, "message": "Role deleted successfully", "data": null }`.)

#### Errors

```json
{ "statusCode": 400, "message": "System roles cannot be deleted", "error": "Bad Request" }
{ "statusCode": 400, "message": "Cannot delete a role that is assigned to users. Reassign users first", "error": "Bad Request" }
{ "statusCode": 404, "message": "Role not found", "error": "Not Found" }
```

---

### 7. Assign Permissions (Full Replace)

```
PUT /roles/:roleId/permissions
Permission: roles.update
Audited: yes (ROLES module — the audit log records the added/removed permission names)
```

**Replaces the role's entire permission set** with the supplied array (the backend does `deleteMany` + `createMany`). This is the endpoint behind the permission matrix's "Save" button — always send the **complete** desired set of permission IDs, not a delta.

**Business Rules:**

- The role named `Admin` is rejected → `400` (its permissions are implicit via the guard bypass).
- Every supplied ID must exist in the `permissions` table (validated only when the array is non-empty).
- **An empty array is valid** and removes all permissions from the role.
- Duplicate IDs in the array are silently de-duplicated.
- On success, the role's cached permission list is invalidated — the change takes effect on the very next request by affected users.

#### Path Parameter

| Param    | Type   | Notes   |
| -------- | ------ | ------- |
| `roleId` | `uuid` | Role ID |

#### Request Body

```json
{
  "permissionIds": [
    "3c2b1a0d-9e8f-7a6b-5c4d-3e2f1a0b9c8d",
    "4d3c2b1a-0e9f-8a7b-6c5d-4e3f2a1b0c9d"
  ]
}
```

| Field           | Type       | Required | Notes                                                                    |
| --------------- | ---------- | -------- | ------------------------------------------------------------------------ |
| `permissionIds` | `string[]` | Yes      | `@IsArray() @IsUUID("all", { each: true })` — required (no `@IsOptional`); send `[]` to clear all permissions |

#### Response `200 OK`

Full updated [`RoleDetail`](#roledetail-shape-returned-by-every-role-endpoint) — `rolePermissions` reflects exactly the new set.

#### Errors

```json
{ "statusCode": 400, "message": "Admin role permissions are managed automatically and cannot be modified", "error": "Bad Request" }
{ "statusCode": 404, "message": "Role not found", "error": "Not Found" }
{ "statusCode": 404, "message": "One or more permission IDs not found", "error": "Not Found" }
```

---

## Permissions Catalog API

Read-only endpoints used to build the permission matrix. Both require `roles.read`. (These are also briefly mentioned in `users-api.md`; this section is the full reference.)

### 1. Get All Permissions (Grouped by Module)

```
GET /permissions
Permission: roles.read
```

Returns **all seeded permissions grouped by module name**. The group keys come from the code registry (`permission.definitions.ts`), and each group contains the matching DB rows sorted by `name` ascending (modules themselves iterate in registry order).

- A module defined in code but not yet seeded in this tenant's DB appears as an **empty array**.
- A DB permission whose `module` is not in the code registry is **omitted** from this response.

#### Response `200 OK`

`Record<string, PermissionItem[]>`:

```json
{
  "dashboard": [
    {
      "id": "aa11bb22-cc33-dd44-ee55-ff6677889900",
      "name": "dashboard.view",
      "description": "View dashboard",
      "module": "dashboard",
      "action": "view"
    }
  ],
  "roles": [
    {
      "id": "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e",
      "name": "roles.create",
      "description": "Create roles",
      "module": "roles",
      "action": "create"
    },
    {
      "id": "2c3d4e5f-6a7b-8c9d-0e1f-2a3b4c5d6e7f",
      "name": "roles.delete",
      "description": "Delete roles",
      "module": "roles",
      "action": "delete"
    },
    {
      "id": "3d4e5f6a-7b8c-9d0e-1f2a-3b4c5d6e7f8a",
      "name": "roles.read",
      "description": "View roles and their permissions",
      "module": "roles",
      "action": "read"
    },
    {
      "id": "4e5f6a7b-8c9d-0e1f-2a3b-4c5d6e7f8a9b",
      "name": "roles.update",
      "description": "Update roles and assign permissions",
      "module": "roles",
      "action": "update"
    }
  ]
}
```

| Field         | Type             | Notes                                             |
| ------------- | ---------------- | ------------------------------------------------- |
| `id`          | `uuid`           | Use this in `permissionIds` when assigning        |
| `name`        | `string`         | Unique key, format `<module>.<action>`            |
| `description` | `string \| null` | Human-readable label for the matrix checkbox      |
| `module`      | `string`         | Group key (same as the object key it lives under) |
| `action`      | `string`         | e.g. `create`, `read`, `update`, `delete`, `view`, `manage` |

---

### 2. Get Permission Modules

```
GET /permissions/modules
Permission: roles.read
```

Returns the distinct `module` values that exist in this tenant's `permissions` table, sorted ascending. Useful for rendering the matrix's module sidebar/tabs without fetching the full catalog.

#### Response `200 OK`

```json
["attendance", "audit", "bom", "brokers", "cash", "categories", "dashboard", "hr", "roles", "users"]
```

*(Truncated example — the real list contains every seeded module, see [Permission modules](#permission-modules).)*

---

## Error Responses

All endpoints follow standard NestJS HTTP exception shapes.

### 400 Bad Request (business rule / validation)

```json
{ "statusCode": 400, "message": "Admin role cannot be modified", "error": "Bad Request" }
{ "statusCode": 400, "message": "System roles cannot be deleted", "error": "Bad Request" }
{ "statusCode": 400, "message": "Cannot delete a role that is assigned to users. Reassign users first", "error": "Bad Request" }
{ "statusCode": 400, "message": "Admin role permissions are managed automatically and cannot be modified", "error": "Bad Request" }
```

DTO validation failures return the standard class-validator array shape:

```json
{ "statusCode": 400, "message": ["name should not be empty", "each value in permissionIds must be a UUID"], "error": "Bad Request" }
```

### 401 Unauthorized

```json
{ "statusCode": 401, "message": "Unauthorized" }
```

### 403 Forbidden (missing permission)

Thrown by `PermissionsGuard` with the exact required permission in the message:

```json
{ "statusCode": 403, "message": "Access denied. Required permissions: roles.update", "error": "Forbidden" }
{ "statusCode": 403, "message": "User not authenticated", "error": "Forbidden" }
```

### 404 Not Found

```json
{ "statusCode": 404, "message": "Role not found", "error": "Not Found" }
{ "statusCode": 404, "message": "One or more permission IDs not found", "error": "Not Found" }
```

### 409 Conflict (duplicate role name)

```json
{ "statusCode": 409, "message": "A role with this name already exists", "error": "Conflict" }
```

---

## Frontend Implementation Notes

### Roles List Screen

- `GET /roles` with `page`/`limit`/`search`, optional `isSystem` filter chip. Remember: **only `"true"` is truthy** for `isSystem` — omit the param for "all", send `isSystem=true` for system-only, `isSystem=false` for custom-only.
- Ignore `sortBy`/`sortOrder` — ordering is fixed (system roles first, then A→Z). Do not render sortable headers.
- Show a "System" badge when `isSystem: true` and a user count from `_count.users`.
- Deleted/deactivated roles never appear (`isActive: true` is enforced server-side).

### Permission Assignment Matrix Flow

1. On screen load, fetch in parallel:
   - `GET /roles/:roleId` — the role and its current `rolePermissions`.
   - `GET /permissions` — the full catalog grouped by module.
2. Render one section (or tab) per module key; one checkbox per permission (`description` as label, `name` as tooltip/key).
3. Pre-check boxes where the permission `id` appears in `rolePermissions[].permissionId` (or match on `permission.name`).
4. On save, collect **every** checked permission `id` across all modules and send the complete array:
   `PUT /roles/:roleId/permissions` with `{ "permissionIds": [...] }`.
   This is a **full replace** — an unchecked box means that permission is removed. Sending `[]` clears everything.
5. The response is the updated `RoleDetail`; use it to re-render the matrix (no re-fetch needed).
6. Changes take effect immediately for affected users (the backend invalidates its permission cache for that role).

### System-Role UI Guards

- **Admin role** (`name === "Admin"`): hide/disable the Edit form, the permission matrix Save button, and the Delete button. The backend hard-rejects all three (`"Admin role cannot be modified"`, `"Admin role permissions are managed automatically and cannot be modified"`, `"System roles cannot be deleted"`). Display Admin's permission matrix as "all permissions — managed automatically" rather than reading `rolePermissions` (which is typically empty for Admin).
- **Other system roles** (`isSystem: true`, not named Admin): the backend only blocks **deletion**. Rename and permission edits are technically allowed by the API — decide as a product whether to also lock these in the UI (recommended: show a warning at minimum).
- **Delete button**: disable when `isSystem` is `true` or `_count.users > 0`, matching the two backend rules.

### Admin Bypass — Why It Matters for Your UI

A user whose role is named `Admin` passes every permission check server-side without any `RolePermission` rows. If your frontend derives menu/button visibility from the role's permission list, special-case Admin: treat `role.name === "Admin"` as "has every permission", otherwise Admin users would see an empty UI.

### Gotchas

- **No `ParseUUIDPipe` on `:roleId`**: a malformed UUID in the path returns a `500`, not `400`. Only navigate with IDs received from the API.
- **Role names are globally unique** — surface the `409` message (`"A role with this name already exists"`) as an inline field error on the name input.
- **No deactivate endpoint**: `isActive` exists on the model but nothing in the API sets it to `false`; there is no soft-delete/archive flow — delete is hard and permanent.
- **`PATCH /roles/:roleId` never changes permissions** and `PUT /roles/:roleId/permissions` never changes name/description — a combined "Edit Role" screen must call both endpoints.

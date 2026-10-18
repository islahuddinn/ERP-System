# Users Module — Frontend API Reference

> **Purpose**: Complete API reference for the Users module — user accounts, self-service profile, login access (enable/disable/suspend), password management, role assignment, and effective-permission lookups.
> **Audience**: Frontend developers building the Users list/detail screens, "My Profile" / "My Account" screens, and role-assignment UI.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header. Every route also passes through `PermissionsGuard` — routes without an explicit permission requirement are open to any authenticated user (see [Permissions](#permissions)).
> **Response envelope**: Every response is wrapped by a global interceptor as `{ "success": true, "message": "Operation completed successfully", "data": <payload> }`. Paginated lists come back with `data` and `meta` at the top level of the wrapper: `{ "success": true, "message": "...", "data": [...], "meta": { ... } }`. When a handler returns only `{ "message": "..." }` (e.g. DELETE endpoints), the wrapper uses that message and sets `data: null`. All Prisma `Decimal` values are auto-converted to JS numbers by this interceptor. **All response examples in this document show the inner `data` payload only.**

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Self-Service API](#self-service-api)
   - [Get My Profile](#1-get-my-profile)
   - [Update My Profile](#2-update-my-profile)
   - [Change My Password](#3-change-my-password)
   - [Get My Permissions](#4-get-my-permissions)
5. [Admin — Users API](#admin--users-api)
   - [List Users (paginated)](#5-list-users-paginated)
   - [Users Dropdown](#6-users-dropdown)
   - [Get Single User](#7-get-single-user)
   - [Update User](#8-update-user)
   - [Deactivate User](#9-deactivate-user)
   - [Update User Login Access (Status)](#10-update-user-login-access-status)
   - [Reset User Password (Admin)](#11-reset-user-password-admin)
   - [Change User Role](#12-change-user-role)
   - [Get User's Permissions](#13-get-users-permissions)
6. [Permissions Catalog API](#permissions-catalog-api)
7. [Error Responses](#error-responses)
8. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

The Users module manages authentication-level accounts (as opposed to `Employee` HR records — see note below). It covers:

| Sub-area           | Base Path             | Description                                                             |
| ------------------ | ---------------------- | ------------------------------------------------------------------------ |
| Self-service        | `/users/me`            | The logged-in user's own profile, password, and permissions             |
| User administration | `/users`               | Admin CRUD-ish operations on other users: list, view, update, deactivate, login access, password reset, role change |
| Permissions catalog | `/permissions`         | Read-only catalog of all permission definitions, grouped by module (for role-assignment UIs) |

### User ↔ Employee relationship

- A `User` is the **login/account** record (email, password, role, login access). An `Employee` is the **HR record** (employee code, date of joining, contracts, department/position, attendance, leave, payroll, etc.).
- The relation is **one-to-one and optional**: `Employee.userId` is a nullable, unique foreign key to `User.id`. Not every `User` has an `Employee` record (e.g., a pure admin/system account), and the relation is created from the **Employee side** (`hr/employee` module), not from this module.
- **There is no `POST /users` endpoint in this module.** User accounts are created as a side effect of creating an Employee (see the Employee API doc — not duplicated here). If your screen needs to "add a new user," that flow lives in the Employee onboarding screen, not here.
- `GET /users/me` is the only endpoint in this module that returns employee info alongside the user (a small subset — see [Get My Profile](#1-get-my-profile)). Full employee details belong in the Employee module's own API doc.

### Login Access vs. Delete

- Users are never hard-deleted through this module. `DELETE /users/:userId` is really a **deactivation** — it sets `loginAccess = DISABLED` and returns a message (no user row is removed).
- `PUT /users/:userId/status` is the general-purpose way to set `loginAccess` to any of `ENABLED` / `DISABLED` / `SUSPENDED`.

### Audit Logging

The following routes are wrapped with `@Auditable({ module: AuditModule.USERS })` and are automatically recorded in the audit log (no manual logging needed, and none should be added):

| Route | Audit behavior |
| --- | --- |
| `PATCH /users/:userId` | Logs full updated user as `newValue` |
| `DELETE /users/:userId` | Logs the deactivation (interceptor forces `newValue = null` for deletes) |
| `PUT /users/:userId/status` | Logs full updated user as `newValue` |
| `PUT /users/:userId/role` | Logs full updated user as `newValue` |

`PUT /users/:userId/password` (admin reset), `PUT /users/me/password`, and `PATCH /users/me` are **not** audited.

---

## Permissions

| Permission Key        | What it guards                                                     |
| ---------------------- | -------------------------------------------------------------------- |
| `users.create`         | Reserved for user creation — not currently used by any route in this module (see note above) |
| `users.read`           | List/view users, dropdown, view a user's effective permissions      |
| `users.update`         | Update a user's profile, deactivate, change login access, admin password reset |
| `users.delete`         | Deactivate ("delete") a user                                        |
| `users.manage_roles`   | Change a user's assigned role                                       |
| `roles.read`           | Used by the Permissions Catalog endpoints (`GET /permissions`, `GET /permissions/modules`) — **not** a `users.*` permission, defined in the Roles module |

> **Self-service routes** (`GET /users/me`, `PATCH /users/me`, `PUT /users/me/password`, `GET /users/me/permissions`) require **no explicit permission** — any authenticated user can call them for their own account. They are still gated by `JwtAuthGuard`.

> **Admin override**: `PermissionsGuard` grants **full access to every permission-gated route** if the requesting user's role is named exactly `"Admin"` (checked via `Role.name === "Admin"`, cached 5 minutes) — regardless of that role's actual assigned permissions.

---

## Enums & Constants

### `LoginAccess`

```
ENABLED    — User can log in
DISABLED   — User cannot log in (default for newly created users)
SUSPENDED  — User cannot log in (distinct from DISABLED — e.g. for temporary suspension vs. permanent deactivation)
```

> **Note**: could not verify — the exact frontend-facing distinction in behavior between `DISABLED` and `SUSPENDED` beyond blocking login is not encoded anywhere in this module's code; both simply block login at the auth layer. Check with backend if the UI needs different messaging for each.

### Field-level constants

- No other module-specific enums/constants are defined for Users (`utils/enums.ts`, `utils/constants.ts`, and `utils/types.ts` in this module are currently empty placeholder files).

---

## Self-Service API

### 1. Get My Profile

```
GET /users/me
Permission: none (any authenticated user)
```

Returns the current user's profile plus a lightweight snapshot of their linked `Employee` record (if any).

#### Response `200 OK`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "phone": "+923001234567",
  "roleId": "role-uuid",
  "loginAccess": "ENABLED",
  "createdAt": "2026-06-01T10:00:00.000Z",
  "updatedAt": "2026-06-10T10:00:00.000Z",
  "employee": {
    "id": "employee-uuid",
    "employeeCode": "EMP-0001",
    "dateOfJoining": "2025-01-15T00:00:00.000Z",
    "status": "ACTIVE",
    "contracts": [
      {
        "department": { "id": "dept-uuid", "name": "Production" },
        "position": { "id": "position-uuid", "title": "Line Supervisor" }
      }
    ]
  }
}
```

> **Note**: `employee` is `null` if the user has no linked Employee record. `contracts` is an array but the query is constrained to `where: { status: "ACTIVE" }, take: 1` — so it will contain **at most one** active contract. `contracts` will be an **empty array** (not `null`) if there is no active contract.
> **Note**: `password` is never included in this or any response in this module — all reads go through the `USER_SELECT` projection (`id`, `firstName`, `lastName`, `email`, `phone`, `roleId`, `loginAccess`, `createdAt`, `updatedAt`), which excludes `password`.

---

### 2. Update My Profile

```
PATCH /users/me
Permission: none (any authenticated user)
```

Updates the caller's own `firstName`, `lastName`, `email`, and/or `phone`. Not audited.

#### Request Body

All fields optional.

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane.doe@example.com",
  "phone": "+923001234567"
}
```

| Field       | Type     | Required | Notes                                  |
| ----------- | -------- | -------- | --------------------------------------- |
| `firstName` | `string` | No       | `@IsOptional() @IsString()`             |
| `lastName`  | `string` | No       | `@IsOptional() @IsString()`             |
| `email`     | `string` | No       | `@IsOptional() @IsEmail()`               |
| `phone`     | `string` | No       | `@IsOptional() @IsString()`             |

#### Response `200 OK`

Updated user, same shape as [`USER_SELECT`](#1-get-my-profile) minus `employee` (i.e. `id`, `firstName`, `lastName`, `email`, `phone`, `roleId`, `loginAccess`, `createdAt`, `updatedAt`).

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane.doe@example.com",
  "phone": "+923001234567",
  "roleId": "role-uuid",
  "loginAccess": "ENABLED",
  "createdAt": "2026-06-01T10:00:00.000Z",
  "updatedAt": "2026-07-07T09:00:00.000Z"
}
```

#### Error `409 Conflict`

```json
{ "message": "A user with this email already exists" }
```

(Thrown via `handlePrismaUniqueError` when the new `email` collides with another user's unique `email`.)

---

### 3. Change My Password

```
PUT /users/me/password
Permission: none (any authenticated user)
```

Changes the caller's own password. Requires the current password for verification. Not audited.

#### Request Body

```json
{
  "currentPassword": "currentPassword123",
  "newPassword": "newSecurePassword123"
}
```

| Field             | Type     | Required | Notes                                  |
| ------------------ | -------- | -------- | --------------------------------------- |
| `currentPassword`  | `string` | Yes      | `@IsString()`                           |
| `newPassword`      | `string` | Yes      | `@IsString() @MinLength(8)`             |

#### Response `200 OK`

```json
{ "message": "Password changed successfully" }
```

#### Error `400 Bad Request`

```json
{ "message": "Current password is incorrect" }
```

> **Note**: The service compares `currentPassword` against the stored bcrypt hash via `verifyPassword`. If bcrypt comparison itself throws for any reason, `verifyPassword` catches it and returns `false` (treated the same as an incorrect password — no separate error message).

---

### 4. Get My Permissions

```
GET /users/me/permissions
Permission: none (any authenticated user)
```

Returns the caller's own effective permission names (resolved from their role).

#### Response `200 OK`

```json
["users.read", "users.update", "purchases.create", "purchases.read"]
```

> **Note**: This is a flat array of permission-name strings — a different (simpler) shape than [Get User's Permissions](#13-get-users-permissions), which wraps the array with `userId`/`roleId`. This endpoint calls `permissionsService.getPermissionsByRoleId(...)` directly and returns the raw array.
> **Admin caveat**: This array reflects only permissions actually assigned to the role in the DB — it does **not** account for the `PermissionsGuard`'s "Admin role bypasses everything" rule. An Admin user's role may have an empty or partial permission list here even though they can access every gated route in practice.

---

## Admin — Users API

### 5. List Users (Paginated)

```
GET /users
Permission: users.read
```

#### Query Parameters

| Param         | Type                | Default     | Notes                                                  |
| -------------- | ------------------- | ----------- | -------------------------------------------------------- |
| `page`         | `number`            | `1`         | Min 1, Max 100                                          |
| `limit`        | `number`            | `10`        | Min 1, Max 100                                          |
| `search`       | `string`            | —           | Searches `firstName`, `lastName`, `email` (case-insensitive `contains`) |
| `roleId`       | `uuid`              | —           | Filter by role                                          |
| `loginAccess`  | `LoginAccess`        | —           | `ENABLED`, `DISABLED`, `SUSPENDED`                       |
| `sortBy`       | `string`            | `createdAt` | Any `User` field name                                    |
| `sortOrder`    | `"ASC"` \| `"DESC"` | `"DESC"`    |                                                          |

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com",
      "phone": "+923001234567",
      "roleId": "role-uuid",
      "loginAccess": "ENABLED",
      "createdAt": "2026-06-01T10:00:00.000Z",
      "updatedAt": "2026-06-10T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

> Follows the standard `PaginationDto` / `buildPaginatedResponse` pattern — `meta` includes `hasNext`/`hasPrev` in addition to `totalPages`.
> **Note**: List items do **not** include `role` (name) or any employee info — only `roleId`. If the screen needs the role's display name, resolve it client-side from a roles dropdown/lookup, or extend the query (not currently implemented).

---

### 6. Users Dropdown

```
GET /users/dropdown
Permission: users.read
```

Returns a minimal list of **only `ENABLED`** users (login access), optionally filtered by role, ordered by `firstName` ascending. Intended for assignee/approver-style pickers (e.g., loan-request approver, GRN receiver).

#### Query Parameters

| Param    | Type   | Required | Notes                        |
| -------- | ------ | -------- | ----------------------------- |
| `roleId` | `uuid` | No       | `@IsOptional() @IsUUID()` — filter to users with this role |

#### Response `200 OK`

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "roleId": "role-uuid"
  }
]
```

> **Note**: `DISABLED` and `SUSPENDED` users are always excluded from this list — there is no query param to include them.

---

### 7. Get Single User

```
GET /users/:userId
Permission: users.read
```

#### Path Parameter

| Param    | Type   | Notes   |
| -------- | ------ | ------- |
| `userId` | `uuid` | User ID |

> **Note (validation gap)**: Unlike most other modules in this codebase, `:userId` is declared as `@Param("userId") userId: string` **without** `ParseUUIDPipe`. An invalid (non-UUID) ID will not be cleanly rejected with `400` at the pipe level — it will reach Prisma and may surface as a raw `500` error instead of a clean `404`. This applies to **every** `:userId` (and `:paymentId`-equivalent, N/A here) param in this controller — `findOne`, `update`, `remove`, `updateStatus`, `resetPassword`, `changeRole`, `getUserPermissions` all lack `ParseUUIDPipe`.

#### Response `200 OK`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "phone": "+923001234567",
  "roleId": "role-uuid",
  "loginAccess": "ENABLED",
  "createdAt": "2026-06-01T10:00:00.000Z",
  "updatedAt": "2026-06-10T10:00:00.000Z"
}
```

#### Response `404 Not Found`

```json
{ "message": "User not found" }
```

---

### 8. Update User

```
PATCH /users/:userId
Permission: users.update
Audited: yes (@Auditable, module: USERS)
```

Updates another user's `firstName`, `lastName`, `email`, and/or `phone` (same field set as [Update My Profile](#2-update-my-profile), but admin-initiated).

#### Path Parameter

| Param    | Type   | Notes              |
| -------- | ------ | -------------------- |
| `userId` | `uuid` | User ID to update — no `ParseUUIDPipe` (see note above) |

#### Request Body

All fields optional — identical shape to [Update My Profile](#2-update-my-profile):

```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@example.com",
  "phone": "+923009876543"
}
```

| Field       | Type     | Required | Notes                        |
| ----------- | -------- | -------- | ------------------------------ |
| `firstName` | `string` | No       | `@IsOptional() @IsString()`   |
| `lastName`  | `string` | No       | `@IsOptional() @IsString()`   |
| `email`     | `string` | No       | `@IsOptional() @IsEmail()`     |
| `phone`     | `string` | No       | `@IsOptional() @IsString()`   |

#### Response `200 OK`

Full updated user (same shape as [Get Single User](#7-get-single-user)).

#### Errors

```json
{ "message": "User not found." }
```
`404 Not Found` — thrown by `checkExistence` if `userId` does not exist.

```json
{ "message": "A user with this email already exists" }
```
`409 Conflict` — thrown via `handlePrismaUniqueError` on duplicate `email`.

---

### 9. Deactivate User

```
DELETE /users/:userId
Permission: users.delete
Audited: yes (@Auditable, module: USERS — newValue forced to null for DELETE)
```

**Does not delete the row.** Sets `loginAccess = DISABLED`, disabling the user's ability to log in.

#### Path Parameter

| Param    | Type   | Notes                |
| -------- | ------ | ---------------------- |
| `userId` | `uuid` | User ID to deactivate — no `ParseUUIDPipe` |

#### Response `200 OK`

```json
{ "message": "User deactivated successfully." }
```

#### Errors `400 Bad Request` / `404 Not Found`

```json
{ "message": "User not found." }
{ "message": "You cannot delete your own account" }
```

> **Business rule**: A user can never deactivate their own account through this endpoint (`userId === req.user.id` check).

---

### 10. Update User Login Access (Status)

```
PUT /users/:userId/status
Permission: users.update
Audited: yes (@Auditable, module: USERS)
```

Sets `loginAccess` to any of `ENABLED` / `DISABLED` / `SUSPENDED` — the general-purpose version of endpoint 9.

#### Path Parameter

| Param    | Type   | Notes    |
| -------- | ------ | -------- |
| `userId` | `uuid` | No `ParseUUIDPipe` |

#### Request Body

```json
{ "loginAccess": "SUSPENDED" }
```

| Field         | Type          | Required | Notes                              |
| ------------- | ------------- | -------- | ------------------------------------ |
| `loginAccess` | `LoginAccess` | Yes      | `@IsEnum(LoginAccess)` — `ENABLED`, `DISABLED`, `SUSPENDED` |

#### Response `200 OK`

Full updated user (same shape as [Get Single User](#7-get-single-user)), reflecting the new `loginAccess`.

#### Errors `400 Bad Request` / `404 Not Found`

```json
{ "message": "User not found." }
{ "message": "You cannot update your own login access" }
```

> **Business rule**: A user can never change their own `loginAccess` through this endpoint, even to `ENABLED` (self-lockout prevention also applies in reverse — you can't re-enable yourself either, though this would only matter if you were already disabled by someone else while still authenticated).

---

### 11. Reset User Password (Admin)

```
PUT /users/:userId/password
Permission: users.update
Audited: no
```

Admin-initiated password reset — no current-password check (unlike self-service change).

#### Path Parameter

| Param    | Type   | Notes    |
| -------- | ------ | -------- |
| `userId` | `uuid` | No `ParseUUIDPipe` |

#### Request Body

```json
{ "newPassword": "newSecurePassword123" }
```

| Field         | Type     | Required | Notes                          |
| ------------- | -------- | -------- | -------------------------------- |
| `newPassword` | `string` | Yes      | `@IsString() @MinLength(8)`     |

#### Response `200 OK`

```json
{ "message": "Password reset successfully" }
```

#### Error `404 Not Found`

```json
{ "message": "User not found." }
```

---

### 12. Change User Role

```
PUT /users/:userId/role
Permission: users.manage_roles
Audited: yes (@Auditable, module: USERS)
```

Reassigns the user's `role` (connects to a different `Role` by ID).

#### Path Parameter

| Param    | Type   | Notes    |
| -------- | ------ | -------- |
| `userId` | `uuid` | No `ParseUUIDPipe` |

#### Request Body

```json
{ "roleId": "5939c357-3904-489e-8016-cc8e30eb89a5" }
```

| Field    | Type   | Required | Notes             |
| -------- | ------ | -------- | -------------------- |
| `roleId` | `uuid` | Yes      | `@IsUUID()` — **not verified to exist** before the Prisma `connect` call (see note) |

#### Response `200 OK`

Full updated user (same shape as [Get Single User](#7-get-single-user)), with the new `roleId`.

#### Errors

```json
{ "message": "User not found." }
```
`404 Not Found` — from `checkExistence` on `userId`.

```json
{ "message": "You cannot update your own role" }
```
`400 Bad Request`.

> **Note**: could not verify — the service does not pre-check that `roleId` exists before calling `role: { connect: { id: roleId } } }`; if `roleId` does not correspond to a real `Role`, Prisma will throw a foreign-key/record-not-found error that is **not** caught or translated into a friendly message here. Frontend should ensure `roleId` always comes from a validated roles dropdown to avoid surfacing a raw Prisma error to the user.
> **Business rule**: A user can never change their own role through this endpoint.

---

### 13. Get User's Permissions

```
GET /users/:userId/permissions
Permission: users.read
```

Returns another user's effective permissions (resolved from their role), wrapped with identifying context.

#### Path Parameter

| Param    | Type   | Notes    |
| -------- | ------ | -------- |
| `userId` | `uuid` | No `ParseUUIDPipe` |

#### Response `200 OK`

```json
{
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "roleId": "role-uuid",
  "permissions": ["users.read", "purchases.create", "purchases.read"]
}
```

> Note the shape difference from [Get My Permissions](#4-get-my-permissions): this endpoint wraps the array with `userId`/`roleId`; the self-service one returns the bare array.

#### Error `404 Not Found`

```json
{ "message": "User not found." }
```

---

## Permissions Catalog API

These two read-only endpoints live in `src/users/permissions/permissions.controller.ts` (same module directory) and are typically used to build a **Roles & Permissions assignment** screen (picking which permissions to grant a role). They are not `users.*`-permission gated — both require `roles.read`.

### `GET /permissions`

```
Permission: roles.read
```

Returns every permission definition from `permission.definitions.ts` (all modules across the entire app — not just Users), grouped by module, cross-referenced against what's actually seeded in the DB (`id`, `description`).

#### Response `200 OK`

```json
{
  "users": [
    {
      "id": "permission-uuid",
      "name": "users.read",
      "description": "View users",
      "module": "users",
      "action": "read"
    }
  ],
  "purchases": [
    { "id": "...", "name": "purchases.create", "description": "Create purchase orders and purchase returns", "module": "purchases", "action": "create" }
  ]
}
```

> **Note**: This returns the catalog for **every module in the system** (dashboard, products, purchases, HR, users, roles, settings, etc.) — not scoped to Users. If a permission defined in code has not yet been seeded into the DB (see CLAUDE.md rule on `npm run seed:permissions`), it will be **missing** from this response even though it exists in `permission.definitions.ts`.

### `GET /permissions/modules`

```
Permission: roles.read
```

Returns the distinct list of module names that have at least one **seeded** permission in the DB.

#### Response `200 OK`

```json
["users", "purchases", "hr", "roles", "settings", "..."]
```

---

## Error Responses

All endpoints follow standard NestJS HTTP exception shapes.

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "...",
  "error": "Bad Request"
}
```

Seen in this module for: `"You cannot delete your own account"`, `"You cannot update your own login access"`, `"You cannot update your own role"`, `"Current password is incorrect"`, and standard class-validator messages (e.g. `["newPassword must be longer than or equal to 8 characters"]`).

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden (missing permission)

```json
{
  "statusCode": 403,
  "message": "Access denied. Required permissions: users.update",
  "error": "Forbidden"
}
```

> Unlike some other modules, this module's `PermissionsGuard` produces a message listing the **specific required permission(s)**, not the generic `"Forbidden resource"` string.

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

> **Note**: the exact message text differs slightly by call site — `findOne` throws `"User not found"` (no trailing period), while `checkExistence` (used by `update`, `remove`, `updateStatus`, `resetPassword`, `updateRole`, `getUserPermissions`, and self password-change) throws `"User not found."` (with a trailing period). Do not rely on exact string matching for anything beyond display.

### 409 Conflict (duplicate email)

```json
{
  "statusCode": 409,
  "message": "A user with this email already exists",
  "error": "Conflict"
}
```

---

## Frontend Implementation Notes

### Login Access badge colors (suggested)

| `loginAccess` | Color  |
| -------------- | ------ |
| `ENABLED`      | Green  |
| `DISABLED`     | Gray   |
| `SUSPENDED`    | Red/Amber |

### No password ever returned

Every response in this module is built from the `USER_SELECT` Prisma projection, which explicitly excludes `password`. There is no risk of accidentally rendering a password hash anywhere in the Users screens.

### `:userId` params are not UUID-validated server-side

Every route in `UsersController` that takes a `:userId` path param (`findOne`, `update`, `remove`, `updateStatus`, `resetPassword`, `changeRole`, `getUserPermissions`) is missing `ParseUUIDPipe`. Frontend should still only ever navigate to these routes with real UUIDs obtained from list/dropdown responses, but be aware that a malformed ID (e.g. from a bad deep link) may surface a raw `500` rather than a clean `400`/`404` — handle unexpected error shapes defensively on these specific calls.

### Self-action guards

Three admin actions are blocked when the target `userId` equals the caller's own ID: **deactivate** (`DELETE /:userId`), **change login access** (`PUT /:userId/status`), and **change role** (`PUT /:userId/role`). Disable these action buttons in the UI whenever the row being acted on is the currently logged-in user, to avoid a round-trip just to show the `400` error.

### Admin role bypass

Users whose `Role.name` is exactly `"Admin"` bypass all `@RequirePermission` checks in this module (and the whole system) regardless of their role's actual assigned permissions. Do not assume a user lacks access to a screen purely because their role's permission list (from `GET /permissions`) doesn't include the relevant key — if their role is named `Admin`, they can access everything.

### Typical Screen Flows

**Users List Screen**

- `GET /users` with pagination, `search`, `roleId`, `loginAccess` filters.
- Row actions: view (`GET /:id`), edit (`PATCH /:id`), deactivate (`DELETE /:id`), change status (`PUT /:id/status`), reset password (`PUT /:id/password`), change role (`PUT /:id/role`).
- Disable self-targeting actions per the note above.

**User Detail / Edit Screen**

- `GET /users/:id` for the header.
- `GET /users/:id/permissions` to show the effective permission list (read-only display — permissions are managed at the Role level, not per-user).
- "Save" → `PATCH /users/:id`.

**My Account / Profile Screen**

- `GET /users/me` — also drives an "Employee Info" read-only card if `employee` is non-null.
- "Save profile" → `PATCH /users/me`.
- "Change password" → `PUT /users/me/password` (requires current password field in the form).
- `GET /users/me/permissions` to conditionally render nav items/buttons the user has access to (remember this doesn't include the Admin-role bypass — gate primarily on actual API call results, not just this list).

**Role Assignment Screen**

- Use `GET /permissions` (grouped by module) to render a permission-picker when creating/editing a **Role** (Role CRUD itself is a separate Roles module, not documented here).
- Use `GET /users/dropdown?roleId=...` to find users currently on a given role, and `PUT /users/:id/role` to move a user to a different role.

### Cross-references

- User account creation happens via the **Employee** onboarding flow (`hr/employee` module) — see the Employee module's own API doc for `POST` behavior that creates the linked `User` row.
- Role CRUD (create/edit/delete roles, assign permissions to a role) is a separate **Roles** module — not documented in this file.

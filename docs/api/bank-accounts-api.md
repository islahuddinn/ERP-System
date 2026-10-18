# Bank Accounts Module — Frontend API Reference

> **Purpose**: Complete API reference for Supplier Bank Accounts and Customer Bank Accounts — storing, retrieving, and managing multiple bank accounts per supplier or customer.
> **Audience**: Frontend developers building the bank account management UI inside Supplier and Customer detail screens.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.

---

## Table of Contents

1. [Overview](#overview)
2. [Security Model](#security-model)
3. [Permissions](#permissions)
4. [Field Reference](#field-reference)
5. [Supplier Bank Accounts API](#supplier-bank-accounts-api)
   - [Add Bank Account](#1-add-bank-account)
   - [List Bank Accounts](#2-list-bank-accounts)
   - [Get Single Bank Account](#3-get-single-bank-account)
   - [Update Bank Account](#4-update-bank-account)
   - [Set as Default](#5-set-as-default)
   - [Delete Bank Account](#6-delete-bank-account)
6. [Customer Bank Accounts API](#customer-bank-accounts-api)
   - [Add Bank Account](#1-add-bank-account-1)
   - [List Bank Accounts](#2-list-bank-accounts-1)
   - [Get Single Bank Account](#3-get-single-bank-account-1)
   - [Update Bank Account](#4-update-bank-account-1)
   - [Set as Default](#5-set-as-default-1)
   - [Delete Bank Account](#6-delete-bank-account-1)
7. [isDefault Behavior](#isdefault-behavior)
8. [Error Responses](#error-responses)
9. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

A supplier or customer can have **multiple bank accounts** (e.g., PKR account at HBL, USD account at Citi). Bank accounts are managed as sub-resources nested under their parent:

| Entity   | Base Path                                   | Description                                |
|----------|---------------------------------------------|--------------------------------------------|
| Supplier | `/suppliers/:supplierId/bank-accounts`      | Bank accounts belonging to a supplier      |
| Customer | `/customers/:customerId/bank-accounts`      | Bank accounts belonging to a customer      |

One account per entity can be marked as `isDefault: true` — this is the account auto-filled when generating a payment or refund.

---

## Security Model

**This is critical — read before building the forms.**

### Ownership is enforced by URL, not by request body

- The `supplierId` / `customerId` is taken **only from the URL parameter**. It is **never accepted in the request body**.
- On every write (create, update, delete, set-default), the backend checks that the `bankAccountId` in the URL actually belongs to the `supplierId` / `customerId` in the URL. If not → `404 Not Found`.
- This prevents two attack vectors:
  1. **Cross-entity reassignment** — cannot move a bank account from supplier A to supplier B by passing a different ID.
  2. **Account number tampering** — every change to `accountNumber` or `iban` is fully audit-logged via `@Auditable`.

### What this means for frontend

- Never send `supplierId` or `customerId` in POST/PATCH bodies — the API ignores them anyway, but cleaner to omit.
- Always use the nested route: `PATCH /suppliers/{supplierId}/bank-accounts/{bankAccountId}` — never call a flat `/bank-accounts/{id}` route.
- Sensitive field changes (accountNumber, IBAN) should ideally show a confirmation dialog in the UI before submitting.

---

## Permissions

| Permission Key      | What it guards                                      |
|---------------------|-----------------------------------------------------|
| `suppliers.create`  | `POST /suppliers/:supplierId/bank-accounts`         |
| `suppliers.read`    | `GET` endpoints for supplier bank accounts          |
| `suppliers.update`  | `PATCH` endpoints for supplier bank accounts        |
| `suppliers.delete`  | `DELETE /suppliers/:supplierId/bank-accounts/:id`   |
| `customers.create`  | `POST /customers/:customerId/bank-accounts`         |
| `customers.read`    | `GET` endpoints for customer bank accounts          |
| `customers.update`  | `PATCH` endpoints for customer bank accounts        |
| `customers.delete`  | `DELETE /customers/:customerId/bank-accounts/:id`   |

---

## Field Reference

All bank account objects (supplier and customer) share the same shape in responses:

| Field           | Type      | Description                                                           |
|-----------------|-----------|-----------------------------------------------------------------------|
| `id`            | `string`  | UUID — use this as `bankAccountId` in nested routes                  |
| `supplierId`    | `string`  | (supplier accounts only) Parent supplier UUID                         |
| `customerId`    | `string`  | (customer accounts only) Parent customer UUID                         |
| `bankName`      | `string`  | Bank name (e.g., `"HBL"`, `"MCB"`, `"Standard Chartered"`)          |
| `accountTitle`  | `string`  | Account holder name as registered with the bank                       |
| `accountNumber` | `string`  | Bank account number — stored as string (can have leading zeros)       |
| `iban`          | `string?` | IBAN — optional, for international transfers (`null` if not set)      |
| `swiftCode`     | `string?` | SWIFT/BIC code — optional (`null` if not set)                         |
| `currency`      | `string`  | Currency code (`"PKR"`, `"USD"`, `"EUR"`, etc.) — defaults to `"PKR"` |
| `isDefault`     | `boolean` | `true` if this is the primary account for the supplier/customer       |
| `isActive`      | `boolean` | `false` means soft-deactivated (still visible, not usable for payments)|
| `deletedAt`     | `string?` | ISO timestamp if soft-deleted, `null` otherwise                       |
| `createdAt`     | `string`  | ISO timestamp                                                         |
| `updatedAt`     | `string`  | ISO timestamp                                                         |

---

## Supplier Bank Accounts API

### 1. Add Bank Account

```
POST /suppliers/:supplierId/bank-accounts
Permission: suppliers.create
```

Adds a new bank account to the supplier. Pass `isDefault: true` to make it the primary account immediately — the backend atomically clears `isDefault` on all other accounts for this supplier in the same transaction.

#### Request Body

```json
{
  "bankName": "HBL",
  "accountTitle": "Al-Habib Traders",
  "accountNumber": "01234567890",
  "iban": "PK36SCBL0000001123456702",
  "swiftCode": "HABBPKKA",
  "currency": "PKR",
  "isDefault": true,
  "isActive": true
}
```

| Field           | Type      | Required | Notes                                            |
|-----------------|-----------|----------|--------------------------------------------------|
| `bankName`      | `string`  | Yes      | Min 1 character                                  |
| `accountTitle`  | `string`  | Yes      | Min 1 character                                  |
| `accountNumber` | `string`  | Yes      | Min 1 character — stored as-is, not validated     |
| `iban`          | `string`  | No       | Optional                                         |
| `swiftCode`     | `string`  | No       | Optional                                         |
| `currency`      | `string`  | No       | Defaults to `"PKR"`                              |
| `isDefault`     | `boolean` | No       | Defaults to `false`                              |
| `isActive`      | `boolean` | No       | Defaults to `true`                               |

#### Response `201 Created`

```json
{
  "id": "abc123-uuid",
  "supplierId": "supplier-uuid",
  "bankName": "HBL",
  "accountTitle": "Al-Habib Traders",
  "accountNumber": "01234567890",
  "iban": "PK36SCBL0000001123456702",
  "swiftCode": "HABBPKKA",
  "currency": "PKR",
  "isDefault": true,
  "isActive": true,
  "deletedAt": null,
  "createdById": "user-uuid",
  "updatedById": "user-uuid",
  "createdAt": "2026-06-19T10:00:00.000Z",
  "updatedAt": "2026-06-19T10:00:00.000Z"
}
```

---

### 2. List Bank Accounts

```
GET /suppliers/:supplierId/bank-accounts
Permission: suppliers.read
```

Returns all **non-deleted** bank accounts for the supplier, ordered by `isDefault DESC, createdAt ASC` (default account always first).

#### Response `200 OK`

```json
[
  {
    "id": "abc123-uuid",
    "supplierId": "supplier-uuid",
    "bankName": "HBL",
    "accountTitle": "Al-Habib Traders",
    "accountNumber": "01234567890",
    "iban": "PK36SCBL0000001123456702",
    "swiftCode": "HABBPKKA",
    "currency": "PKR",
    "isDefault": true,
    "isActive": true,
    "deletedAt": null,
    "createdAt": "2026-06-19T10:00:00.000Z",
    "updatedAt": "2026-06-19T10:00:00.000Z"
  },
  {
    "id": "def456-uuid",
    "supplierId": "supplier-uuid",
    "bankName": "Citi",
    "accountTitle": "Al-Habib Traders USD",
    "accountNumber": "9876543210",
    "iban": null,
    "swiftCode": "CITIPKKX",
    "currency": "USD",
    "isDefault": false,
    "isActive": true,
    "deletedAt": null,
    "createdAt": "2026-06-19T11:00:00.000Z",
    "updatedAt": "2026-06-19T11:00:00.000Z"
  }
]
```

> Returns an **array** (not a paginated object) — bank accounts per entity are typically few.

---

### 3. Get Single Bank Account

```
GET /suppliers/:supplierId/bank-accounts/:bankAccountId
Permission: suppliers.read
```

Returns a single bank account. Returns `404` if the `bankAccountId` doesn't belong to the `supplierId`.

#### Response `200 OK`

Same shape as a single item from the list above.

---

### 4. Update Bank Account

```
PATCH /suppliers/:supplierId/bank-accounts/:bankAccountId
Permission: suppliers.update
```

All fields are optional — send only what changed. **Do not send `supplierId` in the body** — ownership is determined entirely by the URL.

If you pass `isDefault: true`, the backend atomically sets this account as default and clears `isDefault` on all other accounts for this supplier.

#### Request Body

```json
{
  "accountNumber": "09999999999",
  "currency": "USD"
}
```

All fields from the create body are accepted, all optional.

#### Response `200 OK`

Returns the full updated bank account object.

---

### 5. Set as Default

```
PATCH /suppliers/:supplierId/bank-accounts/:bankAccountId/set-default
Permission: suppliers.update
```

Dedicated endpoint to mark an account as the default. No request body needed.

The backend atomically:
1. Clears `isDefault` on all other accounts for this supplier.
2. Sets `isDefault: true` on this account.

This is done in a single database transaction — no race conditions.

#### Response `200 OK`

Returns the updated bank account object (with `isDefault: true`).

---

### 6. Delete Bank Account

```
DELETE /suppliers/:supplierId/bank-accounts/:bankAccountId
Permission: suppliers.delete
```

Soft-deletes the bank account. The record is NOT physically removed — `deletedAt` is set and `isActive` is set to `false`. If the deleted account was the default, `isDefault` is also cleared.

#### Response `200 OK`

```json
{
  "message": "Bank account deleted successfully"
}
```

---

## Customer Bank Accounts API

Identical behavior and security model as supplier bank accounts — only the parent entity and permission keys differ.

### 1. Add Bank Account

```
POST /customers/:customerId/bank-accounts
Permission: customers.create
```

Same request body and response shape as supplier. The `customerId` field appears in the response instead of `supplierId`.

---

### 2. List Bank Accounts

```
GET /customers/:customerId/bank-accounts
Permission: customers.read
```

Returns all non-deleted bank accounts for the customer, default account first.

---

### 3. Get Single Bank Account

```
GET /customers/:customerId/bank-accounts/:bankAccountId
Permission: customers.read
```

Returns `404` if the `bankAccountId` doesn't belong to this `customerId`.

---

### 4. Update Bank Account

```
PATCH /customers/:customerId/bank-accounts/:bankAccountId
Permission: customers.update
```

Partial update. Do not send `customerId` in the body.

---

### 5. Set as Default

```
PATCH /customers/:customerId/bank-accounts/:bankAccountId/set-default
Permission: customers.update
```

Atomically sets this as the default account for the customer.

---

### 6. Delete Bank Account

```
DELETE /customers/:customerId/bank-accounts/:bankAccountId
Permission: customers.delete
```

Soft-delete. Returns `{ "message": "Bank account deleted successfully" }`.

---

## isDefault Behavior

The `isDefault` flag works as a **single-selection** — only one account per supplier/customer can be the default at a time.

| Action                              | Backend behavior                                                            |
|-------------------------------------|-----------------------------------------------------------------------------|
| Create with `isDefault: true`       | New account is set as default; all existing accounts have `isDefault` cleared |
| Update with `isDefault: true`       | This account becomes default; all others cleared                            |
| `PATCH .../set-default`             | Same as above — dedicated endpoint for a clean UX                           |
| Delete the current default account  | `isDefault` is cleared on the deleted record; **no new default is set** — frontend should prompt the user to pick a new default |
| Create with `isDefault: false`      | No change to existing defaults                                               |

**There is no automatic re-selection of a new default after deletion.** If the deleted account was the default, after deletion all accounts will have `isDefault: false`. Frontend should detect this state and prompt the user.

---

## Error Responses

| HTTP | Code                  | When it happens                                                              |
|------|-----------------------|------------------------------------------------------------------------------|
| 401  | Unauthorized          | Missing or expired JWT                                                       |
| 403  | Forbidden             | Missing permission                                                           |
| 404  | Not Found             | `supplierId`/`customerId` doesn't exist, OR `bankAccountId` doesn't belong to it |
| 400  | Bad Request           | Validation error (missing required field, wrong type)                        |
| 409  | Conflict              | Unique constraint violation (shouldn't normally happen — no unique fields)   |

### 404 is always the ownership error

If someone passes a valid `bankAccountId` that belongs to a *different* supplier, the response is still `404 Not Found` — not a permission error. This prevents information leakage (the attacker doesn't know if the ID exists at all).

---

## Frontend Implementation Notes

### Bank account list UI

- Render the default account at the top (the API always returns it first).
- Show a "Default" badge on the account where `isDefault === true`.
- Show a "Set as Default" button on non-default accounts.
- Show an "Inactive" badge on accounts where `isActive === false`.

### Edit form — sensitive field warning

When the user edits `accountNumber` or `iban`, show a confirmation dialog:
> "You are changing payment details for this account. Are you sure?"

This is a UX guard against accidental edits to financial data.

### Auto-fill on payment forms

When building a "Record Payment to Supplier" or "Refund to Customer" form:
```js
// Fetch bank accounts and auto-fill the default
const accounts = await GET(`/suppliers/${supplierId}/bank-accounts`);
const defaultAccount = accounts.find(a => a.isDefault) ?? accounts[0];
// Pre-fill the form with defaultAccount.bankName, .accountNumber, .iban
```

### Handle no-default state after deletion

After deleting an account, re-fetch the list. If `accounts.every(a => !a.isDefault)`:
- Show a warning: "No default account set. Please select a default bank account."
- Provide a "Set as Default" button on each remaining account.

### Currency display

`currency` is a plain string (`"PKR"`, `"USD"`, `"EUR"`). The frontend is responsible for formatting amounts in the correct currency when displaying them alongside an account.

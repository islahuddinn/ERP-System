# Suppliers Module — Frontend API Reference

> **Status**: Updated module — existing screen needs changes.  
> **Base URL**: All paths relative to the API root.  
> **Auth**: Bearer JWT required on all endpoints.

---

## What Changed (Frontend Action Required)

This module existed before. The following were **added** — the existing Suppliers list/form screen needs these integrated:

| Area                       | Change                                                                                                     | Frontend Impact                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Opening Balance**        | New nested `openingBalance` object in create/update payload                                                | Add opening balance section to supplier form     |
| **Opening Balance fields** | `openingBalanceAmount`, `openingBalanceDate`, `openingBalanceNote` now returned in every supplier response | Display on supplier detail screen                |
| **Ledger**                 | New endpoint: `GET /suppliers/:id/ledger`                                                                  | New "Ledger" tab/screen per supplier             |
| **Ledger Overview**        | New endpoint: `GET /suppliers/ledger-overview`                                                             | New dashboard/list showing all supplier balances |
| **Transactions**           | New sub-resource: `POST/GET/PATCH/DELETE /suppliers/:supplierId/transactions`                              | New "Transactions" section or tab per supplier   |
| **Audit**                  | Update, Delete, Toggle-active are now audited                                                              | No UI change needed, backend only                |

---

## Table of Contents

1. [Permissions](#permissions)
2. [Enums](#enums)
3. [Suppliers CRUD](#suppliers-crud)
4. [Supplier Transactions](#supplier-transactions)
5. [Supplier Ledger](#supplier-ledger)
6. [Error Responses](#error-responses)

---

## Permissions

| Permission Key     | What it guards                              |
| ------------------ | ------------------------------------------- |
| `suppliers.create` | Create supplier, create manual transactions |
| `suppliers.read`   | List, view suppliers, ledger, transactions  |
| `suppliers.update` | Update supplier, update transactions        |
| `suppliers.delete` | Soft-delete supplier, delete transactions   |

---

## Enums

### `SupplierTransactionType`

```
PAYMENT     — Factory paid the supplier (reduces balance)
PURCHASE    — Manual purchase entry (increases balance)
RETURN      — Return to supplier (reduces balance)
ADJUSTMENT  — Manual correction to balance
```

---

## Suppliers CRUD

### 1. Create Supplier

```
POST /suppliers
Permission: suppliers.create
```

#### Request Body

```json
{
  "name": "Al-Habib Traders",
  "email": "contact@alhabib.com",
  "phone": "+92-300-1234567",
  "address": "123 Industrial Area, Lahore",
  "notes": "Only delivers on weekdays",
  "isActive": true,
  "openingBalance": {
    "amount": 10000,
    "date": "2025-11-15",
    "note": "Migrated from old ERP"
  }
}
```

| Field                   | Type      | Required             | Notes                                                            |
| ----------------------- | --------- | -------------------- | ---------------------------------------------------------------- |
| `name`                  | `string`  | Yes                  |                                                                  |
| `email`                 | `string`  | No                   | Must be valid email if provided. Empty string is allowed         |
| `phone`                 | `string`  | No                   | Empty string is allowed                                          |
| `address`               | `string`  | No                   |                                                                  |
| `notes`                 | `string`  | No                   | Internal notes about the supplier                                |
| `isActive`              | `boolean` | No                   | Default: `true`                                                  |
| `openingBalance`        | `object`  | No                   | **New field.** Only set once on creation or before any POs exist |
| `openingBalance.amount` | `number`  | Yes (if object sent) | Must be ≥ 0                                                      |
| `openingBalance.date`   | `string`  | No                   | Format: `YYYY-MM-DD`                                             |
| `openingBalance.note`   | `string`  | No                   | e.g. `"Migrated from old ERP"`                                   |

> **Opening Balance rule**: Once a supplier has purchase orders against it, the opening balance **cannot be modified**. Set it at creation or before recording any POs.

#### Response `201 Created`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Al-Habib Traders",
  "email": "contact@alhabib.com",
  "phone": "+92-300-1234567",
  "address": "123 Industrial Area, Lahore",
  "notes": "Only delivers on weekdays",
  "isActive": true,
  "openingBalanceAmount": "10000.00",
  "openingBalanceDate": "2025-11-15T00:00:00.000Z",
  "openingBalanceNote": "Migrated from old ERP",
  "openingBalanceSetById": "user-uuid",
  "deletedAt": null,
  "createdById": "user-uuid",
  "updatedById": "user-uuid",
  "createdAt": "2026-06-04T10:00:00.000Z",
  "updatedAt": "2026-06-04T10:00:00.000Z"
}
```

> **Note**: `openingBalanceAmount` is a Prisma `Decimal` — returned as a string. Use `parseFloat()` before arithmetic.

---

### 2. List Suppliers (Paginated)

```
GET /suppliers
Permission: suppliers.read
```

#### Query Parameters

| Param       | Type                | Default     | Notes                                  |
| ----------- | ------------------- | ----------- | -------------------------------------- |
| `page`      | `number`            | `1`         |                                        |
| `limit`     | `number`            | `20`        | Max: 100                               |
| `search`    | `string`            | —           | Searches `name`, `email`, `phone`      |
| `isActive`  | `boolean`           | —           | Omit for all, `true`/`false` to filter |
| `sortBy`    | `string`            | `createdAt` |                                        |
| `sortOrder` | `"ASC"` \| `"DESC"` | `"DESC"`    |                                        |

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Al-Habib Traders",
      "email": "contact@alhabib.com",
      "phone": "+92-300-1234567",
      "address": "123 Industrial Area, Lahore",
      "notes": "Only delivers on weekdays",
      "isActive": true,
      "openingBalanceAmount": "10000.00",
      "openingBalanceDate": "2025-11-15T00:00:00.000Z",
      "openingBalanceNote": "Migrated from old ERP",
      "openingBalanceSetById": "user-uuid",
      "deletedAt": null,
      "createdById": "user-uuid",
      "updatedById": "user-uuid",
      "createdAt": "2026-06-04T10:00:00.000Z",
      "updatedAt": "2026-06-04T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 32,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

---

### 3. Suppliers Dropdown

```
GET /suppliers/dropdown
Permission: suppliers.read
```

Returns only **active** (non-deleted) suppliers, sorted by name. For select inputs in PO forms, GRN forms, etc.

#### Response `200 OK`

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Al-Habib Traders",
    "phone": "+92-300-1234567",
    "email": "contact@alhabib.com"
  }
]
```

---

### 4. Get Single Supplier

```
GET /suppliers/:id
Permission: suppliers.read
```

#### Response `200 OK`

Same shape as a single item in the list response — full supplier object including all `openingBalance*` fields.

---

### 5. Update Supplier

```
PATCH /suppliers/:id
Permission: suppliers.update
Audited: Yes
```

All fields are optional. Send only what you want to change.

```json
{
  "name": "Al-Habib Traders Ltd.",
  "phone": "+92-300-9999999",
  "openingBalance": {
    "amount": 15000,
    "date": "2025-11-15",
    "note": "Corrected from old ERP"
  }
}
```

> **Warning**: Attempting to update `openingBalance` when the supplier already has purchase orders returns `400 Bad Request`:  
> `"Opening balance cannot be modified after purchase orders have been created for this supplier"`

#### Response `200 OK`

Full updated supplier object.

---

### 6. Delete Supplier (Soft Delete)

```
DELETE /suppliers/:id
Permission: suppliers.delete
Audited: Yes
```

Sets `deletedAt` timestamp and `isActive = false`.

#### Response `200 OK`

```json
{ "message": "Supplier deleted successfully" }
```

---

### 7. Toggle Active Status

```
PATCH /suppliers/:id/toggle-active
Permission: suppliers.update
Audited: Yes
```

No request body. Flips `isActive` between `true` and `false`.

#### Response `200 OK`

Full updated supplier object. Check `isActive` to know the new state.

---

## Supplier Transactions

Manual financial entries against a supplier — for recording cash payments, adjustments, or anything not tied to a PO.

> **Debit** = reduces what the factory owes the supplier (payments, returns)  
> **Credit** = increases what the factory owes the supplier (purchases, adjustments)

### 1. Create Transaction

```
POST /suppliers/:supplierId/transactions
Permission: suppliers.create
```

#### Request Body

```json
{
  "date": "2026-06-04",
  "type": "PAYMENT",
  "reference": "REC-001",
  "description": "Cash payment to supplier",
  "debit": 5000,
  "credit": 0,
  "notes": "Paid via cash on site visit"
}
```

| Field         | Type                      | Required | Notes                                         |
| ------------- | ------------------------- | -------- | --------------------------------------------- |
| `date`        | `string`                  | Yes      | ISO date string, e.g. `"2026-06-04"`          |
| `type`        | `SupplierTransactionType` | Yes      | `PAYMENT`, `PURCHASE`, `RETURN`, `ADJUSTMENT` |
| `reference`   | `string`                  | No       | Receipt or voucher number                     |
| `description` | `string`                  | Yes      |                                               |
| `debit`       | `number`                  | Yes      | Must be ≥ 0                                   |
| `credit`      | `number`                  | Yes      | Must be ≥ 0                                   |
| `notes`       | `string`                  | No       |                                               |

> **Validation**: Either `debit` OR `credit` must be > 0. Both cannot be 0.

#### Response `201 Created`

```json
{
  "id": "tx-uuid",
  "supplierId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "date": "2026-06-04T00:00:00.000Z",
  "type": "PAYMENT",
  "reference": "REC-001",
  "description": "Cash payment to supplier",
  "debit": "5000.00",
  "credit": "0.00",
  "notes": "Paid via cash on site visit",
  "createdById": "user-uuid",
  "updatedById": "user-uuid",
  "createdAt": "2026-06-04T10:00:00.000Z",
  "updatedAt": "2026-06-04T10:00:00.000Z"
}
```

> `debit` and `credit` are Prisma `Decimal` — returned as strings. Parse with `parseFloat()` before arithmetic.

---

### 2. List Transactions

```
GET /suppliers/:supplierId/transactions
Permission: suppliers.read
```

#### Query Parameters

| Param       | Type                      | Default | Notes                         |
| ----------- | ------------------------- | ------- | ----------------------------- |
| `page`      | `number`                  | `1`     |                               |
| `limit`     | `number`                  | `20`    | Max: 100                      |
| `startDate` | `string`                  | —       | ISO date, e.g. `"2026-01-01"` |
| `endDate`   | `string`                  | —       | ISO date, e.g. `"2026-12-31"` |
| `type`      | `SupplierTransactionType` | —       | Filter by type                |

#### Response `200 OK`

```json
{
  "data": [
    /* array of transaction objects */
  ],
  "meta": {
    "total": 8,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 3. Get Single Transaction

```
GET /suppliers/:supplierId/transactions/:id
Permission: suppliers.read
```

Returns single transaction object.

---

### 4. Update Transaction

```
PATCH /suppliers/:supplierId/transactions/:id
Permission: suppliers.update
```

All fields optional. Same shape as create body.

#### Response `200 OK`

Full updated transaction object.

---

### 5. Delete Transaction

```
DELETE /suppliers/:supplierId/transactions/:id
Permission: suppliers.delete
```

Hard delete — permanently removes the record.

#### Response `200 OK`

```json
{ "message": "Transaction deleted successfully" }
```

---

## Supplier Ledger

Read-only financial reporting. No create/update/delete here.

### 1. Ledger Overview (All Suppliers)

```
GET /suppliers/ledger-overview
Permission: suppliers.read
```

Returns a flat list of all **active** suppliers with their calculated balance. Useful for an accounts payable dashboard.

#### Query Parameters

| Param    | Type     | Notes                                       |
| -------- | -------- | ------------------------------------------- |
| `search` | `string` | Optional. Searches `name`, `email`, `phone` |

#### Response `200 OK`

Array (not paginated):

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Al-Habib Traders",
    "email": "contact@alhabib.com",
    "phone": "+92-300-1234567",
    "address": "123 Industrial Area, Lahore",
    "balance": 45000,
    "totalPurchases": 100000,
    "totalPayments": 60000,
    "totalReturns": 5000,
    "lastPaymentDate": "2026-05-20T00:00:00.000Z"
  }
]
```

| Field             | Description                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `balance`         | Net amount factory owes the supplier. Positive = factory owes supplier. Negative = supplier has credit to factory |
| `totalPurchases`  | Sum of all PO amounts                                                                                             |
| `totalPayments`   | Sum of all payments made against POs                                                                              |
| `totalReturns`    | Sum of approved/completed purchase returns                                                                        |
| `lastPaymentDate` | Date of the most recent payment, or `null` if no payments                                                         |

**Balance formula**: `openingBalance + totalPurchases - totalPayments - totalReturns + manualCredits - manualDebits`

---

### 2. Supplier Ledger Detail

```
GET /suppliers/:id/ledger
Permission: suppliers.read
```

Returns a complete chronological ledger for a single supplier with a running balance on each line.

#### Query Parameters

| Param       | Type     | Notes                             |
| ----------- | -------- | --------------------------------- |
| `startDate` | `string` | Optional. ISO date `"2026-01-01"` |
| `endDate`   | `string` | Optional. ISO date `"2026-12-31"` |

#### Response `200 OK`

```json
{
  "supplier": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Al-Habib Traders",
    "email": "contact@alhabib.com",
    "phone": "+92-300-1234567",
    "address": "123 Industrial Area, Lahore"
  },
  "openingBalance": 10000,
  "currentBalance": 45000,
  "summary": {
    "totalPurchases": 100000,
    "totalPayments": 60000,
    "totalReturns": 5000,
    "manualDebits": 0,
    "manualCredits": 0
  },
  "entries": [
    {
      "date": "2025-11-15T00:00:00.000Z",
      "type": "OPENING_BALANCE",
      "reference": null,
      "description": "Migrated from old ERP",
      "debit": 0,
      "credit": 10000,
      "balance": 10000,
      "sourceId": null
    },
    {
      "date": "2026-01-10T00:00:00.000Z",
      "type": "PURCHASE_ORDER",
      "reference": "PO-2026-001",
      "description": "Purchase order PO-2026-001",
      "debit": 0,
      "credit": 50000,
      "balance": 60000,
      "sourceId": "po-uuid"
    },
    {
      "date": "2026-02-05T00:00:00.000Z",
      "type": "PAYMENT",
      "reference": "TRF-99",
      "description": "Payment for PO PO-2026-001 via BANK_TRANSFER",
      "debit": 30000,
      "credit": 0,
      "balance": 30000,
      "sourceId": "payment-uuid"
    },
    {
      "date": "2026-03-01T00:00:00.000Z",
      "type": "PURCHASE_RETURN",
      "reference": "RET-2026-001",
      "description": "Return RET-2026-001 — damaged goods",
      "debit": 5000,
      "credit": 0,
      "balance": 25000,
      "sourceId": "return-uuid"
    }
  ]
}
```

| Entry Field | Description                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------- |
| `type`      | `OPENING_BALANCE`, `PURCHASE_ORDER`, `PAYMENT`, `PURCHASE_RETURN`, or any `SupplierTransactionType` |
| `debit`     | Amount that reduces what factory owes                                                               |
| `credit`    | Amount that increases what factory owes                                                             |
| `balance`   | Running cumulative balance after this entry                                                         |
| `sourceId`  | UUID of the originating record (PO, payment, return, or transaction). `null` for opening balance    |

Entries are sorted **chronologically** (oldest first).

---

## Error Responses

```json
{ "statusCode": 400, "message": "Opening balance cannot be modified after purchase orders have been created for this supplier" }
{ "statusCode": 400, "message": "Either debit or credit must be greater than 0" }
{ "statusCode": 404, "message": "Supplier not found" }
{ "statusCode": 409, "message": "A supplier with this email already exists" }
```

---

## Frontend Implementation Notes

### Supplier Form

- Add an "Opening Balance" collapsible section with `amount` (number), `date` (date picker), `note` (text)
- Show the section as read-only / warn user if the supplier already has POs (the backend will reject it anyway, but better to prevent it in UI)

### Supplier Detail Screen (suggested tabs)

| Tab          | Endpoint                                  |
| ------------ | ----------------------------------------- |
| Overview     | `GET /suppliers/:id`                      |
| Ledger       | `GET /suppliers/:id/ledger`               |
| Transactions | `GET /suppliers/:supplierId/transactions` |

### Balance Display

- `balance > 0` → factory owes supplier → show in red/warning color
- `balance === 0` → settled → show in green
- `balance < 0` → supplier owes factory (credit) → show in blue/info color

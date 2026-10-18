# Purchase Orders Module — Frontend API Reference

> **Purpose**: Complete API reference for the Purchase Orders module (recently overhauled — status flow, payments, and GRN integration).
> **Audience**: Frontend developers building the Purchase Order, Purchase Returns, Summary, and Reports screens.
> **Base URL**: All paths are relative to the API root (e.g., `https://api.example.com/`).
> **Auth**: All endpoints require a Bearer JWT token in the `Authorization` header.

---

## Table of Contents

1. [Overview](#overview)
2. [Permissions](#permissions)
3. [Enums & Constants](#enums--constants)
4. [Purchase Orders API](#purchase-orders-api)
   - [Create Purchase Order](#1-create-purchase-order)
   - [Purchase Orders Dropdown](#2-purchase-orders-dropdown)
   - [List Purchase Orders (paginated)](#3-list-purchase-orders-paginated)
   - [Get Single Purchase Order](#4-get-single-purchase-order)
   - [Update Purchase Order](#5-update-purchase-order)
   - [Update Purchase Order Status](#6-update-purchase-order-status)
   - [Delete Purchase Order](#7-delete-purchase-order)
   - [Add Payment](#8-add-payment)
   - [Update Payment](#9-update-payment)
   - [Get Payment History](#10-get-payment-history)
5. [Purchase Returns API](#purchase-returns-api)
   - [Create Purchase Return](#1-create-purchase-return)
   - [List Purchase Returns (paginated)](#2-list-purchase-returns-paginated)
   - [Get Single Purchase Return](#3-get-single-purchase-return)
   - [Update Purchase Return](#4-update-purchase-return)
   - [Update Return Status](#5-update-return-status)
   - [Delete Purchase Return](#6-delete-purchase-return)
6. [Summary & Reports API](#summary--reports-api)
7. [Error Responses](#error-responses)
8. [Frontend Implementation Notes](#frontend-implementation-notes)

---

## Overview

The Purchase Orders module covers the full procurement lifecycle:

| Sub-module       | Base Path                  | Description                                                              |
| ---------------- | -------------------------- | ------------------------------------------------------------------------ |
| Purchase Orders  | `/purchase-orders`         | Create and manage POs, items, status, and payments                       |
| Purchase Returns | `/purchase-returns`        | Return received raw materials back to suppliers (against a PO/GRN/batch) |
| Summary          | `/purchase-orders/summary` | Dashboard analytics (totals, monthly trends, top suppliers)              |
| Reports          | `/purchase-orders/reports` | Detailed reports + CSV/PDF export                                        |

### Purchase Order Lifecycle

```
DRAFT ──► CONFIRMED ──► PARTIAL ──► RECEIVED
  │                                    ▲
  │                                    │ (allReceived)
  └──► CANCELLED              CONFIRMED ──┘
```

- **DRAFT**: Initial state. Items and header can be freely edited or deleted.
- **CONFIRMED**: PO has been approved and sent to the supplier. Cannot be edited item-by-item beyond header changes (header/items can still be PATCHed as long as status is not `RECEIVED`/`CANCELLED`, but the _status_ can no longer move back to `DRAFT`).
- **PARTIAL**: Some — but not all — ordered quantities have been received via GRN(s). Set automatically by the GRN flow (`syncReceivedQtyAndStatus`).
- **RECEIVED**: All ordered quantities have been received. Set automatically once every line item's `receivedQty >= quantity`.
- **CANCELLED**: Terminal state. Cannot cancel if any GRN linked to the PO is already `COMPLETED`.

> **Note**: `PARTIAL` and `RECEIVED` are normally reached automatically as GRNs are processed (not via the `PATCH /:purchaseOrderId/status` endpoint) — see [Update Purchase Order Status](#6-update-purchase-order-status) for the manually-allowed transitions.

### Payments

- A PO tracks `amountPaid` and `paymentStatus` (`PENDING` / `PARTIAL` / `PAID` / `REFUNDED` / `CANCELLED`).
- Payments are added incrementally via `POST /:purchaseOrderId/payments` and can be corrected via `PATCH /:purchaseOrderId/payments/:paymentId`.
- `paymentStatus` is recalculated automatically on every add/update based on `amountPaid` vs `totalAmount`.
- For `BANK_TRANSFER` or `CHEQUE` payments, an optional `bankAccountId` (from the supplier's bank accounts) can be recorded. Other methods reject this field.

### Returns

- A `PurchaseReturn` is created against a PO (and optionally a GRN), with one or more line items each tied to a specific `RawMaterialBatch`.
- Creating/updating a return **immediately reserves** (decrements) the batch's `availableQuantity` and the raw material's `currentStock` — even while the return is still `DRAFT`.
- The return then moves through its own status flow: `DRAFT → PENDING → APPROVED → COMPLETED`, with `REJECTED`/`CANCELLED` releasing the reserved quantities back to stock.

---

## Permissions

| Permission Key     | What it guards                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `purchases.create` | Create purchase orders and purchase returns                                                         |
| `purchases.read`   | List/view purchase orders, returns, payment history, dropdown                                       |
| `purchases.update` | Update PO/return header & items, change status, add/update payments                                 |
| `purchases.delete` | Delete a DRAFT purchase order or DRAFT purchase return                                              |
| `reports.view_all` | View purchase summary, monthly trends, top suppliers, reports, monthly comparison, product analysis |
| `reports.export`   | Export purchase reports to CSV/PDF                                                                  |

---

## Enums & Constants

### `PurchaseStatus`

```
DRAFT      — Editable draft, not yet sent to supplier
CONFIRMED  — Approved, awaiting goods receipt
PARTIAL    — Some quantities received via GRN
RECEIVED   — All ordered quantities received
CANCELLED  — Terminal — order cancelled
```

### `EPaymentStatus`

```
PENDING   — amountPaid <= 0
PARTIAL   — 0 < amountPaid < totalAmount
PAID      — amountPaid >= totalAmount
REFUNDED  — (not set by current PO flows; reserved for future use)
CANCELLED — (not set by current PO flows; reserved for future use)
```

### `PaymentMethod`

```
CASH
CARD
MOBILE_PAYMENT
BANK_TRANSFER
CHEQUE
OTHER
CREDIT
```

### `ReturnStatus`

```
DRAFT      — Editable, batch quantities already reserved
PENDING    — Submitted for approval
APPROVED   — Approved by an approver
REJECTED   — Rejected (requires a reason); reserved quantities released
COMPLETED  — Finalized; batch returnedQuantity incremented + consumption log created
CANCELLED  — Cancelled from DRAFT/PENDING; reserved quantities released
```

### Order / Return Number Formats

Auto-generated by the backend:

- Purchase Order: `PO-XXXXXX` (zero-padded sequential, e.g. `PO-000001`)
- Purchase Return: `PR-XXXXXX` (zero-padded sequential, e.g. `PR-000001`)

### Decimal Fields

`subTotal`, `shippingCost`, `totalAmount`, `amountPaid`, `remainingAmount`, item `unitPrice`/`totalPrice`, payment `amount`, and return `totalAmount`/item `unitPrice`/`totalPrice` are all Prisma `Decimal` fields **converted to JS `number`** by the repository's serializer before being returned — they come back as numbers (not strings) in JSON responses for this module.

---

## Purchase Orders API

### 1. Create Purchase Order

```
POST /purchase-orders
Permission: purchases.create
```

Creates a PO in `DRAFT` status with an auto-generated `orderNumber`. `subTotal` and `totalAmount` are computed server-side from items + `shippingCost`.

#### Request Body

```json
{
  "supplierId": "5939c357-3904-489e-8016-cc8e30eb89a5",
  "referenceNo": "REF-2026-001",
  "orderDate": "2026-06-01",
  "expectedDate": "2026-06-10",
  "shippingCost": 500,
  "remarks": "Cotton for summer batch",
  "items": [
    {
      "rawMaterialId": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
      "quantity": 100,
      "unitPrice": 25.5,
      "notes": "Urgent batch"
    }
  ]
}
```

| Field                   | Type                      | Required | Notes                                              |
| ----------------------- | ------------------------- | -------- | -------------------------------------------------- |
| `supplierId`            | `uuid`                    | No       | Must exist; if omitted, PO has no linked supplier  |
| `referenceNo`           | `string`                  | No       | Free-text supplier reference                       |
| `orderDate`             | `ISO date string`         | No       | Defaults to current date                           |
| `expectedDate`          | `ISO date string`         | No       | Expected delivery date                             |
| `shippingCost`          | `number`                  | No       | Default `0`, must be ≥ 0                           |
| `remarks`               | `string`                  | No       |                                                    |
| `items`                 | `CreatePurchaseItemDto[]` | Yes      | Min 1 item                                         |
| `items[].rawMaterialId` | `uuid`                    | Yes      | Must reference an active, non-deleted raw material |
| `items[].quantity`      | `number`                  | Yes      | 0.01–999999                                        |
| `items[].unitPrice`     | `number`                  | Yes      | Min 0.01                                           |
| `items[].notes`         | `string`                  | No       |                                                    |

#### Response `201 Created`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "orderNumber": "PO-000001",
  "supplierId": "5939c357-3904-489e-8016-cc8e30eb89a5",
  "supplierName": null,
  "referenceNo": "REF-2026-001",
  "orderDate": "2026-06-01T00:00:00.000Z",
  "expectedDate": "2026-06-10T00:00:00.000Z",
  "status": "DRAFT",
  "subTotal": 2550,
  "shippingCost": 500,
  "totalAmount": 3050,
  "amountPaid": 0,
  "remainingAmount": 3050,
  "paymentStatus": "PENDING",
  "remarks": "Cotton for summer batch",
  "createdById": "user-uuid",
  "updatedById": null,
  "createdAt": "2026-06-10T10:00:00.000Z",
  "updatedAt": "2026-06-10T10:00:00.000Z",
  "supplier": {
    "id": "5939c357-3904-489e-8016-cc8e30eb89a5",
    "name": "Sunrise Textiles Ltd.",
    "phone": "+923001234567",
    "email": "supplier@example.com"
  },
  "items": [
    {
      "id": "item-uuid-1",
      "purchaseOrderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "rawMaterialId": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
      "quantity": 100,
      "receivedQty": 0,
      "unitPrice": 25.5,
      "totalPrice": 2550,
      "notes": "Urgent batch",
      "createdAt": "2026-06-10T10:00:00.000Z",
      "updatedAt": "2026-06-10T10:00:00.000Z",
      "rawMaterial": {
        "id": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
        "name": "Cotton Yarn",
        "code": "CTN-YARN",
        "uom": { "id": "uom-uuid", "name": "Kilogram", "symbol": "kg" }
      }
    }
  ],
  "payments": [],
  "createdBy": { "id": "user-uuid", "name": "Jane Doe", "email": "jane@example.com" },
  "updatedBy": null
}
```

> **Note**: `subTotal`, `shippingCost`, `totalAmount`, `amountPaid`, `remainingAmount`, item `unitPrice`/`totalPrice`, and payment `amount` are returned as **numbers** (already converted from Prisma `Decimal`).

#### Validation Errors `400 Bad Request`

```json
{ "message": "Purchase order must have at least one item" }
{ "message": "The following raw material ID(s) are not available: <id>" }
{ "message": ["quantity is required", "unitPrice is required"] }
```

---

### 2. Purchase Orders Dropdown

```
GET /purchase-orders/dropdown
Permission: purchases.read
```

Returns all purchase orders (no filtering by status currently applied — see note), ordered by `createdAt` descending. Intended for selecting a PO when creating a GRN or Purchase Return.

#### Response `200 OK`

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "orderNumber": "PO-000001",
    "orderDate": "2026-06-01T00:00:00.000Z",
    "status": "CONFIRMED",
    "paymentStatus": "PARTIAL",
    "supplier": { "id": "5939c357-3904-489e-8016-cc8e30eb89a5", "name": "Sunrise Textiles Ltd." }
  }
]
```

> **Note**: The repository has a status filter (`CONFIRMED`/`PARTIAL`) commented out — currently **all** POs (any status) are returned. Frontend should filter client-side if only `CONFIRMED`/`PARTIAL` orders are appropriate for a GRN dropdown.

---

### 3. List Purchase Orders (Paginated)

```
GET /purchase-orders
Permission: purchases.read
```

#### Query Parameters

| Param           | Type                | Default     | Notes                                                      |
| --------------- | ------------------- | ----------- | ---------------------------------------------------------- |
| `page`          | `number`            | `1`         | Min 1, Max 100                                             |
| `limit`         | `number`            | `10`        | Min 1, Max 100                                             |
| `search`        | `string`            | —           | Searches `orderNumber`, `referenceNo`, and `supplier.name` |
| `supplierId`    | `uuid`              | —           | Filter by supplier                                         |
| `status`        | `PurchaseStatus`    | —           | `DRAFT`, `CONFIRMED`, `PARTIAL`, `RECEIVED`, `CANCELLED`   |
| `paymentStatus` | `EPaymentStatus`    | —           | `PENDING`, `PARTIAL`, `PAID`, `REFUNDED`, `CANCELLED`      |
| `startDate`     | `ISO date string`   | —           | `orderDate >=`                                             |
| `endDate`       | `ISO date string`   | —           | `orderDate <=`                                             |
| `sortBy`        | `string`            | `createdAt` |                                                            |
| `sortOrder`     | `"ASC"` \| `"DESC"` | `"DESC"`    |                                                            |

#### Response `200 OK`

```json
{
  "data": [{ "...": "same shape as Create response" }],
  "meta": {
    "total": 32,
    "page": 1,
    "limit": 10,
    "totalPages": 4
  }
}
```

---

### 4. Get Single Purchase Order

```
GET /purchase-orders/:purchaseOrderId
Permission: purchases.read
```

#### Path Parameter

| Param             | Type   | Notes |
| ----------------- | ------ | ----- |
| `purchaseOrderId` | `uuid` | PO ID |

#### Response `200 OK`

Same shape as the [Create response](#1-create-purchase-order), including `items`, `payments` (with `paidBy` resolved), `createdBy`, `updatedBy`, and `supplier`.

#### Response `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Purchase order \"<id>\" not found",
  "error": "Not Found"
}
```

---

### 5. Update Purchase Order

```
PATCH /purchase-orders/:purchaseOrderId
Permission: purchases.update
```

Updates header fields and/or performs an **items diff** (create/update/delete in one call). Recomputes `subTotal` and `totalAmount` if `items` or `shippingCost` are provided.

**Business Rules:**

- Cannot update a PO with status `RECEIVED` or `CANCELLED` → `400 Bad Request`.
- Items array is a full diff: items with an `id` are updated, items without an `id` are created, and any existing item **not present** in the array is deleted.
- New/updated `rawMaterialId`s are re-validated (must be active, non-deleted raw materials).

#### Path Parameter

| Param             | Type   | Notes           |
| ----------------- | ------ | --------------- |
| `purchaseOrderId` | `uuid` | PO ID to update |

#### Request Body

All fields optional.

```json
{
  "supplierId": "5939c357-3904-489e-8016-cc8e30eb89a5",
  "referenceNo": "REF-2026-001-A",
  "orderDate": "2026-06-02",
  "expectedDate": "2026-06-12",
  "shippingCost": 600,
  "remarks": "Updated remarks",
  "items": [
    {
      "id": "item-uuid-1",
      "rawMaterialId": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
      "quantity": 120,
      "unitPrice": 26,
      "notes": "Increased qty"
    },
    {
      "rawMaterialId": "c4d5e6f7-a8b9-0123-cdef-456789012345",
      "quantity": 50,
      "unitPrice": 10
    }
  ]
}
```

| Field          | Type                      | Required | Notes                                                                                                                          |
| -------------- | ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `supplierId`   | `uuid`                    | No       |                                                                                                                                |
| `referenceNo`  | `string`                  | No       |                                                                                                                                |
| `orderDate`    | `ISO date string`         | No       |                                                                                                                                |
| `expectedDate` | `ISO date string`         | No       |                                                                                                                                |
| `shippingCost` | `number`                  | No       | Min 0                                                                                                                          |
| `remarks`      | `string`                  | No       |                                                                                                                                |
| `items`        | `UpdatePurchaseItemDto[]` | No       | Min 1 item if provided. Items with `id` = update existing; items without `id` = create new; omitted existing items are deleted |

#### Response `200 OK`

Full updated purchase order (same shape as [Create response](#1-create-purchase-order)).

#### Validation Error `400 Bad Request`

```json
{ "message": "Cannot update a RECEIVED purchase order" }
{ "message": "Cannot update a CANCELLED purchase order" }
```

---

### 6. Update Purchase Order Status

```
PATCH /purchase-orders/:purchaseOrderId/status
Permission: purchases.update
```

Manually transitions the PO status. **Only the following transitions are allowed via this endpoint:**

| From        | Allowed To               |
| ----------- | ------------------------ |
| `DRAFT`     | `CONFIRMED`, `CANCELLED` |
| `CONFIRMED` | `RECEIVED`               |
| `PARTIAL`   | `RECEIVED`               |
| `RECEIVED`  | _(none — terminal)_      |
| `CANCELLED` | _(none — terminal)_      |

> In normal flow, `CONFIRMED → PARTIAL` and `→ RECEIVED` happen **automatically** when GRNs are processed (via `syncReceivedQtyAndStatus`), not through this endpoint. This endpoint is mainly for `DRAFT → CONFIRMED`, `DRAFT → CANCELLED`, and manually marking an order fully `RECEIVED`.

**Additional Business Rules:**

- `→ CONFIRMED`: PO must have at least one item.
- `→ CANCELLED`: Fails if any GRN linked to this PO has `status = COMPLETED`.

#### Path Parameter

| Param             | Type   | Notes |
| ----------------- | ------ | ----- |
| `purchaseOrderId` | `uuid` | PO ID |

#### Request Body

```json
{
  "status": "CONFIRMED"
}
```

| Field    | Type             | Required | Notes                                                           |
| -------- | ---------------- | -------- | --------------------------------------------------------------- |
| `status` | `PurchaseStatus` | Yes      | One of `DRAFT`, `CONFIRMED`, `PARTIAL`, `RECEIVED`, `CANCELLED` |

#### Response `200 OK`

Full updated purchase order (same shape as [Create response](#1-create-purchase-order)).

#### Validation Errors `400 Bad Request`

```json
{ "message": "Cannot transition purchase order from DRAFT to RECEIVED" }
{ "message": "Cannot confirm a purchase order with no items" }
{ "message": "Cannot cancel — 2 GRN(s) have already been completed for this order" }
```

---

### 7. Delete Purchase Order

```
DELETE /purchase-orders/:purchaseOrderId
Permission: purchases.delete
```

Hard-deletes a PO (cascades to its items via `onDelete: Cascade`). **Only `DRAFT` purchase orders can be deleted.**

#### Path Parameter

| Param             | Type   | Notes           |
| ----------------- | ------ | --------------- |
| `purchaseOrderId` | `uuid` | PO ID to delete |

#### Response `200 OK`

```json
{
  "message": "Purchase order deleted successfully"
}
```

#### Validation Error `400 Bad Request`

```json
{ "message": "Only DRAFT purchase orders can be deleted" }
```

---

### 8. Add Payment

```
POST /purchase-orders/:purchaseOrderId/payments
Permission: purchases.update
```

Records a new payment against the PO. Recomputes `amountPaid` and `paymentStatus` atomically.

**Business Rules:**

- Cannot add a payment to a `CANCELLED` PO.
- `amountPaid + amount` cannot exceed `totalAmount`.
- `paymentStatus` becomes: `PENDING` if new `amountPaid <= 0`, `PAID` if `>= totalAmount`, otherwise `PARTIAL`.
- `bankAccountId` is only accepted for `BANK_TRANSFER` or `CHEQUE` — rejected for all other methods.
- `bankAccountId` requires the PO to have a linked supplier (`supplierId` must be set).
- `bankAccountId` must belong to that PO's supplier or the request is rejected.

#### Path Parameter

| Param             | Type   | Notes |
| ----------------- | ------ | ----- |
| `purchaseOrderId` | `uuid` | PO ID |

#### Request Body

```json
{
  "amount": 5000,
  "paymentMethod": "BANK_TRANSFER",
  "bankAccountId": "supplier-bank-account-uuid",
  "referenceNumber": "TXN-20260601-001",
  "notes": "Partial payment for June batch"
}
```

| Field             | Type            | Required | Notes                                                                          |
| ----------------- | --------------- | -------- | ------------------------------------------------------------------------------ |
| `amount`          | `number`        | Yes      | Min 0.01                                                                       |
| `paymentMethod`   | `PaymentMethod` | Yes      | `CASH`, `CARD`, `MOBILE_PAYMENT`, `BANK_TRANSFER`, `CHEQUE`, `OTHER`, `CREDIT` |
| `bankAccountId`   | `uuid`          | No       | Supplier's bank account — only valid for `BANK_TRANSFER` or `CHEQUE`; PO must have a linked supplier |
| `referenceNumber` | `string`        | No       | Bank TXN ID / cheque number — recommended for non-cash methods                 |
| `notes`           | `string`        | No       |                                                                                |

#### Response `201 Created`

Full updated purchase order (same shape as [Create response](#1-create-purchase-order)) — `amountPaid`, `remainingAmount`, `paymentStatus`, and `payments[]` reflect the new payment. Each payment object includes a `bankAccount` field (`{ id, bankName, accountTitle, accountNumber }` or `null`).

#### Validation Error `400 Bad Request`

```json
{ "message": "Cannot add payment to a cancelled purchase order" }
{ "message": "Payment of 5000 exceeds remaining balance of 3050.00" }
{ "message": "Bank account is only applicable for BANK_TRANSFER or CHEQUE payments, not CASH" }
{ "message": "Cannot specify a bank account — this purchase order has no linked supplier" }
{ "message": "Bank account not found or does not belong to this purchase order's supplier" }
```

---

### 9. Update Payment

```
PATCH /purchase-orders/:purchaseOrderId/payments/:paymentId
Permission: purchases.update
```

Updates an existing payment's `amount`, `paymentMethod`, `referenceNumber`, and/or `notes`. Recalculates the PO's `amountPaid` and `paymentStatus` atomically based on the **difference** between the old and new amount.

**Business Rules:**

- Cannot modify a payment on a `CANCELLED` PO.
- `paymentId` must belong to `purchaseOrderId`.
- Resulting `amountPaid` (after replacing old amount with new) cannot go below 0 or exceed `totalAmount`.

#### Path Parameters

| Param             | Type   | Notes                |
| ----------------- | ------ | -------------------- |
| `purchaseOrderId` | `uuid` | PO ID                |
| `paymentId`       | `uuid` | Payment ID to update |

#### Request Body

```json
{
  "amount": 2500,
  "paymentMethod": "BANK_TRANSFER",
  "referenceNumber": "TXN-20260601-002",
  "notes": "Corrected payment amount"
}
```

| Field             | Type            | Required | Notes                                                                                                                                          |
| ----------------- | --------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `amount`          | `number`        | Yes      | Min 0.01 — the **new** total amount for this payment record (not a delta)                                                                      |
| `paymentMethod`   | `PaymentMethod` | No       | If omitted, existing method is kept (note: repository passes `undefined` through, so omitting leaves the field unchanged in the Prisma update) |
| `referenceNumber` | `string`        | No       | Sent as `null` if omitted                                                                                                                      |
| `notes`           | `string`        | No       | Sent as `null` if omitted                                                                                                                      |

#### Response `200 OK`

Returns the **updated `PurchasePayment`** record (not the full PO):

```json
{
  "id": "payment-uuid",
  "purchaseOrderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "amount": 2500,
  "paymentMethod": "BANK_TRANSFER",
  "referenceNumber": "TXN-20260601-002",
  "paymentDate": "2026-06-01T00:00:00.000Z",
  "notes": "Corrected payment amount",
  "paidById": "user-uuid",
  "updatedById": "user-uuid",
  "createdAt": "2026-06-01T10:00:00.000Z",
  "updatedAt": "2026-06-10T11:00:00.000Z"
}
```

> **Note**: To see the PO's refreshed `amountPaid`/`paymentStatus`/`remainingAmount` after this call, re-fetch the PO via `GET /purchase-orders/:purchaseOrderId`.

#### Validation Errors `400 Bad Request` / `404 Not Found`

```json
{ "message": "Cannot modify a payment on a cancelled purchase order" }
{ "statusCode": 404, "message": "Payment \"<id>\" not found" }
{ "message": "Payment does not belong to this purchase order" }
{ "message": "Reducing this payment by 1500.00 would make total paid negative" }
{ "message": "Payment of 6000 exceeds the order total of 3050.00" }
```

---

### 10. Get Payment History

```
GET /purchase-orders/:purchaseOrderId/payments
Permission: purchases.read
```

#### Path Parameter

| Param             | Type   | Notes |
| ----------------- | ------ | ----- |
| `purchaseOrderId` | `uuid` | PO ID |

#### Response `200 OK`

Array of `PurchasePayment` records, newest first:

```json
[
  {
    "id": "payment-uuid",
    "purchaseOrderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "amount": 2500,
    "paymentMethod": "BANK_TRANSFER",
    "referenceNumber": "TXN-20260601-002",
    "paymentDate": "2026-06-01T00:00:00.000Z",
    "notes": "Corrected payment amount",
    "paidById": "user-uuid",
    "updatedById": "user-uuid",
    "createdAt": "2026-06-01T10:00:00.000Z",
    "updatedAt": "2026-06-10T11:00:00.000Z"
  }
]
```

#### Response `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Purchase order \"<id>\" not found",
  "error": "Not Found"
}
```

---

## Purchase Returns API

### 1. Create Purchase Return

```
POST /purchase-returns
Permission: purchases.create
```

Creates a return in `DRAFT` status with auto-generated `returnNumber`. **Each line item is immediately validated and reserved against its `batchId`** — `availableQuantity` on the batch and `currentStock` on the raw material are decremented at create time, even though the return is still a draft.

`unitPrice` for each item is **always** taken from the batch's stored `unitCost` (any client-supplied `unitPrice` is ignored). `totalAmount` = sum of `quantity * unitCost` across items.

#### Request Body

```json
{
  "purchaseOrderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "grnId": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
  "returnDate": "2026-06-01",
  "reason": "Defective raw material received",
  "remarks": "Batch number XYZ was entirely defective",
  "items": [
    {
      "rawMaterialId": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
      "batchId": "11111111-1111-1111-1111-111111111111",
      "grnItemId": "grn-item-uuid",
      "purchaseItemId": "purchase-item-uuid",
      "quantity": 5,
      "reason": "Defective batch"
    }
  ]
}
```

| Field                    | Type                            | Required | Notes                                                           |
| ------------------------ | ------------------------------- | -------- | --------------------------------------------------------------- |
| `purchaseOrderId`        | `uuid`                          | Yes      | PO this return is against                                       |
| `grnId`                  | `uuid`                          | No       | GRN this return is against (for traceability)                   |
| `returnDate`             | `ISO date string`               | No       | Defaults to current date                                        |
| `reason`                 | `string`                        | Yes      | Overall return reason                                           |
| `remarks`                | `string`                        | No       |                                                                 |
| `items`                  | `CreatePurchaseReturnItemDto[]` | Yes      | Min 1 item                                                      |
| `items[].rawMaterialId`  | `uuid`                          | Yes      |                                                                 |
| `items[].batchId`        | `uuid`                          | Yes      | Quantity is deducted from `batch.availableQuantity` immediately |
| `items[].grnItemId`      | `uuid`                          | No       | For traceability                                                |
| `items[].purchaseItemId` | `uuid`                          | No       | For traceability                                                |
| `items[].quantity`       | `number`                        | Yes      | Min 0.01; must not exceed `batch.availableQuantity`             |
| `items[].unitPrice`      | `number`                        | No       | **Ignored** — always taken from `batch.unitCost`                |
| `items[].reason`         | `string`                        | No       | Per-item reason                                                 |

#### Response `201 Created`

```json
{
  "id": "return-uuid",
  "returnNumber": "PR-000001",
  "purchaseOrderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "grnId": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
  "returnDate": "2026-06-01T00:00:00.000Z",
  "reason": "Defective raw material received",
  "remarks": "Batch number XYZ was entirely defective",
  "totalAmount": 750,
  "status": "DRAFT",
  "approvedById": null,
  "approvedAt": null,
  "rejectedById": null,
  "rejectedReason": null,
  "completedAt": null,
  "createdById": "user-uuid",
  "updatedById": null,
  "createdAt": "2026-06-10T10:00:00.000Z",
  "updatedAt": "2026-06-10T10:00:00.000Z",
  "purchaseOrder": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "orderNumber": "PO-000001",
    "supplierId": "5939c357-3904-489e-8016-cc8e30eb89a5",
    "supplierName": null,
    "supplier": {
      "id": "5939c357-3904-489e-8016-cc8e30eb89a5",
      "name": "Sunrise Textiles Ltd.",
      "phone": "...",
      "email": "..."
    }
  },
  "grn": { "id": "f1e2d3c4-b5a6-7890-abcd-ef1234567890", "receivingNumber": "GRN-2026-001" },
  "items": [
    {
      "id": "return-item-uuid",
      "returnId": "return-uuid",
      "rawMaterialId": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
      "batchId": "11111111-1111-1111-1111-111111111111",
      "grnItemId": "grn-item-uuid",
      "purchaseItemId": "purchase-item-uuid",
      "quantity": 5,
      "unitPrice": 150,
      "totalPrice": 750,
      "reason": "Defective batch",
      "createdAt": "2026-06-10T10:00:00.000Z",
      "updatedAt": "2026-06-10T10:00:00.000Z",
      "rawMaterial": {
        "id": "b3f9c1a2-4e2d-4a1b-9c3e-1a2b3c4d5e6f",
        "name": "Cotton Yarn",
        "code": "CTN-YARN",
        "uom": { "id": "uom-uuid", "name": "Kilogram", "symbol": "kg" }
      },
      "batch": {
        "id": "11111111-1111-1111-1111-111111111111",
        "batchNumber": "RM-202606-0001",
        "availableQuantity": 395,
        "returnedQuantity": 0,
        "receivedQuantity": 500
      },
      "grnItem": { "id": "grn-item-uuid", "receivedQuantity": 500 },
      "purchaseItem": {
        "id": "purchase-item-uuid",
        "quantity": 100,
        "unitPrice": 150,
        "receivedQty": 100
      }
    }
  ]
}
```

#### Validation Errors `400 Bad Request` / `409 Conflict`

```json
{ "message": "Batch <id> not found" }
{ "message": "Return quantity 50 exceeds available quantity 5 in batch RM-202606-0001" }
{ "statusCode": 409, "message": "A purchase return with this number already exists", "error": "Conflict" }
```

---

### 2. List Purchase Returns (Paginated)

```
GET /purchase-returns
Permission: purchases.read
```

#### Query Parameters

| Param             | Type                | Default     | Notes                                                                |
| ----------------- | ------------------- | ----------- | -------------------------------------------------------------------- |
| `page`            | `number`            | `1`         | Min 1, Max 100                                                       |
| `limit`           | `number`            | `10`        | Min 1, Max 100                                                       |
| `search`          | `string`            | —           | Searches `returnNumber`, `reason`                                    |
| `supplierId`      | `uuid`              | —           | Filters via `purchaseOrder.supplierId`                               |
| `purchaseOrderId` | `uuid`              | —           |                                                                      |
| `grnId`           | `uuid`              | —           |                                                                      |
| `status`          | `ReturnStatus`      | —           | `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`, `CANCELLED` |
| `startDate`       | `ISO date string`   | —           | `returnDate >=`                                                      |
| `endDate`         | `ISO date string`   | —           | `returnDate <=`                                                      |
| `sortBy`          | `string`            | `createdAt` |                                                                      |
| `sortOrder`       | `"ASC"` \| `"DESC"` | `"DESC"`    |                                                                      |

#### Response `200 OK`

```json
{
  "data": [{ "...": "same shape as Create response" }],
  "meta": {
    "total": 8,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 3. Get Single Purchase Return

```
GET /purchase-returns/:returnId
Permission: purchases.read
```

#### Path Parameter

| Param      | Type   | Notes              |
| ---------- | ------ | ------------------ |
| `returnId` | `uuid` | Purchase return ID |

#### Response `200 OK`

Same shape as the [Create response](#1-create-purchase-return).

#### Response `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Purchase return \"<id>\" not found",
  "error": "Not Found"
}
```

---

### 4. Update Purchase Return

```
PATCH /purchase-returns/:returnId
Permission: purchases.update
```

**Only `DRAFT` returns can be edited.** Performs an items diff similar to PO update — items with `id` are updated, items without `id` are created (require `rawMaterialId`, `batchId`, `quantity`), and omitted existing items are deleted.

**Inventory side-effects on diff:**

- Deleted items → release reserved quantity back to the batch/raw material.
- Updated items (qty or batch changed) → release old reservation, then reserve against the new batch/quantity.
- New items → reserve against their batch immediately.
- `unitPrice`/`totalPrice` for updated items is recomputed from the **existing item's stored `unitPrice`** (still sourced from the batch at creation time) — client-sent `unitPrice` is ignored. New items get `unitPrice` from their batch's current `unitCost`.

#### Path Parameter

| Param      | Type   | Notes              |
| ---------- | ------ | ------------------ |
| `returnId` | `uuid` | Purchase return ID |

#### Request Body

All fields optional.

```json
{
  "grnId": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
  "returnDate": "2026-06-05",
  "reason": "Wrong specifications",
  "remarks": "Supplier agreed to take back full batch",
  "items": [
    {
      "id": "return-item-uuid",
      "quantity": 8
    },
    {
      "rawMaterialId": "c4d5e6f7-a8b9-0123-cdef-456789012345",
      "batchId": "22222222-2222-2222-2222-222222222222",
      "quantity": 3,
      "reason": "Wrong spec"
    }
  ]
}
```

| Field        | Type                            | Required | Notes                                                                                                                                          |
| ------------ | ------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `grnId`      | `uuid`                          | No       |                                                                                                                                                |
| `returnDate` | `ISO date string`               | No       |                                                                                                                                                |
| `reason`     | `string`                        | No       |                                                                                                                                                |
| `remarks`    | `string`                        | No       |                                                                                                                                                |
| `items`      | `UpdatePurchaseReturnItemDto[]` | No       | Items with `id` = update; items without `id` = create new (require `rawMaterialId`, `batchId`, `quantity`); omitted existing items are deleted |

#### Response `200 OK`

Full updated purchase return (same shape as [Create response](#1-create-purchase-return)).

#### Validation Errors `400 Bad Request`

```json
{ "message": "Only DRAFT returns can be edited" }
{ "message": "New return items require rawMaterialId, batchId, and quantity" }
{ "message": "Return quantity 10 exceeds available quantity 5 in batch RM-202606-0002" }
```

---

### 5. Update Return Status

```
PATCH /purchase-returns/:returnId/status
Permission: purchases.update
```

Transitions the return through its status flow. Allowed transitions and side-effects:

| Target Status | Allowed From                 | Side Effects                                                                                                                                                                                                                                                          |
| ------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PENDING`     | `DRAFT` (must have ≥ 1 item) | None (sets status only)                                                                                                                                                                                                                                               |
| `APPROVED`    | `PENDING`                    | Sets `approvedById`, `approvedAt`                                                                                                                                                                                                                                     |
| `REJECTED`    | `PENDING`                    | **Requires `reason`**. Sets `rejectedById`, `rejectedReason`. Releases all reserved batch quantities back to stock                                                                                                                                                    |
| `COMPLETED`   | `APPROVED`                   | Sets `completedAt`. Increments `batch.returnedQuantity` per item and creates a `RawMaterialBatchConsumption` record (`referenceType: "PURCHASE_RETURN"`) for audit trail. **Does not** re-adjust `availableQuantity`/`currentStock` (already decremented at creation) |
| `CANCELLED`   | `DRAFT` or `PENDING`         | Releases all reserved batch quantities back to stock                                                                                                                                                                                                                  |

#### Path Parameter

| Param      | Type   | Notes              |
| ---------- | ------ | ------------------ |
| `returnId` | `uuid` | Purchase return ID |

#### Request Body

```json
{
  "status": "REJECTED",
  "reason": "Items within acceptable tolerance"
}
```

| Field    | Type           | Required    | Notes                                                                     |
| -------- | -------------- | ----------- | ------------------------------------------------------------------------- |
| `status` | `ReturnStatus` | Yes         | `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`, `CANCELLED` (not `DRAFT`) |
| `reason` | `string`       | Conditional | **Required** when `status = REJECTED`; ignored otherwise                  |

#### Response `200 OK`

Full updated purchase return (same shape as [Create response](#1-create-purchase-return)).

#### Validation Errors `400 Bad Request`

```json
{ "message": "Only DRAFT returns can be submitted" }
{ "message": "Cannot submit a return with no items" }
{ "message": "Only PENDING returns can be approved" }
{ "message": "Only PENDING returns can be rejected" }
{ "message": "A reason is required when rejecting a return" }
{ "message": "Only APPROVED returns can be completed" }
{ "message": "Only DRAFT or PENDING returns can be cancelled" }
{ "message": "Invalid target status: DRAFT" }
```

---

### 6. Delete Purchase Return

```
DELETE /purchase-returns/:returnId
Permission: purchases.delete
```

Hard-deletes a return. **Only `DRAFT` returns can be deleted.** Before deletion, all reserved batch quantities (`availableQuantity` + raw material `currentStock`) are released back.

#### Path Parameter

| Param      | Type   | Notes                        |
| ---------- | ------ | ---------------------------- |
| `returnId` | `uuid` | Purchase return ID to delete |

#### Response `200 OK`

```json
{
  "message": "Purchase return deleted successfully"
}
```

#### Validation Error `400 Bad Request`

```json
{ "message": "Only DRAFT returns can be deleted" }
```

---

## Summary & Reports API

These endpoints are intended for dashboards. All require `reports.view_all` (export endpoints require `reports.export`).

### Summary Endpoints (`/purchase-orders/summary`)

| Endpoint                                      | Description                                                                                                                                                                                             | Query Params                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `GET /purchase-orders/summary`                | Aggregate counts/totals: `totalOrders`, `pendingOrders` (`DRAFT`/`CONFIRMED`), `completedOrders` (`RECEIVED`), `totalValue`, `totalValueMonth`, `totalValueYear`, `topSuppliers` (top 5 by total value) | `startDate`, `endDate` (filter `orderDate`)         |
| `GET /purchase-orders/summary/monthly-trends` | Array of `{ month, total_orders, total_value }` grouped by month, ascending. Defaults to last 12 months if no dates given                                                                               | `startDate`, `endDate`                              |
| `GET /purchase-orders/summary/top-suppliers`  | Array of `{ id, name, email, totalValue, orderCount, averageOrderValue }`, sorted by `totalValue` desc                                                                                                  | `startDate`, `endDate`, `limit` (1–100, default 10) |

#### Example: `GET /purchase-orders/summary`

```json
{
  "totalOrders": 32,
  "pendingOrders": 5,
  "completedOrders": 20,
  "totalValue": 458200,
  "totalValueMonth": 32000,
  "totalValueYear": 458200,
  "topSuppliers": [
    {
      "id": "supplier-uuid",
      "name": "Sunrise Textiles Ltd.",
      "totalValue": 120000,
      "orderCount": 8
    }
  ]
}
```

### Reports Endpoints (`/purchase-orders/reports`)

| Endpoint                                          | Description                                                                                                            | Query Params                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `GET /purchase-orders/reports`                    | Comprehensive purchase report (see `PurchaseReportsService.getReports`)                                                | `startDate`, `endDate`, `supplierId`, `rawMaterialId`, `status` |
| `GET /purchase-orders/reports/export/csv`         | Streams a CSV file (`Content-Type: text/csv`, `Content-Disposition: attachment; filename=purchase-reports.csv`)        | Same as above                                                   |
| `GET /purchase-orders/reports/export/pdf`         | Streams a PDF file (`Content-Type: application/pdf`, `Content-Disposition: attachment; filename=purchase-reports.pdf`) | Same as above                                                   |
| `GET /purchase-orders/reports/monthly-comparison` | Monthly purchases vs. returns comparison                                                                               | `startDate`, `endDate`, `supplierId`, `rawMaterialId`, `status` |
| `GET /purchase-orders/reports/product-analysis`   | Top purchased raw materials analysis                                                                                   | `startDate`, `endDate`, `supplierId`, `rawMaterialId`, `status` |

> The export endpoints write directly to the HTTP response (`res.send(...)`) — on the frontend, trigger these as a file download (e.g., open in a new tab or use a `<a download>` / blob response handler), not as a JSON `fetch`.

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
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Purchase order \"<id>\" not found",
  "error": "Not Found"
}
```

### 409 Conflict (duplicate return number)

```json
{
  "statusCode": 409,
  "message": "A purchase return with this number already exists",
  "error": "Conflict"
}
```

---

## Frontend Implementation Notes

### Status Colors (suggested)

**Purchase Order `status`**

| Status      | Color        |
| ----------- | ------------ |
| `DRAFT`     | Gray         |
| `CONFIRMED` | Blue         |
| `PARTIAL`   | Amber/Orange |
| `RECEIVED`  | Green        |
| `CANCELLED` | Red          |

**Purchase Order `paymentStatus`**

| Status      | Color        |
| ----------- | ------------ |
| `PENDING`   | Gray         |
| `PARTIAL`   | Amber/Orange |
| `PAID`      | Green        |
| `REFUNDED`  | Blue         |
| `CANCELLED` | Red          |

**Purchase Return `status`**

| Status      | Color        |
| ----------- | ------------ |
| `DRAFT`     | Gray         |
| `PENDING`   | Amber/Orange |
| `APPROVED`  | Blue         |
| `REJECTED`  | Red          |
| `COMPLETED` | Green        |
| `CANCELLED` | Red          |

### Decimal/Number Handling

Unlike the Raw Materials module, this module's repository **already converts all `Decimal` fields to JS `number`** (`subTotal`, `shippingCost`, `totalAmount`, `amountPaid`, `remainingAmount`, item `unitPrice`/`totalPrice`, payment `amount`, return `totalAmount`/item `unitPrice`/`totalPrice`). No `parseFloat()` needed — but be aware of standard floating-point precision when doing arithmetic client-side.

### Typical Screen Flows

**Purchase Orders List Screen**

- `GET /purchase-orders` with pagination, `search`, `status`, `paymentStatus`, `supplierId`, date range filters.
- Status badge driven by `status`; payment badge driven by `paymentStatus`.

**Create / Edit PO Screen**

- `POST /purchase-orders` to create (status starts `DRAFT`).
- `PATCH /purchase-orders/:id` while `DRAFT`/`CONFIRMED`/`PARTIAL` to edit header + item diff.
- Disable editing entirely once status is `RECEIVED` or `CANCELLED`.
- "Confirm" action button → `PATCH /:id/status` with `{ "status": "CONFIRMED" }` (only enabled if PO has items).
- "Cancel" action button → `PATCH /:id/status` with `{ "status": "CANCELLED" }` (only from `DRAFT`/`CONFIRMED`/`PARTIAL`; show error if GRNs already completed).

**PO Detail Screen**

- `GET /purchase-orders/:id` — show header, items table (`quantity` vs `receivedQty` progress), supplier info.
- Payments tab: `GET /:id/payments` for history; "Add Payment" → `POST /:id/payments`; "Edit Payment" → `PATCH /:id/payments/:paymentId` (re-fetch PO afterward to refresh `amountPaid`/`paymentStatus`).
- Returns tab: `GET /purchase-returns?purchaseOrderId=:id`.
- "Delete" button only visible/enabled for `DRAFT` POs → `DELETE /:id`.

**GRN Creation Flow**

- Use `GET /purchase-orders/dropdown` to select a PO (filter client-side to `CONFIRMED`/`PARTIAL` if needed, since the backend currently returns all statuses).
- After GRN processing, PO `status`/`receivedQty` updates automatically — re-fetch the PO to reflect `PARTIAL`/`RECEIVED`.

**Purchase Returns List/Detail Screens**

- `GET /purchase-returns` with pagination/filters (`status`, `purchaseOrderId`, `grnId`, `supplierId`, date range).
- Create return: select PO → select GRN/batches with `availableQuantity > 0` → `POST /purchase-returns`.
- Status action buttons drive `PATCH /:returnId/status`:
  - "Submit" (`DRAFT → PENDING`)
  - "Approve" (`PENDING → APPROVED`)
  - "Reject" (`PENDING → REJECTED`, requires reason input)
  - "Complete" (`APPROVED → COMPLETED`)
  - "Cancel" (`DRAFT`/`PENDING → CANCELLED`)
- Show a stock-impact note: creating/editing a `DRAFT` return already affects `availableQuantity`/`currentStock` — `REJECTED`/`CANCELLED` reverses it.

**Dashboard Widgets**

- `GET /purchase-orders/summary` for KPI cards (total orders, pending, completed, total/monthly/yearly value, top suppliers).
- `GET /purchase-orders/summary/monthly-trends` for a line/bar chart of orders & value by month.
- `GET /purchase-orders/reports/monthly-comparison` and `/product-analysis` for deeper report views.
- Export buttons → `GET /purchase-orders/reports/export/csv` / `/export/pdf` as file downloads.

# Scalable ERP — Complete Data Flow Diagrams (Start → End)

> **Purpose:** End-to-end data flow reference for every major path in the system — what gets created, what gets updated, and in what order.  
> **Companion docs:** [SYSTEM_FUNCTIONALITY_OVERVIEW.md](./SYSTEM_FUNCTIONALITY_OVERVIEW.md) · [ERP_FULL_UAT_GUIDE.md](./ERP_FULL_UAT_GUIDE.md) · [procurement-to-inventory-flow.md](./api/procurement-to-inventory-flow.md) · [production-to-stock-flow.md](./api/production-to-stock-flow.md)

## Visual diagram viewer (recommended)

Open the **interactive flow diagram viewer** in your browser — diagrams render as graphics, not raw text:

| How to open | URL / path |
|-------------|------------|
| **In browser (dev server)** | [http://localhost:3000/system-data-flows.html](http://localhost:3000/system-data-flows.html) |
| **From repo file** | Open [data-flow-viewer.html](./data-flow-viewer.html) in Chrome / Edge / Firefox |

Use the left navigation to switch between 11 visual flows (master E2E, auth, master data, procurement, production, distribution, sales, finance, HR, stock ledger).

> **GitHub note:** Mermaid blocks below also render as diagrams in GitHub’s markdown preview. For the best experience locally, use the HTML viewer above.

---

## How to read these diagrams

| Symbol | Meaning |
|--------|---------|
| **Rectangle** | Module action or document created |
| **Diamond** | Decision / approval gate |
| **Cylinder** | Database record or stock balance updated |
| **Dashed arrow** | Optional path (finance, QC, etc.) |
| **Solid arrow** | Required sequential step |

Data always flows **tenant-scoped** (isolated PostgreSQL per organization). Every API call carries JWT + tenant context → `PrismaService` routes to the correct tenant DB.

---

## 1. Master end-to-end flow (whole business)

This is the **full lifecycle** from empty tenant to cash in bank — every major data path on one map.

```mermaid
flowchart TB
  subgraph P0 [0 — Platform bootstrap]
    SA[Super Admin creates tenant]
    SA --> Roles[Seed permissions & roles]
    Roles --> AdminLogin[Admin user login]
  end

  subgraph P1 [1 — Master data]
    AdminLogin --> MD1[UOMs · Sites · Warehouses · Zones]
    MD1 --> MD2[Products · Raw materials · Suppliers · Customers]
    MD2 --> MD3[Territory: Region → Zone → City → Area → Branch]
    MD3 --> MD4[Price lists · Branch product prices]
    MD4 --> COA[Chart of accounts optional]
  end

  subgraph P2 [2 — Buy materials]
    COA --> PO[Purchase Order DRAFT]
    PO --> POC[PO CONFIRMED]
    POC --> GRN[GRN receive partial or full]
    GRN --> RMB[(Raw material batches QUARANTINE)]
    RMB --> QC[Batch inspection]
    QC --> RMA[(Batches ACTIVE — usable stock)]
  end

  subgraph P3 [3 — Make products]
    RMA --> BOM[BOM recipe active]
    BOM --> PROD[Production order IN_PROGRESS]
    PROD --> CONS[Consume raw material batches FIFO]
    CONS --> PB[(Product batch WIP)]
    PB --> STG[Complete stages]
    STG --> FIN[Finalize batch]
    FIN --> FG[(Finished goods stock)]
  end

  subgraph P4 [4 — Move stock internally]
    RMA --> MR[Material request]
    MR --> MT[Material transfer site to site]
    FG --> WH[Warehouse / factory stock balances]
    MT --> WH
  end

  subgraph P5 [5 — Distribute to branches]
    WH --> BSR[Branch stock request]
    BSR --> BST[Branch stock transfer dispatch]
    BST --> BS[(Branch stock balance)]
    BS --> BRET[Branch stock return optional]
  end

  subgraph P6 [6 — Sell to customers]
    BS --> SO[Sales order / Shop order / POS sale]
    FG --> SO
    SO --> DISP[Dispatch / Delivery]
    DISP --> CL[(Customer ledger balance)]
    SO --> RET[Returns · Recovery · Adjustments]
    RET --> CL
  end

  subgraph P7 [7 — Money & HR]
    POC -.-> AP[AP bills & supplier payments]
    GRN -.-> GL1[GL inventory receipt]
    SO -.-> AR[AR invoices & payments]
    CL -.-> AR
    AdminLogin --> HR[Employee · Contract · Attendance · Leave]
    HR --> PAY[Payroll APPROVED → PAID]
    PAY -.-> GL2[GL payroll expense]
    COA --> EXP[Operating expenses]
    EXP -.-> GL3[GL expense journal]
  end

  subgraph P8 [8 — Reporting & audit]
    FG --> DASH[Dashboard KPIs]
    CL --> DASH
    AP --> DASH
    AR --> DASH
    AdminLogin --> AUD[(Audit logs on every @Auditable change)]
  end

  P1 --> P2
  P2 --> P3
  P3 --> P4
  P4 --> P5
  P5 --> P6
  P6 --> P7
  P6 --> P8
```

---

## 2. Platform & authentication data flow

```mermaid
sequenceDiagram
  participant User
  participant Web as Next.js App
  participant API as NestJS API
  participant Master as Master DB
  participant Tenant as Tenant DB

  User->>Web: email + password + tenantId
  Web->>API: POST /auth/login
  API->>Master: Resolve tenant by short code / subdomain / UUID
  Master-->>API: Tenant connection string
  API->>Tenant: Validate user + load role permissions
  Tenant-->>API: User record + permission set
  API-->>Web: JWT access token
  Web->>API: All subsequent requests Authorization Bearer JWT
  API->>API: TenantContextMiddleware sets tenant client
  API->>Tenant: Read / write business data
```

**Data created:** Session token (client-side). No business documents until master data is set up.

---

## 3. Master data setup flow (required before operations)

```mermaid
flowchart LR
  A[Company / Invoice settings] --> B[UOM master]
  B --> C[Locations & Sites tree]
  C --> D[Warehouses STORAGE / DISPATCH]
  D --> E[Zones inside warehouses]
  E --> F[Products + categories / brands / groups]
  E --> G[Raw materials + reorder levels]
  F --> H[Suppliers]
  G --> H
  F --> I[Customers + categories]
  I --> J[Territory hierarchy]
  J --> K[Branches + sales person assignments]
  K --> L[Branch product prices / price lists]
  L --> M[BOM links product to raw materials]
  M --> N[Plants · Lines · Machines]
```

**Stock impact:** None — master data only. Stock counters start at zero until GRN, production finalize, or manual adjustment.

---

## 4. Procurement → inventory data flow

### 4.1 Happy path

```mermaid
flowchart TB
  S1[Supplier master] --> S2[PO created DRAFT]
  S2 --> S3{Approve PO?}
  S3 -->|No| S2
  S3 -->|Yes| S4[PO status CONFIRMED]
  S4 --> S5[GRN created against PO]
  S5 --> S6[For each line: received qty + batch allocations per site]
  S6 --> S7[(GRN record COMPLETED)]
  S7 --> S8[(RawMaterialBatch per allocation status QUARANTINE)]
  S7 --> S9[(PurchaseItem.receivedQty incremented)]
  S7 --> S10[PO status PARTIAL or RECEIVED]
  S7 --> S11[(RawMaterial.currentStock incremented)]
  S8 --> S12[QC inspection on batch]
  S12 --> S13{Inspection result}
  S13 -->|PASSED / CONDITIONAL| S14[(Batch ACTIVE — allocatable)]
  S13 -->|FAILED| S15[(Batch BLOCKED)]
  S14 --> S16[FIFO / FEFO available for production]
  S7 -.-> S17[(Optional GL Dr Inventory Cr AP)]
```

### 4.2 Purchase return path

```mermaid
flowchart LR
  A[Active raw material batch] --> B[Purchase return DRAFT]
  B --> C[Select batches + return qty]
  C --> D[Stock reserved reduced immediately]
  D --> E{Approval}
  E -->|APPROVED → COMPLETED| F[(Batch consumption RETURN type)]
  E -->|REJECTED / CANCELLED| G[(Stock reservation reversed)]
  F --> H[(Supplier ledger updated)]
```

**Key data entities:** `PurchaseOrder` → `PurchaseOrderItem` → `GRN` → `GRNItem` → `RawMaterialBatch` → `StockLedger` / `currentStock`

---

## 5. Production → finished goods data flow

```mermaid
flowchart TB
  subgraph plan [Plan]
    B1[Active BOM] --> B2[Production order DRAFT]
    B2 --> B3[FIFO preview raw material batches]
  end

  subgraph execute [Execute]
    B3 --> B4[Status IN_PROGRESS]
    B4 --> B5[(Raw material batches consumed)]
    B4 --> B6[(RawMaterial.currentStock decremented)]
    B4 --> B7[Optional cost lines + waste inputs]
  end

  subgraph complete [Complete]
    B7 --> B8[Status COMPLETED]
    B8 --> B9[(ProductBatch created WIP isFinal false)]
    B9 --> B10[Stage: Production IN_PROGRESS]
    B10 --> B11[Complete stage → unlock qty update costPerUnit]
    B11 --> B12{More stages?}
    B12 -->|Yes| B13[Start Packing / QC stage]
    B13 --> B11
    B12 -->|No| B14[Finalize batch]
  end

  subgraph stock [Stock push]
    B14 --> B15[(ProductBatch isFinal true)]
    B15 --> B16[(Product.currentStock += approvedQuantity)]
    B15 --> B17[(Product.costPrice AVCO updated)]
    B15 --> B18[(StockLedger FINISHED_GOODS entry)]
  end

  B4 -.-> B19[QC inspection optional]
  B4 -.-> B20[Waste record optional]
```

**Work orders** follow a parallel shop-floor path: `WorkOrder` scheduled → in progress → completed, linked to production context.

---

## 6. Internal material movement data flow

```mermaid
flowchart TB
  subgraph request [Material request]
    R1[DRAFT] --> R2[PENDING approval]
    R2 -->|Approved| R3[FULFILLED]
    R2 -->|Rejected| R4[REJECTED]
  end

  subgraph transfer [Material transfer]
    T1[PENDING] --> T2[APPROVED]
    T2 --> T3[IN_TRANSIT]
    T3 --> T4[RECEIVED]
    T4 --> T5[(Source site qty down)]
    T4 --> T6[(Destination site qty up)]
  end

  R3 --> T1
```

**GL note:** Internal transfers do **not** post to GL (same inventory value, different location). See [GL_POSTING_EXCEPTIONS.md](./GL_POSTING_EXCEPTIONS.md).

---

## 7. Distribution: factory → branch → customer

### 7.1 Branch replenishment

```mermaid
flowchart LR
  FS[(Factory / warehouse stock)] --> BSR[Branch stock request PENDING]
  BSR --> APP{Factory approves?}
  APP -->|Yes| BST[Branch stock transfer]
  APP -->|No| REJ[REJECTED]
  BST --> SHIP[DISPATCHED from factory]
  SHIP --> REC[RECEIVED at branch]
  REC --> BS[(Branch stock balance)]
  REC --> BL[(Branch ledger STOCK_RECEIVED)]
```

### 7.2 Branch return to factory

```mermaid
flowchart LR
  BS[(Branch stock)] --> BRET[Branch stock return]
  BRET --> APP2{Approved?}
  APP2 -->|Yes| FS2[(Factory stock increased)]
  APP2 -->|Yes| BL2[(Branch ledger STOCK_RETURNED)]
```

### 7.3 Customer / shop channel

```mermaid
flowchart TB
  C1[Customer master] --> C2[Shop order / Customer order PENDING]
  C2 --> C3[Customer delivery created]
  C3 --> C4[Mark DELIVERED]
  C4 --> C5[(Branch or factory stock decremented)]
  C4 --> C6[(Customer ledger debit — amount owed)]

  C6 --> C7[Customer recovery payment]
  C7 --> C8[(Customer ledger credit)]

  C4 --> C9[Customer return optional]
  C9 --> C10[(Stock restored + ledger credit note)]

  C6 --> C11[Credit / debit note adjustment]
  C11 --> C12[(Customer ledger adjusted)]
```

---

## 8. Direct sales & POS data flow

```mermaid
flowchart TB
  subgraph sales [Sales order path]
    SO1[Create sale] --> SO2[Add line items + pricing]
    SO2 --> SO3[(Stock reserved or deducted)]
    SO3 --> SO4[Sale dispatch]
    SO4 --> SO5[(Customer ledger / broker commission data)]
  end

  subgraph pos [POS path]
    P1[Select location / session] --> P2[Scan products]
    P2 --> P3[Payment cash / card / credit]
    P3 --> P4[(Stock decremented immediately)]
    P3 --> P5[(Sale + receipt record)]
    P3 --> P6[(Cash-in-hand updated)]
    P3 -.-> P7[(GL revenue + cash optional)]
    P3 -.-> P8[(GL COGS if costPrice set)]
  end

  subgraph returns [Returns]
    R1[POS return / Sale return] --> R2[(Stock restored)]
    R2 --> R3[(Ledger / cash reversed)]
  end

  SO5 -.-> P7
```

---

## 9. Financial / GL data flow (cross-cutting)

```mermaid
flowchart TB
  COA[Chart of accounts setup] --> JE[Manual journal entries]

  subgraph ap [Accounts payable]
    GRN2[GRN receipt] -.-> AP1[Inventory debit / AP credit]
    VB[Vendor bill] --> AP2[AP liability]
    VP[Vendor payment] --> AP3[AP cleared · cash out]
    PO_PAY[PO supplier payment] --> SL[(Supplier ledger)]
  end

  subgraph ar [Accounts receivable]
    INV[AR invoice] --> AR1[Customer receivable]
    RP[AR payment received] --> AR2[Receivable cleared · cash in]
    CL2[Customer ledger balance] -.-> AR1
  end

  subgraph other [Other postings]
    EXP2[Expense approved] --> GL_E[Expense debit / cash credit]
    PAY2[Payroll PAID] --> GL_P[Payroll expense / cash or payable]
    FA[Fixed asset + depreciation run] --> GL_D[Depreciation expense]
    BANK[Bank transaction] --> GL_B[Cash account movement]
  end

  AP1 --> TB[Trial balance]
  AP3 --> TB
  AR1 --> TB
  AR2 --> TB
  GL_E --> TB
  GL_P --> TB
  GL_D --> TB
  GL_B --> TB
  JE --> TB
  TB --> PL[Profit & Loss report]
  TB --> BS2[Balance sheet]
  TB --> CF[Cash flow report]
```

**Important:** Dashed lines = best-effort or optional depending on COA configuration. See [GL_POSTING_EXCEPTIONS.md](./GL_POSTING_EXCEPTIONS.md) for modules that never auto-post.

---

## 10. HR & payroll data flow

```mermaid
flowchart TB
  E1[Create employee] --> E2[(User account linked)]
  E2 --> E3[Department · Position · Contract]
  E3 --> E4[Shift assignment]
  E4 --> A1[Attendance records]
  E3 --> L1[Leave types + balances]
  L1 --> L2[Leave request → approval]

  E3 --> P1[Generate payroll DRAFT]
  A1 --> P1
  L2 --> P1
  LOAN[Active employee loan] --> P1
  P1 --> P2[Payroll APPROVED]
  P2 --> P3[Payroll PAID]
  P3 --> P4[(Loan installment marked paid)]
  P3 -.-> P5[(GL salary expense)]

  subgraph recruit [Recruitment optional]
    JR[Job requisition] --> CAND[Candidate]
    CAND --> APP[Application]
    APP --> INT[Interview]
    INT --> OFF[Offer]
    OFF --> E1
  end
```

---

## 11. Stock ledger — how inventory numbers move

All quantity changes ultimately touch one or more of these stores:

```mermaid
flowchart TB
  subgraph masters [Balance masters]
    RM[RawMaterial.currentStock]
    PR[Product.currentStock]
    WHB[WarehouseStockBalance by site]
    BSB[BranchStockBalance]
  end

  subgraph events [Events that write stock]
    E_GRN[GRN receive] --> RM
    E_GRN --> WHB
    E_QC[QC rejection] --> RM
    E_PROD[Production consume] --> RM
    E_FIN[Product batch finalize] --> PR
    E_FIN --> WHB
    E_TR[Material / branch transfer] --> WHB
    E_TR --> BSB
    E_SALE[Sale / POS / delivery] --> PR
    E_SALE --> BSB
    E_RET[Returns] --> PR
    E_RET --> BSB
    E_ADJ[Product / customer adjustment] --> PR
    E_WASTE[Waste write-off] --> RM
  end

  subgraph trace [Audit trail]
    SL[StockLedger transactions]
    RMC[RawMaterialBatchConsumption]
    E_GRN --> SL
    E_PROD --> RMC
    E_SALE --> SL
  end
```

---

## 12. Quality control data flow

```mermaid
flowchart LR
  subgraph grn_qc [Inbound QC — raw materials]
    G1[GRN creates batch QUARANTINE] --> G2[Inspection POST]
    G2 --> G3{qualityStatus}
    G3 -->|PASSED| G4[Batch ACTIVE]
    G3 -->|CONDITIONAL| G4
    G3 -->|FAILED| G5[Batch BLOCKED]
    G2 --> G6[Rejected qty consumption if any]
  end

  subgraph prod_qc [Production QC]
    P1[Production / work order event] --> P2[QC inspection record]
    P2 --> P3[PASSED / FAILED / CONDITIONAL]
  end

  G4 --> PROD2[Available for production FIFO]
```

---

## 13. Audit & permissions data flow

```mermaid
flowchart LR
  REQ[API request] --> AUTH{JWT valid?}
  AUTH -->|No| DENY[401]
  AUTH --> PERM{Permission check module.action}
  PERM -->|No| DENY2[403]
  PERM --> SVC[Service → Repository → Tenant DB]
  SVC --> AUD{Route has @Auditable?}
  AUD -->|Yes| LOG[(AuditLog oldValue newValue userId)]
  AUD --> RESP[Response to client]
  LOG --> RESP
```

---

## 14. Recommended operational sequence (data dependency order)

| Step | Action | Depends on | Creates / updates |
|------|--------|------------|-------------------|
| 1 | Provision tenant | Super Admin | Master DB tenant row |
| 2 | Seed permissions & roles | Step 1 | Tenant permissions + roles |
| 3 | Create admin via HR employee | Step 2 | User + employee |
| 4 | UOMs, sites, warehouses | Step 3 | Location master |
| 5 | Products, raw materials, suppliers | Step 4 | Item master |
| 6 | Customers, territory, branches | Step 5 | Sales master |
| 7 | Chart of accounts | Step 3 | GL accounts |
| 8 | BOM | Steps 5 | Recipe |
| 9 | Purchase order → GRN | Steps 5, 4 | Raw material stock |
| 10 | Batch QC | Step 9 | Usable batches |
| 11 | Production order | Steps 8, 10 | WIP batches |
| 12 | Finalize product batch | Step 11 | Finished goods stock |
| 13 | Branch stock transfer | Steps 6, 12 | Branch stock |
| 14 | Sale / POS / delivery | Steps 6, 12 or 13 | Customer ledger, revenue |
| 15 | AR payment / recovery | Step 14 | Cash in, AR cleared |
| 16 | Payroll | HR master | Salary paid, loan deducted |

---

## 15. Entity relationship summary

```mermaid
erDiagram
  PurchaseOrder ||--o{ PurchaseOrderItem : contains
  PurchaseOrder ||--o{ GRN : receives
  GRN ||--o{ GRNItem : contains
  GRNItem ||--o{ RawMaterialBatch : creates
  RawMaterialBatch ||--o{ RawMaterialBatchConsumption : consumed_by

  BOM ||--o{ BOMItem : contains
  ProductionOrder ||--o{ ProductionOrderMaterial : uses
  ProductionOrder ||--|| ProductBatch : produces
  ProductBatch ||--o{ ProductBatchStage : has

  Branch ||--o{ BranchStockRequest : requests
  BranchStockRequest ||--o| BranchStockTransfer : fulfills
  BranchStockTransfer ||--o{ BranchStockBalance : updates

  Customer ||--o{ CustomerOrder : places
  CustomerOrder ||--o{ CustomerDelivery : ships
  Customer ||--o{ CustomerLedgerEntry : balance

  Sale ||--o{ SaleItem : contains
  Sale ||--o| SaleDispatch : dispatches

  Employee ||--|| User : linked
  Employee ||--o{ Contract : has
  Employee ||--o{ Payroll : paid_via
  Payroll ||--o{ PayrollLine : contains

  ChartOfAccount ||--o{ JournalEntry : posts
  VendorBill ||--o{ VendorPayment : paid_by
  ARInvoice ||--o{ ARPayment : paid_by
```

---

## 16. Document index

| Flow | Detailed API doc |
|------|------------------|
| PO → GRN → batches | [procurement-to-inventory-flow.md](./api/procurement-to-inventory-flow.md) |
| Production → FG stock | [production-to-stock-flow.md](./api/production-to-stock-flow.md) |
| Purchase orders | [purchase-orders-api.md](./api/purchase-orders-api.md) |
| GRN | [grn-api.md](./api/grn-api.md) |
| Sales | [sales-api.md](./api/sales-api.md) |
| HR payroll | [hr/payroll-api.md](./api/hr/payroll-api.md) |
| GL exceptions | [GL_POSTING_EXCEPTIONS.md](./GL_POSTING_EXCEPTIONS.md) |
| Full UAT walkthrough | [ERP_FULL_UAT_GUIDE.md](./ERP_FULL_UAT_GUIDE.md) |

---

*Last updated: September 2026 — aligned with tenant modules in `backend/src/app.module.ts` and sidebar navigation.*

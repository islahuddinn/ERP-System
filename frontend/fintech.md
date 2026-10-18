# 📘 ERP Financial Module Integration Plan

## 1. Overview

### Purpose of Financial Module
The Financial Module will transform the existing factory distribution ERP system into a complete accounting solution by implementing double-entry bookkeeping, automated journal entries, and comprehensive financial reporting. This module will ensure all business transactions (sales, purchases, inventory movements, production costs) are properly recorded in the General Ledger, maintaining financial integrity and compliance with accounting standards.

### Key Design Principles
- **Double-Entry Accounting**: Every transaction debits one account and credits another equally
- **Automated Posting**: All operational modules (AR, AP, Inventory) automatically post to GL
- **Multi-Dimensional COA**: Segmented chart of accounts supporting complex organizational structures
- **Audit Trail**: Complete transaction history with immutable journal entries
- **Real-Time Financials**: Live financial position updates as transactions occur
- **Multi-Company Support**: Separate financials per company/tenant

## 2. Architecture Design

### High-Level System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Sales Module  │───▶│   AR Module     │───▶│   GL Module     │
│                 │    │                 │    │                 │
│ - Sale Orders   │    │ - Invoices       │    │ - Journal Entry │
│ - Shipments     │    │ - Payments       │    │ - Account Bal.  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Purchase Module │───▶│   AP Module     │───▶│   GL Module     │
│                 │    │                 │    │                 │
│ - PO Creation   │    │ - Bills          │    │ - Journal Entry │
│ - Receiving     │    │ - Payments       │    │ - Account Bal.  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│Inventory Module │───▶│ Cost Accounting │───▶│   GL Module     │
│                 │    │                 │    │                 │
│ - Stock Moves   │    │ - COGS           │    │ - Journal Entry │
│ - Adjustments   │    │ - Inventory Val. │    │ - Account Bal.  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Module Interaction Diagram
```
Frontend (Next.js)
    │
    ▼
API Gateway (NestJS)
    │
    ├─► Financial Dashboard
    │
    ├─► Chart of Accounts Management
    │
    ├─► AR Submodule ◄─── Sale Invoices
    │     │
    │     ├─► Customer Invoices
    │     ├─► Payment Receipts
    │     └─► Credit Memos
    │
    ├─► AP Submodule ◄─── Purchase Orders
    │     │
    │     ├─► Vendor Bills
    │     ├─► Payment Processing
    │     └─► Debit Memos
    │
    ├─► GL Submodule
    │     │
    │     ├─► Journal Entries
    │     ├─► Account Balances
    │     └─► Financial Reports
    │
    ├─► Cash Management ◄─── Bank Transactions
    │
    └─► Fixed Assets ◄─── Depreciation
```

### Event/Data Flow
1. **Sales Transaction Flow**:
   - Sale created → Invoice generated → AR posts to GL (Debit AR, Credit Revenue)
   - Payment received → Cash/Bank debited, AR credited

2. **Purchase Transaction Flow**:
   - PO created → Goods received → AP posts to GL (Debit Expense/Inventory, Credit AP)
   - Payment made → AP debited, Cash/Bank credited

3. **Inventory Cost Flow**:
   - Production completed → COGS calculated → GL posts (Debit COGS, Credit Inventory)

## 3. Database Design (Prisma + PostgreSQL)

### Core Models

#### ChartOfAccounts
```prisma
model ChartOfAccounts {
  id                String              @id @default(uuid())
  accountCode       String              @unique
  accountName       String
  accountType       AccountType         // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  normalBalance     NormalBalance       // DEBIT, CREDIT
  isActive          Boolean             @default(true)
  parentId          String?
  level             Int                 @default(1)
  
  // Segmented Structure
  companySegment    String?
  departmentSegment String?
  accountSegment    String
  businessUnitSegment String?
  projectSegment    String?
  locationSegment   String?
  intercompanySegment String?
  futureSegment     String?
  
  // Financial Attributes
  allowManualEntry  Boolean             @default(true)
  allowPosting      Boolean             @default(true)
  currencyCode      String              @default("USD")
  
  // Audit
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  createdBy         String
  updatedBy         String?
  
  // Relations
  parent            ChartOfAccounts?    @relation("AccountHierarchy", fields: [parentId], references: [id])
  children          ChartOfAccounts[]   @relation("AccountHierarchy")
  journalLines      JournalLine[]
  
  @@index([accountCode])
  @@index([accountType])
  @@index([companySegment])
  @@map("chart_of_accounts")
}
```

#### JournalEntry & JournalLine
```prisma
model JournalEntry {
  id            String        @id @default(uuid())
  entryNumber   String        @unique
  entryDate     DateTime
  postingDate   DateTime
  description   String
  sourceModule  String        // AR, AP, GL, CASH, ASSET, etc.
  sourceId      String        // Reference to originating transaction
  status        EntryStatus   @default(DRAFT) // DRAFT, POSTED, REVERSED
  totalDebit    Decimal       @default(0)
  totalCredit   Decimal       @default(0)
  
  // Audit
  createdAt     DateTime      @default(now())
  createdBy     String
  postedAt      DateTime?
  postedBy      String?
  
  // Relations
  lines         JournalLine[]
  reversals     JournalEntry[] @relation("JournalReversal")
  reversedBy    JournalEntry?  @relation("JournalReversal", fields: [reversedEntryId], references: [id])
  reversedEntryId String?
  
  @@index([entryDate])
  @@index([postingDate])
  @@index([sourceModule])
  @@map("journal_entries")
}

model JournalLine {
  id            String        @id @default(uuid())
  journalEntryId String
  accountId     String
  description   String?
  debit         Decimal       @default(0)
  credit        Decimal       @default(0)
  lineNumber    Int
  
  // Dimensions (for reporting)
  companyId     String?
  departmentId  String?
  projectId     String?
  
  // Relations
  journalEntry  JournalEntry  @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)
  account       ChartOfAccounts @relation(fields: [accountId], references: [id])
  
  @@index([journalEntryId])
  @@index([accountId])
  @@map("journal_lines")
}
```

#### AR Models (Extending Existing)
```prisma
model CustomerInvoice {
  id            String        @id @default(uuid())
  invoiceNumber String        @unique
  customerId    String
  invoiceDate   DateTime
  dueDate       DateTime
  totalAmount   Decimal
  paidAmount    Decimal       @default(0)
  balance       Decimal
  status        InvoiceStatus @default(OPEN)
  
  // Relations
  customer      Customer      @relation(fields: [customerId], references: [id])
  items         CustomerInvoiceItem[]
  payments      CustomerPayment[]
  journalEntry  JournalEntry? // Link to GL posting
  
  @@index([customerId])
  @@index([invoiceDate])
  @@map("customer_invoices")
}

model CustomerPayment {
  id            String        @id @default(uuid())
  paymentNumber String        @unique
  customerId    String
  paymentDate   DateTime
  amount        Decimal
  paymentMethod PaymentMethod
  reference     String?
  
  // Relations
  customer      Customer      @relation(fields: [customerId], references: [id])
  invoiceAllocations CustomerPaymentAllocation[]
  journalEntry  JournalEntry? // Link to GL posting
  
  @@map("customer_payments")
}
```

#### AP Models (Extending Existing)
```prisma
model VendorBill {
  id            String        @id @default(uuid())
  billNumber    String        @unique
  vendorId      String
  billDate      DateTime
  dueDate       DateTime
  totalAmount   Decimal
  paidAmount    Decimal       @default(0)
  balance       Decimal
  status        BillStatus    @default(OPEN)
  
  // Relations
  vendor        Supplier      @relation(fields: [vendorId], references: [id])
  items         VendorBillItem[]
  payments      VendorPayment[]
  journalEntry  JournalEntry? // Link to GL posting
  
  @@map("vendor_bills")
}

model VendorPayment {
  id            String        @id @default(uuid())
  paymentNumber String        @unique
  vendorId      String
  paymentDate   DateTime
  amount        Decimal
  paymentMethod PaymentMethod
  reference     String?
  
  // Relations
  vendor        Supplier      @relation(fields: [vendorId], references: [id])
  billAllocations VendorPaymentAllocation[]
  journalEntry  JournalEntry? // Link to GL posting
  
  @@map("vendor_payments")
}
```

#### Cash Management Models
```prisma
model BankAccount {
  id            String        @id @default(uuid())
  accountNumber String        @unique
  accountName   String
  bankName      String
  accountType   BankAccountType // CHECKING, SAVINGS
  currencyCode  String        @default("USD")
  openingBalance Decimal      @default(0)
  currentBalance Decimal      @default(0)
  isActive      Boolean       @default(true)
  
  // Relations
  transactions  BankTransaction[]
  
  @@map("bank_accounts")
}

model BankTransaction {
  id            String        @id @default(uuid())
  bankAccountId String
  transactionDate DateTime
  amount        Decimal
  transactionType TransactionType // DEPOSIT, WITHDRAWAL, TRANSFER
  description   String
  reference     String?
  
  // Relations
  bankAccount   BankAccount   @relation(fields: [bankAccountId], references: [id])
  journalEntry  JournalEntry? // Link to GL posting
  
  @@map("bank_transactions")
}
```

#### Fixed Assets Models
```prisma
model FixedAsset {
  id            String        @id @default(uuid())
  assetCode     String        @unique
  assetName     String
  description   String?
  acquisitionDate DateTime
  acquisitionCost Decimal
  accumulatedDepreciation Decimal @default(0)
  bookValue     Decimal
  depreciationMethod DepreciationMethod // STRAIGHT_LINE, DECLINING_BALANCE
  usefulLife    Int           // in months
  salvageValue  Decimal       @default(0)
  status        AssetStatus   @default(ACTIVE)
  
  // Relations
  depreciationEntries DepreciationEntry[]
  disposal       AssetDisposal?
  
  @@map("fixed_assets")
}

model DepreciationEntry {
  id            String        @id @default(uuid())
  assetId       String
  period        DateTime      // depreciation period
  amount        Decimal
  accumulatedAmount Decimal
  
  // Relations
  asset         FixedAsset    @relation(fields: [assetId], references: [id])
  journalEntry  JournalEntry? // Link to GL posting
  
  @@map("depreciation_entries")
}
```

#### Budgeting Models
```prisma
model Budget {
  id            String        @id @default(uuid())
  budgetCode    String        @unique
  name          String
  fiscalYear    Int
  totalBudget   Decimal
  status        BudgetStatus  @default(DRAFT)
  
  // Relations
  lines         BudgetLine[]
  
  @@map("budgets")
}

model BudgetLine {
  id            String        @id @default(uuid())
  budgetId      String
  accountId     String
  period        DateTime      // monthly/quarterly
  budgetedAmount Decimal
  actualAmount  Decimal       @default(0)
  variance      Decimal       @default(0)
  
  // Relations
  budget        Budget        @relation(fields: [budgetId], references: [id])
  account       ChartOfAccounts @relation(fields: [accountId], references: [id])
  
  @@map("budget_lines")
}
```

### Relationships Between Models
- ChartOfAccounts → JournalLine (1:many)
- JournalEntry → JournalLine (1:many)
- CustomerInvoice → JournalEntry (1:1)
- VendorBill → JournalEntry (1:1)
- BankTransaction → JournalEntry (1:1)
- DepreciationEntry → JournalEntry (1:1)

## 4. Backend Design (NestJS)

### Module Breakdown

#### GL Module
**Responsibilities:**
- Chart of Accounts management
- Journal entry creation and posting
- Account balance calculations
- Financial reporting data aggregation

**Key Services:**
- ChartOfAccountsService: CRUD operations, hierarchy management
- JournalEntryService: Entry creation, validation, posting
- AccountBalanceService: Balance calculations, trial balance
- FinancialReportService: P&L, Balance Sheet, Cash Flow generation

**Example API Routes:**
```
POST   /api/financial/chart-of-accounts
GET    /api/financial/chart-of-accounts/:id
PUT    /api/financial/chart-of-accounts/:id
DELETE /api/financial/chart-of-accounts/:id

POST   /api/financial/journal-entries
GET    /api/financial/journal-entries
GET    /api/financial/journal-entries/:id
POST   /api/financial/journal-entries/:id/post

GET    /api/financial/trial-balance
GET    /api/financial/balance-sheet
GET    /api/financial/profit-loss
```

#### COA Module
**Responsibilities:**
- Account hierarchy management
- Segment validation
- Account code generation

#### AR Module
**Responsibilities:**
- Customer invoice management
- Payment application
- Aging reports
- Automatic GL posting for AR transactions

**Key Services:**
- CustomerInvoiceService: Invoice CRUD, PDF generation
- CustomerPaymentService: Payment processing, allocation
- ARAgingService: Aging report generation

**Example API Routes:**
```
POST   /api/financial/ar/invoices
GET    /api/financial/ar/invoices
GET    /api/financial/ar/invoices/:id
POST   /api/financial/ar/payments
GET    /api/financial/ar/aging-report
```

#### AP Module
**Responsibilities:**
- Vendor bill management
- Payment processing
- Three-way matching (PO → Receipt → Invoice)
- Automatic GL posting for AP transactions

**Key Services:**
- VendorBillService: Bill CRUD, approval workflow
- VendorPaymentService: Payment processing
- ThreeWayMatchService: PO-Receipt-Invoice matching

#### Cash Module
**Responsibilities:**
- Bank account management
- Bank reconciliation
- Cash flow forecasting

#### Asset Module
**Responsibilities:**
- Asset acquisition and disposal
- Depreciation calculation and posting
- Asset register maintenance

#### Budget Module
**Responsibilities:**
- Budget creation and approval
- Budget vs actual analysis
- Variance reporting

### Business Logic Examples

#### GL Posting for Sales Invoice
```typescript
async postSaleToGL(saleId: string, userId: string) {
  const sale = await this.saleRepository.findOne({ where: { id: saleId } });
  
  const journalEntry = await this.journalEntryService.create({
    description: `Sale Invoice ${sale.invoiceNumber}`,
    sourceModule: 'AR',
    sourceId: saleId,
    lines: [
      {
        accountId: this.getRevenueAccount(sale.productCategory),
        debit: 0,
        credit: sale.totalAmount,
        description: 'Revenue'
      },
      {
        accountId: this.getARAccount(),
        debit: sale.totalAmount,
        credit: 0,
        description: 'Accounts Receivable'
      }
    ]
  });
  
  await this.journalEntryService.post(journalEntry.id, userId);
}
```

## 5. Frontend Design (Next.js)

### Pages and Components Structure
```
app/
├── financial/
│   ├── chart-of-accounts/
│   │   ├── page.tsx                    // COA list
│   │   ├── [id]/
│   │   │   └── page.tsx               // COA detail/edit
│   │   └── new/page.tsx               // Create COA
│   ├── general-ledger/
│   │   ├── journal-entries/
│   │   │   ├── page.tsx               // Journal entries list
│   │   │   ├── [id]/page.tsx          // Journal entry detail
│   │   │   └── new/page.tsx           // Manual journal entry
│   │   └── reports/
│   │       ├── trial-balance/page.tsx
│   │       ├── balance-sheet/page.tsx
│   │       └── profit-loss/page.tsx
│   ├── accounts-receivable/
│   │   ├── invoices/
│   │   │   ├── page.tsx               // Invoice list
│   │   │   ├── [id]/page.tsx          // Invoice detail
│   │   │   └── new/page.tsx           // Create invoice
│   │   ├── payments/
│   │   │   ├── page.tsx               // Payment list
│   │   │   └── new/page.tsx           // Record payment
│   │   └── customers/
│   │       └── [id]/statement/page.tsx // Customer statement
│   ├── accounts-payable/
│   │   ├── bills/
│   │   │   ├── page.tsx               // Bill list
│   │   │   ├── [id]/page.tsx          // Bill detail
│   │   │   └── new/page.tsx           // Create bill
│   │   ├── payments/
│   │   │   ├── page.tsx               // Payment list
│   │   │   └── new/page.tsx           // Record payment
│   │   └── vendors/
│   │       └── [id]/statement/page.tsx // Vendor statement
│   ├── cash-management/
│   │   ├── bank-accounts/
│   │   │   ├── page.tsx               // Bank accounts list
│   │   │   └── [id]/page.tsx          // Account detail
│   │   ├── transactions/
│   │   │   ├── page.tsx               // Transactions list
│   │   │   └── new/page.tsx           // Record transaction
│   │   └── reconciliation/
│   │       └── [id]/page.tsx          // Bank reconciliation
│   ├── fixed-assets/
│   │   ├── assets/
│   │   │   ├── page.tsx               // Assets list
│   │   │   ├── [id]/page.tsx          // Asset detail
│   │   │   └── new/page.tsx           // Add asset
│   │   └── depreciation/
│   │       └── run/page.tsx           // Run depreciation
│   └── budgeting/
│       ├── budgets/
│       │   ├── page.tsx               // Budgets list
│       │   ├── [id]/page.tsx          // Budget detail
│       │   └── new/page.tsx           // Create budget
│       └── reports/
│           └── variance/page.tsx      // Budget variance
```

### UI Flows

#### Invoice Creation Flow
1. Select customer → Auto-populate customer details
2. Add line items → Auto-calculate totals
3. Apply taxes/discounts → Update totals
4. Save as draft or post → Automatic GL posting
5. Generate PDF → Email to customer

#### Journal Entry Creation Flow
1. Select entry type (manual/standard)
2. Add debit lines → Auto-balance with credits
3. Validate account compatibility
4. Preview impact on financial statements
5. Post entry → Update account balances

### State Management Suggestions
- Use Zustand for financial state management
- Separate stores for each module (AR, AP, GL, etc.)
- Implement optimistic updates for better UX
- Cache frequently accessed data (COA, customer lists)

## 6. Phase-wise Execution Plan

### Phase 1: Foundation (4 weeks)
**Focus:** Core accounting infrastructure

**Backend Tasks:**
- Create ChartOfAccounts, JournalEntry, JournalLine models
- Implement COA Module with hierarchy support
- Implement GL Module with basic journal entry CRUD
- Add account balance calculation logic
- Create basic financial reports (Trial Balance)

**Database Tasks:**
- Add new financial models to Prisma schema
- Create database migrations
- Seed initial COA structure
- Add indexes for performance

**Frontend Tasks:**
- Create COA management pages
- Implement journal entry forms
- Add basic financial reports dashboard
- Integrate with existing navigation

### Phase 2: Accounts Payable (3 weeks)
**Focus:** Vendor invoice and payment processing

**Backend Tasks:**
- Extend existing PurchaseOrder model with GL posting
- Create VendorBill and VendorPayment models
- Implement AP Module with three-way matching
- Add automatic GL posting for AP transactions
- Create AP aging reports

**Database Tasks:**
- Add AP-specific models
- Update existing purchase models
- Add GL posting triggers

**Frontend Tasks:**
- Create bill management interface
- Implement payment processing forms
- Add AP dashboard with aging reports
- Integrate with existing purchase workflow

### Phase 3: Accounts Receivable (3 weeks)
**Focus:** Customer invoice and payment processing

**Backend Tasks:**
- Extend existing Sale model with GL posting
- Create CustomerInvoice and CustomerPayment models
- Implement AR Module with payment allocation
- Add automatic GL posting for AR transactions
- Create AR aging reports

**Database Tasks:**
- Add AR-specific models
- Update existing sale models
- Add GL posting triggers

**Frontend Tasks:**
- Create invoice management interface
- Implement payment receipt forms
- Add AR dashboard with aging reports
- Integrate with existing sales workflow

### Phase 4: Cash Management (2 weeks)
**Focus:** Bank account and cash flow management

**Backend Tasks:**
- Create BankAccount and BankTransaction models
- Implement Cash Module with reconciliation
- Add bank transaction import functionality
- Create cash flow reports

**Database Tasks:**
- Add cash management models
- Implement bank reconciliation logic

**Frontend Tasks:**
- Create bank account management
- Implement transaction recording
- Add bank reconciliation interface
- Create cash flow dashboard

### Phase 5: Fixed Assets (2 weeks)
**Focus:** Asset tracking and depreciation

**Backend Tasks:**
- Create FixedAsset and DepreciationEntry models
- Implement Asset Module with depreciation calculation
- Add automatic depreciation posting
- Create asset reports

**Database Tasks:**
- Add asset management models
- Implement depreciation schedules

**Frontend Tasks:**
- Create asset register interface
- Implement depreciation run process
- Add asset reports

### Phase 6: Budgeting & Forecasting (3 weeks)
**Focus:** Budget management and variance analysis

**Backend Tasks:**
- Create Budget and BudgetLine models
- Implement Budget Module with approval workflow
- Add budget vs actual analysis
- Create forecasting algorithms

**Database Tasks:**
- Add budgeting models
- Implement variance calculations

**Frontend Tasks:**
- Create budget creation and approval interface
- Implement variance reporting
- Add forecasting dashboard

## 7. Integration with Existing Modules

### HRMS → Payroll → GL
- Payroll calculations post to GL:
  - Debit: Salary Expense
  - Credit: Cash/Bank or AP (if accrued)

### SCM → Procurement → AP → GL
- Purchase Order → Vendor Bill → Payment:
  - PO Approval: No GL impact
  - Goods Receipt: Debit Inventory, Credit AP
  - Invoice Receipt: Update AP amount
  - Payment: Debit AP, Credit Cash/Bank

### Sales → AR → GL
- Sales Order → Invoice → Payment:
  - Sales Order: No GL impact (optional revenue recognition)
  - Invoice: Debit AR, Credit Revenue
  - Payment: Debit Cash/Bank, Credit AR

### Inventory → Cost Accounting → GL
- Stock Movements post COGS:
  - Sales: Debit COGS, Credit Inventory
  - Production: Debit Inventory, Credit WIP/Expense

### Production → Cost Allocation → GL
- Production completion posts costs:
  - Direct materials: Already posted via inventory
  - Labor: Debit WIP, Credit Labor Expense
  - Overhead: Debit WIP, Credit Overhead accounts

## 8. Best Practices

### Audit Logs
- All financial transactions logged with user, timestamp, IP
- Journal entries immutable once posted
- Reversal entries create new entries, don't modify existing

### Validation Rules
- Debit = Credit validation for all journal entries
- Account type validation (assets can't post to revenue accounts)
- Date validation (no future posting dates)
- Balance checks before posting

### Multi-Tenancy / Multi-Company
- Separate COA per company
- Company-specific account segments
- Consolidated reporting across companies
- Intercompany transactions support

### Performance Considerations
- Account balance caching with Redis
- Partitioned journal entries by date
- Asynchronous report generation
- Database indexing on frequently queried fields

## 9. Estimated Timeline

- **Phase 1 (Foundation)**: 1 weeks
- **Phase 2 (AP)**: 4 days  
- **Phase 3 (AR)**: 4 days 
- **Phase 4 (Cash)**: 1 weeks
- **Phase 5 (Assets)**: 1 weeks
- **Phase 6 (Budgeting)**: 1.5 weeks

**Total Timeline**: 7 weeks 

**Team Size Recommendation**: 3-4 developers (1 backend, 1 frontend, 1 full-stack, 1 QA)

## 10. Future Enhancements

### AI Forecasting
- Machine learning models for revenue forecasting
- Automated budget recommendations
- Anomaly detection in financial transactions

### Advanced Analytics
- Real-time financial dashboards
- Predictive cash flow analysis
- Multi-dimensional financial reporting

### Multi-Currency Support
- Currency conversion tables
- Foreign exchange gain/loss tracking
- Multi-currency bank accounts

### Integration APIs
- REST APIs for external accounting software
- Webhook support for real-time data sync
- EDI integration for large vendors/customers
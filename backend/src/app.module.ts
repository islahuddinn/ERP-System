import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { join } from "path";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { AppThrottlerGuard } from "./common/guards/app-throttler.guard";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ProductsModule } from "./product-management/products/products.module";
import { LocationsModule } from "./locations/locations.module";
import { StockBalancesModule } from "./stock-balances/stock-balances.module";
import { StockTransactionsModule } from "./stock-transactions/stock-transactions.module";
import { StocktakeModule } from "./stocktake/stocktake.module";
import { StockLedgerModule } from "./stock-ledger/stock-ledger.module";
import { AuditModule } from "./audit/audit.module";
import { CsvModule } from "./csv/csv.module";
import { ReorderModule } from "./reorder/reorder.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { UOMsModule } from "./uoms/uoms.module";
import { CustomersModule } from "./customer-management/customers/customers.module";
import { CustomerCategoryModule } from "./customer-management/customer-categories/customer-category.module";
import { CustomerBankAccountsModule } from "./customer-management/customer-bank-accounts/customer-bank-accounts.module";
import { CustomerLedgerModule } from "./customer-management/customer-ledger/customer-ledger.module";
import { CustomerOrdersModule } from "./customer-management/customer-orders/customer-orders.module";
import { CustomerDeliveriesModule } from "./customer-management/customer-deliveries/customer-deliveries.module";
import { CustomerReturnsModule } from "./customer-management/customer-returns/customer-returns.module";
import { CustomerRecoveryModule } from "./customer-management/customer-recovery/customer-recovery.module";
import { CustomerLedgerAdjustmentsModule } from "./customer-management/customer-ledger-adjustments/customer-ledger-adjustments.module";
import { ProductAdjustmentsModule } from "./customer-management/product-adjustments/product-adjustments.module";
import { EmployeeCashLedgerModule } from "./employee-cash-ledger/employee-cash-ledger.module";
import { EmployeeCashTransferModule } from "./employee-cash-transfer/employee-cash-transfer.module";
import { SalesModule } from "./sales/sales.module";
import { PosModule } from "./pos/pos.module";
import { ReceiptsModule } from "./receipts/receipts.module";
import { PurchaseOrderModule } from "./purchase-orders/purchase-order.module";
import { CompaniesModule } from "./companies/companies.module";
import { CashInHandModule } from "./cash-in-hand/cash-in-hand.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { InvoiceSettingsModule } from "./invoice-settings/invoice-settings.module";
import { SuperAdminModule } from "./super-admin/super-admin.module";
import { MasterPrismaModule } from "./master-prisma/master-prisma.module";
import { MultiTenantPrismaModule } from "./prisma/multi-tenant-prisma.module";
import { WarehousesModule } from "./warehouses/warehouses.module";
import { ProductionOrdersModule } from "./production-orders/production-orders.module";
import { MaterialRequestsModule } from "./material-requests/material-requests.module";
import { MaterialTransfersModule } from "./material-transfers/material-transfers.module";
import { GrnModule } from "./grn/grn.module";
import { ProductionLinesModule } from "./production-lines/production-lines.module";
import { PlantsModule } from "./plants/plants.module";
import { MachinesModule } from "./machines/machines.module";
import { RawMaterialBatchesModule } from "./raw-material-batches/raw-material-batches.module";
import { ProductBatchesModule } from "./product-management/product-batches/product-batches.module";
import { DashboardModule } from "./dashboard/dashboard.module";

import { SalesReportsModule } from "./sales-reports/sales-reports.module";
import { FactoryReportsModule } from "./factory-reports/factory-reports.module";
import { WorkOrdersModule } from "./work-orders/work-orders.module";
import { BomModule } from "./bom/bom.module";
import { QualityControlModule } from "./quality-control/quality-control.module";
import { WasteManagementModule } from "./waste-management/waste-management.module";
import { SettingsModule } from "./settings/settings.module";
import { InventoryReportsModule } from "./inventory-reports/inventory-reports.module";
import { StockMovementReportsModule } from "./stock-movement-reports/stock-movement-reports.module";
import { CostingModule } from "./costing/costing.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { RolesModule } from "./roles/roles.module";
import { HrConfigModule } from "./hr-config/hr-config.module";
import { HrCoreModule } from "./hr-core/hr-core.module";
import { EmployeeModule } from "./hr/employee/employee.module";
import { DepartmentModule } from "./hr/department/department.module";
import { PositionModule } from "./hr/position/position.module";
import { DesignationModule } from "./hr/designation/designation.module";
import { ContractModule } from "./hr/contract/contract.module";
import { ShiftModule } from "./hr/shift/shift.module";
import { AttendanceModule } from "./hr/attendance/attendance.module";
import { HolidayModule } from "./hr/holiday/holiday.module";
import { HrSettingsModule } from "./hr/hr-settings/hr-settings.module";
import { LeaveRequestModule } from "./hr/leave-request/leave-request.module";
import { LoanRequestModule } from "./hr/loan-request/loan-request.module";
import { PayrollModule } from "./hr/payroll/payroll.module";
import { RegionModule } from "./sales-management/region/region.module";
import { ZoneModule } from "./sales-management/zone/zone.module";
import { CityModule } from "./sales-management/city/city.module";
import { BranchModule } from "./sales-management/branch/branch.module";
import { BranchProductPricesModule } from "./sales-management/branch-product-prices/branch-product-prices.module";
import { BranchStockModule } from "./sales-management/branch-stock/branch-stock.module";
import { FactoryStockModule } from "./sales-management/factory-stock/factory-stock.module";
import { BranchStockRequestsModule } from "./sales-management/branch-stock-requests/branch-stock-requests.module";
import { BranchStockTransfersModule } from "./sales-management/branch-stock-transfers/branch-stock-transfers.module";
import { BranchStockReturnsModule } from "./sales-management/branch-stock-returns/branch-stock-returns.module";
import { SalesPersonAssignmentsModule } from "./sales-management/sales-person-assignments/sales-person-assignments.module";
import { BranchLedgerModule } from "./sales-management/branch-ledger/branch-ledger.module";
import { PriceListsModule } from "./sales-management/price-lists/price-lists.module";
import { ProductBonusGroupModule } from "./sales-management/product-bonus-groups/product-bonus-group.module";
import { ProductBonusSchemeModule } from "./sales-management/product-bonus-schemes/product-bonus-scheme.module";
import { TransporterModule } from "./sales-management/transporters/transporter.module";
import { BrokerModule } from "./sales-management/brokers/broker.module";
import { AreaModule } from "./sales-management/area/area.module";
import { ProductGroupModule } from "./product-management/product-group/product-group.module";
import { ProductBrandModule } from "./product-management/product-brand/product-brand.module";
import { ProductCategoryModule } from "./product-management/product-category/product-category.module";
import { RecruitmentModule } from "./recruitment/recruitment.module";
import { FinancialModule } from "./financial/financial.module";
import { RawMaterialsModule } from "./raw-materials/raw-materials.module";
import { SitesModule } from "./sites/sites.module";
import { SaleDispatchesModule } from "./sale-dispatches/sale-dispatches.module";
import { LoggerMiddleware } from "./common/middleware/logger.middleware";
import { SecurityHeadersMiddleware } from "./common/middleware/security-headers.middleware";
import { TenantContextModule } from "./common/middleware/tenant-context.module";
import { TenantContextMiddleware } from "./common/middleware/tenant-context.middleware";
import { TenantValidationGuard } from "./common/guards/tenant-validation.guard";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, "..", ".env"),
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    LocationsModule,
    StockBalancesModule,
    StockTransactionsModule,
    StocktakeModule,
    StockLedgerModule,
    AuditModule,
    CsvModule,
    ReorderModule,
    SuppliersModule,
    UOMsModule,
    CustomersModule,
    CustomerCategoryModule,
    CustomerBankAccountsModule,
    CustomerLedgerModule,
    CustomerOrdersModule,
    CustomerDeliveriesModule,
    CustomerReturnsModule,
    CustomerRecoveryModule,
    CustomerLedgerAdjustmentsModule,
    ProductAdjustmentsModule,
    EmployeeCashLedgerModule,
    EmployeeCashTransferModule,
    SalesModule,
    PosModule,
    ReceiptsModule,
    PurchaseOrderModule,
    CompaniesModule,
    CashInHandModule,
    ExpensesModule,
    InvoiceSettingsModule,
    MasterPrismaModule,
    MultiTenantPrismaModule,
    TenantContextModule,
    SuperAdminModule,
    WarehousesModule,
    ProductionOrdersModule,
    MaterialRequestsModule,
    MaterialTransfersModule,
    GrnModule,
    ProductionLinesModule,
    PlantsModule,
    MachinesModule,
    RawMaterialBatchesModule,
    ProductBatchesModule,
    DashboardModule,
    SalesReportsModule,
    FactoryReportsModule,
    WorkOrdersModule,
    BomModule,
    QualityControlModule,
    WasteManagementModule,
    SettingsModule,
    InventoryReportsModule,
    StockMovementReportsModule,
    CostingModule,
    InvoicesModule,
    RolesModule,
    HrConfigModule,
    HrCoreModule,
    EmployeeModule,
    DepartmentModule,
    PositionModule,
    DesignationModule,
    ContractModule,
    ShiftModule,
    AttendanceModule,
    HolidayModule,
    HrSettingsModule,
    LeaveRequestModule,
    LoanRequestModule,
    PayrollModule,
    RegionModule,
    ZoneModule,
    CityModule,
    BranchModule,
    BranchProductPricesModule,
    BranchStockModule,
    FactoryStockModule,
    BranchStockRequestsModule,
    BranchStockTransfersModule,
    BranchStockReturnsModule,
    SalesPersonAssignmentsModule,
    BranchLedgerModule,
    PriceListsModule,
    ProductBonusGroupModule,
    ProductBonusSchemeModule,
    TransporterModule,
    BrokerModule,
    AreaModule,
    ProductGroupModule,
    ProductBrandModule,
    ProductCategoryModule,
    RecruitmentModule,
    FinancialModule,
    RawMaterialsModule,
    SitesModule,
    SaleDispatchesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantValidationGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply logger middleware first
    consumer.apply(LoggerMiddleware).forRoutes("*");

    // Apply security headers middleware
    consumer.apply(SecurityHeadersMiddleware).forRoutes("*");

    // Apply tenant context middleware after logger
    // This will identify tenant and attach tenant client to request
    // It runs before route handlers but after authentication guards
    consumer.apply(TenantContextMiddleware).forRoutes("*");
  }
}

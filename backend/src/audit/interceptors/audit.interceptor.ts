import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { AuditAction, AuditModule } from "@prisma/tenant-client";
import { AuditContextService } from "../audit-context.service";
import { AuditService } from "../audit.service";
import { AUDITABLE_KEY } from "../decorators/auditable.decorator";
import { AUDIT_HTTP_METHOD_ACTION_MAP } from "../utils/constants";
import { AuditableOptions } from "../utils/interfaces";
import { ActorType } from "../utils/types";
import { TenantRequest } from "../../common/middleware/tenant-context.middleware";
import { buildDiff, sanitizeSnapshot } from "../utils/diff.util";

const MODULE_ENTITY_MAP: Record<AuditModule, string> = {
  [AuditModule.PRODUCTS]: "Product",
  [AuditModule.RAW_MATERIALS]: "RawMaterial",
  [AuditModule.SITES]: "Site",
  [AuditModule.WAREHOUSES]: "Warehouse",
  [AuditModule.LOCATIONS]: "Location",
  [AuditModule.SUPPLIERS]: "Supplier",
  [AuditModule.CUSTOMERS]: "Customer",
  [AuditModule.PURCHASE_ORDERS]: "PurchaseOrder",
  [AuditModule.PURCHASE_RETURNS]: "PurchaseReturn",
  [AuditModule.INVOICES]: "Invoice",
  [AuditModule.EXPENSES]: "Expense",
  [AuditModule.CASH_IN_HAND]: "CashInHand",
  [AuditModule.PRODUCTION_ORDERS]: "ProductionOrder",
  [AuditModule.PRODUCTION_LINES]: "ProductionLine",
  [AuditModule.MATERIAL_REQUESTS]: "MaterialRequest",
  [AuditModule.MATERIAL_TRANSFERS]: "MaterialTransfer",
  [AuditModule.GRN]: "GRN",
  [AuditModule.USERS]: "User",
  [AuditModule.AUTH]: "Auth",
  [AuditModule.UOM]: "UOM",
  [AuditModule.BOM]: "BOM",
  [AuditModule.MACHINES]: "Machine",
  [AuditModule.PLANTS]: "Plant",
  [AuditModule.BATCHES]: "Batch",
  [AuditModule.RAW_MATERIAL_BATCHES]: "RawMaterialBatch",
  [AuditModule.PRODUCT_BATCHES]: "ProductBatch",
  [AuditModule.WORK_ORDERS]: "WorkOrder",
  [AuditModule.QUALITY_CONTROL]: "QualityControl",
  [AuditModule.STOCK_TRANSACTIONS]: "StockTransaction",
  [AuditModule.WASTE_MANAGEMENT]: "WasteManagement",
  [AuditModule.SALES]: "Sale",
  [AuditModule.SALE_RETURNS]: "SaleReturn",
  [AuditModule.SALE_DISPATCHES]: "SaleDispatch",
  [AuditModule.SYSTEM]: "System",
  [AuditModule.HR_EMPLOYEES]: "Employee",
  [AuditModule.HR_DEPARTMENTS]: "Department",
  [AuditModule.HR_POSITIONS]: "Position",
  [AuditModule.HR_DESIGNATIONS]: "Designation",
  [AuditModule.HR_GRADES]: "Grade",
  [AuditModule.HR_ORG_UNITS]: "OrgUnit",
  [AuditModule.HR_CONTRACTS]: "EmployeeContract",
  [AuditModule.HR_SHIFTS]: "Shift",
  [AuditModule.HR_ATTENDANCE]: "Attendance",
  [AuditModule.HR_HOLIDAYS]: "Holiday",
  [AuditModule.HR_SETTINGS]: "HrSettings",
  [AuditModule.HR_LEAVE_REQUESTS]: "LeaveRequest",
  [AuditModule.HR_LOAN_REQUESTS]: "LoanRequest",
  [AuditModule.HR_PAYROLL]: "Payroll",
  [AuditModule.ROLES]: "Role",
  [AuditModule.SALES_MANAGEMENT_REGIONS]: "Region",
  [AuditModule.SALES_MANAGEMENT_ZONES]: "Zone",
  [AuditModule.SALES_MANAGEMENT_CITIES]: "City",
  [AuditModule.SALES_MANAGEMENT_BRANCHES]: "Branch",
  [AuditModule.SALES_MANAGEMENT_AREAS]: "Area",
  [AuditModule.PRODUCT_MANAGEMENT_BRANDS]: "ProductBrand",
  [AuditModule.PRODUCT_MANAGEMENT_CATEGORIES]: "ProductCategory",
  [AuditModule.PRODUCT_MANAGEMENT_PRODUCT_GROUPS]: "ProductGroup",
  [AuditModule.CUSTOMER_CATEGORIES]: "CustomerCategory",
  [AuditModule.CUSTOMER_ORDERS]: "CustomerOrder",
  [AuditModule.CUSTOMER_DELIVERIES]: "CustomerDelivery",
  [AuditModule.CUSTOMER_RETURNS]: "CustomerReturn",
  [AuditModule.CUSTOMER_RECOVERIES]: "CustomerRecovery",
  [AuditModule.EMPLOYEE_CASH_TRANSFERS]: "EmployeeCashTransfer",
  [AuditModule.BRANCH_PRODUCT_PRICES]: "BranchProductPrice",
  [AuditModule.BRANCH_STOCK_REQUESTS]: "BranchStockRequest",
  [AuditModule.BRANCH_STOCK_TRANSFERS]: "BranchStockTransfer",
  [AuditModule.BRANCH_STOCK_RETURNS]: "BranchStockReturn",
  [AuditModule.FACTORY_STOCK]: "FactoryStockBalance",
  [AuditModule.SALES_PERSON_ASSIGNMENTS]: "SalesPersonAssignment",
  [AuditModule.SALES_PERSON_STOCK]: "SalesPersonStockBalance",
  [AuditModule.BRANCH_LEDGER]: "BranchLedger",
  [AuditModule.PRICE_LISTS]: "PriceListEntry",
  [AuditModule.CUSTOMER_LEDGER_ADJUSTMENTS]: "CustomerLedgerAdjustment",
  [AuditModule.SALES_MANAGEMENT_PRODUCT_BONUS_GROUPS]: "ProductBonusGroup",
  [AuditModule.SALES_MANAGEMENT_TRANSPORTERS]: "Transporter",
  [AuditModule.SALES_MANAGEMENT_PRODUCT_BONUS_SCHEMES]: "ProductBonusScheme",
  [AuditModule.CUSTOMER_PRODUCT_ADJUSTMENTS]: "ProductAdjustment",
  [AuditModule.BROKERS]: "Broker",
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
    private readonly auditContext: AuditContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const options = this.reflector.get<AuditableOptions>(AUDITABLE_KEY, context.getHandler());

    if (!options || options.skip) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<TenantRequest>();

    // Wrap the handler call inside the AuditContext AsyncLocalStorage so that
    // services can call auditContext.setOldValue() before their DB mutation.
    return new Observable((subscriber) => {
      this.auditContext.run(() => {
        next
          .handle()
          .pipe(
            tap({
              next: (response) => {
                // Fire-and-forget — never block the HTTP response
                this.writeLog(request, options, response).catch((err) =>
                  this.logger.error("Failed to write audit log", err?.stack),
                );
              },
            }),
          )
          .subscribe(subscriber);
      });
    });
  }

  private async writeLog(
    request: TenantRequest,
    options: AuditableOptions,
    response: any,
  ): Promise<void> {
    const tenantClient = request.tenantClient;
    if (!tenantClient) return;

    const actor = request.user;
    if (!actor) return;

    const store = this.auditContext.getStore();
    const action: AuditAction =
      options.action ??
      store?.action ??
      AUDIT_HTTP_METHOD_ACTION_MAP[request.method?.toUpperCase()] ??
      AuditAction.CREATE;

    // Extract entityId: explicit override wins, then response.id for CREATE, then first route param
    const entityId = this.resolveEntityId(request, response, action, store);
    if (!entityId) return;

    const sensitiveFields = options.sensitiveFields;

    const rawOld = store?.oldValue ?? null;
    const rawNew = this.extractResponseData(response);

    const oldValue = sanitizeSnapshot(rawOld, sensitiveFields);
    const newValue = action !== "DELETE" ? sanitizeSnapshot(rawNew, sensitiveFields) : null;
    const diff = buildDiff(oldValue, newValue, sensitiveFields);

    // For UPDATE: if nothing actually changed, skip the log entirely.
    if (action === "UPDATE" && !diff) return;

    // Store only the changed fields for UPDATE so the log entry is minimal and
    // readable. For CREATE / DELETE keep the full snapshot (it's the only record
    // of what was created or what was lost).
    let storedOld: Record<string, any> | null;
    let storedNew: Record<string, any> | null;

    if (action === "UPDATE" && diff) {
      const changedKeys = Object.keys(diff);
      storedOld = Object.fromEntries(changedKeys.map((k) => [k, oldValue?.[k] ?? null]));
      storedNew = Object.fromEntries(changedKeys.map((k) => [k, newValue?.[k] ?? null]));
    } else if (action === "DELETE") {
      storedOld = oldValue;
      storedNew = null;
    } else {
      // CREATE
      storedOld = null;
      storedNew = newValue;
    }

    const entityLabel =
      store?.entityLabel ?? this.extractLabel(rawNew) ?? this.extractLabel(rawOld);

    const entityName = options.entity ?? MODULE_ENTITY_MAP[options.module];

    await this.auditService.log(tenantClient, {
      actorId: actor.id,
      actorType: ActorType.USER,
      entityName,
      entityId,
      action,
      oldValue: storedOld,
      newValue: storedNew,
      module: options.module,
      entityLabel,
      metadata: store?.metadata,
    });
  }

  private resolveEntityId(
    request: TenantRequest,
    response: any,
    action: string,
    store: ReturnType<AuditContextService["getStore"]>,
  ): string | null {
    if (store?.entityId) return store.entityId;

    if (action === "CREATE") {
      const data = this.extractResponseData(response);
      return data?.id ?? null;
    }

    // For UPDATE / DELETE use the first route param (e.g. :productId, :id)
    const params = request.params ?? {};
    const firstParam = Object.values(params)[0];
    return (firstParam as string) ?? null;
  }

  private extractResponseData(response: any): Record<string, any> | null {
    if (!response || typeof response !== "object") return null;
    // Handle ResponseInterceptor envelope: { success, message, data }
    if ("data" in response && response.data && typeof response.data === "object") {
      return response.data;
    }
    return response;
  }

  private extractLabel(data: Record<string, any> | null): string | null {
    if (!data) return null;
    return data["name"] ?? data["title"] ?? data["code"] ?? data["number"] ?? null;
  }
}

import { Controller, Get, Query, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RequestWithUser } from "../common/interfaces";
import {
  DashboardMetrics,
  FactoryDashboardMetrics,
  PurchaseDashboardStats,
} from "./utils/interfaces";
import { ProductDashboardStats } from "../product-management/products/utils/interfaces";
import { RawMaterialDashboardStats } from "../raw-materials/utils/interfaces";
import { ProductionOrderDashboardStats } from "../production-orders/utils/interfaces";
import { BomDashboardStats } from "../bom/utils/interfaces";
import { GrnDashboardStats } from "../grn/utils/interfaces";
import { TopSupplierBySpend } from "../suppliers/utils/interfaces";
import { CustomerDashboardStats } from "../customer-management/customers/utils/interfaces";

@ApiTags("Dashboard")
@Controller("dashboard")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  //–––––––––––––––––––––––––––––––– NEW ––––––––––––––––––––––––––––––––

  @Get("products/stats")
  @ApiOperation({
    summary: "Get product dashboard stats",
    description:
      "Returns active product count, total stock value, and low-stock/out-of-stock counts for dashboard charts.",
  })
  async getProductDashboard(): Promise<ProductDashboardStats> {
    return this.dashboardService.getProductDashboard();
  }

  @Get("raw-materials/stats")
  @ApiOperation({
    summary: "Get raw material dashboard stats",
    description:
      "Returns raw material stock valuation and low-stock/out-of-stock counts for dashboard charts.",
  })
  async getRawMaterialDashboard(): Promise<RawMaterialDashboardStats> {
    return this.dashboardService.getRawMaterialDashboard();
  }

  @Get("purchase-orders/stats")
  @ApiOperation({
    summary: "Get purchase order and supplier dashboard stats",
    description:
      "Returns purchase order status breakdown, payment status breakdown, and active/inactive supplier counts for dashboard charts.",
  })
  async getPurchaseOrderDashboard(): Promise<PurchaseDashboardStats> {
    return this.dashboardService.getPurchaseOrderDashboard();
  }

  @Get("production-orders/stats")
  @ApiOperation({
    summary: "Get production order dashboard stats",
    description:
      "Returns production order status breakdown (draft/in-progress/completed/cancelled counts) plus total production cost and total waste cost for dashboard charts.",
  })
  async getProductionOrderDashboard(): Promise<ProductionOrderDashboardStats> {
    return this.dashboardService.getProductionOrderDashboard();
  }

  @Get("bom/stats")
  @ApiOperation({
    summary: "Get BOM dashboard stats",
    description:
      "Returns BOM status breakdown (draft/active/inactive counts) and total BOM count for a status donut chart.",
  })
  async getBomDashboard(): Promise<BomDashboardStats> {
    return this.dashboardService.getBomDashboard();
  }

  @Get("grn/stats")
  @ApiOperation({
    summary: "Get GRN dashboard stats",
    description:
      "Returns GRN status breakdown (pending/inspecting/approved/rejected/completed counts) plus total received and rejected quantity across all GRN items, for status and quality charts.",
  })
  async getGrnDashboard(): Promise<GrnDashboardStats> {
    return this.dashboardService.getGrnDashboard();
  }

  @Get("suppliers/spend-stats")
  @ApiOperation({
    summary: "Get top suppliers by purchase spend",
    description:
      "Returns the top 5 suppliers ranked by total debit (purchase spend) from supplier transactions, for a top-N bar chart.",
  })
  async getSupplierSpendDashboard(): Promise<TopSupplierBySpend[]> {
    return this.dashboardService.getSupplierSpendDashboard();
  }

  @Get("customers/stats")
  @ApiOperation({
    summary: "Get customer dashboard stats",
    description:
      "Returns active/inactive customer counts plus the top 5 customers ranked by outstanding balance, for a status donut and top-N bar chart.",
  })
  async getCustomerDashboard(): Promise<CustomerDashboardStats> {
    return this.dashboardService.getCustomerDashboard();
  }

  //–––––––––––––––––––––––––––––––– OLD ––––––––––––––––––––––––––––––––

  @Get()
  @ApiOperation({ summary: "Get dashboard metrics" })
  async getDashboard(@Req() req: RequestWithUser): Promise<DashboardMetrics> {
    return this.dashboardService.getDashboardMetrics(req.user.tenantId);
  }

  @Get("factory")
  @ApiOperation({ summary: "Get factory dashboard metrics" })
  @ApiQuery({ name: "siteId", required: false, description: "Filter by site ID" })
  async getFactoryDashboard(@Query("siteId") siteId?: string): Promise<FactoryDashboardMetrics> {
    return this.dashboardService.getFactoryDashboardMetrics(siteId);
  }
}

import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { PurchaseSummaryService } from "./summary.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SummaryQueryDto } from "./dto/summary-query.dto";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";

@ApiTags("Purchase Order Summary")
@Controller("purchase-orders/summary")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PurchaseSummaryController {
  constructor(private readonly summaryService: PurchaseSummaryService) {}

  @Get()
  @RequirePermission("reports.view_all")
  @ApiOperation({ summary: "Get purchase summary and analytics" })
  @ApiResponse({
    status: 200,
    description: "Purchase summary retrieved successfully",
  })
  getSummary(@TenantClient() tenantClient: PrismaClient, @Query() queryDto: SummaryQueryDto) {
    return this.summaryService.getSummary(tenantClient, queryDto);
  }

  @Get("monthly-trends")
  @RequirePermission("reports.view_all")
  @ApiOperation({ summary: "Get monthly purchase trends" })
  @ApiResponse({
    status: 200,
    description: "Monthly trends retrieved successfully",
  })
  getMonthlyTrends(@TenantClient() tenantClient: PrismaClient, @Query() queryDto: SummaryQueryDto) {
    return this.summaryService.getMonthlyTrends(tenantClient, queryDto);
  }

  @Get("top-suppliers")
  @RequirePermission("reports.view_all")
  @ApiOperation({ summary: "Get top suppliers by purchase value" })
  @ApiResponse({
    status: 200,
    description: "Top suppliers retrieved successfully",
  })
  getTopSuppliers(@TenantClient() tenantClient: PrismaClient, @Query() queryDto: SummaryQueryDto) {
    return this.summaryService.getTopSuppliers(tenantClient, queryDto);
  }
}

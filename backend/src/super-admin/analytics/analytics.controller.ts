import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { SuperAdminJwtAuthGuard } from "../auth/guards/super-admin-jwt-auth.guard";
import { AnalyticsService } from "./analytics.service";

@ApiTags("Super Admin - Analytics")
@Controller("super-admin/analytics")
@UseGuards(SuperAdminJwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("overview")
  @ApiOperation({ summary: "Get dashboard overview statistics" })
  @ApiResponse({
    status: 200,
    description: "Overview statistics retrieved successfully",
  })
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get("revenue")
  @ApiOperation({ summary: "Get revenue statistics" })
  @ApiQuery({
    name: "startDate",
    required: false,
    type: String,
    description: "Start date (ISO string)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    type: String,
    description: "End date (ISO string)",
  })
  @ApiResponse({
    status: 200,
    description: "Revenue statistics retrieved successfully",
  })
  getRevenue(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.analyticsService.getRevenue(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get("tenants")
  @ApiOperation({ summary: "Get tenant statistics" })
  @ApiResponse({
    status: 200,
    description: "Tenant statistics retrieved successfully",
  })
  getTenantStats() {
    return this.analyticsService.getTenantStats();
  }

  @Get("subscriptions")
  @ApiOperation({ summary: "Get subscription analytics" })
  @ApiResponse({
    status: 200,
    description: "Subscription analytics retrieved successfully",
  })
  getSubscriptionAnalytics() {
    return this.analyticsService.getSubscriptionAnalytics();
  }

  @Get("usage")
  @ApiOperation({ summary: "Get usage metrics" })
  @ApiResponse({
    status: 200,
    description: "Usage metrics retrieved successfully",
  })
  getUsageMetrics() {
    return this.analyticsService.getUsageMetrics();
  }
}

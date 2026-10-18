import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../../users/guards/permissions.guard";
import { RequirePermission } from "../../../users/decorators/permissions.decorator";
import { AgingService } from "../services/aging.service";

@ApiTags("Accounts Payable - Aging")
@Controller(["financial/ap", "ap"])
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission("finance.view")
@ApiBearerAuth()
export class AgingController {
  constructor(private readonly agingService: AgingService) {}

  @Get("aging")
  @ApiOperation({ summary: "Get vendor bill aging" })
  @ApiQuery({
    name: "asOfDate",
    required: false,
    description: "As-of date (ISO string). Defaults to now.",
  })
  @ApiResponse({ status: 200, description: "Aging generated successfully" })
  async getAging(@Query("asOfDate") asOfDate?: string) {
    const date = asOfDate ? new Date(asOfDate) : undefined;
    return this.agingService.getVendorBillAging(date);
  }
}

import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { BranchStockService } from "./branch-stock.service";
import { BranchStockFiltersDto } from "./dto/branch-stock-filters.dto";

@ApiTags("Sales Management - Branch Stock")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("sales-management/branch-stock")
export class BranchStockController {
  constructor(private readonly branchStockService: BranchStockService) {}

  @Get()
  @RequirePermission(
    "branch-stock.view",
    "branch-stock-operations.view",
    "branch-stock-operations.manage",
  )
  @ApiOperation({ summary: "List current branch stock balances, filterable by branch or product" })
  listBranchStock(@Query() branchStockFiltersDto: BranchStockFiltersDto) {
    return this.branchStockService.listBranchStock(branchStockFiltersDto);
  }
}

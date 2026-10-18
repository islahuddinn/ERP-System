import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { ReorderService } from "./reorder.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";

@ApiTags("Reorder Alerts")
@Controller("reorder")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ReorderController {
  constructor(private readonly reorderService: ReorderService) {}

  @Get("alerts")
  @RequirePermission("stock.read")
  @ApiOperation({ summary: "Get all reorder alerts" })
  @ApiResponse({
    status: 200,
    description: "Reorder alerts retrieved successfully",
  })
  getAlerts() {
    return this.reorderService.getReorderAlerts();
  }

  @Get("summary")
  @RequirePermission("stock.read")
  @ApiOperation({ summary: "Get reorder summary" })
  @ApiResponse({
    status: 200,
    description: "Reorder summary retrieved successfully",
  })
  getSummary() {
    return this.reorderService.getReorderSummary();
  }

  @Get("suggestions/:productId")
  @RequirePermission("stock.read")
  @ApiOperation({ summary: "Get reorder suggestions for a product" })
  @ApiResponse({
    status: 200,
    description: "Reorder suggestions retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Product not found" })
  getSuggestions(@Param("productId", ParseUUIDPipe) productId: string) {
    return this.reorderService.getReorderSuggestions(productId);
  }
}

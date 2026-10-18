import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Post,
  NotFoundException,
  Body,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { CapacityService } from "../../common/services/capacity.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { TenantClient } from "../../common/decorators/tenant-client.decorator";
import { CurrentUser } from "../../users/decorators/current-user.decorator";
import { PrismaClient } from "@prisma/tenant-client";
import { ResolveAlertDto } from "./dto/resolve-alert.dto";

@ApiTags("Warehouse Capacity")
@Controller("warehouses/:warehouseId/capacity")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CapacityController {
  constructor(private readonly capacityService: CapacityService) {}

  @Get()
  @RequirePermission("warehouses.view")
  @ApiOperation({ summary: "Get warehouse capacity information" })
  @ApiResponse({
    status: 200,
    description: "Capacity information retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  async getCapacityInfo(
    @TenantClient() tenantClient: PrismaClient,
    @Param("warehouseId") warehouseId: string,
  ) {
    const usedCapacity = await this.capacityService.calculateUsedCapacity(
      tenantClient,
      warehouseId,
    );
    const availableCapacity = await this.capacityService.calculateAvailableCapacity(
      tenantClient,
      warehouseId,
    );

    // Get warehouse for total capacity
    const warehouse = await tenantClient.warehouse.findUnique({
      where: { id: warehouseId },
      select: {
        totalCapacity: true,
        capacityUnit: true,
      },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${warehouseId} not found`);
    }

    const capacityPercentage =
      warehouse.totalCapacity > 0 ? (usedCapacity / warehouse.totalCapacity) * 100 : 0;

    return {
      totalCapacity: warehouse.totalCapacity,
      usedCapacity,
      availableCapacity,
      capacityPercentage: Math.round(capacityPercentage * 100) / 100,
      capacityUnit: warehouse.capacityUnit,
    };
  }

  @Post("update")
  @RequirePermission("warehouses.update")
  @ApiOperation({ summary: "Update warehouse capacity calculation" })
  @ApiResponse({ status: 200, description: "Capacity updated successfully" })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  async updateCapacity(
    @TenantClient() tenantClient: PrismaClient,
    @Param("warehouseId") warehouseId: string,
  ) {
    await this.capacityService.updateCapacity(tenantClient, warehouseId);
    await this.capacityService.checkCapacityAlerts(tenantClient, warehouseId);
    return { message: "Capacity updated successfully" };
  }

  @Post("check-alerts")
  @RequirePermission("warehouses.view")
  @ApiOperation({ summary: "Check and generate capacity alerts" })
  @ApiResponse({ status: 200, description: "Alerts checked successfully" })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  async checkAlerts(
    @TenantClient() tenantClient: PrismaClient,
    @Param("warehouseId") warehouseId: string,
  ) {
    await this.capacityService.checkCapacityAlerts(tenantClient, warehouseId);
    return { message: "Alerts checked successfully" };
  }

  @Post("alerts/:alertId/resolve")
  @RequirePermission("warehouses.update")
  @ApiOperation({ summary: "Manually resolve a capacity alert" })
  @ApiResponse({ status: 200, description: "Alert resolved successfully" })
  @ApiResponse({ status: 404, description: "Alert not found" })
  async resolveAlert(
    @TenantClient() tenantClient: PrismaClient,
    @Param("warehouseId") warehouseId: string,
    @Param("alertId") alertId: string,
    @Body() dto: ResolveAlertDto,
    @CurrentUser() user: any,
  ) {
    await this.capacityService.resolveAlert(tenantClient, alertId, user.id, dto.reason);
    return { message: "Alert resolved successfully" };
  }
}

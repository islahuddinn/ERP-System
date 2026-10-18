import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { ZonesService } from "./zones.service";
import { CreateZoneDto } from "./dto/create-zone.dto";
import { UpdateZoneDto } from "./dto/update-zone.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { CurrentUser } from "../../users/decorators/current-user.decorator";
import { TenantClient } from "../../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";

@ApiTags("Warehouse Zones")
@Controller("warehouses/:warehouseId/zones")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Post()
  @RequirePermission("zones.create")
  @ApiOperation({ summary: "Create a new zone in warehouse" })
  @ApiResponse({ status: 201, description: "Zone created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  @ApiResponse({
    status: 409,
    description: "Zone with this code already exists",
  })
  create(
    @TenantClient() tenantClient: PrismaClient,
    @Param("warehouseId") warehouseId: string,
    @Body() createZoneDto: CreateZoneDto,
    @CurrentUser() user: any,
  ) {
    return this.zonesService.create(tenantClient, warehouseId, createZoneDto, user.id);
  }

  @Get()
  @RequirePermission("zones.view")
  @ApiOperation({ summary: "Get all zones in warehouse" })
  @ApiResponse({ status: 200, description: "Zones retrieved successfully" })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  findAll(@TenantClient() tenantClient: PrismaClient, @Param("warehouseId") warehouseId: string) {
    return this.zonesService.findAll(tenantClient, warehouseId);
  }

  @Get(":zoneId")
  @RequirePermission("zones.view")
  @ApiOperation({ summary: "Get zone by ID in warehouse" })
  @ApiResponse({ status: 200, description: "Zone retrieved successfully" })
  @ApiResponse({ status: 404, description: "Zone not found" })
  findOne(
    @TenantClient() tenantClient: PrismaClient,
    @Param("warehouseId") warehouseId: string,
    @Param("zoneId") zoneId: string,
  ) {
    return this.zonesService.findOne(tenantClient, zoneId);
  }

  @Patch(":zoneId")
  @RequirePermission("zones.update")
  @ApiOperation({ summary: "Update zone in warehouse" })
  @ApiResponse({ status: 200, description: "Zone updated successfully" })
  @ApiResponse({ status: 404, description: "Zone not found" })
  @ApiResponse({
    status: 409,
    description: "Zone with this code already exists",
  })
  update(
    @TenantClient() tenantClient: PrismaClient,
    @Param("warehouseId") warehouseId: string,
    @Param("zoneId") zoneId: string,
    @Body() updateZoneDto: UpdateZoneDto,
  ) {
    return this.zonesService.update(tenantClient, zoneId, updateZoneDto);
  }

  @Delete(":zoneId")
  @RequirePermission("zones.delete")
  @ApiOperation({ summary: "Delete zone from warehouse" })
  @ApiResponse({ status: 200, description: "Zone deleted successfully" })
  @ApiResponse({ status: 404, description: "Zone not found" })
  @ApiResponse({ status: 400, description: "Cannot delete zone with stock" })
  remove(
    @TenantClient() tenantClient: PrismaClient,
    @Param("warehouseId") warehouseId: string,
    @Param("zoneId") zoneId: string,
  ) {
    // Log the delete request for debugging
    console.log(
      `[ZonesController] DELETE /warehouses/${warehouseId}/zones/${zoneId} - zoneId: ${zoneId}`,
    );
    return this.zonesService.remove(tenantClient, zoneId);
  }
}

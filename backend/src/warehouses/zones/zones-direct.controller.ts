import { Controller, Get, Patch, Param, Delete, UseGuards, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { ZonesService } from "./zones.service";
import { UpdateZoneDto } from "./dto/update-zone.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { TenantClient } from "../../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";

@ApiTags("Warehouse Zones")
@Controller("zones")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ZonesDirectController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get(":id")
  @RequirePermission("zones.view")
  @ApiOperation({ summary: "Get zone by ID" })
  @ApiResponse({ status: 200, description: "Zone retrieved successfully" })
  @ApiResponse({ status: 404, description: "Zone not found" })
  findOne(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.zonesService.findOne(tenantClient, id);
  }

  @Patch(":id")
  @RequirePermission("zones.update")
  @ApiOperation({ summary: "Update zone" })
  @ApiResponse({ status: 200, description: "Zone updated successfully" })
  @ApiResponse({ status: 404, description: "Zone not found" })
  @ApiResponse({
    status: 409,
    description: "Zone with this code already exists",
  })
  update(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() updateZoneDto: UpdateZoneDto,
  ) {
    return this.zonesService.update(tenantClient, id, updateZoneDto);
  }

  @Delete(":id")
  @RequirePermission("zones.delete")
  @ApiOperation({ summary: "Delete zone" })
  @ApiResponse({ status: 200, description: "Zone deleted successfully" })
  @ApiResponse({ status: 404, description: "Zone not found" })
  @ApiResponse({ status: 400, description: "Cannot delete zone with stock" })
  remove(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.zonesService.remove(tenantClient, id);
  }

  @Get(":id/capacity")
  @RequirePermission("zones.view")
  @ApiOperation({ summary: "Get zone capacity information" })
  @ApiResponse({
    status: 200,
    description: "Capacity information retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Zone not found" })
  getZoneCapacity(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.zonesService.getZoneCapacity(tenantClient, id);
  }

  @Patch(":id/capacity")
  @RequirePermission("zones.manage_capacity")
  @ApiOperation({ summary: "Update zone capacity" })
  @ApiResponse({ status: 200, description: "Capacity updated successfully" })
  @ApiResponse({ status: 404, description: "Zone not found" })
  @ApiResponse({ status: 400, description: "Invalid capacity value" })
  updateZoneCapacity(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() body: { usedCapacity: number },
  ) {
    return this.zonesService.updateZoneCapacity(tenantClient, id, body.usedCapacity);
  }
}

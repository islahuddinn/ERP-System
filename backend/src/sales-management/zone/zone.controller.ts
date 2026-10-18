import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { Auditable } from "../../audit/decorators/auditable.decorator";
import { ZoneService } from "./zone.service";
import { CreateSalesZoneDto } from "./dto/create-zone.dto";
import { UpdateSalesZoneDto } from "./dto/update-zone.dto";
import { ZoneFiltersDto } from "./dto/zone-filters.dto";

@ApiTags("Sales Management - Zones")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("sales-management/zones")
export class ZoneController {
  constructor(private readonly zoneService: ZoneService) {}

  @Get()
  @RequirePermission("sales-zone.view")
  @ApiOperation({ summary: "List zones with pagination, search and region filter" })
  listZones(@Query() zoneFiltersDto: ZoneFiltersDto) {
    return this.zoneService.listZones(zoneFiltersDto);
  }

  @Get("dropdown")
  @RequirePermission("sales-zone.view")
  @ApiOperation({ summary: "Dropdown list of active zones, optionally filtered by region" })
  dropdown(@Query("regionId") regionId?: string) {
    return this.zoneService.dropdown(regionId);
  }

  @Get(":zoneId")
  @RequirePermission("sales-zone.view")
  @ApiOperation({ summary: "Get zone by ID" })
  getZone(@Param("zoneId", ParseUUIDPipe) zoneId: string) {
    return this.zoneService.getZone(zoneId);
  }

  @Get(":zoneId/tree")
  @RequirePermission("sales-zone.view")
  @ApiOperation({ summary: "Get a zone's full territory tree — cities, branches and areas nested" })
  getZoneTree(@Param("zoneId", ParseUUIDPipe) zoneId: string) {
    return this.zoneService.getZoneTree(zoneId);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_ZONES })
  @Post()
  @RequirePermission("sales-zone.manage")
  @ApiOperation({ summary: "Create a new zone under a region" })
  createZone(@Body() createZoneDto: CreateSalesZoneDto) {
    return this.zoneService.createZone(createZoneDto);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_ZONES })
  @Patch(":zoneId")
  @RequirePermission("sales-zone.manage")
  @ApiOperation({ summary: "Update a zone" })
  updateZone(@Param("zoneId", ParseUUIDPipe) zoneId: string, @Body() updateZoneDto: UpdateSalesZoneDto) {
    return this.zoneService.updateZone(zoneId, updateZoneDto);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_ZONES })
  @Delete(":zoneId")
  @RequirePermission("sales-zone.manage")
  @ApiOperation({ summary: "Delete zone — blocked if cities exist under it" })
  async deleteZone(@Param("zoneId", ParseUUIDPipe) zoneId: string) {
    await this.zoneService.deleteZone(zoneId);
    return { message: "Zone deleted successfully" };
  }
}

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
import { RegionService } from "./region.service";
import { CreateRegionDto } from "./dto/create-region.dto";
import { UpdateRegionDto } from "./dto/update-region.dto";
import { RegionFiltersDto } from "./dto/region-filters.dto";

@ApiTags("Sales Management - Regions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("sales-management/regions")
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

  @Get()
  @RequirePermission("sales-region.view")
  @ApiOperation({ summary: "List regions with pagination and search" })
  listRegions(@Query() regionFiltersDto: RegionFiltersDto) {
    return this.regionService.listRegions(regionFiltersDto);
  }

  @Get("dropdown")
  @RequirePermission("sales-region.view")
  @ApiOperation({ summary: "Dropdown list of active regions — id and name only" })
  dropdown() {
    return this.regionService.dropdown();
  }

  @Get(":regionId")
  @RequirePermission("sales-region.view")
  @ApiOperation({ summary: "Get region by ID" })
  getRegion(@Param("regionId", ParseUUIDPipe) regionId: string) {
    return this.regionService.getRegion(regionId);
  }

  @Get(":regionId/tree")
  @RequirePermission("sales-region.view")
  @ApiOperation({
    summary: "Get a region's full territory tree — zones, cities, branches and areas nested",
  })
  getRegionTree(@Param("regionId", ParseUUIDPipe) regionId: string) {
    return this.regionService.getRegionTree(regionId);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_REGIONS })
  @Post()
  @RequirePermission("sales-region.manage")
  @ApiOperation({ summary: "Create a new region" })
  createRegion(@Body() createRegionDto: CreateRegionDto) {
    return this.regionService.createRegion(createRegionDto);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_REGIONS })
  @Patch(":regionId")
  @RequirePermission("sales-region.manage")
  @ApiOperation({ summary: "Update a region" })
  updateRegion(
    @Param("regionId", ParseUUIDPipe) regionId: string,
    @Body() updateRegionDto: UpdateRegionDto,
  ) {
    return this.regionService.updateRegion(regionId, updateRegionDto);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_REGIONS })
  @Delete(":regionId")
  @RequirePermission("sales-region.manage")
  @ApiOperation({ summary: "Delete region — blocked if zones exist under it" })
  async deleteRegion(@Param("regionId", ParseUUIDPipe) regionId: string) {
    await this.regionService.deleteRegion(regionId);
    return { message: "Region deleted successfully" };
  }
}

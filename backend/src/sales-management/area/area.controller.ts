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
import { AreaService } from "./area.service";
import { CreateAreaDto } from "./dto/create-area.dto";
import { UpdateAreaDto } from "./dto/update-area.dto";
import { AreaFiltersDto } from "./dto/area-filters.dto";

@ApiTags("Sales Management - Areas")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("sales-management/areas")
export class AreaController {
  constructor(private readonly areaService: AreaService) {}

  @Get()
  @RequirePermission("sales-area.view")
  @ApiOperation({ summary: "List areas with pagination, search and branch filter" })
  listAreas(@Query() areaFiltersDto: AreaFiltersDto) {
    return this.areaService.listAreas(areaFiltersDto);
  }

  @Get("dropdown")
  @RequirePermission("sales-area.view")
  @ApiOperation({ summary: "Dropdown list of active areas, optionally filtered by branch" })
  dropdown(@Query("branchId") branchId?: string) {
    return this.areaService.dropdown(branchId);
  }

  @Get(":areaId")
  @RequirePermission("sales-area.view")
  @ApiOperation({ summary: "Get area by ID" })
  getArea(@Param("areaId", ParseUUIDPipe) areaId: string) {
    return this.areaService.getArea(areaId);
  }

  @Get(":areaId/tree")
  @RequirePermission("sales-area.view")
  @ApiOperation({ summary: "Get an area's tree — customers nested with minimal details" })
  getAreaTree(@Param("areaId", ParseUUIDPipe) areaId: string) {
    return this.areaService.getAreaTree(areaId);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_AREAS })
  @Post()
  @RequirePermission("sales-area.manage")
  @ApiOperation({ summary: "Create a new area under a branch" })
  createArea(@Body() createAreaDto: CreateAreaDto) {
    return this.areaService.createArea(createAreaDto);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_AREAS })
  @Patch(":areaId")
  @RequirePermission("sales-area.manage")
  @ApiOperation({ summary: "Update an area" })
  updateArea(@Param("areaId", ParseUUIDPipe) areaId: string, @Body() updateAreaDto: UpdateAreaDto) {
    return this.areaService.updateArea(areaId, updateAreaDto);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_AREAS })
  @Delete(":areaId")
  @RequirePermission("sales-area.manage")
  @ApiOperation({ summary: "Delete an area" })
  async deleteArea(@Param("areaId", ParseUUIDPipe) areaId: string) {
    await this.areaService.deleteArea(areaId);
    return { message: "Area deleted successfully" };
  }
}

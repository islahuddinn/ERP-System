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
import { DesignationService } from "./designation.service";
import { CreateDesignationDto } from "./dto/create-designation.dto";
import { UpdateDesignationDto } from "./dto/update-designation.dto";
import { DesignationFiltersDto } from "./dto/designation-filters.dto";

@ApiTags("HR - Designations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("hr/designations")
export class DesignationController {
  constructor(private readonly designationService: DesignationService) {}

  @Get()
  @RequirePermission("hr-designations.view")
  @ApiOperation({ summary: "List designations with pagination and search" })
  listDesignations(@Query() designationFiltersDto: DesignationFiltersDto) {
    return this.designationService.listDesignations(designationFiltersDto);
  }

  @Get("dropdown")
  @RequirePermission("hr-designations.view")
  @ApiOperation({ summary: "Dropdown list of designations — id, title, parentDesignationId only" })
  dropdown() {
    return this.designationService.dropdown();
  }

  @Get("tree")
  @RequirePermission("hr-designations.view")
  @ApiOperation({ summary: "Get full designation hierarchy as a nested tree" })
  getDesignationTree() {
    return this.designationService.getDesignationTree();
  }

  @Get(":designationId")
  @RequirePermission("hr-designations.view")
  @ApiOperation({ summary: "Get designation by ID with parent and sub-designations" })
  getDesignation(@Param("designationId", ParseUUIDPipe) designationId: string) {
    return this.designationService.getDesignation(designationId);
  }

  @Auditable({ module: AuditModule.HR_DESIGNATIONS })
  @Post()
  @RequirePermission("hr-designations.manage")
  @ApiOperation({ summary: "Create a new designation" })
  createDesignation(@Body() createDesignationDto: CreateDesignationDto) {
    return this.designationService.createDesignation(createDesignationDto);
  }

  @Auditable({ module: AuditModule.HR_DESIGNATIONS })
  @Patch(":designationId")
  @RequirePermission("hr-designations.manage")
  @ApiOperation({ summary: "Update designation title, description, or parent" })
  updateDesignation(
    @Param("designationId", ParseUUIDPipe) designationId: string,
    @Body() updateDesignationDto: UpdateDesignationDto,
  ) {
    return this.designationService.updateDesignation(designationId, updateDesignationDto);
  }

  @Auditable({ module: AuditModule.HR_DESIGNATIONS })
  @Delete(":designationId")
  @RequirePermission("hr-designations.manage")
  @ApiOperation({ summary: "Delete designation — blocked if employees or sub-designations exist" })
  async deleteDesignation(@Param("designationId", ParseUUIDPipe) designationId: string) {
    await this.designationService.deleteDesignation(designationId);
    return { message: "Designation deleted successfully" };
  }
}

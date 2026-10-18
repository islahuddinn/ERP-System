import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { WasteManagementService } from "./waste-management.service";
import { CreateWasteManagementDto, UpdateWasteManagementDto, QueryWasteManagementDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { RequestWithUser } from "../common/interfaces";
import { Auditable } from "../audit/decorators/auditable.decorator";
import { AuditModule } from "@prisma/tenant-client";

@ApiTags("Waste Management")
@Controller("waste-management")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class WasteManagementController {
  constructor(private readonly wasteManagementService: WasteManagementService) {}

  @Post()
  @Auditable({ module: AuditModule.WASTE_MANAGEMENT, entity: "WasteManagement" })
  @ApiOperation({ summary: "Record a new waste entry for a raw material or product" })
  @RequirePermission("waste-management.create")
  create(@Body() createDto: CreateWasteManagementDto, @Req() req: RequestWithUser) {
    return this.wasteManagementService.create(createDto, req);
  }

  @Get()
  @ApiOperation({ summary: "Get all waste records with pagination and filters" })
  @RequirePermission("waste-management.read")
  findAll(@Query() query: QueryWasteManagementDto) {
    return this.wasteManagementService.findAll(query);
  }

  @Get(":wasteId")
  @ApiOperation({ summary: "Get a waste record by ID" })
  @RequirePermission("waste-management.read")
  findOne(@Param("wasteId") wasteId: string) {
    return this.wasteManagementService.findOne(wasteId);
  }

  @Patch(":wasteId")
  @Auditable({ module: AuditModule.WASTE_MANAGEMENT, entity: "WasteManagement" })
  @ApiOperation({
    summary:
      "Update a waste record's details, optionally resolving it as DISPOSED, RECYCLED or REUSED",
  })
  @RequirePermission("waste-management.update")
  update(@Param("wasteId") wasteId: string, @Body() updateDto: UpdateWasteManagementDto) {
    return this.wasteManagementService.update(wasteId, updateDto);
  }

  @Delete(":wasteId")
  @Auditable({ module: AuditModule.WASTE_MANAGEMENT, entity: "WasteManagement" })
  @ApiOperation({ summary: "Delete a waste record" })
  @RequirePermission("waste-management.delete")
  remove(@Param("wasteId") wasteId: string) {
    return this.wasteManagementService.remove(wasteId);
  }
}

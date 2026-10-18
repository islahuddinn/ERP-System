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
import { PositionService } from "./position.service";
import { CreatePositionDto } from "./dto/create-position.dto";
import { UpdatePositionDto } from "./dto/update-position.dto";
import { PositionFiltersDto } from "./dto/position-filters.dto";

@ApiTags("HR - Positions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("hr/positions")
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  @Get()
  @RequirePermission("hr.view")
  @ApiOperation({ summary: "List positions with pagination and search" })
  listPositions(@Query() positionFiltersDto: PositionFiltersDto) {
    return this.positionService.listPositions(positionFiltersDto);
  }

  @Get("dropdown")
  @RequirePermission("hr.view")
  @ApiOperation({ summary: "Dropdown list of positions — id, title only" })
  dropdown() {
    return this.positionService.dropdown();
  }

  @Get(":positionId")
  @RequirePermission("hr.view")
  @ApiOperation({ summary: "Get position by ID with employee count" })
  getPosition(@Param("positionId", ParseUUIDPipe) positionId: string) {
    return this.positionService.getPosition(positionId);
  }

  @Auditable({ module: AuditModule.HR_POSITIONS })
  @Post()
  @RequirePermission("hr.manage_employees")
  @ApiOperation({ summary: "Create a new position" })
  createPosition(@Body() createPositionDto: CreatePositionDto) {
    return this.positionService.createPosition(createPositionDto);
  }

  @Auditable({ module: AuditModule.HR_POSITIONS })
  @Patch(":positionId")
  @RequirePermission("hr.manage_employees")
  @ApiOperation({ summary: "Update position title or description" })
  updatePosition(
    @Param("positionId", ParseUUIDPipe) positionId: string,
    @Body() updatePositionDto: UpdatePositionDto,
  ) {
    return this.positionService.updatePosition(positionId, updatePositionDto);
  }

  @Auditable({ module: AuditModule.HR_POSITIONS })
  @Delete(":positionId")
  @RequirePermission("hr.manage_employees")
  @ApiOperation({ summary: "Delete position — blocked if employees are assigned" })
  async deletePosition(@Param("positionId", ParseUUIDPipe) positionId: string) {
    return this.positionService.deletePosition(positionId);
  }
}

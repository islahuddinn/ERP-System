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
import { ShiftService } from "./shift.service";
import { CreateShiftDto } from "./dto/create-shift.dto";
import { UpdateShiftDto } from "./dto/update-shift.dto";
import { ShiftFiltersDto } from "./dto/shift-filters.dto";

@ApiTags("HR - Shifts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("hr/shifts")
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @Get()
  @RequirePermission("shifts.view")
  @ApiOperation({ summary: "List all shifts with pagination and optional filters" })
  listShifts(@Query() shiftFiltersDto: ShiftFiltersDto) {
    return this.shiftService.listShifts(shiftFiltersDto);
  }

  @Get("dropdown")
  @RequirePermission("shifts.view")
  @ApiOperation({ summary: "Dropdown list of shifts — id, name, type only" })
  dropdown() {
    return this.shiftService.dropdown();
  }

  @Get(":shiftId")
  @RequirePermission("shifts.view")
  @ApiOperation({ summary: "Get shift by ID with assigned employee count" })
  getShift(@Param("shiftId", ParseUUIDPipe) shiftId: string) {
    return this.shiftService.getShift(shiftId);
  }

  @Post()
  @RequirePermission("shifts.manage")
  @ApiOperation({ summary: "Create a new shift" })
  createShift(@Body() createShiftDto: CreateShiftDto) {
    return this.shiftService.createShift(createShiftDto);
  }

  @Patch(":shiftId")
  @RequirePermission("shifts.manage")
  @ApiOperation({ summary: "Update shift name, type, times or grace period" })
  @Auditable({ module: AuditModule.HR_SHIFTS })
  updateShift(
    @Param("shiftId", ParseUUIDPipe) shiftId: string,
    @Body() updateShiftDto: UpdateShiftDto,
  ) {
    return this.shiftService.updateShift(shiftId, updateShiftDto);
  }

  @Auditable({ module: AuditModule.HR_SHIFTS })
  @Delete(":shiftId")
  @RequirePermission("shifts.manage")
  @ApiOperation({ summary: "Delete a shift — blocked if any employees are still assigned" })
  deleteShift(@Param("shiftId", ParseUUIDPipe) shiftId: string) {
    return this.shiftService.deleteShift(shiftId);
  }
}

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
import { HolidayService } from "./holiday.service";
import { CreateHolidayDto } from "./dto/create-holiday.dto";
import { UpdateHolidayDto } from "./dto/update-holiday.dto";
import { HolidayFiltersDto } from "./dto/holiday-filters.dto";

@ApiTags("HR - Holidays")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("hr/holidays")
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) {}

  @Get()
  @RequirePermission("holidays.view")
  @ApiOperation({ summary: "List all holidays with pagination and optional filters" })
  listHolidays(@Query() holidayFiltersDto: HolidayFiltersDto) {
    return this.holidayService.listHolidays(holidayFiltersDto);
  }

  @Get(":holidayId")
  @RequirePermission("holidays.view")
  @ApiOperation({ summary: "Get holiday by ID" })
  getHoliday(@Param("holidayId", ParseUUIDPipe) holidayId: string) {
    return this.holidayService.getHoliday(holidayId);
  }

  @Post()
  @RequirePermission("holidays.manage")
  @ApiOperation({ summary: "Create a new holiday" })
  @Auditable({ module: AuditModule.HR_HOLIDAYS })
  createHoliday(@Body() createHolidayDto: CreateHolidayDto) {
    return this.holidayService.createHoliday(createHolidayDto);
  }

  @Patch(":holidayId")
  @RequirePermission("holidays.manage")
  @ApiOperation({ summary: "Update holiday name, type, description or date range" })
  @Auditable({ module: AuditModule.HR_HOLIDAYS })
  updateHoliday(
    @Param("holidayId", ParseUUIDPipe) holidayId: string,
    @Body() updateHolidayDto: UpdateHolidayDto,
  ) {
    return this.holidayService.updateHoliday(holidayId, updateHolidayDto);
  }

  @Auditable({ module: AuditModule.HR_HOLIDAYS })
  @Delete(":holidayId")
  @RequirePermission("holidays.manage")
  @ApiOperation({ summary: "Delete a holiday" })
  deleteHoliday(@Param("holidayId", ParseUUIDPipe) holidayId: string) {
    return this.holidayService.deleteHoliday(holidayId);
  }
}

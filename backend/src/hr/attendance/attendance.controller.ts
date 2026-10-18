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
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { PermissionsService } from "../../users/permissions/permissions.service";
import { Auditable } from "../../audit/decorators/auditable.decorator";
import { RequestWithUser } from "../../common/interfaces";
import { AttendanceService } from "./attendance.service";
import { CheckInDto } from "./dto/check-in.dto";
import { CheckOutDto } from "./dto/check-out.dto";
import { UpdateAttendanceDto } from "./dto/update-attendance.dto";
import { AttendanceFiltersDto } from "./dto/attendance-filters.dto";

@ApiTags("HR - Attendance")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("hr/attendance")
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List attendance records — own records only, or all if permitted" })
  async listAttendance(
    @Query() attendanceFiltersDto: AttendanceFiltersDto,
    @Req() req: RequestWithUser,
  ) {
    const canViewAll = await this.permissionsService.hasPermission(
      req.user.id,
      "attendance.view_all",
    );

    return this.attendanceService.listAttendance(attendanceFiltersDto, canViewAll, req.user.id);
  }

  @Get(":attendanceId")
  @ApiOperation({
    summary: "Get a single attendance record — own record only, or any if permitted",
  })
  async getAttendance(
    @Param("attendanceId", ParseUUIDPipe) attendanceId: string,
    @Req() req: RequestWithUser,
  ) {
    const canViewAll = await this.permissionsService.hasPermission(
      req.user.id,
      "attendance.view_all",
    );

    return this.attendanceService.findOne(attendanceId, canViewAll, req.user.id);
  }

  @Post("check-in")
  @RequirePermission("attendance.manage")
  @ApiOperation({
    summary: "Record employee check-in for any date — creates or updates the record",
  })
  @Auditable({ module: AuditModule.HR_ATTENDANCE })
  checkIn(@Req() req: RequestWithUser, @Body() checkInDto: CheckInDto) {
    return this.attendanceService.checkIn(checkInDto, req);
  }

  @Patch(":attendanceId/check-out")
  @RequirePermission("attendance.manage")
  @ApiOperation({ summary: "Record employee check-out and compute all attendance metrics" })
  @Auditable({ module: AuditModule.HR_ATTENDANCE })
  checkOut(
    @Req() req: RequestWithUser,
    @Param("attendanceId", ParseUUIDPipe) attendanceId: string,
    @Body() checkOutDto: CheckOutDto,
  ) {
    return this.attendanceService.checkOut(attendanceId, checkOutDto, req);
  }

  @Patch(":attendanceId")
  @RequirePermission("attendance.manage")
  @ApiOperation({ summary: "Correct an attendance record — metrics are recomputed automatically" })
  @Auditable({ module: AuditModule.HR_ATTENDANCE })
  updateAttendance(
    @Req() req: RequestWithUser,
    @Param("attendanceId", ParseUUIDPipe) attendanceId: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.updateAttendance(attendanceId, updateAttendanceDto, req);
  }

  @Delete(":attendanceId")
  @RequirePermission("attendance.manage")
  @ApiOperation({ summary: "Delete an attendance record" })
  @Auditable({ module: AuditModule.HR_ATTENDANCE })
  async deleteAttendance(@Param("attendanceId", ParseUUIDPipe) attendanceId: string) {
    await this.attendanceService.deleteAttendance(attendanceId);
    return { message: "Attendance record deleted successfully" };
  }
}

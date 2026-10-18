import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, Matches } from "class-validator";
import { AttendanceSource, WorkMode } from "@prisma/tenant-client";
import { AttendanceHelper } from "../utils/attendance.helper";

export class UpdateAttendanceDto {
  @ApiPropertyOptional({ description: "Check-in time (HH:MM, 24-hour)" })
  @IsOptional()
  @Matches(AttendanceHelper.TIME_FORMAT_REGEX, { message: AttendanceHelper.TIME_FORMAT_MESSAGE })
  checkIn?: string;

  @ApiPropertyOptional({ description: "Check-out time (HH:MM, 24-hour)" })
  @IsOptional()
  @Matches(AttendanceHelper.TIME_FORMAT_REGEX, { message: AttendanceHelper.TIME_FORMAT_MESSAGE })
  checkOut?: string;

  @ApiPropertyOptional({ enum: WorkMode })
  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  @ApiPropertyOptional({ enum: AttendanceSource })
  @IsOptional()
  @IsEnum(AttendanceSource)
  source?: AttendanceSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

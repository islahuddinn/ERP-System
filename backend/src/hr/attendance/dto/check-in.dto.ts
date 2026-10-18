import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";
import { AttendanceSource, WorkMode } from "@prisma/tenant-client";
import { AttendanceHelper } from "../utils/attendance.helper";

export class CheckInDto {
  @ApiProperty({ description: "Employee ID" })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({ description: "Attendance date (YYYY-MM-DD)" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "date must be in YYYY-MM-DD format" })
  date: string;

  @ApiProperty({ description: "Check-in time (HH:MM, 24-hour format)" })
  @IsNotEmpty()
  @Matches(AttendanceHelper.TIME_FORMAT_REGEX, { message: AttendanceHelper.TIME_FORMAT_MESSAGE })
  checkIn: string;

  @ApiPropertyOptional({ enum: WorkMode, default: WorkMode.ON_SITE })
  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  @ApiPropertyOptional({ enum: AttendanceSource, default: AttendanceSource.MANUAL })
  @IsOptional()
  @IsEnum(AttendanceSource)
  source?: AttendanceSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

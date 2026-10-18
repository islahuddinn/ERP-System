import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsOptional, IsString, Matches } from "class-validator";
import { AttendanceStatus } from "@prisma/tenant-client";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class AttendanceFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by employee ID" })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ description: "Filter by exact date (YYYY-MM-DD)" })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: "Filter by month, format YYYY-MM (e.g. 2025-03).",
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "yearMonth must be in YYYY-MM format" })
  yearMonth?: string;

  @ApiPropertyOptional({ enum: AttendanceStatus })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;
}

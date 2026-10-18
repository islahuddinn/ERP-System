import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsInt, IsOptional, IsString, Min } from "class-validator";

export class DailySummaryQueryDto {
  @ApiPropertyOptional({ description: "Date (YYYY-MM-DD). Defaults to today." })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: "Employee ID filter" })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ description: "Department ID filter" })
  @IsOptional()
  @IsString()
  departmentId?: string;
}

export class MonthlySummaryQueryDto {
  @ApiPropertyOptional({ description: "Year", default: new Date().getFullYear() })
  @IsOptional()
  @IsInt()
  @Min(1970)
  year?: number;

  @ApiPropertyOptional({ description: "Month (1-12)", default: new Date().getMonth() + 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  month?: number;

  @ApiPropertyOptional({ description: "Employee ID filter" })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ description: "Department ID filter" })
  @IsOptional()
  @IsString()
  departmentId?: string;
}

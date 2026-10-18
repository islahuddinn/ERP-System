import { ApiPropertyOptional } from "@nestjs/swagger";
import { WeekDay } from "@prisma/tenant-client";
import { IsArray, IsEnum, IsInt, IsObject, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateHrSettingsDto {
  @ApiPropertyOptional({
    enum: WeekDay,
    isArray: true,
    description: "Days of the week treated as weekly off for this tenant",
    example: [WeekDay.SUNDAY, WeekDay.SATURDAY],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(WeekDay, { each: true })
  weeklyOffDays?: WeekDay[];

  @ApiPropertyOptional({ description: "IANA timezone used for HR calculations e.g. attendance" })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: "Currency used for payroll e.g. PKR, USD" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: "Catch-all for ad-hoc HR settings that don't yet warrant a dedicated column",
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      "Max percentage of an employee's monthly salary that a single loan installment may consume",
    example: 70,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxLoanInstallmentPercent?: number;
}

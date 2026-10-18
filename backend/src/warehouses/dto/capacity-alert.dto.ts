import { IsEnum, IsOptional, IsBoolean } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { CapacityAlertLevel } from "@prisma/tenant-client";
import { Type } from "class-transformer";

export class CapacityAlertFiltersDto {
  @ApiPropertyOptional({
    enum: CapacityAlertLevel,
    description: "Filter by alert level",
  })
  @IsOptional()
  @IsEnum(CapacityAlertLevel)
  alertLevel?: CapacityAlertLevel;

  @ApiPropertyOptional({ description: "Filter by resolved status" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isResolved?: boolean;
}

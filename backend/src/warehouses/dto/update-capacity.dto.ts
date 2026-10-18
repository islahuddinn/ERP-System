import { IsNumber, IsOptional, IsString, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateCapacityDto {
  @ApiPropertyOptional({
    description: "Total capacity in cubic meters or units",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCapacity?: number;

  @ApiPropertyOptional({
    description: "Used capacity in cubic meters or units",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  usedCapacity?: number;

  @ApiPropertyOptional({ description: "Capacity unit", example: "CUBIC_METER" })
  @IsOptional()
  @IsString()
  capacityUnit?: string;
}
